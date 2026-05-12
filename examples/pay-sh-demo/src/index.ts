/**
 * Pay.sh + AgentTrust TrustGate live-demo Express server.
 *
 * Single endpoint: `GET /protected`, gated by AgentTrust.
 *
 *   $ pay --sandbox curl http://localhost:3402/protected
 *
 *   1. Demo emits 402 with x402 v2 PaymentRequirements
 *   2. Pay.sh CLI signs locally (Surfpool sandbox), retries
 *   3. Demo runs the AgentTrust pipeline:
 *        adapter.parseRequest → decide(ctx, payerTier vs minTier)
 *          → Allow  → validate proof → emit feedback → 200
 *          → Deny   → 402 + reason headers
 *
 * Counterparty tiers are read from the `X-Demo-Payer-Agent` header so a
 * single binary can demonstrate Allow + Deny paths without redeploying.
 *
 * See `examples/pay-sh-demo/README.md` for full operating notes.
 */

import express, { Application, Request } from "express";
import { Keypair, PublicKey } from "@solana/web3.js";
import { createHash } from "crypto";

import {
  PaySh,
  PayShDeps,
  ReplayCache,
  bytesToHex,
  canonicalChallengeBytes,
  deriveMemoHash,
  signEnvelope,
} from "@agenttrust/trustgate-server";

import { makeDemoPayShDeps, DemoOnChainStub } from "./deps";
import { makeRealPayShDeps, MakeRealPayShDepsArgs } from "./deps-real";
import { paymentMiddleware } from "./middleware";
import {
  CounterpartyTable,
  DEMO_POLICY_MIN_TIER,
  LiveTierCache,
  makeLiveTierDecide,
  makeTierDecide,
} from "./policy";
import { buildPaymentRequirements } from "./x402";

import { Connection } from "@solana/web3.js";

// ---------------------------------------------------------------------------
// Demo constants
// ---------------------------------------------------------------------------

const DEMO_POLICY_ID = 1;
const DEMO_AMOUNT_ATOMIC = 1_000n;          // 0.001 USDC at 6 decimals
const DEMO_NETWORK_DEVNET = "solana-devnet";
const DEMO_MAX_TIMEOUT_SECONDS = 60;
/** USDC mint (mainnet — Surfpool mirrors mainnet mints to localnet). */
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// ---------------------------------------------------------------------------
// Demo state factory
// ---------------------------------------------------------------------------

export interface CreateDemoAppOptions {
  /** Override per-counterparty tiers. Default: 3 demo agents at tiers 0/1/3. */
  readonly counterparties?: CounterpartyTable;
  /** Override the policy gate's minimum tier. Default: 2. */
  readonly minTier?: number;
  /** Override the SPL mint. Default: USDC mainnet. */
  readonly mint?: string;
  /** Override the network slug. Default: solana-devnet. */
  readonly network?: string;
  /** Override the SPL transfer recipient (the SERVICE's ATA). Defaults to the SERVICE wallet. */
  readonly payeeRecipient?: PublicKey;
  /** Override the facilitator keypair. Defaults to a per-process generated one. */
  readonly facilitator?: Keypair;
  /** Override the SERVICE-side payee Quantu agent PDA. */
  readonly payeeAgent?: PublicKey;
  /** Override the SERVICE-side payee wallet. */
  readonly payeeWallet?: PublicKey;
  /** Override the replay cache (for tests that share state across requests). */
  readonly replayCache?: ReplayCache;
}

/** Real-chain variant — wires Anchor + RPC + Quantu account resolver. */
export interface CreateRealDemoAppOptions extends CreateDemoAppOptions {
  readonly realChain: Omit<MakeRealPayShDepsArgs, "facilitator">;
  /**
   * Phase J4 — when present, the policy gate switches from a static
   * counterparty-table lookup to live `tier_immediate` reads off Quantu's
   * `AtomStats` PDA, with a per-payer 60s in-process cache.
   *
   * The static `counterparties` table (if any) is retained as the fallback
   * for unknown payers and as a stale-tier safety net under RPC failures —
   * see `makeLiveTierDecide` for the full degradation rules.
   */
  readonly liveTier?: {
    readonly resolveAtomStats: (payerAgent: PublicKey) => PublicKey | null;
    readonly atomEngineId:     PublicKey;
    readonly ttlMs?:           number;
    readonly cache?:           LiveTierCache;
  };
}

