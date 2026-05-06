use anchor_lang::prelude::*;

use crate::errors::ValidationRegistryError;
use crate::events::RequestCreated;
use crate::state::{CapabilityNamespace, ValidationRequest};

/// Max deadline horizon: 30 days. Slots ≈ 2.5 per second on Solana mainnet
/// (over-conservative). 30 * 86_400 * 2.5 ≈ 6.5M slots, well over 432_000 * 30.
const MAX_DEADLINE_SLOTS_AHEAD: u64 = 432_000 * 30;

#[derive(Accounts)]
#[instruction(subject_asset: Pubkey, capability_hash: [u8; 32])]
pub struct RequestValidation<'info> {
    #[account(mut)]
    pub requester: Signer<'info>,

    #[account(
        init,
        payer = requester,
        space = 8 + ValidationRequest::INIT_SPACE,
        seeds = [
            ValidationRequest::SEED_PREFIX,
            subject_asset.as_ref(),
            capability_hash.as_ref(),
            requester.key().as_ref(),
        ],
        bump,
    )]
    pub validation_request: Account<'info, ValidationRequest>,

    /// Capability namespace must already exist (prevents requests against
    /// undefined capabilities).
    #[account(
        seeds = [CapabilityNamespace::SEED_PREFIX, capability_hash.as_ref()],
        bump = capability_namespace.bump,
    )]
    pub capability_namespace: Account<'info, CapabilityNamespace>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RequestValidation>,
    subject_asset: Pubkey,
    capability_hash: [u8; 32],
    claim_uri_hash: [u8; 32],
    deadline: u64,
) -> Result<()> {
    let clock = Clock::get()?;
    require!(
        deadline > clock.slot,
        ValidationRegistryError::DeadlineInPast
    );
    require!(
        deadline <= clock.slot + MAX_DEADLINE_SLOTS_AHEAD,
        ValidationRegistryError::DeadlineTooFar
    );

    let req = &mut ctx.accounts.validation_request;
    req.subject_asset = subject_asset;
    req.capability_hash = capability_hash;
    req.requester = ctx.accounts.requester.key();
    req.claim_uri_hash = claim_uri_hash;
    req.created_at = clock.slot;
    req.deadline = deadline;
    req.bump = ctx.bumps.validation_request;

    emit!(RequestCreated {
        subject_asset,
        capability_hash,
        requester: ctx.accounts.requester.key(),
        deadline,
    });
    Ok(())
}
