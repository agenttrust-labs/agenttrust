//! TrustGate — x402 facilitator program. AgentTrust component 2.
//!
//! Four instructions:
//! - `init_authority(facilitator)` — create per-facilitator PDA principal
//! - `emit_feedback(...)` — PDA-signed CPI to agent_registry_8004::give_feedback
//! - `dispute_payment(...)` — emits negative-score feedback for a disputed payment
//! - `register_agent_via_cpi(...)` — PDA-signed CPI chain into
//!   agent_registry_8004::register_with_options AND atom_engine::initialize_stats.
//!   One TrustGate ix → fully atom-functional Quantu agent. Callers never
//!   learn Quantu's two-instruction onboarding pair.
//!
//! See `docs/plan/research/05-trustgate-x402-class.md` for the x402 spec
//! integration narrative; this crate is the on-chain piece. The Express
//! service in `trustgate/server/` is the off-chain facilitator surface.

use anchor_lang::prelude::*;

declare_id!("HF8zHfoyA7b5mhLViopTnRMprc6ZT5KActHTdkFrih2N");

pub mod constants;
pub mod errors;
pub mod events;
pub mod ext;
pub mod instructions;
pub mod state;

pub use instructions::dispute_payment::DisputePayment;
pub use instructions::emit_feedback::EmitFeedback;
pub use instructions::init_authority::InitAuthority;
pub use instructions::register_agent_via_cpi::RegisterAgentViaCpi;

pub(crate) use instructions::dispute_payment::__client_accounts_dispute_payment;
pub(crate) use instructions::emit_feedback::__client_accounts_emit_feedback;
pub(crate) use instructions::init_authority::__client_accounts_init_authority;
pub(crate) use instructions::register_agent_via_cpi::__client_accounts_register_agent_via_cpi;

#[program]
pub mod trustgate {
    use super::*;

    /// Create a per-facilitator `TrustGateAuthority` PDA. Must be called once
    /// per facilitator deployment.
    pub fn init_authority(ctx: Context<InitAuthority>, facilitator: Pubkey) -> Result<()> {
        instructions::init_authority::handler(ctx, facilitator)
    }

    /// PDA-signed CPI to `agent_registry_8004::give_feedback`. Idempotency
    /// enforced via `FeedbackEmissionLog::init`.
    pub fn emit_feedback<'info>(
        ctx: Context<'info, EmitFeedback<'info>>,
        payment_id_hash: [u8; 32],
        facilitator: Pubkey,
        payee_asset: Pubkey,
        score: u8,
        value: u64,
        value_decimals: u8,
        tag1: String,
        tag2: String,
        endpoint: String,
        feedback_uri: String,
    ) -> Result<()> {
        instructions::emit_feedback::handler(
            ctx,
            payment_id_hash,
            facilitator,
            payee_asset,
            score,
            value,
            value_decimals,
            tag1,
            tag2,
            endpoint,
            feedback_uri,
        )
    }

    /// Emit a negative-score (`DISPUTE_SCORE`) feedback for a disputed payment.
    pub fn dispute_payment<'info>(
        ctx: Context<'info, DisputePayment<'info>>,
        payment_id_hash: [u8; 32],
        facilitator: Pubkey,
        payee_asset: Pubkey,
        dispute_reason_hash: [u8; 32],
        feedback_uri: String,
    ) -> Result<()> {
        instructions::dispute_payment::handler(
            ctx,
            payment_id_hash,
            facilitator,
            payee_asset,
            dispute_reason_hash,
            feedback_uri,
        )
    }

    /// PDA-signed CPI chain into `agent_registry_8004::register_with_options`
    /// followed by `atom_engine::initialize_stats`. One TrustGate instruction
    /// lands a fully atom-functional Quantu agent (agent_account + atom_stats),
    /// hiding Quantu's two-instruction onboarding pair from MCP / SDK callers.
    /// Idempotency is enforced upstream by Quantu's own `init` constraints on
    /// `agent_account` and `atom_stats`; a second call for the same
    /// `asset_seed` fails at the first CPI boundary.
    pub fn register_agent_via_cpi<'info>(
        ctx: Context<'info, RegisterAgentViaCpi<'info>>,
        asset_seed: [u8; 32],
        metadata_uri: String,
    ) -> Result<()> {
        instructions::register_agent_via_cpi::handler(ctx, asset_seed, metadata_uri)
    }
}
