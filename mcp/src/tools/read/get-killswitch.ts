/**
 * `agenttrust_get_killswitch` — fetch the per-agent KillSwitchState plus
 * the PolicyAuthority (multisig members + threshold) that gates pause
 * mutations.
 */

import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

import { deriveKillSwitchPda } from "../../chain";
import { explorerUrl } from "../../config";
import { PubkeySchema, parsePubkey, pubkeyOrNull, toDecString, bytesToHex } from "../common";
import type { Tool, ToolContext } from "../types";

const InputSchema = z.object({
  agent_asset: PubkeySchema.describe("Quantu agent asset"),
});
type Input = z.infer<typeof InputSchema>;

const POLICY_AUTHORITY_PREFIX = Buffer.from("policy_authority");

interface Output {
  killSwitchPda:        string;
  killSwitchExplorer:   string;
  killSwitchExists:     boolean;
  killSwitch?: {
    paused:             boolean;
    scopeKind:          number;
    scopeKeyHex:        string;
    pausedAtSlot:       string;
    unpausedAtSlot:     string;
    pausedBy:           string | null;
  };
  authorityPda:         string;
  authorityExplorer:    string;
  authorityExists:      boolean;
  authority?: {
    threshold:          number;
    memberCount:        number;
    members:            (string | null)[];
  };
}

export const getKillswitchTool: Tool<Input, Output> = {
  name:        "agenttrust_get_killswitch",
  description:
    "Read the per-agent KillSwitchState (paused / unpaused, slot timestamps, " +
    "who pressed it) and the PolicyAuthority that controls the multisig " +
    "(members + threshold). Both PDAs are derived from the agent_asset.",
  inputSchema: InputSchema,

  async handler(input: Input, ctx: ToolContext): Promise<Output> {
    const agent = parsePubkey(input.agent_asset, "agent_asset");
    const policy = await ctx.chain.policyVault();
    const ksPda = deriveKillSwitchPda(ctx.chain.cfg.programs.policyVault, agent);
    const authPda = PublicKey.findProgramAddressSync(
      [POLICY_AUTHORITY_PREFIX, agent.toBuffer()],
      ctx.chain.cfg.programs.policyVault,
    )[0];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ks: any   = await (policy.account as any).killSwitchState.fetchNullable(ksPda);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auth: any = await (policy.account as any).policyAuthority.fetchNullable(authPda);

    const out: Output = {
      killSwitchPda:      ksPda.toBase58(),
      killSwitchExplorer: explorerUrl(ctx.chain.cfg, "address", ksPda.toBase58()),
      killSwitchExists:   !!ks,
      authorityPda:       authPda.toBase58(),
      authorityExplorer:  explorerUrl(ctx.chain.cfg, "address", authPda.toBase58()),
      authorityExists:    !!auth,
    };

    if (ks) {
      out.killSwitch = {
        paused:         !!ks.paused,
        scopeKind:      Number(ks.scopeKind ?? 0),
        scopeKeyHex:    bytesToHex(ks.scopeKey ?? []),
        pausedAtSlot:   toDecString(ks.pausedAtSlot),
        unpausedAtSlot: toDecString(ks.unpausedAtSlot),
        pausedBy:       pubkeyOrNull(ks.pausedBy),
      };
    }

    if (auth) {
      const members: (string | null)[] = (auth.members ?? []).map(pubkeyOrNull);
      const memberCount = Number(auth.memberCount ?? 0);
      out.authority = {
        threshold:   Number(auth.threshold ?? 0),
        memberCount,
        members:     members.slice(0, memberCount),
      };
    }

    return out;
  },
};
