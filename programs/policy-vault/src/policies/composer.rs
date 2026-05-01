//! `compose_decision` — pure-Rust orchestration of the 5 policy kinds.
//!
//! Fail-fast order: KillSwitch → Spending → Velocity → CounterpartyTier →
//! RequireValidation. The composer is the SOLE place that ties the pure-fn
//! policy modules together; the Anchor `gate_payment` handler is a thin
//! wrapper that reads accounts, snapshots them, calls `compose_decision`,
//! and applies returned deltas only on the `Allow` branch.
//!
//! Pure-fn separation lets:
//! - Phase 5 Kani harnesses assert `paused_implies_no_allow` and
//!   `velocity_counter_le_limit` over this function directly.
//! - Unit tests cover every Allow / Deny / RequireValidation path without
//!   an Anchor program-test harness.
//!
//! Reference: docs/plan/research/04-policyvault-build-playbook.md §D.

use anchor_lang::prelude::*;

use crate::constants::{
    KIND_COUNTERPARTY_TIER, KIND_KILLSWITCH, KIND_REQUIRE_VALIDATION,
    KIND_SPENDING, KIND_VELOCITY,
};
use crate::ext::atom_engine::AtomStatsView;
use crate::ext::validation_registry::ValidationAttestationView;
use crate::policies::{
    counterparty_tier::{self, CounterpartyOutcome, CounterpartyState, UnratedResolution},
    killswitch::{self, KillSwitchSnapshot},
    require_validation::{self, RequireValidationOutcome, RequireValidationState},
    spending::{self, SpendingDeltas, SpendingOutcome, SpendingState},
    velocity::{self, VelocityDeltas, VelocityLedgerSnapshot, VelocityOutcome, VelocityState},
};
use crate::state::{DenyReason, GateDecision, PolicyAccount};

// ---------------------------------------------------------------------------
// Bundled policy-config snapshot
// ---------------------------------------------------------------------------

/// Composer-level snapshot of a `PolicyAccount`. Bundles the per-policy
/// snapshots so the composer never re-reaches into the on-chain account.
#[derive(Clone, Copy, Debug)]
pub struct PolicySnapshot {
    pub enabled_kinds_bitmask: u8,
    pub spending:              SpendingState,
    pub velocity:              VelocityState,
    pub counterparty:          CounterpartyState,
    pub require_validation:    RequireValidationState,
}

impl From<&PolicyAccount> for PolicySnapshot {
    fn from(p: &PolicyAccount) -> Self {
        PolicySnapshot {
            enabled_kinds_bitmask: p.enabled_kinds_bitmask,
            spending:              p.into(),
            velocity:              p.into(),
            counterparty:          p.into(),
            require_validation:    p.into(),
        }
    }
}

// ---------------------------------------------------------------------------
// Composer input + output
// ---------------------------------------------------------------------------

#[derive(Clone, Copy, Debug)]
pub struct ComposerInput {
    pub policy:             PolicySnapshot,
    pub ledger:             VelocityLedgerSnapshot,
    pub killswitch:         KillSwitchSnapshot,
    pub payer_atom:         Option<AtomStatsView>,
    pub payee_atom:         Option<AtomStatsView>,
    pub attestation:        Option<ValidationAttestationView>,
    pub amount:             u64,
    pub payee_agent_asset:  Pubkey,
    pub now_slot:           u64,
    pub unix_ts:            i64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ComposerResult {
    pub decision:        GateDecision,
    /// Present iff `decision == Allow` AND Spending was enabled.
    /// The Anchor handler writes these to `PolicyAccount` on Allow.
    pub spending_deltas: Option<SpendingDeltas>,
    /// Present iff `decision == Allow` AND Velocity was enabled.
    pub velocity_deltas: Option<VelocityDeltas>,
}

impl ComposerResult {
    fn deny(reason: DenyReason) -> Self {
        ComposerResult {
            decision:        GateDecision::Deny(reason),
            spending_deltas: None,
            velocity_deltas: None,
        }
    }

