import { expect } from "chai";
import { Keypair } from "@solana/web3.js";

import { getVelocityTool } from "../../../src/tools/read/get-velocity";

describe("agenttrust_get_velocity (schema)", () => {
  it("accepts a valid input", () => {
    const r = getVelocityTool.inputSchema.safeParse({
      agent_asset: Keypair.generate().publicKey.toBase58(),
      policy_id:   1,
    });
    expect(r.success).to.equal(true);
  });

  it("rejects negative policy_id", () => {
    const r = getVelocityTool.inputSchema.safeParse({
      agent_asset: Keypair.generate().publicKey.toBase58(),
      policy_id:   -1,
    });
    expect(r.success).to.equal(false);
  });
});
