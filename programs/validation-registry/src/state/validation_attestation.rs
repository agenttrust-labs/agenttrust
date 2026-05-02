//! `ValidationAttestation` — the headline read target.
//!
//! Created by an attestor responding to a validation request. PolicyVault's
//! `RequireValidation` policy reads this PDA directly via byte-offset parser
//! at `policy-vault/src/ext/validation_registry.rs`.
//!
//! Field declaration order is LOAD-BEARING — must match the byte offsets
//! the policy-vault parser hard-codes (`VA_SUBJECT_ASSET_OFFSET = 8`,
//! `VA_CAPABILITY_HASH_OFFSET = 40`, `VA_ATTESTOR_OFFSET = 72`,
//! `VA_EXPIRES_AT_OFFSET = 208`, `VA_REVOKED_OFFSET = 216`). Reordering
//! these fields silently breaks PolicyVault's reads.

use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ValidationAttestation {
    pub subject_asset:          Pubkey,        // off  8..40   (parser: 8)
    pub capability_hash:        [u8; 32],      // off 40..72   (parser: 40)
    pub attestor:               Pubkey,        // off 72..104  (parser: 72)
    pub claim_payload_hash:     [u8; 32],      // off 104..136
    pub attestor_signature:     [u8; 64],      // off 136..200 — Ed25519 sig
    pub issued_at:              u64,           // off 200..208
    pub expires_at:             u64,           // off 208..216 (parser: 208) — 0 = never
    pub revoked:                bool,          // off 216      (parser: 216)
    pub revoked_at:             u64,           // off 217..225
    pub revocation_reason_hash: [u8; 32],      // off 225..257
    pub claim_uri_hash:         [u8; 32],      // off 257..289
    pub bump:                   u8,            // off 289
}

impl ValidationAttestation {
    pub const SEED_PREFIX: &'static [u8] = b"attestation";
}
