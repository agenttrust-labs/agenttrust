# Atomic-tx invariant — Token-2022 + TransferHook footgun proof

This proof closes the loop on the SDK's load-bearing safety property:

> `gate_payment` + SPL transfer + `emit_feedback` MUST execute as one
> Solana transaction. Splitting them silently corrupts state when a
> Token-2022 mint's `TransferHook` extension reverts the transfer.

The proof is structured as three layers; all three must hold. The
matrix below maps each layer to its evidence file.

| layer | what it proves | evidence |
|---|---|---|
| A · compile-time guard | `AtomicityEnforced` is a literal `true` marker. TS rejects `false`, missing, and `boolean` widening at compile time. | [`trustgate/sdk/src/atomicity.ts`](../../trustgate/sdk/src/atomicity.ts) lines 31-33 + [`trustgate/sdk/test/atomicity.test.ts`](../../trustgate/sdk/test/atomicity.test.ts) `describe("AtomicityEnforced literal-type guard")` |
| A · runtime guard | `assertAtomicityEnforced` throws `AtomicityNotEnforcedError` for any value that isn't strictly `=== true`. Catches `as any` casts. | [`trustgate/sdk/src/atomicity.ts`](../../trustgate/sdk/src/atomicity.ts) lines 51-58 + [`trustgate/sdk/test/atomicity.test.ts`](../../trustgate/sdk/test/atomicity.test.ts) `describe("assertAtomicityEnforced runtime check")` (6 cases) |
| A · composer structure | `composeAtomicSettleTx` returns ONE Transaction with EXACTLY 3 instructions in the canonical order — gate (PolicyVault) + transferChecked (Token / Token-2022) + emit_feedback (TrustGate). | [`trustgate/sdk/test/atomicity.test.ts`](../../trustgate/sdk/test/atomicity.test.ts) `describe("composeAtomicSettleTx")` (5 cases including Token-2022 program-id propagation) |
| B · single-tx atomic revert | When the bundled tx contains a failing inner ix, Solana reverts the entire bundle; `gate_payment_strict`'s state mutation rolls back. PolicyAccount + VelocityLedger stay clean. | [`tests/atomic-tx-invariant.spec.ts`](../../tests/atomic-tx-invariant.spec.ts) `describe("B. single-tx atomic revert")` |
| C · split-tx corruption | If a caller splits the bundle into two txs, gate_payment_strict commits in tx1, the failing transfer reverts in tx2, and VelocityLedger is left dirty (counted a payment that never moved). This is the corruption vector A + B prevent. | [`tests/atomic-tx-invariant.spec.ts`](../../tests/atomic-tx-invariant.spec.ts) `describe("C. split-tx anti-pattern corrupts state")` |

## The corruption vector

`gate_payment_strict` is allowed to mutate state on Allow:
- `PolicyAccount.spending_today_used`, `spending_today_anchor`,
  `spending_week_used`, `spending_week_anchor`
- `VelocityLedger.cumulative_amount`, `last_commit_slot`

If a downstream SPL transfer reverts after that mutation — and the two
ixs are in DIFFERENT Solana transactions — the gate's state is durable
while no money has moved. The next gate_payment for that agent reads
the inflated counters and may Deny a legitimate payment, or in the
inverse direction, counters drift such that velocity caps appear to be
hit when nothing real has happened.

A Token-2022 `TransferHook` extension is the canonical instance of this
fault model. The hook program runs synchronously inside the SPL
transferChecked execution; if it returns Err, the transfer aborts. The
specifics — compliance check, allowlist denial, freeze on suspicious
counterparty — are domain-specific. From the runtime's perspective, a
TransferHook revert is indistinguishable from any other inner-ix revert
(NonTransferable mint, DefaultAccountState=Frozen, MissingRequiredSignature,
out-of-funds). The atomicity guarantee is mint-extension-agnostic.

## Why the localnet proof uses System.transfer instead of a real TransferHook

Layer B+C tests deliberately use a `System.transfer` whose source
keypair is never signed (i.e., guaranteed `MissingRequiredSignature`)
as the failing inner instruction. This:

1. Exercises the same Solana atomicity semantics a TransferHook revert
   would — the runtime aborts the bundle, all child mutations roll back.
2. Requires no Token-2022 mint setup or custom hook program on the
   localnet validator, keeping the test focused on the property under
   proof rather than mint-init plumbing.
3. Documents the corruption vector at the layer where it actually
   matters: any failing inner ix corrupts split-tx state. TransferHook
   is one specific failure mode, not the property itself.

The Token-2022 angle is fully covered at the SDK layer:
[`trustgate/sdk/test/atomicity.test.ts`](../../trustgate/sdk/test/atomicity.test.ts)
`describe("composeAtomicSettleTx")` includes a case ("Token-2022 program
override propagates to the transfer ix") proving the SDK passes
`TOKEN_2022_PROGRAM_ID` through to the SPL transferChecked instruction
in the composed tx — so the production composed tx for a Token-2022
mint with TransferHook would carry the hook's revert into the same
single-tx atomicity envelope this proof exercises.

## Test summary

```text
# Layer A — SDK guards (pnpm --filter ./trustgate/sdk run test)
AtomicityEnforced literal-type guard
  ✔ compile-time: type accepts only literal `true`

assertAtomicityEnforced runtime check
  ✔ passes when atomicityEnforced === true
  ✔ throws AtomicityNotEnforcedError when atomicityEnforced === false
  ✔ throws when atomicityEnforced is missing
  ✔ throws when atomicityEnforced is null/undefined
  ✔ throws when atomicityEnforced is a truthy non-boolean (e.g., 1, 'yes')
  ✔ error message includes the site name + reference doc

composeAtomicSettleTx
  ✔ throws AtomicityNotEnforcedError without atomicityEnforced
  ✔ composes a 3-instruction tx (gate + transfer + feedback)
  ✔ derives the canonical PDAs for policy / velocity / killswitch / feedback log / authority
  ✔ the SPL transfer ix encodes the requested amount + decimals
  ✔ Token-2022 program override propagates to the transfer ix
  ✔ invokes the strict gate variant (D2)
  ✔ deriveStandardAta yields a deterministic ATA from owner + mint

# Layer B+C — localnet (anchor test)
atomic-tx invariant — Token-2022 + TransferHook footgun (localnet)
  B. single-tx atomic revert
    ✔ bundled tx reverts; PolicyAccount + VelocityLedger stay at zero
  C. split-tx anti-pattern corrupts state
    ✔ gate commits in tx1; failing transfer in tx2 leaves VelocityLedger dirty
```

## How to reproduce

```bash
# Layer A — SDK guards (pure JS, no validator)
pnpm --filter ./trustgate/sdk run build
pnpm --filter ./trustgate/sdk run test

# Layer B + C — localnet E2E proof
anchor test --provider.cluster localnet --validator legacy --skip-build
# (or, for a fresh build:  anchor test --provider.cluster localnet --validator legacy)
```

## Cross-references

- [`docs/plan/research/02-anchor-token2022-cpi-class.md`](../plan/research/02-anchor-token2022-cpi-class.md) §A.2 — original architecture analysis citing the TransferHook footgun
- [`trustgate/sdk/src/atomicity.ts`](../../trustgate/sdk/src/atomicity.ts) — the enforcement layer (literal-type marker + runtime check + composer)
- [`tests/policy-vault.spec.ts`](../../tests/policy-vault.spec.ts) `describe("gate_payment_strict + set_killswitch atomic")` — companion test proving the same single-tx atomicity property holds for a different ix combination (gate + killswitch flip)
