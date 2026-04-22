# AgentSafe Hooks × VeriHook — First-Buyer Pick (Day 3 Q3)

**Purpose:** Day 2 suggested "x402 facilitators primary + agent devs secondary." Day 3 sharpens to ONE. A hackathon submission with an unclear first buyer reads as "cool tech, no customer"; judges penalize that. A submission with ONE nameable buyer segment that Mohit can point at during pitch video reads as "founder understands their market."

**Decision rule (no hedging):** Score 4 candidates on pain / willingness-to-pay / adoption speed / reachability-in-20-days. Pick ONE. Argue against the rejected three. Name a Phase-2 expansion target.

Last verified: 2026-04-23

---

## The 4 candidate buyer segments

Per Day 3 mission brief:

| # | Segment | Representative logos | What they'd integrate |
|---|---------|---------------------|----------------------|
| 1 | **x402 facilitators** | Dexter, MCPay, Latinum, Corbits, atxp_ai, SAEP | AgentSafe Hooks as the safety-layer inserted between facilitator and merchant — every routed payment flows through hook-enforced mints, unlocking regulated-enterprise volume the facilitator cannot currently touch |
| 2 | **Agent developers** | MCP server builders, LangChain/CrewAI/AutoGen integrators, Phantom-MCP agent builders, OpenClaw bot devs | VeriHook-enforced USDC wrapper integrated at the SDK level — their agents transact through safe mints by default |
| 3 | **Wallet-as-a-service providers** | Privy, Crossmint, Backpack, Phantom, Solflare, WaaP, WalletSuite | Asset-layer hook integration as defense-in-depth complement to their wallet-layer signer policies |
| 4 | **DeFi protocols** | Drift, Kamino, Jupiter, Marginfi, Sanctum | Hook-protected mint variants to let agents interact without catastrophic-risk exposure |

---

## Scoring matrix

Each segment scored 1–10 on four axes. Low score on any axis is dispositive; no averaging.

| Axis | 1. x402 facilitators | 2. Agent devs | 3. Wallets-as-a-service | 4. DeFi protocols |
|------|---------------------|---------------|------------------------|-------------------|
| **Pain level (1=nice-to-have, 10=show-stopper)** | 9 — their revenue ceiling is capped by regulated-enterprise integrators (Mastercard/Amex/banks) who require safety evidence; current answer is "build it yourself or skip us" | 6 — pain is real (agent losses are common) but solved-enough by Privy/Crossmint signer-layer policy for most builders; the additional 20% risk is invisible until incident | 4 — already shipping wallet-layer policy (Privy, Crossmint); additional asset-layer is defense-in-depth, genuinely useful but not urgent | 5 — interested in agent volume, but they'd rather gate agents at the protocol layer (like Drift's post-hack authority model) than at the mint layer |
| **Willingness-to-pay for THIS specifically (1=zero, 10=contract)** | 8 — facilitators are venture-funded, revenue-hungry, and competitive. Integrating a safety layer that unlocks one enterprise contract pays back the integration immediately. Policy-registry subscription + per-transaction compliance-attestation fee both pricable. | 4 — individual agent devs won't pay for infra; they adopt free SDKs. Conversion only via enterprise platforms downstream. | 6 — WaaS providers have enterprise customers who would pay IF the combined wallet-layer + asset-layer pitch lands; but routing through wallet-provider means Mohit's revenue is intermediated | 3 — DeFi protocols don't pay for middleware; they either build it in-house or ignore. Integration via incentive alignment (MEV rebate share, volume-driven) not fees |
| **Adoption speed for v1 (1=year+, 10=weeks)** | 8 — facilitators ship aggressively (Dexter v3 SDK, MCPay production, Latinum production) and will integrate anything that unlocks their volume ceiling; integration is a CPI call on their side | 5 — SDK adoption is slow; takes months for library to propagate through agent dev community | 6 — wallets move fast but priorities are set by product roadmaps; integrating a third-party asset-layer requires committee-level decision | 4 — DeFi protocols have 6–12 month integration cycles; post-Drift, they're even more conservative on new dependencies |
| **Reachability in 20-day window (1=cold-call, 10=Mohit can DM today)** | 9 — Dexter/MCPay/Latinum/Corbits/atxp_ai/SAEP all have public X handles, active in hackathon orbit, and multiple are Colosseum cohort alumni (warm network); 5 DMs by Day 7 is realistic | 7 — Solana agent dev community is small and active on X/Discord; Mohit can surface in builder threads | 6 — Privy/Crossmint CEOs are public and reachable, but enterprise vendors are slower to respond to a pre-launch solo builder; weeks-of-email cycle | 4 — DeFi protocol founders are in deep-focus mode on their own product; outreach success rate low for a pre-launch infra pitch |

