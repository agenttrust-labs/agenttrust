# Ideas Shortlist — Top 5 Scored on 6-Axis Rubric + Matty Accelerator Filter

**Methodology:** Each candidate scored 1–10 on the 6 axes from the colosseum-research skill rubric (judge fit / narrative fit / solo build fit / skill fit / defensibility / demoability). 60-point sum. Below 36 → kill. 48+ → top contender.

**7th implicit filter (per Day 2 prompt):** Matty Accelerator Filter — does this pass [Matty Taylor 2026-03-20](https://x.com/mattytay/status/2034807896249422313)'s "hyper-commercialize, prizemaxxing, real seed capital, founders that just changed their lives" frame? **YES / MEDIUM / NO**. NO scores cut even if 6-axis sum is high.

Last verified: 2026-04-21

---

## Scoreboard

| Rank | Idea | Judge | Narrative | Solo | Skill | Defens | Demo | **Sum** | Matty | **Verdict** |
|------|------|-------|-----------|------|-------|--------|------|---------|-------|-------------|
| 1 | **AgentSafe Hooks** | 10 | 10 | 8 | 10 | 8 | 9 | **55** | **YES** | **THESIS LEAD** |
| 2 | **AgentEscrow** | 9 | 9 | 9 | 9 | 7 | 8 | **51** | YES | Strong fallback |
| 3 | **VeriHook** | 9 | 10 | 10 | 10 | 6 | 6 | **51** | MEDIUM | Open-source-only kills accelerator angle |
| 4 | **VeriX402** | 9 | 8 | 6 | 10 | 6 | 7 | **46** | MEDIUM | Build risk + Dexter pressure |
| 5 | **HookProof** | 8 | 9 | 7 | 9 | 6 | 7 | **46** | MEDIUM | Tool-shape; depends on VeriHook foundation |

---

## Detailed scoring

### Rank 1 — **AgentSafe Hooks** (Score: 55/60, Matty: YES)

**Pitch (one sentence):** A drop-in Solana Token-2022 transfer-hook safety layer that lets x402 facilitators and AI-agent wallets enforce per-payment policies (velocity caps, allowlists, kill-switches, jurisdictional gating) at the protocol level, formally verified.

| Axis | Score | Reasoning |
|------|-------|-----------|
| Judge fit | 10 | Hits 4 Tier-A judges' explicit narratives: Vibhu (agent commerce), Toly (Token-2022 + formal verification), Mert (security + AI rails), Matty (AI×DeFi + security). Matty's inner-circle attention surface saturated. |
| Narrative fit | 10 | Triple-narrative: (a) security-first + (d) AI-rails + (e) Token-2022. Lily endorses (a)+(b)+(d), Toly (c)+(e), Vibhu (d)+(e). |
| Solo build fit | 8 | One Anchor program with 5–8 hook modules + Kani harness + integration tests + reference x402 facilitator demo. 15 days credible — the safety policies are well-defined, not exotic. -2 because integration scope (Phantom MCP + Vanish + smart wallet) can balloon. |
| Skill fit | 10 | Pure senior-Rust + Anchor + Solana primitives. Mohit's wheelhouse. |
| Defensibility | 8 | Open-core: free hooks repository (public goods, grant-eligible), proprietary policy DSL + hosted policy registry + monitoring as the venture layer. Brand defensibility through "the safety standard for agent payments." |
| Demoability | 9 | Live demo: AI agent makes 50 micro-payments, then attempts to pay sanctioned address → kill-switch fires → recorded as compliance event. Visceral, easy to film in 90 seconds. |
| **Matty filter** | **YES** | Every x402 facilitator and agent-payment platform NEEDS this. Venture-scale market (the agent commerce market is the ~10× bigger trade Vibhu and Mert are publicly betting on). Clear path to revenue (policy-registry SaaS + audit attestations + enterprise compliance integrations). Founder-market-fit reads as "senior Solana eng at the intersection of agent payments and Token-2022." |

**Risks / mitigations:**
- SAEP could pivot to safety hooks → mitigation: ship fastest, claim the "agent payment safety" name first, position as horizontal vs SAEP's vertical agent-economy product
- Phantom MCP integration scope creep → mitigation: ship Day-1 demo with Phantom Connect; defer full MCP server to v1.1 (post-hackathon)
- Compliance vendor integration (KYC/sanctions) is real work → mitigation: ship reference patterns with Chainalysis/Elliptic stubs; full integration is v1.1

**Day 4–7 validation plan (3 highest-risk assumptions):**
1. *"x402 facilitators want a standardized safety hook layer"* — validate via DM outreach to Dexter, MCPay, Latinum, Corbits, Phantom team this week. Need 2 affirmative quotes by Day 7.
2. *"Token-2022 TransferHook composition is performant enough for agent micro-payments at 100+ TPS"* — benchmark Day 4–5 with synthetic load
3. *"The verified-template pattern actually catches the bug class 0xcastle_chain documents"* — write 2 invariant proofs Day 5 against a known-buggy reference impl

### Rank 2 — **AgentEscrow** (Score: 51/60, Matty: YES)

**Pitch:** A formally verified Token-2022-based escrow primitive for agent-to-agent x402 payments — drop-in for any agent platform that needs trustless conditional payments.

| Axis | Score | Reasoning |
|------|-------|-----------|
| Judge fit | 9 | Vibhu agent-commerce + Toly Token-2022/FV + Phantom MCP alignment. Lower than #1 because it's a single-feature primitive, not multi-policy safety layer. |
| Narrative fit | 9 | (d) × (e) × (c). Slightly thinner narrative coverage than #1. |
| Solo build fit | 9 | Single Anchor program with escrow logic + TransferHook + Kani proofs. Cleanest scope of the 5. |
| Skill fit | 9 | Anchor + Token-2022 + Kani — Mohit's wheelhouse. |
| Defensibility | 7 | Escrow primitives are easier to fork than safety-policy layers. Defensibility is brand + integrations. |
| Demoability | 8 | Demo: 2 agents transact, dispute happens, escrow releases per timeout / signed condition. Clean but less viscerally compelling than kill-switch demo. |
| **Matty filter** | **YES** | Escrow for agent commerce is a real venture market. Could be revenue-bearing (per-transaction take rate). |

**Risks:** SAEP's dispute-arbitration program is closely adjacent. Need to differentiate as "primitive that any platform can adopt" vs SAEP's vertical product.

### Rank 3 — **VeriHook** (Score: 51/60, Matty: MEDIUM)

**Pitch:** Open-source, formally verified Token-2022 TransferHook template library — a Cargo crate with 6–8 pre-verified safety patterns (velocity, allowlist, royalty, fee, KYC gating, kill-switch).

| Axis | Score | Reasoning |
|------|-------|-----------|
| Judge fit | 9 | Toly explicit endorsement of formal verification + Token-2022. Foundation STRIDE mandate. Direct alignment. |
| Narrative fit | 10 | Pure (c) × (e) — both narratives endorsed by inner circle in last 30 days. |
| Solo build fit | 10 | Highest of the 5. Library code + Kani harness + docs. Realistic in 12–14 days, leaving polish time. |
| Skill fit | 10 | Pure senior-Rust + formal methods + Anchor. Wheelhouse. |
| Defensibility | 6 | Open-source library is hard to defend commercially; defensibility is reputation + standard adoption. |
| Demoability | 6 | Library demos are intrinsically dry; CLI walkthrough of "before/after" templates lacks visceral impact. |
| **Matty filter** | **MEDIUM** | Pure open-source library is *not* venture-shaped per Matty's "hyper-commercialize" frame. Could be repackaged with hosted SaaS layer (e.g., HookProof = #5) for accelerator pitch. As a standalone, it's a public-goods grant target — wins Public Goods $10K but unlikely to win Standout/Grand. |

**Verdict:** Strongest pure technical fit, but accelerator path is weak. **Use as the foundation layer for #1 (AgentSafe Hooks) — VeriHook becomes the open-source primitive base, AgentSafe Hooks becomes the venture-scale product on top.**

### Rank 4 — **VeriX402** (Score: 46/60, Matty: MEDIUM)

**Pitch:** A Rust-native, on-chain Anchor program implementing a formally verified x402 facilitator with Token-2022 transfer-hook policy enforcement — protocol-layer instead of middleware-layer.

| Axis | Score | Reasoning |
|------|-------|-----------|
| Judge fit | 9 | (c)+(d) intersection alignment. Phantom MCP / Coinbase Dev x402 anchor narrative. |
| Narrative fit | 8 | Strong (c)+(d), thinner (e) — Token-2022 use is structural, not the headline. |
| Solo build fit | 6 | x402 spec adherence + facilitator logic + smart-wallet integration + verification = real engineering. Tight in 15 days. |
| Skill fit | 10 | Wheelhouse. |
| Defensibility | 6 | Dexter is well-funded and aggressive (v3.0 SDK shipping). Mohit's protocol-layer differentiator is a sharp wedge but might not survive. |
| Demoability | 7 | Live x402 payment with on-chain proof would demo well, but middleware-vs-protocol distinction is technical. |
| **Matty filter** | **MEDIUM** | Facilitator-as-business is real but Dexter has a 6-month lead and is shipping aggressively. Mohit must show why protocol-layer beats middleware-layer in concrete terms. |

**Verdict:** Promising but build risk + competitive pressure pushes it below threshold for primary. Could be an excellent v2 after AgentSafe Hooks lands.

### Rank 5 — **HookProof** (Score: 46/60, Matty: MEDIUM)

**Pitch:** Verification-as-a-service web tool that takes any Token-2022 program, runs verified-template-conformance + property-based fuzzing + invariant generation, and returns a public attestation. Free tier for sub-$10M-TVL.

| Axis | Score | Reasoning |
|------|-------|-----------|
| Judge fit | 8 | Touches (a)+(c)+(e) but less directly than #1. STRIDE alignment but in the gap-filling tier. |
| Narrative fit | 9 | Public-goods + security framing is on-narrative. |
| Solo build fit | 7 | Verification engine + web frontend + storage for attestations. Real scope. |
| Skill fit | 9 | Engine is wheelhouse; frontend less so but achievable. |
| Defensibility | 6 | Audit-as-a-service plays often commoditize. |
| Demoability | 7 | Live "submit your contract → get a verified report in 30 sec" is decent but not heart-stopping. |
| **Matty filter** | **MEDIUM** | Audit SaaS is a real market but Asymmetric Research occupies the high end. The free-tier-for-small-builders angle is valid but less "venture-changing-lives." |

**Verdict:** Strong companion to #2/VeriHook (HookProof = the SaaS layer). Not a standalone primary thesis.

---

## Recommended thesis composition for Day 3 lock

**Primary thesis (recommended):** **AgentSafe Hooks** as the venture-scale product, with **VeriHook** as the open-source primitive base.

### Why this composition works

- **Open-source primitive base (VeriHook)** = grants eligibility (Solana Foundation, Superteam India Instagrant), public-goods award contender, dev-credibility-builder
- **Venture-scale product layer (AgentSafe Hooks)** = accelerator-pitch-shape, revenue path (policy registry + monitoring + enterprise compliance), composes with multiple sponsors (Phantom MCP, Vanish, Helius)
- **Three-narrative coverage** (security + AI rails + Token-2022) hits multiple Tier-A judge attention surfaces
- **Demoable** = visceral kill-switch demo lands the pitch video in <90 seconds
- **Solo-buildable** = 15-day scope of policy modules + verification harness + reference integration is realistic
- **Differentiates against SAEP** (vertical agent-economy) by being horizontal-safety-layer
- **Differentiates against SecuritiesDino** (vertical securities issuance) by being agent-payment-specific
- **Differentiates against Blueshift / HarmonicMath** (general formal verification) by being Token-2022-extension-specific
- **Composable with sponsors:** Phantom Connect (Grand sponsor) for agent wallet integration; Vanish ($10K side bounty) for private-swap rail variant; Helius for Mert's investor-intro funnel

### Top 3 highest-risk assumptions (Day 4-7 validation plan)

1. *"x402 facilitators / agent platforms want a horizontal safety layer rather than building it themselves"* — validate via 5 DMs by Day 7 (Dexter, MCPay, Latinum, Corbits, Phantom team)
2. *"Token-2022 TransferHook composition can sustain >100 TPS without unacceptable CU cost"* — benchmark Day 4–5
3. *"The 'safety hooks' framing is distinct enough from SAEP's 'agent economy' framing to avoid being absorbed"* — confirm via 2 founder DMs (one to BuildOnSAEP team if reachable, one independent) about category positioning

### Backup if AgentSafe Hooks fails validation

If primary fails Day-7 validation: **AgentEscrow** (#2) is the cleanest fallback — narrower scope, similar narrative positioning, lower differentiation risk.

If both #1 and #2 fail: revert to **VeriHook + HookProof bundle** (open-source library + paid attestation service) — lower accelerator probability but solid Standout-tier candidate.

---

## What this means for Mohit's submission

- **Day 3 thesis lock recommendation: "AgentSafe Hooks" (venture product) + "VeriHook" (open-source library underneath) bundled as the submission.** One GitHub repo, two layers, single pitch video.
- **The 6-axis 55/60 + Matty-YES is the highest-confidence pick of the 5.** No close second on full criteria.
- **The Public Goods Award ($10K) is winnable on the open-source layer alone.** The Standout tier ($10K × 20) is the realistic primary target via the venture layer. Grand is not the design point — accelerator interview is.
- **Sponsor composability is a free amplifier:** Phantom Connect integration (Grand sponsor alignment) + optional Vanish private-swap variant ($10K side bounty) cost minimal additional scope.
- **Day 4–7 validation must happen** — 5 DMs to facilitator/agent-platform founders. If <2 affirmative responses, force a Day 8 pivot to AgentEscrow (#2) — do not push the primary thesis through user-validation failure.
