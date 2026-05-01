//! Invariant 4 — `validation_expiry_correct`
//!
//! An expired attestation (`expires_at != 0` AND `expires_at <= now_slot`)
//! cannot produce `Allow` from `require_validation::evaluate`. Subject +
//! capability + revocation checks are passed (forced equal to policy +
//! non-revoked) so expiry is the deciding gate.

use anchor_lang::prelude::Pubkey;

use crate::ext::validation_registry::ValidationAttestationView;
use crate::policies::require_validation::{evaluate, RequireValidationOutcome, RequireValidationState};

#[kani::proof]
#[kani::unwind(40)]
fn validation_expiry_correct() {
    let expires_at: u64 = kani::any();
    let now_slot:   u64 = kani::any();

    // Force the attestation to be EXPIRED.
    // Spec: expired iff (expires_at != 0 AND expires_at <= now_slot).
    kani::assume(expires_at != 0);
    kani::assume(expires_at <= now_slot);

    // Make subject + capability + non-revoked all PASS so expiry is the
    // sole remaining gate. Hash is symbolic but matches policy.required.
    let cap_hash: [u8; 32] = kani::any();
    // Required capability hash zero would short-circuit to Allow (sentinel),
    // skipping expiry. Bound it away.
    kani::assume(cap_hash != [0u8; 32]);

    let view = ValidationAttestationView {
        subject_asset:   Pubkey::default(),
        capability_hash: cap_hash,
        attestor:        Pubkey::default(),
        expires_at,
        revoked:         false,
    };

    let state = RequireValidationState {
        required_capability_hash: cap_hash,
        accepted_attestors:       [Pubkey::default(); 2], // permissionless
    };

    let outcome = evaluate(state, Some(view), &Pubkey::default(), now_slot);

    kani::assert(
        !matches!(outcome, RequireValidationOutcome::Allow),
        "expired attestation must not produce Allow",
    );
}
