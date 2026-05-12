/**
 * `makePayShFacilitator` + `makeDefaultRegistry` factory tests.
 *
 * Pure-fn / structural assertions only — we don't construct an Anchor
 * Program here (would need a real RPC), but we verify the factory:
 *
 *   - returns a `PayShFacilitatorDeps`-shaped bundle with every field
 *     populated from the inputs
 *   - defaults `signDecision` to an ed25519 signer over
 *     `facilitatorKeypair.secretKey` (round-tripped through tweetnacl)
 *   - honours an explicit `signDecision` override
 *   - threads `replayCache` through unchanged
 *
 * `makeDefaultRegistry` is exercised against a tiny stub registry that
 * structurally satisfies `FacilitatorRegistryLike`.
 */

import { expect } from "chai";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";

import { DEFAULT_DEVNET_PROGRAM_IDS, DEFAULT_DEVNET_QUANTU_IDS } from "../src";
import {
  makePayShFacilitator,
  makeDefaultRegistry,
  type FacilitatorAdapterLike,
  type FacilitatorRegistryLike,
} from "../src/facilitator-factory";

// Anchor `Program` is an interface-heavy type; the factory only forwards
// it into the SDK's `emit-feedback` factory, so a structural placeholder
// is enough for these unit tests.
const FAKE_PROGRAM = { programId: DEFAULT_DEVNET_PROGRAM_IDS.trustGate } as any;
const FAKE_CONN    = new Connection("https://api.devnet.solana.com", "confirmed");

function makeArgs(overrides: Record<string, unknown> = {}): any {
  const facilitatorKeypair = Keypair.generate();
  return {
    connection:         FAKE_CONN,
    facilitatorKeypair,
    resolveQuantu:      async (_payeeAgent: PublicKey) => ({
      agentAccount: Keypair.generate().publicKey,
      asset:        Keypair.generate().publicKey,
      collection:   Keypair.generate().publicKey,
    }),
    programIds:         DEFAULT_DEVNET_PROGRAM_IDS,
    quantuIds:          DEFAULT_DEVNET_QUANTU_IDS,
    trustgate:          FAKE_PROGRAM,
    signingNetwork:     "solana-devnet",
    ...overrides,
  };
}

describe("makePayShFacilitator", () => {
  it("returns a deps bundle with every load-bearing field populated", () => {
    const args = makeArgs();
    const deps = makePayShFacilitator(args);
    expect(deps.signingNetwork).to.equal("solana-devnet");
    expect(deps.feePayer.equals(args.facilitatorKeypair.publicKey)).to.equal(true);
    expect(typeof deps.validateOnChainTx).to.equal("function");
    expect(typeof deps.emitFeedbackCpi).to.equal("function");
    expect(typeof deps.priorEmissionLookup).to.equal("function");
    expect(typeof deps.signDecision).to.equal("function");
  });

  it("default signDecision is an ed25519 signer over facilitator.secretKey", () => {
    const args = makeArgs();
    const deps = makePayShFacilitator(args);
    const msg = new TextEncoder().encode("test envelope bytes");
    const sig = deps.signDecision!(msg);
    expect(sig.length).to.equal(nacl.sign.signatureLength);
    const ok = nacl.sign.detached.verify(
      msg, sig, args.facilitatorKeypair.publicKey.toBytes(),
    );
    expect(ok).to.equal(true);
  });

  it("honours an explicit signDecision override", () => {
    let called = 0;
    const stubSig = new Uint8Array(nacl.sign.signatureLength).fill(0xCA);
    const deps = makePayShFacilitator(makeArgs({
      signDecision: (_bytes: Uint8Array) => { called += 1; return stubSig; },
    }));
    const out = deps.signDecision!(new Uint8Array(32));
    expect(called).to.equal(1);
    expect(out).to.deep.equal(stubSig);
  });

  it("threads replayCache through unchanged", () => {
    const stubCache = {
      observe: () => "fresh" as const,
      size:    () => 0,
    };
    const deps = makePayShFacilitator(makeArgs({ replayCache: stubCache }));
    expect(deps.replayCache).to.equal(stubCache);
  });

  it("forwards clockSkewMs to the deps bundle", () => {
    const deps = makePayShFacilitator(makeArgs({ clockSkewMs: 5_000 }));
    expect(deps.clockSkewMs).to.equal(5_000);
  });
});

describe("makeDefaultRegistry", () => {
  class StubRegistry implements FacilitatorRegistryLike {
    registered: FacilitatorAdapterLike[] = [];
    defaultName?: string;
    register(adapter: FacilitatorAdapterLike): this {
      this.registered.push(adapter); return this;
    }
    setDefault(name: string): this {
      this.defaultName = name; return this;
    }
  }

  it("registers paySh and sets its name as default", () => {
    const paySh = { name: "pay-sh" } as FacilitatorAdapterLike;
    const reg   = makeDefaultRegistry(StubRegistry, { paySh });
    expect(reg.registered.length).to.equal(1);
    expect(reg.registered[0]).to.equal(paySh);
    expect(reg.defaultName).to.equal("pay-sh");
  });

  it("honours defaultName override", () => {
    const paySh = { name: "pay-sh" } as FacilitatorAdapterLike;
    const reg   = makeDefaultRegistry(StubRegistry, { paySh, defaultName: "other" });
    expect(reg.defaultName).to.equal("other");
  });
});
