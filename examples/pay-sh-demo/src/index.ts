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
  ReplayCache,
  bytesToHex,
  canonicalChallengeBytes,
  deriveMemoHash,
  signEnvelope,
} from "@agenttrust/trustgate-server";

import { makeDemoPayShDeps } from "./deps";
import { paymentMiddleware } from "./middleware";
import {
  CounterpartyTable,
  DEMO_POLICY_MIN_TIER,
  makeTierDecide,
} from "./policy";
import { buildPaymentRequirements } from "./x402";

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
  const adapter = new PaySh({
    ...deps,
    replayCache: opts.replayCache ?? deps.replayCache,
  });

  const decide = makeTierDecide(counterparties, minTier);

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
  const demo = createDemoApp({
    network:  process.env.NETWORK ?? DEMO_NETWORK_DEVNET,
    mint:     process.env.MINT ?? USDC_MINT,
  });
  demo.app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`agenttrust-pay-sh-demo listening on :${port}`);
    // eslint-disable-next-line no-console
    console.log(`  facilitator=${demo.facilitator.publicKey.toBase58()}`);
    // eslint-disable-next-line no-console
    console.log(`  Try: pay --sandbox curl http://localhost:${port}/protected`);
  });
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
