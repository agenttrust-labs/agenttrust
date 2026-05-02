//! `respond_to_validation` — attestor creates a `ValidationAttestation` PDA.
//!
//! v1 trust model: the attestor signs the Solana transaction; the tx
//! signature itself authenticates the attestor. The `attestor_signature`
//! field on `ValidationAttestation` is reserved for v1.1+ Ed25519 sysvar
//! verification (per `docs/plan/research/01-quantu-source-code-class.md`
//! `set_agent_wallet` pattern at `identity/instructions.rs:506-541`),
//! which adds non-repudiation against future key compromise. v1 stores
//! a zeroed signature byte-array as a placeholder.

use anchor_lang::prelude::*;

use crate::errors::ValidationRegistryError;
use crate::events::AttestationCreated;
use crate::state::{
    AttestorProfile, CapabilityNamespace, ValidationAttestation,
};

#[derive(Accounts)]
#[instruction(subject_asset: Pubkey, capability_hash: [u8; 32])]
pub struct RespondToValidation<'info> {
    /// Anyone can pay for the rent.
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The attestor must sign the tx. v1.1+ adds Ed25519 sysvar verify
    /// for non-repudiation against future key compromise.
    pub attestor: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + ValidationAttestation::INIT_SPACE,
        seeds = [
            ValidationAttestation::SEED_PREFIX,
            subject_asset.as_ref(),
            capability_hash.as_ref(),
            attestor.key().as_ref(),
        ],
        bump,
    )]
    pub attestation: Account<'info, ValidationAttestation>,

    #[account(
        mut,
        seeds = [AttestorProfile::SEED_PREFIX, attestor.key().as_ref()],
        bump = attestor_profile.bump,
    )]
    pub attestor_profile: Account<'info, AttestorProfile>,

    /// Capability must exist (prevents attestations to undefined capabilities).
    #[account(
        seeds = [CapabilityNamespace::SEED_PREFIX, capability_hash.as_ref()],
        bump = capability_namespace.bump,
    )]
    pub capability_namespace: Account<'info, CapabilityNamespace>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx:                Context<RespondToValidation>,
    subject_asset:      Pubkey,
    capability_hash:    [u8; 32],
    claim_payload_hash: [u8; 32],
    claim_uri_hash:     [u8; 32],
    expires_at:         u64,
) -> Result<()> {
    let clock = Clock::get()?;
    if expires_at != 0 {
        require!(expires_at > clock.slot, ValidationRegistryError::ExpiryInPast);
    }

    let att = &mut ctx.accounts.attestation;
    att.subject_asset          = subject_asset;
    att.capability_hash        = capability_hash;
    att.attestor               = ctx.accounts.attestor.key();
    att.claim_payload_hash     = claim_payload_hash;
    // v1: zero-placeholder. v1.1+ fills with the Ed25519 sig from the
    // sysvar-verify instruction at `current_idx - 1`.
    att.attestor_signature     = [0u8; 64];
    att.issued_at              = clock.slot;
    att.expires_at             = expires_at;
    att.revoked                = false;
    att.revoked_at             = 0;
    att.revocation_reason_hash = [0u8; 32];
    att.claim_uri_hash         = claim_uri_hash;
    att.bump                   = ctx.bumps.attestation;

    let profile = &mut ctx.accounts.attestor_profile;
    profile.total_attestations = profile
        .total_attestations
        .checked_add(1)
        .ok_or(ValidationRegistryError::Overflow)?;

    emit!(AttestationCreated {
        subject_asset,
        capability_hash,
        attestor:  ctx.accounts.attestor.key(),
        expires_at,
        issued_at: clock.slot,
    });
    Ok(())
}
