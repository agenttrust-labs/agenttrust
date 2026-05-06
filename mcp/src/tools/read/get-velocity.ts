/**
 * `agenttrust_get_velocity` — fetch the VelocityLedger PDA for
 * (agent, policy_id). Returns the current sliding-window cumulative
 * spend, last commit slot, and window start slot.
 */

import { z } from "zod";

import { deriveVelocityPda } from "../../chain";
import { explorerUrl } from "../../config";
import { PubkeySchema, parsePubkey, toDecString } from "../common";
import type { Tool, ToolContext } from "../types";

const InputSchema = z.object({
  agent_asset: PubkeySchema.describe("Quantu agent asset"),
  policy_id:   z.number().int().min(0).max(0xffffffff).describe("u32 policy ID"),
});
type Input = z.infer<typeof InputSchema>;

interface Output {
  pda:                string;
  explorerUrl:        string;
  exists:             boolean;
  ledger?: {
    cumulativeAmount: string;
    lastCommitSlot:   string;
    windowStartSlot:  string;
    policyId:         number;
  };
}

export const getVelocityTool: Tool<Input, Output> = {
  name:        "agenttrust_get_velocity",
  description:
    "Fetch the VelocityLedger PDA for (agent, policy_id). Returns the " +
    "cumulative-spend counter, last commit slot, and the slot the current " +
    "window opened. Compare against the policy's velocity_max_in_window to " +
    "see how much budget remains in the window.",
  inputSchema: InputSchema,

  async handler(input: Input, ctx: ToolContext): Promise<Output> {
    const agent = parsePubkey(input.agent_asset, "agent_asset");
    const pda   = deriveVelocityPda(ctx.chain.cfg.programs.policyVault, agent, input.policy_id);
    const policy = await ctx.chain.policyVault();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await (policy.account as any).velocityLedger.fetchNullable(pda);
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
      ledger: {
        cumulativeAmount: toDecString(data.cumulativeAmount),
        lastCommitSlot:   toDecString(data.lastCommitSlot),
        windowStartSlot:  toDecString(data.windowStartSlot),
        policyId:         Number(data.policyId ?? input.policy_id),
      },
    };
  },
};
