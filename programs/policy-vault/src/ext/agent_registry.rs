//! Manual byte-offset reader for Quantu's `agent-registry-8004::AgentAccount` PDA.
//!
//! Phase 2 ships only the pinned constants + size guard. Field-level readers
//! (e.g. for `atom_enabled`, `owner`) land alongside the composer in Phase 4.
//!
//! Pinned to commit `bfb09ad` (per `docs/plan/research/01-quantu-source-code-class.md`).

use anchor_lang::prelude::*;

use crate::errors::PolicyVaultError;

// ---------------------------------------------------------------------------
// Pinned program ID — devnet target.
// ---------------------------------------------------------------------------
pub const AGENT_REGISTRY_ID: Pubkey = pubkey!("8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C");

// ---------------------------------------------------------------------------
// Byte-offset constants
// ---------------------------------------------------------------------------
pub const AGENT_ACCOUNT_SIZE: usize = 748;

// ---------------------------------------------------------------------------
// Defensive validators — reused by Phase 4 composer when reading AgentAccount.
// ---------------------------------------------------------------------------

/// Validate that an `UncheckedAccount` looks like an initialised AgentAccount.
/// Returns `Ok(())` only if owner + size match; returns the right typed error
/// otherwise. Caller decides whether `lamports() == 0` → Unrated or Deny.
pub fn require_agent_account_well_formed(account: &UncheckedAccount) -> Result<()> {
    require!(
        account.lamports() > 0,
        PolicyVaultError::AgentAccountUninitialized
    );
    require_keys_eq!(
        *account.owner,
        AGENT_REGISTRY_ID,
        PolicyVaultError::AgentAccountWrongOwner,
    );
    let data = account.try_borrow_data()?;
    require!(
        data.len() == AGENT_ACCOUNT_SIZE,
        PolicyVaultError::AgentAccountSizeMismatch,
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pinned_devnet_program_id() {
        assert_eq!(
            AGENT_REGISTRY_ID.to_string(),
            "8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C",
        );
    }

    #[test]
    fn agent_account_size_constant_matches_research() {
        // Locked 2026-04-28 in plan/research/01-quantu-source-code-class.md §A.1.
        assert_eq!(AGENT_ACCOUNT_SIZE, 748);
    }
}
