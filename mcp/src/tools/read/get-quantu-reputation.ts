/**
 * `agenttrust_get_quantu_reputation` — read the Quantu atom_stats PDA
 * for an agent and surface the on-chain reputation tier + risk fields.
 *
 * Quantu's atom_stats account isn't in our IDL — we fetch raw account
 * bytes and decode the byte-offset surface PolicyVault's CounterpartyTier
 * policy reads at gate time. Source-of-truth offsets live in
 * `programs/policy-vault/src/ext/atom_engine.rs:21-27` and are mirrored
 * verbatim here. If Quantu changes the layout the schema-version canary
 * at byte 560 catches it and the tool returns a clean error rather than
 * bogus values.
 *
 * Tier semantics:
 *
 *   - `tierImmediate` is the v1 fast-path tier — settled within the
 *     same `give_feedback` tx that bumped the score. Used by the
 *     CounterpartyTier policy in v1 demo mode.
 *   - `tierConfirmed` is the post-vesting tier — only counted once the
 *     vesting window elapses. Production-mode policies prefer this.
 *
 * Phase P found the previous implementation read fabricated offsets
 * (40 / 41 / 49 / 50 / 51 instead of 549 / 551 / 555 / 557) which
 * returned `tier: 164` for an actually-tier-0 agent. 0.2.6 corrects
 * this and adds the schema-version canary the on-chain parser uses.
 */

import { z } from "zod";

import { deriveAtomStatsPda } from "../../chain";
import { explorerUrl } from "../../config";
import { PubkeySchema, parsePubkey } from "../common";
import type { Tool, ToolContext } from "../types";

const InputSchema = z.object({
  agent_asset: PubkeySchema.describe("Quantu agent asset pubkey"),
});
type Input = z.infer<typeof InputSchema>;

interface Output {
  pda:           string;
  explorerUrl:   string;
  exists:        boolean;
  /** Owner program — must equal Quantu atom_engine for the policy gate to honour it. */
  ownerProgram:  string | null;
  ownerExpected: string;
  ownerMatches:  boolean;
  rawByteLen:    number;
  /** Set when the schema-version canary fails or the account is undersized. */
  error?:        string;
  reputation?: {
    /** v1 fast-path tier (0..=4). The CounterpartyTier policy reads
     *  this in v1 demo mode. */
    tierImmediate: number;
    /** Post-vesting confirmed tier (0..=4). Production policies prefer
     *  this once vesting windows are configured. */
    tierConfirmed: number;
    /** 0..=255 — lower is better. */
    riskScore:     number;
    /** Confidence in the reputation reading, basis points (0..=10_000)
     *  per Quantu's atom_engine spec; carried as a u16 here. */
    confidence:    number;
    /** Schema version (always 1 in v1 — checked as a canary). */
    schemaVersion: number;
  };
}

// ---------------------------------------------------------------------------
// Byte-offset surface — MUST mirror programs/policy-vault/src/ext/atom_engine.rs
//   ATOM_STATS_SIZE                       = 561
//   ATOM_STATS_RISK_SCORE_OFFSET          = 549
//   ATOM_STATS_TRUST_TIER_OFFSET          = 551  (immediate)
//   ATOM_STATS_TIER_CONFIRMED_OFFSET      = 555
//   ATOM_STATS_CONFIDENCE_OFFSET          = 557  (u16 LE, bytes 557..559)
//   ATOM_STATS_SCHEMA_VERSION_OFFSET      = 560
//   ATOM_STATS_SCHEMA_VERSION_EXPECTED    = 1
//   ATOM_TIER_MAX                         = 4
// ---------------------------------------------------------------------------
export const ATOM_STATS_SIZE                    = 561;
export const ATOM_STATS_RISK_SCORE_OFFSET       = 549;
export const ATOM_STATS_TIER_IMMEDIATE_OFFSET   = 551;
export const ATOM_STATS_TIER_CONFIRMED_OFFSET   = 555;
export const ATOM_STATS_CONFIDENCE_OFFSET       = 557;
export const ATOM_STATS_SCHEMA_VERSION_OFFSET   = 560;
export const ATOM_STATS_SCHEMA_VERSION_EXPECTED = 1;
export const ATOM_TIER_MAX                      = 4;

/** Pure-fn bytes → reputation. Returns `{ error }` when the buffer fails any
 *  canary (size, schema_version, tier-range). Mirrors the on-chain parser's
 *  fail-loud semantics — caller surfaces the error. */
export function decodeAtomStatsBytes(
  data: Buffer | Uint8Array,
): NonNullable<Output["reputation"]> | { error: string } {
  if (data.length !== ATOM_STATS_SIZE) {
    return { error: `account size ${data.length} != expected ${ATOM_STATS_SIZE}` };
  }
  const buf = data instanceof Buffer ? data : Buffer.from(data);
  const schemaVersion = buf.readUInt8(ATOM_STATS_SCHEMA_VERSION_OFFSET);
  if (schemaVersion !== ATOM_STATS_SCHEMA_VERSION_EXPECTED) {
    return { error: `schema_version ${schemaVersion} != expected ${ATOM_STATS_SCHEMA_VERSION_EXPECTED}` };
  }
  const tierImmediate = buf.readUInt8(ATOM_STATS_TIER_IMMEDIATE_OFFSET);
  const tierConfirmed = buf.readUInt8(ATOM_STATS_TIER_CONFIRMED_OFFSET);
  const riskScore     = buf.readUInt8(ATOM_STATS_RISK_SCORE_OFFSET);
  const confidence    = buf.readUInt16LE(ATOM_STATS_CONFIDENCE_OFFSET);
  if (tierImmediate > ATOM_TIER_MAX) {
    return { error: `tier_immediate ${tierImmediate} > ATOM_TIER_MAX ${ATOM_TIER_MAX}` };
  }
  if (tierConfirmed > ATOM_TIER_MAX) {
    return { error: `tier_confirmed ${tierConfirmed} > ATOM_TIER_MAX ${ATOM_TIER_MAX}` };
  }
  return { tierImmediate, tierConfirmed, riskScore, confidence, schemaVersion };
}

export const getQuantuReputationTool: Tool<Input, Output> = {
  name:        "agenttrust_get_quantu_reputation",
  description:
    "Read the Quantu atom_stats PDA for an agent and decode the on-chain " +
    "reputation. Returns tierImmediate (v1 fast-path tier, 0..=4) and " +
    "tierConfirmed (post-vesting tier — production policies prefer this), " +
    "plus riskScore (0..=255, lower is better), confidence (0..=10_000 " +
    "basis points), and schemaVersion (canary, always 1 in v1). Same " +
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

    const decoded = decodeAtomStatsBytes(accountInfo.data);
    if ("error" in decoded) {
      out.error = `atom_stats decode failed: ${decoded.error}`;
      return out;
    }
    out.reputation = decoded;
    return out;
  },
};
