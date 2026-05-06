import { expect } from "chai";

import { demoStateTool } from "../../../src/tools/read/demo-state";

import { buildTestConfig } from "../../helpers";
import { ChainClient } from "../../../src/chain";

describe("agenttrust_demo_state", () => {
  const ctx = { chain: new ChainClient(buildTestConfig()) };

  it("returns the three pre-warmed counterparties", async () => {
    const out = await demoStateTool.handler({}, ctx);
    expect(out.available).to.equal(true);
    expect(out.counterparties).to.have.length(3);
    const tiers = (out.counterparties ?? []).map((c) => c.demoTier).sort();
    expect(tiers).to.deep.equal([0, 1, 3]);
  });

  it("includes Explorer URLs for each pubkey", async () => {
    const out = await demoStateTool.handler({}, ctx);
    for (const c of out.counterparties ?? []) {
      expect(c.explorerUrls.asset).to.include("explorer.solana.com");
      expect(c.explorerUrls.agentAccount).to.include("explorer.solana.com");
      expect(c.explorerUrls.atomStats).to.include("explorer.solana.com");
    }
  });

  it("network field matches solana-devnet", async () => {
    const out = await demoStateTool.handler({}, ctx);
    expect(out.network).to.equal("solana-devnet");
  });
});
