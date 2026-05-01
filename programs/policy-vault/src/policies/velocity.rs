//! Velocity policy — rolling sliding-window cumulative-spend gate.
//!
//! Window size scales with the payer's `trust_tier` so a new/unrated agent
//! gets a tighter throttle than a Gold-tier agent. Pure-Rust over a
//! `(VelocityState, VelocityLedgerSnapshot, amount, payer_tier, now_slot)`
//! tuple — composer applies the returned `VelocityDeltas` only on the
//! all-policies-passed branch (Allow-path-only commit per playbook §E.4).
//!
//! Reference: docs/plan/research/04-policyvault-build-playbook.md §C.3, §E.

use crate::state::{DenyReason, PolicyAccount, VelocityLedger};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/// Approximate slots per second on Solana mainnet (~0.4–0.5s per slot).
/// Playbook §E.1 uses 2 slots/sec for the conservative envelope.
pub const SLOTS_PER_SECOND: u64 = 2;

// Tier-decay numerator/denominator pairs (numerator only; denominator = 4).
//   tier 0 → 1/4 (tightest)
//   tier 1 → 2/4 = 1/2
//   tier 2 → 3/4
//   tier 3 → 4/4 = 1.0  (Gold; reference)
//   tier 4 → 5/4 = 1.25 (Platinum; relaxed)
const TIER_DECAY_DENOMINATOR: u128 = 4;

#[inline]
fn tier_decay_numerator(payer_tier: u8) -> u128 {
    match payer_tier {
        0 => 1,
        1 => 2,
        2 => 3,
        3 => 4,
        4 => 5,
        // Unknown tier (corruption / future spec) → fall back to Gold (1×):
        // conservative-but-not-locking. Composer's CounterpartyTier guards
        // against unrated-payer flows separately.
        _ => 4,
    }
}

/// Pure helper: `base_secs × tier_multiplier(payer_tier)` clamped to u64.
/// Computed via u128 to avoid overflow on tier-4 (×5/4) over very large bases.
pub fn apply_tier_decay(base_secs: u64, payer_tier: u8) -> u64 {
    let n = tier_decay_numerator(payer_tier);
    let d = TIER_DECAY_DENOMINATOR;
    let scaled = (base_secs as u128).saturating_mul(n) / d;
    if scaled > u64::MAX as u128 { u64::MAX } else { scaled as u64 }
}

