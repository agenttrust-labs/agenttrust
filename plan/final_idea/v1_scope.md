# v1 Scope — AgentTrust (frozen Day 5)

**Locked:** 2026-04-28. **Frozen for build phase 2026-04-29 → 2026-05-11.**

This document is the component-by-component contract for what ships in v1. Any change requires a date-stamped revision in `plan/final_idea/changes/`. The Wave-1 deep-dives may refine PDA byte layouts and instruction signatures; if so, those refinements land here via revision file, not silent edit.

**Scope option:** **Option 1 — Full 3-component v1.** PolicyVault with 5 policy kinds + full Kani harness; TrustGate as Anchor program + TS service + drop-in TS module; ValidationRegistry fully productized.

---

## Component 1 — PolicyVault (the moat)

### Five policy kinds (each ships in v1)

| # | Policy kind | One-line scope |
|---|-------------|----------------|
| 1 | **Spending** | Per-tx + daily + weekly limits with UTC midnight + ISO-week rollover; gates `amount` against `(per_tx_max, daily_max, weekly_max)` thresholds |
| 2 | **CounterpartyTier** | Manual deserialization of `AtomStats.trust_tier` from atom-engine PDA `["atom_stats", payee_asset]`; gates Allow iff `payee_tier ≥ min_counterparty_tier` (with optional `risk_score ≤ max_risk_score` and `confidence ≥ min_confidence` constraints) |
| 3 | **Velocity** | Sliding-window counter with tier-decay: rolling `N`-second window of cumulative spend; window size scales with payer's `trust_tier` (lower tier → tighter window → faster denial); VelocityLedger PDA per `(payer_agent_asset, policy_id)` |
| 4 | **RequireValidation** | Reads `ValidationAttestation` PDA from validation-registry; gates Allow iff a valid (non-expired, non-revoked) attestation exists for `(payee_asset, capability_hash)` from any attestor in `accepted_attestors[]` (or any attestor if `accepted_attestors` is empty — fully permissionless mode) |
| 5 | **KillSwitch** | Multisig-controlled emergency pause; gates Deny iff `KillSwitchState.paused == true` for `(scope: Global | PerCollection | PerAgent)` matching the request; multisig auth = 2-of-3 default, configurable up to 8-of-15 |

### gate_payment composer instruction

```rust
pub fn gate_payment(
    ctx: Context<GatePayment>,
    payer_agent_asset: Pubkey,
    payee_agent_asset: Pubkey,
    amount: u64,
    mint: Pubkey,
    policy_id: u32,
) -> Result<GateDecision>
```

Returns `GateDecision::{Allow, Deny(DenyReason), RequireValidation(capability_hash)}`. Composes the 5 policy kinds in order: KillSwitch → Spending → Velocity → CounterpartyTier → RequireValidation. **Fail-fast** on first Deny; **Allow** only if all five pass; **RequireValidation** if all pass except RequireValidation policy returns "missing attestation."

Decision logic is deterministic and side-effect-free for `Allow`/`Deny` paths. Velocity policy increments `VelocityLedger.cumulative_amount` only on `Allow` decisions (write occurs in the same tx via CPI from the facilitator that calls `gate_payment`).

### PDAs

| PDA | Seeds | Owner | Approx size |
|-----|-------|-------|-------------|
| `PolicyAccount` | `["policy", payer_agent_asset, policy_id_le_bytes]` | policy-vault | ~256 bytes (5 policy-kind config blocks) |
| `VelocityLedger` | `["velocity", payer_agent_asset, policy_id_le_bytes]` | policy-vault | ~80 bytes (sliding window state) |
| `KillSwitchState` | `["killswitch", scope_discriminator, scope_key]` | policy-vault | ~96 bytes |
| `PolicyAuthority` | `["policy_authority", payer_agent_asset]` | policy-vault | ~128 bytes (multisig members + threshold) |

Final byte layouts come from Wave-1 deep-dive #1 (Quantu PDA conventions for compatibility with the Anchor 0.31.1 + 1.0+ migration question Wave-1 #2 resolves).

### Kani FV harness — 5 invariants proven

Each invariant proven against the v1 implementation via `cargo kani`. Each gets its own proof harness file in `policy-vault/proofs/`. All five must pass green for v1 submission floor.

