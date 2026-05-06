import { expect } from "chai";

import { facilitatorWalkthroughTool } from "../../../src/tools/discovery/facilitator-walkthrough";

import { buildTestConfig } from "../../helpers";
import { ChainClient } from "../../../src/chain";

describe("agenttrust_facilitator_walkthrough", () => {
  const ctx = { chain: new ChainClient(buildTestConfig()) };

  it("returns the pay-sh dedicated walkthrough", async () => {
    const out = await facilitatorWalkthroughTool.handler({ name: "pay-sh" }, ctx);
    expect(out.matched).to.equal(true);
    expect(out.source).to.include("pay-sh-adapter");
    expect(out.content).to.include("Pay.sh");
  });

  it("returns the dexter walkthrough (mapped to facilitator-adapters)", async () => {
    const out = await facilitatorWalkthroughTool.handler({ name: "dexter" }, ctx);
    expect(out.matched).to.equal(true);
    expect(out.source).to.include("facilitator-adapters");
  });

  it("falls back for unknown facilitator name", async () => {
    const out = await facilitatorWalkthroughTool.handler({ name: "nonexistent_adapter" }, ctx);
    expect(out.matched).to.equal(false);
    expect(out.fallback).to.be.a("string");
    expect(out.content).to.be.a("string").with.length.greaterThan(0);
  });

  it("returns the trustgate/server facilitators README", async () => {
    const out = await facilitatorWalkthroughTool.handler({ name: "pay-sh" }, ctx);
    expect(out.servicesReadme).to.include("FacilitatorRegistry");
  });
});
