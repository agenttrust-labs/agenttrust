/**
 * `agenttrust_init_policy` — initialise a PolicyAccount + VelocityLedger
 * for the caller's `(agent_asset, policy_id)` pair. Requires the
 * PolicyAuthority to already exist with the signer as a member; this
 * tool surfaces a clear error pointing at `init_authority` if not.
 *
 * The full per-kind config is exposed as JSON; sane defaults zero every
 * field so callers can incrementally enable kinds via the bitmask.
 */

import { BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { z } from "zod";

import { derivePolicyPda, deriveVelocityPda } from "../../chain";
import { explorerUrl } from "../../config";
import { PubkeySchema, parsePubkey, HexHashSchema, hexToBytes } from "../common";
import type { Tool, ToolContext } from "../types";

const POLICY_AUTHORITY_PREFIX = Buffer.from("policy_authority");

const SpendingSchema = z.object({
  per_tx_max:  z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)]).default(0),
  daily_max:   z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)]).default(0),
  weekly_max:  z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)]).default(0),
}).default({ per_tx_max: 0, daily_max: 0, weekly_max: 0 });

const VelocitySchema = z.object({
  window_secs:        z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)]).default(0),
  max_in_window:      z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)]).default(0),
  tier0_decay_factor: z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)]).default(10000),
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
}

const ZERO_PUBKEY = new PublicKey(new Uint8Array(32));

export const initPolicyTool: Tool<Input, Output> = {
  name:        "agenttrust_init_policy",
  description:
    "Create a PolicyAccount + VelocityLedger PDA for the caller's agent. " +
    "Requires KEYPAIR_B58 (the signer must be a member of the agent's " +
    "PolicyAuthority). Returns the tx signature plus Explorer URLs for " +
    "both new PDAs.",
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
        perTxMax:  new BN(input.spending.per_tx_max.toString()),
        dailyMax:  new BN(input.spending.daily_max.toString()),
        weeklyMax: new BN(input.spending.weekly_max.toString()),
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

    const txSignature: string = await policyVault.methods
      .initPolicy(agent, args as never)
      .accounts({
        payer:           signer.publicKey,
        policyAuthority: authorityPda,
        policyAccount:   policyPda,
        velocityLedger:  velocityPda,
        systemProgram:   SystemProgram.programId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .rpc();

    return {
      txSignature,
      explorerTxUrl:    explorerUrl(ctx.chain.cfg, "tx",      txSignature),
      policyPda:        policyPda.toBase58(),
      policyExplorer:   explorerUrl(ctx.chain.cfg, "address", policyPda.toBase58()),
      velocityPda:      velocityPda.toBase58(),
      velocityExplorer: explorerUrl(ctx.chain.cfg, "address", velocityPda.toBase58()),
    };
  },
};
