import { expect } from "chai";
import { Keypair } from "@solana/web3.js";

import { getQuantuReputationTool } from "../../../src/tools/read/get-quantu-reputation";

describe("agenttrust_get_quantu_reputation (schema)", () => {
  it("accepts valid pubkey", () => {
    const r = getQuantuReputationTool.inputSchema.safeParse({
      agent_asset: Keypair.generate().publicKey.toBase58(),
    });
    expect(r.success).to.equal(true);
  });

  it("rejects malformed pubkey", () => {
    const r = getQuantuReputationTool.inputSchema.safeParse({ agent_asset: "x" });
    expect(r.success).to.equal(false);
  });
});
