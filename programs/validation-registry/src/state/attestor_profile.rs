//! `AttestorProfile` — per-attestor on-chain history for downstream-consumer-
//! filterable trust weights. Self-registered (permissionless); rent + reputation
//! are the only sybil deterrents in v1. v1.1+ adds stake-weighted scoring.

use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct AttestorProfile {
    pub attestor: Pubkey, // self-reference
    #[max_len(100)]
    pub display_name_uri: String, // IPFS/HTTP link to attestor metadata
    pub total_attestations: u64, // counter, all-time
    pub total_revoked_by_attestor: u64, // self-revoked
    pub total_revoked_externally: u64, // reserved for v1.1+ external revoke flow
    pub registered_at: u64,
    pub bump: u8,
}

impl AttestorProfile {
    pub const SEED_PREFIX: &'static [u8] = b"attestor";
}
