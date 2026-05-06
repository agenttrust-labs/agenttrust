/**
 * `agenttrust_get_quantu_reputation` — read the Quantu atom_stats PDA
 * for an agent and surface the on-chain reputation tier + counts.
 *
 * Quantu's atom_stats account isn't in our IDL — we fetch raw account
 * bytes and decode the byte-offset surface PolicyVault's AtomStats
 * parser uses (`programs/policy-vault/src/ext/atom_stats.rs`). The
 * exact offsets are pinned there; this tool mirrors them so what the
 * gate sees is what the tool reports.
 */

import { z } from "zod";

import { deriveAtomStatsPda } from "../../chain";
import { explorerUrl } from "../../config";
import { PubkeySchema, parsePubkey, toDecString } from "../common";
import type { Tool, ToolContext } from "../types";

const InputSchema = z.object({
  agent_asset: PubkeySchema.describe("Quantu agent asset pubkey"),
});
type Input = z.infer<typeof InputSchema>;

interface Output {
  pda:                  string;
  explorerUrl:          string;
  exists:               boolean;
  /** Owner program — must equal Quantu atom_engine for the policy gate to honour it. */
  ownerProgram:         string | null;
  ownerExpected:        string;
  ownerMatches:         boolean;
  reputation?: {
    tier:               number;        // 0..3 (PolicyVault's CounterpartyTier)
    feedbackCount:      string;        // total give_feedback CPIs hitting this asset
    averageScore:       number | null; // 0..100 if present, else null
    riskScore:          number | null; // 0..255 if present, else null
    confidence:         number | null; // 0..10000 (basis points) if present
  };
  rawByteLen:           number;
}

// PolicyVault's AtomStats byte-offset surface (mirrors
// programs/policy-vault/src/ext/atom_stats.rs constants). We re-derive
// here rather than import to keep the MCP package free of the on-chain
// crate dep.
const AS_TIER_OFFSET            = 8 + 32;       // post-discriminator + asset
const AS_FEEDBACK_COUNT_OFFSET  = AS_TIER_OFFSET + 1;
const AS_AVERAGE_SCORE_OFFSET   = AS_FEEDBACK_COUNT_OFFSET + 8;
const AS_RISK_SCORE_OFFSET      = AS_AVERAGE_SCORE_OFFSET + 1;
const AS_CONFIDENCE_OFFSET      = AS_RISK_SCORE_OFFSET + 1;

export const getQuantuReputationTool: Tool<Input, Output> = {
  name:        "agenttrust_get_quantu_reputation",
  description:
    "Read the Quantu atom_stats PDA for an agent and decode tier (0..3), " +
    "feedback count, average score, risk score, and confidence. The same " +
    "values PolicyVault's CounterpartyTier policy reads at gate time.",
  inputSchema: InputSchema,

  async handler(input: Input, ctx: ToolContext): Promise<Output> {
    const agent       = parsePubkey(input.agent_asset, "agent_asset");
    const atomEngine  = ctx.chain.cfg.quantu.atomEngine;
    const pda         = deriveAtomStatsPda(ctx.chain.cfg.quantu, agent);
    const accountInfo = await ctx.chain.connection.getAccountInfo(pda, "confirmed");

    const out: Output = {
      pda:           pda.toBase58(),
      explorerUrl:   explorerUrl(ctx.chain.cfg, "address", pda.toBase58()),
      exists:        !!accountInfo,
      ownerProgram:  accountInfo?.owner.toBase58() ?? null,
      ownerExpected: atomEngine.toBase58(),
      ownerMatches:  accountInfo ? accountInfo.owner.equals(atomEngine) : false,
      rawByteLen:    accountInfo?.data.length ?? 0,
    };

    if (!accountInfo) return out;

    const data = accountInfo.data;
    if (data.length < AS_CONFIDENCE_OFFSET + 2) return out;

    out.reputation = {
      tier:           data.readUInt8(AS_TIER_OFFSET),
      feedbackCount:  toDecString(data.readBigUInt64LE(AS_FEEDBACK_COUNT_OFFSET)),
      averageScore:   data.readUInt8(AS_AVERAGE_SCORE_OFFSET),
      riskScore:      data.readUInt8(AS_RISK_SCORE_OFFSET),
      confidence:     data.readUInt16LE(AS_CONFIDENCE_OFFSET),
    };
    return out;
  },
};
