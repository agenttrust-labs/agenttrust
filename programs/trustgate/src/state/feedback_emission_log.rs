//! `FeedbackEmissionLog` — per-payment idempotency record.
//!
//! Created via Anchor's `init` constraint, which fails on second creation
//! attempt (account-already-in-use). This is the ONLY mechanism preventing
//! double-emission on tx retry: the log MUST be created in the same tx as
//! the give_feedback CPI; if creation succeeds, the CPI must succeed too,
//! or the entire tx reverts (atomicity).
//!
//! Seeds: `[b"feedback_log", payment_id_hash]`. Caller computes the hash
//! by SHA-256 over their off-chain payment_id string.

use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct FeedbackEmissionLog {
    pub payment_id_hash: [u8; 32], // off  8..40 — caller-supplied payment ID hash
    pub bump: u8,                  // off 40
    pub score: u8,                 // off 41 — score that was emitted
    pub is_dispute: u8,            // off 42 — 1 = dispute path, 0 = emit_feedback path
    pub _pad0: [u8; 5],            // off 43..48 — align next u64
    pub emitted_at_slot: u64,      // off 48..56
    pub _reserved: [u8; 16],       // off 56..72 — future expansion
}

impl FeedbackEmissionLog {
    /// PDA seeds: `[b"feedback_log", payment_id_hash]`.
    pub const SEED_PREFIX: &'static [u8] = b"feedback_log";
}
