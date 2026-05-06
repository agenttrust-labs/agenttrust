use anchor_lang::prelude::*;

#[event]
pub struct AuthorityInitialized {
    pub facilitator: Pubkey,
    pub authority: Pubkey,
    pub slot: u64,
}

#[event]
pub struct FeedbackEmitted {
    pub facilitator: Pubkey,
    pub payee_asset: Pubkey,
    pub payment_id_hash: [u8; 32],
    pub score: u8,
    pub slot: u64,
}

#[event]
pub struct PaymentDisputed {
    pub facilitator: Pubkey,
    pub payee_asset: Pubkey,
    pub payment_id_hash: [u8; 32],
    pub dispute_reason_hash: [u8; 32],
    pub slot: u64,
}
