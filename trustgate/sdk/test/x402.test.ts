import { expect } from "chai";

import {
  buildHeadersForDecision, denyReasonName,
  X_AGENT_TRUST_DECISION, X_CAPABILITY_REQUIRED,
  X_PAYMENT_NETWORK, X_PAYMENT_REASON_CODE, X_PAYMENT_REASON_NAME,
  X_PAYMENT_REQUIRED,
} from "../src/x402";

describe("buildHeadersForDecision", () => {
  it("Allow → 200 + decision header", () => {
    const { httpStatus, headers } = buildHeadersForDecision({ kind: "Allow" });
    expect(httpStatus).to.equal(200);
    expect(headers[X_AGENT_TRUST_DECISION]).to.equal("Allow");
    expect(headers[X_PAYMENT_NETWORK]).to.equal("solana-devnet");
  });

  it("Deny → 402 + reason headers", () => {
    const { httpStatus, headers } = buildHeadersForDecision({
      kind: "Deny", reasonCode: 6, reasonName: "CounterpartyTierBelowMin",
    });
    expect(httpStatus).to.equal(402);
    expect(headers[X_PAYMENT_REQUIRED]).to.equal("denied");
    expect(headers[X_PAYMENT_REASON_CODE]).to.equal("6");
    expect(headers[X_PAYMENT_REASON_NAME]).to.equal("CounterpartyTierBelowMin");
  });

  it("RequireValidation → 402 + capability hash hex", () => {
    const hash = new Array(32).fill(0xAB);
    const { httpStatus, headers } = buildHeadersForDecision({
      kind: "RequireValidation", capabilityHash: hash,
    });
    expect(httpStatus).to.equal(402);
    expect(headers[X_PAYMENT_REQUIRED]).to.equal("validation");
    expect(headers[X_CAPABILITY_REQUIRED]).to.equal("ab".repeat(32));
  });

  it("network override is honoured", () => {
    const { headers } = buildHeadersForDecision(
      { kind: "Allow" },
      "solana-mainnet",
    );
    expect(headers[X_PAYMENT_NETWORK]).to.equal("solana-mainnet");
  });
});

describe("denyReasonName", () => {
  it("maps known codes to playbook names", () => {
    expect(denyReasonName(1)).to.equal("KillSwitchEngaged");
    expect(denyReasonName(6)).to.equal("CounterpartyTierBelowMin");
    expect(denyReasonName(15)).to.equal("UnratedTreatmentDeny");
  });

  it("falls back to Unknown(N) for unrecognised codes", () => {
    expect(denyReasonName(99)).to.equal("Unknown(99)");
  });
});