### Verdict: **1. x402 facilitators** is the first-buyer segment.

Every axis score ≥8. No alternative has that profile.

---

## Defense against the rejected three

### Why NOT Agent developers as primary (candidate 2)

- **No willingness-to-pay.** Individual agent devs adopt free SDKs, not paid infra. Getting to revenue requires going upstream to the enterprise platforms they build inside — which loops back to facilitators anyway.
- **Slow feedback loop.** Even if 50 agent devs fork VeriHook, judges will ask "who's paying you?" and Mohit cannot answer with individual-dev adoption.
- **Category: amplifier, not primary.** Agent devs adopt VeriHook (the open-source library) as users; the adoption counts as traction (GitHub stars, imports, README references). But first-buyer (i.e., "who is the first contract") is upstream of them.

### Why NOT Wallet-as-a-service providers as primary (candidate 3)

- **Already shipping wallet-layer policy.** Q1 established that Privy and Crossmint both ship agent-wallet policy as their own products. AgentSafe Hooks' asset-layer plays a defense-in-depth role for them, not a primary purchase.
- **Intermediation risk.** If Privy bundles VeriHook into their product, Mohit's revenue is mediated by Privy's pricing decisions — a weak seat of the table for a solo founder.
- **Category: integrator/partner, not first-buyer.** Privy integrating VeriHook = an excellent distribution story ("VeriHook ships with every Privy agent wallet by default"). But that's partnership, not first-contract.
- **Day-4 DM framing for Privy/Crossmint should be partnership-discovery, not pitch-for-purchase.** See day4-dm-drafts.md.

### Why NOT DeFi protocols as primary (candidate 4)

- **Build-in-house bias.** DeFi protocols running >$10M TVL have their own teams and rarely take third-party dependencies. Post-Drift, this is worse: anyone hitting Drift/Kamino with "please add this library" will get a polite "we'll evaluate next quarter."
- **Integration cycle is 6–12 months.** Does not fit the hackathon-window need for 1–2 affirmative DMs by Day 7.
- **Category: Phase-2 expansion.** Once AgentSafe Hooks has facilitator traction, pitching Drift/Kamino on "let agents trade in your markets via hook-enforced mints" becomes a credible Phase-2 land.

---

## Narrowing x402 facilitators: WHICH facilitator first?

Within the x402-facilitator segment, pain / WTP / speed profiles differ. Score the 6 candidates for WHO to DM first:

| Facilitator | Stage | Pain-for-enterprise-volume | Reachability | Day-7 DM priority |
|-------------|-------|---------------------------|--------------|-------------------|
| **Dexter (@dexteraisol)** | Production, v3 SDK shipping, aggressive | HIGH — Dexter wants smart-wallet enterprise integrations (Squads/Crossmint/SWIG); safety layer unlocks regulated-SaaS | **9** — founder personally on X; cohort alumni | **Priority 1** |
| **atxp_ai (Circuit & Chisel)** | Production leader — 1M tx, 5K users | MEDIUM-HIGH — already at scale, now seeking enterprise upsell; also publicly endorsed by SolanaFndn | **8** — public founder; Foundation RT network | **Priority 2** |
| **MCPay** | Production, Cypherpunk Stablecoin Grand | MEDIUM — already has stablecoin-compliance narrative; would adopt asset-layer as natural extension | **7** — Grand winner, on Colosseum radar | **Priority 3** |
| **SAEP (@BuildOnSAEP)** | Mainnet live 2026-04-21, aggressive agent-economy positioning | UNCLEAR — they use TransferHook for fee capture (different purpose); their agent-economy pitch is close-enough to invite category-confusion | **7** — public builder, mainnet-live | **Priority 4 — careful framing** (see below) |
| **Latinum** | Production, Breakout AI Grand | MEDIUM — established middleware; defense-in-depth fits their positioning | **6** — Grand winner | **Priority 5** |
| **Corbits** | Cypherpunk Infra runner-up, x402 endpoint dashboard | LOW — dashboard-shaped, not integrator-shaped | **6** | Priority 6 (last) |

### Why Dexter first

1. **Mechanical fit:** Dexter's v3 SDK already integrates with Squads/Crossmint/SWIG smart wallets. Adding a VeriHook-enforced mint as an additional integration is a CPI call — hours of work on their side.
2. **Commercial fit:** Dexter's enterprise-contract thesis (*"first x402 facilitator for Solana smart wallets"*) explicitly wants regulated volume. Safety layer unlocks it.
3. **Social fit:** Cohort alumni warmth + publicly aggressive shipper (Day 2 noted 2,130 likes on his top SDK post). He responds to DMs.
4. **Strategic fit:** One Dexter testimonial in the pitch video reads as "sophisticated infra buyer endorses the primitive" — maximally credibility-building for judges who know Dexter.

