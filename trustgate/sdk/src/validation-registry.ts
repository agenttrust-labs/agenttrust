/**
 * `@agenttrust-sdk/trustgate/validation-registry` — SDK client for the
 * AgentTrust ValidationRegistry program (the third leg of the ERC-8004
 * trust stack on Solana).
 *
 * Mirrors the shape of the existing `chain.ts` helpers for the policy_vault
 * and trustgate programs:
 *
 *   - 4 PDA derivers (`CapabilityNamespace`, `AttestorProfile`,
 *     `ValidationRequest`, `ValidationAttestation`)
 *   - 5 instruction builders (one per on-chain ix; each returns an
 *     `Anchor.MethodsBuilder` so callers can `.signers()`/`.rpc()` as they
 *     prefer)
 *   - `loadValidationRegistry` Anchor `Program` loader
 *   - account-fetch helpers that return null on miss (idiomatic for
 *     "is the attestation present?" checks at policy-gate time)
 *
 * On-chain reference:
 *   programs/validation-registry/src/lib.rs — five instructions
 *   programs/validation-registry/src/state/  — four PDAs
 *
 * Deployed on devnet at `Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv`
 * (per `Anchor.toml [programs.devnet]`).
 */

import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Pinned program ID + seed prefixes
// ---------------------------------------------------------------------------

export const VALIDATION_REGISTRY_DEVNET_ID = new PublicKey(
  "Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv",
);

const NAMESPACE_PREFIX   = Buffer.from("capability");
const ATTESTOR_PREFIX    = Buffer.from("attestor");
const REQUEST_PREFIX     = Buffer.from("request");
const ATTESTATION_PREFIX = Buffer.from("attestation");

// ---------------------------------------------------------------------------
// PDA derivers
// ---------------------------------------------------------------------------

/** `CapabilityNamespace` PDA — keyed by `SHA256(name_utf8)`. */
export function deriveCapabilityNamespacePda(
  programId:     PublicKey,
  namespaceHash: Uint8Array,
): PublicKey {
  if (namespaceHash.length !== 32) throw new Error("namespaceHash must be 32 bytes");
  return PublicKey.findProgramAddressSync(
    [NAMESPACE_PREFIX, Buffer.from(namespaceHash)],
    programId,
  )[0];
}

/** `AttestorProfile` PDA — keyed by attestor wallet pubkey. */
export function deriveAttestorProfilePda(
  programId: PublicKey,
  attestor:  PublicKey,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [ATTESTOR_PREFIX, attestor.toBuffer()],
    programId,
  )[0];
}

/** `ValidationRequest` PDA — keyed by (subject, capability, requester). */
export function deriveValidationRequestPda(
  programId:       PublicKey,
  subjectAsset:    PublicKey,
  capabilityHash:  Uint8Array,
  requester:       PublicKey,
): PublicKey {
  if (capabilityHash.length !== 32) throw new Error("capabilityHash must be 32 bytes");
  return PublicKey.findProgramAddressSync(
    [REQUEST_PREFIX, subjectAsset.toBuffer(), Buffer.from(capabilityHash), requester.toBuffer()],
    programId,
  )[0];
}

/** `ValidationAttestation` PDA — keyed by (subject, capability, attestor). */
export function deriveValidationAttestationPda(
  programId:      PublicKey,
  subjectAsset:   PublicKey,
  capabilityHash: Uint8Array,
  attestor:       PublicKey,
): PublicKey {
  if (capabilityHash.length !== 32) throw new Error("capabilityHash must be 32 bytes");
  return PublicKey.findProgramAddressSync(
    [ATTESTATION_PREFIX, subjectAsset.toBuffer(), Buffer.from(capabilityHash), attestor.toBuffer()],
    programId,
  )[0];
}

