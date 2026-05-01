//! RequireValidation policy — gates payee against an attestation from
//! `validation-registry`.
//!
//! Pure-fn over a parsed `ValidationAttestationView`. Three-way outcome:
//! - `Allow` — valid attestation matches policy
//! - `Deny(reason)` — attestation present but revoked / expired / wrong
//! - `RequiresAttestation(hash)` — no attestation; composer maps this to
//!   `GateDecision::RequireValidation(capability_hash)` so a facilitator
//!   can route the user to the off-chain attestation flow.
//!
//! Reference: docs/plan/research/04-policyvault-build-playbook.md §C.4

use anchor_lang::prelude::*;

use crate::ext::validation_registry::ValidationAttestationView;
use crate::state::{DenyReason, PolicyAccount};

const ZERO_HASH:   [u8; 32] = [0u8; 32];
const ZERO_PUBKEY: Pubkey   = Pubkey::new_from_array([0u8; 32]);

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct RequireValidationState {
    pub required_capability_hash: [u8; 32], // zeros = policy not enabled
    pub accepted_attestors:       [Pubkey; 2], // both zeros = permissionless
}

impl From<&PolicyAccount> for RequireValidationState {
    fn from(p: &PolicyAccount) -> Self {
        RequireValidationState {
            required_capability_hash: p.required_capability_hash,
            accepted_attestors:       p.accepted_attestors,
        }
    }
}

// ---------------------------------------------------------------------------
// Outcome — three-way (Allow / Deny / RequiresAttestation)
// ---------------------------------------------------------------------------
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RequireValidationOutcome {
    Allow,
    Deny(DenyReason),
    /// No attestation present. Composer returns
    /// `GateDecision::RequireValidation(hash)` so the facilitator can prompt
    /// the user to obtain an attestation for `hash`.
    RequiresAttestation([u8; 32]),
}

// ---------------------------------------------------------------------------
// Pure decision function
// ---------------------------------------------------------------------------

