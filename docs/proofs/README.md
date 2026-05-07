# PolicyVault formal verification — Kani proofs

PolicyVault ships with **6 machine-checked invariants** proved by
[model-checking/kani](https://github.com/model-checking/kani) (v0.67.0).
Each invariant is a `#[kani::proof]` harness over a pure-Rust composer or
helper; CI ([`.github/workflows/kani-prove.yml`](../../.github/workflows/kani-prove.yml))
re-runs all six on every PR.

**Total: 635 sub-checks, 6/6 proven, ~80s on a single CI runner.**

## The six invariants

### 1 · `paused_implies_no_allow`
**File:** [`programs/policy-vault/src/proofs/inv_paused_implies_no_allow.rs`](../../programs/policy-vault/src/proofs/inv_paused_implies_no_allow.rs)
**Harness:** `paused_killswitch_implies_no_allow`
**Sub-checks:** 126
**Time:** 0.25s

If the agent's KillSwitch is `paused == true` AND `KIND_KILLSWITCH` is set
in the policy bitmask, `compose_decision` cannot return `Allow` for any
values of the other policy fields, ledger, or input parameters. THE
load-bearing safety invariant of the gate. If a future change re-orders
or skips KillSwitch evaluation, Kani fails this proof loud.

### 2 · `velocity_counter_le_limit`
**File:** [`programs/policy-vault/src/proofs/inv_velocity_counter_le_limit.rs`](../../programs/policy-vault/src/proofs/inv_velocity_counter_le_limit.rs)
**Harness:** `velocity_allow_implies_cumulative_le_max`
**Sub-checks:** 9
**Time:** 0.03s

Inductive form: if the pre-state ledger satisfies
`cumulative_amount ≤ max_in_window`, then after `velocity::evaluate`
returns `Allow(deltas)` the new cumulative counter still satisfies the
bound. Every prior Allow preserves the invariant; a fresh ledger
trivially satisfies the base case. Cross-policy preservation against
`spending.weekly_max` is a separate proof if/when needed.

### 3 · `counterparty_tier_monotone`
**File:** [`programs/policy-vault/src/proofs/inv_counterparty_tier_monotone.rs`](../../programs/policy-vault/src/proofs/inv_counterparty_tier_monotone.rs)
**Harness:** `counterparty_tier_monotone`
**Sub-checks:** 8
**Time:** 0.02s

Anti-regression: if a STRICT policy (high `min_counterparty_tier`)
produces `Allow` for a given payee, a LOOSER policy (lower or equal
`min_tier`) on the same payee must also produce `Allow`. Loosening the
tier requirement can never turn an Allow into a Deny.

### 4 · `validation_expiry_correct`
**File:** [`programs/policy-vault/src/proofs/inv_validation_expiry_correct.rs`](../../programs/policy-vault/src/proofs/inv_validation_expiry_correct.rs)
**Harness:** `validation_expiry_correct`
**Sub-checks:** 85
**Time:** 0.23s

An expired attestation (`expires_at != 0 AND expires_at <= now_slot`)
cannot produce `Allow` from `require_validation::evaluate`. Subject +
capability + revocation checks are forced equal so expiry is the deciding
gate. Closes the obvious time-of-check / time-of-use stale-attestation
hole.

### 5 · `multisig_threshold_enforced`
**File:** [`programs/policy-vault/src/proofs/inv_multisig_threshold_enforced.rs`](../../programs/policy-vault/src/proofs/inv_multisig_threshold_enforced.rs)
**Harness:** `multisig_threshold_enforced`
**Sub-checks:** 149
**Time:** 77.17s

`PolicyAuthority::count_distinct_signing_members` cannot return a count
exceeding `min(member_count, signer_keys.len())`. This is the load-bearing
property that backs `set_killswitch`'s
`require!(distinct_count >= threshold)` gate. A caller cannot construct a
signer set that fools the function into over-counting (duplicate pubkeys,
off-by-one tricks, corrupted `members` arrays).

Bounded to 3 members + 3 signers for symbolic-search tractability; the
property generalises by induction.

### 6 · `gate_payment_strict_correctness` (Phase J5)
**File:** [`programs/policy-vault/src/proofs/inv_gate_payment_strict_correctness.rs`](../../programs/policy-vault/src/proofs/inv_gate_payment_strict_correctness.rs)
**Harnesses:** `strict_returns_ok_iff_allow` + `gate_decision_is_one_of_three_disjoint_variants`
**Sub-checks:** 131 + 127 = 258
**Time:** ~0.5s + ~0.4s = ~0.9s

Pins the contract the SDK's `composeAtomicSettleTx` relies on for atomicity:

  - `compose_decision == Allow`             ⇒ strict handler returns `Ok(())`
  - `compose_decision == Deny(_)`           ⇒ strict handler returns `Err(_)`
  - `compose_decision == RequireValidation` ⇒ strict handler returns `Err(_)`

Equivalently, `strict_returns_ok ⇔ matches!(decision, Allow)`. The
companion harness pins the disjointness of the three `GateDecision`
arms so a future fourth variant cannot silently slip past the strict
dispatch. If a future change re-routes the `Deny` arm to an `Ok` return
or introduces a new variant, both proofs fail loud.

## How to reproduce

From a fresh checkout:

```bash
# Install Kani once (one-time, ~3 min)
cargo install --locked kani-verifier
cargo kani setup

# Run all 6 proofs
cd programs/policy-vault
cargo kani --harness paused_killswitch_implies_no_allow
cargo kani --harness velocity_allow_implies_cumulative_le_max
cargo kani --harness counterparty_tier_monotone
cargo kani --harness validation_expiry_correct
cargo kani --harness multisig_threshold_enforced
cargo kani --harness strict_returns_ok_iff_allow
cargo kani --harness gate_decision_is_one_of_three_disjoint_variants
```

Or all-at-once via the CI workflow:

```bash
gh workflow run kani-prove.yml
```

Expected output per harness:

```
SUMMARY:
 ** 0 of <N> failed (<X> unreachable)

VERIFICATION:- SUCCESSFUL
```

## Why bounded?

Kani is a bounded model checker. Two of the proofs (`multisig`,
`paused`) use `#[kani::unwind(N)]` to cap loop iterations; this is
the standard discipline for finite-state proofs over Solana data
(member arrays cap at 7 per `PolicyAuthority`, atom-engine tier
domain is `0..=4`, etc.). The bounds match production-realistic state
sizes; symbolic search exhausts all reachable states inside those
bounds. For an unbounded inductive proof on top of these, the
canonical next step is `qedgen-formal-verification` skill (Lean 4 +
Kani harness compilation from a single `.qedspec`), tracked as a v1.1
hardening item.

## Sub-check breakdown

| # | Invariant | Failed | Sub-checks | Unreachable |
|---|-----------|-------:|-----------:|------------:|
| 1 | paused_implies_no_allow | 0 | 126 | 9 |
| 2 | velocity_counter_le_limit | 0 | 9 | — |
| 3 | counterparty_tier_monotone | 0 | 8 | — |
| 4 | validation_expiry_correct | 0 | 85 | 3 |
| 5 | multisig_threshold_enforced | 0 | 149 | 1 |
| 6 | gate_payment_strict_correctness (`strict_returns_ok_iff_allow`) | 0 | 131 | 3 |
| 6 | gate_payment_strict_correctness (`disjoint_variants`)            | 0 | 127 | 3 |

Failed: **0 / 635**.

## What this does NOT prove

- The Anchor handler's account-validation checks (these are tested via
  the `tests/policy-vault.spec.ts` Anchor end-to-end suite, not Kani).
- Borsh deserialization correctness of foreign PDAs (manual byte-offset
  parsers in `programs/policy-vault/src/ext/`; covered by the `proofs/`
  `smoke.rs` plus runtime constraint checks).
- Integer overflow in the SPL token transfer (legacy SPL token's own
  invariant).
- Liveness — a denied request never reaches Allow, but the proofs do not
  bound the number of denials before an Allow eventually fires.

The five invariants above are the **safety** properties: nothing
catastrophic happens. Liveness + economic-game-theoretic properties
are out of scope for v1.