/**
 * Compute the 32-byte SHA-256 hash a `register_namespace` caller must
 * supply alongside the human-readable name. The on-chain handler does
 * NOT re-hash (anchor-lang 1.0 doesn't re-export `solana_program::hash`);
 * the caller is the source of truth.
 *
 * **Aliasing note (load-bearing):** `computeNamespaceHash` and
 * `computeCapabilityHash` are byte-equivalent. Both compute
 * `SHA256(name_utf8)`. They're exposed under two names because the
 * on-chain instruction surface uses two names — `register_namespace`
 * takes `namespace_hash` and `request_validation` /
 * `respond_to_validation` take `capability_hash` — but **the PDAs they
 * key off resolve to the same address only when the same canonical name
 * goes into both functions**.
 *
 * Concretely: `request_validation` validates that the namespace at
 * `[b"capability", capability_hash]` already exists. If a SERVICE
 * registers under name `"foo"` (namespace_hash = `SHA256("foo")`) but
 * later requests validation for `"foo:v1"`
 * (capability_hash = `SHA256("foo:v1")`), the request fails with
 * `AccountNotInitialized` because the two hashes are different and
 * resolve to different PDAs.
 *
 * **Pass the same canonical name through both functions.** A name like
 * `usdc-payment-policy.v1` (no `:`, since on-chain
 * `register_namespace` rejects colons) is a typical canonical form.
 *
 * @param name 3..=32 char canonical capability name. Must NOT contain
 *             ':' (the on-chain handler rejects it via
 *             `NamespaceColonForbidden`).
 * @returns 32-byte SHA-256 digest of the UTF-8 bytes of `name`.
 */
export function computeNamespaceHash(name: string): Uint8Array {
  return new Uint8Array(createHash("sha256").update(name, "utf-8").digest());
}

/**
 * Compute a 32-byte capability-hash for an arbitrary `capabilityName`
 * string. AgentTrust's PolicyVault `RequireValidation` policy stores
 * this hash; namespaces and attestations reference it by value.
 *
 * **Aliasing note (load-bearing):** `computeCapabilityHash` and
 * `computeNamespaceHash` are byte-equivalent. Both compute
 * `SHA256(name_utf8)`. They're exposed under two names because the
 * on-chain instruction surface uses two names — `register_namespace`
 * takes `namespace_hash` and `request_validation` /
 * `respond_to_validation` take `capability_hash`.
 *
 * **Pass the same canonical name through both** — the registered
 * namespace's PDA at `[b"capability", namespace_hash]` is the same PDA
 * `request_validation` looks up at `[b"capability", capability_hash]`.
 * Different names → different PDAs → request fails with
 * `AccountNotInitialized`.
 *
 * @param capabilityName 3..=32 char canonical capability name. Must
 *                       NOT contain ':' (on-chain
 *                       `NamespaceColonForbidden`).
 * @returns 32-byte SHA-256 digest of the UTF-8 bytes of `capabilityName`.
 */
export function computeCapabilityHash(capabilityName: string): Uint8Array {
  return new Uint8Array(createHash("sha256").update(capabilityName, "utf-8").digest());
}

// ---------------------------------------------------------------------------
// Program loader
// ---------------------------------------------------------------------------

/** Load the validation_registry Anchor `Program`. By default fetches the
 *  IDL from chain (verify any time with
 *  `anchor idl fetch <programId> --provider.cluster <network>`). Pass an
 *  explicit `idl` as a defensive fallback — useful for clients that bundle
 *  a known-good IDL snapshot, want to avoid an extra RPC hop, or are
 *  pointing at a freshly-redeployed program before `anchor idl init` has
 *  run. */
export async function loadValidationRegistry(
  provider:  AnchorProvider,
  programId: PublicKey = VALIDATION_REGISTRY_DEVNET_ID,
  idl?:      import("@coral-xyz/anchor").Idl,
): Promise<Program> {
  if (idl) return new Program(idl, provider);
  const fetched = await Program.fetchIdl(programId, provider);
  if (!fetched) {
    throw new Error(
      `validation_registry IDL not on-chain at ${programId.toBase58()}; ` +
      `pass an explicit idl arg if anchor idl init has not been run`,
    );
  }
  return new Program(fetched, provider);
}

