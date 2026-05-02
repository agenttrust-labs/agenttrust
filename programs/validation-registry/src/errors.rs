use anchor_lang::prelude::*;

#[error_code]
pub enum ValidationRegistryError {
    // ---- input validation ----
    #[msg("Namespace name too short (min 3 chars)")]
    NameTooShort = 8000,
    #[msg("Namespace name too long (max 32 chars)")]
    NameTooLong = 8001,
    #[msg("Namespace name must not contain ':' (delimiter is reserved)")]
    NamespaceColonForbidden = 8002,
    #[msg("Version string too long (max 16 chars)")]
    VersionTooLong = 8003,
    #[msg("URI too long")]
    UriTooLong = 8004,

    // ---- request_validation ----
    #[msg("Deadline is in the past")]
    DeadlineInPast = 8010,
    #[msg("Deadline too far in the future (max 30 days ~432_000*30 slots)")]
    DeadlineTooFar = 8011,

    // ---- respond_to_validation ----
    #[msg("Expiry is in the past")]
    ExpiryInPast = 8020,
    // 8021..8023 reserved for v1.1+ Ed25519 sysvar verification errors:
    //   MissingSignatureVerification, SignaturePubkeyMismatch, SignatureMessageMismatch.

    // ---- revoke_validation ----
    #[msg("Only the original attestor can revoke their attestation")]
    NotOriginalAttestor = 8030,
    #[msg("Attestation already revoked")]
    AlreadyRevoked = 8031,

    // ---- math / generic ----
    #[msg("Counter overflow")]
    Overflow = 8040,
}
