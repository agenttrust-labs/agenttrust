/**
 * ValidationRegistry SDK client tests. Pure-fn — PDA derivers + ix builders
 * against a fake Anchor `Program`. No chain calls.
 */

import { expect } from "chai";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

import {
  VALIDATION_REGISTRY_DEVNET_ID,
  buildRegisterAttestorIx,
  buildRegisterNamespaceIx,
  buildRequestValidationIx,
  buildRespondToValidationIx,
  buildRevokeValidationIx,
  computeCapabilityHash,
  computeNamespaceHash,
  deriveAttestorProfilePda,
  deriveCapabilityNamespacePda,
  deriveValidationAttestationPda,
  deriveValidationRequestPda,
} from "../src/validation-registry";

const PROGRAM_ID = VALIDATION_REGISTRY_DEVNET_ID;

function fakeProgram(programId: PublicKey): {
  programId: PublicKey;
  methods: any;
  callLog: Array<{ name: string; args: unknown[] }>;
  accountsLog: Array<Record<string, unknown>>;
} {
  const callLog: Array<{ name: string; args: unknown[] }> = [];
  const accountsLog: Array<Record<string, unknown>> = [];
  const builder: any = {
    accounts(a: Record<string, unknown>) { accountsLog.push(a); return builder; },
    instruction: async () => ({ programId, keys: [], data: Buffer.from("fake") }),
  };
  return {
    programId,
    callLog,
    accountsLog,
    methods: new Proxy({}, {
      get: (_, prop: string) => (...args: unknown[]) => {
        callLog.push({ name: prop, args });
        return builder;
      },
    }),
  };
}

// ---------------------------------------------------------------------------
// PDA derivation
// ---------------------------------------------------------------------------

describe("ValidationRegistry PDA derivers", () => {
  const NAMESPACE_HASH = computeNamespaceHash("usdc.payment-policy/v1");
  const CAP_HASH       = computeCapabilityHash("usdc-payment-policy:v1");
  const SUBJECT        = Keypair.generate().publicKey;
  const ATTESTOR       = Keypair.generate().publicKey;
  const REQUESTER      = Keypair.generate().publicKey;

  it("namespace PDA is deterministic for same hash", () => {
    const a = deriveCapabilityNamespacePda(PROGRAM_ID, NAMESPACE_HASH);
    const b = deriveCapabilityNamespacePda(PROGRAM_ID, NAMESPACE_HASH);
    expect(a.equals(b)).to.equal(true);
  });

  it("namespace PDA differs across distinct hashes", () => {
    const a = deriveCapabilityNamespacePda(PROGRAM_ID, NAMESPACE_HASH);
    const b = deriveCapabilityNamespacePda(PROGRAM_ID, computeNamespaceHash("other-ns"));
    expect(a.equals(b)).to.equal(false);
  });

  it("namespace PDA throws on wrong-length hash", () => {
    expect(() => deriveCapabilityNamespacePda(PROGRAM_ID, new Uint8Array(31)))
      .to.throw(/32 bytes/);
  });

  it("attestor PDA is deterministic", () => {
    const a = deriveAttestorProfilePda(PROGRAM_ID, ATTESTOR);
    const b = deriveAttestorProfilePda(PROGRAM_ID, ATTESTOR);
    expect(a.equals(b)).to.equal(true);
  });

  it("validation request PDA varies on (subject, cap, requester)", () => {
    const a = deriveValidationRequestPda(PROGRAM_ID, SUBJECT, CAP_HASH, REQUESTER);
    const b = deriveValidationRequestPda(PROGRAM_ID, Keypair.generate().publicKey, CAP_HASH, REQUESTER);
    const c = deriveValidationRequestPda(PROGRAM_ID, SUBJECT, computeCapabilityHash("alt"), REQUESTER);
    const d = deriveValidationRequestPda(PROGRAM_ID, SUBJECT, CAP_HASH, Keypair.generate().publicKey);
    expect(a.equals(b)).to.equal(false);
    expect(a.equals(c)).to.equal(false);
    expect(a.equals(d)).to.equal(false);
  });

  it("attestation PDA varies on (subject, cap, attestor) but not on requester", () => {
    const a = deriveValidationAttestationPda(PROGRAM_ID, SUBJECT, CAP_HASH, ATTESTOR);
    const b = deriveValidationAttestationPda(PROGRAM_ID, SUBJECT, CAP_HASH, Keypair.generate().publicKey);
    expect(a.equals(b)).to.equal(false);
  });

  it("computeNamespaceHash is sha256-deterministic", () => {
    const a = computeNamespaceHash("nike-checkout/v1");
    const b = computeNamespaceHash("nike-checkout/v1");
    expect(Array.from(a)).to.deep.equal(Array.from(b));
    expect(a.length).to.equal(32);
  });

  it("computeCapabilityHash differs per input", () => {
    const a = computeCapabilityHash("cap1");
    const b = computeCapabilityHash("cap2");
    expect(Array.from(a)).to.not.deep.equal(Array.from(b));
  });
});

// ---------------------------------------------------------------------------
// Instruction builders
// ---------------------------------------------------------------------------

