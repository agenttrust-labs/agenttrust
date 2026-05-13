import { expect } from "chai";

import { registerAttestorTool } from "../../../src/tools/write/register-attestor";

describe("agenttrust_register_attestor (schema)", () => {
  it("accepts empty input (metadata_uri defaults to empty string)", () => {
    const r = registerAttestorTool.inputSchema.safeParse({});
    expect(r.success).to.equal(true);
    if (r.success) {
      expect(r.data.metadata_uri).to.equal("");
    }
  });

  it("accepts a valid metadata_uri", () => {
    const r = registerAttestorTool.inputSchema.safeParse({
      metadata_uri: "ipfs://bafybeigdyrztest",
    });
    expect(r.success).to.equal(true);
  });

  it("rejects metadata_uri longer than 100 chars", () => {
    const r = registerAttestorTool.inputSchema.safeParse({
      metadata_uri: "x".repeat(101),
    });
    expect(r.success).to.equal(false);
  });

  it("accepts metadata_uri at the 100-char boundary", () => {
    const r = registerAttestorTool.inputSchema.safeParse({
      metadata_uri: "y".repeat(100),
    });
    expect(r.success).to.equal(true);
  });
});
