//! `gate_payment` — the composer entrypoint. Returns a `GateDecision` to the
//! caller and applies state mutations only on the `Allow` branch.
//!
//! Pure-fn logic lives in `crate::policies::composer`; this file is the thin
//! Anchor wrapper that:
//!   1. Reads on-chain accounts → snapshots
//!   2. Optionally parses foreign PDAs (atom-engine, validation-registry)
//!   3. Calls `compose_decision`
//!   4. On Allow: writes deltas to PolicyAccount + VelocityLedger
//!   5. Emits the matching event (Allowed / Denied / RequireValidationEmitted)
//!   6. Returns `Ok(GateDecision)` so clients receive the decision via
//!      Anchor's return-data channel.

use anchor_lang::prelude::*;

use crate::constants::SCOPE_PER_AGENT;
use crate::events::{PolicyAllowed, PolicyDenied, RequireValidationEmitted, VelocityIncremented};
use crate::ext::atom_engine::read_atom_stats_view;
use crate::ext::validation_registry::read_validation_attestation_view;
use crate::policies::composer::{compose_decision, ComposerInput, PolicySnapshot};
use crate::policies::killswitch::KillSwitchSnapshot;
use crate::policies::velocity::VelocityLedgerSnapshot;
use crate::policies::{spending, velocity};
use crate::state::{GateDecision, KillSwitchState, PolicyAccount, VelocityLedger};

const PER_AGENT_SCOPE_DISCRIMINATOR: [u8; 1] = [SCOPE_PER_AGENT];

#[derive(Accounts)]
#[instruction(
    payer_agent_asset: Pubkey,
    payee_agent_asset: Pubkey,
    amount: u64,
    mint: Pubkey,
    policy_id: u32,
)]
pub struct GatePayment<'info> {
    /// SECURITY: in v1, ANY signer can call gate_payment. The composer's
    /// state writes (Spending counters + VelocityLedger cumulative) are
    /// therefore exposed to a denial-of-service attack: a hostile caller
    /// could exhaust the daily / weekly / window budget via spurious calls.
    /// v1.1 adds a facilitator allowlist on `PolicyAccount`. For the v1
    /// hackathon submission, gate_payment is invoked by TrustGate (Phase 6),
    /// which itself is invoked by trusted x402 facilitators.
    pub caller: Signer<'info>,

    #[account(
        mut,
        seeds = [PolicyAccount::SEED_PREFIX, payer_agent_asset.as_ref(), &policy_id.to_le_bytes()],
        bump = policy_account.bump,
    )]
    pub policy_account: Account<'info, PolicyAccount>,

    #[account(
        mut,
        seeds = [VelocityLedger::SEED_PREFIX, payer_agent_asset.as_ref(), &policy_id.to_le_bytes()],
        bump = velocity_ledger.bump,
    )]
    pub velocity_ledger: Account<'info, VelocityLedger>,

    #[account(
        seeds = [
            KillSwitchState::SEED_PREFIX,
            &PER_AGENT_SCOPE_DISCRIMINATOR,
            payer_agent_asset.as_ref(),
        ],
        bump = kill_switch_state.bump,
    )]
    pub kill_switch_state: Account<'info, KillSwitchState>,

    /// CHECK: foreign-program PDA. Verified by `atom_engine::read_atom_stats_view`
    /// (owner check, size check, schema_version check, tier-range check).
    pub payer_atom_stats: Option<UncheckedAccount<'info>>,

    /// CHECK: foreign-program PDA. Verified by `atom_engine::read_atom_stats_view`.
    pub payee_atom_stats: Option<UncheckedAccount<'info>>,

    /// CHECK: foreign-program account from validation-registry. Verified by
    /// `validation_registry::read_validation_attestation_view`.
    pub validation_attestation: Option<UncheckedAccount<'info>>,
}

pub fn handler(
    ctx: Context<GatePayment>,
    payer_agent_asset: Pubkey,
    payee_agent_asset: Pubkey,
    amount: u64,
    _mint: Pubkey,
    policy_id: u32,
) -> Result<GateDecision> {
    let clock = Clock::get()?;
    let now_slot = clock.slot;
    let unix_ts  = clock.unix_timestamp;

    // Snapshot all account state. PolicySnapshot / VelocityLedgerSnapshot /
    // KillSwitchSnapshot are `Copy`, so the immutable borrows drop after
    // these calls return — leaving us free to take `&mut` borrows below.
    let policy_snapshot = PolicySnapshot::from(&*ctx.accounts.policy_account);
    let ledger_snapshot = VelocityLedgerSnapshot::from(&*ctx.accounts.velocity_ledger);
    let killswitch_snap = KillSwitchSnapshot::from(&*ctx.accounts.kill_switch_state);

    let payer_atom = match ctx.accounts.payer_atom_stats.as_ref() {
        Some(acct) => read_atom_stats_view(acct)?,
        None       => None,
    };
    let payee_atom = match ctx.accounts.payee_atom_stats.as_ref() {
        Some(acct) => read_atom_stats_view(acct)?,
        None       => None,
    };
    let attestation = match ctx.accounts.validation_attestation.as_ref() {
        Some(acct) => read_validation_attestation_view(acct)?,
        None       => None,
    };

    let result = compose_decision(ComposerInput {
        policy:            policy_snapshot,
        ledger:            ledger_snapshot,
        killswitch:        killswitch_snap,
        payer_atom,
        payee_atom,
        attestation,
        amount,
        payee_agent_asset,
        now_slot,
        unix_ts,
    });

    match result.decision {
        GateDecision::Allow => {
            if let Some(d) = result.spending_deltas.as_ref() {
                spending::apply_deltas(&mut ctx.accounts.policy_account, d);
            }
            if let Some(d) = result.velocity_deltas.as_ref() {
                velocity::apply_deltas(&mut ctx.accounts.velocity_ledger, d);
                emit!(VelocityIncremented {
                    payer_agent_asset,
                    policy_id,
                    new_cumulative: d.new_cumulative_amount,
                    slot:           now_slot,
                });
            }
            emit!(PolicyAllowed {
                payer_agent_asset,
                payee_agent_asset,
                amount,
                policy_id,
                slot: now_slot,
            });
        }
        GateDecision::Deny(reason) => {
            emit!(PolicyDenied {
                payer_agent_asset,
                payee_agent_asset,
                amount,
                policy_id,
                reason: reason.code(),
                slot:   now_slot,
            });
        }
        GateDecision::RequireValidation(hash) => {
            emit!(RequireValidationEmitted {
                payer_agent_asset,
                payee_agent_asset,
                capability_hash: hash,
                slot:            now_slot,
            });
        }
    }

    Ok(result.decision)
}
