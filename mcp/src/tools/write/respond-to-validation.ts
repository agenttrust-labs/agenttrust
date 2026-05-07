/**
 * `agenttrust_respond_to_validation` — an attestor responds to an open
 * `ValidationRequest` by writing a `ValidationAttestation` PDA.
 *
 * Composes via the SDK's `buildRespondToValidationIx` so the same
 * builder the attestor-demo uses runs through the MCP path. The signer
 * must be the attestor (matches `attestor_profile.attestor`).
 *
 * If the attestor profile doesn't exist yet, this tool surfaces a clear
 * error pointing at the planned `register_attestor` flow — the
 * attestor-demo's bootstrap script is the source-of-truth lifecycle.
 */

import { Transaction } from "@solana/web3.js";
import { z } from "zod";

import {
  buildRespondToValidationIx,
  computeCapabilityHash,
  deriveAttestorProfilePda,
  deriveValidationAttestationPda,
  fetchAttestorProfile,
} from "../../chain";
import { explorerUrl } from "../../config";
import { PubkeySchema, parsePubkey, HexHashSchema, hexToBytes, bytesToHex } from "../common";
import type { Tool, ToolContext } from "../types";

const InputSchema = z.object({
  subject_asset:        PubkeySchema,
  capability_name:      z.string().min(3).max(32).optional(),
  capability_hash_hex:  HexHashSchema.optional(),
  claim_payload_hash_hex: HexHashSchema.describe("32-byte hash of the attestor's signed claim payload"),
  claim_uri_hash_hex:   HexHashSchema.describe("32-byte hash of the canonical claim URI"),
  expires_at_slot:      z.union([z.number().int().positive(), z.string().regex(/^\d+$/)])
                          .describe("Attestation expiry slot (0 = never)"),
});
type Input = z.infer<typeof InputSchema>;

interface Output {
  txSignature:           string;
  explorerTxUrl:         string;
  attestationPda:        string;
  attestationExplorer:   string;
  attestorProfilePda:    string;
  capabilityHashHex:     string;
}

export const respondToValidationTool: Tool<Input, Output> = {
  name:        "agenttrust_respond_to_validation",
  description:
    "Attestor responds to a ValidationRequest by creating a " +
    "ValidationAttestation PDA. Requires KEYPAIR_B58 (must equal the " +
    "attestor pubkey registered in AttestorProfile). Surfaces the " +
    "attestation PDA + Explorer URL for downstream PolicyVault " +
    "RequireValidation reads.",
  inputSchema: InputSchema,

  async handler(input: Input, ctx: ToolContext): Promise<Output> {
    const signer  = ctx.chain.requireSigner();
    const subject = parsePubkey(input.subject_asset, "subject_asset");
    if (!input.capability_name && !input.capability_hash_hex) {
      throw new Error("Provide either capability_name or capability_hash_hex.");
    }
    const capHash = input.capability_name
      ? computeCapabilityHash(input.capability_name)
      : hexToBytes(input.capability_hash_hex!);
    if (capHash.length !== 32) throw new Error("capability_hash must be 32 bytes");
    const claimPayloadHash = hexToBytes(input.claim_payload_hash_hex);
    const claimUriHash     = hexToBytes(input.claim_uri_hash_hex);

    const program = await ctx.chain.validationRegistry();

    const profile = await fetchAttestorProfile(program, signer.publicKey);
    if (!profile.data) {
      throw new Error(
        `AttestorProfile not initialised for signer ${signer.publicKey.toBase58()}. ` +
        `Run the attestor-demo bootstrap (or register_attestor instruction) first.`,
      );
    }

    const ix = await buildRespondToValidationIx({
      program,
      payer:            signer.publicKey,
      attestor:         signer.publicKey,
      subjectAsset:     subject,
      capabilityHash:   capHash,
      claimPayloadHash,
      claimUriHash,
      expiresAtSlot:    BigInt(input.expires_at_slot.toString()),
    });

    const tx = new Transaction().add(ix);
    const txSignature = await ctx.chain.provider.sendAndConfirm(tx, [signer]);

    const attestationPda = deriveValidationAttestationPda(
      ctx.chain.cfg.programs.validationRegistry, subject, capHash, signer.publicKey,
    );
    const attestorProfilePda = deriveAttestorProfilePda(
      ctx.chain.cfg.programs.validationRegistry, signer.publicKey,
    );

    return {
      txSignature,
      explorerTxUrl:        explorerUrl(ctx.chain.cfg, "tx",      txSignature),
      attestationPda:       attestationPda.toBase58(),
      attestationExplorer:  explorerUrl(ctx.chain.cfg, "address", attestationPda.toBase58()),
      attestorProfilePda:   attestorProfilePda.toBase58(),
      capabilityHashHex:    bytesToHex(capHash),
    };
  },
};