export interface DemoApp {
  readonly app:          Application;
  readonly facilitator:  Keypair;
  readonly payeeWallet:  Keypair | PublicKey;
  readonly counterparties: CounterpartyTable;
  /** Restart-safe — invoke before / between tests to reset state. */
  reset(): void;
}

export function createDemoApp(opts: CreateDemoAppOptions = {}): DemoApp {
  const network        = opts.network ?? DEMO_NETWORK_DEVNET;
  const mint           = opts.mint ?? USDC_MINT;
  const facilitator    = opts.facilitator ?? Keypair.generate();
  const payeeKeypair   = opts.payeeWallet ? undefined : Keypair.generate();
  const payeeWallet    = opts.payeeWallet ?? payeeKeypair!.publicKey;
  const payeeAgent     = opts.payeeAgent ?? deriveAgentPda(payeeWallet, "payee");
  const payeeRecipient = opts.payeeRecipient ?? payeeWallet;
  const counterparties = opts.counterparties ?? defaultCounterpartyTable();
  const minTier        = opts.minTier ?? DEMO_POLICY_MIN_TIER;

  const { deps, chainStub } = makeDemoPayShDeps({
    signingNetwork: network,
    feePayer:       facilitator.publicKey,
  });
  return assembleDemoApp({
    network, mint, facilitator, payeeKeypair, payeeWallet, payeeAgent,
    payeeRecipient, counterparties, minTier,
    deps, chainStub,
    replayCacheOverride: opts.replayCache,
  });
}

/**
 * Real-chain variant. Loads Anchor + RPC, wires
 * `makeValidateOnChainTx` + `makeEmitFeedbackCpi` +
 * `makePriorEmissionLookup` from `@agenttrust-sdk/trustgate`. The
 * middleware's `chainStub` setHint hook is a no-op in this mode — the
 * adapter parses the actual signed tx via RPC.
 */
export async function createRealDemoApp(
  opts: CreateRealDemoAppOptions,
): Promise<DemoApp> {
  const network        = opts.network ?? DEMO_NETWORK_DEVNET;
  const mint           = opts.mint ?? USDC_MINT;
  const facilitator    = opts.facilitator ?? Keypair.generate();
  const payeeKeypair   = opts.payeeWallet ? undefined : Keypair.generate();
  const payeeWallet    = opts.payeeWallet ?? payeeKeypair!.publicKey;
  const payeeAgent     = opts.payeeAgent ?? deriveAgentPda(payeeWallet, "payee");
  const payeeRecipient = opts.payeeRecipient ?? payeeWallet;
  const counterparties = opts.counterparties ?? defaultCounterpartyTable();
  const minTier        = opts.minTier ?? DEMO_POLICY_MIN_TIER;

  const { deps, connection } = await makeRealPayShDeps({
    ...opts.realChain,
    facilitator,
    signingNetwork: opts.realChain.signingNetwork ?? network,
  });
  // Real path doesn't use the chainStub — pass a no-op stub instance.
  const chainStub = new DemoOnChainStub();

  // Live-tier override: the static counterparty table becomes the
  // RPC-failure fallback, and `decide` reads tier_immediate off the
  // Quantu AtomStats PDA on each gate (with the J4 60s cache).
  const decide = opts.liveTier
    ? makeLiveTierDecide({
        connection,
        resolveAtomStats: opts.liveTier.resolveAtomStats,
        atomEngineId:     opts.liveTier.atomEngineId,
        minTier,
        ttlMs:            opts.liveTier.ttlMs,
        cache:            opts.liveTier.cache,
        fallbackTable:    counterparties,
      })
    : makeTierDecide(counterparties, minTier);

  return assembleDemoApp({
    network, mint, facilitator, payeeKeypair, payeeWallet, payeeAgent,
    payeeRecipient, counterparties, minTier,
    deps, chainStub,
    replayCacheOverride: opts.replayCache,
    decideOverride: decide,
  });
}

