import { expect } from "chai";

import { listFacilitatorsTool } from "../../../src/tools/read/list-facilitators";

import { buildTestConfig } from "../../helpers";
import { ChainClient } from "../../../src/chain";

describe("agenttrust_list_facilitators", () => {
  const ctx = { chain: new ChainClient(buildTestConfig()) };

  it("returns the four shipped adapters", async () => {
    const out = await listFacilitatorsTool.handler({}, ctx);
    expect(out.count).to.equal(4);
    const names = out.facilitators.map((f) => f.name);
    expect(names).to.include.members(["pay-sh", "dexter", "atxp", "mcpay"]);
  });

  it("flags pay-sh as live", async () => {
    const out = await listFacilitatorsTool.handler({}, ctx);
    const paysh = out.facilitators.find((f) => f.name === "pay-sh");
    expect(paysh).to.exist;
    expect(paysh!.status).to.equal("live");
  });

  it("each entry has at least one protocol", async () => {
    const out = await listFacilitatorsTool.handler({}, ctx);
    for (const f of out.facilitators) {
      expect(f.protocols.length).to.be.greaterThan(0);
    }
  });
});
