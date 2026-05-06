//! Compile-time constants shared across PolicyVault modules.
//!
//! Kept in a single file (rather than per-domain) because the on-chain encoding
//! is part of the program's public ABI: clients hard-code these values when
//! constructing instructions, so co-locating them is a deliberate
//! Single-Source-of-Truth choice.

// ---------------------------------------------------------------------------
// Policy-kind bitmask flags — `PolicyAccount.enabled_kinds_bitmask`
// ---------------------------------------------------------------------------
pub const KIND_KILLSWITCH: u8 = 0x01;
pub const KIND_SPENDING: u8 = 0x02;
pub const KIND_VELOCITY: u8 = 0x04;
pub const KIND_COUNTERPARTY_TIER: u8 = 0x08;
pub const KIND_REQUIRE_VALIDATION: u8 = 0x10;

// ---------------------------------------------------------------------------
// gate_mode encoding — which AtomStats byte to read for trust_tier
// ---------------------------------------------------------------------------
/// byte 551 of AtomStats (immediate, no vesting). v1 demo default.
pub const GATE_MODE_IMMEDIATE: u8 = 0;
/// byte 555 of AtomStats (post-8-epoch vested ~20 days). Sybil-resistant production mode.
pub const GATE_MODE_CONFIRMED: u8 = 1;

// ---------------------------------------------------------------------------
// KillSwitch scope encoding
// ---------------------------------------------------------------------------
pub const SCOPE_GLOBAL: u8 = 0;
pub const SCOPE_PER_COLLECTION: u8 = 1;
pub const SCOPE_PER_AGENT: u8 = 2;

// ---------------------------------------------------------------------------
// default_unrated_treatment — what to do when AtomStats is uninitialised
// ---------------------------------------------------------------------------
pub const UNRATED_DENY: u8 = 0;
pub const UNRATED_ALLOW: u8 = 1;
pub const UNRATED_REQUIRE_VALIDATION: u8 = 2;

// ---------------------------------------------------------------------------
// PolicyAuthority bounds
// ---------------------------------------------------------------------------
/// Inclusive minimum members in a `PolicyAuthority` multisig.
pub const AUTHORITY_MEMBERS_MIN: u8 = 1;
/// Inclusive maximum members in a `PolicyAuthority` multisig (v1; v1.1+ raises to 15).
pub const AUTHORITY_MEMBERS_MAX: u8 = 7;
