//! Invariant 1 — `paused_implies_no_allow`
//!
//! If the agent's KillSwitch is `paused == true` AND `KIND_KILLSWITCH` is set
//! in the policy bitmask, `compose_decision` cannot return `Allow` for any
//! values of the other policy fields, ledger, or input parameters.
//!
//! This is THE load-bearing safety invariant of the gate. If a future change
//! re-orders or skips KillSwitch evaluation, Kani fails this proof loud.

use anchor_lang::prelude::Pubkey;

use crate::constants::KIND_KILLSWITCH;
use crate::policies::composer::{compose_decision, ComposerInput, PolicySnapshot};
use crate::policies::counterparty_tier::CounterpartyState;
use crate::policies::killswitch::KillSwitchSnapshot;
use crate::policies::require_validation::RequireValidationState;
use crate::policies::spending::SpendingState;
use crate::policies::velocity::{VelocityLedgerSnapshot, VelocityState};
use crate::state::GateDecision;

#[kani::proof]
#[kani::unwind(2)]
fn paused_killswitch_implies_no_allow() {
    let other_bits: u8 = kani::any();
    let amount:     u64 = kani::any();
    let now_slot:   u64 = kani::any();
    let unix_ts:    i64 = kani::any();

    let input = ComposerInput {
        policy: PolicySnapshot {
            // KILLSWITCH bit set; other bits symbolic — proof must hold for
            // every bitmask combination as long as KILLSWITCH is among them.
            enabled_kinds_bitmask: other_bits | KIND_KILLSWITCH,
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
                // Pubkey symbolic-construction is expensive; use defaults.
                // The invariant is independent of these bytes.
                required_capability_hash: [0u8; 32],
                accepted_attestors:       [Pubkey::default(); 2],
            },
        },
        ledger: VelocityLedgerSnapshot {
            cumulative_amount: kani::any(),
            window_start_slot: kani::any(),
        },
        killswitch:        KillSwitchSnapshot { paused: true }, // <-- forced paused
        payer_atom:        None,
        payee_atom:        None,
        attestation:       None,
        amount,
        payee_agent_asset: Pubkey::default(),
        now_slot,
        unix_ts,
    };

    let result = compose_decision(input);

    kani::assert(
        !matches!(result.decision, GateDecision::Allow),
        "paused KillSwitch must never produce Allow",
    );
}