// ---------------------------------------------------------------------------
// Instruction builders — one per on-chain ix
// ---------------------------------------------------------------------------

export interface BuildRegisterNamespaceArgs {
  readonly program:        Program;
  readonly creator:        PublicKey;     // signer
  readonly namespaceHash:  Uint8Array;    // SHA256(name)
  readonly name:           string;        // 3..=32 chars, no ":" delimiter
  readonly version:        string;        // ≤16 chars
  readonly schemaUri:      string;        // ≤160 chars
}

export async function buildRegisterNamespaceIx(
  args: BuildRegisterNamespaceArgs,
): Promise<TransactionInstruction> {
  const namespacePda = deriveCapabilityNamespacePda(args.program.programId, args.namespaceHash);
  return args.program.methods
    .registerNamespace(Array.from(args.namespaceHash), args.name, args.version, args.schemaUri)
    .accounts({
      creator:       args.creator,
      namespace:     namespacePda,
      systemProgram: SystemProgram.programId,
    } as any)
    .instruction();
}

export interface BuildRegisterAttestorArgs {
  readonly program:         Program;
  readonly attestor:        PublicKey;    // signer + payer
  readonly displayNameUri:  string;       // ≤100 chars
}

export async function buildRegisterAttestorIx(
  args: BuildRegisterAttestorArgs,
): Promise<TransactionInstruction> {
  const profilePda = deriveAttestorProfilePda(args.program.programId, args.attestor);
  return args.program.methods
    .registerAttestor(args.displayNameUri)
    .accounts({
      attestor:        args.attestor,
      attestorProfile: profilePda,
      systemProgram:   SystemProgram.programId,
    } as any)
    .instruction();
}

export interface BuildRequestValidationArgs {
  readonly program:          Program;
  readonly requester:        PublicKey;    // signer
  readonly subjectAsset:     PublicKey;    // Quantu agent asset
  readonly capabilityHash:   Uint8Array;   // 32 bytes
  readonly claimUriHash:     Uint8Array;   // 32 bytes
  readonly deadlineSlot:     number | bigint;
}

export async function buildRequestValidationIx(
  args: BuildRequestValidationArgs,
): Promise<TransactionInstruction> {
  if (args.claimUriHash.length !== 32) throw new Error("claimUriHash must be 32 bytes");
  const requestPda  = deriveValidationRequestPda(
    args.program.programId, args.subjectAsset, args.capabilityHash, args.requester,
  );
  const namespacePda = deriveCapabilityNamespacePda(args.program.programId, args.capabilityHash);
  return args.program.methods
    .requestValidation(
      args.subjectAsset,
      Array.from(args.capabilityHash),
      Array.from(args.claimUriHash),
      new BN(args.deadlineSlot.toString()),
    )
    .accounts({
      requester:           args.requester,
      validationRequest:   requestPda,
      capabilityNamespace: namespacePda,
      systemProgram:       SystemProgram.programId,
    } as any)
    .instruction();
}

export interface BuildRespondToValidationArgs {
  readonly program:           Program;
  readonly payer:             PublicKey;     // signer (rent payer)
  readonly attestor:          PublicKey;     // signer
  readonly subjectAsset:      PublicKey;
  readonly capabilityHash:    Uint8Array;
  readonly claimPayloadHash:  Uint8Array;    // 32 bytes
  readonly claimUriHash:      Uint8Array;    // 32 bytes
  readonly expiresAtSlot:     number | bigint;
}

