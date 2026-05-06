//! `PolicyAuthority` — multisig members + threshold for sensitive policy mutations.

use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PolicyAuthority {
    pub payer_agent_asset: Pubkey, // off  8..40
    pub bump: u8,                  // off 40
    pub threshold: u8,             // off 41 — default 2
    pub member_count: u8,          // off 42 — 1..=7 in v1
    pub _pad0: u8,                 // off 43
    pub members: [Pubkey; 7],      // off 44..268 — first 7 members
    pub _reserved: [u8; 4],        // off 268..272
}

impl PolicyAuthority {
    /// PDA seeds: `[b"policy_authority", payer_agent_asset]`.
    pub const SEED_PREFIX: &'static [u8] = b"policy_authority";

    /// The active slice of `members` (positions `0..member_count`).
    /// Positions beyond `member_count` are zero-initialised and meaningless.
    fn active_members(&self) -> &[Pubkey] {
        let mc = (self.member_count as usize).min(self.members.len());
        &self.members[..mc]
    }

    /// Returns true iff `key` is a member of this authority.
    pub fn is_member(&self, key: &Pubkey) -> bool {
        self.active_members().contains(key)
    }

    /// Count signers from `signer_keys` that are distinct members of this
    /// authority. Pubkey-based dedup — a single signer cannot be counted
    /// twice even if the on-chain `members` array somehow contained
    /// duplicates (the primary guard is `init_authority`'s no-dup check;
    /// this method is defense-in-depth and Kani-friendly pure logic).
    ///
    /// Pure function over (`self.members`, `self.member_count`, `signer_keys`).
    /// The composer / `set_killswitch` handler shells out to this; Phase 5
    /// Kani harness `multisig_threshold_enforced` proves over this fn directly.
    pub fn count_distinct_signing_members(&self, signer_keys: &[Pubkey]) -> u8 {
        let valid = self.active_members();
        // Fixed-size buffer for seen pubkeys; cap matches AUTHORITY_MEMBERS_MAX.
        let mut seen: [Pubkey; 7] = [Pubkey::default(); 7];
        let mut count: u8 = 0;

        for sk in signer_keys.iter() {
            // Skip if already credited (pubkey dedup, not position dedup).
            if seen[..count as usize].iter().any(|s| s == sk) {
                continue;
            }
            // Credit only if `sk` is a member.
            if valid.contains(sk) {
                seen[count as usize] = *sk;
                count = count.saturating_add(1);
            }
        }
        count
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_auth(members: &[Pubkey], threshold: u8) -> PolicyAuthority {
        let mut fixed = [Pubkey::default(); 7];
        for (i, m) in members.iter().enumerate() {
            fixed[i] = *m;
        }
        PolicyAuthority {
            payer_agent_asset: Pubkey::default(),
            bump: 0,
            threshold,
            member_count: members.len() as u8,
            _pad0: 0,
            members: fixed,
            _reserved: [0u8; 4],
        }
    }

    fn pk(byte: u8) -> Pubkey {
        let mut bytes = [0u8; 32];
        bytes[0] = byte;
        Pubkey::new_from_array(bytes)
    }

    #[test]
    fn empty_signers_returns_zero() {
        let auth = make_auth(&[pk(1), pk(2), pk(3)], 2);
        assert_eq!(auth.count_distinct_signing_members(&[]), 0);
    }

    #[test]
    fn single_member_signing_returns_one() {
        let auth = make_auth(&[pk(1), pk(2), pk(3)], 2);
        assert_eq!(auth.count_distinct_signing_members(&[pk(1)]), 1);
    }

    #[test]
    fn duplicate_signer_keys_dedupe_to_one() {
        let auth = make_auth(&[pk(1), pk(2), pk(3)], 2);
        assert_eq!(
            auth.count_distinct_signing_members(&[pk(1), pk(1), pk(1)]),
            1
        );
    }

    #[test]
    fn two_distinct_members_signing_returns_two() {
        let auth = make_auth(&[pk(1), pk(2), pk(3)], 2);
        assert_eq!(auth.count_distinct_signing_members(&[pk(1), pk(2)]), 2);
    }

    #[test]
    fn non_member_signers_are_ignored() {
        let auth = make_auth(&[pk(1), pk(2), pk(3)], 2);
        assert_eq!(auth.count_distinct_signing_members(&[pk(99), pk(100)]), 0);
    }

    #[test]
    fn mixed_members_and_non_members_only_counts_members() {
        let auth = make_auth(&[pk(1), pk(2), pk(3)], 2);
        assert_eq!(
            auth.count_distinct_signing_members(&[pk(99), pk(1), pk(100), pk(2)]),
            2
        );
    }

    #[test]
    fn all_seven_members_signing_returns_seven() {
        let members = [pk(1), pk(2), pk(3), pk(4), pk(5), pk(6), pk(7)];
        let auth = make_auth(&members, 4);
        assert_eq!(auth.count_distinct_signing_members(&members), 7);
    }

    #[test]
    fn member_count_limits_active_membership() {
        // members slice has 7 entries but member_count = 3 — only first 3 active.
        let mut auth = make_auth(&[pk(1), pk(2), pk(3), pk(4), pk(5), pk(6), pk(7)], 2);
        auth.member_count = 3;
        assert_eq!(auth.count_distinct_signing_members(&[pk(4), pk(5)]), 0);
        assert_eq!(
            auth.count_distinct_signing_members(&[pk(1), pk(2), pk(3), pk(4)]),
            3
        );
    }

    #[test]
    fn defense_in_depth_dedupes_same_key_at_different_positions() {
        // Hypothetically corrupted state: `members[0] == members[1] == pk(1)`.
        // (init_authority would reject this, but pubkey-dedup makes the
        // counting logic safe even in that scenario.)
        let mut auth = make_auth(&[pk(1), pk(1), pk(2)], 2);
        // signer_keys = [pk(1)]. Even though pk(1) appears twice in members,
        // pubkey-based dedup gives count = 1, not 2.
        assert_eq!(auth.count_distinct_signing_members(&[pk(1)]), 1);
        // Also verify member_count above the corruption doesn't help.
        auth.member_count = 3;
        assert_eq!(auth.count_distinct_signing_members(&[pk(1)]), 1);
    }

    #[test]
    fn is_member_basic() {
        let auth = make_auth(&[pk(1), pk(2), pk(3)], 2);
        assert!(auth.is_member(&pk(1)));
        assert!(auth.is_member(&pk(2)));
        assert!(!auth.is_member(&pk(99)));
        assert!(!auth.is_member(&Pubkey::default())); // sentinel beyond member_count
    }
}
