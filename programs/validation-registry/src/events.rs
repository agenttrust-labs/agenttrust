use anchor_lang::prelude::*;

#[event]
pub struct NamespaceRegistered {
    pub namespace_hash: [u8; 32],
    pub creator: Pubkey,
}

#[event]
pub struct AttestorRegistered {
    pub attestor: Pubkey,
}

#[event]
pub struct RequestCreated {
    pub subject_asset: Pubkey,
    pub capability_hash: [u8; 32],
    pub requester: Pubkey,
    pub deadline: u64,
}

#[event]
pub struct AttestationCreated {
    pub subject_asset: Pubkey,
    pub capability_hash: [u8; 32],
    pub attestor: Pubkey,
    pub expires_at: u64,
    pub issued_at: u64,
}

#[event]
pub struct AttestationRevoked {
    pub subject_asset: Pubkey,
    pub capability_hash: [u8; 32],
    pub attestor: Pubkey,
    pub revoked_at: u64,
}
