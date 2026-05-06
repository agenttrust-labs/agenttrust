import { expect } from "chai";
import { Keypair } from "@solana/web3.js";

import { setKillswitchTool } from "../../../src/tools/write/set-killswitch";

describe("agenttrust_set_killswitch (schema)", () => {
  it("accepts paused=true", () => {
    const r = setKillswitchTool.inputSchema.safeParse({
      agent_asset: Keypair.generate().publicKey.toBase58(),
      paused:      true,
    });
    expect(r.success).to.equal(true);
  });

  it("accepts paused=false", () => {
    const r = setKillswitchTool.inputSchema.safeParse({
      agent_asset: Keypair.generate().publicKey.toBase58(),
      paused:      false,
    });
    expect(r.success).to.equal(true);
  });

  it("rejects non-boolean paused", () => {
    const r = setKillswitchTool.inputSchema.safeParse({
      agent_asset: Keypair.generate().publicKey.toBase58(),
      paused:      "yes",
    });
    expect(r.success).to.equal(false);
  });
});
