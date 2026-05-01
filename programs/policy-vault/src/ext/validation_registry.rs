//! Manual byte-offset reader for our own `validation-registry::ValidationAttestation` PDA.
//!
//! validation-registry is the third AgentTrust program (built in Phase 8).
//! Phase 4 ships only the READER side — composer's `RequireValidation`
//! policy needs to inspect attestation accounts even before the
//! validation-registry program has any instructions implemented.
//!
//! Byte layout pinned per `docs/plan/research/04-policyvault-build-playbook.md §C.4`
//! and `docs/plan/research/03-erc8004-validation-registry-archaeology.md §I.1`.

use anchor_lang::prelude::*;

use crate::errors::PolicyVaultError;

// ---------------------------------------------------------------------------
// Pinned program ID — devnet target. Matches Anchor.toml [programs.devnet].
// ---------------------------------------------------------------------------
pub const VALIDATION_REGISTRY_ID: Pubkey = pubkey!("Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv");

// ---------------------------------------------------------------------------
// Byte-offset constants (account-data-relative — discriminator is 0..8).
// ---------------------------------------------------------------------------
pub const VALIDATION_ATTESTATION_SIZE:        usize = 290;
pub const VA_SUBJECT_ASSET_OFFSET:            usize = 8;    // Pubkey
pub const VA_CAPABILITY_HASH_OFFSET:          usize = 40;   // [u8; 32]
pub const VA_ATTESTOR_OFFSET:                 usize = 72;   // Pubkey
pub const VA_EXPIRES_AT_OFFSET:               usize = 208;  // u64 LE
pub const VA_REVOKED_OFFSET:                  usize = 216;  // bool

