//! `KillSwitchState` — emergency multisig pause flag (Global / PerCollection / PerAgent).

use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct KillSwitchState {
    pub scope_kind: u8,        // off  8 — SCOPE_*
    pub bump: u8,              // off  9
    pub paused: bool,          // off 10 — the bit
    pub _pad0: u8,             // off 11
    pub _pad1: [u8; 4],        // off 12..16 — align next u64
    pub scope_key: [u8; 32],   // off 16..48 — zeros for Global
    pub paused_at_slot: u64,   // off 48..56
    pub unpaused_at_slot: u64, // off 56..64
    pub paused_by: Pubkey,     // off 64..96
}

impl KillSwitchState {
    /// PDA seeds: `[b"killswitch", &[scope_kind], scope_key]`.
    pub const SEED_PREFIX: &'static [u8] = b"killswitch";
}
