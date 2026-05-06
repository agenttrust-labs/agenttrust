/**
 * McPay adapter contract tests. Mirrors pay-sh / dexter coverage with
 * mcpay-specific multi-chain reject branches.
 */

import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";

import {
  ConfirmedSettlement,
  EmitFeedbackInput,
  GateDecision,
  McPay,
  McPayDeps,
  ReplayCache,
  VerifyContext,
  bytesToHex,
  canonicalChallengeBytes,
  deriveMemoHash,
  signEnvelope,
  type OnChainTxValidation as PayShOnChainTxValidation,
} from "../src/facilitators";

const NETWORK         = "solana-devnet";
const FACILITATOR_KP  = Keypair.generate();
const FEE_PAYER       = FACILITATOR_KP.publicKey;
const PAYER_AGENT     = Keypair.generate().publicKey;
const PAYEE_AGENT     = Keypair.generate().publicKey;
const PAYEE_RECIP     = Keypair.generate().publicKey;
const MINT_USDC       = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const MEMO_HEX        = "ff".repeat(32);

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
  const signer    = opts.signer ?? FACILITATOR_KP;
  const issuedAt  = opts.issuedAt ?? Date.now();

  const extraOverride = (overrides.extra as Record<string, unknown> | undefined) ?? {};
  const agentTrustOverride = (extraOverride.agentTrust as Record<string, unknown> | undefined) ?? {};
  const mcpayOverride      = (extraOverride.mcpay      as Record<string, unknown> | undefined) ?? {};
  const memo = (extraOverride.memo as string | undefined) ?? MEMO_HEX;

  const network         = (overrides.network          as string | undefined) ?? NETWORK;
  const amount          = (overrides.maxAmountRequired as string | undefined) ?? "1000";
  const asset           = (overrides.asset            as string | undefined) ?? MINT_USDC.toBase58();
  const payTo           = (overrides.payTo            as string | undefined) ?? PAYEE_RECIP.toBase58();
  const payerAgentAsset = (agentTrustOverride.payerAgentAsset as string | undefined) ?? PAYER_AGENT.toBase58();
  const payeeAgentAsset = (agentTrustOverride.payeeAgentAsset as string | undefined) ?? PAYEE_AGENT.toBase58();
  const payeeRecipient  = (agentTrustOverride.payeeRecipient  as string | undefined) ?? PAYEE_RECIP.toBase58();
  const policyId        = (agentTrustOverride.policyId         as number | undefined) ?? 1;
  const mcpayChain      = (mcpayOverride.mcpayChain    as string | undefined) ?? "solana-devnet";
  const mcpayProtocol   = (mcpayOverride.mcpayProtocol as string | undefined) ?? "x402";

  const memoHash = deriveMemoHash(memo);
  const sigHex = opts.forceSignatureHex ?? bytesToHex(signEnvelope(
    canonicalChallengeBytes({
      issuedAt, network, amount: BigInt(amount), asset, payTo,
      payerAgentAsset, payeeAgentAsset, payeeRecipient, policyId,
      paymentIdHashHex: bytesToHex(memoHash),
    }),
    signer.secretKey,
  ));

  const baseExtra = {
    feePayer: FEE_PAYER.toBase58(), memo,
    agentTrust: { payerAgentAsset, payeeAgentAsset, payeeRecipient, policyId, issuedAt, serviceSignature: sigHex },
    mcpay:      { mcpayChain, mcpayProtocol },
  };
  const { network: _n, maxAmountRequired: _m, asset: _a, payTo: _p, extra: _e, ...rest } = overrides;
  return {
    scheme: "exact", network, maxAmountRequired: amount,
    asset, payTo, resource: "/protected", maxTimeoutSeconds: 60,
    extra: baseExtra, ...rest,
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
  next: PayShOnChainTxValidation = {
    confirmed:         true,
    payer:             Keypair.generate().publicKey,
    signature:         "sig-1",
    slot:              42,
    transferredAmount: 1000n,
    transferredMint:   MINT_USDC,
    transferRecipient: PAYEE_RECIP,
  };
  emitInputs: EmitFeedbackInput[] = [];
  emitResult = { feedbackTxSignature: "feedback-sig-1", emittedAtSlot: 100 };
}

