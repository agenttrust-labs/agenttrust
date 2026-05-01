//! External-program adapters.
//!
//! AgentTrust does not depend on Quantu's Cargo crates — instead we read their
//! PDA accounts via manual byte-offset deserialisation (Pattern B per
//! `docs/plan/research/02-anchor-token2022-cpi-class.md §A`). This decouples
//! AgentTrust from Quantu's `anchor-lang = "0.31.1"` lock and survives any
//! Quantu-internal layout migrations as long as the documented byte offsets
//! and a `schema_version` canary continue to hold.
//!
//! Each submodule exposes:
//! - **Pinned program ID constants** (`<NAME>_ID`).
//! - **Byte-offset constants** for the fields we read.
//! - **A `*View` plain-data struct** — the parsed result, decoupled from on-
//!   chain account types so policy modules stay pure-Rust testable.
//! - **A `read_*_view(&UncheckedAccount) -> Result<Option<View>>`** parser
//!   that returns `Ok(None)` for uninitialised accounts and `Err(...)` for
//!   tampered / wrong-owner / size-mismatch / schema-mismatch accounts.

pub mod agent_registry;
pub mod atom_engine;
