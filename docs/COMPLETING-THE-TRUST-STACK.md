# Completing the Trust Stack

*The third leg of ERC-8004 on Solana — and what it costs to wire it together.*

---

## The agent-payment scaling crisis

Solana processed fifteen million agent-driven payments last quarter. As volume rose, so did counterparty fraud. Last week a treasury bot routed one-point-two million USDC to a clone of a real Solana protocol. Smart contracts held up; the human-trust layer didn't.

There has been no on-chain check that gates payments on counterparty identity and reputation against the registry the Solana Foundation just endorsed. AgentTrust is that check. It ships the leg of the ERC-8004 trust stack that has been missing on Solana since v0.5.0 — open-source, MIT-licensed, six formally-verified safety properties, and a drop-in TypeScript SDK.

This document explains what was missing, what is now there, and how to verify each claim against on-chain state.

## What the Foundation already shipped

Quantu Labs' `8004-solana` repo published two of the three ERC-8004 legs:

- **`agent-registry-8004`** — agent identity and the reputation primitive (`give_feedback`). Each agent gets an MPL-Core asset plus a Borsh-typed `AgentAccount` PDA, mintable by anyone, owned by the agent's wallet.
- **`atom-engine`** — confidence-weighted reputation aggregation. The `AtomStats` PDA stores `tier_immediate` and `tier_confirmed` bytes the rest of the stack can read.

Together they cover *who* an agent is and *how* its history scores. Both are deployed on devnet and mainnet. Both are MIT-licensed. The third leg — **ValidationRegistry** — was scaffolded in `8004-solana` v0.4 and then archived in v0.5.0 pending a redesign. That left a gap nothing else on Solana fills:

- Identity says *who*.
- Reputation says *how reliable, historically*.
- Validation says *who attests to a capability the payer's policy requires* — KYC tier, audit attestation, jurisdictional compliance, model-card provenance, payment-network membership. ERC-8004's V variant.

Without the third leg, every facilitator has to implement capability checks ad hoc against a private allowlist. Counterparty fraud finds the seams between those allowlists. The same Drift-incident pattern Lily Liu highlighted on 2026-04-02 — *smart contracts held up; humans were the target* — replays on every facilitator that doesn't have a shared, on-chain capability surface.

## What AgentTrust adds

AgentTrust reads from the two Foundation-endorsed legs and writes the third. Three Anchor programs, deployed on Solana devnet, MIT-licensed, with a drop-in TypeScript surface that any x402 facilitator can mount in five lines.

### Architecture in one paragraph

A facilitator's `/protected` endpoint mounts `mountTrustGate(app, …)` from the SDK. On a payment attempt, the middleware composes one Solana transaction containing three instructions: a `gate_payment_strict` call into **PolicyVault** (the policy engine), an SPL `transferChecked` for settlement, and an `emit_feedback` CPI from **TrustGate** (the facilitator-side Anchor program) into Quantu's `agent-registry-8004::give_feedback`. The PolicyVault gate reads counterparty tier from `atom-engine::AtomStats`; if the policy requires capability validation it reads a **ValidationRegistry** attestation. All three instructions live in one transaction — Solana atomicity guarantees the ledger never sees a partial settle.

### The three programs

**PolicyVault** is policy-as-code. Five orthogonal policy kinds — KillSwitch, Spending, Velocity, CounterpartyTier, RequireValidation — compose into a single `gate_payment` instruction with fail-fast semantics: KillSwitch first, then Spending, Velocity, CounterpartyTier, RequireValidation. The composer returns `Allow`, `Deny(DenyReason)`, or `RequireValidation(capability_hash)`. CounterpartyTier reads byte 551 of Quantu's `AtomStats` (a manual byte-offset parser pinned to commit `bfb09ad` — zero Cargo dep on Quantu's crate, schema-version canary at byte 560 catches drift). RequireValidation reads the ValidationAttestation PDA the third program produces.

A strict variant — `gate_payment_strict` — converts non-Allow into `Err`. That is the variant the SDK's atomic composer uses, so any Deny on the gate fails the entire bundled transaction. The SDK's compile-time `AtomicityEnforced` literal-type marker plus a runtime `assertAtomicityEnforced` throw refuse callers who try to split `gate_payment + transfer + emit_feedback` across multiple transactions. Splitting opens a footgun on Token-2022 mints with TransferHook extensions: tx 1 commits the gate's velocity update, tx 2 reverts when the hook denies the transfer, and the ledger now records a payment that never moved. The two SDK guards plus single-transaction packaging close the corruption vector at three layers.

