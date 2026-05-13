//! `register_agent_via_cpi` — PDA-signed CPI chain into Quantu's
//! `agent_registry_8004::register_with_options` AND
//! `atom_engine::initialize_stats`.
//!
//! AgentTrust 0.4.0 hides Quantu's surface behind TrustGate. The MCP server
//! prepends this instruction into the same atomic transaction as
//! `init_policy` so a fresh wallet ends up with both a Quantu `agent_account`
//! AND an `atom_stats` PDA AND a TrustGate `Policy` after one signature. The
//! user never learns Quantu's instruction names — they call ONE TrustGate
//! instruction and end up atom-functional end-to-end.
//!
//! Why both CPIs in one TrustGate instruction: Quantu's normal onboarding
//! runs two instructions back to back (`register_with_options` then
//! `initialize_stats`; see `examples/pay-sh-demo/scripts/prewarm-devnet.ts`).
//! A fresh wallet that only ran step 1 would hit `AccountNotInitialized` on
//! `atom_stats` the first time `simulate_payment` or `emit_feedback` ran.
//! Chaining both CPIs here makes TrustGate the single orchestrator surface
//! AgentTrust users learn.
//!
//! Idempotency:
//! - `register_with_options`: if Quantu's `agent_account` PDA at
//!   `[b"agent", asset]` already exists, the CPI fails at the `init`
//!   constraint. That is the contract — the MCP self-heal layer reads the
//!   result, classifies it as "already registered", and skips the prepend on
//!   the next attempt.
//! - `initialize_stats`: same shape — if `atom_stats` at
//!   `[b"atom_stats", asset]` already exists, the CPI fails at Quantu's init
//!   constraint. In practice the only way to reach this branch is if a
//!   previous tx ran `register_with_options` + `initialize_stats` on the
//!   same asset already, in which case the first CPI in THIS instruction
//!   would also have failed first. The MCP-side pre-check (fetch of
//!   `agent_account` + `atom_stats` before submission) is the durable
//!   detect-and-skip layer; we let any CPI error propagate here.
//!
//! `remaining_accounts` ordering (extended from 5 → 8 in pass 2):
//!
//!   [0] root_config            — `[b"root_config"]`              (registry)
//!   [1] registry_config        — `[b"registry_config", base]`    (registry)
//!   [2] agent_account          — `[b"agent", asset]`             (registry, mut)
//!   [3] base_collection        — Quantu's MPL Core collection    (shared, mut)
//!   [4] mpl_core_program       — MPL Core executable             (registry)
//!   [5] atom_config            — `[b"atom_config"]`              (atom-engine)
//!   [6] atom_stats             — `[b"atom_stats", asset]`        (atom-engine, mut)
//!   [7] atom_engine_program    — atom-engine executable          (atom-engine)
//!
//! `asset`, `payer` (→ `owner` for initialize_stats), and `system_program`
//! come from the Anchor `Accounts` struct and are threaded into both CPIs
//! by the handler.

use anchor_lang::prelude::*;

use crate::constants::{ATOM_ENGINE_ID, MPL_CORE_PROGRAM_ID};
use crate::errors::TrustGateError;
use crate::events::AgentRegisteredViaCpi;
use crate::ext::agent_registry::{
    invoke_register_agent, RegisterAgentAccounts, RegisterAgentArgs,
};
use crate::ext::atom_engine::{
    invoke_initialize_stats, InitializeStatsAccounts, InitializeStatsArgs,
};
use crate::state::TrustGateAuthority;

const MAX_METADATA_URI_LEN: usize = 256;

#[derive(Accounts)]
#[instruction(asset_seed: [u8; 32])]
pub struct RegisterAgentViaCpi<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The new agent's asset Keypair must sign — Quantu's
    /// `register_with_options` requires `asset` as a signer because it mints
    /// the corresponding MPL Core asset under the same key.
    /// CHECK: signer; key is validated against `asset_seed` in the handler.
    #[account(mut, signer)]
    pub asset: UncheckedAccount<'info>,

    /// TrustGate authority PDA — used as the `invoke_signed` seed-signer for
    /// parity with `emit_feedback` / `dispute_payment`. Quantu's
    /// `register_with_options` and `initialize_stats` do not include this
    /// PDA in their account lists, so the seeds sign for an account Quantu
    /// does not require. Kept here so the MCP threads exactly the same
    /// authority through every TrustGate CPI and so future Quantu
    /// instructions can hook the same PDA.
    #[account(
        seeds = [TrustGateAuthority::SEED_PREFIX, payer.key().as_ref()],
        bump = authority.bump,
        constraint = authority.facilitator == payer.key(),
    )]
    pub authority: Account<'info, TrustGateAuthority>,

    pub system_program: Program<'info, System>,
    // The 8 Quantu CPI accounts (5 for register_with_options + 3 atom-engine-
    // specific) come through `ctx.remaining_accounts` in the order documented
    // in the module-level doc comment above. The handler unpacks + threads
    // them into both CPIs. This keeps Quantu's PDA constraints out of our
    // IDL while still letting `invoke_signed` verify the CPI accounts.
}

