/**
 * `agenttrust_init_policy` — initialise a PolicyAccount + VelocityLedger
 * for the caller's `(agent_asset, policy_id)` pair.
 *
 * Self-healing (in tx-prepend order, so a fresh wallet single-shots the
 * full AgentTrust 0.4.0 onboarding):
 *
 *   1. Quantu `agent_account` + `atom_stats` (via TrustGate's
 *      `register_agent_via_cpi`). When the caller omits `agent_asset`,
 *      init_policy generates a fresh ephemeral asset Keypair internally,
 *      signs the register_with_options CPI with it, and returns the new
 *      pubkey via the `agentAsset` output field. The asset secret is
 *      needed only to sign that one CPI (MPL Core mints the asset under
 *      the asset pubkey), then is discarded — no later AgentTrust or
 *      Quantu instruction requires asset to sign again. We never use the
 *      caller's funded wallet as the asset because MPL Core's CreateV2
 *      would collide with the wallet's existing System Program account.
 *      When the caller passes an explicit `agent_asset` whose Quantu
 *      agent_account is missing, we surface a typed
 *      counterparty_not_registered envelope — we don't auto-create
 *      someone else's identity, and we cannot sign as an asset whose
 *      secret we don't have.
 *
 *   2. AgentTrust `PolicyAuthority` (via `init_authority`, single-member =
 *      signer, threshold = 1). Prepended whenever the PDA is missing.
 *
 *   3. AgentTrust `KillSwitchState` (via `init_killswitch`). gate_payment
 *      requires the per-agent kill-switch PDA to exist; without this
 *      prepend a fresh agent's first simulate_payment hits Anchor 3012.
 *
 * All steps land in one signed transaction. The user never has to learn
 * about Anchor 3012 (AccountNotInitialized) or run a bootstrap script.
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
import { Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { z } from "zod";

import {
  BASE_COLLECTION_DEVNET,
  buildRegisterAgentViaCpiIx,
  deriveAgentAccountPda,
  deriveKillSwitchPda,
  derivePolicyPda,
  deriveVelocityPda,
} from "../../chain";
import { explorerUrl } from "../../config";
import { CounterpartyNotRegisteredError } from "../../errors";
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
  agent_asset:           PubkeySchema.optional().describe(
    "Quantu agent asset pubkey. OMIT to let init_policy generate a fresh agent identity in " +
    "the same atomic bootstrap transaction (recommended for first-time use; the wallet pays " +
    "for the new MPL Core asset and never has to learn Quantu's surface). Provide an explicit " +
    "value only when operating on an existing agent whose Quantu agent_account is already on-chain.",
  ),
  policy_id:             z.number().int().min(0).max(0xffffffff),
  enabled_kinds_bitmask: z.number().int().min(0).max(255).describe("OR of KIND_* flags: 1=KillSwitch 2=Spending 4=Velocity 8=CounterpartyTier 16=RequireValidation"),
  gate_mode:             z.number().int().min(0).max(1).default(0).describe("0=Immediate, 1=Confirmed"),
  scope_kind:            z.number().int().min(0).max(2).default(2).describe("0=Global 1=PerCollection 2=PerAgent"),
  spending:              SpendingSchema,
  velocity:              VelocitySchema,
  counterparty:          CounterpartySchema,
  validation:            ValidationSchema,
  metadata_uri:          z.string().max(256).default("https://agenttrust.tech/agents/default.json").describe(
    "Metadata URI used when the tool self-heals a missing Quantu agent_account in the same atomic tx. " +
    "Only applied when the signer wallet equals agent_asset (self-registration). Max 256 bytes.",
  ),
});
type Input = z.infer<typeof InputSchema>;

interface Output {
  txSignature:     string;
  explorerTxUrl:   string;
  /** The agent_asset pubkey the policy is keyed to. Either the value the caller
   *  passed in, or the freshly-generated identity init_policy created during
   *  self-bootstrap. Always returned so callers always know their canonical
   *  agent identity for downstream tool calls (get_policy, simulate_payment, ...). */
  agentAsset:         string;
  agentAssetExplorer: string;
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
  /** True when the tool transparently bootstrapped one or more accounts. */
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
    "Single-bootstrap call: create a PolicyAccount + VelocityLedger PDA for the caller's agent, " +
    "self-healing every missing prerequisite in the same atomic transaction. " +
    "When agent_asset is omitted, generates a fresh ephemeral Quantu agent identity, prepends " +
    "register_agent_via_cpi to bootstrap it under TrustGate, and returns the new pubkey via " +
    "the `agentAsset` output. When agent_asset is provided but its PolicyAuthority PDA is " +
    "missing, prepends init_authority (single-member = signer, threshold 1). " +
    "Sensible cap defaults: when the caller sets at least one spending cap, unspecified peer " +
    "caps default to the MAX of the specified caps rather than 0 — important because v1 " +
    "policies are immutable post-init and 0 is a hostile always-deny. " +
    "Requires a signer (KEYPAIR_B58 / KEYPAIR_PATH / Solana CLI default).",
  inputSchema: InputSchema,

  async handler(input: Input, ctx: ToolContext): Promise<Output> {
    const signer       = ctx.chain.requireSigner();
    const policyVault  = await ctx.chain.policyVault();

    // Resolve the agent_asset. When the caller omits `agent_asset`, we
    // generate a fresh ephemeral Keypair: Quantu's register_with_options
    // invokes MPL Core's CreateV2 under the asset pubkey, so the address
    // must be a fresh System Program account (the user's funded wallet
    // would collide). The asset secret is needed ONCE — to sign the
    // register_with_options CPI — then discarded. No on-chain operation
    // after that point requires the asset to sign again
    // (initialize_stats, emit_feedback, dispute_payment, gate_payment,
    // and every validation-registry flow all treat asset as a read
    // pubkey). The MCP never persists the secret.
    let assetKeypair: Keypair | null = null;
    let agent: PublicKey;
    if (input.agent_asset === undefined || input.agent_asset === null || input.agent_asset === "") {
      assetKeypair = Keypair.generate();
      agent        = assetKeypair.publicKey;
    } else {
      agent = parsePubkey(input.agent_asset, "agent_asset");
    }

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
    const signers: Keypair[] = [signer];

    // Self-heal step #0: Quantu agent_account. Only fires when we own the
    // asset Keypair (i.e. we generated it just above). When the caller
    // passed an explicit `agent_asset` but its Quantu PDA is missing, we
    // surface a typed counterparty_not_registered envelope — we never
    // auto-create someone else's identity, and we cannot sign as an
    // asset whose secret we don't have.
    const agentAccountPda = deriveAgentAccountPda(ctx.chain.cfg.quantu, agent);
    const agentInfo       = await ctx.chain.connection.getAccountInfo(agentAccountPda, "confirmed");
    if (!agentInfo) {
      if (!assetKeypair) {
        throw new CounterpartyNotRegisteredError({
          counterpartyPubkey: agent.toBase58(),
          missingAccountKind: "quantu_agent_account",
          cause:              "init_policy needs the asset Keypair to sign register_with_options; caller supplied agent_asset as a pubkey only",
        });
      }
      const registerIx = await buildRegisterAgentViaCpiIx({
        provider:       ctx.chain.provider,
        trustgateId:    ctx.chain.cfg.programs.trustGate,
        quantuPrograms: ctx.chain.cfg.quantu,
        baseCollection: BASE_COLLECTION_DEVNET,
        payer:          signer.publicKey,
        asset:          assetKeypair.publicKey,
        metadataUri:    input.metadata_uri,
        trustgate:      await ctx.chain.trustgate(),
      });
      tx.add(registerIx);
      healedSteps.push("register_agent_via_cpi");
      signers.push(assetKeypair);
    }

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

    // Self-heal step #2: KillSwitchState. gate_payment requires this PDA
    // to exist; a fresh agent would hit AnchorError 3012 on the first
    // simulate_payment without this prepend. Per-agent scope (scope_kind=2)
    // matches the seed shape the policy-vault IDL declares.
    const killSwitchPda = deriveKillSwitchPda(ctx.chain.cfg.programs.policyVault, agent);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingKs: any = await (policyVault.account as any).killSwitchState.fetchNullable(
      killSwitchPda,
    );
    if (!existingKs) {
      const initKsIx = await policyVault.methods
        .initKillswitch(agent)
        .accounts({
          payer:           signer.publicKey,
          killSwitchState: killSwitchPda,
          systemProgram:   SystemProgram.programId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .instruction();
      tx.add(initKsIx);
      healedSteps.push("init_killswitch");
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

    const txSignature = await ctx.chain.provider.sendAndConfirm(tx, signers);

    return {
      txSignature,
      explorerTxUrl:      explorerUrl(ctx.chain.cfg, "tx",      txSignature),
      agentAsset:         agent.toBase58(),
      agentAssetExplorer: explorerUrl(ctx.chain.cfg, "address", agent.toBase58()),
      policyPda:          policyPda.toBase58(),
      policyExplorer:     explorerUrl(ctx.chain.cfg, "address", policyPda.toBase58()),
      velocityPda:        velocityPda.toBase58(),
      velocityExplorer:   explorerUrl(ctx.chain.cfg, "address", velocityPda.toBase58()),
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
