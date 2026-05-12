/**
 * AgentTrust TrustGate — Express x402 facilitator server.
 *
 * Reference implementation. Composes the four x402 endpoints over the
 * deployed `policy_vault` + `trustgate` programs, dispatching every request
 * through a `FacilitatorRegistry` so the wire protocol stays decoupled from
 * the gate_payment policy logic. New facilitators land as one file in
 * `src/facilitators/` plus one `register()` call in `createDefaultRegistry`.
 *
 * Two public entry points:
 *
 *   - `startServer(cfg)`               full reference server (boot + listen)
 *   - `mountFacilitatorRoutes(app, …)` mount the four endpoints onto an
 *                                      existing Express app (used by demos)
 */

import express, { Application, Request, Response } from "express";
import bs58 from "bs58";
import { Keypair, PublicKey } from "@solana/web3.js";
import { Idl, Program } from "@coral-xyz/anchor";

import { loadPolicyVault, loadTrustGate, makeProvider } from "./chain";
import {
  FacilitatorRegistry,
  MockFacilitator,
} from "./facilitators";
import { makeDisputeRoute } from "./routes/dispute";
import { makeReceiptRoute } from "./routes/receipt";
import { makeSettleRoute } from "./routes/settle";
import { makeVerifyRoute } from "./routes/verify";

// Public re-exports — let demo / consumer code import the full facilitator
// surface from the package root rather than reaching into subpaths.
export * from "./facilitators";
export {
  GateDecision,
  DenyReasonCode,
  VerifyRequest,
  VerifyResponse,
  ReceiptResponse,
} from "./types";
export {
  POLICY_VAULT_ID,
  TRUSTGATE_ID,
  derivePolicyPda,
  deriveVelocityPda,
  deriveKillSwitchPda,
  deriveFeedbackLogPda,
  loadPolicyVault,
  loadTrustGate,
  makeProvider,
  simulateGatePayment,
} from "./chain";
export {
  buildHeadersForDecision,
  denyReasonName,
  X_AGENT_TRUST_DECISION,
  X_CAPABILITY_REQUIRED,
  X_PAYMENT_NETWORK,
  X_PAYMENT_REASON_CODE,
  X_PAYMENT_REASON_NAME,
  X_PAYMENT_REQUIRED,
} from "./x402";

export interface ServerConfig {
  rpcUrl:             string;
  facilitatorKeypair: Keypair;
  port?:              number;
  /** Override the registry. Defaults to a registry with `mock` registered. */
  registry?:          FacilitatorRegistry;
  /** Optional bundled IDL snapshots, forwarded to `loadPolicyVault` /
   *  `loadTrustGate`. Pass these to skip the on-chain IDL fetch — useful
   *  when the deployed IDL hasn't been published yet, or to avoid an
   *  RPC hop in latency-sensitive paths. The hosted `startProduction`
   *  uses the same pattern via its `policyVaultIdl` / `trustgateIdl`
   *  fields. */
  policyVaultIdl?:    Idl;
  trustgateIdl?:      Idl;
}

/**
 * Build the default facilitator registry. Includes the `mock` adapter for
 * tests + dev. Production callers add concrete adapters (e.g., `PaySh` from
 * `./facilitators/pay-sh`) and call `setDefault('pay-sh')` after this.
 *
 * `MockFacilitator` is registered first so `getActiveAdapter` can fall
 * through to it when no header / env / programmatic default is set — useful
 * for early-boot smoke checks before Pay.sh deps are wired.
 */
export function createDefaultRegistry(): FacilitatorRegistry {
  const registry = new FacilitatorRegistry();
  registry.register(new MockFacilitator());
  return registry;
}

export interface MountFacilitatorRoutesConfig {
  registry:    FacilitatorRegistry;
  policyVault: Program;
  trustgate:   Program;
  /** Facilitator pubkey — used as `caller` in gate_payment simulations. */
  caller:      PublicKey;
}

/**
 * Add `POST /verify`, `GET /receipt/:hash`, `POST /settle`, `POST /dispute`
 * to an existing Express app. Use this when embedding TrustGate's facilitator
 * API into a larger app (see `examples/pay-sh-demo`).
 *
 * Caller is responsible for `app.use(express.json())` before mounting and
 * `app.listen(...)` after.
 */
export function mountFacilitatorRoutes(
  app: Application,
  cfg: MountFacilitatorRoutesConfig,
): void {
  app.use(makeVerifyRoute({
    registry:    cfg.registry,
    policyVault: cfg.policyVault,
    caller:      cfg.caller,
  }));
  app.use(makeReceiptRoute({ trustgate: cfg.trustgate }));
  app.use(makeSettleRoute({ registry: cfg.registry }));
  app.use(makeDisputeRoute());
}

