//! `PolicyAuthority` — multisig members + threshold for sensitive policy mutations.

use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PolicyAuthority {
    pub payer_agent_asset:  Pubkey,           // off  8..40
    pub bump:               u8,               // off 40
    pub threshold:          u8,               // off 41 — default 2
    pub member_count:       u8,               // off 42 — 1..=7 in v1
    pub _pad0:              u8,               // off 43
    pub members:            [Pubkey; 7],      // off 44..268 — first 7 members
    pub _reserved:          [u8; 4],          // off 268..272
}

impl PolicyAuthority {
    /// PDA seeds: `[b"policy_authority", payer_agent_asset]`.
    pub const SEED_PREFIX: &'static [u8] = b"policy_authority";
}
