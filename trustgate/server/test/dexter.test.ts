/**
 * Dexter adapter contract tests.
 *
 * Mirrors `pay-sh.test.ts` to exercise the FacilitatorAdapter contract via
 * a second concrete implementation. Validates the README's "<2 hours to
 * add a new facilitator" claim — if Dexter passes its tests, the
 * abstraction is doing its job.
 */

import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";

import {
  ConfirmedSettlement,
  Dexter,
  DexterDeps,
  EmitFeedbackInput,
  GateDecision,
  ReplayCache,
  VerifyContext,
  bytesToHex,
  canonicalChallengeBytes,
  deriveMemoHash,
  signEnvelope,
} from "../src/facilitators";
import type { OnChainTxValidation } from "../src/facilitators/dexter";

const NETWORK = "solana-devnet";
const FACILITATOR_KP = Keypair.generate();
const FEE_PAYER      = FACILITATOR_KP.publicKey;
const PAYER_AGENT    = Keypair.generate().publicKey;
const PAYEE_AGENT    = Keypair.generate().publicKey;
const PAYEE_RECIP    = Keypair.generate().publicKey;
const MINT_USDC      = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const MEMO_HEX       = "cd".repeat(32);
const DEXTER_VERSION = 3;

function reqWith(body: unknown): any {
  return { body, header: () => undefined };
}

interface MakeOptions {
  readonly overrides?: Record<string, unknown>;
  readonly signer?:    Keypair;
  readonly issuedAt?:  number;
  readonly forceSignatureHex?: string;
}

function makeRequirements(opts: MakeOptions = {}): Record<string, unknown> {
  const overrides = opts.overrides ?? {};
  const signer    = opts.signer    ?? FACILITATOR_KP;
  const issuedAt  = opts.issuedAt  ?? Date.now();

  const extraOverride = (overrides.extra as Record<string, unknown> | undefined) ?? {};
  const agentTrustOverride = (extraOverride.agentTrust as Record<string, unknown> | undefined) ?? {};
  const dexterOverride     = (extraOverride.dexter     as Record<string, unknown> | undefined) ?? {};
  const memo = (extraOverride.memo as string | undefined) ?? MEMO_HEX;

  const network         = (overrides.network          as string | undefined) ?? NETWORK;
  const amount          = (overrides.maxAmountRequired as string | undefined) ?? "1000";
  const asset           = (overrides.asset            as string | undefined) ?? MINT_USDC.toBase58();
  const payTo           = (overrides.payTo            as string | undefined) ?? PAYEE_RECIP.toBase58();
  const payerAgentAsset = (agentTrustOverride.payerAgentAsset as string | undefined) ?? PAYER_AGENT.toBase58();
  const payeeAgentAsset = (agentTrustOverride.payeeAgentAsset as string | undefined) ?? PAYEE_AGENT.toBase58();
  const payeeRecipient  = (agentTrustOverride.payeeRecipient  as string | undefined) ?? PAYEE_RECIP.toBase58();
  const policyId        = (agentTrustOverride.policyId         as number | undefined) ?? 1;
  const dexterPolicyVersion = (dexterOverride.dexterPolicyVersion as number | undefined) ?? DEXTER_VERSION;
  const settlementRoute = (dexterOverride.settlementRoute as string | undefined);

  const memoHash = deriveMemoHash(memo);
  const sigHex = opts.forceSignatureHex
    ? opts.forceSignatureHex
    : bytesToHex(signEnvelope(
        canonicalChallengeBytes({
          issuedAt,
          network,
          amount: BigInt(amount),
          asset,
          payTo,
          payerAgentAsset,
          payeeAgentAsset,
          payeeRecipient,
          policyId,
          paymentIdHashHex: bytesToHex(memoHash),
        }),
        signer.secretKey,
      ));

  const baseExtra: Record<string, unknown> = {
    feePayer: FEE_PAYER.toBase58(),
    memo,
    agentTrust: {
      payerAgentAsset,
      payeeAgentAsset,
      payeeRecipient,
      policyId,
      issuedAt,
      serviceSignature: sigHex,
    },
    dexter: {
      dexterPolicyVersion,
      ...(settlementRoute !== undefined ? { settlementRoute } : {}),
    },
  };

  const {
    network: _n, maxAmountRequired: _m, asset: _a, payTo: _p,
    extra: _e,
    ...rest
  } = overrides;

  return {
    scheme:            "exact",
    network,
    maxAmountRequired: amount,
    asset,
    payTo,
    resource:          "/protected",
    maxTimeoutSeconds: 60,
    extra:             baseExtra,
    ...rest,
  };
}

