//! `PolicyAccount` — config + lazy counters for a single (agent, policy_id) pair.
//!
//! Byte layout matches `plan/research/04-policyvault-build-playbook.md §B.1`.
//! Field order is load-bearing: Borsh serialises tightly in declaration order,
//! so every offset comment below must stay in sync with the playbook table.

use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PolicyAccount {
    pub payer_agent_asset: Pubkey, // off  8..40  — the agent these policies gate
    pub policy_id: u32,            // off 40..44  — per-agent policy index
    pub bump: u8,                  // off 44      — PDA bump
    pub _pad0: [u8; 3],            // off 45..48  — alignment
    pub enabled_kinds_bitmask: u8, // off 48      — KIND_* flags from constants
    pub gate_mode: u8,             // off 49      — GATE_MODE_*
    pub spending_per_tx_max: u64,  // off 50..58
    pub spending_daily_max: u64,   // off 58..66
    pub spending_weekly_max: u64,  // off 66..74
    pub spending_today_used: u64,  // off 74..82
    pub spending_week_used: u64,   // off 82..90
    pub spending_today_anchor: u64, // off 90..98  — day index since 1970-01-01
    pub spending_week_anchor: u64, // off 98..106 — week index since 1970-01-05 (Mon)
    pub velocity_window_secs: u64, // off 106..114
    pub velocity_max_in_window: u64, // off 114..122
    pub velocity_tier0_decay_factor: u64, // off 122..130 — bp (10000 = 1.0)
    pub min_counterparty_tier: u8, // off 130
    pub max_risk_score: u8,        // off 131     — 255 = no constraint
    pub min_confidence: u16,       // off 132..134 — 0..=10000
    pub default_unrated_treatment: u8, // off 134     — UNRATED_*
    pub required_capability_hash: [u8; 32], // off 135..167 — zeros = unset
    pub accepted_attestors: [Pubkey; 2], // off 167..231 — zeros = permissionless
    pub scope_kind: u8,            // off 231     — SCOPE_*
    pub _reserved: [u8; 8],        // off 232..240 — future expansion
}

impl PolicyAccount {
    /// PDA seeds: `[b"policy", payer_agent_asset, policy_id_le_bytes]`.
    pub const SEED_PREFIX: &'static [u8] = b"policy";

    pub fn is_kind_enabled(&self, kind_flag: u8) -> bool {
        (self.enabled_kinds_bitmask & kind_flag) != 0
    }
}
