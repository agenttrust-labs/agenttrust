//! PolicyVault — programmable spending-policy engine for ERC-8004 agents on Solana.
//!
//! Three-component AgentTrust workspace; PolicyVault is component 1.
//! See `docs/plan/final_idea/v1_scope.md` and
//! `docs/plan/research/04-policyvault-build-playbook.md`.

use anchor_lang::prelude::*;

declare_id!("8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR");

pub mod constants;
pub mod errors;
pub mod events;
pub mod ext;
pub mod instructions;
pub mod policies;
pub mod state;

// Re-export accounts structs + macro-generated modules at crate root so the
// `#[program]` macro below can resolve `Context<InitPolicy>` and the matching
// `__client_accounts_*` helpers Anchor emits beside each `#[derive(Accounts)]`.
pub use instructions::init_policy::*;

#[program]
pub mod policy_vault {
    use super::*;

    /// Initialise a `PolicyAccount` + `VelocityLedger` for a single
    /// (`payer_agent_asset`, `policy_id`) pair.
    pub fn init_policy(
        ctx: Context<InitPolicy>,
        payer_agent_asset: Pubkey,
        args: InitPolicyArgs,
    ) -> Result<()> {
        instructions::init_policy::handler(ctx, payer_agent_asset, args)
    }
}
