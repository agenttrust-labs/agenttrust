import { expect } from "chai";
import { Keypair } from "@solana/web3.js";

import { ALL_PROMPTS } from "../../src/prompts";

describe("prompts", () => {
  it("ships the three documented prompts", () => {
    const names = ALL_PROMPTS.map((p) => p.name);
    expect(names).to.include.members([
      "agenttrust_audit_payment",
      "agenttrust_setup_agent",
      "agenttrust_explain_failure",
    ]);
  });

  describe("agenttrust_audit_payment", () => {
    const prompt = ALL_PROMPTS.find((p) => p.name === "agenttrust_audit_payment");
    if (!prompt) throw new Error("audit_payment prompt missing");
    it("has required arguments", () => {
      const required = prompt.arguments.filter((a) => a.required).map((a) => a.name);
      expect(required).to.include.members(["payer_agent", "payee_agent", "amount", "mint", "policy_id"]);
    });
    it("build returns a single user-role text message that names the inputs", () => {
      const msgs = prompt.build({
        payer_agent: Keypair.generate().publicKey.toBase58(),
        payee_agent: Keypair.generate().publicKey.toBase58(),
        amount:      "1000",
        mint:        Keypair.generate().publicKey.toBase58(),
        policy_id:   "1",
      });
      expect(msgs).to.have.length(1);
      expect(msgs[0].role).to.equal("user");
      expect(msgs[0].content.text).to.include("agenttrust_simulate_payment");
      expect(msgs[0].content.text).to.include("agenttrust_get_policy");
      expect(msgs[0].content.text).to.include("agenttrust_explain_decision");
    });
  });

  describe("agenttrust_setup_agent", () => {
    const prompt = ALL_PROMPTS.find((p) => p.name === "agenttrust_setup_agent");
    if (!prompt) throw new Error("setup_agent prompt missing");
    it("requires only agent_asset", () => {
      const required = prompt.arguments.filter((a) => a.required).map((a) => a.name);
      expect(required).to.deep.equal(["agent_asset"]);
    });
    it("build returns a checklist mentioning init_policy", () => {
      const msgs = prompt.build({ agent_asset: Keypair.generate().publicKey.toBase58() });
      expect(msgs[0].content.text).to.include("agenttrust_init_policy");
    });
  });

  describe("agenttrust_explain_failure", () => {
    const prompt = ALL_PROMPTS.find((p) => p.name === "agenttrust_explain_failure");
    if (!prompt) throw new Error("explain_failure prompt missing");
    it("requires reason_code", () => {
      const required = prompt.arguments.filter((a) => a.required).map((a) => a.name);
      expect(required).to.deep.equal(["reason_code"]);
    });
    it("build mentions explain_decision tool", () => {
      const msgs = prompt.build({ reason_code: "6" });
      expect(msgs[0].content.text).to.include("agenttrust_explain_decision");
    });
  });
});
