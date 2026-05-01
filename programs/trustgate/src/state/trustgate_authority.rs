//! `TrustGateAuthority` — per-facilitator authority PDA. Signs the CPI to
//! `agent_registry_8004::give_feedback` via PDA-signer seeds
//! `[b"trustgate_auth", facilitator_pubkey, &[bump]]`. The facilitator
//! pubkey IS the principal of this authority — different facilitators
//! (Dexter, atxp_ai, MCPay) each get their own PDA, so feedback emission
//! is namespaced per-facilitator on-chain.

use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct TrustGateAuthority {
    pub facilitator:     Pubkey,    // off  8..40 — external facilitator wallet
    pub bump:            u8,        // off 40
    pub _pad0:           [u8; 7],   // off 41..48 — align next u64
    pub feedback_count:  u64,       // off 48..56 — total successful give_feedback CPIs
    pub dispute_count:   u64,       // off 56..64 — total dispute_payment CPIs
    pub created_at_slot: u64,       // off 64..72
    pub _reserved:       [u8; 32],  // off 72..104 — future expansion
}

impl TrustGateAuthority {
    /// PDA seeds: `[b"trustgate_auth", facilitator]`.
    pub const SEED_PREFIX: &'static [u8] = b"trustgate_auth";
}
