//! `init_authority` — create a `TrustGateAuthority` PDA per facilitator.
//!
//! Seeds derive against the facilitator pubkey, so each facilitator
//! (Dexter, atxp_ai, MCPay, …) owns a separate authority. Anyone can
//! invoke this once per facilitator; the `init` constraint prevents
//! re-initialisation.

use anchor_lang::prelude::*;

use crate::events::AuthorityInitialized;
use crate::state::TrustGateAuthority;

#[derive(Accounts)]
#[instruction(facilitator: Pubkey)]
pub struct InitAuthority<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + TrustGateAuthority::INIT_SPACE,
        seeds = [TrustGateAuthority::SEED_PREFIX, facilitator.as_ref()],
        bump,
    )]
    pub authority: Account<'info, TrustGateAuthority>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitAuthority>, facilitator: Pubkey) -> Result<()> {
    let now_slot = Clock::get()?.slot;
    let auth = &mut ctx.accounts.authority;
    auth.facilitator = facilitator;
    auth.bump = ctx.bumps.authority;
    auth._pad0 = [0u8; 7];
    auth.feedback_count = 0;
    auth.dispute_count = 0;
    auth.created_at_slot = now_slot;
    auth._reserved = [0u8; 32];

    emit!(AuthorityInitialized {
        facilitator,
        authority: ctx.accounts.authority.key(),
        slot: now_slot,
    });
    Ok(())
}
