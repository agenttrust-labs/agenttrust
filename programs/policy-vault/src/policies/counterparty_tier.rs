//! CounterpartyTier policy — the wedge.
//!
//! Gates the payee's `AtomStats.trust_tier` against `min_counterparty_tier`,
//! with optional `risk_score ≤ max_risk_score` and `confidence ≥ min_confidence`
//! sub-constraints. This module is pure-Rust over an already-parsed
//! `AtomStatsView` (the parser lives in `crate::ext::atom_engine`) — keeping
//! the decision logic decoupled from Anchor account access makes it
//! Kani-provable + unit-testable without an on-chain harness.
//!
//! Reference: docs/plan/research/04-policyvault-build-playbook.md §C.2

use crate::constants::{
    GATE_MODE_CONFIRMED, GATE_MODE_IMMEDIATE, UNRATED_ALLOW, UNRATED_DENY,
    UNRATED_REQUIRE_VALIDATION,
};
use crate::ext::atom_engine::AtomStatsView;
use crate::state::{DenyReason, PolicyAccount};

// ---------------------------------------------------------------------------
// Snapshot — what the policy needs from PolicyAccount
// ---------------------------------------------------------------------------
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct CounterpartyState {
    pub gate_mode: u8, // GATE_MODE_*
    pub min_tier: u8,
    pub max_risk_score: u8, // 255 = no constraint
    pub min_confidence: u16,
    pub default_unrated_treatment: u8, // UNRATED_*
}

impl From<&PolicyAccount> for CounterpartyState {
    fn from(p: &PolicyAccount) -> Self {
        CounterpartyState {
            gate_mode: p.gate_mode,
            min_tier: p.min_counterparty_tier,
            max_risk_score: p.max_risk_score,
            min_confidence: p.min_confidence,
            default_unrated_treatment: p.default_unrated_treatment,
        }
    }
}

// ---------------------------------------------------------------------------
// Outcome — three-way result. Composer maps `Unrated` to Allow / Deny /
// RequireValidation per the policy's `default_unrated_treatment`.
// ---------------------------------------------------------------------------
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CounterpartyOutcome {
    Allow,
    Deny(DenyReason),
    Unrated,
}

/// Resolve `CounterpartyOutcome::Unrated` to a concrete decision based on the
/// policy's `default_unrated_treatment`. Returned by the composer in Phase 4.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum UnratedResolution {
    Allow,
    Deny,
    RequireValidation,
}

pub fn resolve_unrated(treatment: u8) -> UnratedResolution {
    match treatment {
        UNRATED_ALLOW => UnratedResolution::Allow,
        UNRATED_REQUIRE_VALIDATION => UnratedResolution::RequireValidation,
        // UNRATED_DENY (0) — and any unrecognised byte — falls through to Deny.
        // InitPolicyArgs::validate() rejects bad encodings on input, so an
        // unrecognised value here implies on-chain corruption: Deny is the safe
        // landing.
        _ => UnratedResolution::Deny,
    }
}

// ---------------------------------------------------------------------------
// Pure decision function
// ---------------------------------------------------------------------------

/// Evaluate CounterpartyTier against a parsed `AtomStatsView`.
///
/// `view = None` → `Unrated` (account uninitialised). Composer applies
/// `default_unrated_treatment`.
pub fn evaluate(state: CounterpartyState, view: Option<AtomStatsView>) -> CounterpartyOutcome {
    let view = match view {
        Some(v) => v,
        None => return CounterpartyOutcome::Unrated,
    };

    // Pick the right tier byte per gate_mode. Anything other than the two
    // documented modes is treated as Confirmed (the conservative choice).
    let tier = match state.gate_mode {
        GATE_MODE_IMMEDIATE => view.tier_immediate,
        GATE_MODE_CONFIRMED => view.tier_confirmed,
        _ => view.tier_confirmed,
    };

    if tier < state.min_tier {
        return CounterpartyOutcome::Deny(DenyReason::CounterpartyTierBelowMin);
    }

    // Risk constraint disabled when max_risk_score == 255 (sentinel).
    if state.max_risk_score < 255 && view.risk_score > state.max_risk_score {
        return CounterpartyOutcome::Deny(DenyReason::CounterpartyRiskAboveMax);
    }

    // Confidence constraint disabled when min_confidence == 0.
    if state.min_confidence > 0 && view.confidence < state.min_confidence {
        return CounterpartyOutcome::Deny(DenyReason::CounterpartyConfidenceBelow);
    }

    CounterpartyOutcome::Allow
}

// ---------------------------------------------------------------------------
// Tests — pure-Rust, no Anchor harness
// ---------------------------------------------------------------------------
#[cfg(test)]
mod tests {
    use super::*;

    fn cfg(gate_mode: u8, min_tier: u8, max_risk: u8, min_conf: u16) -> CounterpartyState {
        CounterpartyState {
            gate_mode,
            min_tier,
            max_risk_score: max_risk,
            min_confidence: min_conf,
            default_unrated_treatment: UNRATED_DENY,
        }
    }

    fn view(tier_imm: u8, tier_conf: u8, risk: u8, conf: u16) -> AtomStatsView {
        AtomStatsView {
            tier_immediate: tier_imm,
            tier_confirmed: tier_conf,
            risk_score: risk,
            confidence: conf,
        }
    }

    #[test]
    fn allow_when_tier_meets_minimum() {
        let s = cfg(GATE_MODE_IMMEDIATE, 2, 255, 0);
        let v = view(3, 1, 0, 0);
        assert_eq!(evaluate(s, Some(v)), CounterpartyOutcome::Allow);
    }

