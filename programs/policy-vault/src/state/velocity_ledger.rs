//! `VelocityLedger` — sliding-window cumulative-spend counter.
//!
//! Written only on the Allow branch of `gate_payment` to satisfy Kani
//! invariant 2 (`velocity_counter_le_limit`).

use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct VelocityLedger {
    pub payer_agent_asset: Pubkey, // off  8..40
    pub policy_id: u32,            // off 40..44
    pub bump: u8,                  // off 44
    pub _pad0: [u8; 3],            // off 45..48
    pub cumulative_amount: u64,    // off 48..56 — sum across active window
    pub last_commit_slot: u64,     // off 56..64 — slot of last Allow
    pub window_start_slot: u64,    // off 64..72 — first commit slot in current window
    pub _reserved: [u8; 8],        // off 72..80
}

impl VelocityLedger {
    /// PDA seeds: `[b"velocity", payer_agent_asset, policy_id_le_bytes]`.
    pub const SEED_PREFIX: &'static [u8] = b"velocity";
}