function makeBody(overrides: Record<string, unknown> = {}, signOpts: MakeOptions = {}): Record<string, unknown> {
  return {
    paymentRequirements: makeRequirements({ ...signOpts, overrides }),
    paymentPayload: {
      x402Version: 2,
      payload: { transaction: "BASE64TXBYTES" },
    },
  };
}

class StubChain {
  next: OnChainTxValidation = {
    confirmed:         true,
    payer:             Keypair.generate().publicKey,
    signature:         "sig-1",
    slot:              42,
    transferredAmount: 1000n,
    transferredMint:   MINT_USDC,
    transferRecipient: PAYEE_RECIP,
  };
  emitInputs: EmitFeedbackInput[] = [];
  emitCalls = 0;
  emitResult = { feedbackTxSignature: "feedback-sig-1", emittedAtSlot: 100 };
  priorEmissionResult: { feedbackTxSignature: string; emittedAtSlot?: number } | null = null;
}

function makeDeps(stub: StubChain, opts: Partial<DexterDeps> = {}): DexterDeps {
  return {
    signingNetwork:    NETWORK,
    feePayer:          FEE_PAYER,
    validateOnChainTx: async () => stub.next,
    emitFeedbackCpi:   async (input) => {
      stub.emitInputs.push(input);
      stub.emitCalls += 1;
      return stub.emitResult;
    },
    priorEmissionLookup: async () => stub.priorEmissionResult,
    ...opts,
  };
}

describe("Dexter.parseRequest", () => {
  let adapter: Dexter;
  beforeEach(() => {
    adapter = new Dexter(makeDeps(new StubChain()));
  });

  it("parses a valid Dexter facilitator-API body", async () => {
    const ctx = await adapter.parseRequest(reqWith(makeBody()));
    expect(ctx).to.not.equal(null);
    expect(ctx!.facilitator).to.equal("dexter");
    expect(ctx!.amount).to.equal(1000n);
    expect(ctx!.policyId).to.equal(1);
  });

  it("returns null when extra.dexter is missing", async () => {
    const body = makeBody();
    delete (body.paymentRequirements as any).extra.dexter;
    expect(await adapter.parseRequest(reqWith(body))).to.equal(null);
  });

  it("returns null when extra.dexter.dexterPolicyVersion is out of range", async () => {
    const body = makeBody({ extra: { dexter: { dexterPolicyVersion: 256 } } });
    expect(await adapter.parseRequest(reqWith(body))).to.equal(null);
  });

  it("returns null when amount is 0", async () => {
    expect(await adapter.parseRequest(
      reqWith(makeBody({ maxAmountRequired: "0" })),
    )).to.equal(null);
  });

  it("returns null on network mismatch", async () => {
    expect(await adapter.parseRequest(
      reqWith(makeBody({ network: "solana-mainnet" })),
    )).to.equal(null);
  });

  it("rejects payTo / payeeRecipient mismatch (B2 inherited)", async () => {
    const body = makeBody();
    (body.paymentRequirements as any).payTo = Keypair.generate().publicKey.toBase58();
    expect(await adapter.parseRequest(reqWith(body))).to.equal(null);
  });

  it("rejects mismatched signing keypair (B5 inherited)", async () => {
    const otherKp = Keypair.generate();
    expect(await adapter.parseRequest(
      reqWith(makeBody({}, { signer: otherKp })),
    )).to.equal(null);
  });

  it("rejects an expired challenge (B5 inherited)", async () => {
    const body = makeBody({}, { issuedAt: Date.now() - 130_000 });
    expect(await adapter.parseRequest(reqWith(body))).to.equal(null);
  });
});

describe("Dexter.formatChallenge", () => {
  const adapter = new Dexter(makeDeps(new StubChain()));
  let ctx: VerifyContext;
  beforeEach(async () => {
    ctx = (await adapter.parseRequest(reqWith(makeBody())))!;
  });

  it("Allow → 200 with isValid:true", () => {
    const c = adapter.formatChallenge({ kind: "Allow" }, ctx);
    expect(c.status).to.equal(200);
    expect((c.body as any).isValid).to.equal(true);
  });

  it("Deny → 402 with reasonCode + invalidReason", () => {
    const decision: GateDecision = { kind: "Deny", reasonCode: 6, reasonName: "CounterpartyTierBelowMin" };
    const c = adapter.formatChallenge(decision, ctx);
    expect(c.status).to.equal(402);
    expect((c.body as any).reasonCode).to.equal(6);
  });

  it("RequireValidation → 402 with capabilityHash hex", () => {
    const c = adapter.formatChallenge(
      { kind: "RequireValidation", capabilityHash: new Uint8Array(32).fill(0xCD) },
      ctx,
    );
    expect(c.status).to.equal(402);
    expect((c.body as any).capabilityHash).to.equal("cd".repeat(32));
  });
});

