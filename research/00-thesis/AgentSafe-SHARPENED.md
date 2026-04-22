# AgentSafe Hooks × VeriHook — SHARPENED (Day 3 Output)

**Status:** Sharpened-not-locked. Day 4 morning, Mohit reads this with rested brain and either locks (writes THESIS_LOCK.md) or re-opens one question.

**Day 3 cognitive mode:** Refinement — narrower wedge, clearer buyer, fewer components, stronger differentiation, 30-second pitch without jargon. All six Day-3 pre-gates and questions completed.

Last verified: 2026-04-23

---

## Gate results (pre-refinement filters)

| Gate | Test | Result | Blocker? |
|------|------|--------|----------|
| **Gate 1 — Vibhu pressure-test** | 449 unique Vibhu tweets scanned for adjacent-work signals across 180-day window | **(b) GREEN LIGHT** — zero critical-keyword hits; Vibhu's roadmap (SDP / STRIDE / agent-commerce endorsement) is orthogonal to the AgentSafe Hooks asset-layer wedge | No |
| **Gate 2 — Public Goods bundling** | Full Official Rules PDF read + Section 7 ("one submission per team") decisive | **(a) BUNDLING ALLOWED** — rules force bundling (can only submit one project); silent on one-project-winning-two-awards, historical Colosseum pattern allows it | No |

See `research/01-hackathon-mechanics/judges-and-bias.md` § 5c for Gate 1 detail and `research/01-hackathon-mechanics/rules-and-prizes.md` § 10 for Gate 2 detail.

---

## The sharpened thesis (one paragraph)

**VeriHook** is an open-source, Apache-2.0 Rust library shipping 6–8 formally-verified (Kani-proven) Token-2022 TransferHook modules for agent-payment safety: velocity caps, per-agent allowlists, kill-switches, jurisdictional gates, identity gates, and compliance-event emitters. **AgentSafe Hooks** is the hosted policy-registry + monitoring + compliance-event-stream product on top, sold to x402 facilitators as the safety layer that unlocks regulated-enterprise volume. Single Colosseum submission; single repo; single pitch video; two prize tracks (Standout + Public Goods Award plausible, accelerator interview the real goal).

---

## What's sharper vs. Day 2

