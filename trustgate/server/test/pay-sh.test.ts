/**
 * PaySh adapter contract tests.
 *
 * Covers each of the 5 FacilitatorAdapter methods plus replay-cache
 * behavior and idempotent emit_feedback retry. All chain calls are
 * mocked via the deps interface — no Anchor provider, no RPC.
 */

import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";

import {
  ConfirmedSettlement,
  EmitFeedbackInput,
  GateDecision,
  OnChainTxValidation,
  PaySh,
  PayShDeps,
  ReplayCache,
  VerifyContext,
  deriveMemoHash,
} from "../src/facilitators";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NETWORK = "solana-devnet";
const FEE_PAYER = Keypair.generate().publicKey;

const PAYER_AGENT  = Keypair.generate().publicKey;
const PAYEE_AGENT  = Keypair.generate().publicKey;
const PAYEE_RECIP  = Keypair.generate().publicKey;
const MINT_USDC    = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const MEMO_HEX     = "ab".repeat(32);

interface FakeReq {
  body: unknown;
  header(): undefined;
}
function reqWith(body: unknown): FakeReq {
  return { body, header: () => undefined };
}

function makeRequirements(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const base = {
    scheme:            "exact",
    network:           NETWORK,
    maxAmountRequired: "1000",
    asset:             MINT_USDC.toBase58(),
    payTo:             PAYEE_RECIP.toBase58(),
    resource:          "/protected",
    maxTimeoutSeconds: 60,
    extra: {
      feePayer:   FEE_PAYER.toBase58(),
      memo:       MEMO_HEX,
      agentTrust: {
        payerAgentAsset: PAYER_AGENT.toBase58(),
        payeeAgentAsset: PAYEE_AGENT.toBase58(),
        payeeRecipient:  PAYEE_RECIP.toBase58(),
        policyId:        1,
      },
    },
  };
  return { ...base, ...overrides };
}

function makeBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    paymentRequirements: makeRequirements(overrides),
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
  validateCalls = 0;
  emitCalls = 0;
  emitResult = { feedbackTxSignature: "feedback-sig-1", emittedAtSlot: 100 };
  emitError: Error | null = null;
  priorEmissionResult: { feedbackTxSignature: string; emittedAtSlot?: number } | null = null;
}