**TrustGate** is the facilitator-side Anchor program plus the TypeScript SDK on npm. Two PDAs — `TrustGateAuthority` (per-facilitator, PDA signer for the CPI) and `FeedbackEmissionLog` (init-only, keyed by `payment_id_hash`, the on-chain idempotency receipt). The SDK ships an Express-mountable middleware, a client function, four facilitator adapters (Pay.sh, Dexter, atxp, MCPay), and the atomic-tx composer. Pay.sh — the Solana Foundation's first x402 facilitator, launched 2026-05-05 with Google Cloud — is the canonical adapter; the others share a `FacilitatorAdapter` interface a maintainer can extend in under a hundred lines.

**ValidationRegistry** is the third leg, productized. Five instructions — `register_namespace`, `register_attestor`, `request_validation`, `respond_to_validation`, `revoke_validation` — over four PDAs (`CapabilityNamespace`, `AttestorProfile`, `ValidationRequest`, `ValidationAttestation`). The v1 sybil-resistance model is downstream-consumer filtering: PolicyVault stores a per-policy `accepted_attestors[]` array; only attestations from those keys flip the gate to Allow. Permissionless namespace and attestor registration plus opinionated downstream filtering trades global gatekeeping for local trust, which is the only model that scales with the number of facilitators.

## What ships in v1

Six artifacts, each independently verifiable against devnet or via `cargo` / `pnpm` from a clean checkout.

**1. Three Anchor programs deployed on devnet.** PolicyVault `8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR`, TrustGate `HF8zHfoyA7b5mhLViopTnRMprc6ZT5KActHTdkFrih2N`, ValidationRegistry `Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv`. All three executable, all three with IDLs published. `solana program show <id> --url devnet` confirms each.

