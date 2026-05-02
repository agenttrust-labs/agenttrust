use anchor_lang::prelude::*;

use crate::errors::ValidationRegistryError;
use crate::events::AttestorRegistered;
use crate::state::AttestorProfile;

const MAX_DISPLAY_NAME_URI_LEN: usize = 100;

#[derive(Accounts)]
pub struct RegisterAttestor<'info> {
    #[account(mut)]
    pub attestor: Signer<'info>,

    #[account(
        init,
        payer = attestor,
        space = 8 + AttestorProfile::INIT_SPACE,
        seeds = [AttestorProfile::SEED_PREFIX, attestor.key().as_ref()],
        bump,
    )]
    pub attestor_profile: Account<'info, AttestorProfile>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx:              Context<RegisterAttestor>,
    display_name_uri: String,
) -> Result<()> {
    require!(
        display_name_uri.len() <= MAX_DISPLAY_NAME_URI_LEN,
        ValidationRegistryError::UriTooLong,
    );

    let profile = &mut ctx.accounts.attestor_profile;
    profile.attestor                  = ctx.accounts.attestor.key();
    profile.display_name_uri          = display_name_uri;
    profile.total_attestations        = 0;
    profile.total_revoked_by_attestor = 0;
    profile.total_revoked_externally  = 0;
    profile.registered_at             = Clock::get()?.slot;
    profile.bump                      = ctx.bumps.attestor_profile;

    emit!(AttestorRegistered { attestor: ctx.accounts.attestor.key() });
    Ok(())
}
