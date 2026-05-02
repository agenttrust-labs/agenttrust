//! `ValidationRequest` — open request for an attestation.
//!
//! Created by the subject's owner OR a third party. Off-chain attestors
//! discover open requests via the `RequestCreated` event. The PDA itself
//! is just an audit-trail record; attestors don't read it (they read
//! event logs). Non-responded requests past `deadline` are abandoned.

use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ValidationRequest {
    pub subject_asset:    Pubkey,
    pub capability_hash:  [u8; 32],
    pub requester:        Pubkey,         // can be subject's owner OR any third party
    pub claim_uri_hash:   [u8; 32],       // SHA256 of off-chain claim URI
    pub created_at:       u64,
    pub deadline:         u64,            // slot after which the request is "abandoned"
    pub bump:             u8,
}

impl ValidationRequest {
    pub const SEED_PREFIX: &'static [u8] = b"request";
}
