/**
 * `agenttrust_init_policy` — initialise a PolicyAccount + VelocityLedger
 * for the caller's `(agent_asset, policy_id)` pair.
 *
 * Self-healing: if the agent's `PolicyAuthority` PDA does not yet
 * exist, the tool transparently prepends an `init_authority` instruction
 * (single-member = signer, threshold = 1) and submits both in a single
 * atomic transaction. The user never has to learn about Anchor 3012
 * (AccountNotInitialized) or run a bootstrap script.
 *
 * Cap defaults: when the caller specifies ANY spending cap, unspecified
 * peers default to the MAX of the specified caps rather than 0.
 * Rationale: v1 policies are immutable post-init, so 0 (literal hard
 * cap) is hostile — every gated payment fails with
 * `SpendingPerTxExceeded`. The MAX-of-peers default keeps the explicit
 * cap binding and leaves the others permissive.
 *
 * The full per-kind config is exposed as JSON; sane defaults zero every
 * field so callers can incrementally enable kinds via the bitmask.
 */

import { BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { z } from "zod";

import { derivePolicyPda, deriveVelocityPda } from "../../chain";
import { explorerUrl } from "../../config";
import { PubkeySchema, parsePubkey, HexHashSchema, hexToBytes } from "../common";
import type { Tool, ToolContext } from "../types";

const POLICY_AUTHORITY_PREFIX = Buffer.from("policy_authority");

const SpendingSchema = z.object({
  per_tx_max:  z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)]).default(0).describe(
    "Max per-transaction amount. If 0 and any peer cap is non-zero, defaults to the largest specified cap.",
  ),
  daily_max:   z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)]).default(0).describe(
    "Max daily aggregate. If 0 and any peer cap is non-zero, defaults to the largest specified cap.",
  ),
  weekly_max:  z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)]).default(0).describe(
    "Max weekly aggregate. If 0 and any peer cap is non-zero, defaults to the largest specified cap.",
  ),
}).default({ per_tx_max: 0, daily_max: 0, weekly_max: 0 });

const VelocitySchema = z.object({
  window_secs:        z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)]).default(0),
  max_in_window:      z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)]).default(0),
  tier0_decay_factor: z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)]).default(10000).describe(
    "Basis points (10_000 = 100%). Rate the velocity counter decays toward zero per slot. " +
    "10_000 means full decay every slot (no rollover). 0 means the counter persists forever. " +
    "Tune per agent's usage pattern.",
  ),
}).default({ window_secs: 0, max_in_window: 0, tier0_decay_factor: 10000 });

const CounterpartySchema = z.object({
  min_tier:                  z.number().int().min(0).max(4).default(0),
  max_risk_score:            z.number().int().min(0).max(255).default(255),
  min_confidence:            z.number().int().min(0).max(10000).default(0),
  default_unrated_treatment: z.number().int().min(0).max(2).default(0),
}).default({ min_tier: 0, max_risk_score: 255, min_confidence: 0, default_unrated_treatment: 0 });

const ValidationSchema = z.object({
  required_capability_hash_hex: HexHashSchema.optional(),
  accepted_attestors:           z.array(PubkeySchema).max(2).default([]),
}).default({ accepted_attestors: [] });

const InputSchema = z.object({
  agent_asset:           PubkeySchema.describe("Quantu agent asset (must equal a member of the agent's PolicyAuthority)"),
  policy_id:             z.number().int().min(0).max(0xffffffff),
  enabled_kinds_bitmask: z.number().int().min(0).max(255).describe("OR of KIND_* flags: 1=KillSwitch 2=Spending 4=Velocity 8=CounterpartyTier 16=RequireValidation"),
  gate_mode:             z.number().int().min(0).max(1).default(0).describe("0=Immediate, 1=Confirmed"),
  scope_kind:            z.number().int().min(0).max(2).default(2).describe("0=Global 1=PerCollection 2=PerAgent"),
  spending:              SpendingSchema,
  velocity:              VelocitySchema,
  counterparty:          CounterpartySchema,
  validation:            ValidationSchema,
});
type Input = z.infer<typeof InputSchema>;

interface Output {
  txSignature:     string;
  explorerTxUrl:   string;
  policyPda:       string;
  policyExplorer:  string;
  velocityPda:     string;
  velocityExplorer: string;
  /** Effective spending caps actually written on-chain (after max-of-peers default-fill). */
  effectiveSpending: {
    perTxMax:  string;
    dailyMax:  string;
    weeklyMax: string;
  };
  /** True when the tool transparently bootstrapped PolicyAuthority in the same tx. */
  selfHealed:      boolean;
  healedSteps:     string[];
}

const ZERO_PUBKEY = new PublicKey(new Uint8Array(32));

/**
 * Apply max-of-peers default-fill. Returns a copy of `spending` where any
 * `0` field is rewritten to the largest specified (non-zero) cap among
 * its peers. If every field is `0`, returns the input unchanged — that
 * means the user explicitly disabled the Spending kind via the bitmask
 * and we honour it.
 */
function applySpendingCapDefaults(spending: { per_tx_max: number | string; daily_max: number | string; weekly_max: number | string }): { per_tx_max: string; daily_max: string; weekly_max: string } {
  const toBig = (v: number | string): bigint => BigInt(typeof v === "string" ? v : v.toString());
  const perTx  = toBig(spending.per_tx_max);
  const daily  = toBig(spending.daily_max);
  const weekly = toBig(spending.weekly_max);

  const peers = [perTx, daily, weekly];
  const maxPeer = peers.reduce((a, b) => (a > b ? a : b), 0n);
  if (maxPeer === 0n) {
    // All zero — user didn't specify any cap. Leave as zero (bitmask
    // gating decides whether Spending is enabled at all).
    return {
      per_tx_max: perTx.toString(),
      daily_max:  daily.toString(),
      weekly_max: weekly.toString(),
    };
  }

  return {
    per_tx_max: (perTx  === 0n ? maxPeer : perTx ).toString(),
    daily_max:  (daily  === 0n ? maxPeer : daily ).toString(),
    weekly_max: (weekly === 0n ? maxPeer : weekly).toString(),
  };
}

