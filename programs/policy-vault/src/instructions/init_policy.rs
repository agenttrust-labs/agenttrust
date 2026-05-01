//! `init_policy` — atomically creates the `PolicyAccount` + `VelocityLedger` PDAs
//! for a single (agent, policy_id) pair.
//!
//! Args are grouped into per-policy-kind config structs (`SpendingConfig`,
//! `VelocityConfig`, `CounterpartyConfig`, `ValidationConfig`) so each policy's
//! config is a single named bundle on the wire and on the call site.

use anchor_lang::prelude::*;

use crate::constants::{
    GATE_MODE_CONFIRMED, GATE_MODE_IMMEDIATE,
    KIND_COUNTERPARTY_TIER, KIND_KILLSWITCH, KIND_REQUIRE_VALIDATION,
    KIND_SPENDING, KIND_VELOCITY,
    SCOPE_GLOBAL, SCOPE_PER_AGENT, SCOPE_PER_COLLECTION,
    UNRATED_ALLOW, UNRATED_DENY, UNRATED_REQUIRE_VALIDATION,
};
use crate::errors::PolicyVaultError;
use crate::events::PolicyInitialized;
use crate::state::{PolicyAccount, VelocityLedger};

const ALL_KIND_BITS: u8 = KIND_KILLSWITCH
    | KIND_SPENDING
    | KIND_VELOCITY
    | KIND_COUNTERPARTY_TIER
    | KIND_REQUIRE_VALIDATION;

const MAX_TIER:       u8  = 4;
const MAX_CONFIDENCE: u16 = 10_000;

