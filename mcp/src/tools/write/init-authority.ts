/**
 * `agenttrust_init_authority` — create the `PolicyAuthority` PDA for an
 * agent asset. Prerequisite for `init_policy` and `set_killswitch`.
 *
 * Defaults are tuned for the zero-friction first-use flow: omit
 * `members` and `threshold` and the tool initialises a single-member
 * authority with the signer as the sole member (threshold = 1). Pass
 * explicit `members` + `threshold` to bootstrap a multisig.
 *
 * Idempotent: if the PolicyAuthority PDA already exists this tool
 * returns the existing on-chain config rather than failing or
 * overwriting. The existing account is the source of truth — callers
 * that wanted different membership should burn it down via the
 * appropriate (future) instruction rather than expect this tool to
 * silently re-init.
 */

import { PublicKey, SystemProgram } from "@solana/web3.js";
import { z } from "zod";

import { explorerUrl } from "../../config";
import { PubkeySchema, parsePubkey } from "../common";
import type { Tool, ToolContext } from "../types";

const POLICY_AUTHORITY_PREFIX = Buffer.from("policy_authority");

const InputSchema = z.object({
  agent_asset: PubkeySchema.describe(
    "Quantu agent asset the PolicyAuthority is being created for",
  ),
  members:     z.array(PubkeySchema).min(1).max(7).optional().describe(
    "Authority members (1..=7 base58 pubkeys). Defaults to [<signer>] " +
    "when omitted. The caller MUST be a member or init_policy is unreachable.",
  ),
  threshold:   z.number().int().min(1).max(7).optional().describe(
    "Signers required to authorise a multisig action (1..=members.length). " +
    "Defaults to 1.",
  ),
});
type Input = z.infer<typeof InputSchema>;

interface Output {
  txSignature:        string | null;
  explorerTxUrl:      string | null;
  authorityPda:       string;
  authorityExplorer:  string;
  members:            string[];
  threshold:          number;
  alreadyInitialized: boolean;
}

export const initAuthorityTool: Tool<Input, Output> = {
  name:        "agenttrust_init_authority",
  description:
    "Create the PolicyAuthority PDA for an agent. Required before " +
    "init_policy or set_killswitch can succeed. Defaults to a single-member " +
    "authority with the signer as sole member (threshold 1) for fastest " +
    "bootstrap. Idempotent: a no-op if the PDA already exists, returning the " +
    "current on-chain members + threshold.",
  inputSchema: InputSchema,

  async handler(input: Input, ctx: ToolContext): Promise<Output> {
    const signer      = ctx.chain.requireSigner();
    const agent       = parsePubkey(input.agent_asset, "agent_asset");
    const policyVault = await ctx.chain.policyVault();

    const members: PublicKey[] = (input.members ?? [signer.publicKey.toBase58()]).map((m, i) =>
      parsePubkey(m, `members[${i}]`),
    );
    const threshold = input.threshold ?? 1;

    if (threshold > members.length) {
      throw new Error(
        `threshold (${threshold}) exceeds members.length (${members.length}).`,
      );
    }
    if (!members.some((m) => m.equals(signer.publicKey))) {
      throw new Error(
        `signer ${signer.publicKey.toBase58()} must be in members[] or ` +
        `init_policy becomes unreachable for this agent.`,
      );
    }

    const authorityPda = PublicKey.findProgramAddressSync(
      [POLICY_AUTHORITY_PREFIX, agent.toBuffer()],
      ctx.chain.cfg.programs.policyVault,
    )[0];

    // Idempotency: if the PDA already exists, return its on-chain state
    // and skip the init. The existing account is the source of truth.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing: any = await (policyVault.account as any).policyAuthority.fetchNullable(
      authorityPda,
    );
    if (existing) {
      const onChainMembers: string[] = (existing.members as PublicKey[])
        .slice(0, Number(existing.memberCount ?? existing.member_count ?? members.length))
        .map((m) => m.toBase58());
      return {
        txSignature:        null,
        explorerTxUrl:      null,
        authorityPda:       authorityPda.toBase58(),
        authorityExplorer:  explorerUrl(ctx.chain.cfg, "address", authorityPda.toBase58()),
        members:            onChainMembers,
        threshold:          Number(existing.threshold ?? 0),
        alreadyInitialized: true,
      };
    }

    const txSignature: string = await policyVault.methods
      .initAuthority(agent, members, threshold)
      .accounts({
        payer:           signer.publicKey,
        policyAuthority: authorityPda,
        systemProgram:   SystemProgram.programId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .rpc();

    return {
      txSignature,
      explorerTxUrl:      explorerUrl(ctx.chain.cfg, "tx",      txSignature),
      authorityPda:       authorityPda.toBase58(),
      authorityExplorer:  explorerUrl(ctx.chain.cfg, "address", authorityPda.toBase58()),
      members:            members.map((m) => m.toBase58()),
      threshold,
      alreadyInitialized: false,
    };
  },
};
