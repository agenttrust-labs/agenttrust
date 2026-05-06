import { expect } from "chai";
import { Keypair } from "@solana/web3.js";

import { initPolicyTool } from "../../../src/tools/write/init-policy";

describe("agenttrust_init_policy (schema)", () => {
  const validInput = () => ({
    agent_asset:           Keypair.generate().publicKey.toBase58(),
    policy_id:             1,
    enabled_kinds_bitmask: 1 | 2,
  });

  it("accepts minimal valid input", () => {
    const r = initPolicyTool.inputSchema.safeParse(validInput());
    expect(r.success).to.equal(true);
  });

  it("accepts spending fields as numbers or strings", () => {
    const inp = {
      ...validInput(),
      spending: { per_tx_max: "1000000", daily_max: 5000000, weekly_max: "20000000" },
    };
    const r = initPolicyTool.inputSchema.safeParse(inp);
    expect(r.success).to.equal(true);
  });

  it("rejects min_tier > 4", () => {
    const inp = {
      ...validInput(),
      counterparty: { min_tier: 5, max_risk_score: 255, min_confidence: 0, default_unrated_treatment: 0 },
    };
    const r = initPolicyTool.inputSchema.safeParse(inp);
    expect(r.success).to.equal(false);
  });

  it("rejects accepted_attestors > 2", () => {
    const inp = {
      ...validInput(),
      validation: {
        accepted_attestors: [
          Keypair.generate().publicKey.toBase58(),
          Keypair.generate().publicKey.toBase58(),
          Keypair.generate().publicKey.toBase58(),
        ],
      },
    };
    const r = initPolicyTool.inputSchema.safeParse(inp);
    expect(r.success).to.equal(false);
  });
});
