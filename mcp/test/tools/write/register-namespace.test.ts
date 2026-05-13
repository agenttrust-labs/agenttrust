import { expect } from "chai";

import { registerNamespaceTool } from "../../../src/tools/write/register-namespace";

describe("agenttrust_register_namespace (schema)", () => {
  it("accepts minimal valid input with defaults for version + schema_uri", () => {
    const r = registerNamespaceTool.inputSchema.safeParse({
      namespace_prefix: "usdc-payment-policy",
    });
    expect(r.success).to.equal(true);
    if (r.success) {
      expect(r.data.version).to.equal("v1");
      expect(r.data.schema_uri).to.equal("");
    }
  });

  it("accepts explicit version + schema_uri", () => {
    const r = registerNamespaceTool.inputSchema.safeParse({
      namespace_prefix: "kyc.tier-1",
      version:          "v2",
      schema_uri:       "ipfs://bafybeigdyrztest",
    });
    expect(r.success).to.equal(true);
  });

  it("rejects namespace_prefix shorter than 3 chars", () => {
    const r = registerNamespaceTool.inputSchema.safeParse({
      namespace_prefix: "ab",
    });
    expect(r.success).to.equal(false);
  });

  it("rejects namespace_prefix longer than 32 chars", () => {
    const r = registerNamespaceTool.inputSchema.safeParse({
      namespace_prefix: "a".repeat(33),
    });
    expect(r.success).to.equal(false);
  });

  it("rejects namespace_prefix containing ':' (on-chain NamespaceColonForbidden)", () => {
    const r = registerNamespaceTool.inputSchema.safeParse({
      namespace_prefix: "foo:v1",
    });
    expect(r.success).to.equal(false);
  });

  it("rejects version longer than 16 chars", () => {
    const r = registerNamespaceTool.inputSchema.safeParse({
      namespace_prefix: "usdc-payment-policy",
      version:          "v".repeat(17),
    });
    expect(r.success).to.equal(false);
  });

  it("rejects schema_uri longer than 160 chars", () => {
    const r = registerNamespaceTool.inputSchema.safeParse({
      namespace_prefix: "usdc-payment-policy",
      schema_uri:       "x".repeat(161),
    });
    expect(r.success).to.equal(false);
  });
});
