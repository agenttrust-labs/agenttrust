# Colosseum Research Index

Last updated: **2026-04-27 (Day 4, reframe-attempt + broader research complete)**
Days until submission: **14** (deadline 2026-05-11, June 23 winners announced)
Thesis status: **TWO CANDIDATES — LOCK PENDING DAY-5 MOHIT-READ**. Day 4 produced a Phase-1/2/3 reframe attempt (DISTINCT verdict) on a parallel candidate (AgentTrust-reframe), plus broader public-reception research that surfaced two enrichment paths and one sleeper option for AgentSafe Hooks.

## Day-5 first action for Mohit (sharp)

1. **Read the four Day-4 deliverables in this order** (cold, rested brain):
   1. `research/01-hackathon-mechanics/vibhu-platform-brief.md` — confirms Vibhu/SDP doesn't ship the wedge
   2. `research/06-competitive-intel/agent-registry-cpi-surface.md` — the technical primitive both candidates can read
   3. `research/00-thesis/agenttrust-reframe-decision.md` — DISTINCT verdict + 2 caveats
   4. `research/06-competitive-intel/agent-registry-public-reception.md` — wedge-defensibility reality (AgentSafe empty / AgentTrust-reframe contested)
   5. `research/00-thesis/agenttrust-other-leads.md` — six leads ranked

2. **Read both candidate specs side-by-side:** `AgentSafe-SHARPENED.md` (Day-3) + `agenttrust-reframe-draft.md` (Day-4 DRAFT — note: this is NOT a sharpened spec, it is Phase-2 input to the decision).

3. **Choose ONE of these five lock options:**

   - **(F) AgentSafe Hooks pure** — Day-3 spec exactly. Conservative. Empty-wedge defensibility. ~14 days build + 3 days distribution.
   - **(B) AgentSafe Hooks + 8004-read identity-gate** — Day-3 spec with one module enriched to read ATOM trust_tier. Foundation-narrative gain for ~2 days cost. **RECOMMENDED if AgentSafe locks.**
   - **(C) AgentSafe + Validation Registry dual-bundle** — adds the missing ERC-8004 third leg. ~17 days build, 0 buffer. Maximum Public-Goods.
   - **(D) AgentTrust-reframe** — full Phase-2/Phase-3 path. DISTINCT but contested wedge (KAMIYO + SAEP). Requires Day-5 authorization for Q2/Q3/Q4 + buildability + SHARPENED refinement (~4-6 hours of additional Day-4-extension research).
   - **(A) Standalone Validation Registry** — sleeper option. ~5 days build. Smaller scope, Public-Goods-only positioning. Use only if AgentSafe and AgentTrust both fail validation.

4. **Then write `research/00-thesis/THESIS_LOCK.md`** with one-sentence pitch + 3 runner-ups (with kill reasons) + judge-perspective argument + 3 highest-risk assumptions.

## Side-by-side comparison row (factual only — no recommendation)

| Dimension | AgentSafe Hooks (Day-3 sharpened) | AgentTrust-reframe (Day-4 draft) |
|-----------|-----------------------------------|-----------------------------------|
| **Wedge** | Asset-layer (Token-2022 mint-scoped) policy enforcement for agent-payment safety | Agent-runtime policy + payment-mediation layer that consumes Solana Agent Registry identity + reputation |
| **Moat** | Hook library alone (FV harness + wallet-API + audit-events demoted to features) | (1) Reverse-mapping advantage that asset-layer hooks structurally lack + (2) PDA-signed feedback emission + (3) Validation Registry as Foundation-aligned 3rd leg |
| **First buyer** | x402 facilitators — Dexter first | x402 facilitators — Dexter first (same buyer, stackable defense-in-depth, not substitutes) |
| **30-sec pitch** | Variant B (market-shape, Vibhu 99.99% claim) primary; Variant A (concrete-failure $47K) for technical demo | Not yet compressed (Phase-2 STOPPED before Q4) |
| **Solo-build difficulty** | 14 days, 6+2 stretch modules + Kani harness + reference Dexter integration | 16 days, 3 components + Kani harness + reference x402 facilitator + ValidationRegistry program |
| **Validation strength** | Day-3 DM drafts written + decided OFF-TABLE per Day-4 mission; validation = Mohit's conviction + competitive scan | Origin story strong (friend's startup) + competitive scan reveals contested wedge |
| **Wedge defensibility on Solana 2026-04-27** | EMPTY (verified 0 shippers in 4-day fresh search) | CONTESTED — KAMIYO building, SAEP shipped 10-program full stack 2026-04-21 as direct Frontier competitor, Cascade + 30-release SATI ecosystem |
| **Foundation-narrative alignment** | Indirect (Token-2022 is Foundation-blessed; Vibhu/SDP orthogonal) | Direct (consumes Foundation-endorsed `solana.com/agent-registry`) |
| **Dependency risk** | None (Token-2022 + Anchor + Kani are canonical primitives) | Foundation/Quantu maintenance + endorsement (mitigatable via MIT-license-survivability) |

## Day-4 sharpening diff (one paragraph)

