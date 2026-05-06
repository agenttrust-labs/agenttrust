use anchor_lang::prelude::*;

#[event]
pub struct PolicyAllowed {
    pub payer_agent_asset: Pubkey,
    pub payee_agent_asset: Pubkey,
    pub amount: u64,
    pub policy_id: u32,
    pub slot: u64,
}

#[event]
pub struct PolicyDenied {
    pub payer_agent_asset: Pubkey,
    pub payee_agent_asset: Pubkey,
    pub amount: u64,
    pub policy_id: u32,
    pub reason: u8, // DenyReason as u8
    pub slot: u64,
}

#[event]
pub struct RequireValidationEmitted {
    pub payer_agent_asset: Pubkey,
    pub payee_agent_asset: Pubkey,
    pub capability_hash: [u8; 32],
    pub slot: u64,
}

#[event]
pub struct VelocityIncremented {
    pub payer_agent_asset: Pubkey,
    pub policy_id: u32,
    pub new_cumulative: u64,
    pub slot: u64,
}

#[event]
pub struct KillSwitchTriggered {
    pub scope_kind: u8,
    pub scope_key: [u8; 32],
    pub paused: bool,
    pub triggered_by: Pubkey,
    pub slot: u64,
}

#[event]
pub struct PolicyInitialized {
    pub payer_agent_asset: Pubkey,
    pub policy_id: u32,
    pub enabled_kinds: u8,
    pub slot: u64,
}
