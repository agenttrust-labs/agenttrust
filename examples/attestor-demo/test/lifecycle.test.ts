/**
 * Attestor lifecycle integration test (gated on INTEGRATION=1).
 *
 * Runs the full ValidationRegistry attestor lifecycle on devnet against a
 * FRESH (subject_asset, capability_name) tuple per run so re-runs never
 * collide on init constraints. Captures all 5 tx signatures + Explorer
 * URLs into the test result for the verification report.
 *
 *   1. register_namespace (creates the capability namespace PDA)
 *   2. register_attestor  (creates the attestor profile PDA)
 *   3. request_validation (creates the validation_request PDA)
 *   4. respond_to_validation (creates the validation_attestation PDA)
 *   5. revoke_validation  (flips revoked=true on the attestation)
 *
 * After each step the test fetches the corresponding on-chain account
 * and asserts the load-bearing fields decode correctly.
 *
 * Required env:
 *   FACILITATOR_KEYPAIR_B58 — base58 64-byte secret key. Funds the
 *   per-run requester + attestor wallets and pays rent for the
 *   namespace + attestor profile PDAs.
 */

import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";

import {
  AnchorProvider,
  Program,
  Wallet,
} from "@coral-xyz/anchor";

import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";

import {
  VALIDATION_REGISTRY_DEVNET_ID,
  buildRegisterAttestorIx,
  buildRegisterNamespaceIx,
  buildRequestValidationIx,
  buildRespondToValidationIx,
  buildRevokeValidationIx,
  computeCapabilityHash,
  deriveAttestorProfilePda,
  deriveCapabilityNamespacePda,
  deriveValidationAttestationPda,
  deriveValidationRequestPda,
  fetchAttestorProfile,
  fetchCapabilityNamespace,
  fetchValidationAttestation,
  fetchValidationRequest,
  loadValidationRegistry,
} from "@agenttrust-sdk/trustgate";

// ---------------------------------------------------------------------------

const INTEGRATION = process.env.INTEGRATION === "1";
const integrationDescribe = INTEGRATION ? describe : describe.skip;

const RPC_URL = process.env.RPC_URL ?? "https://api.devnet.solana.com";
// Locate the IDL relative to this package's repo root, not __dirname —
// Mocha 9 + Node 25 sometimes loads .ts test files via the ESM loader,
// where __dirname is not defined. process.cwd() is the package root when
// pnpm runs the script.
const VR_IDL_PATH = path.resolve(process.cwd(), "../../target/idl/validation_registry.json");

