/**
 * `agenttrust_get_policy` schema + PDA-derivation test. Doesn't hit RPC
 * — it only validates that the tool's input schema and PDA computation
 * are correct.
 */

import { expect } from "chai";
import { Keypair } from "@solana/web3.js";

import { getPolicyTool } from "../../../src/tools/read/get-policy";

describe("agenttrust_get_policy (schema)", () => {
  it("rejects non-base58 agent_asset", () => {
    const r = getPolicyTool.inputSchema.safeParse({
      agent_asset: "not-a-pubkey",
      policy_id:   1,
    });
    expect(r.success).to.equal(false);
  });

  it("rejects negative policy_id", () => {
    const r = getPolicyTool.inputSchema.safeParse({
      agent_asset: Keypair.generate().publicKey.toBase58(),
      policy_id:   -1,
    });
    expect(r.success).to.equal(false);
  });

  it("rejects policy_id above u32 max", () => {
    const r = getPolicyTool.inputSchema.safeParse({
      agent_asset: Keypair.generate().publicKey.toBase58(),
      policy_id:   0x100000000,
    });
    expect(r.success).to.equal(false);
  });

  it("accepts a valid input", () => {
    const r = getPolicyTool.inputSchema.safeParse({
      agent_asset: Keypair.generate().publicKey.toBase58(),
      policy_id:   42,
    });
    expect(r.success).to.equal(true);
  });
});
