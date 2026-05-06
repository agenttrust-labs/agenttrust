import { expect } from "chai";
import { Keypair } from "@solana/web3.js";

import { listPoliciesTool } from "../../../src/tools/read/list-policies";

describe("agenttrust_list_policies (schema)", () => {
  it("accepts valid agent_asset", () => {
    const r = listPoliciesTool.inputSchema.safeParse({
      agent_asset: Keypair.generate().publicKey.toBase58(),
    });
    expect(r.success).to.equal(true);
  });

  it("rejects missing agent_asset", () => {
    const r = listPoliciesTool.inputSchema.safeParse({});
    expect(r.success).to.equal(false);
  });
});
