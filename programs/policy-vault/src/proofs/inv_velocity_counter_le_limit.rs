//! Invariant 2 — `velocity_counter_le_limit`
//!
//! Inductive form: if the pre-state ledger satisfies `cumulative_amount ≤
//! max_in_window`, then after `velocity::evaluate` returns `Allow(deltas)`,
//! the new cumulative counter still satisfies the bound. Every prior Allow
//! preserves the invariant, so a fresh ledger (cumulative=0) trivially
//! satisfies it; this proof shows preservation across all subsequent calls
//! (including the zero-amount no-op path).
//!
//! Composer-level cross-policy bound (`new_cumulative ≤ spending.weekly_max`)
//! requires the additional precondition `velocity_max ≤ weekly_max` and is
//! proven separately if needed; this local invariant is the load-bearing one.

use crate::policies::velocity::{evaluate, VelocityLedgerSnapshot, VelocityOutcome, VelocityState};

#[kani::proof]
#[kani::unwind(2)]
fn velocity_allow_implies_cumulative_le_max() {
    let state = VelocityState {
        window_secs: kani::any(),
        max_in_window: kani::any(),
    };
    let ledger = VelocityLedgerSnapshot {
        cumulative_amount: kani::any(),
        window_start_slot: kani::any(),
    };
    let amount: u64 = kani::any();
    let payer_tier: u8 = kani::any();
    let now_slot: u64 = kani::any();

    // Inductive precondition: the input ledger must already satisfy the
    // invariant. Every Allow path preserves it; init starts at 0 (trivially OK).
    kani::assume(ledger.cumulative_amount <= state.max_in_window);

    let outcome = evaluate(state, ledger, amount, payer_tier, now_slot);

    if let VelocityOutcome::Allow(deltas) = outcome {
        kani::assert(
            deltas.new_cumulative_amount <= state.max_in_window,
            "velocity Allow preserves: new_cumulative_amount ≤ max_in_window",
        );
    }
}
