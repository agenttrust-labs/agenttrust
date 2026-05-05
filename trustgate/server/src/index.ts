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
import { Keypair, PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";

import { loadPolicyVault, loadTrustGate, makeProvider } from "./chain";
import {
  FacilitatorRegistry,
  MockFacilitator,
} from "./facilitators";
import { makeDisputeRoute } from "./routes/dispute";
import { makeReceiptRoute } from "./routes/receipt";
import { makeSettleRoute } from "./routes/settle";
import { makeVerifyRoute } from "./routes/verify";

export interface ServerConfig {
  rpcUrl:             string;
  facilitatorKeypair: Keypair;
  port?:              number;
  /** Override the registry. Defaults to a registry with `mock` registered. */
  registry?:          FacilitatorRegistry;
}

/**
 * Build the default facilitator registry. Includes the `mock` adapter for
 * tests + dev. Production callers add concrete adapters (e.g., `PaySh`) and
 * call `setDefault('pay-sh')` after this.
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
  const policyVault = await loadPolicyVault(provider);
  const trustgate   = await loadTrustGate(provider);

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

// Boot when invoked as `node dist/index.js` directly.
if (require.main === module) {
  const port = Number(process.env.PORT ?? 3000);
  const rpc  = process.env.RPC_URL ?? "https://api.devnet.solana.com";

  const keypairJson = process.env.FACILITATOR_KEYPAIR_JSON;
  const kp = keypairJson
    ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keypairJson)))
    : Keypair.generate();

  startServer({ rpcUrl: rpc, facilitatorKeypair: kp, port })
    .then(() => {
      // eslint-disable-next-line no-console
      console.log(`TrustGate server listening on :${port} (facilitator=${kp.publicKey.toBase58()})`);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("startup failed:", err);
      process.exit(1);
    });
}