// ---------------------------------------------------------------------------
// Per-kind config bundles
// ---------------------------------------------------------------------------

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub struct SpendingConfig {
    pub per_tx_max: u64,
    pub daily_max:  u64,
    pub weekly_max: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub struct VelocityConfig {
    pub window_secs:        u64,
    pub max_in_window:      u64,
    pub tier0_decay_factor: u64, // bp (10000 = 1.0)
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub struct CounterpartyConfig {
    pub min_tier:                  u8,
    pub max_risk_score:            u8,  // 255 = no constraint
    pub min_confidence:            u16, // 0..=10000
    pub default_unrated_treatment: u8,  // UNRATED_*
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub struct ValidationConfig {
    pub required_capability_hash: [u8; 32], // zeros = unset
    pub accepted_attestors:       [Pubkey; 2], // zeros = permissionless
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub struct InitPolicyArgs {
    pub policy_id:             u32,
    pub enabled_kinds_bitmask: u8,
    pub gate_mode:             u8, // GATE_MODE_*
    pub scope_kind:            u8, // SCOPE_*
    pub spending:              SpendingConfig,
    pub velocity:              VelocityConfig,
    pub counterparty:          CounterpartyConfig,
    pub validation:            ValidationConfig,
}

impl InitPolicyArgs {
    /// Validate enum-bound + range-bound fields up-front; keeps the handler
    /// readable and prevents storing nonsense encodings on-chain.
    pub fn validate(&self) -> Result<()> {
        require!(
            matches!(self.gate_mode, GATE_MODE_IMMEDIATE | GATE_MODE_CONFIRMED),
            PolicyVaultError::InvalidGateMode,
        );
        require!(
            matches!(
                self.scope_kind,
                SCOPE_GLOBAL | SCOPE_PER_COLLECTION | SCOPE_PER_AGENT
            ),
            PolicyVaultError::InvalidScopeKind,
        );
        // Reject bits outside the defined KIND_* surface (forward-compat: new
        // kinds must add a constant, bump the mask, and re-deploy).
        require!(
            self.enabled_kinds_bitmask & !ALL_KIND_BITS == 0,
            PolicyVaultError::InvalidEnabledKinds,
        );
        require!(
            self.counterparty.min_tier <= MAX_TIER,
            PolicyVaultError::InvalidCounterpartyTier,
        );
        require!(
            self.counterparty.min_confidence <= MAX_CONFIDENCE,
            PolicyVaultError::InvalidConfidence,
        );
        require!(
            matches!(
                self.counterparty.default_unrated_treatment,
                UNRATED_DENY | UNRATED_ALLOW | UNRATED_REQUIRE_VALIDATION
            ),
            PolicyVaultError::InvalidUnratedTreatment,
        );
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Accounts context
// ---------------------------------------------------------------------------

#[derive(Accounts)]
#[instruction(payer_agent_asset: Pubkey, args: InitPolicyArgs)]
pub struct InitPolicy<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + PolicyAccount::INIT_SPACE,
        seeds = [PolicyAccount::SEED_PREFIX, payer_agent_asset.as_ref(), &args.policy_id.to_le_bytes()],
        bump,
    )]
    pub policy_account: Account<'info, PolicyAccount>,

    #[account(
        init,
        payer = payer,
        space = 8 + VelocityLedger::INIT_SPACE,
        seeds = [VelocityLedger::SEED_PREFIX, payer_agent_asset.as_ref(), &args.policy_id.to_le_bytes()],
        bump,
    )]
    pub velocity_ledger: Account<'info, VelocityLedger>,

    pub system_program: Program<'info, System>,
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

pub fn handler(
    ctx: Context<InitPolicy>,
    payer_agent_asset: Pubkey,
    args: InitPolicyArgs,
) -> Result<()> {
    // SECURITY: `init_policy` is currently NOT auth-gated against the agent's
    // owner. Anyone can fund a PolicyAccount for any `payer_agent_asset`. This
    // is acceptable for Phase 1 (state-schema + Spending only) because no
    // policy decision yet trusts the policy state in a payment-altering way.
    // Phase 3 introduces `PolicyAuthority` + cross-program AgentAccount owner
    // verification before this handler will be considered production-ready.
    args.validate()?;

    let policy = &mut ctx.accounts.policy_account;
    write_policy_account(policy, payer_agent_asset, ctx.bumps.policy_account, &args);

    let ledger = &mut ctx.accounts.velocity_ledger;
    write_velocity_ledger(ledger, payer_agent_asset, args.policy_id, ctx.bumps.velocity_ledger);

    emit!(PolicyInitialized {
        payer_agent_asset,
        policy_id:     args.policy_id,
        enabled_kinds: args.enabled_kinds_bitmask,
        slot:          Clock::get()?.slot,
    });

    Ok(())
}

// ---------------------------------------------------------------------------
// PDA initialisers — extracted so the handler stays a one-screen narrative.
// ---------------------------------------------------------------------------

fn write_policy_account(
    policy:            &mut PolicyAccount,
    payer_agent_asset: Pubkey,
    bump:              u8,
    args:              &InitPolicyArgs,
) {
    policy.payer_agent_asset           = payer_agent_asset;
    policy.policy_id                   = args.policy_id;
    policy.bump                        = bump;
    policy._pad0                       = [0u8; 3];
    policy.enabled_kinds_bitmask       = args.enabled_kinds_bitmask;
    policy.gate_mode                   = args.gate_mode;
    policy.scope_kind                  = args.scope_kind;

    policy.spending_per_tx_max         = args.spending.per_tx_max;
    policy.spending_daily_max          = args.spending.daily_max;
    policy.spending_weekly_max         = args.spending.weekly_max;
    policy.spending_today_used         = 0;
    policy.spending_week_used          = 0;
    policy.spending_today_anchor       = 0;
    policy.spending_week_anchor        = 0;

    policy.velocity_window_secs        = args.velocity.window_secs;
    policy.velocity_max_in_window      = args.velocity.max_in_window;
    policy.velocity_tier0_decay_factor = args.velocity.tier0_decay_factor;

    policy.min_counterparty_tier       = args.counterparty.min_tier;
    policy.max_risk_score              = args.counterparty.max_risk_score;
    policy.min_confidence              = args.counterparty.min_confidence;
    policy.default_unrated_treatment   = args.counterparty.default_unrated_treatment;

    policy.required_capability_hash    = args.validation.required_capability_hash;
    policy.accepted_attestors          = args.validation.accepted_attestors;

    policy._reserved                   = [0u8; 8];
}

fn write_velocity_ledger(
    ledger:            &mut VelocityLedger,
    payer_agent_asset: Pubkey,
    policy_id:         u32,
    bump:              u8,
) {
    ledger.payer_agent_asset = payer_agent_asset;
    ledger.policy_id         = policy_id;
    ledger.bump              = bump;
    ledger._pad0             = [0u8; 3];
    ledger.cumulative_amount = 0;
    ledger.last_commit_slot  = 0;
    ledger.window_start_slot = 0;
    ledger._reserved         = [0u8; 8];
}
