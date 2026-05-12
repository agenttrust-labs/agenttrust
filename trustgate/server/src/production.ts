/**
 * Hosted facilitator wiring — production boot for `agenttrust-api.fly.dev`.
 *
 * Composes the reference Express server (`startServer`) with:
 *   - real PaySh adapter (validateOnChainTx, emitFeedbackCpi, prior-emission
 *     lookup) backed by live RPC + the deployed trustgate program
 *   - express-rate-limit on /verify + /settle (60 req/min/IP)
 *   - /healthz endpoint matching the MCP + status-page polling shape
 *   - a Quantu resolver bootstrapped from the pre-warmed counterparty
 *     map (`examples/pay-sh-demo/devnet-counterparties.json`); agents
 *     outside that map currently 4xx — production integrators bring
 *     their own resolver via `setQuantuResolver(...)` before boot
 *
 * Boot:
 *   FACILITATOR_KEYPAIR_B58=<base58 64-byte secret> \
 *   RPC_URL=https://api.devnet.solana.com \
 *   NETWORK=solana-devnet \
 *   PORT=8080 \
 *   node dist/production.js
 */

import express, { Application, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import bs58 from "bs58";
import * as fs from "fs";
import * as path from "path";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Idl, Program, Wallet } from "@coral-xyz/anchor";

import {
  DEFAULT_DEVNET_PROGRAM_IDS,
  DEFAULT_DEVNET_QUANTU_IDS,
  MAINNET_QUANTU_IDS,
  ProgramIds,
  QuantuFeedbackAccounts,
  QuantuProgramIds,
  loadPolicyVault,
  loadTrustGate,
  makeEmitFeedbackCpi,
  makePriorEmissionLookup,
  makeValidateOnChainTx,
} from "@agenttrust-sdk/trustgate";

import {
  FacilitatorRegistry,
  PaySh,
  ReplayCache,
  signEnvelope,
} from "./facilitators";
import { mountFacilitatorRoutes } from "./index";

// ---------------------------------------------------------------------------

interface CounterpartyEntry {
  asset:        string;
  agentAccount: string;
  atomStats:    string;
}
interface CounterpartyMap {
  baseCollection: string;
  counterparties: ReadonlyArray<CounterpartyEntry>;
}

/**
 * Load the pre-warmed counterparty map. The hosted facilitator can resolve
 * any agent in this set; agents outside it return a clean 4xx from /settle
 * (the brief explicitly leaves "production integrators bring their own
 * resolver" as the long-tail path).
 */
function loadCounterpartyMap(): CounterpartyMap | null {
  // Embedded fallback paths; first hit wins. The Docker image bundles
  // the JSON next to the dist artefacts; at dev time it lives in the
  // repo's examples/pay-sh-demo dir.
  const candidates = [
    path.resolve(__dirname, "../counterparties.json"),
    path.resolve(__dirname, "../../examples/pay-sh-demo/devnet-counterparties.json"),
    path.resolve(process.cwd(), "counterparties.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const raw = JSON.parse(fs.readFileSync(p, "utf-8"));
      return raw as CounterpartyMap;
    }
  }
  return null;
}

/**
 * Build a Quantu resolver that walks the counterparty map. Every entry's
 * `asset` is the agent_asset pubkey the caller passes; the resolver
 * returns the matching agentAccount + collection + atom_stats bundle.
 *
 * `atomEnabled` is true for the hosted facilitator — every pre-warmed
 * counterparty has an atom_stats PDA seeded.
 *
 * `quantuIds` is threaded in by `startProduction` so the bundle's
 * `atomEngineProgram` / `registryAuthority` track the active cluster
 * (devnet → DEFAULT_DEVNET_QUANTU_IDS, mainnet → MAINNET_QUANTU_IDS).
 */
function makeQuantuResolver(
  map:       CounterpartyMap,
  quantuIds: QuantuProgramIds,
): (payeeAgent: PublicKey) => Promise<QuantuFeedbackAccounts> {
  const collection = new PublicKey(map.baseCollection);
  const byAgent = new Map<string, CounterpartyEntry>();
  for (const cp of map.counterparties) byAgent.set(cp.agentAccount, cp);

  return async (payeeAgent: PublicKey) => {
    const entry = byAgent.get(payeeAgent.toBase58());
    if (!entry) {
      throw new Error(
        `unknown payee agent ${payeeAgent.toBase58()} — ` +
        `the hosted facilitator only resolves the pre-warmed counterparty set. ` +
        `Run your own facilitator (npm @agenttrust-sdk/trustgate) for arbitrary agents.`,
      );
    }
    return {
      agentAccount:      payeeAgent,
      asset:             new PublicKey(entry.asset),
      collection,
      atomConfig:        new PublicKey(quantuIds.atomEngine.toBase58()), // overwritten by deriveAtomConfigPda below
      atomStats:         new PublicKey(entry.atomStats),
      atomEngineProgram: quantuIds.atomEngine,
      registryAuthority: quantuIds.agentRegistry, // ditto
    };
  };
}

