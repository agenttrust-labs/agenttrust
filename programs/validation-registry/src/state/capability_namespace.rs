//! `CapabilityNamespace` — permissionless namespace registry.
//!
//! Anyone can register a namespace (rent ~0.0023 SOL is the economic
//! deterrent). Downstream consumers (PolicyVault's RequireValidation
//! policy) decide which attestors they trust per-policy via
//! `accepted_attestors[]` — registry imposes zero gatekeeping.

use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct CapabilityNamespace {
    pub namespace_hash:  [u8; 32],          // SHA256(name_utf8); self-reference
    #[max_len(32)]
    pub name:            String,             // e.g., "kyc.tier-1"
    #[max_len(16)]
    pub version:         String,             // e.g., "v1"
    #[max_len(160)]
    pub schema_uri:      String,             // IPFS/HTTP link to JSON schema
    pub registered_at:   u64,
    pub creator:         Pubkey,
    pub bump:            u8,
}

impl CapabilityNamespace {
    pub const SEED_PREFIX: &'static [u8] = b"capability";
}
