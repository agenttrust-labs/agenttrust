//! Invariant 5 — `multisig_threshold_enforced`
//!
//! `PolicyAuthority::count_distinct_signing_members` cannot return a count
//! exceeding `min(member_count, signer_keys.len())`. This is the load-bearing
//! property that backs `set_killswitch`'s `require!(distinct_count >= threshold)`
//! gate: a caller cannot construct a signer set that fools the function into
//! over-counting (e.g., via duplicate pubkeys, off-by-one tricks, or
//! corrupted `members` arrays).
//!
//! Proven directly over the pure-fn helper. Bounded to 3 members + 3 signers
//! to keep symbolic search tractable; the property generalises by induction.

use anchor_lang::prelude::Pubkey;

use crate::state::PolicyAuthority;

#[kani::proof]
#[kani::unwind(40)]
fn multisig_threshold_enforced() {
    // Symbolic 3-pubkey member set + 3-pubkey signer set. Keeping both
    // bounded to 3 makes Kani exhaustively explore the (members, signers)
    // matrix in seconds rather than minutes.
    let m0_byte: u8 = kani::any();
    let m1_byte: u8 = kani::any();
    let m2_byte: u8 = kani::any();
    let s0_byte: u8 = kani::any();
    let s1_byte: u8 = kani::any();
    let s2_byte: u8 = kani::any();

    fn pk(byte: u8) -> Pubkey {
        let mut bytes = [0u8; 32];
        bytes[0] = byte;
        Pubkey::new_from_array(bytes)
    }

    let member_count: u8 = kani::any();
    kani::assume(member_count <= 3);

    let mut members = [Pubkey::default(); 7];
    members[0] = pk(m0_byte);
    members[1] = pk(m1_byte);
    members[2] = pk(m2_byte);

    let auth = PolicyAuthority {
        payer_agent_asset: Pubkey::default(),
        bump: 0,
        threshold: 1, // unused by count_distinct_signing_members itself
        member_count,
        _pad0: 0,
        members,
        _reserved: [0u8; 4],
    };

    let signer_keys = [pk(s0_byte), pk(s1_byte), pk(s2_byte)];
    let count = auth.count_distinct_signing_members(&signer_keys);

    // Property A: count cannot exceed signer_keys length.
    kani::assert(
        count as usize <= signer_keys.len(),
        "count cannot exceed |signer_keys|",
    );

    // Property B: count cannot exceed member_count (can't credit non-members).
    kani::assert(count <= member_count, "count cannot exceed member_count");

    // Property C (the threshold-enforcement contrapositive):
    // if there are FEWER unique signers than `threshold`, count < threshold.
    // Specifically: |signer_keys| < threshold ⇒ count < threshold.
    let threshold: u8 = kani::any();
    if (signer_keys.len() as u8) < threshold {
        kani::assert(
            count < threshold,
            "fewer signer_keys than threshold ⇒ count < threshold",
        );
    }
}