function makeDeps(stub: StubChain, opts: Partial<McPayDeps> = {}): McPayDeps {
  return {
    signingNetwork:    NETWORK,
    feePayer:          FEE_PAYER,
    validateOnChainTx: async () => stub.next,
    emitFeedbackCpi:   async (input) => { stub.emitInputs.push(input); return stub.emitResult; },
    ...opts,
  };
}

describe("McPay.parseRequest", () => {
  let stub: StubChain;
  let adapter: McPay;
  beforeEach(() => { stub = new StubChain(); adapter = new McPay(makeDeps(stub)); });

  it("parses valid Solana-devnet body", async () => {
    const ctx = await adapter.parseRequest(reqWith(makeBody()));
    expect(ctx).to.not.equal(null);
    expect(ctx!.facilitator).to.equal("mcpay");
  });

  it("rejects when extra.mcpay is missing", async () => {
    const body = makeBody();
    delete (body.paymentRequirements as any).extra.mcpay;
    expect(await adapter.parseRequest(reqWith(body))).to.equal(null);
  });

  it("rejects unsupported mcpayChain (EVM)", async () => {
    // strict zod literal union — outside-set values fail at the schema
    const body = makeBody({ extra: { mcpay: { mcpayChain: "ethereum-mainnet", mcpayProtocol: "x402" } } });
    expect(await adapter.parseRequest(reqWith(body))).to.equal(null);
  });

  it("rejects mcpayChain mismatch with deps.signingNetwork", async () => {
    // mainnet client against a devnet-configured adapter
    const body = makeBody({
      extra: { mcpay: { mcpayChain: "solana-mainnet", mcpayProtocol: "x402" } },
    });
    expect(await adapter.parseRequest(reqWith(body))).to.equal(null);
  });

  it("rejects unsupported mcpayProtocol", async () => {
    const body = makeBody({
      extra: { mcpay: { mcpayChain: "solana-devnet", mcpayProtocol: "lightning" } },
    });
    expect(await adapter.parseRequest(reqWith(body))).to.equal(null);
  });

  it("accepts mcpayProtocol=mpp", async () => {
    const body = makeBody({
      extra: { mcpay: { mcpayChain: "solana-devnet", mcpayProtocol: "mpp" } },
    });
    expect(await adapter.parseRequest(reqWith(body))).to.not.equal(null);
  });

  it("rejects amount=0", async () => {
    expect(await adapter.parseRequest(
      reqWith(makeBody({ maxAmountRequired: "0" })),
    )).to.equal(null);
  });

  it("rejects network mismatch", async () => {
    expect(await adapter.parseRequest(
      reqWith(makeBody({ network: "solana-mainnet" })),
    )).to.equal(null);
  });

  it("rejects payTo / payeeRecipient mismatch (B2)", async () => {
    const body = makeBody();
    (body.paymentRequirements as any).payTo = Keypair.generate().publicKey.toBase58();
    expect(await adapter.parseRequest(reqWith(body))).to.equal(null);
  });

  it("rejects mismatched signing keypair (B5)", async () => {
    expect(await adapter.parseRequest(
      reqWith(makeBody({}, { signer: Keypair.generate() })),
    )).to.equal(null);
  });

  it("rejects expired challenge", async () => {
    expect(await adapter.parseRequest(
      reqWith(makeBody({}, { issuedAt: Date.now() - 130_000 })),
    )).to.equal(null);
  });

  it("rejects amount > u64", async () => {
    const overflow = (BigInt("0xFFFFFFFFFFFFFFFF") + 1n).toString();
    expect(await adapter.parseRequest(
      reqWith(makeBody({ maxAmountRequired: overflow })),
    )).to.equal(null);
  });
});

