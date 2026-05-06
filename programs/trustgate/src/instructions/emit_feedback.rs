//! `emit_feedback` — PDA-signed CPI to `agent_registry_8004::give_feedback`.
//!
//! Idempotency: the `FeedbackEmissionLog` PDA is `init`-only, keyed by
//! `payment_id_hash`. A second emit attempt for the same payment_id fails
//! at the init constraint (account-already-in-use) — there is no recovery
//! path, which is exactly the desired property: a successful CPI mints
//! exactly one feedback per payment.

use anchor_lang::prelude::*;

use crate::errors::TrustGateError;
use crate::events::FeedbackEmitted;
use crate::ext::agent_registry::{invoke_give_feedback, GiveFeedbackAccounts, GiveFeedbackArgs};
use crate::state::{FeedbackEmissionLog, TrustGateAuthority};

const MAX_TAG_LEN: usize = 32;
const MAX_ENDPOINT_LEN: usize = 64;
const MAX_URI_LEN: usize = 256;
const MAX_SCORE: u8 = 100;

#[derive(Accounts)]
#[instruction(payment_id_hash: [u8; 32], facilitator: Pubkey)]
pub struct EmitFeedback<'info> {
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
    // The CPI accounts (give_feedback's account list) come through
    // `ctx.remaining_accounts` in the order documented in
    // `ext/agent_registry.rs::GiveFeedbackAccounts`. The handler unpacks +
    // validates them. This avoids reproducing Quantu's PDA constraints in
    // our IDL while still letting `invoke_signed` verify the CPI accounts.
}

pub fn handler<'info>(
    ctx: Context<'info, EmitFeedback<'info>>,
    payment_id_hash: [u8; 32],
    facilitator: Pubkey,
    payee_asset: Pubkey,
    score: u8,
    tag1: String,
    tag2: String,
    endpoint: String,
    feedback_uri: String,
) -> Result<()> {
    // Auth: only the facilitator can emit feedback under their own authority.
    // Without this, anyone could emit fake feedback (positive or negative)
    // as any facilitator's PDA — a real attack against on-chain reputation.
    require_keys_eq!(
        ctx.accounts.payer.key(),
        facilitator,
        TrustGateError::FacilitatorSignerMismatch,
    );

    require!(score <= MAX_SCORE, TrustGateError::ScoreOutOfRange);
    require!(tag1.len() <= MAX_TAG_LEN, TrustGateError::TagTooLong);
    require!(tag2.len() <= MAX_TAG_LEN, TrustGateError::TagTooLong);
    require!(
        endpoint.len() <= MAX_ENDPOINT_LEN,
        TrustGateError::EndpointTooLong
    );
    require!(
        feedback_uri.len() <= MAX_URI_LEN,
        TrustGateError::UriTooLong
    );

    let now_slot = Clock::get()?.slot;

    // Build give_feedback args.
    let args = GiveFeedbackArgs {
        value: 0,
        value_decimals: 0,
        score: Some(score),
        feedback_file_hash: None,
        tag1,
        tag2,
        endpoint,
        feedback_uri,
    };

    // PDA-sign the CPI with TrustGate's authority seeds.
    let bump = ctx.accounts.authority.bump;
    let signer_seeds: &[&[u8]] = &[
        TrustGateAuthority::SEED_PREFIX,
        facilitator.as_ref(),
        &[bump],
    ];

    // Unpack remaining_accounts → GiveFeedbackAccounts. The Express service /
    // SDK is responsible for ordering them per the ext::agent_registry doc.
    let cpi_accounts = unpack_cpi_accounts(
        ctx.remaining_accounts,
        &ctx.accounts.authority.to_account_info(),
    )?;
    invoke_give_feedback(&cpi_accounts, &args, signer_seeds)?;

    // Write the idempotency log. Audit-trail URI is captured in the
    // FeedbackEmitted event below — keeping the log compact.
    let log = &mut ctx.accounts.emission_log;
    log.payment_id_hash = payment_id_hash;
    log.bump = ctx.bumps.emission_log;
    log.score = score;
    log.is_dispute = 0;
    log._pad0 = [0u8; 5];
    log.emitted_at_slot = now_slot;
    log._reserved = [0u8; 16];

    let auth = &mut ctx.accounts.authority;
    auth.feedback_count = auth.feedback_count.saturating_add(1);

    emit!(FeedbackEmitted {
        facilitator,
        payee_asset,
        payment_id_hash,
        score,
        slot: now_slot,
    });

    Ok(())
}

/// Unpack the `remaining_accounts` slice into the CPI's expected positional
/// account list. Required: 4 accounts (agent_account, asset, collection,
/// system_program). Optional: 4 ATOM accounts in declared order. Caller's
/// responsibility to pass them correctly; we only assert minimum count.
fn unpack_cpi_accounts<'info>(
    remaining: &[AccountInfo<'info>],
    client: &AccountInfo<'info>,
) -> Result<GiveFeedbackAccounts<'info>> {
    require!(
        remaining.len() >= 4,
        TrustGateError::AgentRegistryProgramMismatch
    );

    let agent_account = remaining[0].clone();
    let asset = remaining[1].clone();
    let collection = remaining[2].clone();
    let system_program = remaining[3].clone();

    // Optional ATOM accounts come in pairs of 4. Either all 4 or none.
    let (atom_config, atom_stats, atom_engine_program, registry_authority) = if remaining.len() >= 8
    {
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
