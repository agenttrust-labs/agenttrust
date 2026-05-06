//! `init_authority` — create a `PolicyAuthority` PDA for an agent asset.
//!
//! v1 multisig: 1..=7 members, 1..=member_count threshold, no duplicates.
//! Caller MUST include themselves in the members list — without that,
//! `init_policy` (which requires payer ∈ authority.members) becomes
//! unreachable for this agent.
//!
//! Reference: docs/plan/research/04-policyvault-build-playbook.md §B.4, §F.1

use anchor_lang::prelude::*;

use crate::constants::{AUTHORITY_MEMBERS_MAX, AUTHORITY_MEMBERS_MIN};
use crate::errors::PolicyVaultError;
use crate::state::PolicyAuthority;

#[derive(Accounts)]
#[instruction(payer_agent_asset: Pubkey)]
pub struct InitAuthority<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + PolicyAuthority::INIT_SPACE,
        seeds = [PolicyAuthority::SEED_PREFIX, payer_agent_asset.as_ref()],
        bump,
    )]
    pub policy_authority: Account<'info, PolicyAuthority>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitAuthority>,
    payer_agent_asset: Pubkey,
    members: Vec<Pubkey>,
    threshold: u8,
) -> Result<()> {
    // SECURITY: anyone can call init_authority for any payer_agent_asset.
    // Caller-must-include-self below is the v1 weak guard — race-condition
    // exposure is the same as Phase 1 init_policy. Phase 4 hardens this with
    // a cross-program AgentAccount.owner read against agent-registry-8004.

    let count = members.len();
    require!(
        count >= AUTHORITY_MEMBERS_MIN as usize && count <= AUTHORITY_MEMBERS_MAX as usize,
        PolicyVaultError::MemberCountOutOfRange,
    );
    require!(threshold >= 1, PolicyVaultError::ThresholdExceedsMembers);
    require!(
        (threshold as usize) <= count,
        PolicyVaultError::ThresholdExceedsMembers
    );

    // Reject duplicates — a duplicated member silently lowers the effective
    // signer floor (e.g., [A, A, B] threshold=2 is functionally 2-of-2, not 2-of-3).
    for i in 0..count {
        for j in (i + 1)..count {
            require!(
                members[i] != members[j],
                PolicyVaultError::DuplicateAuthorityMember,
            );
        }
    }

    // Caller must be in their own multisig — otherwise init_policy is
    // immediately unreachable for this agent.
    require!(
        members.iter().any(|m| *m == ctx.accounts.payer.key()),
        PolicyVaultError::MemberNotInAuthority,
    );

    let authority = &mut ctx.accounts.policy_authority;
    authority.payer_agent_asset = payer_agent_asset;
    authority.bump = ctx.bumps.policy_authority;
    authority.threshold = threshold;
    authority.member_count = count as u8;
    authority._pad0 = 0;

    let mut fixed = [Pubkey::default(); AUTHORITY_MEMBERS_MAX as usize];
    for (i, m) in members.iter().enumerate() {
        fixed[i] = *m;
    }
    authority.members = fixed;
    authority._reserved = [0u8; 4];

    Ok(())
}
