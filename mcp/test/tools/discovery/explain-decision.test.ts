/**
 * `agenttrust_explain_decision` returns the right name + remediation
 * category for every reason code 1..15. Pure-data tool, no chain.
 */

import { expect } from "chai";

import { explainDecisionTool } from "../../../src/tools/discovery/explain-decision";

import { buildTestConfig } from "../../helpers";
import { ChainClient } from "../../../src/chain";

describe("agenttrust_explain_decision", () => {
  const ctx = { chain: new ChainClient(buildTestConfig()) };

  it("returns each reasonCode mapped to its enum name", async () => {
    const expected: Record<number, string> = {
      1: "KillSwitchEngaged",
      2: "SpendingPerTxExceeded",
      6: "CounterpartyTierBelowMin",
      11: "AttestationMissing",
      15: "UnratedTreatmentDeny",
    };
    for (const code of Object.keys(expected).map(Number)) {
      const out = await explainDecisionTool.handler({ reason_code: code }, ctx);
      expect(out.reasonCode).to.equal(code);
      expect(out.reasonName).to.equal(expected[code]);
      expect(out.remediation).to.be.a("string").that.has.length.greaterThan(20);
    }
  });

  it("rejects out-of-range codes via Zod schema", () => {
    const r = explainDecisionTool.inputSchema.safeParse({ reason_code: 16 });
    expect(r.success).to.equal(false);
  });

  it("returns category enum for each code", async () => {
    const cats = new Set<string>();
    for (let code = 1; code <= 15; code++) {
      const out = await explainDecisionTool.handler({ reason_code: code }, ctx);
      cats.add(out.category);
    }
    expect(cats.has("killswitch")).to.equal(true);
    expect(cats.has("spending")).to.equal(true);
    expect(cats.has("counterparty")).to.equal(true);
    expect(cats.has("validation")).to.equal(true);
  });
});
