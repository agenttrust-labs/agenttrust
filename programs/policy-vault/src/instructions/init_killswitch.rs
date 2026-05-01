//! `init_killswitch` — create a per-agent `KillSwitchState` PDA.
//!
//! v1 ships PerAgent scope only. Global + PerCollection scopes are v1.1+
//! deliverables (they require a program-wide / per-collection authority
//! mechanism not designed for this submission). The byte field
//! `scope_kind` is preserved for forward-compat.
//!
//! Initial state: `paused = false`. Pause/unpause happens via
//! `set_killswitch`, which is multisig-gated against `PolicyAuthority`.

use anchor_lang::prelude::*;

use crate::constants::SCOPE_PER_AGENT;
use crate::state::KillSwitchState;

const PER_AGENT_SCOPE_DISCRIMINATOR: [u8; 1] = [SCOPE_PER_AGENT];

#[derive(Accounts)]
#[instruction(payer_agent_asset: Pubkey)]
pub struct InitKillSwitch<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + KillSwitchState::INIT_SPACE,
        seeds = [
            KillSwitchState::SEED_PREFIX,
            &PER_AGENT_SCOPE_DISCRIMINATOR,
            payer_agent_asset.as_ref(),
        ],
        bump,
    )]
    pub kill_switch_state: Account<'info, KillSwitchState>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitKillSwitch>,
    payer_agent_asset: Pubkey,
) -> Result<()> {
    let state = &mut ctx.accounts.kill_switch_state;
    state.scope_kind       = SCOPE_PER_AGENT;
    state.bump             = ctx.bumps.kill_switch_state;
    state.paused           = false;
    state._pad0            = 0;
    state._pad1            = [0u8; 4];
    state.scope_key        = payer_agent_asset.to_bytes();
    state.paused_at_slot   = 0;
    state.unpaused_at_slot = 0;
    state.paused_by        = Pubkey::default();
    Ok(())
}
