/**
 * `agenttrust_list_policies` — enumerate every PolicyAccount registered
 * for `agent_asset`.
 *
 * Implementation: getProgramAccounts with a memcmp filter at offset 8
 * (the `payer_agent_asset` field — see `state/policy_account.rs:12`).
 * Returns `{ policyId, pda, enabledKindsBitmask, gateMode }` per match
 * — the lightweight summary view; clients call `agenttrust_get_policy`
 * for the full decode.
 */

import { z } from "zod";

import { explorerUrl } from "../../config";
import { PubkeySchema, parsePubkey } from "../common";
import type { Tool, ToolContext } from "../types";

const InputSchema = z.object({
  agent_asset: PubkeySchema.describe("Quantu agent asset pubkey to enumerate policies for"),
});
type Input = z.infer<typeof InputSchema>;

interface PolicySummary {
  policyId:            number;
  pda:                 string;
  explorerUrl:         string;
  enabledKindsBitmask: number;
  gateMode:            number;
}

interface Output {
  agentAsset: string;
  policies:   PolicySummary[];
}

// Anchor `#[account]` discriminator + field layout — payer_agent_asset is
// the first non-discriminator field, at offset 8.
const POLICY_FILTER_AGENT_OFFSET = 8;

export const listPoliciesTool: Tool<Input, Output> = {
  name:        "agenttrust_list_policies",
  description:
    "List every PolicyAccount registered on-chain for the given agent_asset. " +
    "Returns a lightweight summary (policy ID, bitmask of enabled policy kinds, " +
    "gate mode). Use agenttrust_get_policy for the full decoded PolicyAccount.",
  inputSchema: InputSchema,

  async handler(input: Input, ctx: ToolContext): Promise<Output> {
    const agent       = parsePubkey(input.agent_asset, "agent_asset");
    const policyVault = await ctx.chain.policyVault();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accounts = await (policyVault.account as any).policyAccount.all([
      { memcmp: { offset: POLICY_FILTER_AGENT_OFFSET, bytes: agent.toBase58() } },
    ]);
    const policies: PolicySummary[] = accounts.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (entry: any) => ({
        policyId:            Number(entry.account.policyId ?? 0),
        pda:                 entry.publicKey.toBase58(),
        explorerUrl:         explorerUrl(ctx.chain.cfg, "address", entry.publicKey.toBase58()),
        enabledKindsBitmask: Number(entry.account.enabledKindsBitmask ?? 0),
        gateMode:            Number(entry.account.gateMode ?? 0),
      }),
    );
    policies.sort((a, b) => a.policyId - b.policyId);
    return { agentAsset: agent.toBase58(), policies };
  },
};