describe("ValidationRegistry instruction builders", () => {
  const NAME      = "usdc-policy";
  const VERSION   = "v1";
  const URI       = "https://agenttrust.dev/schemas/usdc-policy.json";
  const NS_HASH   = computeNamespaceHash(NAME);
  const CAP_HASH  = computeCapabilityHash(NAME);

  const creator       = Keypair.generate().publicKey;
  const attestor      = Keypair.generate().publicKey;
  const subjectAsset  = Keypair.generate().publicKey;
  const requester     = Keypair.generate().publicKey;
  const payer         = Keypair.generate().publicKey;
  const claimUriHash  = new Uint8Array(32).fill(0xAA);
  const claimPayload  = new Uint8Array(32).fill(0xBB);
  const reasonHash    = new Uint8Array(32).fill(0xCC);

  it("buildRegisterNamespaceIx invokes registerNamespace with derived PDA", async () => {
    const fp = fakeProgram(PROGRAM_ID);
    await buildRegisterNamespaceIx({
      program: fp as any, creator, namespaceHash: NS_HASH,
      name: NAME, version: VERSION, schemaUri: URI,
    });
    expect(fp.callLog).to.have.lengthOf(1);
    expect(fp.callLog[0].name).to.equal("registerNamespace");
    expect(fp.callLog[0].args[1]).to.equal(NAME);
    const acc = fp.accountsLog[0];
    expect((acc as any).creator.equals(creator)).to.equal(true);
    expect((acc as any).namespace.equals(deriveCapabilityNamespacePda(PROGRAM_ID, NS_HASH)))
      .to.equal(true);
    expect((acc as any).systemProgram.equals(SystemProgram.programId)).to.equal(true);
  });

  it("buildRegisterAttestorIx invokes registerAttestor + derives profile PDA", async () => {
    const fp = fakeProgram(PROGRAM_ID);
    await buildRegisterAttestorIx({
      program: fp as any, attestor, displayNameUri: "https://attestor.example/profile.json",
    });
    expect(fp.callLog[0].name).to.equal("registerAttestor");
    const acc = fp.accountsLog[0];
    expect((acc as any).attestorProfile.equals(deriveAttestorProfilePda(PROGRAM_ID, attestor)))
      .to.equal(true);
  });

  it("buildRequestValidationIx invokes requestValidation with all derived PDAs", async () => {
    const fp = fakeProgram(PROGRAM_ID);
    await buildRequestValidationIx({
      program: fp as any, requester, subjectAsset,
      capabilityHash: CAP_HASH, claimUriHash, deadlineSlot: 999_999,
    });
    expect(fp.callLog[0].name).to.equal("requestValidation");
    const acc = fp.accountsLog[0];
    expect((acc as any).validationRequest.equals(
      deriveValidationRequestPda(PROGRAM_ID, subjectAsset, CAP_HASH, requester),
    )).to.equal(true);
    expect((acc as any).capabilityNamespace.equals(
      deriveCapabilityNamespacePda(PROGRAM_ID, CAP_HASH),
    )).to.equal(true);
  });

  it("buildRequestValidationIx rejects wrong-length claimUriHash", async () => {
    const fp = fakeProgram(PROGRAM_ID);
    let thrown: Error | null = null;
    try {
      await buildRequestValidationIx({
        program: fp as any, requester, subjectAsset, capabilityHash: CAP_HASH,
        claimUriHash: new Uint8Array(31), deadlineSlot: 1,
      });
    } catch (e) { thrown = e as Error; }
    expect(thrown?.message).to.match(/32 bytes/);
  });

  it("buildRespondToValidationIx invokes respondToValidation with all 5 accounts", async () => {
    const fp = fakeProgram(PROGRAM_ID);
    await buildRespondToValidationIx({
      program: fp as any, payer, attestor, subjectAsset,
      capabilityHash: CAP_HASH, claimPayloadHash: claimPayload,
      claimUriHash, expiresAtSlot: 1_000_000,
    });
    expect(fp.callLog[0].name).to.equal("respondToValidation");
    const acc = fp.accountsLog[0];
    expect((acc as any).attestation.equals(
      deriveValidationAttestationPda(PROGRAM_ID, subjectAsset, CAP_HASH, attestor),
    )).to.equal(true);
    expect((acc as any).attestorProfile.equals(
      deriveAttestorProfilePda(PROGRAM_ID, attestor),
    )).to.equal(true);
    expect((acc as any).capabilityNamespace.equals(
      deriveCapabilityNamespacePda(PROGRAM_ID, CAP_HASH),
    )).to.equal(true);
  });

  it("buildRevokeValidationIx invokes revokeValidation", async () => {
    const fp = fakeProgram(PROGRAM_ID);
    await buildRevokeValidationIx({
      program: fp as any, attestor, subjectAsset,
      capabilityHash: CAP_HASH, revocationReasonHash: reasonHash,
    });
    expect(fp.callLog[0].name).to.equal("revokeValidation");
    const acc = fp.accountsLog[0];
    expect((acc as any).attestation.equals(
      deriveValidationAttestationPda(PROGRAM_ID, subjectAsset, CAP_HASH, attestor),
    )).to.equal(true);
  });

  it("VALIDATION_REGISTRY_DEVNET_ID matches Anchor.toml", () => {
    expect(PROGRAM_ID.toBase58()).to.equal("Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv");
  });
});
