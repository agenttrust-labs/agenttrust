import { expect } from "chai";
import { Keypair } from "@solana/web3.js";

import { requestValidationTool } from "../../../src/tools/write/request-validation";

describe("agenttrust_request_validation (schema)", () => {
  it("accepts capability_name + claim_uri_hash", () => {
    const r = requestValidationTool.inputSchema.safeParse({
      subject_asset:        Keypair.generate().publicKey.toBase58(),
      capability_name:      "usdc-payment-policy.v1",
      claim_uri_hash_hex:   "a".repeat(64),
      deadline_slot:        500_000_000,
    });
    expect(r.success).to.equal(true);
  });

  it("accepts capability_hash_hex alternative", () => {
    const r = requestValidationTool.inputSchema.safeParse({
      subject_asset:        Keypair.generate().publicKey.toBase58(),
      capability_hash_hex:  "b".repeat(64),
      claim_uri_hash_hex:   "a".repeat(64),
      deadline_slot:        "500000000",
    });
    expect(r.success).to.equal(true);
  });

  it("rejects capability_name shorter than 3 chars", () => {
    const r = requestValidationTool.inputSchema.safeParse({
      subject_asset:        Keypair.generate().publicKey.toBase58(),
      capability_name:      "ab",
      claim_uri_hash_hex:   "a".repeat(64),
      deadline_slot:        100,
    });
    expect(r.success).to.equal(false);
  });
});