| # | Invariant | Plain-English statement |
|---|-----------|-------------------------|
| 1 | `paused_implies_no_allow` | If `KillSwitchState.paused == true` for any matching scope, `gate_payment` cannot return `Allow`. |
| 2 | `velocity_counter_le_limit` | `VelocityLedger.cumulative_amount ≤ Spending.weekly_max` after every `Allow` decision. |
| 3 | `counterparty_tier_monotone` | If `gate_payment` returned `Allow` with payee tier `T`, increasing the configured `min_counterparty_tier` to any value `≤ T` does not change the decision. |
| 4 | `validation_expiry_correct` | If a `ValidationAttestation` is past `expires_at` slot, `RequireValidation` cannot return `Allow` for that attestation. |
| 5 | `multisig_threshold_enforced` | A `set_killswitch` call cannot succeed without ≥ `PolicyAuthority.threshold` distinct signers from `PolicyAuthority.members`. |

Each invariant proof has a written sketch in `policy-vault/proofs/<n>-<name>.rs` with the harness skeleton. Wave-2 deep-dive #4 produces the harness pseudocode; Days 9-12 implement.

### Graceful degradation

If `agent-registry-8004` or `atom-engine` accounts are unreachable (rare on mainnet but possible during Quantu upgrade windows), CounterpartyTier policy returns `RequireValidation` (not `Deny`) so facilitators can route through the off-chain ValidationRegistry path. Velocity + Spending continue to function. KillSwitch is unaffected. This is documented and tested.

---

## Component 2 — TrustGate (the demo vehicle + first-facilitator integration kit)

### Anchor program

Two PDAs:

| PDA | Seeds | Owner |
|-----|-------|-------|
| `TrustGateAuthority` | `["trustgate_auth", facilitator_pubkey]` | trustgate (PDA-signer for `give_feedback` CPI) |
| `FeedbackEmissionLog` | `["feedback_log", payment_id_hash]` | trustgate (idempotency + audit trail) |

Three instructions:

| Instruction | Effect |
|-------------|--------|
| `init_authority(facilitator)` | Initializes `TrustGateAuthority` PDA; called once per facilitator deployment |
| `emit_feedback(payment_id, payee_asset, score, tag1, tag2, endpoint, feedback_uri)` | PDA-signed CPI to `agent_registry_8004::give_feedback`; signer seeds derived from `TrustGateAuthority` PDA; idempotency-checked via `FeedbackEmissionLog` |
| `dispute_payment(payment_id, payee_asset, dispute_reason)` | Emits negative-score feedback (score=20) with `tag1="dispute"` + `tag2=<reason>`; optionally CPIs to validation-registry to trigger attestor review |

### TypeScript Express service

Path: `trustgate/server/`. Single Express app, ~600 LOC.

| Endpoint | Behavior |
|----------|----------|
| `POST /verify` | Body `{payer_agent, payee_agent, amount, mint, policy_id}`. Constructs a read-only simulation of `policy_vault::gate_payment` (or invokes via CPI in a no-op tx). Returns `{decision: Allow\|Deny\|RequireValidation, reason_code, x402_headers}`. Returns HTTP **200 Allow** / **402 Payment Required + reason** / **402 + capability_hash to validate** |
| `POST /settle` | Body `{payer_agent, payee_agent, amount, mint, payment_id}`. Constructs settlement tx (SPL or Token-2022 transfer); sets idempotency token. After confirmation, CPIs `trustgate::emit_feedback` with score=100 (clean settlement) |
| `POST /dispute` | Body `{payment_id, dispute_reason}`. CPIs `trustgate::dispute_payment` with negative-score feedback; returns dispute_id |
| `GET /receipt/:payment_id` | Returns settlement state + emitted feedback signature + on-chain tx links for audit |

