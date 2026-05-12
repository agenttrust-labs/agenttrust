/**
 * `agenttrust_set_killswitch` — flip the per-agent KillSwitchState pause
 * bit. Multisig-gated: the signer (lead) plus optional additional
 * signers in `remainingAccounts` must reach the PolicyAuthority's
 * threshold count.
 *
 * Self-healing: this tool depends on two PDAs being initialised —
 * `PolicyAuthority` (created by `init_authority`) and `KillSwitchState`
 * (created by `init_killswitch`). When either is missing, the tool
 * prepends the corresponding init instruction in the same atomic
 * transaction. The user never has to learn about Anchor 3012
 * (AccountNotInitialized) or run a bootstrap script.
 *
 * v1 ships the lead-signer-only happy path; thresholds > 1 require the
 * caller to assemble the multisig out-of-band and pass cosigner pubkeys
 * via `cosigner_pubkeys` (each must be available in the local keypair
 * env to actually sign — the tool currently supports lead-only and
 * surfaces a clear error if more signers are needed).
 */

import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
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
  /** True when the tool transparently bootstrapped any prerequisite PDA in the same tx. */
  selfHealed:            boolean;
  healedSteps:           string[];
}

export const setKillswitchTool: Tool<Input, Output> = {
  name:        "agenttrust_set_killswitch",
  description:
    "Pause or unpause an agent's KillSwitchState. Self-healing: if " +
    "PolicyAuthority or KillSwitchState is missing, the tool prepends " +
    "init_authority (single-member = signer, threshold 1) and/or " +
    "init_killswitch in the same atomic transaction. Lead-signer must be a " +
    "member of the PolicyAuthority; threshold > 1 (multi-sig) is not yet " +
    "supported by this tool. Requires a signer.",
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

    // Self-heal preflight: confirm PolicyAuthority + KillSwitchState
    // exist; if not, prepend the matching init instructions to the same
    // transaction. Existing accounts are the source of truth — we never
    // overwrite different members/threshold silently.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auth: any = await (policy.account as any).policyAuthority.fetchNullable(authPda);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ks:   any = await (policy.account as any).killSwitchState.fetchNullable(ksPda);

    const healedSteps: string[] = [];
    const tx = new Transaction();

    if (!auth) {
      const initAuthIx = await policy.methods
        .initAuthority(agent, [signer.publicKey], 1)
        .accounts({
          payer:           signer.publicKey,
          policyAuthority: authPda,
          systemProgram:   SystemProgram.programId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .instruction();
      tx.add(initAuthIx);
      healedSteps.push("init_authority");
    } else {
      // Lead-signer-only constraint — only checkable when authority exists.
      // When self-healed in-tx, threshold = 1 by construction.
      const threshold = Number(auth.threshold ?? 0);
      if (threshold > 1) {
        throw new Error(
          `PolicyAuthority threshold is ${threshold}; this tool only supports ` +
          `lead-only signing (threshold=1). Cosigner support is roadmap.`,
        );
      }
    }

    if (!ks) {
      const initKsIx = await policy.methods
        .initKillswitch(agent)
        .accounts({
          payer:           signer.publicKey,
          killSwitchState: ksPda,
          systemProgram:   SystemProgram.programId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .instruction();
      tx.add(initKsIx);
      healedSteps.push("init_killswitch");
    }

    const setKsIx = await policy.methods
      .setKillswitch(agent, input.paused)
      .accounts({
        signer:           signer.publicKey,
        policyAuthority:  authPda,
        killSwitchState:  ksPda,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .instruction();
    tx.add(setKsIx);

    const txSignature = await ctx.chain.provider.sendAndConfirm(tx, [signer]);

    return {
      txSignature,
      explorerTxUrl:      explorerUrl(ctx.chain.cfg, "tx",      txSignature),
      killSwitchPda:      ksPda.toBase58(),
      killSwitchExplorer: explorerUrl(ctx.chain.cfg, "address", ksPda.toBase58()),
      paused:             input.paused,
      selfHealed:         healedSteps.length > 0,
      healedSteps,
    };
  },
};