describe("McPay.formatChallenge", () => {
  const adapter = new McPay(makeDeps(new StubChain()));
  let ctx: VerifyContext;
  beforeEach(async () => { ctx = (await adapter.parseRequest(reqWith(makeBody())))!; });

  it("Allow → 200", () => {
    const c = adapter.formatChallenge({ kind: "Allow" }, ctx);
    expect(c.status).to.equal(200);
  });

  it("Deny → 402 with reasonCode", () => {
    const c = adapter.formatChallenge(
      { kind: "Deny", reasonCode: 6, reasonName: "CounterpartyTierBelowMin" }, ctx,
    );
    expect(c.status).to.equal(402);
    expect((c.body as any).reasonCode).to.equal(6);
  });

  it("RequireValidation → 402 with capabilityHash", () => {
    const c = adapter.formatChallenge(
      { kind: "RequireValidation", capabilityHash: new Uint8Array(32).fill(0xEF) }, ctx,
    );
    expect((c.body as any).capabilityHash).to.equal("ef".repeat(32));
  });
});

describe("McPay.validatePaymentProof", () => {
  let stub: StubChain;
  let adapter: McPay;
  let ctx: VerifyContext;

  beforeEach(async () => {
    stub = new StubChain();
    adapter = new McPay(makeDeps(stub));
    ctx = (await adapter.parseRequest(reqWith(makeBody())))!;
  });

  it("happy path returns valid:true", async () => {
    const r = await adapter.validatePaymentProof({ payload: { transaction: "BASE64" } }, ctx);
    expect(r.valid).to.equal(true);
  });

  it("rejects when payer == feePayer", async () => {
    stub.next = { ...stub.next, payer: FEE_PAYER };
    const r = await adapter.validatePaymentProof({ payload: { transaction: "BASE64" } }, ctx);
    expect(r.valid).to.equal(false);
    if (!r.valid) expect(r.reason).to.equal("invalid_signature");
  });

  it("rejects amount mismatch", async () => {
    stub.next = { ...stub.next, transferredAmount: 999n };
    const r = await adapter.validatePaymentProof({ payload: { transaction: "BASE64" } }, ctx);
    expect(r.valid).to.equal(false);
  });

  it("replay defense: same sig + new paymentIdHash → mismatched_payment_context", async () => {
    const cache = new ReplayCache();
    const adapter2 = new McPay(makeDeps(stub, { replayCache: cache }));

    const ctxA = (await adapter2.parseRequest(reqWith(makeBody({
      extra: { memo: "11".repeat(32), mcpay: { mcpayChain: "solana-devnet", mcpayProtocol: "x402" } },
    }))))!;
    const ctxB = (await adapter2.parseRequest(reqWith(makeBody({
      extra: { memo: "22".repeat(32), mcpay: { mcpayChain: "solana-devnet", mcpayProtocol: "x402" } },
    }))))!;
    const r1 = await adapter2.validatePaymentProof({ payload: { transaction: "BASE64" } }, ctxA);
    expect(r1.valid).to.equal(true);
    const r2 = await adapter2.validatePaymentProof({ payload: { transaction: "BASE64" } }, ctxB);
    expect(r2.valid).to.equal(false);
    if (!r2.valid) expect(r2.reason).to.equal("mismatched_payment_context");
  });
});

describe("McPay.emitFeedback", () => {
  it("delegates to deps.emitFeedbackCpi with mcpay tag", async () => {
    const stub = new StubChain();
    const adapter = new McPay(makeDeps(stub));
    const ctx = (await adapter.parseRequest(reqWith(makeBody())))!;
    const settlement: ConfirmedSettlement = {
      txSignature: "sig", payer: Keypair.generate().publicKey, payee: PAYEE_AGENT,
      amount: 1000n, mint: MINT_USDC, paymentIdHash: ctx.paymentIdHash!,
    };
    const r = await adapter.emitFeedback(ctx, settlement);
    expect(r.feedbackTxSignature).to.equal("feedback-sig-1");
    expect(stub.emitInputs[0].fields.tag1).to.equal("mcpay");
  });
});

describe("McPay.formatSettlement", () => {
  it("includes mcpayChain + mcpayProtocol in metadata", async () => {
    const adapter = new McPay(makeDeps(new StubChain()));
    const ctx = (await adapter.parseRequest(reqWith(makeBody({
      extra: { mcpay: { mcpayChain: "solana-devnet", mcpayProtocol: "mpp" } },
    }))))!;
    const r = adapter.formatSettlement(ctx);
    expect(r.facilitatorMeta.mcpayChain).to.equal("solana-devnet");
    expect(r.facilitatorMeta.mcpayProtocol).to.equal("mpp");
  });
});