function makeDeps(stub: StubChain, opts: Partial<PayShDeps> = {}): PayShDeps {
  return {
    signingNetwork:    NETWORK,
    feePayer:          FEE_PAYER,
    validateOnChainTx: async () => {
      stub.validateCalls += 1;
      return stub.next;
    },
    emitFeedbackCpi:   async (input) => {
      stub.emitInputs.push(input);
      stub.emitCalls += 1;
      if (stub.emitError) throw stub.emitError;
      return stub.emitResult;
    },
    priorEmissionLookup: async () => stub.priorEmissionResult,
    ...opts,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PaySh.parseRequest", () => {
  let adapter: PaySh;
  beforeEach(() => {
    adapter = new PaySh(makeDeps(new StubChain()));
  });

  it("parses valid x402 facilitator-API body", async () => {
    const ctx = await adapter.parseRequest(reqWith(makeBody()) as any);
    expect(ctx).to.not.equal(null);
    expect(ctx!.payerAgent.equals(PAYER_AGENT)).to.equal(true);
    expect(ctx!.payeeAgent.equals(PAYEE_AGENT)).to.equal(true);
    expect(ctx!.amount).to.equal(1000n);
    expect(ctx!.mint.equals(MINT_USDC)).to.equal(true);
    expect(ctx!.policyId).to.equal(1);
    expect(ctx!.facilitator).to.equal("pay-sh");
    expect(ctx!.paymentIdHash).to.deep.equal(deriveMemoHash(MEMO_HEX));
  });

  it("returns null when memo is missing (memo is required)", async () => {
    const body = makeBody();
    delete (body.paymentRequirements as any).extra.memo;
    expect(await adapter.parseRequest(reqWith(body) as any)).to.equal(null);
  });

  it("returns null when amount is 0", async () => {
    expect(await adapter.parseRequest(
      reqWith(makeBody({ maxAmountRequired: "0" })) as any,
    )).to.equal(null);
  });

  it("returns null when amount overflows u64", async () => {
    const overflow = (BigInt("0xFFFFFFFFFFFFFFFF") + 1n).toString();
    expect(await adapter.parseRequest(
      reqWith(makeBody({ maxAmountRequired: overflow })) as any,
    )).to.equal(null);
  });

  it("returns null when network slug mismatches deps.signingNetwork", async () => {
    expect(await adapter.parseRequest(
      reqWith(makeBody({ network: "solana-mainnet" })) as any,
    )).to.equal(null);
  });

  it("network match is case-insensitive", async () => {
    const ctx = await adapter.parseRequest(
      reqWith(makeBody({ network: "Solana-Devnet" })) as any,
    );
    expect(ctx).to.not.equal(null);
  });

  it("returns null when amount and maxAmountRequired disagree", async () => {
    expect(await adapter.parseRequest(
      reqWith(makeBody({ maxAmountRequired: "1000", amount: "999" })) as any,
    )).to.equal(null);
  });

  it("returns null when extra.agentTrust is missing", async () => {
    const body = makeBody();
    delete (body.paymentRequirements as any).extra.agentTrust;
    expect(await adapter.parseRequest(reqWith(body) as any)).to.equal(null);
  });

  it("returns null when policyId exceeds u32 max", async () => {
    const body = makeBody();
    (body.paymentRequirements as any).extra.agentTrust.policyId = 0xFFFFFFFF + 1;
    expect(await adapter.parseRequest(reqWith(body) as any)).to.equal(null);
  });

  it("returns null on body=undefined / non-object", async () => {
    expect(await adapter.parseRequest(reqWith(undefined) as any)).to.equal(null);
    expect(await adapter.parseRequest(reqWith("garbage") as any)).to.equal(null);
  });

  it("returns null when payTo disagrees with extra.agentTrust.payeeRecipient (B2)", async () => {
    const body = makeBody();
    (body.paymentRequirements as any).payTo = Keypair.generate().publicKey.toBase58();
    expect(await adapter.parseRequest(reqWith(body) as any)).to.equal(null);
  });

  it("accepts when payTo equals payeeRecipient (B2 happy path)", async () => {
    const ctx = await adapter.parseRequest(reqWith(makeBody()) as any);
    expect(ctx).to.not.equal(null);
  });
});

describe("PaySh.formatChallenge", () => {
  const adapter = new PaySh(makeDeps(new StubChain()));
  let ctx: VerifyContext;

  beforeEach(async () => {
    ctx = (await adapter.parseRequest(reqWith(makeBody()) as any))!;
  });

  it("Allow → 200 with isValid:true and payerAgent in body", () => {
    const c = adapter.formatChallenge({ kind: "Allow" }, ctx);
    expect(c.status).to.equal(200);
    expect((c.body as any).isValid).to.equal(true);
    expect((c.body as any).payerAgent).to.equal(PAYER_AGENT.toBase58());
  });

  it("Deny → 402 with invalidReason and reasonCode", () => {
    const decision: GateDecision = {
      kind: "Deny", reasonCode: 6, reasonName: "CounterpartyTierBelowMin",
    };
    const c = adapter.formatChallenge(decision, ctx);
    expect(c.status).to.equal(402);
    expect((c.body as any).isValid).to.equal(false);
    expect((c.body as any).invalidReason).to.equal("CounterpartyTierBelowMin");
    expect((c.body as any).reasonCode).to.equal(6);
  });

  it("RequireValidation → 402 with capabilityHash hex", () => {
    const c = adapter.formatChallenge(
      { kind: "RequireValidation", capabilityHash: new Uint8Array(32).fill(0xAB) },
      ctx,
    );
    expect(c.status).to.equal(402);
    expect((c.body as any).capabilityHash).to.equal("ab".repeat(32));
  });
});

