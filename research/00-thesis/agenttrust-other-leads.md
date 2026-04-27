# AgentTrust — Other Leads Surfaced By Day-4 Research

**Purpose:** Mohit asked the open-ended *"this may reveal another lead, or we can combine remaining two parts of AgentTrust with AgentSafe — don't know what but."* This file enumerates the alternative directions surfaced by the deeper research session, each scored for solo-buildability, wedge defensibility, and how it composes with the existing Day-3 AgentSafe Hooks lock candidate.

**Scope:** Leads only. No recommendation among them — the Day-5 lock decision remains Mohit's. Each lead is presented as: *what it is*, *why it surfaced*, *solo-buildability estimate*, *wedge defensibility*, *composition with AgentSafe Hooks*, and *what it would mean for the Day-5 lock*.

**Inputs:**
- `vibhu-platform-brief.md`
- `agent-registry-cpi-surface.md`
- `agenttrust-reframe-draft.md`
- `agenttrust-reframe-decision.md` (DISTINCT)
- `agent-registry-public-reception.md` (wedge fragmentation reality)

Last verified: 2026-04-27

---

## TL;DR — six leads, ranked by Mohit's-strongest-fit

| # | Lead | One-line | Solo build | Wedge defensibility | AgentSafe-composability | Recommended weight |
|---|------|----------|------------|---------------------|------------------------|---------------------|
| A | **Standalone Validation Registry** | Ship the archived ERC-8004 third leg as a Public-Goods primitive | 5 days | High (empty + Foundation-aligned) | Bundles cleanly as companion | **Strongest sleeper** |
| B | **AgentSafe Hooks + 8004-read identity-gate** | Make AgentSafe's existing `identity-gate` module ATOM-tier-aware | +2 days on AgentSafe baseline | Same as AgentSafe (still empty wedge) | Native — adds Foundation alignment to existing lock candidate | **Cleanest path if AgentSafe locks** |
| C | **AgentSafe Hooks + Validation Registry, dual-bundle submission** | One repo, two layers: asset-layer Token-2022 hooks + the missing ERC-8004 third leg | +5 days on AgentSafe | High on both | Native composition | Strong if scope holds |
| D | **AgentTrust-reframe (Phase 2/3 path)** | PolicyVault + TrustGate + ValidationRegistry, full reframe | 16 days | MEDIUM (contested wedge — KAMIYO/SAEP) | Different layer, stackable | Per Phase 3 — distinct but riskier |
| E | **Cross-registry policy adapter** | One PolicyVault that gates against 8004 / 014 / SATI / SAID / SAP / SAEP | 8 days | LOW (no canonical buyer) | Awkward fit | Not recommended |
| F | **AgentSafe Hooks pure + future-work mention of 8004** | Lock AgentSafe-Day-3 as-is, add a "v1.1 adds 8004 reputation-gate" line in the README | 0 days additional | Same as AgentSafe | Same as Day-3 lock | Conservative default |

---

## Lead A — Standalone Validation Registry

### What it is

Mohit ships ONLY the missing ERC-8004 third leg as a single, sharp Public-Goods primitive: an Anchor program that lets agent owners request capability attestations from arbitrary validators, lets validators respond, lets attestations expire and be revoked. Open-source Apache 2.0. Ships with TypeScript SDK.

### Why it surfaced

Quantu shipped a Validation Registry in v0.1.0 of 8004-Solana and ARCHIVED it in v0.5.0 with the explicit "planned for future upgrade" label. Their lib.rs comment: *"Validation module removed in v0.5.0 — planned for future upgrade. Archived code available in src/_archive/validation/."*

The Foundation page (`solana.com/agent-registry`) explicitly references identity + reputation + **validation** as the trust stack. Two are shipped, one is missing.

### Solo build estimate

| Item | LOC | Days |
|------|-----|------|
| Anchor program (request_validation, respond_to_validation, revoke_validation, view) | ~400 | 2 |
| TypeScript SDK | ~200 | 1 |
| Reference integration with 8004-Solana | ~150 | 1 |
| Tests + Kani harness for invariants | ~250 | 1 |
| **Total** | **~1000 LOC** | **5 days** |

This is a *much smaller* thesis than full AgentTrust-reframe (1000 LOC vs 2900). Solo-builder velocity is high.

### Wedge defensibility

- **Empty on Solana**: No public Solana implementation of Validation Registry as of 2026-04-27.
- **Foundation-aligned**: ERC-8004 trio referenced on official Foundation page; Mohit ships the missing leg.
- **Composable**: Any program (including AgentSafe Hooks, including KAMIYO, including SAEP) can consume validation attestations as policy inputs.
- **Cross-chain narrative**: ERC-8004 is now on Ethereum + Base + Polygon + Arbitrum + Abstract + Arc + Solana. Validation Registry is the consistent missing leg across all of them.

