//! ValidationRegistry — third leg of the ERC-8004 trust stack on Solana.
//!
//! Quantu archived this in `8004-solana` v0.5.0 due to spam-DoS concerns.
//! AgentTrust productizes it: 4 PDAs + 5 instructions, permissionless
//! namespace + attestor registration, downstream-consumer-filtered sybil
//! resistance. The headline read target is `ValidationAttestation`, which
//! PolicyVault's `RequireValidation` policy reads directly via byte-offset
//! parser at `policy-vault/src/ext/validation_registry.rs`.
//!
//! See `docs/plan/research/06-validation-registry-class.md` for the full
//! design + sybil-resistance literature review.

use anchor_lang::prelude::*;

declare_id!("Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv");

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

pub use instructions::register_attestor::RegisterAttestor;
pub use instructions::register_namespace::RegisterNamespace;
pub use instructions::request_validation::RequestValidation;
pub use instructions::respond_to_validation::RespondToValidation;
pub use instructions::revoke_validation::RevokeValidation;

pub(crate) use instructions::register_attestor::__client_accounts_register_attestor;
pub(crate) use instructions::register_namespace::__client_accounts_register_namespace;
pub(crate) use instructions::request_validation::__client_accounts_request_validation;
pub(crate) use instructions::respond_to_validation::__client_accounts_respond_to_validation;
pub(crate) use instructions::revoke_validation::__client_accounts_revoke_validation;

#[program]
pub mod validation_registry {
    use super::*;

    /// Register a capability namespace. Permissionless — anyone can call.
    /// Spam deterrent: rent (~0.0023 SOL).
    /// Caller MUST compute `namespace_hash = SHA256(name_utf8)` off-chain.
    pub fn register_namespace(
        ctx:            Context<RegisterNamespace>,
        namespace_hash: [u8; 32],
        name:           String,
        version:        String,
        schema_uri:     String,
    ) -> Result<()> {
        instructions::register_namespace::handler(ctx, namespace_hash, name, version, schema_uri)
    }

    /// Self-register as an attestor. Permissionless. Sybil deterrent: rent
    /// + lack of downstream-consumer trust (PolicyVault filters by attestor).
    pub fn register_attestor(
        ctx:              Context<RegisterAttestor>,
        display_name_uri: String,
    ) -> Result<()> {
        instructions::register_attestor::handler(ctx, display_name_uri)
    }

    /// Open a validation request for an agent. Subject's owner OR any third
    /// party can call. Off-chain attestors discover via the `RequestCreated`
    /// event.
    pub fn request_validation(
        ctx:             Context<RequestValidation>,
        subject_asset:   Pubkey,
        capability_hash: [u8; 32],
        claim_uri_hash:  [u8; 32],
        deadline:        u64,
    ) -> Result<()> {
        instructions::request_validation::handler(
            ctx, subject_asset, capability_hash, claim_uri_hash, deadline,
        )
    }

    /// Attestor responds with an Ed25519-signed attestation. Sysvar
    /// verification at instruction index `current - 1` (mirrors Quantu's
    /// `set_agent_wallet` pattern). Domain-separated message:
    /// `AGENTTRUST_ATTEST || subject || cap || payload || expires`.
    pub fn respond_to_validation(
        ctx:                Context<RespondToValidation>,
        subject_asset:      Pubkey,
        capability_hash:    [u8; 32],
        claim_payload_hash: [u8; 32],
        claim_uri_hash:     [u8; 32],
        expires_at:         u64,
    ) -> Result<()> {
        instructions::respond_to_validation::handler(
            ctx, subject_asset, capability_hash, claim_payload_hash,
            claim_uri_hash, expires_at,
        )
    }

    /// Original attestor revokes their own attestation. Sets `revoked=true`
    /// (audit-trail preserving — accounts are not closed).
    pub fn revoke_validation(
        ctx:                    Context<RevokeValidation>,
        subject_asset:          Pubkey,
        capability_hash:        [u8; 32],
        revocation_reason_hash: [u8; 32],
    ) -> Result<()> {
        instructions::revoke_validation::handler(
            ctx, subject_asset, capability_hash, revocation_reason_hash,
        )
    }
}