describe("PaySh.validatePaymentProof", () => {
  let stub: StubChain;
  let adapter: PaySh;
  let ctx: VerifyContext;

  beforeEach(async () => {
    stub = new StubChain();
    adapter = new PaySh(makeDeps(stub));
    ctx = (await adapter.parseRequest(reqWith(makeBody()) as any))!;
  });

  it("happy path returns valid:true with payer and signature", async () => {
    const r = await adapter.validatePaymentProof(
      { payload: { transaction: "BASE64" } },
      ctx,
    );
    expect(r.valid).to.equal(true);
    if (r.valid) {
      expect(r.txSignature).to.equal("sig-1");
      expect(r.settledAtSlot).to.equal(42);
    }
  });

  it("rejects malformed proof body (Zod)", async () => {
    const r = await adapter.validatePaymentProof({ no: "tx" }, ctx);
    expect(r.valid).to.equal(false);
    if (!r.valid) expect(r.reason).to.equal("malformed_payload");
  });

  it("rejects empty transaction string", async () => {
    const r = await adapter.validatePaymentProof(
      { payload: { transaction: "" } },
      ctx,
    );
    expect(r.valid).to.equal(false);
    if (!r.valid) expect(r.reason).to.equal("malformed_payload");
  });

  it("rejects when payer == facilitator feePayer (self-pay defense)", async () => {
    stub.next = { ...stub.next, payer: FEE_PAYER };
    const r = await adapter.validatePaymentProof(
      { payload: { transaction: "BASE64" } }, ctx,
    );
    expect(r.valid).to.equal(false);
    if (!r.valid) expect(r.reason).to.equal("invalid_signature");
  });

  it("rejects when amount mismatches ctx", async () => {
    stub.next = { ...stub.next, transferredAmount: 999n };
    const r = await adapter.validatePaymentProof(
      { payload: { transaction: "BASE64" } }, ctx,
    );
    expect(r.valid).to.equal(false);
    if (!r.valid) expect(r.reason).to.equal("mismatched_payment_context");
  });

  it("rejects when mint mismatches ctx", async () => {
    stub.next = {
      ...stub.next,
      transferredMint: Keypair.generate().publicKey,
    };
    const r = await adapter.validatePaymentProof(
      { payload: { transaction: "BASE64" } }, ctx,
    );
    expect(r.valid).to.equal(false);
    if (!r.valid) expect(r.reason).to.equal("mismatched_payment_context");
  });

  it("rejects when recipient mismatches expectedRecipient", async () => {
    stub.next = {
      ...stub.next,
      transferRecipient: Keypair.generate().publicKey,
    };
    const r = await adapter.validatePaymentProof(
      { payload: { transaction: "BASE64" } }, ctx,
    );
    expect(r.valid).to.equal(false);
    if (!r.valid) expect(r.reason).to.equal("mismatched_payment_context");
  });

  it("rejects when on-chain tx not confirmed", async () => {
    stub.next = { confirmed: false } as OnChainTxValidation;
    const r = await adapter.validatePaymentProof(
      { payload: { transaction: "BASE64" } }, ctx,
    );
    expect(r.valid).to.equal(false);
    if (!r.valid) expect(r.reason).to.equal("invalid_signature");
  });

  it("rejects when confirmed but required fields are missing (all-or-nothing)", async () => {
    stub.next = {
      confirmed: true,
      payer: Keypair.generate().publicKey,
      signature: "sig",
      // missing transferredAmount/Mint/Recipient
    } as OnChainTxValidation;
    const r = await adapter.validatePaymentProof(
      { payload: { transaction: "BASE64" } }, ctx,
    );
    expect(r.valid).to.equal(false);
    if (!r.valid) expect(r.reason).to.equal("settlement_failed");
  });

  it("forwards on-chain errorReason + sanitized detail", async () => {
    stub.next = {
      confirmed: false,
      errorReason: "expired_payment",
      errorDetail: "blockhash expired at https://rpc.example/foo",
    } as OnChainTxValidation;
    const r = await adapter.validatePaymentProof(
      { payload: { transaction: "BASE64" } }, ctx,
    );
    expect(r.valid).to.equal(false);
    if (!r.valid) {
      expect(r.reason).to.equal("expired_payment");
      // sanitizeDetail collapses to "blockhash invalid or expired"
      expect(r.detail).to.equal("blockhash invalid or expired");
    }
  });

  it("sanitises raw e.message when validateOnChainTx throws", async () => {
    const adapter2 = new PaySh(makeDeps(stub, {
      validateOnChainTx: async () => {
        throw new Error("connect ECONNREFUSED https://leaky.rpc.url:8899");
      },
    }));
    const ctx2 = (await adapter2.parseRequest(reqWith(makeBody()) as any))!;
    const r = await adapter2.validatePaymentProof(
      { payload: { transaction: "BASE64" } }, ctx2,
    );
    expect(r.valid).to.equal(false);
    if (!r.valid) {
      expect(r.reason).to.equal("settlement_failed");
      expect(r.detail).to.equal("see server logs");
    }
  });

  it("replay defense: same sig + new paymentIdHash → mismatched_payment_context", async () => {
    const cache = new ReplayCache();
    const adapter2 = new PaySh(makeDeps(stub, { replayCache: cache }));

    const ctxA = (await adapter2.parseRequest(reqWith(makeBody({
      extra: {
        feePayer:   FEE_PAYER.toBase58(),
        memo:       "aa".repeat(32),
        agentTrust: {
          payerAgentAsset: PAYER_AGENT.toBase58(),
          payeeAgentAsset: PAYEE_AGENT.toBase58(),
          payeeRecipient:  PAYEE_RECIP.toBase58(),
          policyId:        1,
        },
      },
    })) as any))!;
    const ctxB = (await adapter2.parseRequest(reqWith(makeBody({
      extra: {
        feePayer:   FEE_PAYER.toBase58(),
        memo:       "bb".repeat(32),
        agentTrust: {
          payerAgentAsset: PAYER_AGENT.toBase58(),
          payeeAgentAsset: PAYEE_AGENT.toBase58(),
          payeeRecipient:  PAYEE_RECIP.toBase58(),
          policyId:        1,
        },
      },
    })) as any))!;

    const r1 = await adapter2.validatePaymentProof(
      { payload: { transaction: "BASE64" } }, ctxA,
    );
    expect(r1.valid).to.equal(true);

    const r2 = await adapter2.validatePaymentProof(
      { payload: { transaction: "BASE64" } }, ctxB,
    );
    expect(r2.valid).to.equal(false);
    if (!r2.valid) expect(r2.reason).to.equal("mismatched_payment_context");
  });

  it("replay defense: same sig + same paymentIdHash → still valid (idempotent)", async () => {
    const cache = new ReplayCache();
    const adapter2 = new PaySh(makeDeps(stub, { replayCache: cache }));
    const ctx2 = (await adapter2.parseRequest(reqWith(makeBody()) as any))!;

    const r1 = await adapter2.validatePaymentProof(
      { payload: { transaction: "BASE64" } }, ctx2,
    );
    const r2 = await adapter2.validatePaymentProof(
      { payload: { transaction: "BASE64" } }, ctx2,
    );
    expect(r1.valid).to.equal(true);
    expect(r2.valid).to.equal(true);
  });
});