pub fn handler<'info>(
    ctx: Context<'info, RegisterAgentViaCpi<'info>>,
    asset_seed: [u8; 32],
    metadata_uri: String,
) -> Result<()> {
    // Defensive: asset_seed must equal the asset account's key. The seed
    // is exposed as an instruction arg so the MCP can decode the
    // AgentRegisteredViaCpi event without re-walking accounts, and so a
    // mismatched account passed via remaining_accounts fails fast rather
    // than silently registering the wrong asset.
    require!(
        ctx.accounts.asset.key().to_bytes() == asset_seed,
        TrustGateError::AssetSeedMismatch,
    );

    require!(
        metadata_uri.len() <= MAX_METADATA_URI_LEN,
        TrustGateError::MetadataUriTooLong,
    );

    let now_ts = Clock::get()?.unix_timestamp;

    // Unpack remaining_accounts → typed CPI account bundles in the declared
    // positional order. The MCP / SDK owns the ordering per the doc above.
    let unpacked = unpack_cpi_accounts(
        ctx.remaining_accounts,
        &ctx.accounts.asset.to_account_info(),
        &ctx.accounts.payer.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
    )?;

    // PDA-sign with TrustGate's authority seeds — same shape as emit_feedback.
    // Reused across both CPIs so the MCP always threads identical seeds
    // through every TrustGate CPI.
    let bump = ctx.accounts.authority.bump;
    let payer_key = ctx.accounts.payer.key();
    let signer_seeds: &[&[u8]] = &[
        TrustGateAuthority::SEED_PREFIX,
        payer_key.as_ref(),
        &[bump],
    ];

    // ---- CPI #1: register_with_options ----
    // AgentTrust 0.4.0 assumes atom-enabled agents end-to-end
    // (CounterpartyTier policy reads AtomStats, emit_feedback threads the
    // ATOM 4-tuple). Mirroring `examples/pay-sh-demo/scripts/prewarm-devnet.ts`
    // which passes `atomEnabled: true` for every demo counterparty.
    let register_args = RegisterAgentArgs {
        metadata_uri,
        atom_enabled: true,
    };
    invoke_register_agent(&unpacked.register_accounts, &register_args, signer_seeds)?;

    // ---- CPI #2: initialize_stats ----
    // Quantu's atom-engine. Creates the atom_stats PDA so the agent is
    // atom-functional from the first /verify call. If this CPI fails, the
    // whole transaction reverts — partial-state agents (registered but
    // stats-uninit) are exactly the failure mode this instruction exists
    // to prevent.
    let init_stats_args = InitializeStatsArgs::default();
    invoke_initialize_stats(
        &unpacked.initialize_stats_accounts,
        &init_stats_args,
        signer_seeds,
    )?;

    emit!(AgentRegisteredViaCpi {
        agent_asset: ctx.accounts.asset.key(),
        payer: payer_key,
        timestamp: now_ts,
    });

    Ok(())
}

/// Materialised CPI account bundles for the two Quantu calls. Kept as a
/// single struct so the unpack helper is the only place that knows the
/// positional order of `remaining_accounts`.
struct UnpackedAccounts<'info> {
    register_accounts: RegisterAgentAccounts<'info>,
    initialize_stats_accounts: InitializeStatsAccounts<'info>,
}

/// Unpack the `remaining_accounts` slice into the two CPI bundles.
/// Required: 8 accounts in the order documented at the module level:
///
///   [0] root_config
///   [1] registry_config
///   [2] agent_account
///   [3] base_collection         (shared between both CPIs)
///   [4] mpl_core_program
///   [5] atom_config
///   [6] atom_stats
///   [7] atom_engine_program
///
/// The `asset`, `payer` (= `owner` for initialize_stats), and
/// `system_program` are sourced from the Anchor Accounts struct.
fn unpack_cpi_accounts<'info>(
    remaining: &[AccountInfo<'info>],
    asset: &AccountInfo<'info>,
    payer: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
) -> Result<UnpackedAccounts<'info>> {
    require!(
        remaining.len() >= 8,
        TrustGateError::InsufficientCpiAccounts
    );

    let root_config = remaining[0].clone();
    let registry_config = remaining[1].clone();
    let agent_account = remaining[2].clone();
    let base_collection = remaining[3].clone();
    let mpl_core_program = remaining[4].clone();
    let atom_config = remaining[5].clone();
    let atom_stats = remaining[6].clone();
    let atom_engine_program = remaining[7].clone();

    // Defensive: the atom_engine_program slot must be Quantu's pinned
    // atom-engine program. The CPI dispatch is keyed by program_id at
    // build-time (we hardcode `ATOM_ENGINE_ID` in `invoke_initialize_stats`),
    // so a wrong program account here would simply not be the executable
    // the CPI invokes — but flagging it up front gives a typed error
    // instead of a confusing runtime mismatch downstream.
    require_keys_eq!(
        *atom_engine_program.key,
        ATOM_ENGINE_ID,
        TrustGateError::AtomEngineProgramMismatch,
    );
    // Same defensive pin for the MPL Core slot.
    require_keys_eq!(
        *mpl_core_program.key,
        MPL_CORE_PROGRAM_ID,
        TrustGateError::MplCoreProgramMismatch,
    );

    let register_accounts = RegisterAgentAccounts {
        root_config,
        registry_config,
        agent_account,
        asset: asset.clone(),
        base_collection: base_collection.clone(),
        payer: payer.clone(),
        system_program: system_program.clone(),
        mpl_core_program,
    };

    let initialize_stats_accounts = InitializeStatsAccounts {
        owner: payer.clone(),
        asset: asset.clone(),
        base_collection,
        atom_config,
        atom_stats,
        system_program: system_program.clone(),
    };

    Ok(UnpackedAccounts {
        register_accounts,
        initialize_stats_accounts,
    })
}
