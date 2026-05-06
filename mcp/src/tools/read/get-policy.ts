/**
 * `agenttrust_get_policy` — fetch a single PolicyAccount and return its
 * decoded fields (counters + bitmasks + tier thresholds).
 *
 * Reads the PolicyAccount PDA derived from `(agent_asset, policy_id)`.
 * Returns `{ exists: false, pda }` if the account is not initialized,
 * which is the common case for an agent that hasn't called `init_policy`.
 */

import { z } from "zod";

import { derivePolicyPda } from "../../chain";
import { explorerUrl } from "../../config";
import { PubkeySchema, parsePubkey, pubkeyOrNull, toDecString, bytesToHex } from "../common";
import type { Tool, ToolContext } from "../types";

const InputSchema = z.object({
  agent_asset: PubkeySchema.describe("Quantu agent asset pubkey (base58)"),
  policy_id:   z.number().int().min(0).max(0xffffffff).describe("u32 per-agent policy ID"),
});
type Input = z.infer<typeof InputSchema>;

interface DecodedPolicy {
  pda:                          string;
  explorerUrl:                  string;
  exists:                       boolean;
  fields?: {
    payerAgentAsset:            string;
    policyId:                   number;
    enabledKindsBitmask:        number;
    gateMode:                   number;
    spendingPerTxMax:           string;
    spendingDailyMax:           string;
    spendingWeeklyMax:          string;
    spendingTodayUsed:          string;
    spendingWeekUsed:           string;
    spendingTodayAnchor:        string;
    spendingWeekAnchor:         string;
    velocityWindowSecs:         string;
    velocityMaxInWindow:        string;
    velocityTier0DecayFactor:   string;
    minCounterpartyTier:        number;
    maxRiskScore:               number;
    minConfidence:              number;
    defaultUnratedTreatment:    number;
    requiredCapabilityHashHex:  string;
    acceptedAttestors:          (string | null)[];
    scopeKind:                  number;
  };
}

export const getPolicyTool: Tool<Input, DecodedPolicy> = {
  name:        "agenttrust_get_policy",
  description:
    "Fetch the PolicyAccount on-chain for (agent_asset, policy_id). Returns " +
    "decoded fields: spending caps, velocity window, counterparty-tier " +
    "thresholds, RequireValidation capability hash, accepted attestors, and " +
    "live counters (today/week spend used). exists=false when the policy has " +
    "never been initialized.",
  inputSchema: InputSchema,

  async handler(input: Input, ctx: ToolContext): Promise<DecodedPolicy> {
    const agent  = parsePubkey(input.agent_asset, "agent_asset");
    const pda    = derivePolicyPda(ctx.chain.cfg.programs.policyVault, agent, input.policy_id);
    const policy = await ctx.chain.policyVault();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await (policy.account as any).policyAccount.fetchNullable(pda);
    if (!data) {
      return {
        pda:         pda.toBase58(),
        explorerUrl: explorerUrl(ctx.chain.cfg, "address", pda.toBase58()),
        exists:      false,
      };
    }
    return {
      pda:         pda.toBase58(),
      explorerUrl: explorerUrl(ctx.chain.cfg, "address", pda.toBase58()),
      exists:      true,
      fields: {
        payerAgentAsset:           pubkeyOrNull(data.payerAgentAsset) ?? "",
        policyId:                  Number(data.policyId),
        enabledKindsBitmask:       Number(data.enabledKindsBitmask),
        gateMode:                  Number(data.gateMode),
        spendingPerTxMax:          toDecString(data.spendingPerTxMax),
        spendingDailyMax:          toDecString(data.spendingDailyMax),
        spendingWeeklyMax:         toDecString(data.spendingWeeklyMax),
        spendingTodayUsed:         toDecString(data.spendingTodayUsed),
        spendingWeekUsed:          toDecString(data.spendingWeekUsed),
        spendingTodayAnchor:       toDecString(data.spendingTodayAnchor),
        spendingWeekAnchor:        toDecString(data.spendingWeekAnchor),
        velocityWindowSecs:        toDecString(data.velocityWindowSecs),
        velocityMaxInWindow:       toDecString(data.velocityMaxInWindow),
        velocityTier0DecayFactor:  toDecString(data.velocityTier0DecayFactor),
        minCounterpartyTier:       Number(data.minCounterpartyTier),
        maxRiskScore:              Number(data.maxRiskScore),
        minConfidence:             Number(data.minConfidence),
        defaultUnratedTreatment:   Number(data.defaultUnratedTreatment),
        requiredCapabilityHashHex: bytesToHex(data.requiredCapabilityHash ?? []),
        acceptedAttestors:         (data.acceptedAttestors ?? []).map(pubkeyOrNull),
        scopeKind:                 Number(data.scopeKind ?? 0),
      },
    };
  },
};
