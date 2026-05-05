/**
 * MockFacilitator contract tests. Acts as the Liskov substitution check
 * for the FacilitatorAdapter interface — anything that compiles + passes
 * here should compile + behave the same way against any other adapter.
 */

import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";

import { MockFacilitator, ConfirmedSettlement } from "../src/facilitators";

function fakeReq(body: unknown): any {
  return { body, header: () => undefined };
}

function fillBytes(byte: number): Uint8Array {
  return new Uint8Array(32).fill(byte);
}

describe("MockFacilitator", () => {
  const adapter = new MockFacilitator();
  const payer  = Keypair.generate().publicKey;
  const payee  = Keypair.generate().publicKey;
  const mint   = Keypair.generate().publicKey;

  describe("parseRequest", () => {
    it("parses the legacy direct body shape", async () => {
      const ctx = await adapter.parseRequest(fakeReq({
        payerAgentAsset: payer.toBase58(),
        payeeAgentAsset: payee.toBase58(),
        amount:          "1000",
        mint:            mint.toBase58(),
        policyId:        1,
      }));
      expect(ctx).to.not.equal(null);
      expect(ctx!.payerAgent.equals(payer)).to.equal(true);
      expect(ctx!.payeeAgent.equals(payee)).to.equal(true);
      expect(ctx!.amount).to.equal(1000n);
      expect(ctx!.mint.equals(mint)).to.equal(true);
      expect(ctx!.policyId).to.equal(1);
      expect(ctx!.facilitator).to.equal("mock");
    });

    it("returns null when body is missing fields", async () => {
      const ctx = await adapter.parseRequest(fakeReq({ amount: "1000" }));
      expect(ctx).to.equal(null);
    });

    it("returns null when pubkey is invalid", async () => {
      const ctx = await adapter.parseRequest(fakeReq({
        payerAgentAsset: "not-a-pubkey",
        payeeAgentAsset: payee.toBase58(),
        amount:          "1",
        mint:            mint.toBase58(),
        policyId:        0,
      }));
      expect(ctx).to.equal(null);
    });

    it("returns null on extra unknown fields (strict mode)", async () => {
      const ctx = await adapter.parseRequest(fakeReq({
        payerAgentAsset: payer.toBase58(),
        payeeAgentAsset: payee.toBase58(),
        amount:          "1",
        mint:            mint.toBase58(),
        policyId:        0,
        extraField:      "drift",
      }));
      expect(ctx).to.equal(null);
    });

    it("decodes optional 32-byte paymentIdHash array", async () => {
      const hash = Array.from(fillBytes(0xCC));
      const ctx = await adapter.parseRequest(fakeReq({
        payerAgentAsset: payer.toBase58(),
        payeeAgentAsset: payee.toBase58(),
        amount:          "1",
        mint:            mint.toBase58(),
        policyId:        0,
        paymentIdHash:   hash,
      }));
      expect(ctx!.paymentIdHash).to.deep.equal(Uint8Array.from(hash));
    });
  });

  describe("formatChallenge", () => {
    const ctx = {
      payerAgent: payer,
      payeeAgent: payee,
      amount:    1n,
      mint,
      policyId:  0,
      facilitator: "mock",
      rawRequestMeta: {},
    } as const;

    it("Allow → 200 + decision header", () => {
      const c = adapter.formatChallenge({ kind: "Allow" }, ctx);
      expect(c.status).to.equal(200);
      expect(c.headers["X-Agent-Trust-Decision"]).to.equal("Allow");
    });

    it("Deny → 402 + reason headers", () => {
      const c = adapter.formatChallenge(
        { kind: "Deny", reasonCode: 6, reasonName: "CounterpartyTierBelowMin" },
        ctx,
      );
      expect(c.status).to.equal(402);
      expect(c.headers["X-Payment-Reason-Name"]).to.equal("CounterpartyTierBelowMin");
    });
  });

  describe("formatSettlement", () => {
    it("returns null tx + mock metadata", () => {
      const r = adapter.formatSettlement({
        payerAgent: payer, payeeAgent: payee, amount: 1n, mint, policyId: 0,
        facilitator: "mock", rawRequestMeta: {},
      });
      expect(r.unsignedTransactionBase64).to.equal(null);
      expect(r.facilitatorMeta.source).to.equal("mock");
    });
  });

  describe("validatePaymentProof", () => {
    it("returns valid by default", async () => {
      const r = await adapter.validatePaymentProof(null, {
        payerAgent: payer, payeeAgent: payee, amount: 1n, mint, policyId: 0,
        facilitator: "mock", rawRequestMeta: {},
      });
      expect(r.valid).to.equal(true);
      if (r.valid) expect(r.txSignature.startsWith("mock-tx-")).to.equal(true);
    });

    it("honours injected proofResult override", async () => {
      const a2 = new MockFacilitator({
        proofResult: { valid: false, reason: "expired_payment", detail: "demo" },
      });
      const r = await a2.validatePaymentProof(null, {
        payerAgent: payer, payeeAgent: payee, amount: 1n, mint, policyId: 0,
        facilitator: "mock", rawRequestMeta: {},
      });
      expect(r.valid).to.equal(false);
      if (!r.valid) expect(r.reason).to.equal("expired_payment");
    });
  });

  describe("emitFeedback", () => {
    it("returns synthetic feedback signature with correct paymentIdHash", async () => {
      const settlement: ConfirmedSettlement = {
        txSignature:   "tx-1",
        payer:         PublicKey.default,
        payee:         payee,
        amount:        1n,
        mint,
        paymentIdHash: fillBytes(0xAA),
      };
      const r = await adapter.emitFeedback({
        payerAgent: payer, payeeAgent: payee, amount: 1n, mint, policyId: 0,
        facilitator: "mock", rawRequestMeta: {},
      }, settlement);
      expect(r.paymentIdHash).to.deep.equal(settlement.paymentIdHash);
      expect(r.feedbackTxSignature.startsWith("mock-feedback-")).to.equal(true);
    });
  });
});
