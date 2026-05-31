//! Invariant 7 — `spending_allow_respects_caps`
//!
//! Core safety property of the Spending policy: whenever `spending::evaluate`
//! returns `Allow(deltas)`, the authorized payment honors every configured cap
//! at once — the per-transaction maximum, the daily limit, and the weekly
//! limit.
//!
//! The per-tx bound is unconditional: the early `amount > per_tx_max` guard
//! means any Allow already cleared it. The daily and weekly bounds are
//! inductive, exactly like the velocity counter: assume the pre-state counters
//! already respect their caps, and this proof shows every Allow path preserves
//! that. A freshly initialized account starts at `today_used = week_used = 0`,
//! which trivially satisfies the precondition, so by induction the bound holds
//! across all reachable states (rollover-reset paths, the zero-amount no-op,
//! and the checked-add accumulate path alike).
//!
//! This pins the contract the composer relies on when it calls
//! `spending::apply_deltas` on the all-policies-passed branch.

use crate::policies::spending::{evaluate, SpendingOutcome, SpendingState};

#[kani::proof]
#[kani::unwind(2)]
fn spending_allow_respects_caps() {
    let state = SpendingState {
        per_tx_max: kani::any(),
        daily_max: kani::any(),
        weekly_max: kani::any(),
        today_used: kani::any(),
        week_used: kani::any(),
        today_anchor: kani::any(),
        week_anchor: kani::any(),
    };
    let amount: u64 = kani::any();
    let unix_ts: i64 = kani::any();

    // Inductive precondition: the input counters already respect their caps.
    // Init sets both to 0 (trivially OK); every Allow path preserves it.
    kani::assume(state.today_used <= state.daily_max);
    kani::assume(state.week_used <= state.weekly_max);

    let outcome = evaluate(state, amount, unix_ts);

    if let SpendingOutcome::Allow(deltas) = outcome {
        // The authorized amount never exceeds the per-transaction cap.
        kani::assert(
            amount <= state.per_tx_max,
            "spending Allow honors per_tx_max",
        );
        // Post-state daily and weekly counters stay within their caps.
        kani::assert(
            deltas.new_today_used <= state.daily_max,
            "spending Allow preserves: new_today_used ≤ daily_max",
        );
        kani::assert(
            deltas.new_week_used <= state.weekly_max,
            "spending Allow preserves: new_week_used ≤ weekly_max",
        );
    }
}
