import { expect } from "chai";
import { Keypair } from "@solana/web3.js";

import { emitFeedbackTool } from "../../../src/tools/write/emit-feedback";

describe("agenttrust_emit_feedback (schema)", () => {
  const validInput = () => ({
    payment_id_hash_hex: "a".repeat(64),
    payee_asset:         Keypair.generate().publicKey.toBase58(),
    base_collection:     Keypair.generate().publicKey.toBase58(),
    score:               80,
  });

  it("accepts minimal valid input", () => {
    const r = emitFeedbackTool.inputSchema.safeParse(validInput());
    expect(r.success).to.equal(true);
  });

  it("rejects score > 100", () => {
    const r = emitFeedbackTool.inputSchema.safeParse({ ...validInput(), score: 150 });
    expect(r.success).to.equal(false);
  });

  it("rejects tag1 longer than 32 chars", () => {
    const r = emitFeedbackTool.inputSchema.safeParse({
      ...validInput(),
      tag1: "a".repeat(33),
    });
    expect(r.success).to.equal(false);
  });

  it("rejects feedback_uri longer than 256 chars", () => {
    const r = emitFeedbackTool.inputSchema.safeParse({
      ...validInput(),
      feedback_uri: "x".repeat(257),
    });
    expect(r.success).to.equal(false);
  });
});
