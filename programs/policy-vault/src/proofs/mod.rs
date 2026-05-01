//! Kani formal-verification harnesses.
//!
//! Compiled and run only under `cargo kani`. Each harness asserts a
//! load-bearing invariant of the PolicyVault decision logic. Five v1
//! invariants per `docs/plan/research/04-policyvault-build-playbook.md §H`:
//!   1. `paused_implies_no_allow`     — KillSwitch paused ⇒ never Allow
//!   2. `velocity_counter_le_limit`   — post-Allow Velocity counter ≤ cap
//!   3. `counterparty_tier_monotone`  — tighter min_tier passes ⇒ looser passes
//!   4. `validation_expiry_correct`   — expired attestation cannot Allow
//!   5. `multisig_threshold_enforced` — distinct signer count ≥ threshold
//!
//! Harnesses live in pure-Rust modules so Kani never has to interpret
//! Anchor's `#[program]` macro — the Anchor wrapper (`gate_payment.rs`)
//! is a shell over `compose_decision`, and Kani proves that pure-fn
//! function directly.

#![cfg(kani)]

pub mod inv_counterparty_tier_monotone;
pub mod inv_multisig_threshold_enforced;
pub mod inv_paused_implies_no_allow;
pub mod inv_validation_expiry_correct;
pub mod inv_velocity_counter_le_limit;
pub mod smoke;
