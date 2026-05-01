use anchor_lang::prelude::*;

#[error_code]
pub enum PolicyVaultError {
    #[msg("Policy ID mismatch between PDA seeds and account state")]
    PolicyMismatch = 6000,

    #[msg("Spending per-tx limit exceeded")]
    SpendingPerTxExceeded = 6001,
    #[msg("Spending daily limit exceeded")]
    SpendingDailyExceeded = 6002,
    #[msg("Spending weekly limit exceeded")]
    SpendingWeeklyExceeded = 6003,
    #[msg("Spending counter overflow")]
    SpendingOverflow = 6004,

    #[msg("Velocity window cap exceeded")]
    VelocityWindowExceeded = 6010,
    #[msg("Velocity counter overflow")]
    VelocityOverflow = 6011,

    #[msg("Counterparty tier below minimum")]
    CounterpartyTierBelowMin = 6020,
    #[msg("Counterparty risk score above maximum")]
    CounterpartyRiskAboveMax = 6021,
    #[msg("Counterparty confidence below minimum")]
    CounterpartyConfidenceBelow = 6022,
    #[msg("AtomStats account has wrong owner")]
    AtomStatsWrongOwner = 6023,
    #[msg("AtomStats schema version mismatch")]
    AtomStatsSchemaMismatch = 6024,
    #[msg("AtomStats account size mismatch")]
    AtomStatsSizeMismatch = 6025,

    #[msg("Validation attestation missing")]
    AttestationMissing = 6030,
    #[msg("Validation attestation expired")]
    AttestationExpired = 6031,
    #[msg("Validation attestation revoked")]
    AttestationRevoked = 6032,
    #[msg("Validation attestor not in accepted list")]
    AttestationAttestorRejected = 6033,
    #[msg("Validation subject mismatch")]
    AttestationSubjectMismatch = 6034,
    #[msg("Validation capability mismatch")]
    AttestationCapabilityMismatch = 6035,

    #[msg("KillSwitch engaged for this scope")]
    KillSwitchEngaged = 6040,
    #[msg("Multisig threshold not met")]
    MultisigThresholdNotMet = 6041,
    #[msg("Member not in policy authority")]
    MemberNotInAuthority = 6042,
    #[msg("Threshold exceeds member count")]
    ThresholdExceedsMembers = 6043,
    #[msg("Member count out of range (1..=7)")]
    MemberCountOutOfRange = 6044,
    #[msg("Authority members must be unique (no duplicates)")]
    DuplicateAuthorityMember = 6045,

    #[msg("Unrated counterparty under deny treatment")]
    UnratedTreatmentDeny = 6050,
    #[msg("Invalid gate_mode (must be 0=Immediate or 1=Confirmed)")]
    InvalidGateMode = 6051,
    #[msg("Invalid scope_kind (must be 0=Global, 1=PerCollection, 2=PerAgent)")]
    InvalidScopeKind = 6052,
    #[msg("Clock unix_timestamp negative — pre-1970 not supported")]
    ClockBeforeEpoch = 6053,
    #[msg("enabled_kinds_bitmask has bits outside the defined KIND_* surface")]
    InvalidEnabledKinds = 6054,
    #[msg("Counterparty tier out of range (max 4)")]
    InvalidCounterpartyTier = 6055,
    #[msg("Confidence out of range (max 10000)")]
    InvalidConfidence = 6056,
    #[msg("Unrated treatment must be 0=Deny, 1=Allow, or 2=RequireValidation")]
    InvalidUnratedTreatment = 6057,

    #[msg("AgentAccount uninitialized (zero lamports)")]
    AgentAccountUninitialized = 6060,
    #[msg("AgentAccount has wrong owner program")]
    AgentAccountWrongOwner = 6061,
    #[msg("AgentAccount data size mismatch (expected 748 bytes)")]
    AgentAccountSizeMismatch = 6062,
}
