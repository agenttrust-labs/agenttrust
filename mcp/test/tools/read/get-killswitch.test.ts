import { expect } from "chai";
import { Keypair } from "@solana/web3.js";

import { getKillswitchTool } from "../../../src/tools/read/get-killswitch";

describe("agenttrust_get_killswitch (schema)", () => {
  it("accepts a valid pubkey", () => {
    const r = getKillswitchTool.inputSchema.safeParse({
      agent_asset: Keypair.generate().publicKey.toBase58(),
    });
    expect(r.success).to.equal(true);
  });

  it("rejects malformed pubkey", () => {
    const r = getKillswitchTool.inputSchema.safeParse({ agent_asset: "abcdef" });
    expect(r.success).to.equal(false);
  });
});
