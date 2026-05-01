//! Invariant 3 — `counterparty_tier_monotone`
//!
//! Anti-regression: if a STRICT policy (high `min_counterparty_tier`)
//! produces `Allow` for a given payee, a LOOSER policy (lower or equal
//! `min_tier`) on the same payee must also produce `Allow`. Loosening the
//! tier requirement cannot turn an Allow into a Deny.
//!
//! Proven over `counterparty_tier::evaluate` directly.

use crate::constants::GATE_MODE_IMMEDIATE;
use crate::ext::atom_engine::AtomStatsView;
use crate::policies::counterparty_tier::{evaluate, CounterpartyOutcome, CounterpartyState};

#[kani::proof]
#[kani::unwind(2)]
fn counterparty_tier_monotone() {
    // Bounds per ATOM spec — the parser already clamps tier to 0..=4 and
    // init validates min_tier ≤ 4. Keeping these tight cuts the symbolic
    // search space and matches realistic production state.
    let payee_tier_imm:    u8 = kani::any();
    let payee_tier_conf:   u8 = kani::any();
    let payee_risk:        u8 = kani::any();
    let payee_confidence: u16 = kani::any();
    kani::assume(payee_tier_imm  <= 4);
    kani::assume(payee_tier_conf <= 4);

    let strict_min_tier: u8 = kani::any();
    let loose_min_tier:  u8 = kani::any();
    kani::assume(strict_min_tier <= 4);
    kani::assume(loose_min_tier  <= strict_min_tier);

    // Other constraints are equal across both policies — only min_tier varies.
    let max_risk: u8  = kani::any();
    let min_conf: u16 = kani::any();

    let strict = CounterpartyState {
        gate_mode:                 GATE_MODE_IMMEDIATE,
        min_tier:                  strict_min_tier,
        max_risk_score:            max_risk,
        min_confidence:            min_conf,
        default_unrated_treatment: 0,
    };
    let loose = CounterpartyState {
        gate_mode:                 GATE_MODE_IMMEDIATE,
        min_tier:                  loose_min_tier,
        max_risk_score:            max_risk,
        min_confidence:            min_conf,
        default_unrated_treatment: 0,
    };

    let view = AtomStatsView {
        tier_immediate: payee_tier_imm,
        tier_confirmed: payee_tier_conf,
        risk_score:     payee_risk,
        confidence:     payee_confidence,
    };

    let strict_out = evaluate(strict, Some(view));
    let loose_out  = evaluate(loose,  Some(view));

    if matches!(strict_out, CounterpartyOutcome::Allow) {
        kani::assert(
            matches!(loose_out, CounterpartyOutcome::Allow),
            "if strict (higher min_tier) allows, loose (lower min_tier) must also allow",
        );
    }
}
