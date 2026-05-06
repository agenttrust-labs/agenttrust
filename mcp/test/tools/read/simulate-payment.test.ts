import { expect } from "chai";
import { Keypair } from "@solana/web3.js";

import { simulatePaymentTool } from "../../../src/tools/read/simulate-payment";

describe("agenttrust_simulate_payment (schema)", () => {
  const validInput = () => ({
    payer_agent: Keypair.generate().publicKey.toBase58(),
    payee_agent: Keypair.generate().publicKey.toBase58(),
    amount:      1000,
    mint:        Keypair.generate().publicKey.toBase58(),
    policy_id:   1,
  });

  it("accepts a valid input", () => {
    const r = simulatePaymentTool.inputSchema.safeParse(validInput());
    expect(r.success).to.equal(true);
  });

  it("accepts string amount", () => {
    const inp = { ...validInput(), amount: "1000000000000" };
    const r = simulatePaymentTool.inputSchema.safeParse(inp);
    expect(r.success).to.equal(true);
  });

  it("rejects negative amount", () => {
    const inp = { ...validInput(), amount: -1 };
    const r = simulatePaymentTool.inputSchema.safeParse(inp);
    expect(r.success).to.equal(false);
  });
});
