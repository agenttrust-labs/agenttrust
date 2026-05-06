/**
 * Quantu PDA derivation tests. Pure-fn — no chain calls.
 */

import { expect } from "chai";
import { PublicKey } from "@solana/web3.js";

import {
  DEFAULT_DEVNET_QUANTU_IDS,
  MAINNET_QUANTU_IDS,
  deriveAgentAccountPda,
  deriveAtomConfigPda,
  deriveAtomRegistryAuthorityPda,
  deriveAtomStatsPda,
  deriveQuantuFeedbackAccounts,
} from "../src/quantu";

const ASSET = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const COLLECTION = new PublicKey("So11111111111111111111111111111111111111112");

describe("Quantu PDA derivation", () => {
  it("agentAccount is deterministic for (programs, asset)", () => {
    const a = deriveAgentAccountPda(DEFAULT_DEVNET_QUANTU_IDS, ASSET);
    const b = deriveAgentAccountPda(DEFAULT_DEVNET_QUANTU_IDS, ASSET);
    expect(a.equals(b)).to.equal(true);
  });

  it("agentAccount differs across program ID sets (devnet vs mainnet)", () => {
    const dn = deriveAgentAccountPda(DEFAULT_DEVNET_QUANTU_IDS, ASSET);
    const mn = deriveAgentAccountPda(MAINNET_QUANTU_IDS, ASSET);
    expect(dn.equals(mn)).to.equal(false);
  });

  it("atomConfig is constant for a given program ID", () => {
    const a = deriveAtomConfigPda(DEFAULT_DEVNET_QUANTU_IDS);
    const b = deriveAtomConfigPda(DEFAULT_DEVNET_QUANTU_IDS);
    expect(a.equals(b)).to.equal(true);
  });

  it("atomStats varies by asset", () => {
    const otherAsset = new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB");
    const a = deriveAtomStatsPda(DEFAULT_DEVNET_QUANTU_IDS, ASSET);
    const b = deriveAtomStatsPda(DEFAULT_DEVNET_QUANTU_IDS, otherAsset);
    expect(a.equals(b)).to.equal(false);
  });

  it("registryAuthority is constant for a given program ID", () => {
    const a = deriveAtomRegistryAuthorityPda(DEFAULT_DEVNET_QUANTU_IDS);
    const b = deriveAtomRegistryAuthorityPda(DEFAULT_DEVNET_QUANTU_IDS);
    expect(a.equals(b)).to.equal(true);
  });
});

describe("deriveQuantuFeedbackAccounts", () => {
  it("returns only base 3 fields when atomEnabled=false", () => {
    const r = deriveQuantuFeedbackAccounts({
      programs:   DEFAULT_DEVNET_QUANTU_IDS,
      asset:      ASSET,
      collection: COLLECTION,
      atomEnabled: false,
    });
    expect(r.agentAccount).to.exist;
    expect(r.asset.equals(ASSET)).to.equal(true);
    expect(r.collection.equals(COLLECTION)).to.equal(true);
    expect(r.atomConfig).to.equal(undefined);
    expect(r.atomStats).to.equal(undefined);
    expect(r.atomEngineProgram).to.equal(undefined);
    expect(r.registryAuthority).to.equal(undefined);
  });

  it("returns all 7 fields when atomEnabled=true", () => {
    const r = deriveQuantuFeedbackAccounts({
      programs:   DEFAULT_DEVNET_QUANTU_IDS,
      asset:      ASSET,
      collection: COLLECTION,
      atomEnabled: true,
    });
    expect(r.atomConfig).to.exist;
    expect(r.atomStats).to.exist;
    expect(r.atomEngineProgram!.equals(DEFAULT_DEVNET_QUANTU_IDS.atomEngine)).to.equal(true);
    expect(r.registryAuthority).to.exist;
  });

  it("agentAccount is the same regardless of atomEnabled", () => {
    const off = deriveQuantuFeedbackAccounts({
      programs: DEFAULT_DEVNET_QUANTU_IDS, asset: ASSET, collection: COLLECTION, atomEnabled: false,
    });
    const on = deriveQuantuFeedbackAccounts({
      programs: DEFAULT_DEVNET_QUANTU_IDS, asset: ASSET, collection: COLLECTION, atomEnabled: true,
    });
    expect(off.agentAccount.equals(on.agentAccount)).to.equal(true);
  });
});

describe("Mainnet vs devnet program IDs are distinct", () => {
  it("agentRegistry IDs differ", () => {
    expect(DEFAULT_DEVNET_QUANTU_IDS.agentRegistry.equals(MAINNET_QUANTU_IDS.agentRegistry))
      .to.equal(false);
  });
  it("atomEngine IDs differ", () => {
    expect(DEFAULT_DEVNET_QUANTU_IDS.atomEngine.equals(MAINNET_QUANTU_IDS.atomEngine))
      .to.equal(false);
  });
});