describe("PaySh.emitFeedback", () => {
  let stub: StubChain;
  let adapter: PaySh;
  let ctx: VerifyContext;
  let settlement: ConfirmedSettlement;

  beforeEach(async () => {
    stub = new StubChain();
    adapter = new PaySh(makeDeps(stub));
    ctx = (await adapter.parseRequest(reqWith(makeBody()) as any))!;
    settlement = {
      txSignature:   "sig-1",
      payer:         Keypair.generate().publicKey,
      payee:         PAYEE_AGENT,
      amount:        1000n,
      mint:          MINT_USDC,
      paymentIdHash: ctx.paymentIdHash!,
    };
  });

  it("happy path returns FeedbackEmissionResult", async () => {
    const r = await adapter.emitFeedback(ctx, settlement);
    expect(r.feedbackTxSignature).to.equal("feedback-sig-1");
    expect(r.paymentIdHash).to.deep.equal(settlement.paymentIdHash);
    expect(stub.emitCalls).to.equal(1);
    const args = stub.emitInputs[0];
    expect(args.fields.score).to.equal(100);
    expect(args.fields.tag1).to.equal("pay-sh");
    expect(args.fields.tag2).to.equal("policy=1");
    expect(args.fields.endpoint).to.equal("/protected");
  });

  it("idempotent retry: 'already in use' falls back to priorEmissionLookup", async () => {
    stub.emitError = new Error("custom program error: 0x0 (already in use)");
    stub.priorEmissionResult = {
      feedbackTxSignature: "prior-feedback-sig",
      emittedAtSlot:       55,
    };
    const r = await adapter.emitFeedback(ctx, settlement);
    expect(r.feedbackTxSignature).to.equal("prior-feedback-sig");
    expect(r.emittedAtSlot).to.equal(55);
  });

  it("propagates non-replay errors", async () => {
    stub.emitError = new Error("RPC timeout");
    let caught: Error | null = null;
    try { await adapter.emitFeedback(ctx, settlement); }
    catch (e) { caught = e as Error; }
    expect(caught?.message).to.equal("RPC timeout");
  });

  it("propagates replay error when no priorEmissionLookup configured", async () => {
    const adapter2 = new PaySh(makeDeps(stub, { priorEmissionLookup: undefined }));
    stub.emitError = new Error("account already in use");
    const ctx2 = (await adapter2.parseRequest(reqWith(makeBody()) as any))!;
    let caught: Error | null = null;
    try {
      await adapter2.emitFeedback(ctx2, {
        ...settlement,
        paymentIdHash: ctx2.paymentIdHash!,
      });
    } catch (e) { caught = e as Error; }
    expect(caught?.message).to.equal("account already in use");
  });
});

