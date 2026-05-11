/**
 * `agenttrust_emit_feedback` — facilitator-only `emit_feedback` CPI.
 *
 * Composes the trustgate.emitFeedback call directly from the MCP tool
 * input. Requires KEYPAIR_B58 to equal the facilitator pubkey
 * (TrustGate enforces `require_keys_eq(payer, facilitator)`). The CPI
 * threads Quantu accounts through `remaining_accounts` per the
 * documented order; the SDK's `deriveQuantuFeedbackAccounts` helper
 * builds them.
 *
 * The signer of this tool MUST also be the facilitator whose
 * `TrustGateAuthority` PDA is being credited.
 */

import { BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { z } from "zod";

import {
  deriveFeedbackLogPda,
  deriveTrustGateAuthorityPda,
  deriveAgentAccountPda,
  deriveAtomConfigPda,
  deriveAtomStatsPda,
  deriveAtomRegistryAuthorityPda,
} from "@agenttrust-sdk/trustgate";

import { explorerUrl } from "../../config";
import { PubkeySchema, parsePubkey, HexHashSchema, hexToBytes } from "../common";
import type { Tool, ToolContext } from "../types";

const InputSchema = z.object({
  payment_id_hash_hex: HexHashSchema.describe("32-byte SHA-256 of the payment_id"),
  payee_asset:         PubkeySchema.describe("Quantu agent asset receiving feedback"),
  base_collection:     PubkeySchema.describe(
    "Metaplex Core collection that owns the agent assets. For demo runs use " +
    "agenttrust_demo_state.programs.base_collection. For production " +
    "integrations, use your Quantu agent registry's collection address — " +
    "typically the value passed to agent_registry::register_agent when the " +
    "agent was minted.",
  ),
  score:               z.number().int().min(0).max(100),
  // `value` + `value_decimals` are forwarded to Quantu's give_feedback so
  // `quality_score` can accrue (otherwise tier_immediate stays pinned at 0).
  // Default of 1_000_000 @ 6 decimals = $1 USDC equivalent, a sensible
  // representative value when the caller doesn't have the real amount handy.
  value:               z.union([z.string(), z.number()]).default("1000000").describe(
    "Raw payment amount in base token units (u64). Forwarded to Quantu's " +
    "give_feedback for quality_score accrual. Defaults to 1_000_000 ($1 USDC).",
  ),
  value_decimals:      z.number().int().min(0).max(18).default(6).describe(
    "Decimal exponent of the mint backing `value`. Defaults to 6 (USDC).",
  ),
  tag1:                z.string().max(32).default(""),
  tag2:                z.string().max(32).default(""),
  endpoint:            z.string().max(64).default(""),
  feedback_uri:        z.string().max(256).default(""),
  atom_enabled:        z.boolean().default(true).describe("Whether the agent's atom_enabled flag is set on-chain (drives the optional ATOM 4-tuple)"),
});
type Input = z.infer<typeof InputSchema>;

interface Output {
  txSignature:        string;
  explorerTxUrl:      string;
  feedbackLogPda:     string;
  feedbackLogExplorer: string;
}

export const emitFeedbackTool: Tool<Input, Output> = {
  name:        "agenttrust_emit_feedback",
  description:
    "Emit ERC-8004 feedback for a confirmed payment. Facilitator-only: " +
    "KEYPAIR_B58 must equal the facilitator wallet whose TrustGateAuthority " +
    "PDA is being signed. Threads Quantu agent_account/atom_stats accounts " +
    "through remaining_accounts. Idempotent on payment_id_hash.",
  inputSchema: InputSchema,

  async handler(input: Input, ctx: ToolContext): Promise<Output> {
    const facilitator = ctx.chain.requireSigner();
    const trustgate   = await ctx.chain.trustgate();

    const paymentIdHash = hexToBytes(input.payment_id_hash_hex);
    if (paymentIdHash.length !== 32) throw new Error("payment_id_hash must decode to 32 bytes");

    const payeeAsset    = parsePubkey(input.payee_asset, "payee_asset");
    const baseCollection = parsePubkey(input.base_collection, "base_collection");

    const authorityPda = deriveTrustGateAuthorityPda(
      ctx.chain.cfg.programs.trustGate, facilitator.publicKey,
    );
    const emissionLogPda = deriveFeedbackLogPda(
      ctx.chain.cfg.programs.trustGate, Buffer.from(paymentIdHash),
    );
    const agentAccount = deriveAgentAccountPda(ctx.chain.cfg.quantu, payeeAsset);

    // remaining_accounts order documented in
    // programs/trustgate/src/ext/agent_registry.rs::GiveFeedback:
    //   0 agent_account, 1 asset, 2 collection, 3 system_program
    //   4..7 optional ATOM 4-tuple
    const remaining = [
      { pubkey: agentAccount,                                        isSigner: false, isWritable: true  },
      { pubkey: payeeAsset,                                          isSigner: false, isWritable: false },
      { pubkey: baseCollection,                                      isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId,                             isSigner: false, isWritable: false },
    ];
    if (input.atom_enabled) {
      remaining.push(
        { pubkey: deriveAtomConfigPda(ctx.chain.cfg.quantu),         isSigner: false, isWritable: false },
        { pubkey: deriveAtomStatsPda(ctx.chain.cfg.quantu, payeeAsset), isSigner: false, isWritable: true  },
        { pubkey: ctx.chain.cfg.quantu.atomEngine,                   isSigner: false, isWritable: false },
        { pubkey: deriveAtomRegistryAuthorityPda(ctx.chain.cfg.quantu), isSigner: false, isWritable: false },
      );
    }

    // Forward `value` + `value_decimals` so Quantu's give_feedback can
    // accrue quality_score (drives tier_immediate promotion).
    const valueBn = new BN(typeof input.value === "string" ? input.value : input.value.toString());
    const txSignature: string = await trustgate.methods
      .emitFeedback(
        Array.from(paymentIdHash),
        facilitator.publicKey,
        payeeAsset,
        input.score,
        valueBn,
        input.value_decimals,
        input.tag1,
        input.tag2,
        input.endpoint,
        input.feedback_uri,
      )
      .accounts({
        payer:         facilitator.publicKey,
        authority:     authorityPda,
        emissionLog:   emissionLogPda,
        systemProgram: SystemProgram.programId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .remainingAccounts(remaining)
      .rpc();

    return {
      txSignature,
      explorerTxUrl:       explorerUrl(ctx.chain.cfg, "tx",      txSignature),
      feedbackLogPda:      emissionLogPda.toBase58(),
      feedbackLogExplorer: explorerUrl(ctx.chain.cfg, "address", emissionLogPda.toBase58()),
    };
  },
};
