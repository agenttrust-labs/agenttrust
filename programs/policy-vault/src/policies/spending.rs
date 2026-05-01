//! Spending policy — pure decision logic.
//!
//! Gates `amount` against per-tx, daily (UTC midnight rollover), and weekly
//! (ISO Monday rollover) limits. Pure function over (config, amount, unix_ts);
//! no Anchor account access here. The composer (`gate_payment`) is the only
//! place that mutates `PolicyAccount` state — keeping this module pure makes
//! it trivially Kani-provable and testable in plain Rust.
//!
//! Reference: docs/plan/research/04-policyvault-build-playbook.md §C.1

use crate::state::{DenyReason, PolicyAccount};

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

const SECS_PER_DAY:             i64 = 86_400;
const SECS_PER_WEEK:            i64 = 7 * SECS_PER_DAY;
/// Monday 1970-01-05 00:00:00 UTC = 4 days after Unix epoch (which was Thursday).
const FIRST_MONDAY_OFFSET_SECS: i64 = 4 * SECS_PER_DAY;

#[inline]
pub fn day_index(unix_ts: i64) -> u64 {
    if unix_ts <= 0 {
        return 0;
    }
    (unix_ts / SECS_PER_DAY) as u64
}

#[inline]
pub fn week_index(unix_ts: i64) -> u64 {
    if unix_ts <= FIRST_MONDAY_OFFSET_SECS {
        return 0;
    }
    ((unix_ts - FIRST_MONDAY_OFFSET_SECS) / SECS_PER_WEEK) as u64
}