**2. Six machine-checked safety invariants.** All proven by [model-checking/kani](https://github.com/model-checking/kani) v0.67.0 against the pure-Rust composer:

- *paused_implies_no_allow* — a paused KillSwitch can never produce Allow.
- *velocity_counter_le_limit* — every Allow preserves `cumulative ≤ max_in_window`.
- *counterparty_tier_monotone* — a strict policy that allows must imply a looser policy allows.
- *validation_expiry_correct* — an expired attestation cannot produce Allow.
- *multisig_threshold_enforced* — distinct-signer count cannot exceed the threshold.
- *gate_payment_strict_correctness* — strict handler returns Ok if and only if the lazy composer returns Allow, and the three `GateDecision` arms are pairwise disjoint.

635 sub-checks total, zero failures, ~80 seconds on a single CI runner. The harnesses live in `programs/policy-vault/src/proofs/`; the workflow at `.github/workflows/kani-prove.yml` re-runs all six on every PR. The strict-correctness invariant is the load-bearing one for atomicity — if a future change re-routes the `Deny` arm to an `Ok` return, the proof fails loud.

**3. Atomic-tx invariant proven on localnet plus the SDK.** The SDK side covers the type guard, the runtime guard, and the composed-tx structure (the SDK pack ships `composeAtomicSettleTx` returning a single `Transaction` with exactly three instructions in canonical order). The localnet side proves the runtime semantics: a bundled tx with a deliberately-failing inner instruction reverts the whole bundle, leaving PolicyAccount and VelocityLedger clean; splitting the same flow into two transactions corrupts state. Token-2022 with TransferHook is the corruption vector that motivates the proof, but the runtime guarantee is mint-extension-agnostic — a missing-signature revert produces the same atomicity behaviour a TransferHook revert would. Full writeup in `docs/proofs/transfer-hook-atomicity.md`.

**4. Ten canonical capability namespaces seeded on devnet.** `kyc.tier-{1,2,3}.v1`, `audit.{smart-contract,attestor-firm}.v1`, `model-card.v1`, `jurisdiction.v1`, `compliance.payments.v1`, `agent-source.v1`, plus the `usdc-payment-policy.v1` from the Phase D attestor demo. Names are bounded by `MAX_NAME_LEN = 32` on chain; the playbook-level descriptive labels decompose to these category names plus the JSON `description` field. Every PDA + transaction signature lives in `examples/attestor-demo/devnet-namespaces.json`. Re-run `pnpm --filter ./examples/attestor-demo run seed:namespaces` is idempotent.

**5. Chained-validation devnet trace, four signatures.** `gate_payment` with no attestation account returns RequireValidation; `request_validation` then `respond_to_validation` create the attestation PDA; `gate_payment` again with the attestation flips the decision to Allow. Four signatures, all in `examples/attestor-demo/devnet-chained-validation.json`. This is the canonical proof that the third leg actually closes the loop.

**6. Live policy reads against Quantu's reputation primitive.** The hosted demo at `demo.agenttrust.tech` runs the live-tier path: every gate fetches the payer's `AtomStats` PDA via the byte-551 parser, with a 60-second per-payer cache so RPC load stays bounded under burst traffic. Schema-version drift, owner mismatch, undersized accounts, and tier-out-of-range values all degrade gracefully to the static fallback table — no transient outage flips every payer to Deny. Twenty unit tests pin the cache lifecycle, parser invariants, and degradation paths.

## How it composes with x402 facilitators

Pay.sh (`pay.sh`) is the first x402 facilitator on Solana — Foundation-launched 2026-05-05 with Google Cloud. AgentTrust ships day-one Pay.sh integration. The SDK's `mountTrustGate(app, …)` adds `POST /verify`, `POST /settle`, `POST /dispute`, and `GET /receipt/:hash` to any Express app; the route handlers run AgentTrust's policy gate, parse the x402 payment proof through the Pay.sh adapter, and emit feedback via the atomic transaction. Three other adapters — Dexter, atxp, MCPay — share the same interface; a maintainer adds a fourth in roughly a hundred lines.

The whole surface area for an integrator is:

```ts
import { mountTrustGate } from "@agenttrust-sdk/trustgate/express";

await mountTrustGate(app, {
  rpcUrl:             "https://api.devnet.solana.com",
  facilitatorKeypair: Keypair.fromSecretKey(/* … */),
  network:            "solana-devnet",
  atomicityEnforced:  true,                // literal `true` — TS rejects `false`
});
```

The `atomicityEnforced: true` literal is the SDK contract: every `composeAtomicSettleTx` site requires it, the type system rejects callers who omit it or pass a `boolean`, and the runtime throws `AtomicityNotEnforcedError` on `as any` bypasses. Six tests in `trustgate/sdk/test/atomicity.test.ts` cover the type and runtime guards; the localnet spec covers the on-chain semantics.

## What's deferred — and why none of it blocks v1

Three deliverables are explicitly outside the v1 frame:

- **Ed25519 sysvar verify in `respond_to_validation`.** v1 attestors sign the transaction itself, which is sufficient for the demo and for any current facilitator workflow. v1.1 mirrors Quantu's `set_agent_wallet` pattern so a future attestor-key compromise cannot retroactively forge attestations. Tracked, scoped, not load-bearing for the Frontier demo.
- **Stake-weighted attestor scoring with slashing.** v1 ships permissionless attestor registration plus per-policy `accepted_attestors[]` filtering — the same model that produced the four-signature chained-validation trace. v1.1 adds a `staked_amount` field on `AttestorProfile`; a future v2 adds slashing arbitration. Each phase has a separate scope doc.
- **Cross-chain capability portability.** The same `capability_hash` working across Base, Polygon, and Arbitrum ERC-8004 implementations. Day-60+ deliverable; the SHA-256 hash construction is already chain-agnostic.

These are explicit, scoped, tracked. None of them gate the v1 demo or the Foundation-alignment narrative. A reader who wants the full list with rationale gets it from `docs/plan/final_idea/v1_scope.md` and the date-stamped revisions under `docs/plan/final_idea/changes/`.

## Public goods — and how to verify

Every artifact in this stack is MIT-licensed (programs, SDK, server, tests, scripts, demo, MCP tooling) or CC-BY-4.0 (documentation under `docs/`). The repository is at `github.com/agenttrust-labs/agenttrust`. The SDK is at `npmjs.com/package/@agenttrust-sdk/trustgate`. The MCP tools — eighteen of them, exposing every SDK surface to Claude Desktop and Cursor — are at `npmjs.com/package/@agenttrust-sdk/mcp` (operator-publish gated). Hosted endpoints run from the `agenttrust.tech` apex: `mcp.agenttrust.tech`, `api.agenttrust.tech`, `demo.agenttrust.tech`, all backed by Let's Encrypt and Fly.io with the bare `*.fly.dev` hostnames as fallbacks.

Every claim above is independently checkable. `solana program show` confirms the three program IDs are executable on devnet. `cargo kani --harness <name>` re-runs each formal proof in under ten seconds. `anchor test --provider.cluster localnet --validator legacy --skip-build` runs the full 52-test integration suite, including the atomic-tx-invariant and chained-killswitch atomicity proofs. `pnpm --filter ./examples/attestor-demo run chained` re-emits the four-signature chained-validation trace. `pnpm --filter ./trustgate/sdk run test` runs the SDK's 56 atomicity-and-PDA-derivation unit tests. The README has the exact commands in copy-pasteable form.

The thesis is small enough to fit in a sentence: a counterparty-aware payment gate that reads from the Foundation-endorsed registry. The implementation is large enough to need three Anchor programs, a TypeScript SDK, four facilitator adapters, an MCP server, six formal proofs, and twenty Solana-Explorer-linked devnet signatures. Every piece is open. Every piece composes with what the Foundation already shipped. None of it tries to replace that work — it completes it.