export const initPolicyTool: Tool<Input, Output> = {
  name:        "agenttrust_init_policy",
  description:
    "Create a PolicyAccount + VelocityLedger PDA for the caller's agent. " +
    "Self-healing: if the agent's PolicyAuthority PDA does not yet exist, " +
    "the tool prepends init_authority (single-member = signer, threshold 1) " +
    "in the same atomic transaction. Sensible cap defaults: when the caller " +
    "sets at least one spending cap, unspecified peer caps default to the " +
    "MAX of the specified caps rather than 0 — important because v1 " +
    "policies are immutable post-init and 0 is a hostile always-deny. " +
    "Requires a signer (KEYPAIR_B58 / KEYPAIR_PATH / Solana CLI default).",
  inputSchema: InputSchema,

  async handler(input: Input, ctx: ToolContext): Promise<Output> {
    const signer       = ctx.chain.requireSigner();
    const agent        = parsePubkey(input.agent_asset, "agent_asset");
    const policyVault  = await ctx.chain.policyVault();

    const policyPda    = derivePolicyPda(ctx.chain.cfg.programs.policyVault, agent, input.policy_id);
    const velocityPda  = deriveVelocityPda(ctx.chain.cfg.programs.policyVault, agent, input.policy_id);
    const authorityPda = PublicKey.findProgramAddressSync(
      [POLICY_AUTHORITY_PREFIX, agent.toBuffer()],
      ctx.chain.cfg.programs.policyVault,
    )[0];

    const effectiveSpending = applySpendingCapDefaults(input.spending);

    const validationHash = input.validation.required_capability_hash_hex
      ? Array.from(hexToBytes(input.validation.required_capability_hash_hex))
      : Array.from(new Uint8Array(32));
    const acceptedAttestors: PublicKey[] = [
      input.validation.accepted_attestors[0]
        ? parsePubkey(input.validation.accepted_attestors[0], "validation.accepted_attestors[0]")
        : ZERO_PUBKEY,
      input.validation.accepted_attestors[1]
        ? parsePubkey(input.validation.accepted_attestors[1], "validation.accepted_attestors[1]")
        : ZERO_PUBKEY,
    ];

    const args = {
      policyId:            input.policy_id,
      enabledKindsBitmask: input.enabled_kinds_bitmask,
      gateMode:            input.gate_mode,
      scopeKind:           input.scope_kind,
      spending: {
        perTxMax:  new BN(effectiveSpending.per_tx_max),
        dailyMax:  new BN(effectiveSpending.daily_max),
        weeklyMax: new BN(effectiveSpending.weekly_max),
      },
      velocity: {
        windowSecs:        new BN(input.velocity.window_secs.toString()),
        maxInWindow:       new BN(input.velocity.max_in_window.toString()),
        tier0DecayFactor:  new BN(input.velocity.tier0_decay_factor.toString()),
      },
      counterparty: {
        minTier:                 input.counterparty.min_tier,
        maxRiskScore:            input.counterparty.max_risk_score,
        minConfidence:           input.counterparty.min_confidence,
        defaultUnratedTreatment: input.counterparty.default_unrated_treatment,
      },
      validation: {
        requiredCapabilityHash: validationHash,
        acceptedAttestors,
      },
    };

    // Self-heal: if PolicyAuthority is missing, prepend init_authority
    // (single-member = signer, threshold = 1) in the same tx. The
    // existing on-chain account is otherwise the source of truth — we
    // never overwrite different members/threshold silently.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingAuth: any = await (policyVault.account as any).policyAuthority.fetchNullable(
      authorityPda,
    );

    const healedSteps: string[] = [];
    const tx = new Transaction();

    if (!existingAuth) {
      const initAuthIx = await policyVault.methods
        .initAuthority(agent, [signer.publicKey], 1)
        .accounts({
          payer:           signer.publicKey,
          policyAuthority: authorityPda,
          systemProgram:   SystemProgram.programId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .instruction();
      tx.add(initAuthIx);
      healedSteps.push("init_authority");
    }

    const initPolicyIx = await policyVault.methods
      .initPolicy(agent, args as never)
      .accounts({
        payer:           signer.publicKey,
        policyAuthority: authorityPda,
        policyAccount:   policyPda,
        velocityLedger:  velocityPda,
        systemProgram:   SystemProgram.programId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .instruction();
    tx.add(initPolicyIx);

    const txSignature = await ctx.chain.provider.sendAndConfirm(tx, [signer]);

    return {
      txSignature,
      explorerTxUrl:    explorerUrl(ctx.chain.cfg, "tx",      txSignature),
      policyPda:        policyPda.toBase58(),
      policyExplorer:   explorerUrl(ctx.chain.cfg, "address", policyPda.toBase58()),
      velocityPda:      velocityPda.toBase58(),
      velocityExplorer: explorerUrl(ctx.chain.cfg, "address", velocityPda.toBase58()),
      effectiveSpending: {
        perTxMax:  effectiveSpending.per_tx_max,
        dailyMax:  effectiveSpending.daily_max,
        weeklyMax: effectiveSpending.weekly_max,
      },
      selfHealed:       healedSteps.length > 0,
      healedSteps,
    };
  },
};