### Composition with AgentSafe Hooks

Native and clean. AgentSafe Hooks' `identity-gate` module (Day-3 module #5) can be made to require a specific validation attestation as part of its policy. Bundle as TWO submissions (per Rules §7 must be ONE submission per team), single repo, dual narrative: asset-layer policy enforcement + on-chain validation primitive. Same buyer (regulated-enterprise-aware x402 facilitator) wants both.

### What it would mean for Day-5 lock

Lead A could be Mohit's Day-5 lock IF he wants:
- Smallest scope / lowest execution risk
- Clean Public-Goods Award positioning
- A clearly-bounded thesis solo-buildable in 5–6 days, leaving 11 days for polish + distribution

But standalone Validation Registry is **smaller than the accelerator-shape pitch** Matty's framing demands ("hyper-commercialize, prizemaxxing"). It would be a strong Public-Goods Award candidate but a weak accelerator candidate.

**Recommended use:** as a v1.1 companion to whichever bigger thesis Mohit locks. Or as the SECOND submission if Rules §7 actually allows separate Public-Goods submissions (Day-3 lock concluded NO — bundling required).

---

## Lead B — AgentSafe Hooks + 8004-read identity-gate

### What it is

Take Day-3's locked AgentSafe Hooks scope. Modify ONE hook module — `identity-gate` (Day-3 module #5) — to read AtomStats from 8004-Solana and gate on `trust_tier ≥ N`. Everything else stays the same.

This is essentially a **single-feature integration** of the Foundation-endorsed primitive into the existing AgentSafe wedge. No reframe of architecture; just enrichment of one module.

### Why it surfaced

Day-3 AgentSafe Hooks already shipped an `identity-gate` module. Its description: *"require on-chain identity attestation (compatible with Skyfire / on-chain-ID standards)."* That phrase is now answerable: the on-chain-ID standard is 8004-Solana. The hook reads `AgentAccount` PDA at `["agent", asset]` to verify the signer's agent identity exists, then optionally reads `AtomStats` at `["atom_stats", asset]` to check `trust_tier`.

The reverse-mapping problem (no `wallet_to_agent` PDA) is solved by requiring agents to opt in via a small `register_agent_wallet_for_safety` instruction on AgentSafe Hooks' own program → creates `["agent_safety_wallet", wallet]` PDA pointing to the agent's asset.

### Solo build estimate

Adds ~2 days to Day-3 AgentSafe Hooks baseline:
- New `identity-gate` module variant: reads AgentAccount + AtomStats — ~150 LOC
- Wallet-registration instruction + PDA: ~80 LOC
- Tests + Kani harness for the new module: ~150 LOC
- README addendum with Foundation-narrative framing: ~0 LOC

### Wedge defensibility

Same as Day-3 AgentSafe Hooks: asset-layer Token-2022 hooks for agent payments. STILL EMPTY WEDGE. The 8004-read enrichment doesn't change the wedge — it adds Foundation-narrative alignment to the same wedge.

### Composition with AgentSafe Hooks

This IS AgentSafe Hooks, just enriched. Trivial.

### What it would mean for Day-5 lock

This is the **cleanest path if Mohit locks AgentSafe Hooks**. It captures Foundation-narrative alignment without rebuilding any of the work. The pitch becomes:
> *"AgentSafe Hooks is the asset-layer safety primitive for agent payments. Defense-in-depth complement to wallet-layer (Privy/Crossmint), reputation-aware via Foundation-endorsed Solana Agent Registry."*

Adds ~2 days to the 17-day timeline. Negligible additional execution risk. Maximum Foundation-narrative gain.

**Recommended weight:** STRONG. If AgentSafe Hooks is the lock, almost certainly include this. Costs little, gains a Foundation-aligned demo moment.

---

## Lead C — AgentSafe Hooks + Validation Registry, dual-bundle submission

### What it is