// ---------------------------------------------------------------------------

/**
 * Resolve AgentTrust program IDs for the active cluster.
 *
 * Devnet → `DEFAULT_DEVNET_PROGRAM_IDS` (with per-program env overrides).
 * Mainnet → require explicit env overrides for every program. AgentTrust
 *           mainnet programs aren't deployed yet; silently falling
 *           through to devnet pubkeys produced wrong gate decisions
 *           (F-052). When mainnet ships, set the three `*_PROGRAM_ID`
 *           envs and this resolver passes them through.
 */
function resolveProgramIds(network: string): ProgramIds {
  const envPolicyVault         = process.env.POLICY_VAULT_PROGRAM_ID?.trim();
  const envTrustGate           = process.env.TRUSTGATE_PROGRAM_ID?.trim();
  const envValidationRegistry  = process.env.VALIDATION_REGISTRY_PROGRAM_ID?.trim();

  if (network === "solana-mainnet") {
    const missing: string[] = [];
    if (!envPolicyVault)        missing.push("POLICY_VAULT_PROGRAM_ID");
    if (!envTrustGate)          missing.push("TRUSTGATE_PROGRAM_ID");
    if (!envValidationRegistry) missing.push("VALIDATION_REGISTRY_PROGRAM_ID");
    if (missing.length > 0) {
      throw new Error(
        `NETWORK=solana-mainnet but AgentTrust programs aren't deployed to mainnet yet. ` +
        `Set explicit program IDs via env (${missing.join(", ")}) or use NETWORK=solana-devnet.`,
      );
    }
  }

  return {
    policyVault:        envPolicyVault        ? parsePubkey("POLICY_VAULT_PROGRAM_ID",         envPolicyVault)        : DEFAULT_DEVNET_PROGRAM_IDS.policyVault,
    trustGate:          envTrustGate          ? parsePubkey("TRUSTGATE_PROGRAM_ID",           envTrustGate)          : DEFAULT_DEVNET_PROGRAM_IDS.trustGate,
    validationRegistry: envValidationRegistry ? parsePubkey("VALIDATION_REGISTRY_PROGRAM_ID",  envValidationRegistry) : DEFAULT_DEVNET_PROGRAM_IDS.validationRegistry,
  };
}

/**
 * Resolve Quantu (agent-registry-8004 + atom-engine) program IDs for the
 * active cluster. Quantu IS deployed on both clusters, so the mainnet
 * path is the live one — no boot-time gate (unlike AgentTrust above).
 */
function resolveQuantuIds(network: string): QuantuProgramIds {
  return network === "solana-mainnet" ? MAINNET_QUANTU_IDS : DEFAULT_DEVNET_QUANTU_IDS;
}

function parsePubkey(name: string, raw: string): PublicKey {
  try {
    return new PublicKey(raw);
  } catch (err) {
    throw new Error(`${name} is not a valid base58 pubkey: ${(err as Error).message}`);
  }
}

export interface ProductionConfig {
  rpcUrl:           string;
  network:          string;
  facilitator:      Keypair;
  port:             number;
  policyVaultIdl?:  Idl;
  trustgateIdl?:    Idl;
}