interface AssembleArgs {
  readonly network:           string;
  readonly mint:              string;
  readonly facilitator:       Keypair;
  readonly payeeKeypair?:     Keypair;
  readonly payeeWallet:       PublicKey;
  readonly payeeAgent:        PublicKey;
  readonly payeeRecipient:    PublicKey;
  readonly counterparties:    CounterpartyTable;
  readonly minTier:           number;
  readonly deps:              PayShDeps;
  readonly chainStub:         DemoOnChainStub;
  readonly replayCacheOverride?: ReplayCache;
  /** Phase J4 — when set, replaces the default static-table decide. */
  readonly decideOverride?:   (ctx: import("@agenttrust/trustgate-server").VerifyContext) => Promise<import("@agenttrust/trustgate-server").GateDecision>;
}

function assembleDemoApp(args: AssembleArgs): DemoApp {
  const {
    network, mint, facilitator, payeeKeypair, payeeWallet, payeeAgent,
    payeeRecipient, counterparties, minTier, deps, chainStub,
    replayCacheOverride,
  } = args;

  const adapter = new PaySh({
    ...deps,
    replayCache: replayCacheOverride ?? deps.replayCache,
  });

  const decide = args.decideOverride ?? makeTierDecide(counterparties, minTier);

  const memoToHashHex = (memo: string): string => bytesToHex(deriveMemoHash(memo));

  const agentTrustFor = (req: Request) => {
    const payerHint = (req.header("X-Demo-Payer-Agent") ?? "").trim();
    const fallbackEntry = counterparties.keys().next().value;
    const payerB58 = payerHint.length > 0
      ? payerHint
      : fallbackEntry ?? payeeAgent.toBase58();
    return {
      payerAgentAsset: payerB58,
      payeeAgentAsset: payeeAgent.toBase58(),
      payeeRecipient:  payeeRecipient.toBase58(),
      policyId:        DEMO_POLICY_ID,
    };
  };

  const buildForRequest = buildPaymentRequirements({
    scheme:            "exact",
    network,
    amount:            DEMO_AMOUNT_ATOMIC,
    asset:             mint,
    payTo:             payeeRecipient.toBase58(),
    resource:          "/protected",
    description:       "AgentTrust demo — counterparty-tier gated resource",
    maxTimeoutSeconds: DEMO_MAX_TIMEOUT_SECONDS,
    feePayer:          facilitator.publicKey.toBase58(),
    agentTrustFor,
    memoFor: deriveDemoMemo,
    signChallenge: (bytes) => signEnvelope(bytes, facilitator.secretKey),
    canonicalBytesOf: canonicalChallengeBytes,
    bytesToHex,
    paymentIdHashHexFor: memoToHashHex,
  });

  const app = express();
  app.use(express.json({ limit: "256kb" }));

  // Friendly root handler. Replaces the bare Express "Cannot GET /"
  // 404 for visitors landing on https://demo.agenttrust.tech/ from a
  // browser. Returns 200 with a small JSON payload pointing at the
  // docs and the functional endpoints.
  app.get("/", (_req, res) => {
    res.status(200).json({
      service:   "agenttrust-demo",
      docs:      "https://docs.agenttrust.tech",
      endpoints: ["/protected", "/health"],
    });
  });

  app.get("/health", (_req, res) => {
    res.json({
      status:        "ok",
      network,
      facilitator:   facilitator.publicKey.toBase58(),
      payeeWallet:   payeeWallet.toBase58(),
      payeeAgent:    payeeAgent.toBase58(),
      counterparties: Array.from(counterparties.entries())
        .map(([agent, e]) => ({ agent, tier: e.tier, label: e.label })),
      minTier,
      policyId:      DEMO_POLICY_ID,
    });
  });

  app.get(
    "/protected",
    paymentMiddleware({
      adapter,
      chainStub,
      decide,
      buildPaymentRequirements: buildForRequest,
      facilitator: facilitator.publicKey,
      network,
    }),
    (_req, res) => {
      res.json({
        ok:      true,
        message: "AgentTrust allowed this counterparty — protected resource served.",
      });
    },
  );

  return {
    app,
    facilitator,
    payeeWallet: payeeKeypair ?? payeeWallet,
    counterparties,
    reset: () => { /* chain stub state is request-scoped; nothing global to reset today */ },
  };
}

