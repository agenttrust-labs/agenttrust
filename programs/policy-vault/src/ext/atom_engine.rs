//! Manual byte-offset reader for Quantu's `atom-engine::AtomStats` PDA.
//!
//! Pinned to commit `bfb09ad` (per `docs/plan/research/01-quantu-source-code-class.md §B.5`).
//! The 8-byte Borsh discriminator at offset 0..8 is irrelevant for our reads —
//! all field offsets below are absolute (account-data-relative).

use anchor_lang::prelude::*;

use crate::errors::PolicyVaultError;

// ---------------------------------------------------------------------------
// Pinned program ID — devnet target (deploy cluster = devnet for v1).
// Localnet [test.validator.clone] uses the mainnet ID; if that becomes the
// deploy target later, swap this constant + redeploy.
// ---------------------------------------------------------------------------
pub const ATOM_ENGINE_ID: Pubkey = pubkey!("AToMufS4QD6hEXvcvBDg9m1AHeCLpmZQsyfYa5h9MwAF");

// ---------------------------------------------------------------------------
// Byte-offset constants — DO NOT re-derive; verified against pinned commit.
// ---------------------------------------------------------------------------
pub const ATOM_STATS_SIZE: usize = 561;
pub const ATOM_STATS_RISK_SCORE_OFFSET: usize = 549;
pub const ATOM_STATS_TRUST_TIER_OFFSET: usize = 551; // immediate (v1 demo default)
pub const ATOM_STATS_TIER_CONFIRMED_OFFSET: usize = 555; // post-vesting (production mode)
pub const ATOM_STATS_CONFIDENCE_OFFSET: usize = 557; // u16 LE — bytes 557..559
pub const ATOM_STATS_SCHEMA_VERSION_OFFSET: usize = 560;
pub const ATOM_STATS_SCHEMA_VERSION_EXPECTED: u8 = 1;

/// Maximum tier value per ATOM spec. A tier byte above this is fail-loud
/// (`AtomStatsSchemaMismatch`) — if Quantu ever extends the tier range we
/// want a typed error, not a silent clamp that could mask a repurposed
/// tier value (e.g., tier 5 = banned).
pub const ATOM_TIER_MAX: u8 = 4;

