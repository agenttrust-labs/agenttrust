use anchor_lang::prelude::*;

use crate::errors::ValidationRegistryError;
use crate::events::AttestationRevoked;
use crate::state::{AttestorProfile, ValidationAttestation};

#[derive(Accounts)]
#[instruction(subject_asset: Pubkey, capability_hash: [u8; 32])]
pub struct RevokeValidation<'info> {
    pub attestor: Signer<'info>,

    #[account(
        mut,
        seeds = [
            ValidationAttestation::SEED_PREFIX,
            subject_asset.as_ref(),
            capability_hash.as_ref(),
            attestor.key().as_ref(),
        ],
        bump = attestation.bump,
    )]
    pub attestation: Account<'info, ValidationAttestation>,

    #[account(
        mut,
        seeds = [AttestorProfile::SEED_PREFIX, attestor.key().as_ref()],
        bump = attestor_profile.bump,
    )]
    pub attestor_profile: Account<'info, AttestorProfile>,
}

pub fn handler(
    ctx:                  Context<RevokeValidation>,
    subject_asset:        Pubkey,
    capability_hash:      [u8; 32],
    revocation_reason_hash: [u8; 32],
) -> Result<()> {
    let att = &mut ctx.accounts.attestation;
    require!(att.attestor == ctx.accounts.attestor.key(), ValidationRegistryError::NotOriginalAttestor);
    require!(!att.revoked, ValidationRegistryError::AlreadyRevoked);

    let now_slot = Clock::get()?.slot;
    att.revoked                = true;
    att.revoked_at             = now_slot;
    att.revocation_reason_hash = revocation_reason_hash;

    let profile = &mut ctx.accounts.attestor_profile;
    profile.total_revoked_by_attestor = profile
        .total_revoked_by_attestor
        .checked_add(1)
        .ok_or(ValidationRegistryError::Overflow)?;

    emit!(AttestationRevoked {
        subject_asset,
        capability_hash,
        attestor:   ctx.accounts.attestor.key(),
        revoked_at: now_slot,
    });
    Ok(())
}