| Dimension | Day 2 raw recommendation | Day 3 sharpened | Why sharper |
|-----------|-------------------------|-----------------|-------------|
| **Wedge** | "Token-2022 TransferHook safety layer for AI-agent payments" | **Asset-layer** (Token-2022 mint-scoped) Token-2022 TransferHook policy enforcement specifically for agent payments, positioned as defense-in-depth complement to wallet-layer policy (Privy/Crossmint) | Added the critical asset-layer-vs-wallet-layer distinction that makes the pitch non-overlapping with Privy/Crossmint |
| **Moat** | "Open-core + brand defensibility" (fuzzy) | **The hook library (A) itself is the moat**; FV is a trust-reducer feature, wallet-facing API is a product veneer, audit-event primitive is a compliance subfeature. Only ONE component defended. | Q2 forced a single-component moat; eliminated hedging |
| **First buyer** | "x402 facilitators primary + agent devs secondary" (two segments, not one) | **x402 facilitators only** — Dexter first, atxp_ai second, MCPay third. Agent devs are amplifiers (GitHub metrics), not buyers. Wallets are Phase-2 integrators. DeFi protocols are Phase-3. | One segment, ranked within it, with explicit DM priority order |
| **Pitch opener** | "Hits 4 Tier-A judges' narratives" (judge-list, not pitch) | **30-second market-shape opener citing Vibhu's 99.99% claim**, with concrete-failure opener reserved for technical demo video | Two complementary pitches for two videos, banned-word-compliant, tested for delivery |
| **Scope (what's in v1)** | "5–8 hook modules + Kani harness + Phantom MCP demo + compliance vendor stubs + full policy DSL" | **6–8 hook modules + Kani harness per module + 1 reference x402 facilitator integration (Dexter).** Phantom MCP cut. Policy DSL cut. Compliance-vendor stubs cut. | 3 major scope reductions force 20-day discipline |
| **Differentiation** | "Differentiates from SAEP / SecuritiesDino / Blueshift / HarmonicMath" (vague) | **Explicit non-overlap maps:** vs SSS (agent-payment vertical vs issuer-stablecoin vertical), vs SecuritiesDino (agent payments vs securities compliance), vs Privy/Crossmint (asset-layer vs wallet-layer), vs Blueshift (application vs base-crate FV) | Each competitor defused with specific design-space argument |
| **Competitor naming-risk** | Not called out | **SSS risk surfaced:** "OpenZeppelin for Solana stablecoins" was claimed March 2026. VeriHook must stake the narrower "agent-payment" flag, not generic Token-2022 flag | New awareness; Day 4 positioning discipline |

---

## The sharpened wedge — one sentence

> **Asset-layer (Token-2022 mint-scoped) policy enforcement for agent-payment safety, shipped as an open-source formally-verified hook library + hosted policy registry, sold to x402 facilitators as the safety primitive that unlocks regulated-enterprise volume.**

Every word load-bearing:
- *Asset-layer* — not wallet-layer (Privy/Crossmint own that)
- *Token-2022 mint-scoped* — technically exact, excludes signer-side policy
- *Agent-payment safety* — narrowed vertical (excludes SSS's stablecoin-issuer vertical, SecuritiesDino's securities vertical, aperturerwa's RWA vertical, SAEP's fee-capture)
- *Open-source + formally-verified* — Public Goods Award eligibility + trust-reducer for adopters
- *Hook library + hosted policy registry* — two layers, one submission, two revenue shapes
- *x402 facilitators* — one nameable first-buyer
- *Safety primitive that unlocks regulated-enterprise volume* — their pain, their WTP, their integration speed

---

## Component breakdown

### VeriHook (open-source, public-goods-eligible)

Apache 2.0 Cargo crate. 6–8 modules, each with:
1. Anchor program implementing the TransferHook extension
2. Kani proof harness for core invariants (no double-spend, bounded CU, correct accounting)
3. Unit tests + fuzz tests
4. README with integration pattern

**Module list (v1 target):**
1. `velocity-cap` — per-account rolling-window spend limit (hourly/daily)
2. `allowlist` — allowlist of recipient addresses (off-chain-configured, on-chain-enforced)
3. `kill-switch` — emergency pause authority (multisig-controlled) that halts all transfers
4. `jurisdictional-gate` — reject transfers to/from jurisdictional categories (config-driven)
5. `identity-gate` — require on-chain identity attestation (compatible with Skyfire / on-chain-ID standards)
6. `audit-emitter` — emit structured compliance events (base module consumed by AgentSafe Hooks hosted product)
7. **Stretch:** `signer-age-gate` — require signer seed to be ≥N slots old (prevents freshly-minted wallet exploitation)
8. **Stretch:** `velocity-burst-shield` — compose velocity-cap with exponential backoff on rapid retries

### AgentSafe Hooks (venture product, accelerator-pitch-shaped)

Hosted product layer on top. Revenue surfaces:
1. **Policy registry** — SaaS that stores & validates policy configs per mint, exposes them to integrators via REST API. Freemium + per-seat + enterprise tier.
2. **Monitoring dashboard** — real-time view of compliance events per mint for issuers + auditors. Per-mint subscription.
3. **Compliance-event stream** — Kafka-topic-style event feed for regulated integrators to ingest into their SIEM. Enterprise contract.

Day-1 scope: policy registry (freemium web app). Monitoring + event stream deferred to v1.1 (Day 20–30).

### Shared repo structure (single Colosseum submission)

```
agentsafe-hooks/          (repo root)
├── verihook/              (Apache 2.0 — open-source library)
│   ├── velocity-cap/
│   ├── allowlist/
│   ├── kill-switch/
│   ├── jurisdictional-gate/
│   ├── identity-gate/
│   ├── audit-emitter/
│   └── kani-harness/      (shared proof harness)
├── agentsafe/             (BSL 1.1 — venture-layer hosted product)
│   ├── policy-registry/
│   └── reference-integration-dexter/
├── README.md              (pitch-compliant: banned-word-clean intro; explicit non-overlap with SSS)
└── LICENSE-APACHE / LICENSE-BSL
```

---

## Decision log (what Day 3 decided, what Day 4 still owes)

### Decided on Day 3 (don't re-litigate without new data)

1. **Direction: AgentSafe Hooks × VeriHook, bundled as single submission.** No pivot to AgentEscrow, AgentTrust, VeriX402, HookProof, or any Day-2 alternative.
2. **Moat: the hook library (A).** FV / wallet-API / audit-events are features, not moats. Only A stands alone.
3. **First buyer: x402 facilitators. Dexter first.** Not agent devs. Not wallets. Not DeFi.
4. **Pitch primary: market-shape (Variant B)** citing Vibhu's 99.99% claim + solo-engineer close. Variant A (concrete-failure) reserved for technical demo video.
5. **Cuts: Phantom MCP integration (v1.1), Policy DSL (v1.1), Compliance vendor stubs (v1.1), Full audit export infra (v1.1).**
6. **Naming: VeriHook = "formally-verified hook library for agent-payment safety." NOT "OpenZeppelin for Token-2022" (collides with SSS).**

### Owed by Day 4 (Mohit decides with rested brain)

1. **Confirm module count (6 vs 8).** Day 3 recommends 6 hard + 2 stretch. Day 4 Mohit picks based on his own velocity self-assessment.
2. **Confirm ship target is devnet-at-submission (acceptable) or mainnet-at-submission (ambitious).** Day 2 locked devnet; Day 3 doesn't reopen unless mainnet is cheap.
3. **Confirm whether to recruit Superteam-India non-technical co-founder for video/pitch polish Day 4–7.** Day 2 flagged as open; Day 3 defers to Day 4 Mohit.
4. **Confirm Kani vs. alternative FV framework.** Day 2 assumed Kani. Day 3 doesn't re-open — Blueshift endorsement confirms Kani is the right call. Only re-examine if Day-4 build-prep surfaces integration friction.

### Owed during Day 4–7 sprint (validation phase, not design)

1. **2 affirmative DM responses from x402 facilitators by Day 7.** Dexter + atxp_ai most likely.
2. **Token-2022 TransferHook CU-cost benchmark at 100 TPS.** If unacceptable, fall-back plan is smaller-scope library + narrative-pivot to "most-common safety patterns" instead of full vertical coverage.
3. **Project X account live by Day 5.** Tweet thread: "Day 20 of Frontier: here's what AgentSafe Hooks is and why we're shipping" — user-acquisition funnel-opening per Matty's explicit expectation.

---

## What this means for Mohit's submission

- **Day 4 morning action: Read this document once, cold. If no beat stumbles, write `THESIS_LOCK.md` using this as the single-source-of-truth and proceed to build-prep.**
- **If one beat stumbles, re-open only that beat.** Do not re-open the whole decision. Examples: if the moat (A) feels fuzzy, re-read `agentsafe-moat-analysis.md`. If the first buyer feels wrong, re-read `agentsafe-first-buyer.md`. If the pitch doesn't compress cleanly when spoken, re-test both variants in `agentsafe-pitch-compression.md`.
- **If two or more beats stumble, escalate**: flag the specific beats that stumble and do one more round of sharpening before locking. Do NOT proceed with a half-sharpened thesis.
- **The sharpening diff below is the artifact Mohit pitches to any advisor/peer** for sanity check. One paragraph, concrete.
- **Build-prep Day 4:** scaffold `/verihook/` with 6 module stubs, Kani harness structure, and the reference Dexter integration skeleton. Day-4 end-of-day should have `cargo build` green on empty modules.
- **Parallel Day-4 action:** 3 DMs sent (Dexter, atxp_ai, MCPay per `day4-dm-drafts.md`). Discovery framing; Mohit reviews drafts and personalizes before sending.

---

## One-paragraph sharpening diff (for peer sanity check / advisor pitch)

Compared to Day 2's raw recommendation, the sharpened wedge is **asset-layer (Token-2022 mint-scoped) policy enforcement for agent-payment safety specifically** — formerly conflated with "agent safety generally." The moat is the **hook library alone**, with formal-verification, wallet-API, and audit-event components demoted to features (formerly all four blurred). The first buyer is **x402 facilitators, Dexter-first**, not a two-segment mix (formerly "facilitators primary + agent devs secondary"). The pitch opens on **Vibhu's 99.99% agent-transaction claim cited back to him**, not on a judge-list dump (formerly a 4-judge-narrative alignment slide). Scope-removed: Phantom MCP integration, full policy DSL, compliance-vendor stubs, regulator-export audit infra. Scope-added: module count increased to 6+2 stretch + one reference Dexter integration as demo anchor. Narrative-sharpened: VeriHook is **not "OpenZeppelin for Token-2022"** (SSS claimed that); it is *"the formally-verified hook library for agent-payment safety that SSS explicitly does not ship."*