describe("Dexter.validatePaymentProof", () => {
  let stub: StubChain;
  let adapter: Dexter;
  let ctx: VerifyContext;

  beforeEach(async () => {
    stub = new StubChain();
    adapter = new Dexter(makeDeps(stub));
    ctx = (await adapter.parseRequest(reqWith(makeBody())))!;
  });

  it("happy path returns valid:true with payer + signature", async () => {
    const r = await adapter.validatePaymentProof(
      { payload: { transaction: "BASE64" } }, ctx,
    );
    expect(r.valid).to.equal(true);
  });

  it("rejects malformed proof (Zod)", async () => {
    const r = await adapter.validatePaymentProof({ no: "tx" }, ctx);
    expect(r.valid).to.equal(false);
    if (!r.valid) expect(r.reason).to.equal("malformed_payload");
  });

  it("rejects when payer == feePayer (self-pay)", async () => {
    stub.next = { ...stub.next, payer: FEE_PAYER };
    const r = await adapter.validatePaymentProof({ payload: { transaction: "BASE64" } }, ctx);
    expect(r.valid).to.equal(false);
    if (!r.valid) expect(r.reason).to.equal("invalid_signature");
  });

  it("rejects amount mismatch", async () => {
    stub.next = { ...stub.next, transferredAmount: 999n };
    const r = await adapter.validatePaymentProof({ payload: { transaction: "BASE64" } }, ctx);
    expect(r.valid).to.equal(false);
    if (!r.valid) expect(r.reason).to.equal("mismatched_payment_context");
  });

  it("rejects recipient mismatch", async () => {
    stub.next = { ...stub.next, transferRecipient: Keypair.generate().publicKey };
    const r = await adapter.validatePaymentProof({ payload: { transaction: "BASE64" } }, ctx);
    expect(r.valid).to.equal(false);
    if (!r.valid) expect(r.reason).to.equal("mismatched_payment_context");
  });

  it("replay defense: same sig + new paymentIdHash → mismatched_payment_context", async () => {
    const cache = new ReplayCache();
    const adapter2 = new Dexter(makeDeps(stub, { replayCache: cache }));

    const ctxA = (await adapter2.parseRequest(reqWith(makeBody({
      extra: { memo: "11".repeat(32), dexter: { dexterPolicyVersion: 3 } },
    }))))!;
    const ctxB = (await adapter2.parseRequest(reqWith(makeBody({
      extra: { memo: "22".repeat(32), dexter: { dexterPolicyVersion: 3 } },
    }))))!;

    const r1 = await adapter2.validatePaymentProof({ payload: { transaction: "BASE64" } }, ctxA);
    expect(r1.valid).to.equal(true);
    const r2 = await adapter2.validatePaymentProof({ payload: { transaction: "BASE64" } }, ctxB);
    expect(r2.valid).to.equal(false);
    if (!r2.valid) expect(r2.reason).to.equal("mismatched_payment_context");
  });
});

describe("Dexter.emitFeedback", () => {
  it("delegates to deps.emitFeedbackCpi with dexter tag", async () => {
    const stub = new StubChain();
    const adapter = new Dexter(makeDeps(stub));
    const ctx = (await adapter.parseRequest(reqWith(makeBody())))!;
    const settlement: ConfirmedSettlement = {
      txSignature:   "sig",
      payer:         Keypair.generate().publicKey,
      payee:         PAYEE_AGENT,
      amount:        1000n,
      mint:          MINT_USDC,
      paymentIdHash: ctx.paymentIdHash!,
    };
    const r = await adapter.emitFeedback(ctx, settlement);
    expect(r.feedbackTxSignature).to.equal("feedback-sig-1");
    expect(stub.emitInputs[0].fields.tag1).to.equal("dexter");
  });
});

describe("Dexter.formatSettlement", () => {
  it("includes dexterPolicyVersion + settlementRoute in metadata", async () => {
    const adapter = new Dexter(makeDeps(new StubChain()));
    const ctx = (await adapter.parseRequest(reqWith(makeBody({
      extra: { dexter: { dexterPolicyVersion: 7, settlementRoute: "us-east" } },
    }))))!;
    const r = adapter.formatSettlement(ctx);
    expect(r.facilitatorMeta.dexterPolicyVersion).to.equal(7);
    expect(r.facilitatorMeta.settlementRoute).to.equal("us-east");
  });
});