// ---------------------------------------------------------------------------
// View struct — plain data, no Anchor types.
// ---------------------------------------------------------------------------
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ValidationAttestationView {
    pub subject_asset:   Pubkey,
    pub capability_hash: [u8; 32],
    pub attestor:        Pubkey,
    pub expires_at:      u64,    // 0 = never expires
    pub revoked:         bool,
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/// Parse a `ValidationAttestation` account into a `ValidationAttestationView`.
///
/// Returns:
/// - `Ok(None)` — account uninitialised (lamports == 0 or empty data).
///   Composer maps this to `RequireValidation(capability_hash)` when the
///   policy's `required_capability_hash` is set.
/// - `Ok(Some(view))` — account is well-formed.
/// - `Err(PolicyVaultError::*)` — wrong owner or size mismatch.
pub fn read_validation_attestation_view(
    account: &UncheckedAccount,
) -> Result<Option<ValidationAttestationView>> {
    if account.lamports() == 0 || account.data_is_empty() {
        return Ok(None);
    }

    require_keys_eq!(
        *account.owner,
        VALIDATION_REGISTRY_ID,
        PolicyVaultError::AttestationWrongOwner,
    );

    let data = account.try_borrow_data()?;
    let view = parse_validation_attestation_bytes(&data)?;
    Ok(Some(view))
}

/// Pure-bytes parser. Lets unit tests construct synthetic 290-byte buffers
/// and exercise every error path without an Anchor harness.
pub fn parse_validation_attestation_bytes(data: &[u8]) -> Result<ValidationAttestationView> {
    require!(
        data.len() == VALIDATION_ATTESTATION_SIZE,
        PolicyVaultError::AttestationSizeMismatch,
    );

    let subject_asset   = read_pubkey(data, VA_SUBJECT_ASSET_OFFSET);
    let capability_hash = read_bytes32(data, VA_CAPABILITY_HASH_OFFSET);
    let attestor        = read_pubkey(data, VA_ATTESTOR_OFFSET);
    let expires_at      = u64::from_le_bytes(read_bytes8(data, VA_EXPIRES_AT_OFFSET));
    let revoked         = data[VA_REVOKED_OFFSET] != 0;

    Ok(ValidationAttestationView {
        subject_asset,
        capability_hash,
        attestor,
        expires_at,
        revoked,
    })
}

#[inline]
fn read_pubkey(data: &[u8], offset: usize) -> Pubkey {
    let mut bytes = [0u8; 32];
    bytes.copy_from_slice(&data[offset..offset + 32]);
    Pubkey::new_from_array(bytes)
}

#[inline]
fn read_bytes32(data: &[u8], offset: usize) -> [u8; 32] {
    let mut bytes = [0u8; 32];
    bytes.copy_from_slice(&data[offset..offset + 32]);
    bytes
}

#[inline]
fn read_bytes8(data: &[u8], offset: usize) -> [u8; 8] {
    let mut bytes = [0u8; 8];
    bytes.copy_from_slice(&data[offset..offset + 8]);
    bytes
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
#[cfg(test)]
mod tests {
    use super::*;

    fn pk(byte: u8) -> Pubkey {
        let mut bytes = [0u8; 32];
        bytes[0] = byte;
        Pubkey::new_from_array(bytes)
    }

    fn synth(
        subject:   Pubkey,
        cap_hash:  [u8; 32],
        attestor:  Pubkey,
        expires:   u64,
        revoked:   bool,
    ) -> Vec<u8> {
        let mut buf = vec![0u8; VALIDATION_ATTESTATION_SIZE];
        buf[VA_SUBJECT_ASSET_OFFSET..VA_SUBJECT_ASSET_OFFSET + 32].copy_from_slice(subject.as_ref());
        buf[VA_CAPABILITY_HASH_OFFSET..VA_CAPABILITY_HASH_OFFSET + 32].copy_from_slice(&cap_hash);
        buf[VA_ATTESTOR_OFFSET..VA_ATTESTOR_OFFSET + 32].copy_from_slice(attestor.as_ref());
        buf[VA_EXPIRES_AT_OFFSET..VA_EXPIRES_AT_OFFSET + 8].copy_from_slice(&expires.to_le_bytes());
        buf[VA_REVOKED_OFFSET] = revoked as u8;
        buf
    }

    #[test]
    fn happy_path_extracts_all_fields() {
        let cap_hash = [0xAB; 32];
        let buf = synth(pk(1), cap_hash, pk(2), 1_000_000, false);
        let view = parse_validation_attestation_bytes(&buf).unwrap();
        assert_eq!(view.subject_asset,   pk(1));
        assert_eq!(view.capability_hash, cap_hash);
        assert_eq!(view.attestor,        pk(2));
        assert_eq!(view.expires_at,      1_000_000);
        assert_eq!(view.revoked,         false);
    }

    #[test]
    fn revoked_flag_extracted() {
        let buf = synth(pk(1), [0; 32], pk(2), 0, true);
        let view = parse_validation_attestation_bytes(&buf).unwrap();
        assert_eq!(view.revoked, true);
    }

    #[test]
    fn expires_at_zero_is_never_expires_marker() {
        let buf = synth(pk(1), [0; 32], pk(2), 0, false);
        let view = parse_validation_attestation_bytes(&buf).unwrap();
        assert_eq!(view.expires_at, 0);
    }

    #[test]
    fn rejects_size_mismatch_short() {
        let buf = vec![0u8; 100];
        let err = parse_validation_attestation_bytes(&buf).unwrap_err();
        assert!(format!("{:?}", err).contains("AttestationSizeMismatch"));
    }

    #[test]
    fn rejects_size_mismatch_long() {
        let buf = vec![0u8; 1024];
        let err = parse_validation_attestation_bytes(&buf).unwrap_err();
        assert!(format!("{:?}", err).contains("AttestationSizeMismatch"));
    }

    #[test]
    fn pubkey_le_round_trip_at_offsets() {
        let buf = synth(pk(7), [0; 32], pk(11), 0, false);
        let view = parse_validation_attestation_bytes(&buf).unwrap();
        assert_eq!(view.subject_asset, pk(7));
        assert_eq!(view.attestor,      pk(11));
    }

    #[test]
    fn expires_at_max_u64_passes() {
        let buf = synth(pk(1), [0; 32], pk(2), u64::MAX, false);
        let view = parse_validation_attestation_bytes(&buf).unwrap();
        assert_eq!(view.expires_at, u64::MAX);
    }

    #[test]
    fn pinned_devnet_program_id() {
        assert_eq!(
            VALIDATION_REGISTRY_ID.to_string(),
            "Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv",
        );
    }
}
