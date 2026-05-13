//! Compile-time constants. Pinned against Quantu's agent-registry-8004
//! commit `bfb09ad` (per `docs/plan/research/01-quantu-source-code-class.md`).

use anchor_lang::prelude::*;

// ---------------------------------------------------------------------------
// Pinned program IDs — devnet target.
// ---------------------------------------------------------------------------
pub const AGENT_REGISTRY_ID: Pubkey = pubkey!("8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C");
pub const ATOM_ENGINE_ID: Pubkey = pubkey!("AToMufS4QD6hEXvcvBDg9m1AHeCLpmZQsyfYa5h9MwAF");
/// MPL Core program ID — Quantu's `register_with_options` CPIs into
/// `mpl_core::create_v1` to mint the asset into `base_collection`. Pinned
/// per `tests/trustgate.spec.ts:134` + `examples/pay-sh-demo/scripts/prewarm-devnet.ts`.
pub const MPL_CORE_PROGRAM_ID: Pubkey = pubkey!("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d");

// ---------------------------------------------------------------------------
// Anchor CPI discriminator for `agent_registry_8004::give_feedback`.
// Hardcoded per playbook §A.1 / Wave 1 #1 binary verification. Build-time
// alarm: a unit test recomputes this against the documented sighash
// algorithm and flags loud if Quantu rotates the instruction name.
// ---------------------------------------------------------------------------
pub const GIVE_FEEDBACK_DISCRIMINATOR: [u8; 8] = [145, 136, 123, 3, 215, 165, 98, 41];

/// Anchor CPI discriminator for `agent_registry_8004::register_with_options`.
/// Pinned against the same Quantu commit as `GIVE_FEEDBACK_DISCRIMINATOR`;
/// verified against the live devnet program via the test harness in
/// `tests/trustgate.spec.ts:138` and the prewarm script in
/// `examples/pay-sh-demo/scripts/prewarm-devnet.ts:60`. TrustGate exposes
/// this as `register_agent_via_cpi` so callers learn only AgentTrust's surface.
pub const REGISTER_WITH_OPTIONS_DISCRIMINATOR: [u8; 8] = [177, 175, 96, 41, 59, 166, 13, 6];

/// Anchor CPI discriminator for `atom_engine::initialize_stats`. Sourced
/// from `examples/pay-sh-demo/scripts/prewarm-devnet.ts:61` and cross-checked
/// against `tests/trustgate.spec.ts:139`. The Quantu onboarding path runs
/// `register_with_options` (agent-registry) followed by `initialize_stats`
/// (atom-engine) to make an agent fully atom-functional. TrustGate's
/// `register_agent_via_cpi` chains both CPIs so callers only see one surface.
pub const INITIALIZE_STATS_DISCRIMINATOR: [u8; 8] = [144, 201, 117, 76, 127, 118, 176, 16];

/// atom-engine `AtomConfig` PDA seed (`[b"atom_config"]`).
pub const ATOM_CONFIG_SEED: &[u8] = b"atom_config";
/// atom-engine `AtomStats` PDA seed (`[b"atom_stats", asset]`).
pub const ATOM_STATS_SEED: &[u8] = b"atom_stats";

// ---------------------------------------------------------------------------
// agent-registry-8004 internal authority PDA — used to PDA-sign the CPI to
// atom-engine inside give_feedback. TrustGate just passes its address; the
// signing happens internally to agent-registry.
// ---------------------------------------------------------------------------
pub const REGISTRY_AUTHORITY_SEED: &[u8] = b"atom_cpi_authority";

/// agent-registry-8004 `RootConfig` PDA seed (`[b"root_config"]`).
pub const ROOT_CONFIG_SEED: &[u8] = b"root_config";
/// agent-registry-8004 `RegistryConfig` PDA seed (`[b"registry_config", base_collection]`).
pub const REGISTRY_CONFIG_SEED: &[u8] = b"registry_config";
/// agent-registry-8004 `AgentAccount` PDA seed (`[b"agent", asset]`).
pub const AGENT_ACCOUNT_SEED: &[u8] = b"agent";

// ---------------------------------------------------------------------------
// Dispute scoring — per playbook §C.4 / spec.
// ---------------------------------------------------------------------------
pub const DISPUTE_SCORE: u8 = 20;
/// Tag string emitted on dispute_payment.
pub const DISPUTE_TAG1: &str = "dispute";