export async function buildRespondToValidationIx(
  args: BuildRespondToValidationArgs,
): Promise<TransactionInstruction> {
  if (args.claimPayloadHash.length !== 32) throw new Error("claimPayloadHash must be 32 bytes");
  if (args.claimUriHash.length !== 32) throw new Error("claimUriHash must be 32 bytes");
  const attestationPda  = deriveValidationAttestationPda(
    args.program.programId, args.subjectAsset, args.capabilityHash, args.attestor,
  );
  const attestorProfile = deriveAttestorProfilePda(args.program.programId, args.attestor);
  const namespacePda    = deriveCapabilityNamespacePda(args.program.programId, args.capabilityHash);
  return args.program.methods
    .respondToValidation(
      args.subjectAsset,
      Array.from(args.capabilityHash),
      Array.from(args.claimPayloadHash),
      Array.from(args.claimUriHash),
      new BN(args.expiresAtSlot.toString()),
    )
    .accounts({
      payer:               args.payer,
      attestor:            args.attestor,
      attestation:         attestationPda,
      attestorProfile,
      capabilityNamespace: namespacePda,
      systemProgram:       SystemProgram.programId,
    } as any)
    .instruction();
}

export interface BuildRevokeValidationArgs {
  readonly program:               Program;
  readonly attestor:              PublicKey;    // signer
  readonly subjectAsset:          PublicKey;
  readonly capabilityHash:        Uint8Array;
  readonly revocationReasonHash:  Uint8Array;   // 32 bytes
}

export async function buildRevokeValidationIx(
  args: BuildRevokeValidationArgs,
): Promise<TransactionInstruction> {
  if (args.revocationReasonHash.length !== 32) throw new Error("revocationReasonHash must be 32 bytes");
  const attestationPda  = deriveValidationAttestationPda(
    args.program.programId, args.subjectAsset, args.capabilityHash, args.attestor,
  );
  const attestorProfile = deriveAttestorProfilePda(args.program.programId, args.attestor);
  return args.program.methods
    .revokeValidation(
      args.subjectAsset,
      Array.from(args.capabilityHash),
      Array.from(args.revocationReasonHash),
    )
    .accounts({
      attestor:        args.attestor,
      attestation:     attestationPda,
      attestorProfile,
    } as any)
    .instruction();
}

// ---------------------------------------------------------------------------
// Account fetchers — return null on miss; preferred over throwing for the
// "is the attestation present?" checks PolicyVault consumers run.
// ---------------------------------------------------------------------------

export async function fetchValidationAttestation(
  program:        Program,
  subjectAsset:   PublicKey,
  capabilityHash: Uint8Array,
  attestor:       PublicKey,
): Promise<{ pda: PublicKey; data: any | null }> {
  const pda = deriveValidationAttestationPda(
    program.programId, subjectAsset, capabilityHash, attestor,
  );
  const data = await (program.account as any).validationAttestation.fetchNullable(pda);
  return { pda, data };
}

export async function fetchValidationRequest(
  program:        Program,
  subjectAsset:   PublicKey,
  capabilityHash: Uint8Array,
  requester:      PublicKey,
): Promise<{ pda: PublicKey; data: any | null }> {
  const pda = deriveValidationRequestPda(
    program.programId, subjectAsset, capabilityHash, requester,
  );
  const data = await (program.account as any).validationRequest.fetchNullable(pda);
  return { pda, data };
}

export async function fetchAttestorProfile(
  program: Program, attestor: PublicKey,
): Promise<{ pda: PublicKey; data: any | null }> {
  const pda = deriveAttestorProfilePda(program.programId, attestor);
  const data = await (program.account as any).attestorProfile.fetchNullable(pda);
  return { pda, data };
}

export async function fetchCapabilityNamespace(
  program: Program, namespaceHash: Uint8Array,
): Promise<{ pda: PublicKey; data: any | null }> {
  const pda = deriveCapabilityNamespacePda(program.programId, namespaceHash);
  const data = await (program.account as any).capabilityNamespace.fetchNullable(pda);
  return { pda, data };
}
