//! `dispute_payment` — emit a NEGATIVE-score feedback (score = `DISPUTE_SCORE`,
//! tag1 = "dispute") rather than revoking the original feedback. Per playbook
//! §C.4: revocations are events-only; new negative feedback is the canonical
//! "downstream consumers see and react to" signal.
//!
//! Same idempotency pattern as `emit_feedback`: `FeedbackEmissionLog::init`
//! per `payment_id_hash` blocks double-disputes on tx retry.

use anchor_lang::prelude::*;

use crate::constants::{DISPUTE_SCORE, DISPUTE_TAG1};
use crate::errors::TrustGateError;
use crate::events::PaymentDisputed;
use crate::ext::agent_registry::{
    invoke_give_feedback, GiveFeedbackAccounts, GiveFeedbackArgs,
};
use crate::state::{FeedbackEmissionLog, TrustGateAuthority};

const ZERO_HASH: [u8; 32] = [0u8; 32];

#[derive(Accounts)]
#[instruction(payment_id_hash: [u8; 32], facilitator: Pubkey)]
pub struct DisputePayment<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [TrustGateAuthority::SEED_PREFIX, facilitator.as_ref()],
        bump = authority.bump,
        constraint = authority.facilitator == facilitator,
    )]
    pub authority: Account<'info, TrustGateAuthority>,

    #[account(
        init,
        payer = payer,
        space = 8 + FeedbackEmissionLog::INIT_SPACE,
        seeds = [FeedbackEmissionLog::SEED_PREFIX, &payment_id_hash],
        bump,
    )]
    pub emission_log: Account<'info, FeedbackEmissionLog>,

    pub system_program: Program<'info, System>,
}

pub fn handler<'info>(
    ctx:                 Context<'info, DisputePayment<'info>>,
    payment_id_hash:     [u8; 32],
    facilitator:         Pubkey,
    payee_asset:         Pubkey,
    dispute_reason_hash: [u8; 32],
    feedback_uri:        String,
) -> Result<()> {
    // Auth: only the facilitator can file disputes under their own authority.
    // Same rationale as emit_feedback — protects on-chain reputation from
    // forged negative feedback.
    require_keys_eq!(
        ctx.accounts.payer.key(),
        facilitator,
        TrustGateError::FacilitatorSignerMismatch,
    );

    require!(dispute_reason_hash != ZERO_HASH, TrustGateError::DisputeReasonRequired);
    require!(feedback_uri.len() <= 256,        TrustGateError::UriTooLong);

    let now_slot = Clock::get()?.slot;

    // Encode the dispute reason hash hex into tag2 for off-chain consumers.
    // Tags are bounded 32 bytes; first 16 hex chars of the hash fit cleanly.
    let tag2 = hex_prefix(&dispute_reason_hash, 8);

    let args = GiveFeedbackArgs {
        value:              0,
        value_decimals:     0,
        score:              Some(DISPUTE_SCORE),
        feedback_file_hash: Some(dispute_reason_hash),
        tag1:               String::from(DISPUTE_TAG1),
        tag2,
        endpoint:           String::from(""),
        feedback_uri,
    };

    let bump = ctx.accounts.authority.bump;
    let signer_seeds: &[&[u8]] = &[
        TrustGateAuthority::SEED_PREFIX,
        facilitator.as_ref(),
        &[bump],
    ];

    let cpi_accounts = unpack_cpi_accounts(
        ctx.remaining_accounts,
        &ctx.accounts.authority.to_account_info(),
    )?;
    invoke_give_feedback(&cpi_accounts, &args, signer_seeds)?;

    let log = &mut ctx.accounts.emission_log;
    log.payment_id_hash = payment_id_hash;
    log.bump            = ctx.bumps.emission_log;
    log.score           = DISPUTE_SCORE;
    log.is_dispute      = 1;
    log._pad0           = [0u8; 5];
    log.emitted_at_slot = now_slot;
    log._reserved       = [0u8; 16];

    let auth = &mut ctx.accounts.authority;
    auth.dispute_count = auth.dispute_count.saturating_add(1);

    emit!(PaymentDisputed {
        facilitator,
        payee_asset,
        payment_id_hash,
        dispute_reason_hash,
        slot: now_slot,
    });
    Ok(())
}

fn hex_prefix(bytes: &[u8; 32], n: usize) -> String {
    const HEX: &[u8] = b"0123456789abcdef";
    let mut out = String::with_capacity(n * 2);
    for b in bytes.iter().take(n) {
        out.push(HEX[(b >> 4) as usize] as char);
        out.push(HEX[(b & 0x0F) as usize] as char);
    }
    out
}

fn unpack_cpi_accounts<'info>(
    remaining: &[AccountInfo<'info>],
    client:    &AccountInfo<'info>,
) -> Result<GiveFeedbackAccounts<'info>> {
    require!(remaining.len() >= 4, TrustGateError::AgentRegistryProgramMismatch);

    let agent_account  = remaining[0].clone();
    let asset          = remaining[1].clone();
    let collection     = remaining[2].clone();
    let system_program = remaining[3].clone();

    let (atom_config, atom_stats, atom_engine_program, registry_authority) =
        if remaining.len() >= 8 {
            (
                Some(remaining[4].clone()),
                Some(remaining[5].clone()),
                Some(remaining[6].clone()),
                Some(remaining[7].clone()),
            )
        } else {
            (None, None, None, None)
        };

    Ok(GiveFeedbackAccounts {
        client: client.clone(),
        agent_account,
        asset,
        collection,
        system_program,
        atom_config,
        atom_stats,
        atom_engine_program,
        registry_authority,
    })
}