Compared to the raw AgentTrust spec, the refined wedge is **agent-runtime policy + payment-mediation that EXPLICITLY CONSUMES Solana Agent Registry identity + reputation primitives via direct PDA reads — not rebuild — and ships PolicyVault (agent-tuple-scoped policy PDAs reading ATOM trust_tier as input) + TrustGate x402 (reference facilitator that auto-emits feedback to Agent Registry on settlement, closing the trust loop) + ValidationRegistry (the archived ERC-8004 third leg productized).** Removed: Identity component (consumed not built), Reputation component with custom sybil resistance (consumed not built — ATOM is more advanced), buyer-types-list (already locked Day-3 first-buyer). Kept: smart-contract policy enforcement at agent-runtime layer, x402 audit trail. Added: Validation Registry component, explicit "stackable defense-in-depth with AgentSafe Hooks" positioning, Foundation/Quantu dependency-risk acknowledgement, six-registry fragmentation design constraint, KAMIYO + SAEP direct-competitor flags. Phase-3 verdict: DISTINCT from AgentSafe Hooks on architectural-layer + value-prop + structural-moat criteria, with reverse-mapping problem as the load-bearing structural moat that AgentSafe v1.1 cannot trivially absorb.

## Five-bullet Day-4 summary (per mission brief)

1. **Sharper:** Reframed AgentTrust now consumes the Foundation-endorsed Solana Agent Registry identity + reputation rather than rebuilding them — collapses 4 raw components to 3 (PolicyVault + TrustGate + ValidationRegistry) with explicit reverse-mapping moat preventing asset-layer-hook absorption.
2. **Cut:** Identity rebuild + dual-score reputation rebuild + 4th component as separate from x402 mediation — all merged or consumed. Estimated ~2000 LOC saved by consuming Quantu's primitives instead.
3. **Stayed:** Same first-buyer (x402 facilitators, Dexter first) per Day-3 lock. Same vertical (agent payments). Same gate result (Vibhu/SDP GREEN — orthogonal).
4. **Surprised:** SIX competing agent identity registries on Solana (8004 / 014 / SATI / SAID / SAP / helixa) — fragmentation reality not surfaced before today. SAEP shipped 10-program full stack 2026-04-21 as direct Frontier competitor for AgentTrust-reframe wedge. KAMIYO building stake-backed escrows on top of registries (closest direct competitor). The "missing trust layer" framing is heavily claimed off-Solana by Microsoft / Callipsos / AIVM / sekuire / Mastercard-Google / Fime — strong category language but Solana-on-chain-enforcement angle still differentiating.
5. **Ambiguous:** Whether to authorize Day-4-extension full Q2/Q3/Q4 + buildability + SHARPENED refinement for AgentTrust-reframe — Phase-3 returned DISTINCT but the broader research revealed asymmetric wedge defensibility (AgentSafe empty / AgentTrust-reframe contested) that may tilt the lock toward AgentSafe + Lead B enrichment without needing the full AgentTrust-reframe sharpening.

## Directory map (updated)
- `00-thesis/` — **11 files**: Day-2 longlist + shortlist + Day-3 sharpening (4 files) + Day-3 day4-dm-drafts + **Day-4 reframe-draft + reframe-decision + other-leads**. THESIS_LOCK.md pending Day-5.
- `01-hackathon-mechanics/` — rules-and-prizes.md + judges-and-bias.md + **Day-4 vibhu-platform-brief.md**.
- `02-past-winners/` — grand-champions.md + post-mortem-patterns.md (Day 1).
- `03-ecosystem-narratives/` — narrative-momentum.md (Day 2).
- `04-sponsor-deep-dives/` — pending. Lower priority post-thesis-lock.
- `05-grants-and-money/` — active-capital-Q2-2026.md (Day 2).
- `06-competitive-intel/` — **4 files**: duplicate-risk-map (Day 2) + agentsafe-competitive-deep-scan (Day 3) + **Day-4 agent-registry-cpi-surface + agent-registry-public-reception**.
- `07-build-prep/` — pending Day 5+.

## Most recent files (reverse-chrono, top 10)
- `research/00-thesis/agenttrust-other-leads.md` — Day-4: 6 leads ranked
- `research/06-competitive-intel/agent-registry-public-reception.md` — Day-4: wedge-fragmentation reality + KAMIYO + SAEP threat surface
- `research/00-thesis/agenttrust-reframe-decision.md` — Day-4: Phase-3 DISTINCT verdict + 2 caveats
- `research/00-thesis/agenttrust-reframe-draft.md` — Day-4: Phase-2 reframed AgentTrust DRAFT
- `research/06-competitive-intel/agent-registry-cpi-surface.md` — Day-4: Phase-1 technical reference for 8004-Solana + ATOM
- `research/01-hackathon-mechanics/vibhu-platform-brief.md` — Day-4: Vibhu Norby + SDP factual brief
- `research/00-thesis/AgentSafe-SHARPENED.md` — Day-3: lock candidate (alternative path)
- `research/00-thesis/day4-dm-drafts.md` — Day-3: DMs (off-table per Day-4 mission)
- `research/00-thesis/agentsafe-pitch-compression.md` — Day-3: 2 pitch variants
- `research/00-thesis/agentsafe-first-buyer.md` — Day-3: x402 facilitators

