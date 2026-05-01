//! `gate_payment` return type + the flat `DenyReason` discriminant clients receive.
//!
//! `DenyReason` does NOT use `#[repr(u8)]` with explicit discriminants — that
//! combination breaks Anchor's Borsh derive. Variants are serialised in
//! declaration order; external API stability is preserved by `code()` which
//! maps each variant to a fixed numeric code that is decoupled from the Borsh
//! wire format.

use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum GateDecision {
    Allow,
    Deny(DenyReason),
    RequireValidation([u8; 32]),
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum DenyReason {
    KillSwitchEngaged,
    SpendingPerTxExceeded,
    SpendingDailyExceeded,
    SpendingWeeklyExceeded,
    VelocityWindowExceeded,
    CounterpartyTierBelowMin,
    CounterpartyRiskAboveMax,
    CounterpartyConfidenceBelow,
    AtomStatsWrongOwner,
    AtomStatsSchemaMismatch,
    AttestationMissing,
    AttestationExpired,
    AttestationRevoked,
    AttestationAttestorRejected,
    UnratedTreatmentDeny,
}

impl DenyReason {
    /// Stable numeric code emitted in events and consumed by clients.
    /// Independent of Borsh wire-format ordering.
    pub const fn code(self) -> u8 {
        match self {
            DenyReason::KillSwitchEngaged           => 1,
            DenyReason::SpendingPerTxExceeded       => 2,
            DenyReason::SpendingDailyExceeded       => 3,
            DenyReason::SpendingWeeklyExceeded      => 4,
            DenyReason::VelocityWindowExceeded      => 5,
            DenyReason::CounterpartyTierBelowMin    => 6,
            DenyReason::CounterpartyRiskAboveMax    => 7,
            DenyReason::CounterpartyConfidenceBelow => 8,
            DenyReason::AtomStatsWrongOwner         => 9,
            DenyReason::AtomStatsSchemaMismatch     => 10,
            DenyReason::AttestationMissing          => 11,
            DenyReason::AttestationExpired          => 12,
            DenyReason::AttestationRevoked          => 13,
            DenyReason::AttestationAttestorRejected => 14,
            DenyReason::UnratedTreatmentDeny        => 15,
        }
    }
}
