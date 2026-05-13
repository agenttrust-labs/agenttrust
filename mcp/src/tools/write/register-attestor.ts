/**
 * `agenttrust_register_attestor` — bootstrap an `AttestorProfile` PDA for
 * the signer so they can respond to validation requests.
 *
 * Composes via `buildRegisterAttestorIx` in the SDK so the on-chain
 * account list + arg encoding stays the canonical source of truth.
 *
 * Idempotent: if the profile already exists for the signer, this tool
 * returns the on-chain state without sending a transaction. The existing
 * account is the source of truth (the on-chain `init` constraint forbids
 * re-init regardless).
 *
 * The 0.4.0 design decision keeps attestor registration as its own
 * explicit MCP tool (rather than folding it into `respond_to_validation`)
 * because registering an attestor is a trust posture, not a precondition
 * to a single attestation. Callers should register only if the signer
 * intends to act as an attestor for one or more namespaces.
 */

import { Transaction } from "@solana/web3.js";
import { z } from "zod";

import {
  buildRegisterAttestorIx,
  deriveAttestorProfilePda,
  fetchAttestorProfile,
} from "../../chain";
import { explorerUrl } from "../../config";
import type { Tool, ToolContext } from "../types";

const InputSchema = z.object({
  metadata_uri: z.string().max(100).default("")
                  .describe(
                    "Optional off-chain JSON pointer describing the attestor (<=100 chars). " +
                    "Stored on-chain as display_name_uri. Empty string disables the pointer.",
                  ),
});
type Input = z.infer<typeof InputSchema>;

interface Output {
  txSignature:       string | null;
  explorerTxUrl:     string | null;
  attestorPda:       string;
  attestorExplorer:  string;
  owner:             string;
  metadataUri:       string;
  alreadyRegistered: boolean;
}

export const registerAttestorTool: Tool<Input, Output> = {
  name:        "agenttrust_register_attestor",
  description:
    "Register the signer as an attestor in the validation registry. Required before " +
    "calling agenttrust_respond_to_validation. This is a trust posture, not a " +
    "precondition. Register only if the signer intends to act as an attestor for one " +
    "or more namespaces. Idempotent: returns the existing profile if already registered. " +
    "Requires a signer (KEYPAIR_B58 / KEYPAIR_PATH / Solana CLI default).",
  inputSchema: InputSchema,

  async handler(input: Input, ctx: ToolContext): Promise<Output> {
    const signer  = ctx.chain.requireSigner();
    const program = await ctx.chain.validationRegistry();

    const attestorPda = deriveAttestorProfilePda(
      ctx.chain.cfg.programs.validationRegistry, signer.publicKey,
    );

    // Idempotency: if the profile already exists, return its on-chain
    // state and skip the init. The existing account is the source of truth.
    const existing = await fetchAttestorProfile(program, signer.publicKey);
    if (existing.data) {
      return {
        txSignature:       null,
        explorerTxUrl:     null,
        attestorPda:       attestorPda.toBase58(),
        attestorExplorer:  explorerUrl(ctx.chain.cfg, "address", attestorPda.toBase58()),
        owner:             existing.data.attestor?.toBase58?.() ?? signer.publicKey.toBase58(),
        metadataUri:       String(existing.data.displayNameUri ?? existing.data.display_name_uri ?? ""),
        alreadyRegistered: true,
      };
    }

    const ix = await buildRegisterAttestorIx({
      program,
      attestor:       signer.publicKey,
      displayNameUri: input.metadata_uri,
    });

    const tx = new Transaction().add(ix);
    const txSignature = await ctx.chain.provider.sendAndConfirm(tx, [signer]);

    return {
      txSignature,
      explorerTxUrl:     explorerUrl(ctx.chain.cfg, "tx",      txSignature),
      attestorPda:       attestorPda.toBase58(),
      attestorExplorer:  explorerUrl(ctx.chain.cfg, "address", attestorPda.toBase58()),
      owner:             signer.publicKey.toBase58(),
      metadataUri:       input.metadata_uri,
      alreadyRegistered: false,
    };
  },
};
