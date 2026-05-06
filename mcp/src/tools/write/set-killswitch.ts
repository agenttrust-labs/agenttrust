/**
 * `agenttrust_set_killswitch` — flip the per-agent KillSwitchState pause
 * bit. Multisig-gated: the signer (lead) plus optional additional
 * signers in `remainingAccounts` must reach the PolicyAuthority's
 * threshold count.
 *
 * v1 ships the lead-signer-only happy path; thresholds > 1 require the
 * caller to assemble the multisig out-of-band and pass cosigner pubkeys
 * via `cosigner_pubkeys` (each must be available in the local keypair
 * env to actually sign — the tool currently supports lead-only and
 * surfaces a clear error if more signers are needed).
 */

import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

import { deriveKillSwitchPda } from "../../chain";
import { explorerUrl } from "../../config";
import { PubkeySchema, parsePubkey } from "../common";
import type { Tool, ToolContext } from "../types";

const POLICY_AUTHORITY_PREFIX = Buffer.from("policy_authority");

const InputSchema = z.object({
  agent_asset: PubkeySchema.describe("Quantu agent asset"),
  paused:      z.boolean().describe("true to pause, false to unpause"),
});
type Input = z.infer<typeof InputSchema>;

interface Output {
  txSignature:           string;
  explorerTxUrl:         string;
  killSwitchPda:         string;
  killSwitchExplorer:    string;
  paused:                boolean;
}

export const setKillswitchTool: Tool<Input, Output> = {
  name:        "agenttrust_set_killswitch",
  description:
    "Pause or unpause an agent's KillSwitchState. Requires KEYPAIR_B58 to " +
    "be the lead signer (a member of the agent's PolicyAuthority). When the " +
    "authority's threshold > 1 the call needs additional cosigners; this " +
    "tool currently only supports lead-only multisigs (threshold=1).",
  inputSchema: InputSchema,

  async handler(input: Input, ctx: ToolContext): Promise<Output> {
    const signer = ctx.chain.requireSigner();
    const agent  = parsePubkey(input.agent_asset, "agent_asset");
    const policy = await ctx.chain.policyVault();

    const ksPda   = deriveKillSwitchPda(ctx.chain.cfg.programs.policyVault, agent);
    const authPda = PublicKey.findProgramAddressSync(
      [POLICY_AUTHORITY_PREFIX, agent.toBuffer()],
      ctx.chain.cfg.programs.policyVault,
    )[0];

    // Friendly preflight: confirm the authority threshold is satisfiable
    // by the lead signer alone.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auth: any = await (policy.account as any).policyAuthority.fetchNullable(authPda);
    if (!auth) {
      throw new Error(
        `PolicyAuthority not initialised for ${agent.toBase58()}. Call ` +
        `init_authority before set_killswitch.`,
      );
    }
    const threshold = Number(auth.threshold ?? 0);
    if (threshold > 1) {
      throw new Error(
        `PolicyAuthority threshold is ${threshold}; this tool only supports ` +
        `lead-only signing (threshold=1). Cosigner support is roadmap.`,
      );
    }

    const txSignature: string = await policy.methods
      .setKillswitch(agent, input.paused)
      .accounts({
        signer:           signer.publicKey,
        policyAuthority:  authPda,
        killSwitchState:  ksPda,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .rpc();

    return {
      txSignature,
      explorerTxUrl:      explorerUrl(ctx.chain.cfg, "tx",      txSignature),
      killSwitchPda:      ksPda.toBase58(),
      killSwitchExplorer: explorerUrl(ctx.chain.cfg, "address", ksPda.toBase58()),
      paused:             input.paused,
    };
  },
};
