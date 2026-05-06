/**
 * ValidationRegistry — Anchor TS integration tests.
 *
 * Exercises all 5 instructions end-to-end + a couple of negative paths.
 * v1 trust model: attestor signs the tx (Ed25519 sysvar verify is a v1.1
 * deliverable). The `attestor_signature` field is a zeroed placeholder.
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { createHash } from "crypto";
import { BN } from "bn.js";
import {
  Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram,
} from "@solana/web3.js";
import { expect } from "chai";
import type { ValidationRegistry } from "../target/types/validation_registry";

const NS_PREFIX     = Buffer.from("capability");
const ATT_PREFIX    = Buffer.from("attestor");
const REQ_PREFIX    = Buffer.from("request");
const ATTEST_PREFIX = Buffer.from("attestation");

function sha256(s: string | Buffer): Buffer {
  return createHash("sha256").update(s).digest();
}

function deriveNamespacePda(programId: PublicKey, namespaceHash: Buffer) {
  return PublicKey.findProgramAddressSync([NS_PREFIX, namespaceHash], programId)[0];
}
function deriveAttestorPda(programId: PublicKey, attestor: PublicKey) {
  return PublicKey.findProgramAddressSync([ATT_PREFIX, attestor.toBuffer()], programId)[0];
}
function deriveRequestPda(programId: PublicKey, subject: PublicKey, capHash: Buffer, requester: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [REQ_PREFIX, subject.toBuffer(), capHash, requester.toBuffer()], programId,
  )[0];
}
function deriveAttestationPda(programId: PublicKey, subject: PublicKey, capHash: Buffer, attestor: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [ATTEST_PREFIX, subject.toBuffer(), capHash, attestor.toBuffer()], programId,
  )[0];
}

describe("validation-registry", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ValidationRegistry as Program<ValidationRegistry>;
  const wallet  = provider.wallet.publicKey;
  const conn    = provider.connection as Connection;

  describe("end-to-end flow: namespace → attestor → request → respond → revoke", () => {
    it("walks through all 5 instructions", async () => {
      // Per-test fresh randomness so re-runs against persistent devnet state
      // don't collide. namespaceName + capability descriptor are unique per run.
      const runTag = Math.random().toString(36).slice(2, 8); // 6-char suffix

      // -- 1. register_namespace ---------------------------------------------
      const namespaceName = `kyc.tier-1.${runTag}`;
      const namespaceHash = sha256(namespaceName);
      const nsPda = deriveNamespacePda(program.programId, namespaceHash);

      await program.methods
        .registerNamespace(
          Array.from(namespaceHash),
          namespaceName,
          "v1",
          "ipfs://Qm-kyc-tier-1-schema",
        )
        .accountsStrict({
          creator:       wallet,
          namespace:     nsPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const ns = await program.account.capabilityNamespace.fetch(nsPda);
      expect(ns.name).to.equal(namespaceName);
      expect(ns.version).to.equal("v1");
      expect(Buffer.from(ns.namespaceHash).equals(namespaceHash)).to.equal(true);
      expect(ns.creator.toBase58()).to.equal(wallet.toBase58());

      // -- 2. register_attestor ----------------------------------------------
      // Use the wallet itself as attestor for the happy path. The PDA is keyed
      // by attestor pubkey — same pubkey across runs, so tolerate prior init.
      const attestorPda = deriveAttestorPda(program.programId, wallet);
      try {
        await program.methods
          .registerAttestor("ipfs://Qm-attestor-civic-metadata")
          .accountsStrict({
            attestor:        wallet,
            attestorProfile: attestorPda,
            systemProgram:   SystemProgram.programId,
          })
          .rpc();
      } catch (_) { /* already registered from prior run */ }

      let profile = await program.account.attestorProfile.fetch(attestorPda);
      expect(profile.attestor.toBase58()).to.equal(wallet.toBase58());
      // Snapshot counters before this run; we'll assert they incremented by 1.
      const preAttestations  = profile.totalAttestations.toNumber();
      const preRevocations   = profile.totalRevokedByAttestor.toNumber();

      // -- 3. request_validation ---------------------------------------------
      // capability_hash convention: SHA256("namespace:version:claim_descriptor")[..32]
      const capabilityDescriptor = `${namespaceName}:v1:identity-verified`;
      const capabilityHash       = sha256(capabilityDescriptor);

      // Need a namespace at the capabilityHash key for request_validation's
      // capability_namespace constraint to resolve. Re-register a second
      // namespace under the capabilityHash. Name must NOT contain ':'.
      const capNsPda = deriveNamespacePda(program.programId, capabilityHash);
      await program.methods
        .registerNamespace(
          Array.from(capabilityHash),
          `kyc-cap-${runTag}`,
          "v1",
          "ipfs://Qm-cap-schema",
        )
        .accountsStrict({
          creator:       wallet,
          namespace:     capNsPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const subjectAsset = Keypair.generate().publicKey;
      const claimUriHash = sha256("https://example.com/claim/abc123");

      const reqPda = deriveRequestPda(program.programId, subjectAsset, capabilityHash, wallet);
      const slot   = await conn.getSlot();
      const deadline = slot + 100_000;

      await program.methods
        .requestValidation(
          subjectAsset,
          Array.from(capabilityHash),
          Array.from(claimUriHash),
          new BN(deadline),
        )
        .accountsStrict({
          requester:           wallet,
          validationRequest:   reqPda,
          capabilityNamespace: capNsPda,
          systemProgram:       SystemProgram.programId,
        })
        .rpc();

      const req = await program.account.validationRequest.fetch(reqPda);
      expect(req.subjectAsset.toBase58()).to.equal(subjectAsset.toBase58());
      expect(req.deadline.toNumber()).to.equal(deadline);

      // -- 4. respond_to_validation ------------------------------------------
      const claimPayloadHash = sha256("KYC verified for subject X");
      const expiresAt        = slot + 50_000;
      const attestPda        = deriveAttestationPda(program.programId, subjectAsset, capabilityHash, wallet);

      await program.methods
        .respondToValidation(
          subjectAsset,
          Array.from(capabilityHash),
          Array.from(claimPayloadHash),
          Array.from(claimUriHash),
          new BN(expiresAt),
        )
        .accountsStrict({
          payer:               wallet,
          attestor:            wallet,
          attestation:         attestPda,
          attestorProfile:     attestorPda,
          capabilityNamespace: capNsPda,
          systemProgram:       SystemProgram.programId,
        })
        .rpc();

      const att = await program.account.validationAttestation.fetch(attestPda);
      expect(att.subjectAsset.toBase58()).to.equal(subjectAsset.toBase58());
      expect(att.attestor.toBase58()).to.equal(wallet.toBase58());
      expect(att.expiresAt.toNumber()).to.equal(expiresAt);
      expect(att.revoked).to.equal(false);
      // attestor_signature is the v1 placeholder (zero-bytes).
      expect(Buffer.from(att.attestorSignature).every((b: number) => b === 0)).to.equal(true);

      profile = await program.account.attestorProfile.fetch(attestorPda);
      expect(profile.totalAttestations.toNumber()).to.equal(preAttestations + 1);

      // -- 5. revoke_validation ----------------------------------------------
      const reasonHash = sha256("subject revoked KYC consent");

      await program.methods
        .revokeValidation(
          subjectAsset,
          Array.from(capabilityHash),
          Array.from(reasonHash),
        )
        .accountsStrict({
          attestor:        wallet,
          attestation:     attestPda,
          attestorProfile: attestorPda,
        })
        .rpc();

      const revokedAtt = await program.account.validationAttestation.fetch(attestPda);
      expect(revokedAtt.revoked).to.equal(true);
      expect(revokedAtt.revokedAt.toNumber()).to.be.greaterThan(0);
      expect(Buffer.from(revokedAtt.revocationReasonHash).equals(reasonHash)).to.equal(true);

      profile = await program.account.attestorProfile.fetch(attestorPda);
      expect(profile.totalRevokedByAttestor.toNumber()).to.equal(preRevocations + 1);
    });

    it("re-revoking the same attestation fails with AlreadyRevoked", async () => {
      // Reuse the agent from the previous test? No — fresh setup.
      const namespaceName = "kyc.tier-2";
      const namespaceHash = sha256(namespaceName);
      const nsPda         = deriveNamespacePda(program.programId, namespaceHash);
      const attestorPda   = deriveAttestorPda(program.programId, wallet);

      // Namespace might already exist from a prior test run; tolerate.
      try {
        await program.methods
          .registerNamespace(
            Array.from(namespaceHash), namespaceName, "v1", "ipfs://x",
          )
          .accountsStrict({
            creator: wallet, namespace: nsPda, systemProgram: SystemProgram.programId,
          })
          .rpc();
      } catch (_) { /* already initialised */ }

      const subjectAsset      = Keypair.generate().publicKey;
      const capabilityHash    = sha256(`${namespaceName}:v1:address-verified`);
      const capNsPda          = deriveNamespacePda(program.programId, capabilityHash);
      try {
        await program.methods
          .registerNamespace(
            Array.from(capabilityHash), namespaceName, "v1", "ipfs://x",
          )
          .accountsStrict({
            creator: wallet, namespace: capNsPda, systemProgram: SystemProgram.programId,
          })
          .rpc();
      } catch (_) { /* already initialised */ }

      const claimUriHash     = sha256("uri");
      const claimPayloadHash = sha256("payload");
      const reqPda           = deriveRequestPda(program.programId, subjectAsset, capabilityHash, wallet);
      const attestPda        = deriveAttestationPda(program.programId, subjectAsset, capabilityHash, wallet);
      const slot             = await conn.getSlot();

      await program.methods
        .requestValidation(subjectAsset, Array.from(capabilityHash), Array.from(claimUriHash), new BN(slot + 100_000))
        .accountsStrict({
          requester: wallet, validationRequest: reqPda,
          capabilityNamespace: capNsPda, systemProgram: SystemProgram.programId,
        })
        .rpc();

      await program.methods
        .respondToValidation(
          subjectAsset, Array.from(capabilityHash),
          Array.from(claimPayloadHash), Array.from(claimUriHash), new BN(0),
        )
        .accountsStrict({
          payer: wallet, attestor: wallet, attestation: attestPda,
          attestorProfile: attestorPda, capabilityNamespace: capNsPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // First revoke — succeeds.
      await program.methods
        .revokeValidation(subjectAsset, Array.from(capabilityHash), Array.from(sha256("first")))
        .accountsStrict({ attestor: wallet, attestation: attestPda, attestorProfile: attestorPda })
        .rpc();

      // Second revoke — fails with AlreadyRevoked.
      try {
        await program.methods
          .revokeValidation(subjectAsset, Array.from(capabilityHash), Array.from(sha256("second")))
          .accountsStrict({ attestor: wallet, attestation: attestPda, attestorProfile: attestorPda })
          .rpc();
        expect.fail("expected AlreadyRevoked");
      } catch (e: any) {
        expect(e.error.errorCode.code).to.equal("AlreadyRevoked");
      }
    });
  });

  describe("input validation", () => {
    it("rejects namespace name with ':' delimiter", async () => {
      const badName = "kyc:tier-1";
      const hash    = sha256(badName);
      const pda     = deriveNamespacePda(program.programId, hash);
      try {
        await program.methods
          .registerNamespace(Array.from(hash), badName, "v1", "ipfs://x")
          .accountsStrict({
            creator: wallet, namespace: pda, systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("expected NamespaceColonForbidden");
      } catch (e: any) {
        expect(e.error.errorCode.code).to.equal("NamespaceColonForbidden");
      }
    });

    it("rejects namespace name shorter than 3 chars", async () => {
      const badName = "ab";
      const hash    = sha256(badName);
      const pda     = deriveNamespacePda(program.programId, hash);
      try {
        await program.methods
          .registerNamespace(Array.from(hash), badName, "v1", "ipfs://x")
          .accountsStrict({
            creator: wallet, namespace: pda, systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("expected NameTooShort");
      } catch (e: any) {
        expect(e.error.errorCode.code).to.equal("NameTooShort");
      }
    });

    it("rejects request with deadline in the past", async () => {
      const ns = "audit.smart-contract";
      const nsHash = sha256(ns);
      const nsPda  = deriveNamespacePda(program.programId, nsHash);
      try {
        await program.methods
          .registerNamespace(Array.from(nsHash), ns, "v1", "ipfs://x")
          .accountsStrict({ creator: wallet, namespace: nsPda, systemProgram: SystemProgram.programId })
          .rpc();
      } catch (_) {}

      const subject = Keypair.generate().publicKey;
      const reqPda  = deriveRequestPda(program.programId, subject, nsHash, wallet);

      try {
        await program.methods
          .requestValidation(
            subject, Array.from(nsHash), Array.from(sha256("uri")),
            new BN(0), // 0 < current slot → past
          )
          .accountsStrict({
            requester: wallet, validationRequest: reqPda,
            capabilityNamespace: nsPda, systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("expected DeadlineInPast");
      } catch (e: any) {
        expect(e.error.errorCode.code).to.equal("DeadlineInPast");
      }
    });
  });
});