describe("PaySh.formatSettlement", () => {
  it("returns null tx + facilitator metadata", async () => {
    const adapter = new PaySh(makeDeps(new StubChain()));
    const ctx = (await adapter.parseRequest(reqWith(makeBody()) as any))!;
    const r = adapter.formatSettlement(ctx);
    expect(r.unsignedTransactionBase64).to.equal(null);
    expect(r.facilitatorMeta.network).to.equal(NETWORK);
    expect(r.facilitatorMeta.feePayer).to.equal(FEE_PAYER.toBase58());
    expect(r.facilitatorMeta.payeeAgent).to.equal(PAYEE_AGENT.toBase58());
    expect(r.facilitatorMeta.policyId).to.equal(1);
  });
});

describe("ReplayCache", () => {
  it("evicts oldest entry when at capacity", () => {
    const cache = new ReplayCache(2);
    const h1 = new Uint8Array(32).fill(0x11);
    const h2 = new Uint8Array(32).fill(0x22);
    const h3 = new Uint8Array(32).fill(0x33);
    expect(cache.observe("sig-a", h1)).to.equal("fresh");
    expect(cache.observe("sig-b", h2)).to.equal("fresh");
    expect(cache.observe("sig-c", h3)).to.equal("fresh");
    expect(cache.size()).to.equal(2);
    // sig-a was evicted; resubmitting it is "fresh" again
    expect(cache.observe("sig-a", h1)).to.equal("fresh");
  });

  it("returns 'replay' when same sig + same hash observed twice", () => {
    const cache = new ReplayCache();
    const h = new Uint8Array(32).fill(0xAA);
    expect(cache.observe("sig-x", h)).to.equal("fresh");
    expect(cache.observe("sig-x", h)).to.equal("replay");
  });

  it("returns 'collision' when same sig + new hash", () => {
    const cache = new ReplayCache();
    const h1 = new Uint8Array(32).fill(0xAA);
    const h2 = new Uint8Array(32).fill(0xBB);
    expect(cache.observe("sig-x", h1)).to.equal("fresh");
    expect(cache.observe("sig-x", h2)).to.equal("collision");
  });
});