x402 spec compliance: the 402-status responses include the canonical `X-Payment-Required` headers (per Wave-2 deep-dive #5; final field set comes from Cascade x402 + Coinbase x402 spec reads).

### Drop-in TypeScript module

Path: `trustgate/sdk/`. NPM package `@agenttrust/trustgate`. Two import surfaces:

```typescript
import { mountTrustGate } from '@agenttrust/trustgate/express';
import { gatePayment, settle, dispute } from '@agenttrust/trustgate/client';
```

`mountTrustGate(app, config)` adds the four endpoints above to any existing Express facilitator's app. Config takes `{ rpcUrl, programIds, facilitatorKeypair, defaultPolicyId }`. ~400 LOC including types + tests.

The drop-in module is the **distribution vehicle for PolicyVault**. Facilitators (Dexter, atxp_ai, MCPay) can integrate AgentTrust in a day with `mountTrustGate(app, ...)` — no manual CPI plumbing.

---

## Component 3 — ValidationRegistry (the third ERC-8004 leg, productized)

### PDAs

| PDA | Seeds | Owner | ~Size |
|-----|-------|-------|-------|
| `ValidationRequest` | `["request", subject_asset, capability_hash, requester]` | validation-registry | ~192 bytes |
| `ValidationAttestation` | `["attestation", subject_asset, capability_hash, attestor]` | validation-registry | ~256 bytes (signed claim payload + expiry + revocation flag) |
| `AttestorProfile` | `["attestor", attestor_pubkey]` | validation-registry | ~128 bytes (display-name URI + total-attestations counter + revoked-attestations counter, used by downstream policy programs to compute trust weight) |
| `CapabilityNamespace` | `["capability", namespace_hash]` | validation-registry | ~160 bytes (namespace metadata: name, version, schema URI) |

### Instructions

| Instruction | Signer | Effect |
|-------------|--------|--------|
| `register_namespace(name, version, schema_uri)` | Anyone | Creates `CapabilityNamespace` PDA. Permissionless — any caller can register a capability namespace; downstream consumers filter by attestor reputation, not namespace gatekeeping |
| `request_validation(subject_asset, capability_hash, claim_uri, deadline)` | Subject's owner OR any third party | Creates `ValidationRequest` PDA; emits event for off-chain attestors to discover |
| `respond_to_validation(subject_asset, capability_hash, claim_payload, attestor_signature, expires_at)` | Attestor (signed Ed25519) | Creates `ValidationAttestation` PDA; sets `expires_at` slot; emits event |
| `revoke_validation(subject_asset, capability_hash, revocation_reason)` | Original attestor | Sets `ValidationAttestation.revoked = true`; emits revocation event for downstream consumers to subscribe to |
| `read_attestation(subject_asset, capability_hash, attestor)` | Anyone (view) | Returns `(exists, valid, expires_at, claim_payload_hash)` — used by PolicyVault `RequireValidation` policy kind via CPI or direct PDA read |
| `register_attestor(attestor_pubkey, display_name_uri)` | Anyone (self-registration permissionless) | Creates `AttestorProfile` PDA; downstream consumers pull this for trust-weight inputs |

### Capability-namespace convention

`capability_hash = SHA256(namespace_name_utf8 || ":" || version_utf8 || ":" || claim_descriptor_utf8)[0..32]`

10 v1 capability namespaces seeded in `docs/CAPABILITY-NAMESPACES.md`:

| Namespace | Example claim_descriptor | Example attestor |
|-----------|---------------------------|------------------|
| `kyc.tier-1` | `"kyc.tier-1:v1:identity-verified"` | Civic, Sumsub, Persona, Trulioo |
| `kyc.tier-2` | `"kyc.tier-2:v1:address-verified"` | Civic, Sumsub |
| `kyc.tier-3` | `"kyc.tier-3:v1:enhanced-due-diligence"` | Trulioo, Persona |
| `audit.smart-contract` | `"audit.smart-contract:v1:halborn"` | Halborn, OtterSec, Asymmetric Research |
| `audit.smart-contract` | `"audit.smart-contract:v1:ottersec"` | OtterSec |
| `model-card` | `"model-card:v1:anthropic-opus-4-7"` | Anthropic (self-attest) |
| `model-card` | `"model-card:v1:openai-gpt-4o"` | OpenAI (self-attest) |
| `jurisdiction` | `"jurisdiction:v1:eu-mica-compliant"` | Regional KYC providers |
| `compliance.payments` | `"compliance.payments:v1:mastercard-fact-aligned"` | Mastercard / Fime |
| `agent-source` | `"agent-source:v1:nous-research-hermes-v3"` | Nous Research |

Wave-2 deep-dive #6 fills out the hash-derivation reference + 5-attestor outreach plan.

### Permissionless-attestor v1 sybil model

**v1 ships:** downstream-consumer-filtering. Any signer can self-register as an attestor (`register_attestor`) and submit attestations (`respond_to_validation`). The registry imposes **zero gatekeeping**. PolicyVault's `RequireValidation` policy kind accepts attestations only from attestors in its `accepted_attestors[]` allowlist (or any attestor if the list is empty — pure permissionless). Sybil-resistance is therefore enforced by *consumers*, not the registry.

**v1.1+ roadmap:** stake-weighted attestor scoring (per `plan/research/06-validation-registry-class.md` Wave 2 output); slashing for revoked-as-fraudulent attestations. Documented in `docs/COMPLETING-THE-TRUST-STACK.md` as the explicit roadmap.

---

## Repo structure (single repo)

```
agenttrust/
├── README.md                          # leads with "completes the Foundation's ERC-8004 trust stack"
├── LICENSE                            # MIT (workspace root)
├── Cargo.toml                         # Anchor workspace, pinned to chosen anchor + solana versions
├── Anchor.toml                        # 3 programs declared; cluster configs (devnet + mainnet-beta)
├── package.json                       # TS workspace root (yarn or pnpm)
├── tsconfig.json
├── docs/
│   ├── COMPLETING-THE-TRUST-STACK.md  # narrative artifact; load-bearing pitch input
│   ├── ARCHITECTURE.md                # 3-component diagram + CPI flow
│   ├── CAPABILITY-NAMESPACES.md       # v1 namespace + 10 seeded capabilities
│   ├── ATTESTOR-ONBOARDING.md         # 5 named attestors + integration guide (Halborn, OtterSec, Civic, etc.)
│   ├── INTEGRATION-FACILITATOR.md     # drop-in TS module guide for x402 facilitators
│   ├── SECURITY.md                    # Kani harness + threat model + audit roadmap
│   └── PINNED-VERSIONS.md             # commit hashes for agent-registry-8004 + atom-engine
├── programs/
│   ├── policy-vault/
│   │   ├── Cargo.toml
│   │   ├── Xargo.toml
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── state.rs               # PolicyAccount, VelocityLedger, KillSwitchState, PolicyAuthority
│   │   │   ├── events.rs
│   │   │   ├── errors.rs
│   │   │   ├── policies/
│   │   │   │   ├── mod.rs             # PolicyKind enum + dispatch
│   │   │   │   ├── spending.rs
│   │   │   │   ├── counterparty_tier.rs   # manual AtomStats deserialization lives here
│   │   │   │   ├── velocity.rs
│   │   │   │   ├── require_validation.rs
│   │   │   │   └── killswitch.rs
│   │   │   ├── instructions/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── init_policy.rs
│   │   │   │   ├── update_policy.rs
│   │   │   │   ├── set_killswitch.rs
│   │   │   │   └── gate_payment.rs    # the composer
│   │   │   └── ext/
│   │   │       ├── agent_registry.rs  # AgentAccount manual deserialization (re-exported types)
│   │   │       └── atom_engine.rs     # AtomStats manual deserialization
│   │   └── proofs/
│   │       ├── 1-paused-no-allow.rs
│   │       ├── 2-velocity-le-limit.rs
│   │       ├── 3-counterparty-tier-monotone.rs
│   │       ├── 4-validation-expiry.rs
│   │       └── 5-multisig-threshold.rs
│   ├── trustgate/
│   │   ├── Cargo.toml
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── state.rs               # TrustGateAuthority, FeedbackEmissionLog
│   │   │   ├── events.rs
│   │   │   ├── errors.rs
│   │   │   ├── instructions/
│   │   │   │   ├── init_authority.rs
│   │   │   │   ├── emit_feedback.rs   # PDA-signed CPI to give_feedback
│   │   │   │   └── dispute_payment.rs
│   │   │   └── ext/
│   │   │       └── agent_registry.rs  # give_feedback CPI binding
│   ├── validation-registry/
│   │   ├── Cargo.toml
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── state.rs               # ValidationRequest, ValidationAttestation, AttestorProfile, CapabilityNamespace
│   │   │   ├── events.rs
│   │   │   ├── errors.rs
│   │   │   └── instructions/
│   │   │       ├── register_namespace.rs
│   │   │       ├── request_validation.rs
│   │   │       ├── respond_to_validation.rs
│   │   │       ├── revoke_validation.rs
│   │   │       ├── register_attestor.rs
│   │   │       └── read_attestation.rs
├── trustgate/
│   ├── server/                        # Express x402 facilitator service
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── routes/
│   │       │   ├── verify.ts
│   │       │   ├── settle.ts
│   │       │   ├── dispute.ts
│   │       │   └── receipt.ts
│   │       ├── x402/
│   │       │   ├── headers.ts
│   │       │   └── status-codes.ts
│   │       └── chain/
│   │           ├── policy-vault-client.ts
│   │           ├── trustgate-client.ts
│   │           └── transactions.ts
│   └── sdk/                           # Drop-in TS module @agenttrust/trustgate
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts               # re-exports
│           ├── express.ts             # mountTrustGate(app, config)
│           ├── client.ts              # gatePayment / settle / dispute helpers
│           └── types.ts
├── tests/
│   ├── integration/
│   │   ├── policy-vault.spec.ts
│   │   ├── trustgate.spec.ts
│   │   ├── validation-registry.spec.ts
│   │   └── end-to-end.spec.ts
│   └── bankrun/                       # localnet-only bankrun harnesses
│       ├── policy-vault/
│       ├── trustgate/
│       └── validation-registry/
├── scripts/
│   ├── prewarm-demo-agents.ts         # Day-5 critical action: register 5 demo agents on Quantu mainnet ATOM
│   ├── feedback-cron.ts               # daily positive-feedback emission for pre-warmed agents
│   ├── deploy-devnet.sh
│   └── deploy-mainnet.sh
└── .github/
    └── workflows/
        ├── anchor-build.yml
        ├── anchor-test.yml
        ├── kani-prove.yml
        └── ts-test.yml
```

### License decisions per folder

| Folder | License | Rationale |
|--------|---------|-----------|
| Workspace root + all `programs/*/` | **MIT** | Mirrors Quantu's `agent-registry-8004` MIT license; mirrors Solana Foundation's preferred posture; maximizes facilitator integration speed; eligibility for Public Goods Award |
| `trustgate/server/` | **MIT** | Reference implementation — facilitators copy or fork |
| `trustgate/sdk/` | **MIT** | NPM-published; permissive ensures any facilitator can integrate |
| `docs/` | **CC-BY-4.0** | Docs are documentation, not code; CC-BY-4.0 is the standard |
| `scripts/` | **MIT** | Operational scripts; same as code |

No AGPL anywhere. No "non-commercial" clauses. Mirroring Quantu's MIT posture removes any license-friction objection from facilitator integrators.

---

## Mainnet vs devnet vs localnet decisions per phase

| Phase | Cluster | Why |
|-------|---------|-----|
| **Day 5-9 development** | **Localnet (`solana-test-validator`)** + bankrun | Fast iteration; no airdrop friction; no devnet flake; tests run in CI. Localnet validator includes `--clone` of Quantu's mainnet `agent-registry-8004` + `atom-engine` programs for realistic CPI testing |
| **Day 7 critical integration test** | **Devnet** | First time PolicyVault's CounterpartyTier policy reads ACTUAL `AtomStats` PDA. Validates manual deserialization against live ATOM Engine. If devnet flakes, fall back to localnet `--clone` |
| **Day 5+ ongoing** | **Mainnet ATOM tier-vesting** | Pre-warmed 5 demo agents are on **mainnet** because tier vesting requires 8 epochs (~20 days) of feedback events; only mainnet has the production ATOM engine state. Pre-warmed agents are demo-only, not v1 program state |
| **Day 11 end-to-end** | **Devnet** | Full TrustGate → PolicyVault → settlement → feedback flow tested against live Quantu primitives on devnet |
| **Day 12 demo dry-run #1** | **Devnet (primary) + localnet (fallback)** | If devnet stable, demo runs there; if devnet flakes, localnet `--clone` mirror with mocked ATOM Engine state |
| **Day 16 mainnet deployment** | **Mainnet-beta** | PolicyVault + TrustGate + ValidationRegistry programs deployed to mainnet for the submission. Pre-warmed demo agents (mainnet-only since Day 5) are now tier 2-3 and demoable |
| **Day 17 submission demo** | **Mainnet (primary) + recorded backup** | Live demo runs against mainnet for the submission video; pre-recorded backup on hand if mainnet RPC flakes during recording |

### Devnet fallback strategy (Risk 1 — Quantu breaking change mid-hackathon)

If Quantu pushes a breaking v0.7.0 to mainnet between Day 5 and Day 16:

1. **Pin commit hash** of `agent-registry-8004` at the chosen Day-5 version. AgentTrust's manual deserialization binds to that commit's PDA layout.
2. **Localnet validator** clones the pinned-version programs (Anchor's `[test.validator] clone` directive). Devnet may run a newer Quantu version, but localnet runs our pinned version.
3. **Demo recording falls back to localnet `--clone`** if devnet has the breaking change. Pitch beat shifts from "live on devnet against Quantu's mainnet primitives" to "demonstrated against pinned-Quantu-version primitives; production deployment to mainnet pending Quantu v1.0 stable release."

---

## Pinned external program commits

To be filled in on Day 5 morning after reading `plan/research/01-quantu-source-code-class.md`. Placeholder for now:

| Dependency | Repo | Commit hash | Pin reason |
|------------|------|-------------|------------|
| `agent-registry-8004` | `github.com/QuantuLabs/8004-solana` | TBD Day 5 | The PDA layout AgentTrust manually deserializes |
| `atom-engine` | within `8004-solana` (program path) | TBD Day 5 | The `AtomStats` PDA AgentTrust reads `trust_tier` from |
| Anchor | `github.com/solana-foundation/anchor` | TBD Day 5 (pin to latest 1.0+ stable) | Build toolchain |
| Solana CLI / SDK | — | TBD Day 5 | Cluster-compatible version |

The Wave-1 deep-dives must surface:
- The exact Quantu commit hash to pin to (#1 — Quantu source class)
- The Anchor 1.0+ stable version compatible with manual cross-program PDA deserialization (#2 — Anchor + Token-2022 class)
- Any Token-2022 extension support requirements for Spending policy kind v1 (#2)

These pinned values are the FIRST entries in `docs/PINNED-VERSIONS.md` once Day 5 begins.

---

## What is explicitly NOT in v1

These are flagged for v1.1+ and tracked in `docs/COMPLETING-THE-TRUST-STACK.md`:

1. **Stake-weighted attestor sybil-resistance** in ValidationRegistry. v1 ships permissionless + downstream-consumer-filtering only.
2. **Slashing for fraudulent attestations.** v1 ships `revoke_validation` mechanic only.
3. **On-chain dispute arbitration** beyond the `dispute_payment` negative-feedback emission. v1 does not ship quorum / weighting / multi-attestor consensus.
4. **Multi-registry adapter pattern.** v1 ships 8004-Solana-only (Foundation-endorsed). MIP-014 / SAEP-adapter / SATI-adapter all flagged for v1.1+.
5. **Hosted product layers.** PolicyVault dashboard SaaS / TrustGate facilitator-side admin / ValidationRegistry attestation marketplace are all post-Frontier business work.
6. **Cross-chain validation portability.** Same `capability_hash` working across Base / Polygon / Arbitrum ERC-8004 implementations is Phase-3 (Day 60+).
7. **Indexer for content-aware policies.** "Block if any feedback tagged 'fraud' in last 100 events" requires indexer integration. v1 ships tier-based + risk-score-based + capability-attestation policies only.
8. **Streaming-payment policy kind.** SAEP's TreasuryStandard ships streaming budgets; AgentTrust v1 does not. Flagged for v1.1+.

---

## Acceptance criteria for v1 lock (Day 17 submission gate)

Each item must be checkable; checking is binary.

<!-- COMMENTED OUT 2026-05-01 (full-build commitment locked):
If any fail, the cut-priority order from `agenttrust-solo-build-assessment.md` triggers; if cuts cascade past the floor (PolicyVault + CounterpartyTier + 90s demo + Variant-B pitch + Foundation-alignment language), I switch to AgentSafe Hooks pure submission.
-->

- [ ] PolicyVault deployed to mainnet-beta with all 5 policy kinds functional
- [ ] All 5 Kani invariants prove green via `cargo kani` in CI
- [ ] TrustGate Anchor program deployed to mainnet-beta
- [ ] TrustGate Express server running and demoed against live Quantu primitives
- [ ] TrustGate `@agenttrust/trustgate` SDK published to npm (or scoped publish)
- [ ] ValidationRegistry deployed to mainnet-beta with all 6 instructions
- [ ] At least one `respond_to_validation` flow demoed end-to-end (test attestor + capability)
- [ ] 5 pre-warmed demo agents on mainnet ATOM are tier ≥ 2 by Day 12
- [ ] 90-second demo video shows live denial-then-acceptance based on counterparty tier
- [ ] Pitch video at minimum 2-minute length, Variant B opener per `plan/final_idea/PITCH_FRAMES_LOCKED.md` (treasury-bot-routed-to-clone-of-real-Solana-protocol)
- [ ] README leads with "completes the Foundation's ERC-8004 trust stack"
- [ ] `docs/COMPLETING-THE-TRUST-STACK.md` written and referenced from README
- [ ] Repo public, MIT-licensed at workspace root
- [ ] Twitter bio updated with AgentTrust + Foundation-alignment language
- [ ] Submission uploaded to Colosseum portal

---

## Sign-off

Locked Day 5, 2026-04-29. Revisions to this scope are date-stamped under `plan/final_idea/changes/`.

— Mohit
