//! `gate_payment_strict` — strict variant of `gate_payment` that returns
//! `Err` on non-Allow.
//!
//! Same accounts, same args, same state mutations on Allow as `gate_payment`.
//! The difference is the caller-visible result:
//!
//!   - Allow                → `Ok(())`, state mutations committed
//!   - Deny(reason)         → `Err(<specific PolicyVaultError code>)`,
//!                             state unchanged, tx reverts
//!   - RequireValidation    → `Err(AttestationMissing)`,
//!                             state unchanged, tx reverts
//!
//! This is the variant the SDK's `composeAtomicSettleTx` uses so the
//! gate + transfer + emit_feedback triple commits atomically: any
//! non-Allow on the gate fails the entire tx, leaving no partial state.
//!
//! Reuses the `GatePayment` accounts struct via Anchor's instruction
//! polymorphism — same accounts, distinct ix dispatch.

use anchor_lang::prelude::*;

use crate::errors::PolicyVaultError;
use crate::state::{DenyReason, GateDecision};

use super::gate_payment::{compose_and_apply, GatePayment};

pub fn handler(
    ctx: Context<GatePayment>,
    payer_agent_asset: Pubkey,
    payee_agent_asset: Pubkey,
    amount: u64,
    _mint: Pubkey,
    policy_id: u32,
) -> Result<()> {
    let decision = compose_and_apply(
        &mut ctx.accounts.policy_account,
        &mut ctx.accounts.velocity_ledger,
        &ctx.accounts.kill_switch_state,
        ctx.accounts.payer_atom_stats.as_ref(),
        ctx.accounts.payee_atom_stats.as_ref(),
        ctx.accounts.validation_attestation.as_ref(),
        payer_agent_asset,
        payee_agent_asset,
        amount,
        policy_id,
    )?;

    match decision {
        GateDecision::Allow => Ok(()),
        GateDecision::Deny(reason) => Err(deny_reason_to_error(reason).into()),
        GateDecision::RequireValidation(_) => Err(PolicyVaultError::AttestationMissing.into()),
    }
}

/// Map a composer `DenyReason` to its concrete `PolicyVaultError` variant.
/// Stable mapping — add cases here whenever a new `DenyReason` lands.
fn deny_reason_to_error(reason: DenyReason) -> PolicyVaultError {
    match reason {
        DenyReason::KillSwitchEngaged           => PolicyVaultError::KillSwitchEngaged,
        DenyReason::SpendingPerTxExceeded       => PolicyVaultError::SpendingPerTxExceeded,
        DenyReason::SpendingDailyExceeded       => PolicyVaultError::SpendingDailyExceeded,
        DenyReason::SpendingWeeklyExceeded      => PolicyVaultError::SpendingWeeklyExceeded,
        DenyReason::VelocityWindowExceeded      => PolicyVaultError::VelocityWindowExceeded,
        DenyReason::CounterpartyTierBelowMin    => PolicyVaultError::CounterpartyTierBelowMin,
        DenyReason::CounterpartyRiskAboveMax    => PolicyVaultError::CounterpartyRiskAboveMax,
        DenyReason::CounterpartyConfidenceBelow => PolicyVaultError::CounterpartyConfidenceBelow,
        DenyReason::AtomStatsWrongOwner         => PolicyVaultError::AtomStatsWrongOwner,
        DenyReason::AtomStatsSchemaMismatch     => PolicyVaultError::AtomStatsSchemaMismatch,
        DenyReason::AttestationMissing          => PolicyVaultError::AttestationMissing,
        DenyReason::AttestationExpired          => PolicyVaultError::AttestationExpired,
        DenyReason::AttestationRevoked          => PolicyVaultError::AttestationRevoked,
        DenyReason::AttestationAttestorRejected => PolicyVaultError::AttestationAttestorRejected,
        DenyReason::UnratedTreatmentDeny        => PolicyVaultError::UnratedTreatmentDeny,
    }
}
