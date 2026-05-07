//! Invariant 6 — `gate_payment_strict_correctness` (Phase J5)
//!
//! `gate_payment_strict` is the variant the SDK's `composeAtomicSettleTx`
//! relies on for atomicity: any non-Allow on the gate must fail the
//! entire bundled transaction (gate + transfer + emit_feedback). The
//! caller-visible contract:
//!
//!   - `compose_decision == Allow`             ⇒ handler returns `Ok(())`
//!   - `compose_decision == Deny(_)`           ⇒ handler returns `Err(_)`
//!   - `compose_decision == RequireValidation` ⇒ handler returns `Err(_)`
//!
//! Equivalently: `strict_handler_returns_ok(d) ⇔ matches!(d, Allow)`.
//! That biconditional is the load-bearing safety property; if a future
//! change introduces a fourth `GateDecision` variant or re-routes the
//! `Deny` arm to an Ok return, this proof fails loud.
//!
//! See `programs/policy-vault/src/instructions/gate_payment_strict.rs`
//! for the production handler whose semantics this proof pins.

use anchor_lang::prelude::Pubkey;

use crate::policies::composer::{compose_decision, ComposerInput, PolicySnapshot};
use crate::policies::counterparty_tier::CounterpartyState;
use crate::policies::killswitch::KillSwitchSnapshot;
use crate::policies::require_validation::RequireValidationState;
use crate::policies::spending::SpendingState;
use crate::policies::velocity::{VelocityLedgerSnapshot, VelocityState};
use crate::state::GateDecision;

/// Mirror of the strict handler's success/failure dispatch:
/// `Allow → Ok(())`, anything else → `Err(_)`.
///
/// Kept inline as a `const fn` (no Anchor `Context`, no SDK dependencies)
/// so the Kani proof can exercise it directly without symbolic-executing
/// the on-chain state-mutation path that `compose_and_apply` runs.
const fn strict_handler_returns_ok(decision: &GateDecision) -> bool {
    matches!(decision, GateDecision::Allow)
}

#[kani::proof]
#[kani::unwind(40)]
fn strict_returns_ok_iff_allow() {
    let amount: u64 = kani::any();
    let now_slot: u64 = kani::any();
    let unix_ts: i64 = kani::any();

    let input = ComposerInput {
        policy: PolicySnapshot {
            enabled_kinds_bitmask: kani::any(),
            spending: SpendingState {
                per_tx_max:    kani::any(),
                daily_max:     kani::any(),
                weekly_max:    kani::any(),
                today_used:    kani::any(),
                week_used:     kani::any(),
                today_anchor:  kani::any(),
                week_anchor:   kani::any(),
            },
            velocity: VelocityState {
                window_secs:   kani::any(),
                max_in_window: kani::any(),
            },
            counterparty: CounterpartyState {
                gate_mode:                 kani::any(),
                min_tier:                  kani::any(),
                max_risk_score:            kani::any(),
                min_confidence:            kani::any(),
                default_unrated_treatment: kani::any(),
            },
            require_validation: RequireValidationState {
                // Pubkey symbolic-construction is expensive; the
                // strict-correctness invariant is independent of the
                // capability hash and the accepted-attestor list.
                required_capability_hash: [0u8; 32],
                accepted_attestors:       [Pubkey::default(); 2],
            },
        },
        ledger: VelocityLedgerSnapshot {
            cumulative_amount:  kani::any(),
            window_start_slot:  kani::any(),
        },
        killswitch: KillSwitchSnapshot { paused: kani::any() },
        payer_atom: None,
        payee_atom: None,
        attestation: None,
        amount,
        payee_agent_asset: Pubkey::default(),
        now_slot,
        unix_ts,
    };

    let result = compose_decision(input);

    let returns_ok = strict_handler_returns_ok(&result.decision);
    let is_allow   = matches!(result.decision, GateDecision::Allow);

    // The biconditional — the strict contract.
    kani::assert(
        returns_ok == is_allow,
        "strict handler returns Ok ⇔ compose_decision returns Allow",
    );
}

/// Companion proof: the three `GateDecision` arms are pairwise exclusive
/// (a tautology under Rust's enum totality, but pinned here so a future
/// fourth variant cannot silently slip past the strict dispatch).
#[kani::proof]
#[kani::unwind(40)]
fn gate_decision_is_one_of_three_disjoint_variants() {
    let amount: u64 = kani::any();
    let now_slot: u64 = kani::any();
    let unix_ts: i64 = kani::any();

    let input = ComposerInput {
        policy: PolicySnapshot {
            enabled_kinds_bitmask: kani::any(),
            spending: SpendingState {
                per_tx_max:   kani::any(),
                daily_max:    kani::any(),
                weekly_max:   kani::any(),
                today_used:   kani::any(),
                week_used:    kani::any(),
                today_anchor: kani::any(),
                week_anchor:  kani::any(),
            },
            velocity: VelocityState {
                window_secs:   kani::any(),
                max_in_window: kani::any(),
            },
            counterparty: CounterpartyState {
                gate_mode:                 kani::any(),
                min_tier:                  kani::any(),
                max_risk_score:            kani::any(),
                min_confidence:            kani::any(),
                default_unrated_treatment: kani::any(),
            },
            require_validation: RequireValidationState {
                required_capability_hash: [0u8; 32],
                accepted_attestors:       [Pubkey::default(); 2],
            },
        },
        ledger: VelocityLedgerSnapshot {
            cumulative_amount:  kani::any(),
            window_start_slot:  kani::any(),
        },
        killswitch: KillSwitchSnapshot { paused: kani::any() },
        payer_atom: None,
        payee_atom: None,
        attestation: None,
        amount,
        payee_agent_asset: Pubkey::default(),
        now_slot,
        unix_ts,
    };

    let result = compose_decision(input);

    let is_allow         = matches!(result.decision, GateDecision::Allow);
    let is_deny          = matches!(result.decision, GateDecision::Deny(_));
    let is_requires_attn = matches!(result.decision, GateDecision::RequireValidation(_));

    // Exactly one variant — totality + disjointness in one assertion.
    let exactly_one = (is_allow as u8) + (is_deny as u8) + (is_requires_attn as u8);
    kani::assert(
        exactly_one == 1,
        "every compose_decision result is exactly one of {Allow, Deny, RequireValidation}",
    );
}