Combine Lead A and Lead B into a single submission. ONE repo with TWO layers:
- `verihook/` — the open-source asset-layer hook library (Day-3 spec, with Lead-B's 8004-read enrichment)
- `validation-registry/` — the missing ERC-8004 third leg as standalone Apache-2.0 library

The pitch: *"Two missing primitives, one submission. Asset-layer policy enforcement (no one ships this on Solana for agent payments) + the third leg of the Foundation-endorsed agent trust stack (no one ships this on Solana). Both formally verified, both open-source, both Foundation-aligned."*

### Why it surfaced

Day-3 lock candidate is AgentSafe Hooks bundled with VeriHook (Public-Goods-Award-eligible open-source library). Lead C extends this to TRIPLE the Public-Goods footprint by adding Validation Registry as a third Apache-2.0-licensed primitive. Maintains single-submission compliance with Rules §7.

### Solo build estimate

| Item | Days |
|------|------|
| Day-3 AgentSafe Hooks scope | 14 |
| Lead B (8004-read identity-gate) | +2 |
| Lead A (standalone Validation Registry) | +5 |
| Bundle integration + dual-narrative README | +1 |
| **Total** | **22 days** |

**This exceeds the 17-day Frontier timeline by 5 days.** Either Mohit cuts AgentSafe Hooks scope (drop 2-3 hook modules) or accepts ValidationRegistry as a v1.1 ship-after-submission deliverable.

Realistic 17-day scope for Lead C:
- AgentSafe Hooks: 4-5 hook modules (down from 6+2 stretch) + Lead-B enrichment = 12 days
- Validation Registry: minimal v1 (request + respond + revoke + view) = 4 days
- Bundle + README + demo + pitch = 1 day
- **Total: 17 days** with no buffer.

This is *tight*. The Day-3 spec's recommendation of buffer for distribution / Project X / DM follow-ups would be sacrificed.

### Wedge defensibility

Two empty wedges held simultaneously. Maximum Public-Goods-Award positioning. Strong Foundation-narrative.

### Composition with AgentSafe Hooks

This IS AgentSafe Hooks plus a sibling library. Day-3 lock structure already supports two-layer bundling (VeriHook + AgentSafe Hooks).

### What it would mean for Day-5 lock

Lead C is the **maximum-Foundation-alignment / maximum-Public-Goods version** of AgentSafe Hooks. Higher execution risk than pure AgentSafe Hooks lock; lower than AgentTrust-reframe.

**Recommended weight:** MEDIUM. Worth considering if Mohit's Day-5 self-assessment is *"I can ship a tight 17-day scope with no slippage."* If self-assessment is *"I want buffer for distribution + DMs,"* drop ValidationRegistry to v1.1.

---

## Lead D — AgentTrust-reframe (full Phase 2/3 path)

### What it is

The reframe documented in `agenttrust-reframe-draft.md`: PolicyVault + TrustGate x402 + ValidationRegistry as a single submission. 3 components, ~16 days solo build, Foundation-narrative-aligned.

### Why it surfaced

Phase 1–3 deliverables. DISTINCT verdict on architectural-layer criteria.

### Solo build estimate

16 days per Phase 2 estimate. Tight but achievable.

### Wedge defensibility

**MEDIUM.** Phase 3 architectural-distinctness holds. But Section 3 of `agent-registry-public-reception.md` flagged the wedge is contested — KAMIYO building stake-backed escrows, SAEP shipped 10 Anchor programs as direct Frontier competitor, Cascade with 30 SATI releases + roadmap toward x402 trust gating + payment mandates, off-Solana competitors (Microsoft Agent Governance Toolkit, Callipsos, AIVM, sekuire) claiming the same category language.

### Composition with AgentSafe Hooks

Stackable defense-in-depth (per Phase 3 verdict) but not co-locatable in one submission. Mohit picks ONE.

### What it would mean for Day-5 lock

Lead D is the original reframe-attempt deliverable. Mohit reads the full sharpened spec (if Day-5 authorizes refinement) alongside AgentSafe-SHARPENED.md and decides.

**Recommended weight:** MEDIUM. Distinct on architecture, but enters contested wedge with direct Frontier competitor (SAEP). Heavier execution + heavier pitch differentiation work.

---

## Lead E — Cross-registry policy adapter

### What it is

Generalized PolicyVault that reads from 8004 / 014 / SATI / SAID / SAP / SAEP / FairScale and exposes a unified policy interface. "Bring-your-own-registry" agent policy enforcement.

### Why it surfaced

Section 2 of the public-reception research surfaced the SIX-registry fragmentation reality. A canonical adapter is technically interesting and genuinely empty.

### Solo build estimate

8 days for v1 — three registry adapters (8004, 014, SATI) + canonical policy interface + reference policies.

### Wedge defensibility

LOW. No clear primary buyer. The fragmentation problem is felt by *agents* (who register on multiple registries) and by *aggregators* (FairScale already exists for cross-registry reputation). Policy enforcement consumers are downstream Solana programs, but each downstream program tends to pick ONE registry rather than wanting to support all six.

### Composition with AgentSafe Hooks

Awkward. Asset-layer hooks don't naturally consume agent-registry primitives at all — that's the entire point of the layer separation in Phase 3.

### What it would mean for Day-5 lock

Lead E is a clever architectural exercise but doesn't fit a hackathon thesis with Matty's "hyper-commercialize" framing. Public-Goods positioning is decent but the buyer story is thin.

**Recommended weight:** LOW. Surface to Mohit as "the registry-fragmentation problem is real but probably not the right thesis to claim Day-5."

---

## Lead F — AgentSafe Hooks pure (Day-3 lock, no enrichment)

### What it is

Lock Day-3 AgentSafe Hooks × VeriHook spec exactly as written. No Foundation-narrative addendum. No 8004 read. Add a single line in the README: *"v1.1 will integrate with the Solana Agent Registry (solana.com/agent-registry) for reputation-aware policy gating."*

### Why it surfaced

It's the conservative default — accept the Day-3 lock recommendation and proceed.

### Solo build estimate

Day-3 spec: 14 days. Same as before.

### Wedge defensibility

HIGH. Empty wedge confirmed by 4-day-fresh search.

### Composition with AgentSafe Hooks

Trivial — IS AgentSafe Hooks.

### What it would mean for Day-5 lock

This is Day-3's recommendation. The Day-4 reframe attempt and the Day-4 broader research did NOT change the verdict that AgentSafe Hooks holds the cleanest wedge. Lead F's existence is just to acknowledge that the conservative path is still available.

**Recommended weight:** HIGH if Mohit's Day-5 self-assessment is *"I want to ship the cleanest wedge with the lowest execution risk and have time for distribution."*

---

## Composition logic — how Mohit might combine these on Day 5

### If AgentSafe Hooks locks:

- **Default:** Lead F (pure Day-3) → 14 days build + 3 days distribution.
- **Recommended enrichment:** Lead F + Lead B (8004-read identity-gate) → 16 days build + 1 day distribution. Adds Foundation-narrative for ~2 days cost. Strongly recommended.
- **Maximum Public-Goods stretch:** Lead C (AgentSafe Hooks + Validation Registry) → 17 days build + 0 days distribution. Tighter but bigger PG narrative. Only if velocity is high.

### If AgentTrust-reframe locks:

- **Path:** Lead D — full reframe through Q2/Q3/Q4 + buildability + SHARPENED, with explicit pitch differentiation against SAEP and KAMIYO. Higher execution + pitch risk than AgentSafe paths.

### If neither locks satisfactorily:

- **Sleeper option:** Lead A (standalone Validation Registry) → 5 days build + 12 days distribution + iteration. Smallest scope, cleanest Public-Goods primitive, shortest execution risk. Would target Public Goods Award + plausible Standout top-20, NOT accelerator. This is Mohit's "safety net" if both AgentSafe and AgentTrust theses get critical hits in remaining Day-4-7 validation.

---

## What this means for Mohit's submission

- **Lead A (standalone Validation Registry) is the strongest sleeper finding** of the additional research. It is empty wedge, Foundation-aligned, smallest scope, cleanest Public-Goods positioning. Worth keeping in pocket as the "if everything else collapses, this still ships" floor.
- **Lead B (AgentSafe Hooks + 8004-read identity-gate) is the highest-leverage enrichment** of the existing Day-3 lock candidate. ~2 day cost for meaningful Foundation-narrative gain. If AgentSafe Hooks locks, almost certainly include.
- **Lead C (AgentSafe + Validation Registry dual-bundle) is high-ceiling but tight scope.** Only if Mohit's Day-4 velocity self-assessment supports 17-days-no-slippage discipline.
- **Lead D (AgentTrust-reframe) is the original reframe deliverable.** DISTINCT on architecture but contested on wedge. Heavier execution and pitch work than AgentSafe paths. Per Phase 3, requires explicit Mohit authorization for full Q2/Q3/Q4 + buildability + SHARPENED refinement.
- **Lead E (cross-registry adapter) is interesting but not thesis-shaped.** Don't pursue.
- **Lead F (pure Day-3 lock) remains the conservative default.** The Day-4 research did not produce a finding strong enough to displace Day-3's recommendation; it produced findings that ENRICH the Day-3 recommendation (Lead B / Lead C) and findings that CONFIRM the alternative (Phase 3 DISTINCT) is genuine but riskier.
- **Day-5 lock-decision spreadsheet update suggested:** Mohit reads (1) AgentSafe-SHARPENED.md, (2) agenttrust-reframe-draft.md, (3) agent-registry-public-reception.md, (4) this file (other-leads.md). Decides. The lock can be: AgentSafe pure / AgentSafe + Lead B / AgentSafe + Lead C / AgentTrust-reframe (with authorization for Day-4-extension refinement) / Validation Registry standalone (Lead A). Five clear options.