### Why SAEP requires careful framing

SAEP's April 20 post explicitly positions their TransferHook as "fee capture" for their own agent-economy token. They're not a natural buyer of AgentSafe Hooks — they might read Mohit's outreach as "you're competing with me." Mitigation: DM framing MUST emphasize that AgentSafe Hooks is issuer-agnostic safety layer (any mint), not an agent-economy protocol. A well-framed DM generates a thoughtful answer; a poorly-framed one generates a defensive "we already do this." See day4-dm-drafts.md for specific framing.

---

## Phase 2 expansion target (what comes after x402 facilitators)

Once AgentSafe Hooks has 2+ facilitator integrations signed / piloting / quoted:

**Phase 2 = Wallet-as-a-service providers (segment 3).** Rationale: facilitator adoption creates proof points ("VeriHook enforces safety on all Dexter-routed payments"), which neutralizes Privy/Crossmint's "we already do this" objection by pointing to the asset-layer differentiation they can bundle. Partnership pitch to Privy/Crossmint: *"We're already shipped on Dexter; integrate us and your wallet customers get defense-in-depth by default."*

**Phase 3 = DeFi protocols.** After WaaS integration, AgentSafe Hooks is the de-facto safety standard for any Token-2022 mint agents touch. Drift/Kamino adoption becomes a lagging indicator.

**Agent developers (segment 2) = parallel amplifier across all phases.** GitHub stars, fork count, and import metrics drive credibility regardless of phase.

---

## Customer interview plan (Day 4–7)

**6 DMs over 3 days**, discovery framing not pitch framing (per Day 3 mission brief). Full drafts live in `research/00-thesis/day4-dm-drafts.md`.

| Day | Target | Framing |
|-----|--------|---------|
| 4 | Dexter (@dexteraisol) | "What's your top-5 pain when regulated-enterprise integrators ask about agent payment safety? How are you handling it today?" |
| 4 | atxp_ai | "You're at 1M tx — curious what compliance-enterprise conversations you're navigating re: safety of agent payments at scale" |
| 5 | MCPay | "How are you thinking about asset-layer safety for stablecoin-compliance workflows on x402?" |
| 5 | SAEP (@BuildOnSAEP) | "Love the Token-2022 fee capture — curious whether you see agent-payment-SAFETY hooks as a separate library-shaped problem from fee capture" |
| 6 | Latinum | "Quick read on whether regulated-agent-commerce integrators you're talking to ask for formally-verified safety primitives on the merchant-facing side" |
| 6 | Corbits | "Your x402 dashboard has a natural seat for payment-safety observability — curious what your most-requested feature from integrators looks like" |

**Target:** 2 substantive responses by Day 7. 1 response naming AgentSafe Hooks' specific use case unprompted = strong validation. 0 responses = do NOT default to pivot; re-frame DMs and try again with targeted Discord outreach (Solana Colosseum builder channels).

---

## What this means for Mohit's submission

- **First-buyer segment: x402 facilitators.** Primary DM priority: Dexter (@dexteraisol), then atxp_ai, then MCPay. Phase 2 (post-hackathon): wallet-as-a-service providers.
- **Pitch video customer-segment language.** Open the problem-statement segment with: *"x402 facilitators are shipping agent payments at 1M+ transactions but can't touch regulated-enterprise volume because there's no standardized asset-layer safety primitive. AgentSafe Hooks is that primitive."* One name (Dexter, or atxp_ai's stat), one pain, one solution. 15 seconds.
- **Agent devs are the amplifier, not the buyer.** GitHub star count + import count + "N projects using VeriHook" = traction slide. Do NOT pitch agent devs as customers — pitch them as adopters.
- **Privy & Crossmint are integrators/partners, not customers.** If either responds to a Day-4 outreach, the ask is integration-partnership framing ("How would we plug into your agent-wallet stack as asset-layer complement?") — not purchase framing.
- **DM target: 2 affirmative by Day 7 is the Day-8 pivot threshold.** If below, do NOT pivot to AgentEscrow — instead, re-frame DMs and escalate to builder Discord outreach for 48 hours. Only after Day 10 with <2 responses do we pivot (and the pivot shortlist is VeriHook-only + Public Goods Award positioning, per Day-2 fallback map).
- **Accelerator pitch framing:** "We're the safety primitive the x402 wave is missing — first customer is the dominant Solana facilitator, and we bundle an open-source library (VeriHook) that locks our category name across every new agent-builder starting on Solana."
