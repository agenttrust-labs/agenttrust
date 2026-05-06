/**
 * pay-sh-demo integration test.
 *
 * Drives the full /protected flow in-process via supertest — no `pay` CLI,
 * no Solana RPC, no devnet. Three counterparties at tiers 0 / 1 / 3 cover
 * Allow + Deny + Deny paths.
 *
 * The test fabricates synthetic x402 PaymentPayload bodies (the demo's
 * stub `validateOnChainTx` returns confirmed:true with synthesised fields,
 * so we don't need real signed Solana txs).
 */

import { expect } from "chai";
import request from "supertest";

import { createDemoApp } from "../src";

interface CounterpartyEntry {
  agent: string;
  tier:  number;
  label: string;
}

interface HealthBody {
  counterparties: CounterpartyEntry[];
  facilitator:    string;
  payeeWallet:    string;
  network:        string;
}

function syntheticProof(): string {
  // Pay.sh's PAYMENT-SIGNATURE header is the base64-JSON PaymentPayload.
  // The demo's validateOnChainTx stub doesn't actually parse the bytes —
  // it returns synthesised fields matching the verify-context. So a stub
  // payload with a non-empty `transaction` string is enough to drive
  // the happy path.
  const payload = {
    x402Version: 2,
    scheme:      "exact",
    network:     "solana-devnet",
    payload: { transaction: "synthetic-base64-tx-bytes" },
  };
  return Buffer.from(JSON.stringify(payload), "utf-8").toString("base64");
}

describe("pay-sh-demo flow", () => {
  it("GET /protected without payment → 402 with x402 envelope", async () => {
    const { app } = createDemoApp();
    const res = await request(app).get("/protected");

    expect(res.status).to.equal(402);
    expect(res.body.error).to.equal("payment_required");
    expect(res.body.accepts).to.have.lengthOf(1);

    const challengeHeader = res.header["payment-required"];
    expect(challengeHeader).to.be.a("string");
    const decoded = JSON.parse(Buffer.from(challengeHeader, "base64").toString("utf-8"));
    expect(decoded.x402Version).to.equal(2);
    expect(decoded.accepts[0].scheme).to.equal("exact");
    expect(decoded.accepts[0].extra.agentTrust.policyId).to.equal(1);
  });

  it("/health surfaces three counterparties at tiers 0 / 1 / 3", async () => {
    const { app } = createDemoApp();
    const res = await request(app).get("/health");
    expect(res.status).to.equal(200);
    const body = res.body as HealthBody;
    const tiers = body.counterparties.map((c) => c.tier).sort();
    expect(tiers).to.deep.equal([0, 1, 3]);
  });

  it("tier 3 counterparty → Allow → 200 with X-Payment-Receipt", async () => {
    const { app } = createDemoApp();
    const health = await request(app).get("/health");
    const tier3 = (health.body as HealthBody).counterparties
      .find((c) => c.tier === 3)!;

    const res = await request(app)
      .get("/protected")
      .set("PAYMENT-SIGNATURE", syntheticProof())
      .set("X-Demo-Payer-Agent", tier3.agent);

    expect(res.status).to.equal(200);
    expect(res.body.ok).to.equal(true);
    expect(res.header["x-payment-receipt"]).to.be.a("string");
    expect(res.header["x-payment-receipt"]).to.match(/^demo-feedback-/);
  });

  it("tier 0 counterparty → Deny → 402 with reasonCode 6", async () => {
    const { app } = createDemoApp();
    const health = await request(app).get("/health");
    const tier0 = (health.body as HealthBody).counterparties
      .find((c) => c.tier === 0)!;

    const res = await request(app)
      .get("/protected")
      .set("PAYMENT-SIGNATURE", syntheticProof())
      .set("X-Demo-Payer-Agent", tier0.agent);

    expect(res.status).to.equal(402);
    expect(res.body.isValid).to.equal(false);
    expect(res.body.invalidReason).to.equal("CounterpartyTierBelowMin");
    expect(res.body.reasonCode).to.equal(6);
    expect(res.header["x-payment-reason-name"]).to.equal("CounterpartyTierBelowMin");
  });

  it("tier 1 counterparty → Deny → 402", async () => {
    const { app } = createDemoApp();
    const health = await request(app).get("/health");
    const tier1 = (health.body as HealthBody).counterparties
      .find((c) => c.tier === 1)!;

    const res = await request(app)
      .get("/protected")
      .set("PAYMENT-SIGNATURE", syntheticProof())
      .set("X-Demo-Payer-Agent", tier1.agent);

    expect(res.status).to.equal(402);
    expect(res.body.invalidReason).to.equal("CounterpartyTierBelowMin");
  });

  it("malformed proof header → 400", async () => {
    const { app } = createDemoApp();
    const res = await request(app)
      .get("/protected")
      .set("PAYMENT-SIGNATURE", "not-base64-and-not-json");
    expect(res.status).to.equal(400);
  });

  it("X-PAYMENT v1 header is also accepted", async () => {
    const { app } = createDemoApp();
    const health = await request(app).get("/health");
    const tier3 = (health.body as HealthBody).counterparties
      .find((c) => c.tier === 3)!;

    const res = await request(app)
      .get("/protected")
      .set("X-PAYMENT", syntheticProof())
      .set("X-Demo-Payer-Agent", tier3.agent);

    expect(res.status).to.equal(200);
  });
});

// ---------------------------------------------------------------------------
// Devnet integration smoke — gated on INTEGRATION=1.
//
// Verifies the demo can boot with REAL Anchor providers loading the
// trustgate IDL from devnet, and that /health surfaces the live network.
// A fully end-to-end emit_feedback CPI requires the demo's payee Quantu
// agent to be pre-registered on devnet (asset + collection accounts +
// agent_account PDA initialised). When the secret env is missing or the
// payee agent isn't registered, this block reports the missing setup and
// skips, so CI doesn't false-fail.
// ---------------------------------------------------------------------------

const INTEGRATION = process.env.INTEGRATION === "1";
const integrationDescribe = INTEGRATION ? describe : describe.skip;

integrationDescribe("real devnet integration", function () {
  this.timeout(60_000);

  it("demo boots with real Anchor + devnet RPC", async () => {
    const facilitatorB58 = process.env.FACILITATOR_KEYPAIR_B58;
    const rpcUrl = process.env.RPC_URL ?? "https://api.devnet.solana.com";
    if (!facilitatorB58) {
      // eslint-disable-next-line no-console
      console.log("SKIPPED: FACILITATOR_KEYPAIR_B58 not set");
      return;
    }

    const { Keypair } = await import("@solana/web3.js");
    const bs58 = (await import("bs58")).default;
    const { createRealDemoApp } = await import("../src");

    const facilitator = Keypair.fromSecretKey(bs58.decode(facilitatorB58));

    // Static Quantu resolver — empty; the integration test below only
    // exercises /health and 402-emission paths, neither of which trigger
    // emit_feedback. Full end-to-end emit_feedback is a manual-smoke
    // step that requires Quantu agents pre-registered on devnet.
    const resolveQuantu = async () => {
      throw new Error("Quantu resolver not configured — manual smoke only");
    };

    const demo = await createRealDemoApp({
      facilitator,
      realChain: {
        rpcUrl,
        signingNetwork: process.env.NETWORK ?? "solana-devnet",
        resolveQuantu,
      },
    });
    const res = await request(demo.app).get("/health");
    expect(res.status).to.equal(200);
    expect(res.body.facilitator).to.equal(facilitator.publicKey.toBase58());
  });
});
