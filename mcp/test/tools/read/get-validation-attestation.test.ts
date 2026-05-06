import { expect } from "chai";
import { Keypair } from "@solana/web3.js";

import { getValidationAttestationTool } from "../../../src/tools/read/get-validation-attestation";

describe("agenttrust_get_validation_attestation (schema)", () => {
  it("accepts valid (subject, capability) pair", () => {
    const r = getValidationAttestationTool.inputSchema.safeParse({
      subject_asset:   Keypair.generate().publicKey.toBase58(),
      capability_hash: "a".repeat(64),
    });
    expect(r.success).to.equal(true);
  });

  it("accepts optional attestor filter", () => {
    const r = getValidationAttestationTool.inputSchema.safeParse({
      subject_asset:   Keypair.generate().publicKey.toBase58(),
      capability_hash: "a".repeat(64),
      attestor:        Keypair.generate().publicKey.toBase58(),
    });
    expect(r.success).to.equal(true);
  });

  it("rejects truncated capability hash", () => {
    const r = getValidationAttestationTool.inputSchema.safeParse({
      subject_asset:   Keypair.generate().publicKey.toBase58(),
      capability_hash: "ab",
    });
    expect(r.success).to.equal(false);
  });
});