    fn require_validation(hash: [u8; 32]) -> Self {
        ComposerResult {
            decision:        GateDecision::RequireValidation(hash),
            spending_deltas: None,
            velocity_deltas: None,
        }
    }
}

// ---------------------------------------------------------------------------
// The composer
// ---------------------------------------------------------------------------

pub fn compose_decision(input: ComposerInput) -> ComposerResult {
    let bitmask = input.policy.enabled_kinds_bitmask;

    // 1. KillSwitch — cheapest check, no foreign reads.
    if bitmask & KIND_KILLSWITCH != 0 {
        if let Some(reason) = killswitch::evaluate(input.killswitch) {
            return ComposerResult::deny(reason);
        }
    }

    // 2. Spending — pure config-vs-amount check; no foreign reads.
    let mut spending_deltas: Option<SpendingDeltas> = None;
    if bitmask & KIND_SPENDING != 0 {
        match spending::evaluate(input.policy.spending, input.amount, input.unix_ts) {
            SpendingOutcome::Allow(deltas) => spending_deltas = Some(deltas),
            SpendingOutcome::Deny(reason)  => return ComposerResult::deny(reason),
        }
    }

    // 3. Velocity — uses payer's tier from AtomStats (defaults to 0 if absent).
    let mut velocity_deltas: Option<VelocityDeltas> = None;
    if bitmask & KIND_VELOCITY != 0 {
        let payer_tier = input.payer_atom.map(|v| v.tier_immediate).unwrap_or(0);
        match velocity::evaluate(
            input.policy.velocity,
            input.ledger,
            input.amount,
            payer_tier,
            input.now_slot,
        ) {
            VelocityOutcome::Allow(deltas) => velocity_deltas = Some(deltas),
            VelocityOutcome::Deny(reason)  => return ComposerResult::deny(reason),
        }
    }

    // 4. CounterpartyTier — reads payee AtomStats. Unrated maps via policy
    //    config (`default_unrated_treatment`).
    if bitmask & KIND_COUNTERPARTY_TIER != 0 {
        match counterparty_tier::evaluate(input.policy.counterparty, input.payee_atom) {
            CounterpartyOutcome::Allow         => {}
            CounterpartyOutcome::Deny(reason)  => return ComposerResult::deny(reason),
            CounterpartyOutcome::Unrated       => {
                match counterparty_tier::resolve_unrated(
                    input.policy.counterparty.default_unrated_treatment,
                ) {
                    UnratedResolution::Allow             => {}
                    UnratedResolution::Deny              => {
                        return ComposerResult::deny(DenyReason::UnratedTreatmentDeny);
                    }
                    UnratedResolution::RequireValidation => {
                        return ComposerResult::require_validation(
                            input.policy.require_validation.required_capability_hash,
                        );
                    }
                }
            }
        }
    }

    // 5. RequireValidation — last because it's the most expensive (foreign
    //    PDA + Ed25519-style payload checks in v1.1+).
    if bitmask & KIND_REQUIRE_VALIDATION != 0 {
        match require_validation::evaluate(
            input.policy.require_validation,
            input.attestation,
            &input.payee_agent_asset,
            input.now_slot,
        ) {
            RequireValidationOutcome::Allow                       => {}
            RequireValidationOutcome::Deny(reason)                => {
                return ComposerResult::deny(reason);
            }
            RequireValidationOutcome::RequiresAttestation(hash)   => {
                return ComposerResult::require_validation(hash);
            }
        }
    }

    // All enabled policies passed.
    ComposerResult {
        decision: GateDecision::Allow,
        spending_deltas,
        velocity_deltas,
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::constants::{GATE_MODE_IMMEDIATE, UNRATED_ALLOW, UNRATED_DENY, UNRATED_REQUIRE_VALIDATION};

    fn pk(byte: u8) -> Pubkey {
        let mut bytes = [0u8; 32];
        bytes[0] = byte;
        Pubkey::new_from_array(bytes)
    }

    /// 2026-05-02 12:00:00 UTC.
    const TS_NOON: i64 = 1_777_723_200;

    fn snapshot(bitmask: u8) -> PolicySnapshot {
        PolicySnapshot {
            enabled_kinds_bitmask: bitmask,
            spending: SpendingState {
                per_tx_max:    1_000,
                daily_max:     5_000,
                weekly_max:    20_000,
                today_used:    0,
                week_used:     0,
                today_anchor:  0,
                week_anchor:   0,
            },
            velocity: VelocityState {
                window_secs:   3_600,
                max_in_window: 10_000,
            },
            counterparty: CounterpartyState {
                gate_mode:                  GATE_MODE_IMMEDIATE,
                min_tier:                   0,
                max_risk_score:             255,
                min_confidence:             0,
                default_unrated_treatment:  UNRATED_ALLOW,
            },
            require_validation: RequireValidationState {
                required_capability_hash: [0u8; 32],
                accepted_attestors:       [Pubkey::default(); 2],
            },
        }
    }

    fn empty_ledger() -> VelocityLedgerSnapshot {
        VelocityLedgerSnapshot { cumulative_amount: 0, window_start_slot: 0 }
    }

    fn input_with(bitmask: u8, amount: u64) -> ComposerInput {
        ComposerInput {
            policy:            snapshot(bitmask),
            ledger:            empty_ledger(),
            killswitch:        KillSwitchSnapshot { paused: false },
            payer_atom:        None,
            payee_atom:        None,
            attestation:       None,
            amount,
            payee_agent_asset: pk(1),
            now_slot:          100,
            unix_ts:           TS_NOON,
        }
    }

    // -- happy paths --

    #[test]
    fn no_policies_enabled_allows() {
        let r = compose_decision(input_with(0, 100));
        assert_eq!(r.decision, GateDecision::Allow);
        assert!(r.spending_deltas.is_none());
        assert!(r.velocity_deltas.is_none());
    }

    #[test]
    fn spending_only_allows_with_deltas() {
        let r = compose_decision(input_with(KIND_SPENDING, 100));
        assert_eq!(r.decision, GateDecision::Allow);
        assert!(r.spending_deltas.is_some());
        assert!(r.velocity_deltas.is_none());
    }

    #[test]
    fn velocity_only_allows_with_deltas() {
        let r = compose_decision(input_with(KIND_VELOCITY, 100));
        assert_eq!(r.decision, GateDecision::Allow);
        assert!(r.spending_deltas.is_none());
        assert!(r.velocity_deltas.is_some());
    }

    #[test]
    fn spending_plus_velocity_returns_both_deltas() {
        let r = compose_decision(input_with(KIND_SPENDING | KIND_VELOCITY, 100));
        assert_eq!(r.decision, GateDecision::Allow);
        assert!(r.spending_deltas.is_some());
        assert!(r.velocity_deltas.is_some());
    }

    // -- KillSwitch fail-fast --

    #[test]
    fn killswitch_paused_denies_short_circuiting_other_policies() {
        let mut inp = input_with(KIND_KILLSWITCH | KIND_SPENDING | KIND_VELOCITY, 100);
        inp.killswitch.paused = true;
        // Even with Spending exceeding (would also Deny), KillSwitch wins.
        inp.amount = 999_999; // would exceed spending per_tx_max
        let r = compose_decision(inp);
        assert_eq!(r.decision, GateDecision::Deny(DenyReason::KillSwitchEngaged));
    }

    #[test]
    fn killswitch_disabled_in_bitmask_is_ignored_even_if_paused() {
        // Defensive: paused=true but KillSwitch not enabled in policy → not gated.
        let mut inp = input_with(KIND_SPENDING, 100);
        inp.killswitch.paused = true;
        let r = compose_decision(inp);
        assert_eq!(r.decision, GateDecision::Allow);
    }

    // -- Spending --

    #[test]
    fn spending_per_tx_exceeded_denies() {
        let r = compose_decision(input_with(KIND_SPENDING, 9_999));
        assert_eq!(r.decision, GateDecision::Deny(DenyReason::SpendingPerTxExceeded));
        assert!(r.spending_deltas.is_none());
    }

    // -- Velocity --

    #[test]
    fn velocity_window_exceeded_denies() {
        let mut inp = input_with(KIND_VELOCITY, 100);
        inp.ledger.cumulative_amount = 9_950; // max=10_000; +100 → exceeds
        let r = compose_decision(inp);
        assert_eq!(r.decision, GateDecision::Deny(DenyReason::VelocityWindowExceeded));
    }

    // -- CounterpartyTier --

    #[test]
    fn counterparty_below_min_tier_denies() {
        let mut inp = input_with(KIND_COUNTERPARTY_TIER, 100);
        inp.policy.counterparty.min_tier = 3;
        inp.payee_atom = Some(AtomStatsView {
            tier_immediate: 1, tier_confirmed: 0, risk_score: 0, confidence: 0,
        });
        let r = compose_decision(inp);
        assert_eq!(r.decision, GateDecision::Deny(DenyReason::CounterpartyTierBelowMin));
    }

    #[test]
    fn unrated_with_deny_treatment() {
        let mut inp = input_with(KIND_COUNTERPARTY_TIER, 100);
        inp.policy.counterparty.min_tier = 2;
        inp.policy.counterparty.default_unrated_treatment = UNRATED_DENY;
        // payee_atom = None (uninitialised) → Unrated
        let r = compose_decision(inp);
        assert_eq!(r.decision, GateDecision::Deny(DenyReason::UnratedTreatmentDeny));
    }

    #[test]
    fn unrated_with_allow_treatment_passes() {
        let mut inp = input_with(KIND_COUNTERPARTY_TIER, 100);
        inp.policy.counterparty.min_tier = 2;
        inp.policy.counterparty.default_unrated_treatment = UNRATED_ALLOW;
        let r = compose_decision(inp);
        assert_eq!(r.decision, GateDecision::Allow);
    }

    #[test]
    fn unrated_with_require_validation_treatment_returns_capability_hash() {
        let mut inp = input_with(KIND_COUNTERPARTY_TIER, 100);
        inp.policy.counterparty.min_tier = 2;
        inp.policy.counterparty.default_unrated_treatment = UNRATED_REQUIRE_VALIDATION;
        let cap_hash = [0xCC; 32];
        inp.policy.require_validation.required_capability_hash = cap_hash;
        let r = compose_decision(inp);
        assert_eq!(r.decision, GateDecision::RequireValidation(cap_hash));
    }

    // -- RequireValidation --

    #[test]
    fn require_validation_missing_returns_capability_hash() {
        let mut inp = input_with(KIND_REQUIRE_VALIDATION, 100);
        let cap_hash = [0xAA; 32];
        inp.policy.require_validation.required_capability_hash = cap_hash;
        // attestation = None
        let r = compose_decision(inp);
        assert_eq!(r.decision, GateDecision::RequireValidation(cap_hash));
    }

    #[test]
    fn require_validation_revoked_attestation_denies() {
        let mut inp = input_with(KIND_REQUIRE_VALIDATION, 100);
        let cap_hash = [0xAA; 32];
        inp.policy.require_validation.required_capability_hash = cap_hash;
        inp.attestation = Some(ValidationAttestationView {
            subject_asset:   pk(1),
            capability_hash: cap_hash,
            attestor:        pk(99),
            expires_at:      0,
            revoked:         true,
        });
        let r = compose_decision(inp);
        assert_eq!(r.decision, GateDecision::Deny(DenyReason::AttestationRevoked));
    }

    // -- All-five enabled --

    #[test]
    fn all_five_policies_pass_returns_allow_with_both_deltas() {
        let bitmask = KIND_KILLSWITCH | KIND_SPENDING | KIND_VELOCITY
            | KIND_COUNTERPARTY_TIER | KIND_REQUIRE_VALIDATION;
        let mut inp = input_with(bitmask, 100);
        inp.policy.counterparty.min_tier = 2;
        inp.payee_atom = Some(AtomStatsView {
            tier_immediate: 3, tier_confirmed: 2, risk_score: 0, confidence: 0,
        });
        let cap_hash = [0xAA; 32];
        inp.policy.require_validation.required_capability_hash = cap_hash;
        inp.attestation = Some(ValidationAttestationView {
            subject_asset:   pk(1),
            capability_hash: cap_hash,
            attestor:        pk(99),
            expires_at:      0,
            revoked:         false,
        });
        let r = compose_decision(inp);
        assert_eq!(r.decision, GateDecision::Allow);
        assert!(r.spending_deltas.is_some());
        assert!(r.velocity_deltas.is_some());
    }

    // -- Fail-fast ordering --

    #[test]
    fn fail_fast_killswitch_before_spending() {
        let mut inp = input_with(
            KIND_KILLSWITCH | KIND_SPENDING,
            999_999, // would Spending-deny
        );
        inp.killswitch.paused = true;
        let r = compose_decision(inp);
        // KillSwitch is checked first → KillSwitchEngaged, not SpendingPerTxExceeded.
        assert_eq!(r.decision, GateDecision::Deny(DenyReason::KillSwitchEngaged));
    }

    #[test]
    fn fail_fast_spending_before_velocity() {
        let mut inp = input_with(
            KIND_SPENDING | KIND_VELOCITY,
            999_999, // exceeds both
        );
        inp.ledger.cumulative_amount = 9_950; // also over velocity
        let r = compose_decision(inp);
        // Spending is checked first → SpendingPerTxExceeded.
        assert_eq!(r.decision, GateDecision::Deny(DenyReason::SpendingPerTxExceeded));
    }

    // -- Allow on Deny path returns no deltas --

    #[test]
    fn deny_path_returns_no_deltas() {
        let r = compose_decision(input_with(KIND_SPENDING | KIND_VELOCITY, 999_999));
        assert!(matches!(r.decision, GateDecision::Deny(_)));
        assert!(r.spending_deltas.is_none());
        assert!(r.velocity_deltas.is_none());
    }
}
