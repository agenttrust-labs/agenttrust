# AgentTrust — Reframed Draft Spec (Day 4 Phase 2)

**Status:** DRAFT for the reframe attempt. NOT a sharpened submission spec. The single purpose of this file is to make the reframed AgentTrust concrete enough that Phase 3 can honestly answer: *is this meaningfully distinct from AgentSafe Hooks, or is it a near-substitute?*

**Ground truth this builds on:**
- `research/01-hackathon-mechanics/vibhu-platform-brief.md` — SDP doesn't ship agent identity / reputation / policy / safety hooks. GREEN gate.
- `research/06-competitive-intel/agent-registry-cpi-surface.md` — Solana Agent Registry (`agent-registry-8004` mainnet `8oo4dC4...` + ATOM Engine `AToMw53a...`) ships identity + reputation, MIT-licensed, Foundation-endorsed at `solana.com/agent-registry`, **does NOT** ship policy enforcement / payment mediation / Validation Registry / dispute arbitration.
- `research/00-thesis/AgentSafe-SHARPENED.md` — the reference Day-3 sharpened spec the reframe is being compared against.

Last verified: 2026-04-27

---

## The reframed thesis (one paragraph)

**AgentTrust** is a Solana-native, Anchor-based **policy + payment-mediation layer that consumes the Solana Agent Registry's identity + reputation primitives** to enforce agent-payment safety at the *agent-runtime layer* — that is, before the payment leaves the agent's facilitation surface, gated by the counterparty agent's ATOM trust tier, ownership, capability claims, and dispute history. Single submission. Three components: (1) **PolicyVault** — Anchor program holding per-agent or per-mint policy PDAs that read `AgentAccount` + `AtomStats` PDAs as inputs; (2) **TrustGate x402** — reference x402 facilitator integration that routes every micropayment through PolicyVault and emits an on-chain feedback event after each settlement (closing the trust loop); (3) **ValidationRegistry** — implementation of the third ERC-8004 leg (capability attestations issued by external validators) that Quantu archived in v0.5.0 and never returned to. Open-source Apache 2.0 for the policy + validation programs; BSL 1.1 for the hosted facilitator dashboard. Pitched as *"the policy + mediation layer that completes the Solana Foundation's agent trust stack — identity + reputation are shipped, policy + validation are missing, we ship them both."*

---

## Why each component exists at this layer (not asset-layer)

| Component | What it does | Why agent-layer not asset-layer |
|-----------|--------------|----------------------------------|
| **PolicyVault** | Anchor program with `gate_payment(payer_agent, payee_agent, amount, mint, policy_pda)` instruction that returns `Allow / Deny / RequireValidation` based on policy rules referencing `AtomStats.trust_tier`, `AtomStats.risk_score`, `AgentAccount.metadata`, and Validation Registry attestations | Reputation attaches to the AGENT IDENTITY (the Metaplex Core NFT), not to the asset (mint). A Token-2022 hook gates per-mint regardless of which agent transacts; PolicyVault gates per-agent regardless of which mint. Defense in depth: AgentSafe Hooks blocks the mint; PolicyVault blocks the *signer-agent-relationship* before the transfer is even constructed. |
| **TrustGate x402** | Reference facilitator that wraps any x402 request: pre-flight calls PolicyVault, post-settlement calls `give_feedback` via PDA-signed CPI to the Agent Registry. Auto-rates counterparty agents on payment success, dispute, settlement-time. | x402 facilitators (Dexter, MCPay, etc.) ship payment routing but no identity-aware gating + no automated feedback emission. AgentSafe Hooks lives in the mint layer where it cannot see "which agent initiated this payment." TrustGate x402 lives at the facilitator request boundary where the agent identity IS the request context. |
| **ValidationRegistry** | Anchor program implementing the archived ERC-8004 third leg: `request_validation(asset, validator, capability_descriptor)` and `respond_to_validation(request, attestation_payload)`. Validators are arbitrary signers (not protocol-curated). Validation responses become inputs to PolicyVault. | This is a Foundation-aligned wedge that 8004-Solana shipped in v0.1.0 then archived. Mohit ships the productized version. AgentSafe Hooks is asset-layer enforcement; Validation Registry is *out-of-band* attestation that things asset-layer hooks cannot observe (e.g., off-chain compliance certifications, model-card audits, capability proofs). |

---

## Component 1 — PolicyVault: agent-layer policy PDAs

### Design

