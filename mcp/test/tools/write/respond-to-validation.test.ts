import { expect } from "chai";
import { Keypair } from "@solana/web3.js";

import { respondToValidationTool } from "../../../src/tools/write/respond-to-validation";

describe("agenttrust_respond_to_validation (schema)", () => {
  it("accepts a valid input", () => {
    const r = respondToValidationTool.inputSchema.safeParse({
      subject_asset:          Keypair.generate().publicKey.toBase58(),
      capability_name:        "usdc-payment-policy.v1",
      claim_payload_hash_hex: "1".repeat(64),
      claim_uri_hash_hex:     "2".repeat(64),
      expires_at_slot:        600_000_000,
    });
    expect(r.success).to.equal(true);
  });

  it("rejects capability_name with colon", () => {
    const r = respondToValidationTool.inputSchema.safeParse({
      subject_asset:          Keypair.generate().publicKey.toBase58(),
      capability_name:        "ab", // too short
      claim_payload_hash_hex: "1".repeat(64),
      claim_uri_hash_hex:     "2".repeat(64),
      expires_at_slot:        100,
    });
    expect(r.success).to.equal(false);
  });
});