function explorer(sig: string): string {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadIdl(): any {
  return fs.existsSync(VR_IDL_PATH)
    ? JSON.parse(fs.readFileSync(VR_IDL_PATH, "utf-8"))
    : undefined;
}

// ---------------------------------------------------------------------------

interface StepCapture { sig: string; explorer: string; pda: string }
interface RunState {
  attestor?:  Keypair;
  requester?: Keypair;
  subject?:   import("@solana/web3.js").PublicKey;
  steps:      Record<string, StepCapture>;
}

integrationDescribe("ValidationRegistry attestor lifecycle (fresh state per run)", function () {
  this.timeout(120_000);

  let conn:        Connection;
  let facilitator: Keypair;
  let provider:    AnchorProvider;
  let program:     Program;

  // Fresh per-run identifiers — re-runs produce new PDAs, so init
  // constraints can never collide between runs.
  const runTag = Math.random().toString(36).slice(2, 10);
  const capabilityName = `at-test.${runTag}`;
  const namespaceVer   = "v1";
  const namespaceUri   = `https://agenttrust.test/schemas/${runTag}.json`;

  const state: RunState = { steps: {} };

  before(async function () {
    const facilitatorB58 = process.env.FACILITATOR_KEYPAIR_B58;
    if (!facilitatorB58) {
      // eslint-disable-next-line no-console
      console.log("SKIPPED: FACILITATOR_KEYPAIR_B58 not set");
      this.skip();
      return;
    }
    facilitator = Keypair.fromSecretKey(bs58.decode(facilitatorB58));
    conn = new Connection(RPC_URL, "confirmed");
    provider = new AnchorProvider(conn, new Wallet(facilitator), { commitment: "confirmed" });

    // Sanity: facilitator must have at least 0.05 SOL to fund this run.
    const bal = await conn.getBalance(facilitator.publicKey);
    if (bal < 0.05 * 1e9) {
      throw new Error(`facilitator balance too low (${bal/1e9} SOL); needs ≥ 0.05 SOL for rent`);
    }

    program = await loadValidationRegistry(provider, VALIDATION_REGISTRY_DEVNET_ID, loadIdl());
  });

  after(() => {
    if (!INTEGRATION) return;
    // eslint-disable-next-line no-console
    console.log("\n--- attestor lifecycle captured signatures ---");
    for (const [step, info] of Object.entries(state.steps)) {
      // eslint-disable-next-line no-console
      console.log(`${step.padEnd(22)} sig=${info.sig}`);
      // eslint-disable-next-line no-console
      console.log(`${"".padEnd(22)} pda=${info.pda}`);
      // eslint-disable-next-line no-console
      console.log(`${"".padEnd(22)} ${info.explorer}`);
    }
  });

  it("step 1: register_namespace creates the CapabilityNamespace PDA", async () => {
    const capabilityHash = computeCapabilityHash(capabilityName);
    const namespacePda = deriveCapabilityNamespacePda(VALIDATION_REGISTRY_DEVNET_ID, capabilityHash);

    const ix = await buildRegisterNamespaceIx({
      program, creator: facilitator.publicKey,
      namespaceHash: capabilityHash, name: capabilityName,
      version: namespaceVer, schemaUri: namespaceUri,
    });
    const tx = new Transaction()
      .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }))
      .add(ix);
    const sig = await sendAndConfirmTransaction(conn, tx, [facilitator], { commitment: "confirmed" });

    // PDA exists and decodes to the expected name + creator.
    const fetched = await fetchCapabilityNamespace(program, capabilityHash);
    expect(fetched.data, "namespace must exist after register_namespace").to.not.equal(null);
    expect(fetched.data.name).to.equal(capabilityName);
    expect(fetched.data.version).to.equal(namespaceVer);
    expect(fetched.data.creator.toBase58()).to.equal(facilitator.publicKey.toBase58());

    state.steps.registerNamespace = { sig, explorer: explorer(sig), pda: namespacePda.toBase58() };
  });

  it("step 2: register_attestor creates the AttestorProfile PDA", async () => {
    // Generate a fresh attestor + fund.
    const attestor = Keypair.generate();
    const fundIx = SystemProgram.transfer({
      fromPubkey: facilitator.publicKey,
      toPubkey:   attestor.publicKey,
      lamports:   0.02 * 1e9,
    });
    await sendAndConfirmTransaction(conn, new Transaction().add(fundIx), [facilitator], { commitment: "confirmed" });
    state.attestor = attestor;

    const attestorPda = deriveAttestorProfilePda(VALIDATION_REGISTRY_DEVNET_ID, attestor.publicKey);
    const ix = await buildRegisterAttestorIx({
      program, attestor: attestor.publicKey,
      displayNameUri: `https://agenttrust.test/attestors/${runTag}.json`,
    });
    const tx = new Transaction()
      .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }))
      .add(ix);
    const sig = await sendAndConfirmTransaction(conn, tx, [attestor], { commitment: "confirmed" });

    const fetched = await fetchAttestorProfile(program, attestor.publicKey);
    expect(fetched.data, "attestor profile must exist after register_attestor").to.not.equal(null);
    expect(fetched.data.attestor.toBase58()).to.equal(attestor.publicKey.toBase58());
    expect(fetched.data.totalAttestations.toNumber()).to.equal(0);
    expect(fetched.data.totalRevokedByAttestor.toNumber()).to.equal(0);

    state.steps.registerAttestor = { sig, explorer: explorer(sig), pda: attestorPda.toBase58() };
  });

  it("step 3: request_validation creates the ValidationRequest PDA", async () => {
    const capabilityHash = computeCapabilityHash(capabilityName);
    // Fresh requester per run so the (subject, capability, requester) PDA
    // never collides between runs.
    const requester = Keypair.generate();
    const fundIx = SystemProgram.transfer({
      fromPubkey: facilitator.publicKey,
      toPubkey:   requester.publicKey,
      lamports:   0.01 * 1e9,
    });
    await sendAndConfirmTransaction(conn, new Transaction().add(fundIx), [facilitator], { commitment: "confirmed" });
    state.requester = requester;

    // Subject = a fresh random pubkey — no Quantu agent_account needed for
    // the attestation lifecycle test (the policy_vault enforces Quantu, not
    // the validation_registry).
    const subjectAsset = Keypair.generate().publicKey;
    state.subject = subjectAsset;

    const claimUri     = `https://agenttrust.test/claims/${runTag}.json`;
    const claimUriHash = computeCapabilityHash(claimUri);

    const reqPda = deriveValidationRequestPda(
      VALIDATION_REGISTRY_DEVNET_ID, subjectAsset, capabilityHash, requester.publicKey,
    );
    const ix = await buildRequestValidationIx({
      program, requester: requester.publicKey,
      subjectAsset, capabilityHash, claimUriHash,
      deadlineSlot: (await conn.getSlot()) + 100_000,
    });
    const tx = new Transaction()
      .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }))
      .add(ix);
    const sig = await sendAndConfirmTransaction(conn, tx, [requester], { commitment: "confirmed" });

    const fetched = await fetchValidationRequest(program, subjectAsset, capabilityHash, requester.publicKey);
    expect(fetched.data, "validation_request must exist after request_validation").to.not.equal(null);
    expect(fetched.data.subjectAsset.toBase58()).to.equal(subjectAsset.toBase58());
    expect(fetched.data.requester.toBase58()).to.equal(requester.publicKey.toBase58());
    expect(fetched.data.deadline.toNumber()).to.be.greaterThan(0);

    state.steps.requestValidation = { sig, explorer: explorer(sig), pda: reqPda.toBase58() };
  });

  it("step 4: respond_to_validation creates the ValidationAttestation PDA", async () => {
    const capabilityHash = computeCapabilityHash(capabilityName);
    const attestor = state.attestor!;
    const subjectAsset = state.subject!;

    const claimUri = `https://agenttrust.test/claims/${runTag}.json`;
    const claimUriHash = computeCapabilityHash(claimUri);
    const claimPayload = computeCapabilityHash(`payload-${runTag}`);

    const attestationPda = deriveValidationAttestationPda(
      VALIDATION_REGISTRY_DEVNET_ID, subjectAsset, capabilityHash, attestor.publicKey,
    );
    const ix = await buildRespondToValidationIx({
      program, payer: facilitator.publicKey, attestor: attestor.publicKey,
      subjectAsset, capabilityHash,
      claimPayloadHash: claimPayload,
      claimUriHash,
      expiresAtSlot: (await conn.getSlot()) + 1_000_000,
    });
    const tx = new Transaction()
      .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }))
      .add(ix);
    const sig = await sendAndConfirmTransaction(conn, tx, [facilitator, attestor], { commitment: "confirmed" });

    const fetched = await fetchValidationAttestation(program, subjectAsset, capabilityHash, attestor.publicKey);
    expect(fetched.data, "attestation must exist after respond_to_validation").to.not.equal(null);
    expect(fetched.data.subjectAsset.toBase58()).to.equal(subjectAsset.toBase58());
    expect(fetched.data.attestor.toBase58()).to.equal(attestor.publicKey.toBase58());
    expect(fetched.data.revoked).to.equal(false);

    // attestor profile counter should have incremented.
    const profile = await fetchAttestorProfile(program, attestor.publicKey);
    expect(profile.data.totalAttestations.toNumber()).to.equal(1);

    state.steps.respondToValidation = { sig, explorer: explorer(sig), pda: attestationPda.toBase58() };
  });

  it("step 5: revoke_validation flips revoked=true and increments revocation counter", async () => {
    const capabilityHash = computeCapabilityHash(capabilityName);
    const attestor = state.attestor!;
    const subjectAsset = state.subject!;
    const reasonHash = computeCapabilityHash(`revoked-${runTag}`);

    const attestationPda = deriveValidationAttestationPda(
      VALIDATION_REGISTRY_DEVNET_ID, subjectAsset, capabilityHash, attestor.publicKey,
    );
    const ix = await buildRevokeValidationIx({
      program, attestor: attestor.publicKey, subjectAsset,
      capabilityHash, revocationReasonHash: reasonHash,
    });
    const tx = new Transaction()
      .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }))
      .add(ix);
    const sig = await sendAndConfirmTransaction(conn, tx, [attestor], { commitment: "confirmed" });

    const fetched = await fetchValidationAttestation(program, subjectAsset, capabilityHash, attestor.publicKey);
    expect(fetched.data, "attestation must still exist after revoke").to.not.equal(null);
    expect(fetched.data.revoked).to.equal(true);
    expect(fetched.data.revokedAt.toNumber()).to.be.greaterThan(0);
    expect(Buffer.from(fetched.data.revocationReasonHash).equals(Buffer.from(reasonHash))).to.equal(true);

    // attestor profile revocation counter incremented.
    const profile = await fetchAttestorProfile(program, attestor.publicKey);
    expect(profile.data.totalRevokedByAttestor.toNumber()).to.equal(1);

    state.steps.revokeValidation = { sig, explorer: explorer(sig), pda: attestationPda.toBase58() };
  });

  it("captured all 5 lifecycle signatures", () => {
    const required = [
      "registerNamespace",
      "registerAttestor",
      "requestValidation",
      "respondToValidation",
      "revokeValidation",
    ];
    for (const step of required) {
      expect(state.steps[step], `${step} signature missing`).to.exist;
      expect(state.steps[step].sig).to.match(/^[1-9A-HJ-NP-Za-km-z]+$/);
      expect(state.steps[step].explorer).to.include("explorer.solana.com/tx/");
    }
  });
});
