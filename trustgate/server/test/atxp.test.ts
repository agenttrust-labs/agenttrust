/**
 * Atxp adapter contract tests. Mirrors pay-sh / dexter coverage with
 * atxp-specific JWT-verification reject branches.
 */

import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";

import {
  Atxp,
  AtxpDeps,
  AtxpJwtClaims,
  ConfirmedSettlement,
  EmitFeedbackInput,
  GateDecision,
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
const MEMO_HEX        = "ee".repeat(32);
const JWKS_URI        = "https://atxp.example/.well-known/jwks.json";
const TENANT_ISS      = "https://atxp.example/tenants/agenttrust-demo";

function reqWith(body: unknown): any {
  return { body, header: () => undefined };
}

interface MakeOptions {
  readonly overrides?: Record<string, unknown>;
  readonly signer?:    Keypair;
  readonly issuedAt?:  number;
  readonly forceSignatureHex?: string;
  readonly omitJwt?:   boolean;
}

function makeRequirements(opts: MakeOptions = {}): Record<string, unknown> {
  const overrides = opts.overrides ?? {};
  const signer    = opts.signer ?? FACILITATOR_KP;
  const issuedAt  = opts.issuedAt ?? Date.now();

  const extraOverride = (overrides.extra as Record<string, unknown> | undefined) ?? {};
  const agentTrustOverride = (extraOverride.agentTrust as Record<string, unknown> | undefined) ?? {};
  const atxpOverride       = (extraOverride.atxp       as Record<string, unknown> | undefined) ?? {};
  const memo = (extraOverride.memo as string | undefined) ?? MEMO_HEX;

  const network         = (overrides.network          as string | undefined) ?? NETWORK;
  const amount          = (overrides.maxAmountRequired as string | undefined) ?? "1000";
  const asset           = (overrides.asset            as string | undefined) ?? MINT_USDC.toBase58();
  const payTo           = (overrides.payTo            as string | undefined) ?? PAYEE_RECIP.toBase58();
  const payerAgentAsset = (agentTrustOverride.payerAgentAsset as string | undefined) ?? PAYER_AGENT.toBase58();
  const payeeAgentAsset = (agentTrustOverride.payeeAgentAsset as string | undefined) ?? PAYEE_AGENT.toBase58();
  const payeeRecipient  = (agentTrustOverride.payeeRecipient  as string | undefined) ?? PAYEE_RECIP.toBase58();
  const policyId        = (agentTrustOverride.policyId         as number | undefined) ?? 1;
  const jwksUri         = (atxpOverride.jwksUri as string | undefined) ?? JWKS_URI;

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
    atxp:       { jwksUri },
  };

  const { network: _n, maxAmountRequired: _m, asset: _a, payTo: _p, extra: _e, ...rest } = overrides;
  return {
    scheme: "exact", network, maxAmountRequired: amount,
    asset, payTo, resource: "/protected", maxTimeoutSeconds: 60,
    extra: baseExtra, ...rest,
  };
}

function makeBody(overrides: Record<string, unknown> = {}, signOpts: MakeOptions = {}): Record<string, unknown> {
  const body: any = { paymentRequirements: makeRequirements({ ...signOpts, overrides }) };
  if (!signOpts.omitJwt) {
    body.paymentPayload = {
      x402Version: 2,
      payload: { transaction: "BASE64TXBYTES", token: "fake.jwt.token" },
    };
  }
  return body;
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
  jwtResult: { ok: true; claims: AtxpJwtClaims } | { ok: false; reason: any; detail?: string } = {
    ok: true, claims: {
      iss: TENANT_ISS,
      sub: Keypair.generate().publicKey.toBase58(),
      amount: "1000",
      mint: MINT_USDC.toBase58(),
      recipient: PAYEE_RECIP.toBase58(),
      paymentIdHashHex: bytesToHex(deriveMemoHash(MEMO_HEX)),
      exp: Math.floor(Date.now() / 1000) + 300,
    },
  };
}

function makeDeps(stub: StubChain, opts: Partial<AtxpDeps> = {}): AtxpDeps {
  return {
    signingNetwork:    NETWORK,
    feePayer:          FEE_PAYER,
    validateOnChainTx: async () => stub.next,
    emitFeedbackCpi:   async (input) => { stub.emitInputs.push(input); return stub.emitResult; },
    verifyAtxpJwt:     async () => stub.jwtResult,
    ...opts,
  };
}