## Kill-list (active)
- NFT PFP / generative art collections
- Memecoin launchpads as primary
- Solana-vs-Ethereum-L2 takes
- Generic "Web3 social" without wedge
- 2021–2022 narratives (P2E, metaverse, DAO-tooling-for-DAOs)
- Cross-chain bridges ([Matty 2026-04-20](https://x.com/mattytay/status/2046021326683734378))
- Vague "AI + crypto" agent slop
- Gaming, consumer-UX-heavy, pure DePIN — solo handicap
- Pure perp DEX clone of Drift/Hyperliquid — judge saturation
- Pure security audit tool — Alex Biryukov + STRIDE saturate
- Pure unified-liquidity aggregator — 5+ Frontier competitors + Jupiter
- Tokenized-securities full stack — SecuritiesDino
- Wallet-layer agent-wallet policy API — Privy/Crossmint
- "OpenZeppelin for Token-2022" generic framing — SSS
- "Formally verified DeFi" as standalone moat — Blueshift/HarmonicMath
- **[Day 4] Rebuilding agent identity from scratch on Solana** — Foundation-endorsed Quantu 8004-Solana already ships it; rebuilding is wasted work and Foundation-misaligned.
- **[Day 4] Rebuilding agent reputation from scratch on Solana** — ATOM Engine ships HLL sybil resistance + tier vesting + 5-tier scoring; rebuilding is wasted work.
- **[Day 4] Cross-registry policy adapter as primary thesis** — interesting but no canonical buyer; LOW pick-ability.
- **[Day 4] Stake-backed escrow + ZK dispute as primary wedge** — KAMIYO building, SAEP shipped Groth16 + VRF arbitration; contested.

## Binding constraints (Day 1 + Day 2 + Day 3 + Day 4)
- Vertical: infra primitive / DeFi primitive / stablecoin infra / privacy-security primitive
- Narrative intersection: (c) formally verified DeFi precision × (e) Token-2022 programmable transfers — primary; (d) AI-agents-using-crypto-rails — amplifier
- Target Standout top-20 + accelerator interview (+ Public Goods $10K plausible), not Grand
- Solo-buildable in ~15 working days
- Security posture = 30-sec segment in technical demo (non-negotiable)
- Co-founder available for non-technical only (video/ops/pitch)
- Novel protocol layer required — no wrappers
- Must pass Matty accelerator filter
- Wedge MUST be asset-layer (mint-scoped) — wallet-layer is Privy/Crossmint
- Must NOT frame as "OpenZeppelin for Token-2022" — SSS owns
- Bundled submission mandatory per Rules §7
- **[Day 4] If AgentTrust path locks, the pitch must support "stackable defense-in-depth with AgentSafe Hooks" framing — NOT either-or.**
- **[Day 4] If AgentTrust path locks, Foundation/Quantu dependency-risk must be acknowledged in decision log with MIT-license-survivability mitigation cited.**
- **[Day 4] DM-based validation off-table for this sprint per Day-4 mission brief; validation comes from desk research + Mohit's conviction + competitive gap analysis.**

## x-recon budget tracking (Day 4)

| Resource | Day 1 | Day 2 | Day 3 | Day 4 | Total used | 20-day cap |
|----------|-------|-------|-------|-------|------------|------------|
| Profile scrapes | 8 | 11 | 2 | **2** (vibhu refresh, Quantu_AI; cascade_protocol returned 0) | 23 | ~50 |
| Searches | 8 | 15 | 4 | **11** (8004 / agent reputation / agent identity / soulbound / capability registry / cascade SATI / 8004 limitations / transfer-hook+agent-payment / agent-identity-policy / agent-reputation-onchain / + 1 retry) | 38 | ~30 (self-imposed) |
| Threads | 0 | 0 | 0 | 0 | 0 | ~10 |

Day 4 search count exceeds the soft 30-cap by 8 — justified by the user's "exponential research / forget about the 90-min cap" directive. No new threads consumed.

## Session log
- **2026-04-21 session #1 (Day 1)** — Schema + 4 files + 8 profiles + 8 searches.
- **2026-04-22 session #2 (Day 2)** — 4 synthesis files + longlist + shortlist. 11 profiles + 15 searches.
- **2026-04-23 session #3 (Day 3)** — SHARPENING. 2 Gates cleared + 4 Questions answered + AgentSafe-SHARPENED.md + 6-DM drafts. 2 profiles + 4 searches.
- **2026-04-27 session #4 (Day 4)** — REFRAME ATTEMPT + BROADER RESEARCH. Q1 surfaced Foundation-endorsed Solana Agent Registry shipping 2/4 AgentTrust components → STOP-and-raise → Mohit authorized Option B reframe → Phase-1 (CPI surface) + Phase-2 (reframed draft) + Phase-3 (DISTINCT verdict) + bonus public-reception + other-leads research. 7 deliverables. 2 profiles + 11 searches. Lock pending Day-5.