pub fn evaluate(
    state: RequireValidationState,
    attestation: Option<ValidationAttestationView>,
    payee_agent_asset: &Pubkey,
    now_slot: u64,
) -> RequireValidationOutcome {
    // Sentinel: zero capability_hash = policy not configured. Pass through.
    if state.required_capability_hash == ZERO_HASH {
        return RequireValidationOutcome::Allow;
    }

    let view = match attestation {
        Some(v) => v,
        None    => return RequireValidationOutcome::RequiresAttestation(state.required_capability_hash),
    };

    // Subject check — attestation must be for THIS payee.
    if view.subject_asset != *payee_agent_asset {
        return RequireValidationOutcome::Deny(DenyReason::AttestationMissing);
    }

    // Capability check — attestation must match the required capability.
    if view.capability_hash != state.required_capability_hash {
        return RequireValidationOutcome::Deny(DenyReason::AttestationMissing);
    }

    // Revocation.
    if view.revoked {
        return RequireValidationOutcome::Deny(DenyReason::AttestationRevoked);
    }

    // Expiry. expires_at == 0 is the "never expires" sentinel.
    if view.expires_at != 0 && view.expires_at <= now_slot {
        return RequireValidationOutcome::Deny(DenyReason::AttestationExpired);
    }

    // Attestor whitelist. Both slots zero ⇒ permissionless (any attestor OK).
    let permissionless = state.accepted_attestors[0] == ZERO_PUBKEY
        && state.accepted_attestors[1] == ZERO_PUBKEY;
    if !permissionless {
        let in_list = state.accepted_attestors.iter().any(|a| *a == view.attestor);
        if !in_list {
            return RequireValidationOutcome::Deny(DenyReason::AttestationAttestorRejected);
        }
    }

    RequireValidationOutcome::Allow
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
#[cfg(test)]
mod tests {
    use super::*;

    fn pk(byte: u8) -> Pubkey {
        let mut bytes = [0u8; 32];
        bytes[0] = byte;
        Pubkey::new_from_array(bytes)
    }

    fn hash(byte: u8) -> [u8; 32] {
        let mut h = [0u8; 32];
        h[0] = byte;
        h
    }

    fn permissionless_state(required: [u8; 32]) -> RequireValidationState {
        RequireValidationState {
            required_capability_hash: required,
            accepted_attestors:       [ZERO_PUBKEY, ZERO_PUBKEY],
        }
    }

    fn whitelist_state(required: [u8; 32], allowed: Pubkey) -> RequireValidationState {
        RequireValidationState {
            required_capability_hash: required,
            accepted_attestors:       [allowed, ZERO_PUBKEY],
        }
    }

    fn view(subject: Pubkey, cap: [u8; 32], attestor: Pubkey, expires: u64, revoked: bool) -> ValidationAttestationView {
        ValidationAttestationView {
            subject_asset:   subject,
            capability_hash: cap,
            attestor,
            expires_at:      expires,
            revoked,
        }
    }

    #[test]
    fn zero_hash_is_pass_through() {
        // Policy bit set but hash zero → not configured → Allow.
        let s = permissionless_state(ZERO_HASH);
        assert_eq!(evaluate(s, None, &pk(1), 100), RequireValidationOutcome::Allow);
    }

    #[test]
    fn missing_attestation_returns_requires_attestation() {
        let s = permissionless_state(hash(7));
        assert_eq!(
            evaluate(s, None, &pk(1), 100),
            RequireValidationOutcome::RequiresAttestation(hash(7)),
        );
    }

    #[test]
    fn happy_path_permissionless() {
        let s = permissionless_state(hash(7));
        let v = view(pk(1), hash(7), pk(99), 0, false);
        assert_eq!(evaluate(s, Some(v), &pk(1), 100), RequireValidationOutcome::Allow);
    }

    #[test]
    fn wrong_subject_denies() {
        let s = permissionless_state(hash(7));
        let v = view(/*subject*/ pk(2), hash(7), pk(99), 0, false);
        assert_eq!(
            evaluate(s, Some(v), /*payee*/ &pk(1), 100),
            RequireValidationOutcome::Deny(DenyReason::AttestationMissing),
        );
    }

    #[test]
    fn wrong_capability_denies() {
        let s = permissionless_state(hash(7));
        let v = view(pk(1), hash(8), pk(99), 0, false);
        assert_eq!(
            evaluate(s, Some(v), &pk(1), 100),
            RequireValidationOutcome::Deny(DenyReason::AttestationMissing),
        );
    }

    #[test]
    fn revoked_denies() {
        let s = permissionless_state(hash(7));
        let v = view(pk(1), hash(7), pk(99), 0, /*revoked*/ true);
        assert_eq!(
            evaluate(s, Some(v), &pk(1), 100),
            RequireValidationOutcome::Deny(DenyReason::AttestationRevoked),
        );
    }

    #[test]
    fn expired_denies() {
        // expires_at < now_slot → expired
        let s = permissionless_state(hash(7));
        let v = view(pk(1), hash(7), pk(99), /*expires*/ 50, false);
        assert_eq!(
            evaluate(s, Some(v), &pk(1), /*now*/ 100),
            RequireValidationOutcome::Deny(DenyReason::AttestationExpired),
        );
    }

    #[test]
    fn expires_at_equal_now_is_expired() {
        // playbook spec: expires_at == 0 OR expires_at > now → not expired.
        // So expires_at == now → expired.
        let s = permissionless_state(hash(7));
        let v = view(pk(1), hash(7), pk(99), /*expires*/ 100, false);
        assert_eq!(
            evaluate(s, Some(v), &pk(1), /*now*/ 100),
            RequireValidationOutcome::Deny(DenyReason::AttestationExpired),
        );
    }

    #[test]
    fn expires_at_zero_is_never_expires() {
        let s = permissionless_state(hash(7));
        let v = view(pk(1), hash(7), pk(99), /*never expires*/ 0, false);
        assert_eq!(
            evaluate(s, Some(v), &pk(1), u64::MAX),
            RequireValidationOutcome::Allow,
        );
    }

    #[test]
    fn whitelist_allows_listed_attestor() {
        let s = whitelist_state(hash(7), pk(50));
        let v = view(pk(1), hash(7), /*attestor*/ pk(50), 0, false);
        assert_eq!(evaluate(s, Some(v), &pk(1), 100), RequireValidationOutcome::Allow);
    }

    #[test]
    fn whitelist_denies_unlisted_attestor() {
        let s = whitelist_state(hash(7), pk(50));
        let v = view(pk(1), hash(7), /*attestor*/ pk(99), 0, false);
        assert_eq!(
            evaluate(s, Some(v), &pk(1), 100),
            RequireValidationOutcome::Deny(DenyReason::AttestationAttestorRejected),
        );
    }

    #[test]
    fn whitelist_with_two_slots() {
        let mut s = whitelist_state(hash(7), pk(50));
        s.accepted_attestors[1] = pk(60);
        let v1 = view(pk(1), hash(7), pk(50), 0, false);
        let v2 = view(pk(1), hash(7), pk(60), 0, false);
        let v3 = view(pk(1), hash(7), pk(99), 0, false);
        assert_eq!(evaluate(s, Some(v1), &pk(1), 100), RequireValidationOutcome::Allow);
        assert_eq!(evaluate(s, Some(v2), &pk(1), 100), RequireValidationOutcome::Allow);
        assert_eq!(
            evaluate(s, Some(v3), &pk(1), 100),
            RequireValidationOutcome::Deny(DenyReason::AttestationAttestorRejected),
        );
    }
}
