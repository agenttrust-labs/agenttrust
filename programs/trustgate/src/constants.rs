//! Compile-time constants. Pinned against Quantu's agent-registry-8004
//! commit `bfb09ad` (per `docs/plan/research/01-quantu-source-code-class.md`).

use anchor_lang::prelude::*;

// ---------------------------------------------------------------------------
// Pinned program IDs — devnet target.
// ---------------------------------------------------------------------------
pub const AGENT_REGISTRY_ID: Pubkey = pubkey!("8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C");
pub const ATOM_ENGINE_ID: Pubkey = pubkey!("AToMufS4QD6hEXvcvBDg9m1AHeCLpmZQsyfYa5h9MwAF");

// ---------------------------------------------------------------------------
// Anchor CPI discriminator for `agent_registry_8004::give_feedback`.
// Hardcoded per playbook §A.1 / Wave 1 #1 binary verification. Build-time
// alarm: a unit test recomputes this against the documented sighash
// algorithm and flags loud if Quantu rotates the instruction name.
// ---------------------------------------------------------------------------
pub const GIVE_FEEDBACK_DISCRIMINATOR: [u8; 8] = [145, 136, 123, 3, 215, 165, 98, 41];

// ---------------------------------------------------------------------------
// agent-registry-8004 internal authority PDA — used to PDA-sign the CPI to
// atom-engine inside give_feedback. TrustGate just passes its address; the
// signing happens internally to agent-registry.
// ---------------------------------------------------------------------------
pub const REGISTRY_AUTHORITY_SEED: &[u8] = b"atom_cpi_authority";

// ---------------------------------------------------------------------------
// Dispute scoring — per playbook §C.4 / spec.
// ---------------------------------------------------------------------------
pub const DISPUTE_SCORE: u8 = 20;
/// Tag string emitted on dispute_payment.
pub const DISPUTE_TAG1: &str = "dispute";