export async function startServer(cfg: ServerConfig): Promise<{
  app:    Application;
  close:  () => Promise<void>;
}> {
  const app      = express();
  const provider = makeProvider({
    rpcUrl:             cfg.rpcUrl,
    facilitatorKeypair: cfg.facilitatorKeypair,
  });

  app.use(express.json());

  const registry    = cfg.registry ?? createDefaultRegistry();
  const policyVault = await loadPolicyVault(provider, cfg.policyVaultIdl);
  const trustgate   = await loadTrustGate(provider, cfg.trustgateIdl);

  // Friendly root handler. The reference server's bare `/` used to
  // return Express's "Cannot GET /" 404 — fine for an internal probe,
  // unhelpful for a browser landing on the host. Mounted before the
  // facilitator routes so an adapter dispatch failure cannot mask it.
  app.get("/", (_req: Request, res: Response) => {
    res.status(200).json({
      service:   "agenttrust-api",
      docs:      "https://docs.agenttrust.tech",
      endpoints: ["/verify", "/settle", "/receipt", "/healthz"],
    });
  });

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status:      "ok",
      facilitator: cfg.facilitatorKeypair.publicKey.toBase58(),
      rpc:         cfg.rpcUrl,
      adapters:    registry.names(),
    });
  });

  mountFacilitatorRoutes(app, {
    registry,
    policyVault,
    trustgate,
    caller: cfg.facilitatorKeypair.publicKey,
  });

  const port = cfg.port ?? 3000;
  const httpServer = app.listen(port);

  return {
    app,
    close: () => new Promise((resolve, reject) => {
      httpServer.close((err) => (err ? reject(err) : resolve()));
    }),
  };
}

/**
 * Resolve the facilitator keypair from env. Two accepted sources, in
 * precedence order:
 *
 *   1. FACILITATOR_KEYPAIR_B58  — base58-encoded 64-byte secret key
 *   2. FACILITATOR_KEYPAIR_JSON — Solana CLI keypair JSON (number array)
 *
 * Hard throws if neither is set. The previous fallback to
 * `Keypair.generate()` produced an ephemeral signer with zero lamports;
 * every `/settle` then failed at `sendTransaction` with an opaque
 * insufficient-funds error. Refusing to boot surfaces the misconfig at
 * the operator's terminal instead.
 */
function loadFacilitatorKeypairFromEnv(): Keypair {
  const b58Raw = process.env.FACILITATOR_KEYPAIR_B58?.trim();
  if (b58Raw && b58Raw.length > 0) {
    try {
      return Keypair.fromSecretKey(bs58.decode(b58Raw));
    } catch (err) {
      throw new Error(
        `FACILITATOR_KEYPAIR_B58 could not be decoded as a base58 64-byte secret key: ` +
        `${(err as Error).message}`,
      );
    }
  }
  const jsonRaw = process.env.FACILITATOR_KEYPAIR_JSON?.trim();
  if (jsonRaw && jsonRaw.length > 0) {
    try {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(jsonRaw)));
    } catch (err) {
      throw new Error(
        `FACILITATOR_KEYPAIR_JSON could not be decoded as a JSON number array of a 64-byte secret key: ` +
        `${(err as Error).message}`,
      );
    }
  }
  throw new Error(
    "Facilitator keypair env not set. Set FACILITATOR_KEYPAIR_B58 (base58 64-byte secret) " +
    "or FACILITATOR_KEYPAIR_JSON (Solana CLI keypair JSON array). Refusing to boot with an " +
    "ephemeral keypair because /settle would fail at sendTransaction with zero lamports.",
  );
}

// Boot when invoked as `node dist/index.js` directly.
if (require.main === module) {
  const port = Number(process.env.PORT ?? 3000);
  const rpc  = process.env.RPC_URL ?? "https://api.devnet.solana.com";

  let kp: Keypair;
  try {
    kp = loadFacilitatorKeypairFromEnv();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("startup failed:", (err as Error).message);
    process.exit(1);
  }

  startServer({ rpcUrl: rpc, facilitatorKeypair: kp, port })
    .then(async () => {
      const pubkey = kp.publicKey.toBase58();
      // Best-effort balance probe. RPC hiccups must not block boot — the
      // server is already listening at this point.
      let balanceLine = "balance probe skipped";
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
        const { Connection } = require("@solana/web3.js");
        const conn = new Connection(rpc, "confirmed");
        const lamports = await conn.getBalance(kp.publicKey);
        balanceLine = `balance=${lamports} lamports (${(lamports / 1e9).toFixed(6)} SOL)`;
        if (lamports === 0) {
          balanceLine += " WARNING: zero balance; /settle will fail at sendTransaction";
        }
      } catch (e) {
        balanceLine = `balance probe failed: ${(e as Error).message}`;
      }
      // eslint-disable-next-line no-console
      console.log(
        `TrustGate server listening on :${port} ` +
        `(facilitator=${pubkey}, ${balanceLine})`,
      );
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("startup failed:", err);
      process.exit(1);
    });
}