Each policy is a PDA owned by a "policy authority" (typically the agent's owner, but assignable):

- Seeds: `["policy", agent_asset, policy_id]`
- Fields:
  - `agent_asset: Pubkey` — the agent the policy applies to
  - `policy_authority: Pubkey` — who can update
  - `policy_kind: u8` — enum (Spending / Counterparty / Jurisdictional / Velocity / KillSwitch / RequireValidation)
  - `params: [u8; 256]` — kind-specific encoded params (e.g., for Spending: daily_limit_lamports, hourly_limit_lamports, lookback_window)
  - `min_counterparty_tier: u8` — read against `AtomStats.trust_tier` of payee
  - `max_counterparty_risk: u8` — read against `AtomStats.risk_score` of payee
  - `required_validation_capability: Option<[u8; 16]>` — capability hash the payee must have a validated attestation for
  - `kill_switch_authority: Option<Pubkey>` — can flip an emergency-pause flag
  - `paused: bool`
  - `bump: u8`

### CPI / PDA read pattern (the differentiating mechanic)

The headline `gate_payment` instruction:

```rust
#[derive(Accounts)]
pub struct GatePayment<'info> {
    #[account(seeds = [b"policy", payer_agent.key().as_ref(), &policy_id.to_le_bytes()], bump)]
    pub policy: Account<'info, PolicyAccount>,

    /// Payer agent's identity record from agent-registry-8004
    /// CHECK: PDA-validated via constraint
    #[account(
        seeds = [b"agent", payer_agent_asset.key().as_ref()],
        bump,
        seeds::program = agent_registry_8004::ID,
    )]
    pub payer_agent_account: UncheckedAccount<'info>,

    /// Payee agent's identity record (from agent-registry-8004)
    /// CHECK: PDA-validated via constraint
    #[account(
        seeds = [b"agent", payee_agent_asset.key().as_ref()],
        bump,
        seeds::program = agent_registry_8004::ID,
    )]
    pub payee_agent_account: UncheckedAccount<'info>,

    /// Payee's ATOM stats — owned by atom_engine program
    /// CHECK: ownership + PDA-derivation verified in instruction body
    #[account(
        seeds = [b"atom_stats", payee_agent_asset.key().as_ref()],
        bump,
        seeds::program = atom_engine::ID,
    )]
    pub payee_atom_stats: UncheckedAccount<'info>,

    /// Optional validation attestation for payee (from our own ValidationRegistry)
    pub payee_validation: Option<Account<'info, ValidationAttestation>>,

    pub payer_agent_asset: UncheckedAccount<'info>,
    pub payee_agent_asset: UncheckedAccount<'info>,
}
```

Body logic (sketch):

```rust
pub fn gate_payment(
    ctx: Context<GatePayment>,
    amount: u64,
    mint: Pubkey,
    policy_id: u64,
) -> Result<GateDecision> {
    let policy = &ctx.accounts.policy;
    require!(!policy.paused, PolicyError::KillSwitchActive);

    // Manual deserialization of payee AtomStats (skip 8-byte discriminator, parse fixed offsets)
    let payee_atom_data = ctx.accounts.payee_atom_stats.try_borrow_data()?;
    require!(
        ctx.accounts.payee_atom_stats.owner == &atom_engine::ID,
        PolicyError::InvalidAtomStatsOwner
    );
    let payee_trust_tier = parse_trust_tier(&payee_atom_data)?; // u8 0-4
    let payee_risk_score = parse_risk_score(&payee_atom_data)?; // u8

    // Apply policy rules
    require!(payee_trust_tier >= policy.min_counterparty_tier, PolicyError::InsufficientTier);
    require!(payee_risk_score <= policy.max_counterparty_risk, PolicyError::ExcessiveRisk);

    // Velocity check (read PolicyVault's own per-agent spend ledger PDA)
    let velocity_ok = check_velocity(&ctx, amount)?;
    require!(velocity_ok, PolicyError::VelocityExceeded);

    // Optional: require validation attestation
    if let Some(required_cap) = policy.required_validation_capability {
        let attestation = ctx.accounts.payee_validation
            .as_ref()
            .ok_or(PolicyError::ValidationRequired)?;
        require!(attestation.capability_hash == required_cap, PolicyError::WrongCapability);
        require!(attestation.is_valid_at(Clock::get()?.unix_timestamp), PolicyError::AttestationExpired);
    }

    Ok(GateDecision::Allow)
}
```

### Where this differs structurally from AgentSafe Hooks (the load-bearing distinction)

| Axis | AgentSafe Hooks | PolicyVault (this component) |
|------|-----------------|------------------------------|
| Where policy is enforced | Token-2022 mint extension hook — fires on every transfer of a specific mint | Anchor instruction called pre-flight by a facilitator / agent runtime, **scoped to the (payer-agent, payee-agent) tuple** rather than the mint |
| What inputs the policy reads | Per-token-account state (e.g., velocity counter PDA per `(mint, owner)`) | Per-agent identity + reputation reads from agent-registry-8004 + atom-engine + own ValidationRegistry |
| What it cannot do that the other CAN | Cannot natively gate on agent reputation (would have to add a hook that reads ATOM stats — adds CU and breaks the mint-agnostic model) | Cannot enforce after a transfer is already constructed and signed (the facilitator has to call PolicyVault BEFORE building the tx) |
| Failure mode | Mint becomes a kill-switch tripwire — works regardless of which signer/wallet/facilitator routes the payment | Facilitator has to be honest about pre-checking; bypass risk if a malicious facilitator skips the call |
| Defense-in-depth posture | Catches the 20% that leaks past wallet-layer policy AND past facilitator-layer policy | Catches the 20% that leaks past wallet-layer (e.g., agent identity mismatch / reputation drift) BEFORE asset-layer ever fires |

**The two are NOT substitutes — they are stackable.** A regulated x402 facilitator running both:
1. Pre-flight call to PolicyVault gates on counterparty trust + capability attestation. Fast-path 99% of clean payments through.
2. The mint that gets transferred has AgentSafe Hooks enforcing velocity + jurisdictional + kill-switch at runtime. Last-line defense against PolicyVault bypass.

This stackability is the strongest argument for "distinct, not converging." But Phase 3 is where that gets pressure-tested honestly.

---

## Component 2 — TrustGate x402: reference facilitator integration

### What it ships

A reference x402 facilitator (one Anchor program + a TypeScript Node service) that:

1. **Pre-flight (POST /verify):** Before constructing the on-chain transfer, calls `policy_vault::gate_payment` with `(payer_agent_asset, payee_agent_asset, amount, mint, policy_id)`. If `Deny` → returns 402 with `payment_required` field set to `false` + reason code. If `Allow` → proceeds.
2. **Settlement (POST /settle):** Constructs and broadcasts the Token-2022 transfer (the mint can independently have AgentSafe Hooks enabled — we do not duplicate that work).
3. **Post-settlement feedback emission:** Calls `agent_registry_8004::give_feedback` via PDA-signed CPI:
   - Author: facilitator-program PDA `["trustgate_authority"]` (so the feedback author identity is auditable but not abusable by the facilitator's hot wallet)
   - Payee asset: the agent that received payment
   - Score: 100 if settled cleanly, lower if disputed/reverted/refunded
   - Tags: `tag1 = "trustgate"`, `tag2 = "settled" / "disputed"`
   - URI: pointer to settlement receipt (IPFS pinned)
4. **Dispute path:** Exposes a `dispute_payment(payment_id, evidence_uri)` instruction that calls `agent_registry_8004::give_feedback` with `score < 50` + tag `dispute` and optionally calls our own `validation_registry::request_validation` to escalate to an external validator.

### Why this is load-bearing for the thesis

- **Closes the trust loop.** Today the reputation primitive (8004-Solana) requires a *human* or *off-chain agent* to call `give_feedback`. There is no in-protocol consumer of payment outcomes feeding back into reputation. TrustGate x402 is the first programmatic feedback emitter for payment outcomes.
- **Demoable in 90 seconds.** Live demo: agent A pays agent B → both have AgentRegistry identities, B has tier 3. Demo shows: pre-flight gate passes; settlement happens; after-tx tier reads new value; second payment goes through faster (cached fast-path). Then attempted payment to compromised agent C (tier 0): pre-flight DENIES, no on-chain footprint. Then dispute: tier reduction visible.
- **Unblocks the buyer (x402 facilitators).** Their pain is "we can't onboard regulated-enterprise volume because we have no way to gate or attest agent counterparties." TrustGate x402 is a drop-in upgrade.

### What this is NOT

- **Not a competitor to Dexter / MCPay / Latinum.** It is a *layer they each integrate*. Mohit ships ONE reference facilitator (call it Dexter — Day 3 first-buyer pick stays the same) plus a portable TypeScript module those other facilitators can include. The reference facilitator is a demo + early-customer artifact, not a full middleware product.

---

## Component 3 — ValidationRegistry (the archived 3rd leg, productized)

### What it ships

Anchor program that implements ERC-8004's Validation Registry surface (which Quantu archived in v0.5.0 of 8004-solana and labeled "planned for future upgrade"):

- `request_validation(agent_asset, validator, capability_hash, request_uri, deadline)` — agent owner requests an attestation.
- `respond_to_validation(request, attestation_uri, attestation_payload_hash, deadline)` — validator submits their response. Permissionless: any signer can be a validator; reputation of validators emerges from how often their attestations correlate with downstream policy outcomes.
- `revoke_validation(request)` — validator can revoke if circumstances change.
- View: `read_attestation(asset, capability_hash)` returns `Option<ValidationAttestation>`.

ValidationAttestation PDA fields:
- `agent_asset`, `validator`, `capability_hash`, `attestation_payload_hash`, `expires_at`, `revoked: bool`.

### How PolicyVault consumes it

Policy can reference a `required_validation_capability` (16-byte hash, e.g., `SHA256("KYC-tier-2-2026")[0..16]`). When PolicyVault evaluates `gate_payment`, it reads the payee's ValidationAttestation PDA for that capability, checks expiry, checks revocation, and either allows or denies.

### Why this is sharper than Quantu's archived design

- **Capability hashes form a namespace.** The market decides which capabilities matter. KYC, compliance, model-version, age-gate, jurisdiction-attestation — all expressible as capability hashes. Anchor program is agnostic to the semantic meaning; downstream policies decide which capabilities they require.
- **Validators emerge organically.** The first 5 trusted validators (e.g., Halborn, OtterSec, regional KYC providers, model auditors) become reputable simply by having their attestations cited in policies that produce successful payment outcomes.
- **Foundation alignment is a freebie.** ERC-8004 trio is identity + reputation + validation. Foundation page already references all three. Mohit ships the third leg → Foundation narrative is "they completed our standard."

### What this is NOT

- **Not a centralized validator marketplace.** No protocol-curated whitelist of validators. Anyone can submit; downstream consumers choose whom they trust.
- **Not a dispute arbitration system in v1.** v1 ships permissionless attestations + permissionless revocations. Dispute escalation logic (multi-validator quorum, slashing) is v1.1+ territory.

---

## Component 4 — (deliberately not added; was the original spec's "x402 mediation + audit trail")

**The raw spec listed component 4 as "x402 mediation + audit trail." TrustGate x402 (component 2 above) IS this, made concrete.** I am NOT introducing a fifth component. The reframe shrinks from 4 components to 3 by collapsing original-#1 (Identity) and original-#2 (Reputation) into "consume Agent Registry" and renaming original-#4 to TrustGate.

Sub-budget for component count is honest: 3 distinct deliverables (PolicyVault, TrustGate x402, ValidationRegistry) + 1 dependency consumer (Agent Registry).

---

## Repo / submission structure (single Colosseum submission)

```
agenttrust/                       (repo root)
├── policy-vault/                 (Apache 2.0 — the agent-layer policy program)
│   ├── programs/policy-vault/    (Anchor program)
│   ├── kani-harness/             (FV proofs for policy invariants)
│   └── tests/                    (Bankrun + devnet integration)
├── validation-registry/          (Apache 2.0 — the archived 3rd leg)
│   ├── programs/validation-registry/
│   └── tests/
├── trustgate-x402/               (BSL 1.1 — reference facilitator)
│   ├── facilitator-program/      (Anchor — pre-flight gate program)
│   ├── facilitator-server/       (TypeScript x402 service)
│   └── reference-integration/    (drop-in module for other facilitators)
├── docs/
│   ├── INTEGRATION-AGENT-REGISTRY.md   (CPI patterns, PDA reads)
│   └── COMPLETING-THE-TRUST-STACK.md   (Foundation alignment narrative)
├── README.md
└── LICENSE-APACHE / LICENSE-BSL
```

---

## Solo-build feasibility (initial estimate, NOT a buildability gate)

| Component | Lines of code (rough) | Days for mid-advanced solo builder |
|-----------|-----------------------|------------------------------------|
| PolicyVault Anchor program (3-5 policy kinds + gate_payment + velocity ledger) | ~800 LOC | 3.5 |
| Kani harness for PolicyVault invariants | ~200 LOC | 1.5 |
| ValidationRegistry Anchor program | ~400 LOC | 2 |
| TrustGate x402 facilitator program (pre-flight + post-settlement feedback CPI) | ~500 LOC | 2 |
| TrustGate x402 TypeScript service | ~600 LOC | 2 |
| Integration tests (Bankrun + devnet) | ~400 LOC | 1.5 |
| Demo video script + recording | — | 2 |
| Pitch deck + README | — | 1.5 |
| **Total** | **~2900 LOC** | **~16 days** |

This is tight for 17 days. If the solo-buildability gate (separate file in original Day-4 plan) confirms feasibility, the buffer is 1 day; if not, ValidationRegistry gets cut to v1.1 and demo focuses on PolicyVault + TrustGate alone.

For comparison, AgentSafe Hooks Day-3 plan was 6-8 modules × 200 LOC each + Kani harness + reference Dexter integration ≈ 1900 LOC over 12-14 days. AgentTrust-reframe is bigger by ~50% LOC but components are well-scoped.

---

## Day-3-style "what's sharper vs. raw spec" diff

| Dimension | Raw AgentTrust spec (mission brief) | Reframed |
|-----------|--------------------------------------|----------|
| Identity | Soulbound NFT — Mohit builds | **Consume Agent Registry's Metaplex Core NFT identity** — zero rebuild |
| Reputation | Dual-score (buyer + seller) — Mohit builds with sybil resistance from scratch | **Consume Agent Registry's ATOM Engine** — HLL-based sybil resistance + tier vesting already shipped + Foundation-endorsed |
| Policy | Policy PDAs enforced at smart-contract level BEFORE settlement | **PolicyVault** — same architectural slot, but explicitly reads `AgentAccount` + `AtomStats` as policy inputs (the actual differentiation from AgentSafe Hooks) |
| x402 mediation + audit trail | Built-in x402 server | **TrustGate x402** — reference facilitator that AUTO-EMITS feedback to Agent Registry on settlement, closing the trust loop |
| Component count | 4 | 3 (Identity + Reputation merged into "Agent Registry consumption") |
| Foundation alignment | Implicit | **Explicit — "completes the ERC-8004 trinity Quantu shipped 2 of 3"** |
| Differentiation from AgentSafe Hooks | Unclear in raw spec | Explicit non-overlap map (agent-layer reputation-aware vs asset-layer mint-scoped); both stackable as defense-in-depth |
| First buyer | Same as raw (facilitators / devs / enterprises / wallets) — TBD by Q3 | x402 facilitators (same as AgentSafe Day 3) — Dexter first; load-bearing claim is the AUTO-FEEDBACK-EMISSION upgrade |
| Validation Registry | Not in raw spec | **Added** — the archived ERC-8004 third leg |

---

## Open questions Phase 3 must answer before Mohit reads anything else

1. **Is reading agent reputation as policy input a sufficiently distinct architectural layer to defeat the "AgentSafe Hooks could just add an identity-gate hook that reads ATOM" objection?**
2. **Does TrustGate's auto-feedback emission stand as a meaningful protocol contribution, or is it a 200-line glue module that any facilitator could write themselves once Quantu publishes a few example downstream programs?**
3. **Is the ValidationRegistry component a distinct moat or scope-creep?** Specifically: the reframe could ship just (PolicyVault + TrustGate) and skip ValidationRegistry → that's tighter scope, but loses the "completes the trust stack" narrative.
4. **Does the same x402 facilitator buy BOTH AgentSafe Hooks AND AgentTrust-reframe, or do they pick one?** This is Phase 3 criterion (b).

These get answered in `agenttrust-reframe-decision.md` next.

---

## What this means for Mohit's submission

- **The reframed spec is technically sound and integration-cheap** — agent-registry-8004 PDAs are publicly readable, MIT-licensed, and Foundation-blessed. There is no "should we partner with Quantu" gate; consumption is permissionless.
- **The biggest design risk is component scope.** Three new Anchor programs + one TS service in 17 days is tight. The honest fallback is to ship only PolicyVault + TrustGate (no ValidationRegistry) — losing the "completes the stack" narrative but holding the agent-runtime-policy wedge.
- **The biggest narrative risk is convergence with AgentSafe Hooks.** The Phase 3 decision document tests this directly. If the answer is CONVERGES, Mohit accepts AgentSafe Hooks lock and adds an addendum showing how AgentSafe can read ATOM scores as a hook input — getting some Foundation alignment without rebuilding.
- **The biggest opportunity is the Validation Registry archival.** Quantu shipped, then removed, the ERC-8004 Validation Registry. Foundation-endorsed, archived, available wedge. This is the closest thing to a "Foundation-ordained empty seat" the Day-4 research has surfaced. Even if AgentTrust-reframe is found to converge with AgentSafe Hooks on Phase 3 criteria, **shipping a standalone Validation Registry implementation as a separate Public Goods primitive is a derivative idea worth surfacing to Mohit** as a lower-stakes Day-5+ companion to whatever the locked thesis ends up being.