    #[test]
    fn deny_when_tier_below_min() {
        let s = cfg(GATE_MODE_IMMEDIATE, 2, 255, 0);
        let v = view(1, 4, 0, 0);
        assert_eq!(
            evaluate(s, Some(v)),
            CounterpartyOutcome::Deny(DenyReason::CounterpartyTierBelowMin),
        );
    }

    #[test]
    fn unrated_when_view_is_none() {
        let s = cfg(GATE_MODE_IMMEDIATE, 2, 255, 0);
        assert_eq!(evaluate(s, None), CounterpartyOutcome::Unrated);
    }

    #[test]
    fn gate_mode_immediate_uses_tier_immediate() {
        let s = cfg(GATE_MODE_IMMEDIATE, 3, 255, 0);
        let v = view(/*imm*/ 3, /*conf*/ 1, 0, 0); // imm pass, conf fail
        assert_eq!(evaluate(s, Some(v)), CounterpartyOutcome::Allow);
    }

    #[test]
    fn gate_mode_confirmed_uses_tier_confirmed() {
        let s = cfg(GATE_MODE_CONFIRMED, 3, 255, 0);
        let v = view(/*imm*/ 4, /*conf*/ 2, 0, 0); // imm pass, conf fail
        assert_eq!(
            evaluate(s, Some(v)),
            CounterpartyOutcome::Deny(DenyReason::CounterpartyTierBelowMin),
        );
    }

    #[test]
    fn risk_constraint_disabled_when_max_is_255() {
        let s = cfg(GATE_MODE_IMMEDIATE, 0, 255, 0);
        let v = view(0, 0, /*high risk*/ 200, 0);
        assert_eq!(evaluate(s, Some(v)), CounterpartyOutcome::Allow);
    }

    #[test]
    fn risk_constraint_active_when_max_below_255() {
        let s = cfg(GATE_MODE_IMMEDIATE, 0, /*max*/ 50, 0);
        let v = view(0, 0, /*risk*/ 80, 0);
        assert_eq!(
            evaluate(s, Some(v)),
            CounterpartyOutcome::Deny(DenyReason::CounterpartyRiskAboveMax),
        );
    }

    #[test]
    fn risk_at_max_allows() {
        let s = cfg(GATE_MODE_IMMEDIATE, 0, 50, 0);
        let v = view(0, 0, 50, 0);
        assert_eq!(evaluate(s, Some(v)), CounterpartyOutcome::Allow);
    }

    #[test]
    fn confidence_constraint_disabled_when_min_is_zero() {
        let s = cfg(GATE_MODE_IMMEDIATE, 0, 255, 0);
        let v = view(0, 0, 0, /*conf*/ 100);
        assert_eq!(evaluate(s, Some(v)), CounterpartyOutcome::Allow);
    }

    #[test]
    fn confidence_below_min_denies() {
        let s = cfg(GATE_MODE_IMMEDIATE, 0, 255, /*min*/ 5000);
        let v = view(0, 0, 0, /*conf*/ 4500);
        assert_eq!(
            evaluate(s, Some(v)),
            CounterpartyOutcome::Deny(DenyReason::CounterpartyConfidenceBelow),
        );
    }

    #[test]
    fn confidence_at_min_allows() {
        let s = cfg(GATE_MODE_IMMEDIATE, 0, 255, 5000);
        let v = view(0, 0, 0, 5000);
        assert_eq!(evaluate(s, Some(v)), CounterpartyOutcome::Allow);
    }

    #[test]
    fn fail_fast_tier_before_risk_before_confidence() {
        // All three would fail; we should see TierBelowMin first.
        let s = cfg(
            GATE_MODE_IMMEDIATE,
            /*min_tier*/ 3,
            /*max_risk*/ 50,
            /*min_conf*/ 5000,
        );
        let v = view(/*imm*/ 1, 0, /*risk*/ 200, /*conf*/ 100);
        assert_eq!(
            evaluate(s, Some(v)),
            CounterpartyOutcome::Deny(DenyReason::CounterpartyTierBelowMin),
        );
    }

    #[test]
    fn unrecognised_gate_mode_falls_back_to_confirmed() {
        // Defensive: byte 49 should always be 0 or 1 (validated at init), but
        // if on-chain corruption ever yields anything else we want the SAFER
        // tier (tier_confirmed) — sybil-resistant rather than permissive.
        let s = cfg(/*invalid*/ 99, 3, 255, 0);
        let v = view(/*imm*/ 4, /*conf*/ 1, 0, 0);
        assert_eq!(
            evaluate(s, Some(v)),
            CounterpartyOutcome::Deny(DenyReason::CounterpartyTierBelowMin),
        );
    }

    // -- resolve_unrated --

    #[test]
    fn resolve_unrated_allow() {
        assert_eq!(resolve_unrated(UNRATED_ALLOW), UnratedResolution::Allow);
    }

    #[test]
    fn resolve_unrated_deny() {
        assert_eq!(resolve_unrated(UNRATED_DENY), UnratedResolution::Deny);
    }

    #[test]
    fn resolve_unrated_require_validation() {
        assert_eq!(
            resolve_unrated(UNRATED_REQUIRE_VALIDATION),
            UnratedResolution::RequireValidation
        );
    }

    #[test]
    fn resolve_unrated_unknown_falls_to_deny() {
        // Defense in depth: if on-chain byte is corrupted, default to safest path.
        assert_eq!(resolve_unrated(99), UnratedResolution::Deny);
    }
}