// ---------------------------------------------------------------------------
// Snapshot + outcome types — keep policy decoupled from the full PolicyAccount
// ---------------------------------------------------------------------------

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct SpendingState {
    pub per_tx_max:    u64,
    pub daily_max:     u64,
    pub weekly_max:    u64,
    pub today_used:    u64,
    pub week_used:     u64,
    pub today_anchor:  u64,
    pub week_anchor:   u64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct SpendingDeltas {
    pub new_today_used:   u64,
    pub new_week_used:    u64,
    pub new_today_anchor: u64,
    pub new_week_anchor:  u64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SpendingOutcome {
    Allow(SpendingDeltas),
    Deny(DenyReason),
}

impl From<&PolicyAccount> for SpendingState {
    fn from(p: &PolicyAccount) -> Self {
        SpendingState {
            per_tx_max:   p.spending_per_tx_max,
            daily_max:    p.spending_daily_max,
            weekly_max:   p.spending_weekly_max,
            today_used:   p.spending_today_used,
            week_used:    p.spending_week_used,
            today_anchor: p.spending_today_anchor,
            week_anchor:  p.spending_week_anchor,
        }
    }
}

// ---------------------------------------------------------------------------
// Pure decision function
// ---------------------------------------------------------------------------

/// Evaluate Spending against (`amount`, current `unix_ts`).
/// Returns deltas; caller applies them to the on-chain account on Allow.
pub fn evaluate(state: SpendingState, amount: u64, unix_ts: i64) -> SpendingOutcome {
    if amount == 0 {
        return SpendingOutcome::Allow(SpendingDeltas {
            new_today_used:   state.today_used,
            new_week_used:    state.week_used,
            new_today_anchor: state.today_anchor,
            new_week_anchor:  state.week_anchor,
        });
    }

    if amount > state.per_tx_max {
        return SpendingOutcome::Deny(DenyReason::SpendingPerTxExceeded);
    }

    let today_anchor_now = day_index(unix_ts);
    let week_anchor_now  = week_index(unix_ts);

    let today_used_effective =
        if state.today_anchor == today_anchor_now { state.today_used } else { 0 };
    let week_used_effective =
        if state.week_anchor == week_anchor_now { state.week_used } else { 0 };

    let new_today = match today_used_effective.checked_add(amount) {
        Some(v) if v <= state.daily_max => v,
        _ => return SpendingOutcome::Deny(DenyReason::SpendingDailyExceeded),
    };

    let new_week = match week_used_effective.checked_add(amount) {
        Some(v) if v <= state.weekly_max => v,
        _ => return SpendingOutcome::Deny(DenyReason::SpendingWeeklyExceeded),
    };

    SpendingOutcome::Allow(SpendingDeltas {
        new_today_used:   new_today,
        new_week_used:    new_week,
        new_today_anchor: today_anchor_now,
        new_week_anchor:  week_anchor_now,
    })
}

// ---------------------------------------------------------------------------
// Tests — pure-Rust, no Anchor program-test framework needed.
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn cfg(per_tx: u64, daily: u64, weekly: u64) -> SpendingState {
        SpendingState {
            per_tx_max:   per_tx,
            daily_max:    daily,
            weekly_max:   weekly,
            today_used:   0,
            week_used:    0,
            today_anchor: 0,
            week_anchor:  0,
        }
    }

    /// 2026-05-02 12:00:00 UTC.
    /// Verified: 2026-01-01 = 1_767_225_600; +121 days = May 2; +43_200 = noon.
    const TS_2026_MAY_02_NOON: i64 = 1_777_723_200;

    fn assert_allow(out: SpendingOutcome) -> SpendingDeltas {
        match out {
            SpendingOutcome::Allow(d) => d,
            other => panic!("expected Allow, got {:?}", other),
        }
    }

    #[test]
    fn happy_path_writes_amount_to_both_counters() {
        let d = assert_allow(evaluate(cfg(100, 200, 1000), 50, TS_2026_MAY_02_NOON));
        assert_eq!(d.new_today_used,   50);
        assert_eq!(d.new_week_used,    50);
        assert_eq!(d.new_today_anchor, day_index(TS_2026_MAY_02_NOON));
        assert_eq!(d.new_week_anchor,  week_index(TS_2026_MAY_02_NOON));
    }

    #[test]
    fn deny_per_tx_exceeded() {
        let out = evaluate(cfg(100, 1000, 10_000), 101, TS_2026_MAY_02_NOON);
        assert_eq!(out, SpendingOutcome::Deny(DenyReason::SpendingPerTxExceeded));
    }

    #[test]
    fn deny_daily_exceeded_with_existing_usage() {
        let mut s = cfg(100, 200, 10_000);
        s.today_used   = 150;
        s.today_anchor = day_index(TS_2026_MAY_02_NOON);
        // 150 + 60 = 210 > daily_max 200 → Deny
        let out = evaluate(s, 60, TS_2026_MAY_02_NOON);
        assert_eq!(out, SpendingOutcome::Deny(DenyReason::SpendingDailyExceeded));
    }

    #[test]
    fn deny_weekly_exceeded_with_existing_usage() {
        let mut s = cfg(100, 200, 500);
        s.week_used   = 480;
        s.week_anchor = week_index(TS_2026_MAY_02_NOON);
        // 480 + 25 = 505 > weekly_max 500 → Deny
        let out = evaluate(s, 25, TS_2026_MAY_02_NOON);
        assert_eq!(out, SpendingOutcome::Deny(DenyReason::SpendingWeeklyExceeded));
    }

    #[test]
    fn rollover_resets_daily_when_anchor_changes() {
        let mut s = cfg(100, 200, 10_000);
        s.today_used   = 200; // would fail today
        s.today_anchor = day_index(TS_2026_MAY_02_NOON) - 1; // yesterday
        s.week_anchor  = week_index(TS_2026_MAY_02_NOON);
        let d = assert_allow(evaluate(s, 50, TS_2026_MAY_02_NOON));
        assert_eq!(d.new_today_used,   50);
        assert_eq!(d.new_today_anchor, day_index(TS_2026_MAY_02_NOON));
    }

    #[test]
    fn rollover_resets_weekly_when_anchor_changes() {
        let mut s = cfg(100, 200, 500);
        s.week_used   = 500; // would fail this week
        s.week_anchor = week_index(TS_2026_MAY_02_NOON) - 1; // last week
        let d = assert_allow(evaluate(s, 100, TS_2026_MAY_02_NOON));
        assert_eq!(d.new_week_used,   100);
        assert_eq!(d.new_week_anchor, week_index(TS_2026_MAY_02_NOON));
    }

    #[test]
    fn zero_amount_is_no_op_allow() {
        let d = assert_allow(evaluate(cfg(100, 200, 1000), 0, TS_2026_MAY_02_NOON));
        assert_eq!(d.new_today_used, 0);
        assert_eq!(d.new_week_used,  0);
    }

    #[test]
    fn overflow_is_treated_as_daily_exceeded() {
        let mut s = cfg(u64::MAX, u64::MAX, u64::MAX);
        s.today_used   = u64::MAX;
        s.today_anchor = day_index(TS_2026_MAY_02_NOON);
        let out = evaluate(s, 1, TS_2026_MAY_02_NOON);
        assert_eq!(out, SpendingOutcome::Deny(DenyReason::SpendingDailyExceeded));
    }

    #[test]
    fn boundary_amount_equal_to_per_tx_allows() {
        let out = evaluate(cfg(100, 1000, 10_000), 100, TS_2026_MAY_02_NOON);
        assert!(matches!(out, SpendingOutcome::Allow(_)));
    }

    #[test]
    fn boundary_amount_one_over_per_tx_denies() {
        let out = evaluate(cfg(100, 1000, 10_000), 101, TS_2026_MAY_02_NOON);
        assert_eq!(out, SpendingOutcome::Deny(DenyReason::SpendingPerTxExceeded));
    }

    #[test]
    fn boundary_amount_at_daily_max_allows() {
        let s = cfg(1000, 100, 10_000);
        let out = evaluate(s, 100, TS_2026_MAY_02_NOON);
        assert!(matches!(out, SpendingOutcome::Allow(_)));
    }

    #[test]
    fn day_index_known_values() {
        assert_eq!(day_index(0), 0);                    // 1970-01-01 00:00 UTC
        assert_eq!(day_index(86_400), 1);               // 1970-01-02 00:00 UTC
        assert_eq!(day_index(TS_2026_MAY_02_NOON), 20_575);
    }

    #[test]
    fn week_index_first_monday_is_zero() {
        assert_eq!(week_index(FIRST_MONDAY_OFFSET_SECS), 0);
        assert_eq!(week_index(FIRST_MONDAY_OFFSET_SECS + SECS_PER_WEEK), 1);
        assert_eq!(week_index(0), 0); // pre-Monday-of-epoch-week clamps
    }

    #[test]
    fn negative_unix_ts_clamps_to_zero_anchors() {
        // Defensive: validators should never give us negative ts, but clamp safely.
        assert_eq!(day_index(-1), 0);
        assert_eq!(week_index(-1), 0);
    }
}
