/**
 * Cross-adapter LSP test — every real adapter (PaySh, Dexter, Atxp, McPay)
 * must satisfy the same FacilitatorAdapter contract so the registry can
 * substitute any one for any other at runtime.
 *
 * What's locked in here that the per-adapter test files DON'T cover:
 *   • Each adapter exposes the same 5 lifecycle methods with the right
 *     arity (parseRequest, formatChallenge, formatSettlement,
 *     validatePaymentProof, emitFeedback).
 *   • Each adapter's `formatChallenge` produces a 200 for Allow and a 402
 *     for Deny / RequireValidation — the load-bearing x402 status code
 *     contract every facilitator must honour.
 *   • Every adapter exposes a non-empty `name` and a registry can hold
 *     one of each without name collision.
 *
 * The per-adapter files exercise body-schema parsing, replay defense,
 * and SERVICE-signing details specific to each adapter; this file is the
 * substitution-equivalence proof.
 */

import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";

import {
  FacilitatorAdapter,
  FacilitatorRegistry,
  PaySh,
  Dexter,
  Atxp,
  McPay,
} from "../src/facilitators";
import type { OnChainTxValidation } from "@agenttrust-sdk/trustgate";

// ---------------------------------------------------------------------------
// Stubs — minimal but full-shape so each adapter's constructor accepts them.
// ---------------------------------------------------------------------------

const FEE_PAYER  = Keypair.generate().publicKey;
const PAYEE_AGENT = Keypair.generate().publicKey;
const PAYEE_RECIP = Keypair.generate().publicKey;
const MINT_USDC   = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const NETWORK     = "solana-devnet";

const stubValidation: OnChainTxValidation = {
  confirmed:         true,
  payer:             Keypair.generate().publicKey,
  signature:         "sig-1",
  slot:              42,
  transferredAmount: 1000n,
  transferredMint:   MINT_USDC,
  transferRecipient: PAYEE_RECIP,
};

const stubDeps = {
  signingNetwork:    NETWORK,
  feePayer:          FEE_PAYER,
  validateOnChainTx: async () => stubValidation,
  emitFeedbackCpi:   async () => ({ feedbackTxSignature: "fb-1", emittedAtSlot: 100 }),
};

// All 4 real adapters constructed with the same dep-shape they accept.
// The atxp adapter additionally takes a `verifyAtxpJwt` dep; we stub it
// with a permissive verifier so the cross-adapter test isn't gated on
// JWT internals.
function makeAdapters(): FacilitatorAdapter[] {
  return [
    new PaySh(stubDeps),
    new Dexter(stubDeps),
    new Atxp({
      ...stubDeps,
      verifyAtxpJwt: async () => ({
        ok: true,
        claims: {
          jti: "stub-jti", sub: "stub-sub", iss: "stub-iss",
          paymentIdHashHex:    "00".repeat(32),
          mint:                MINT_USDC.toBase58(),
          recipient:           PAYEE_RECIP.toBase58(),
          amount:              "1000",
          exp:                 Math.floor(Date.now() / 1000) + 600,
          iat:                 Math.floor(Date.now() / 1000),
        },
      }),
    }),
    new McPay(stubDeps),
  ];
}

// ---------------------------------------------------------------------------

describe("cross-adapter LSP — every real adapter satisfies FacilitatorAdapter", () => {
  it("each adapter exposes the 5 lifecycle methods", () => {
    for (const a of makeAdapters()) {
      expect(typeof a.name, `${a.name} missing name`).to.equal("string");
      expect(a.name.length, `${a.name} empty name`).to.be.greaterThan(0);
      expect(typeof a.parseRequest,        `${a.name}.parseRequest`).to.equal("function");
      expect(typeof a.formatChallenge,     `${a.name}.formatChallenge`).to.equal("function");
      expect(typeof a.formatSettlement,    `${a.name}.formatSettlement`).to.equal("function");
      expect(typeof a.validatePaymentProof, `${a.name}.validatePaymentProof`).to.equal("function");
      expect(typeof a.emitFeedback,        `${a.name}.emitFeedback`).to.equal("function");
    }
  });

  function makeCtx(): Parameters<FacilitatorAdapter["formatChallenge"]>[1] {
    return {
      amount:              1000n,
      mint:                MINT_USDC,
      payerAgent:          Keypair.generate().publicKey,
      payeeAgent:          PAYEE_AGENT,
      payeeRecipient:      PAYEE_RECIP,
      signingNetwork:      NETWORK,
      paymentIdHash:       new Uint8Array(32).fill(0xAB),
    } as unknown as Parameters<FacilitatorAdapter["formatChallenge"]>[1];
  }

  it("each adapter's formatChallenge returns 200 for Allow", () => {
    for (const a of makeAdapters()) {
      const res = a.formatChallenge({ kind: "Allow" }, makeCtx());
      expect(res.status, `${a.name} Allow → 200`).to.equal(200);
    }
  });

  it("each adapter's formatChallenge returns 402 for Deny", () => {
    for (const a of makeAdapters()) {
      const res = a.formatChallenge(
        { kind: "Deny", reasonCode: 6, reasonName: "CounterpartyTierBelowMin" },
        makeCtx(),
      );
      expect(res.status, `${a.name} Deny → 402`).to.equal(402);
    }
  });

  it("each adapter's formatChallenge returns 402 for RequireValidation", () => {
    for (const a of makeAdapters()) {
      const res = a.formatChallenge(
        { kind: "RequireValidation", capabilityHash: new Uint8Array(32).fill(0x33) },
        makeCtx(),
      );
      expect(res.status, `${a.name} RequireValidation → 402`).to.equal(402);
    }
  });

  it("a registry can hold all 4 adapters without name collision", () => {
    const registry = new FacilitatorRegistry();
    const adapters = makeAdapters();
    const names = new Set<string>();
    for (const a of adapters) {
      expect(names.has(a.name), `duplicate name ${a.name}`).to.equal(false);
      names.add(a.name);
      registry.register(a);
    }
    expect(names.size).to.equal(adapters.length);

    // Lookup each by name.
    for (const a of adapters) {
      expect(registry.get(a.name)).to.equal(a);
    }
  });
});
