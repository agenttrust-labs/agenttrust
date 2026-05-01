//! KillSwitch policy — emergency multisig pause.
//!
//! Trivially simple: if `paused == true`, deny. The actual mutation of the
//! flag (set_killswitch instruction) lives in `instructions/set_killswitch.rs`
//! and is multisig-gated against `PolicyAuthority`. This module is the
//! pure-fn read side that the composer calls.
//!
//! Reference: docs/plan/research/04-policyvault-build-playbook.md §C.5

use crate::state::{DenyReason, KillSwitchState};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct KillSwitchSnapshot {
    pub paused: bool,
}

impl From<&KillSwitchState> for KillSwitchSnapshot {
    fn from(s: &KillSwitchState) -> Self {
        KillSwitchSnapshot { paused: s.paused }
    }
}

/// Returns `Some(KillSwitchEngaged)` when paused. The composer maps that to
/// `GateDecision::Deny(KillSwitchEngaged)` immediately — fail-fast, before
/// any other policy or foreign-PDA read costs are paid.
#[inline]
pub fn evaluate(state: KillSwitchSnapshot) -> Option<DenyReason> {
    if state.paused {
        Some(DenyReason::KillSwitchEngaged)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn paused_returns_deny_reason() {
        assert_eq!(
            evaluate(KillSwitchSnapshot { paused: true }),
            Some(DenyReason::KillSwitchEngaged),
        );
    }

    #[test]
    fn unpaused_returns_none() {
        assert_eq!(evaluate(KillSwitchSnapshot { paused: false }), None);
    }
}