describe("Atxp.parseRequest", () => {
  let stub: StubChain;
  let adapter: Atxp;
  beforeEach(() => { stub = new StubChain(); adapter = new Atxp(makeDeps(stub)); });

  it("parses valid atxp body with JWT", async () => {
    const ctx = await adapter.parseRequest(reqWith(makeBody()));
    expect(ctx).to.not.equal(null);
    expect(ctx!.facilitator).to.equal("atxp");
  });

  it("parses without JWT (verify-only)", async () => {
    const ctx = await adapter.parseRequest(reqWith(makeBody({}, { omitJwt: true })));
    expect(ctx).to.not.equal(null);
  });

  it("rejects when extra.atxp is missing", async () => {
    const body = makeBody();
    delete (body.paymentRequirements as any).extra.atxp;
    expect(await adapter.parseRequest(reqWith(body))).to.equal(null);
  });

  it("rejects when extra.atxp.jwksUri is malformed", async () => {
    const body = makeBody({ extra: { atxp: { jwksUri: "not-a-url" } } });
    expect(await adapter.parseRequest(reqWith(body))).to.equal(null);
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

  it("rejects when JWT verifier fails", async () => {
    stub.jwtResult = { ok: false, reason: "invalid_signature", detail: "bad sig" };
    expect(await adapter.parseRequest(reqWith(makeBody()))).to.equal(null);
  });

  it("rejects when JWT amount mismatches requirements", async () => {
    stub.jwtResult.ok && (stub.jwtResult.claims.amount = "999");
    expect(await adapter.parseRequest(reqWith(makeBody()))).to.equal(null);
  });

  it("rejects when JWT mint mismatches requirements", async () => {
    stub.jwtResult.ok && (stub.jwtResult.claims.mint = Keypair.generate().publicKey.toBase58());
    expect(await adapter.parseRequest(reqWith(makeBody()))).to.equal(null);
  });

  it("rejects when JWT recipient mismatches requirements", async () => {
    stub.jwtResult.ok && (stub.jwtResult.claims.recipient = Keypair.generate().publicKey.toBase58());
    expect(await adapter.parseRequest(reqWith(makeBody()))).to.equal(null);
  });

  it("rejects when JWT exp is in the past", async () => {
    stub.jwtResult.ok && (stub.jwtResult.claims.exp = Math.floor(Date.now() / 1000) - 600);
    expect(await adapter.parseRequest(reqWith(makeBody()))).to.equal(null);
  });

  it("rejects when JWT paymentIdHash mismatches memo-derived hash", async () => {
    stub.jwtResult.ok && (stub.jwtResult.claims.paymentIdHashHex = "00".repeat(32));
    expect(await adapter.parseRequest(reqWith(makeBody()))).to.equal(null);
  });
});

describe("Atxp.formatChallenge", () => {
  const adapter = new Atxp(makeDeps(new StubChain()));
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
});

describe("Atxp.validatePaymentProof", () => {
  let stub: StubChain;
  let adapter: Atxp;
  let ctx: VerifyContext;

  beforeEach(async () => {
    stub = new StubChain();
    adapter = new Atxp(makeDeps(stub));
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

  it("replay defense: same sig + new paymentIdHash → mismatched_payment_context", async () => {
    const cache = new ReplayCache();
    const adapter2 = new Atxp(makeDeps(stub, { replayCache: cache }));

    // Re-bind JWT claim hash to memo "11" for ctxA
    if (stub.jwtResult.ok) stub.jwtResult.claims.paymentIdHashHex = bytesToHex(deriveMemoHash("11".repeat(32)));
    const ctxA = (await adapter2.parseRequest(reqWith(makeBody({
      extra: { memo: "11".repeat(32), atxp: { jwksUri: JWKS_URI } },
    }))))!;

    // Re-bind for ctxB
    if (stub.jwtResult.ok) stub.jwtResult.claims.paymentIdHashHex = bytesToHex(deriveMemoHash("22".repeat(32)));
    const ctxB = (await adapter2.parseRequest(reqWith(makeBody({
      extra: { memo: "22".repeat(32), atxp: { jwksUri: JWKS_URI } },
    }))))!;

    const r1 = await adapter2.validatePaymentProof({ payload: { transaction: "BASE64" } }, ctxA);
    expect(r1.valid).to.equal(true);
    const r2 = await adapter2.validatePaymentProof({ payload: { transaction: "BASE64" } }, ctxB);
    expect(r2.valid).to.equal(false);
    if (!r2.valid) expect(r2.reason).to.equal("mismatched_payment_context");
  });
});

describe("Atxp.emitFeedback", () => {
  it("delegates to deps.emitFeedbackCpi with atxp tag", async () => {
    const stub = new StubChain();
    const adapter = new Atxp(makeDeps(stub));
    const ctx = (await adapter.parseRequest(reqWith(makeBody())))!;
    const settlement: ConfirmedSettlement = {
      txSignature: "sig", payer: Keypair.generate().publicKey, payee: PAYEE_AGENT,
      amount: 1000n, mint: MINT_USDC, paymentIdHash: ctx.paymentIdHash!,
    };
    const r = await adapter.emitFeedback(ctx, settlement);
    expect(r.feedbackTxSignature).to.equal("feedback-sig-1");
    expect(stub.emitInputs[0].fields.tag1).to.equal("atxp");
  });
});

describe("Atxp.formatSettlement", () => {
  it("includes atxpIssuer + jwksUri in metadata", async () => {
    const adapter = new Atxp(makeDeps(new StubChain()));
    const ctx = (await adapter.parseRequest(reqWith(makeBody())))!;
    const r = adapter.formatSettlement(ctx);
    expect(r.facilitatorMeta.jwksUri).to.equal(JWKS_URI);
    expect(r.facilitatorMeta.atxpIssuer).to.equal(TENANT_ISS);
  });
});