// ---------------------------------------------------------------------------
// Parsed view — plain data, no Anchor types. Lets policy modules stay pure-Rust.
// ---------------------------------------------------------------------------
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct AtomStatsView {
    pub tier_immediate: u8,
    pub tier_confirmed: u8,
    pub risk_score: u8,
    pub confidence: u16,
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/// Parse an `AtomStats` account into an `AtomStatsView`.
///
/// Returns:
/// - `Ok(None)` — account uninitialised (lamports == 0 or empty data).
///   The caller (policy module) maps this to `Unrated` per its policy config.
/// - `Ok(Some(view))` — account is well-formed and matches the pinned schema.
/// - `Err(PolicyVaultError::*)` — account exists but fails owner / size /
///   schema-version / tier-range checks. Fail-loud so a Quantu schema bump
///   or a tampered account can't silently pass through.
pub fn read_atom_stats_view(account: &UncheckedAccount) -> Result<Option<AtomStatsView>> {
    // Uninitialised: no rent OR no data → return None for graceful degradation.
    if account.lamports() == 0 || account.data_is_empty() {
        return Ok(None);
    }

    // Owner: must be the pinned atom-engine program.
    require_keys_eq!(
        *account.owner,
        ATOM_ENGINE_ID,
        PolicyVaultError::AtomStatsWrongOwner,
    );

    // Borrow data tight; drop before any subsequent &mut on related accounts.
    let data = account.try_borrow_data()?;
    let view = parse_atom_stats_bytes(&data)?;
    Ok(Some(view))
}

/// Pure-bytes parser. Extracted so Rust unit tests can construct synthetic
/// AtomStats buffers and exercise every error path without an Anchor harness.
pub fn parse_atom_stats_bytes(data: &[u8]) -> Result<AtomStatsView> {
    require!(
        data.len() == ATOM_STATS_SIZE,
        PolicyVaultError::AtomStatsSizeMismatch,
    );
    require!(
        data[ATOM_STATS_SCHEMA_VERSION_OFFSET] == ATOM_STATS_SCHEMA_VERSION_EXPECTED,
        PolicyVaultError::AtomStatsSchemaMismatch,
    );

    let tier_immediate = data[ATOM_STATS_TRUST_TIER_OFFSET];
    let tier_confirmed = data[ATOM_STATS_TIER_CONFIRMED_OFFSET];
    let risk_score = data[ATOM_STATS_RISK_SCORE_OFFSET];
    let confidence = u16::from_le_bytes([
        data[ATOM_STATS_CONFIDENCE_OFFSET],
        data[ATOM_STATS_CONFIDENCE_OFFSET + 1],
    ]);

    // Fail-loud on tier > MAX rather than silently clamp. The schema_version
    // canary above already caught structural changes; a tier byte outside the
    // documented 0..=4 range here implies tampering or a Quantu spec change
    // that needs human review before we keep gating payments.
    require!(
        tier_immediate <= ATOM_TIER_MAX,
        PolicyVaultError::AtomStatsSchemaMismatch,
    );
    require!(
        tier_confirmed <= ATOM_TIER_MAX,
        PolicyVaultError::AtomStatsSchemaMismatch,
    );

    Ok(AtomStatsView {
        tier_immediate,
        tier_confirmed,
        risk_score,
        confidence,
    })
}

// ---------------------------------------------------------------------------
// Tests — exercise every error path with synthetic buffers.
// ---------------------------------------------------------------------------
#[cfg(test)]
mod tests {
    use super::*;

    /// Build a 561-byte AtomStats with the given field values.
    fn synth_atom_stats(
        risk_score: u8,
        tier_immediate: u8,
        tier_confirmed: u8,
        confidence: u16,
        schema_version: u8,
    ) -> Vec<u8> {
        let mut buf = vec![0u8; ATOM_STATS_SIZE];
        buf[ATOM_STATS_RISK_SCORE_OFFSET] = risk_score;
        buf[ATOM_STATS_TRUST_TIER_OFFSET] = tier_immediate;
        buf[ATOM_STATS_TIER_CONFIRMED_OFFSET] = tier_confirmed;
        let conf = confidence.to_le_bytes();
        buf[ATOM_STATS_CONFIDENCE_OFFSET] = conf[0];
        buf[ATOM_STATS_CONFIDENCE_OFFSET + 1] = conf[1];
        buf[ATOM_STATS_SCHEMA_VERSION_OFFSET] = schema_version;
        buf
    }

    #[test]
    fn happy_path_extracts_all_fields() {
        let buf = synth_atom_stats(42, 3, 2, 8500, 1);
        let view = parse_atom_stats_bytes(&buf).unwrap();
        assert_eq!(view.risk_score, 42);
        assert_eq!(view.tier_immediate, 3);
        assert_eq!(view.tier_confirmed, 2);
        assert_eq!(view.confidence, 8500);
    }

    #[test]
    fn rejects_size_mismatch_short() {
        let buf = vec![0u8; 100];
        let err = parse_atom_stats_bytes(&buf).unwrap_err();
        assert_eq!(format!("{:?}", err).contains("AtomStatsSizeMismatch"), true);
    }

    #[test]
    fn rejects_size_mismatch_long() {
        let buf = vec![0u8; 1024];
        let err = parse_atom_stats_bytes(&buf).unwrap_err();
        assert_eq!(format!("{:?}", err).contains("AtomStatsSizeMismatch"), true);
    }

    #[test]
    fn rejects_schema_version_zero() {
        let buf = synth_atom_stats(0, 0, 0, 0, 0);
        let err = parse_atom_stats_bytes(&buf).unwrap_err();
        assert_eq!(
            format!("{:?}", err).contains("AtomStatsSchemaMismatch"),
            true
        );
    }

    #[test]
    fn rejects_schema_version_two() {
        // Quantu v0.7.0 canary — fail loud rather than silently misread fields.
        let buf = synth_atom_stats(10, 2, 1, 5000, 2);
        let err = parse_atom_stats_bytes(&buf).unwrap_err();
        assert_eq!(
            format!("{:?}", err).contains("AtomStatsSchemaMismatch"),
            true
        );
    }

    #[test]
    fn rejects_tier_immediate_above_max() {
        // Fail-loud rather than clamp — a tier byte outside 0..=4 with
        // schema_version == 1 implies tampering or an undeclared spec change.
        let buf = synth_atom_stats(0, /*tier_imm*/ 5, /*tier_conf*/ 0, 0, 1);
        let err = parse_atom_stats_bytes(&buf).unwrap_err();
        assert_eq!(
            format!("{:?}", err).contains("AtomStatsSchemaMismatch"),
            true
        );
    }

    #[test]
    fn rejects_tier_confirmed_above_max() {
        let buf = synth_atom_stats(0, /*tier_imm*/ 0, /*tier_conf*/ 9, 0, 1);
        let err = parse_atom_stats_bytes(&buf).unwrap_err();
        assert_eq!(
            format!("{:?}", err).contains("AtomStatsSchemaMismatch"),
            true
        );
    }

    #[test]
    fn allows_tier_at_max_boundary() {
        let buf = synth_atom_stats(0, /*tier_imm*/ 4, /*tier_conf*/ 4, 0, 1);
        let view = parse_atom_stats_bytes(&buf).unwrap();
        assert_eq!(view.tier_immediate, 4);
        assert_eq!(view.tier_confirmed, 4);
    }

    #[test]
    fn confidence_is_little_endian() {
        // 0x1234 in LE should be [0x34, 0x12]; we want to read it back as 0x1234.
        let mut buf = synth_atom_stats(0, 0, 0, 0, 1);
        buf[ATOM_STATS_CONFIDENCE_OFFSET] = 0x34;
        buf[ATOM_STATS_CONFIDENCE_OFFSET + 1] = 0x12;
        let view = parse_atom_stats_bytes(&buf).unwrap();
        assert_eq!(view.confidence, 0x1234);
    }

    #[test]
    fn confidence_zero_passes() {
        let buf = synth_atom_stats(0, 0, 0, 0, 1);
        let view = parse_atom_stats_bytes(&buf).unwrap();
        assert_eq!(view.confidence, 0);
    }

    #[test]
    fn confidence_max_u16_passes() {
        let buf = synth_atom_stats(0, 0, 0, u16::MAX, 1);
        let view = parse_atom_stats_bytes(&buf).unwrap();
        assert_eq!(view.confidence, u16::MAX);
    }

    #[test]
    fn pinned_devnet_program_id() {
        // Sanity-check the pinned constant. If Quantu rotates devnet IDs,
        // this test fails loud and we know to update.
        assert_eq!(
            ATOM_ENGINE_ID.to_string(),
            "AToMufS4QD6hEXvcvBDg9m1AHeCLpmZQsyfYa5h9MwAF",
        );
    }
}
