import { expect } from "chai";

import {
  describeProgramsResource,
  PROGRAMS_RESOURCE_URI,
  readProgramsResource,
} from "../../src/resources/programs";

import { buildTestConfig } from "../helpers";

describe("programs resource", () => {
  it("describes the resource with expected URI", () => {
    const d = describeProgramsResource();
    expect(d.uri).to.equal(PROGRAMS_RESOURCE_URI);
    expect(d.mimeType).to.equal("application/json");
  });

  it("returns the configured devnet program IDs", () => {
    const cfg = buildTestConfig();
    const r = readProgramsResource(cfg);
    expect(r.uri).to.equal(PROGRAMS_RESOURCE_URI);
    const parsed = JSON.parse(r.text);
    expect(parsed.network).to.equal("solana-devnet");
    expect(parsed.programs.policyVault.programId).to.equal(cfg.programs.policyVault.toBase58());
    expect(parsed.programs.trustgate.programId).to.equal(cfg.programs.trustgate.toBase58());
    expect(parsed.programs.validationRegistry.programId).to.equal(cfg.validationRegistryId.toBase58());
  });

  it("includes Quantu mainnet IDs when network=solana-mainnet", () => {
    const cfg = buildTestConfig({ network: "solana-mainnet", explorerCluster: "mainnet" });
    const r = readProgramsResource(cfg);
    const parsed = JSON.parse(r.text);
    expect(parsed.network).to.equal("solana-mainnet");
  });
});
