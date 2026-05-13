use anchor_lang::prelude::*;

#[error_code]
pub enum TrustGateError {
    #[msg("Score out of range (must be 0..=100)")]
    ScoreOutOfRange = 7000,
    #[msg("Tag length exceeds 32 bytes")]
    TagTooLong = 7001,
    #[msg("URI length exceeds 256 bytes")]
    UriTooLong = 7002,
    #[msg("Endpoint length exceeds 64 bytes")]
    EndpointTooLong = 7003,

    // ---- give_feedback CPI account validation ----
    #[msg("agent_registry_8004 program ID mismatch")]
    AgentRegistryProgramMismatch = 7010,
    #[msg("atom_engine program ID mismatch")]
    AtomEngineProgramMismatch = 7011,
    #[msg("mpl_core program ID mismatch")]
    MplCoreProgramMismatch = 7012,

    // ---- dispute_payment ----
    #[msg("Dispute reason hash must be non-zero")]
    DisputeReasonRequired = 7020,

    // ---- auth ----
    #[msg("Caller (payer) must equal facilitator for emit_feedback / dispute_payment")]
    FacilitatorSignerMismatch = 7030,

    // ---- register_agent_via_cpi ----
    #[msg("Provided asset_seed does not match the asset account key")]
    AssetSeedMismatch = 7040,
    #[msg("metadata_uri length exceeds 256 bytes")]
    MetadataUriTooLong = 7041,
    #[msg("Insufficient CPI accounts in remaining_accounts")]
    InsufficientCpiAccounts = 7042,
}