// ---------------------------------------------------------------------------
// Bootstrap (CLI)
// ---------------------------------------------------------------------------

if (require.main === module) {
  const port = Number(process.env.PORT ?? 3402);
  const network = process.env.NETWORK ?? DEMO_NETWORK_DEVNET;
  const mint    = process.env.MINT ?? USDC_MINT;

  // Real-chain mode when a facilitator keypair is supplied; falls back
  // to the in-memory mock when missing (local dev / unit smoke).
  const facilitatorB58 = process.env.FACILITATOR_KEYPAIR_B58;
  if (facilitatorB58) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const bs58 = require("bs58").default;
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const fs   = require("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const path = require("path");
    const facilitator = Keypair.fromSecretKey(bs58.decode(facilitatorB58));

    // Load the bundled trustgate IDL (Phase F1: anchor 0.31 cannot
    // deserialise the on-chain IDL deployed by anchor CLI 1.0). Walk
    // up the tree the same way as the counterparty map.
    const idlCandidates: string[] = [];
    for (let depth = 0; depth <= 5; depth++) {
      const dir = path.resolve(__dirname, ...new Array(depth).fill(".."));
      idlCandidates.push(path.join(dir, "idl", "trustgate.json"));
      idlCandidates.push(path.join(dir, "src", "idl", "trustgate.json"));
    }
    let trustgateIdl: unknown = undefined;
    for (const p of idlCandidates) {
      if (fs.existsSync(p)) {
        trustgateIdl = JSON.parse(fs.readFileSync(p, "utf-8"));
        break;
      }
    }

    // Counterparty map → Quantu resolver. The demo bundles
    // devnet-counterparties.json at the workspace root.
    // Walk up the directory tree from __dirname looking for the
    // file — works for both ts-node dev (src/) and node prod
    // (dist/src/) without hard-coding hop counts.
    const cpCandidates: string[] = [];
    for (let depth = 0; depth <= 5; depth++) {
      const dir = path.resolve(__dirname, ...new Array(depth).fill(".."));
      cpCandidates.push(path.join(dir, "devnet-counterparties.json"));
    }
    cpCandidates.push(path.resolve(process.cwd(), "examples/pay-sh-demo/devnet-counterparties.json"));
    let counterpartyMap: { baseCollection: string; counterparties: Array<{ asset: string; agentAccount: string; atomStats: string }> } | null = null;
    for (const p of cpCandidates) {
      if (fs.existsSync(p)) {
        counterpartyMap = JSON.parse(fs.readFileSync(p, "utf-8"));
        break;
      }
    }
    if (!counterpartyMap) {
      // eslint-disable-next-line no-console
      console.error("FATAL: devnet-counterparties.json missing; demo can't resolve Quantu accounts");
      process.exit(1);
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { PublicKey } = require("@solana/web3.js");
    const collection = new PublicKey(counterpartyMap.baseCollection);
    const byAgent    = new Map<string, { asset: string; atomStats: string }>();
    for (const cp of counterpartyMap.counterparties) byAgent.set(cp.agentAccount, cp);

    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const sdk = require("@agenttrust-sdk/trustgate");
    const resolveQuantu = async (payeeAgent: PublicKey) => {
      const e = byAgent.get(payeeAgent.toBase58());
      if (!e) throw new Error(`unknown payee ${payeeAgent.toBase58()}`);
      return {
        agentAccount:      payeeAgent,
        asset:             new PublicKey(e.asset),
        collection,
        atomConfig:        sdk.deriveAtomConfigPda(sdk.DEFAULT_DEVNET_QUANTU_IDS),
        atomStats:         new PublicKey(e.atomStats),
        atomEngineProgram: sdk.DEFAULT_DEVNET_QUANTU_IDS.atomEngine,
        registryAuthority: sdk.deriveAtomRegistryAuthorityPda(sdk.DEFAULT_DEVNET_QUANTU_IDS),
      };
    };

    // Live-tier resolver: walks the same counterparty map already loaded
    // for emit_feedback. Maps payerAgent → atom_stats. Returns null for
    // unknown payers so makeLiveTierDecide can fall back to the static
    // counterparty table (preserving the v1 demo's tier 0 / 1 / 3 fixture
    // for synthetic payer headers).
    const resolveAtomStats = (payerAgent: PublicKey): PublicKey | null => {
      const e = byAgent.get(payerAgent.toBase58());
      return e ? new PublicKey(e.atomStats) : null;
    };

    createRealDemoApp({
      network, mint, facilitator,
      realChain: {
        rpcUrl:        process.env.RPC_URL ?? "https://api.devnet.solana.com",
        signingNetwork: network,
        resolveQuantu,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        trustgateIdl:  trustgateIdl as any,
      },
      liveTier: {
        resolveAtomStats,
        atomEngineId: sdk.DEFAULT_DEVNET_QUANTU_IDS.atomEngine,
      },
    }).then((demo) => {
      demo.app.listen(port, () => {
        // eslint-disable-next-line no-console
        console.log(`agenttrust-pay-sh-demo (real-chain) listening on :${port}`);
        // eslint-disable-next-line no-console
        console.log(`  facilitator=${facilitator.publicKey.toBase58()}, network=${network}`);
      });
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error("real-chain boot failed:", err);
      process.exit(1);
    });
  } else {
    const demo = createDemoApp({ network, mint });
    demo.app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`agenttrust-pay-sh-demo (mock-chain) listening on :${port}`);
      // eslint-disable-next-line no-console
      console.log(`  facilitator=${demo.facilitator.publicKey.toBase58()}`);
      // eslint-disable-next-line no-console
      console.log(`  Try: pay --sandbox curl http://localhost:${port}/protected`);
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface CounterpartyTableEntryExternal {
  readonly agent: string;
  readonly tier:  number;
  readonly label: string;
}

function defaultCounterpartyTable(): CounterpartyTable {
  // Three deterministic demo agent PDAs at tiers 0 / 1 / 3
  const seed = (label: string) => {
    const bytes = new Uint8Array(32);
    const sha = createHash("sha256").update(`agenttrust-demo:${label}`).digest();
    bytes.set(sha.subarray(0, 32));
    return new PublicKey(bytes);
  };
  const entries: ReadonlyArray<CounterpartyTableEntryExternal> = [
    { agent: seed("tier0").toBase58(), tier: 0, label: "untrusted" },
    { agent: seed("tier1").toBase58(), tier: 1, label: "low-trust" },
    { agent: seed("tier3").toBase58(), tier: 3, label: "trusted" },
  ];
  return new Map(entries.map(({ agent, tier, label }) => [agent, { tier, label }]));
}

function deriveAgentPda(wallet: PublicKey, suffix: string): PublicKey {
  const sha = createHash("sha256")
    .update(`demo-agent:${wallet.toBase58()}:${suffix}`)
    .digest();
  return new PublicKey(sha.subarray(0, 32));
}

function deriveDemoMemo(req: Request): string {
  // Stable per-request memo so retries hit the same on-chain bucket.
  // Combines path + headers Pay.sh's CLI keeps stable across retries.
  const digest = createHash("sha256")
    .update(`demo-memo:${req.method}:${req.originalUrl}:${req.header("user-agent") ?? ""}`)
    .update(req.header("X-Demo-Payer-Agent") ?? "")
    .digest("hex");
  return digest;
}
