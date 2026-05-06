import { expect } from "chai";

import { getFeedbackLogTool } from "../../../src/tools/read/get-feedback-log";

describe("agenttrust_get_feedback_log (schema)", () => {
  it("accepts 64-char hex", () => {
    const r = getFeedbackLogTool.inputSchema.safeParse({
      payment_id_hash: "0".repeat(64),
    });
    expect(r.success).to.equal(true);
  });

  it("accepts 0x-prefixed hex", () => {
    const r = getFeedbackLogTool.inputSchema.safeParse({
      payment_id_hash: "0x" + "a".repeat(64),
    });
    expect(r.success).to.equal(true);
  });

  it("rejects non-hex", () => {
    const r = getFeedbackLogTool.inputSchema.safeParse({
      payment_id_hash: "not-a-hex-string",
    });
    expect(r.success).to.equal(false);
  });

  it("rejects truncated hex", () => {
    const r = getFeedbackLogTool.inputSchema.safeParse({
      payment_id_hash: "0".repeat(63),
    });
    expect(r.success).to.equal(false);
  });
});
