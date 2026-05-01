//! `set_killswitch` — multisig-gated pause / unpause.
//!
//! Caller passes (a) one explicit `signer` (also the tx fee payer) and
//! (b) any additional members as `remaining_accounts` with `is_signer = true`.
//! The handler counts distinct members from `policy_authority.members` that
//! signed and requires the count to meet `threshold`.
//!
//! Phase 3 ships PerAgent scope only (matching `init_killswitch`).
//! Timelock on unpause (playbook §F.4) is a v1.1+ deliverable; v1
//! lets `threshold` signers flip the bit without delay in either direction.

use anchor_lang::prelude::*;

use crate::constants::SCOPE_PER_AGENT;
use crate::errors::PolicyVaultError;
use crate::events::KillSwitchTriggered;
use crate::state::{KillSwitchState, PolicyAuthority};

const PER_AGENT_SCOPE_DISCRIMINATOR: [u8; 1] = [SCOPE_PER_AGENT];

#[derive(Accounts)]
#[instruction(payer_agent_asset: Pubkey)]
pub struct SetKillSwitch<'info> {
    /// The lead signer — pays tx fee AND counts as one of the multisig signers.
    /// Must be in `policy_authority.members`.
    pub signer: Signer<'info>,

    #[account(
        seeds = [PolicyAuthority::SEED_PREFIX, payer_agent_asset.as_ref()],
        bump = policy_authority.bump,
    )]
    pub policy_authority: Account<'info, PolicyAuthority>,

    #[account(
        mut,
        seeds = [
            KillSwitchState::SEED_PREFIX,
            &PER_AGENT_SCOPE_DISCRIMINATOR,
            payer_agent_asset.as_ref(),
        ],
        bump = kill_switch_state.bump,
    )]
    pub kill_switch_state: Account<'info, KillSwitchState>,
}

pub fn handler(
    ctx: Context<SetKillSwitch>,
    _payer_agent_asset: Pubkey,
    paused: bool,
) -> Result<()> {
    let auth = &ctx.accounts.policy_authority;
    let lead_key = ctx.accounts.signer.key();

    // Lead signer must be in members. Stricter than threshold-only — the
    // public-face fee payer ought to be one of the authority's principals.
    require!(
        auth.is_member(&lead_key),
        PolicyVaultError::MemberNotInAuthority,
    );

    // Collect all signing pubkeys: lead + every signer in remaining_accounts.
    // Non-signer accounts in remaining_accounts are rejected up front; we
    // don't error on non-member signers (they just don't count).
    let mut signer_keys: Vec<Pubkey> =
        Vec::with_capacity(1 + ctx.remaining_accounts.len());
    signer_keys.push(lead_key);
    for acct in ctx.remaining_accounts.iter() {
        require!(acct.is_signer, PolicyVaultError::MemberNotInAuthority);
        signer_keys.push(*acct.key);
    }

    // Pure-fn dedup + member-count: see PolicyAuthority::count_distinct_signing_members.
    let distinct_signer_count = auth.count_distinct_signing_members(&signer_keys);

    require!(
        distinct_signer_count >= auth.threshold,
        PolicyVaultError::MultisigThresholdNotMet,
    );

    let now_slot = Clock::get()?.slot;
    let kill = &mut ctx.accounts.kill_switch_state;
    kill.paused = paused;
    if paused {
        kill.paused_at_slot = now_slot;
        kill.paused_by      = lead_key;
    } else {
        kill.unpaused_at_slot = now_slot;
    }

    emit!(KillSwitchTriggered {
        scope_kind:   kill.scope_kind,
        scope_key:    kill.scope_key,
        paused,
        triggered_by: lead_key,
        slot:         now_slot,
    });

    Ok(())
}
