/**
 * `agenttrust_request_validation` — open a ValidationRequest PDA,
 * inviting attestors to attest to `(subject_asset, capability_hash)`
 * by `deadline_slot`.
 *
 * Composes via `buildRequestValidationIx` in the SDK so the on-chain
 * account list + arg encoding stays the canonical source of truth.
 */

import { Transaction } from "@solana/web3.js";
import { z } from "zod";

import {
  buildRequestValidationIx,
  computeCapabilityHash,
  deriveValidationRequestPda,
} from "../../chain";
import { explorerUrl } from "../../config";
import { PubkeySchema, parsePubkey, HexHashSchema, hexToBytes, bytesToHex } from "../common";
import type { Tool, ToolContext } from "../types";

const InputSchema = z.object({
  subject_asset:        PubkeySchema.describe("Quantu agent asset whose capability is being attested"),
  capability_name:      z.string().min(3).max(32).optional()
                          .describe("Canonical capability name (3..=32 chars, no ':'); preferred over hex"),
  capability_hash_hex:  HexHashSchema.optional()
                          .describe("Direct 32-byte capability hash (hex); use only if you already have the digest"),
  claim_uri_hash_hex:   HexHashSchema.describe("32-byte hash of the off-chain claim URI"),
  deadline_slot:        z.union([z.number().int().positive(), z.string().regex(/^\d+$/)])
                          .describe("Slot by which an attestor must respond"),
});
type Input = z.infer<typeof InputSchema>;

interface Output {
  txSignature:        string;
  explorerTxUrl:      string;
  requestPda:         string;
  requestExplorer:    string;
  capabilityHashHex:  string;
}

export const requestValidationTool: Tool<Input, Output> = {
  name:        "agenttrust_request_validation",
  description:
    "Open a ValidationRequest PDA inviting attestors to attest to a " +
    "subject's capability. Pass either capability_name (preferred — the SDK " +
    "computes SHA256(name) and stamps it as the hash) or capability_hash_hex " +
    "directly. Requires a signer (KEYPAIR_B58 / KEYPAIR_PATH / Solana CLI " +
    "default). Returns the request PDA's Explorer URL.",
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
    const claimHash = hexToBytes(input.claim_uri_hash_hex);
    if (claimHash.length !== 32) throw new Error("claim_uri_hash must decode to 32 bytes");

    const program = await ctx.chain.validationRegistry();
    const ix = await buildRequestValidationIx({
      program,
      requester:      signer.publicKey,
      subjectAsset:   subject,
      capabilityHash: capHash,
      claimUriHash:   claimHash,
      deadlineSlot:   BigInt(input.deadline_slot.toString()),
    });

    const tx = new Transaction().add(ix);
    const txSignature = await ctx.chain.provider.sendAndConfirm(tx, [signer]);
    const requestPda = deriveValidationRequestPda(
      ctx.chain.cfg.programs.validationRegistry, subject, capHash, signer.publicKey,
    );

    return {
      txSignature,
      explorerTxUrl:     explorerUrl(ctx.chain.cfg, "tx",      txSignature),
      requestPda:        requestPda.toBase58(),
      requestExplorer:   explorerUrl(ctx.chain.cfg, "address", requestPda.toBase58()),
      capabilityHashHex: bytesToHex(capHash),
    };
  },
};
