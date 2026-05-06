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

#[cfg(kani)]
pub mod proofs;

// Re-export accounts structs + macro-generated `__client_accounts_*` modules
// at crate root so the `#[program]` macro can resolve them. Named imports
// (not glob) — globbing all four modules would cause `handler` symbol
// collisions since each instruction module exports its own `pub fn handler`.
pub use state::{DenyReason, GateDecision};
pub use instructions::gate_payment::GatePayment;
pub use instructions::init_authority::InitAuthority;
pub use instructions::init_killswitch::InitKillSwitch;
pub use instructions::init_policy::{
    CounterpartyConfig, InitPolicy, InitPolicyArgs, SpendingConfig, ValidationConfig, VelocityConfig,
};
pub use instructions::set_killswitch::SetKillSwitch;
// Anchor-generated `__client_accounts_*` modules are `pub(crate)`; bring them
// to crate root so the `#[program]` macro can resolve `crate::__client_accounts_*`.
pub(crate) use instructions::gate_payment::__client_accounts_gate_payment;
pub(crate) use instructions::init_authority::__client_accounts_init_authority;
pub(crate) use instructions::init_killswitch::__client_accounts_init_kill_switch;
pub(crate) use instructions::init_policy::__client_accounts_init_policy;
pub(crate) use instructions::set_killswitch::__client_accounts_set_kill_switch;

#[program]
pub mod policy_vault {
    use super::*;

    /// Create the `PolicyAuthority` PDA for an agent. Must be called BEFORE
    /// `init_policy`. Caller must include themselves in `members`.
    pub fn init_authority(
        ctx: Context<InitAuthority>,
        payer_agent_asset: Pubkey,
        members: Vec<Pubkey>,
        threshold: u8,
    ) -> Result<()> {
        instructions::init_authority::handler(ctx, payer_agent_asset, members, threshold)
    }

    /// Create a per-agent `KillSwitchState` PDA (initial state: paused = false).
    pub fn init_killswitch(
        ctx: Context<InitKillSwitch>,
        payer_agent_asset: Pubkey,
    ) -> Result<()> {
        instructions::init_killswitch::handler(ctx, payer_agent_asset)
    }

    /// Multisig-gated pause / unpause of an agent's KillSwitchState.
    /// Lead signer + additional signers in `remaining_accounts` must reach
    /// `policy_authority.threshold` distinct members.
    pub fn set_killswitch(
        ctx: Context<SetKillSwitch>,
        payer_agent_asset: Pubkey,
        paused: bool,
    ) -> Result<()> {
        instructions::set_killswitch::handler(ctx, payer_agent_asset, paused)
    }

    /// Initialise a `PolicyAccount` + `VelocityLedger` for a single
    /// (`payer_agent_asset`, `policy_id`) pair. Requires the agent's
    /// `PolicyAuthority` to exist with the payer as a member.
    pub fn init_policy(
        ctx: Context<InitPolicy>,
        payer_agent_asset: Pubkey,
        args: InitPolicyArgs,
    ) -> Result<()> {
        instructions::init_policy::handler(ctx, payer_agent_asset, args)
    }

    /// Compose the 5 policy kinds + return a `GateDecision`. Applies state
    /// mutations (Spending counters, VelocityLedger) only on `Allow`.
    pub fn gate_payment(
        ctx: Context<GatePayment>,
        payer_agent_asset: Pubkey,
        payee_agent_asset: Pubkey,
        amount: u64,
        mint: Pubkey,
        policy_id: u32,
    ) -> Result<GateDecision> {
        instructions::gate_payment::handler(
            ctx, payer_agent_asset, payee_agent_asset, amount, mint, policy_id,
        )
    }

    /// Strict variant: returns `Err` on Deny / RequireValidation so the
    /// caller's tx reverts atomically. Allow path applies the same state
    /// mutations as `gate_payment`. Used by `composeAtomicSettleTx` to
    /// guarantee gate + transfer + emit_feedback commit-or-revert as a
    /// unit.
    pub fn gate_payment_strict(
        ctx: Context<GatePayment>,
        payer_agent_asset: Pubkey,
        payee_agent_asset: Pubkey,
        amount: u64,
        mint: Pubkey,
        policy_id: u32,
    ) -> Result<()> {
        instructions::gate_payment_strict::handler(
            ctx, payer_agent_asset, payee_agent_asset, amount, mint, policy_id,
        )
    }
}