export async function startProduction(cfg: ProductionConfig): Promise<{
  app:    Application;
  close:  () => Promise<void>;
}> {
  const app        = express();
  const startedAt  = Date.now();
  const counterpartyMap = loadCounterpartyMap();
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const pkg        = require("../package.json");

  // Resolve cluster-scoped program IDs once at boot. Mainnet throws here
  // unless the operator pinned every AgentTrust program via env (F-052);
  // Quantu is live on both clusters so the resolver just picks the right
  // constant (F-053).
  const programIds = resolveProgramIds(cfg.network);
  const quantuIds  = resolveQuantuIds(cfg.network);

  app.use(express.json({ limit: "256kb" }));
  app.set("trust proxy", 1); // Fly's edge proxy sets X-Forwarded-For

  // Rate limit /verify + /settle. 60 req/min/IP — plenty for normal
  // hackathon traffic; an attacker probing the facilitator hits the
  // ceiling before draining the keypair's SOL.
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit:    60,
    standardHeaders: "draft-7",
    legacyHeaders:   false,
    message:  { error: "too_many_requests", retryAfter: 60 },
  });
  app.use("/verify", apiLimiter);
  app.use("/settle", apiLimiter);

  // Wire up the chain providers + Anchor programs.
  const connection = new Connection(cfg.rpcUrl, "confirmed");
  const wallet     = new Wallet(cfg.facilitator);
  const provider   = new AnchorProvider(connection, wallet, { commitment: "confirmed" });

  // The on-chain IDLs were deployed via anchor CLI 1.0+ but the SDK
  // runtime is on @coral-xyz/anchor 0.31; Program.fetchIdl can't
  // deserialise the new format (Phase F1 finding). Bundle the build-
  // time IDL snapshots and pass them through the optional `idl` arg.
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const policyVaultIdl = (cfg.policyVaultIdl ?? require("./idl/policy_vault.json")) as Idl;
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const trustgateIdl   = (cfg.trustgateIdl   ?? require("./idl/trustgate.json"))   as Idl;

  const policyVault = await loadPolicyVault(provider, programIds.policyVault, policyVaultIdl);
  const trustgate   = await loadTrustGate(provider, programIds.trustGate, trustgateIdl);

  // PaySh adapter wiring.
  const validateOnChainTx = makeValidateOnChainTx({ connection });

  // Quantu resolver bootstrap (F-051). If the counterparty map didn't
  // load, the lazy throw below preserves the old behaviour as a
  // defense-in-depth — but we surface the problem at boot too so a
  // misconfigured deployment fails (or warns) before the first /settle.
  let resolveQuantu: (a: PublicKey) => Promise<QuantuFeedbackAccounts> = async () => {
    throw new Error("Quantu resolver not configured — counterparty map missing");
  };
  if (counterpartyMap) {
    resolveQuantu = makeQuantuResolver(counterpartyMap, quantuIds);
  } else {
    const strict = (process.env.STRICT_RESOLVERS ?? "").trim().toLowerCase() === "true";
    const msg =
      "Quantu resolver not configured — counterparty map missing. " +
      "/settle will fail until either the counterparty JSON is bundled " +
      "(examples/pay-sh-demo/devnet-counterparties.json) or a custom " +
      "resolver is wired before boot.";
    if (strict) throw new Error(msg);
    // eslint-disable-next-line no-console
    console.warn(`[agenttrust-api] WARN ${msg}`);
  }

  const emitFeedbackCpi = makeEmitFeedbackCpi({
    trustgate,
    trustgateId:     programIds.trustGate,
    agentRegistryId: quantuIds.agentRegistry,
    facilitator:     cfg.facilitator,
    resolveQuantu,
  });
  const priorEmissionLookup = makePriorEmissionLookup({
    trustgate,
    trustgateId: programIds.trustGate,
    connection,
  });
  const replayCache = new ReplayCache();

  const paySh = new PaySh({
    signingNetwork:      cfg.network,
    feePayer:            cfg.facilitator.publicKey,
    validateOnChainTx,
    emitFeedbackCpi,
    priorEmissionLookup,
    replayCache,
    signDecision: (bytes: Uint8Array) => signEnvelope(bytes, cfg.facilitator.secretKey),
  });

  const registry = new FacilitatorRegistry();
  registry.register(paySh);
  registry.setDefault("pay-sh");

  // /healthz BEFORE the facilitator routes mount so it never gates
  // on adapter dispatch failure.
  app.get(["/healthz", "/health"], async (_req: Request, res: Response) => {
    let balanceLamports = 0;
    try {
      balanceLamports = await connection.getBalance(cfg.facilitator.publicKey);
    } catch (e) {
      // RPC hiccup — surface as null; healthz still 200s as long as
      // the process is up.
      void e;
    }
    res.status(200).json({
      ok:                true,
      service:           "agenttrust-api",
      version:           pkg.version,
      network:           cfg.network,
      rpcUrl:            cfg.rpcUrl,
      facilitatorPubkey: cfg.facilitator.publicKey.toBase58(),
      balanceLamports,
      balanceSol:        (balanceLamports / 1e9).toFixed(6),
      uptimeSeconds:     Math.round((Date.now() - startedAt) / 1000),
      adapters:          registry.names(),
      counterpartyCount: counterpartyMap?.counterparties.length ?? 0,
    });
  });

  mountFacilitatorRoutes(app, {
    registry,
    policyVault,
    trustgate,
    caller: cfg.facilitator.publicKey,
  });

  const server = app.listen(cfg.port);

  return {
    app,
    close: () => new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    }),
  };
}

// ---------------------------------------------------------------------------
// Entry point — node dist/production.js
// ---------------------------------------------------------------------------

if (require.main === module) {
  const port    = Number(process.env.PORT ?? 8080);
  const rpcUrl  = process.env.RPC_URL ?? "https://api.devnet.solana.com";
  const network = process.env.NETWORK ?? "solana-devnet";

  const b58 = process.env.FACILITATOR_KEYPAIR_B58;
  if (!b58) {
    // eslint-disable-next-line no-console
    console.error("FACILITATOR_KEYPAIR_B58 env var required (base58 64-byte secret)");
    process.exit(1);
  }
  const facilitator = Keypair.fromSecretKey(bs58.decode(b58));

  startProduction({ rpcUrl, network, facilitator, port })
    .then(() => {
      // eslint-disable-next-line no-console
      console.log(
        `agenttrust-api listening on :${port} ` +
        `(facilitator=${facilitator.publicKey.toBase58()}, network=${network})`,
      );
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("startup failed:", err);
      process.exit(1);
    });
}