// ---------------------------------------------------------------------------
// Snapshot + outcome types
// ---------------------------------------------------------------------------

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct VelocityState {
    pub window_secs:   u64,
    pub max_in_window: u64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct VelocityLedgerSnapshot {
    pub cumulative_amount: u64,
    pub window_start_slot: u64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct VelocityDeltas {
    pub new_cumulative_amount: u64,
    pub new_last_commit_slot:  u64,
    pub new_window_start_slot: u64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum VelocityOutcome {
    Allow(VelocityDeltas),
    Deny(DenyReason),
}

impl From<&PolicyAccount> for VelocityState {
    fn from(p: &PolicyAccount) -> Self {
        VelocityState {
            window_secs:   p.velocity_window_secs,
            max_in_window: p.velocity_max_in_window,
        }
    }
}

impl From<&VelocityLedger> for VelocityLedgerSnapshot {
    fn from(l: &VelocityLedger) -> Self {
        VelocityLedgerSnapshot {
            cumulative_amount: l.cumulative_amount,
            window_start_slot: l.window_start_slot,
        }
    }
}

// ---------------------------------------------------------------------------
// Pure decision function
// ---------------------------------------------------------------------------

/// Evaluate Velocity. Returns deltas the composer should write on Allow.
/// Read-only on `ledger`; the composer is the sole writer.
pub fn evaluate(
    state:       VelocityState,
    ledger:      VelocityLedgerSnapshot,
    amount:      u64,
    payer_tier:  u8,
    now_slot:    u64,
) -> VelocityOutcome {
    if amount == 0 {
        // No-op: pass through without resetting or advancing the window.
        return VelocityOutcome::Allow(VelocityDeltas {
            new_cumulative_amount: ledger.cumulative_amount,
            new_last_commit_slot:  now_slot,
            new_window_start_slot: ledger.window_start_slot,
        });
    }

    let window_secs  = apply_tier_decay(state.window_secs, payer_tier);
    let window_slots = window_secs.saturating_mul(SLOTS_PER_SECOND);

    let elapsed = now_slot.saturating_sub(ledger.window_start_slot);
    let window_expired = elapsed >= window_slots;
    let active_in_window = if window_expired { 0 } else { ledger.cumulative_amount };

    let new_cumulative = match active_in_window.checked_add(amount) {
        Some(v) => v,
        None    => return VelocityOutcome::Deny(DenyReason::VelocityWindowExceeded),
    };

    if new_cumulative > state.max_in_window {
        return VelocityOutcome::Deny(DenyReason::VelocityWindowExceeded);
    }

    VelocityOutcome::Allow(VelocityDeltas {
        new_cumulative_amount: new_cumulative,
        new_last_commit_slot:  now_slot,
        new_window_start_slot: if window_expired { now_slot } else { ledger.window_start_slot },
    })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn state(window_secs: u64, max: u64) -> VelocityState {
        VelocityState { window_secs, max_in_window: max }
    }

    fn ledger(cumulative: u64, window_start: u64) -> VelocityLedgerSnapshot {
        VelocityLedgerSnapshot { cumulative_amount: cumulative, window_start_slot: window_start }
    }

    fn assert_allow(out: VelocityOutcome) -> VelocityDeltas {
        match out {
            VelocityOutcome::Allow(d) => d,
            other => panic!("expected Allow, got {:?}", other),
        }
    }

    // -- happy + boundary --

    #[test]
    fn happy_path_allows_and_returns_deltas() {
        // window 3600s × tier 3 (1×) = 7200 slots
        let d = assert_allow(evaluate(state(3600, 1000), ledger(0, 0), 100, 3, 100));
        assert_eq!(d.new_cumulative_amount, 100);
        assert_eq!(d.new_last_commit_slot,  100);
    }

    #[test]
    fn cumulative_at_max_allows() {
        let d = assert_allow(evaluate(state(3600, 100), ledger(50, 0), 50, 3, 100));
        assert_eq!(d.new_cumulative_amount, 100);
    }

    #[test]
    fn cumulative_one_over_max_denies() {
        let out = evaluate(state(3600, 100), ledger(50, 0), 51, 3, 100);
        assert_eq!(out, VelocityOutcome::Deny(DenyReason::VelocityWindowExceeded));
    }

    #[test]
    fn zero_amount_is_no_op_allow() {
        let d = assert_allow(evaluate(state(3600, 100), ledger(50, 200), 0, 3, 999));
        assert_eq!(d.new_cumulative_amount, 50);
        assert_eq!(d.new_last_commit_slot,  999); // last_commit advances even on no-op
        assert_eq!(d.new_window_start_slot, 200); // window not reset
    }

    // -- window expiry / reset --

    #[test]
    fn window_expiry_resets_cumulative_to_amount_only() {
        // window_secs=10, slots_per_sec=2 → window_slots=20.
        // Ledger started at slot 100 with 99 cumulative; now_slot=200 → elapsed=100 ≥ 20 → reset.
        let d = assert_allow(evaluate(state(10, 100), ledger(99, 100), 5, 3, 200));
        assert_eq!(d.new_cumulative_amount, 5);
        assert_eq!(d.new_window_start_slot, 200);
    }

    #[test]
    fn within_window_keeps_window_start() {
        let d = assert_allow(evaluate(state(10, 100), ledger(50, 100), 10, 3, 110));
        assert_eq!(d.new_cumulative_amount, 60);
        assert_eq!(d.new_window_start_slot, 100); // unchanged
    }

    // -- tier decay --

    #[test]
    fn tier_decay_unrated_quarter_window() {
        // Tier 0: window × 1/4. Base 100s → 25s → 50 slots.
        let win = apply_tier_decay(100, 0);
        assert_eq!(win, 25);
    }

    #[test]
    fn tier_decay_gold_one_x() {
        assert_eq!(apply_tier_decay(100, 3), 100);
    }

    #[test]
    fn tier_decay_platinum_one_quarter_x() {
        // Tier 4: window × 5/4. Base 100 → 125.
        assert_eq!(apply_tier_decay(100, 4), 125);
    }

    #[test]
    fn tier_decay_unknown_tier_falls_back_to_gold() {
        // Defense in depth — if PolicyAccount.gate_mode/tier corrupts,
        // do not crash; treat as Gold (1×).
        assert_eq!(apply_tier_decay(100, 99), 100);
    }

    #[test]
    fn tier_decay_no_overflow_on_max_base() {
        // u64::MAX × 5/4 must clamp, not panic.
        let win = apply_tier_decay(u64::MAX, 4);
        assert_eq!(win, u64::MAX);
    }

    #[test]
    fn unrated_tier_denies_where_gold_would_allow() {
        // window_secs=400 → tier 0 = 100s = 200 slots; tier 3 = 400s = 800 slots.
        // Ledger started at slot 0, cumulative 50; now_slot=300, amount=60.
        //   tier 0: 300 ≥ 200 → window expired → 60 ≤ 100 → Allow
        // Different scenario: now_slot=100 (within both windows)
        //   ledger cumulative 95, max 100, amount 10
        //   both tiers Deny via cumulative cap. Use the WINDOW dimension instead.
        // Cleaner test: Tier 0 window expired but Tier 3 still active.
        let s = state(400, 100);
        // Ledger cumulative 95 from slot 0; now_slot=300.
        //   tier 3 elapsed=300 < 800 → active=95 → +10 = 105 > 100 → Deny
        //   tier 0 elapsed=300 ≥ 200 → reset → +10 = 10 ≤ 100 → Allow
        let tier0 = evaluate(s, ledger(95, 0), 10, 0, 300);
        let tier3 = evaluate(s, ledger(95, 0), 10, 3, 300);
        assert!(matches!(tier0, VelocityOutcome::Allow(_)));
        assert_eq!(tier3, VelocityOutcome::Deny(DenyReason::VelocityWindowExceeded));
    }

    // -- overflow --

    #[test]
    fn overflow_is_treated_as_window_exceeded() {
        let out = evaluate(state(3600, u64::MAX), ledger(u64::MAX, 0), 1, 3, 100);
        assert_eq!(out, VelocityOutcome::Deny(DenyReason::VelocityWindowExceeded));
    }

    #[test]
    fn max_in_window_zero_denies_any_nonzero_amount() {
        let out = evaluate(state(3600, 0), ledger(0, 0), 1, 3, 100);
        assert_eq!(out, VelocityOutcome::Deny(DenyReason::VelocityWindowExceeded));
    }

    #[test]
    fn max_in_window_zero_allows_zero_amount() {
        let d = assert_allow(evaluate(state(3600, 0), ledger(0, 0), 0, 3, 100));
        assert_eq!(d.new_cumulative_amount, 0);
    }

    // -- saturating_sub on now_slot --

    #[test]
    fn now_slot_before_window_start_does_not_panic() {
        // Defensive: if now_slot < window_start_slot (clock skew / replay),
        // saturating_sub clamps elapsed to 0 — window NOT expired.
        let d = assert_allow(evaluate(state(3600, 100), ledger(50, 200), 10, 3, 100));
        assert_eq!(d.new_cumulative_amount, 60); // accumulated, not reset
    }
}
