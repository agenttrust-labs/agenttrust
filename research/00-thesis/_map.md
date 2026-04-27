# 00-thesis/

**Purpose:** Convergence funnel. Everything in 01–06 feeds here. Day 4.5 AgentTrust-sharpening-to-parity complete; lock pending Mohit Day-5 read of both SHARPENED specs side-by-side.

## Files
- `ideas-longlist.md` — **[Day 2 DONE]** 13 candidates, all in (c)×(e) intersection. 9 ideas eliminated against constraints.
- `ideas-shortlist.md` — **[Day 2 DONE]** Top 5 scored on 6-axis rubric + Matty-accelerator filter. Winner: AgentSafe Hooks (55/60, Matty: YES) bundled with VeriHook.
- `agentsafe-moat-analysis.md` — **[Day 3 DONE]** 4-candidate moat analysis. Picked A (hook library) as sole moat.
- `agentsafe-first-buyer.md` — **[Day 3 DONE]** Picked x402 facilitators (Dexter first); agent devs amplifier; wallets Phase-2; DeFi Phase-3.
- `agentsafe-pitch-compression.md` — **[Day 3 DONE]** Variant B (market-shape, Vibhu 99.99%) primary for pitch video; Variant A (concrete-failure $47K) for technical demo.
- `AgentSafe-SHARPENED.md` — **[Day 3 DONE]** Single coherent sharpened spec combining Gates 1 & 2 + Q1–Q4. Day-3 lock candidate.
- `day4-dm-drafts.md` — **[Day 3 DONE]** 6 discovery DMs. Decided OFF-TABLE for this sprint (per Day-4 mission brief).
- `agenttrust-reframe-draft.md` — **[Day 4 DONE — Phase 2]** DRAFT reframed AgentTrust spec consuming Solana Agent Registry identity + reputation; ships PolicyVault + TrustGate x402 + ValidationRegistry as 3 components in single submission. Not a sharpened spec — input to Phase-3 decision. **Superseded for v1 scope by `AgentTrust-SHARPENED.md` (Day-4.5).**
- `agenttrust-reframe-decision.md` — **[Day 4 DONE — Phase 3]** Single-question decision doc: *"is reframed AgentTrust meaningfully distinct from AgentSafe Hooks?"* **OUTCOME: DISTINCT.** All three criteria met; reverse-mapping problem is the load-bearing structural moat.
- `agenttrust-other-leads.md` — **[Day 4 DONE — bonus]** Six leads ranked: A) standalone Validation Registry (sleeper), B) AgentSafe + 8004-read identity-gate (enrichment), C) AgentSafe + ValidationRegistry dual-bundle, D) AgentTrust-reframe full path, E) cross-registry adapter (not recommended), F) AgentSafe pure Day-3 lock (conservative default). **Lock decision Day 5 narrows to AgentSafe pure (or +Lead-B enrichment) vs AgentTrust 2-component (Day-4.5 sharpened).**
- `agenttrust-moat-analysis.md` — **[Day 4.5 DONE — Phase 1]** 3-component moat analysis. **Picked PolicyVault as sole structural moat** (TrustGate + ValidationRegistry demoted to features). Reverse-mapping defense + Foundation-stack-completion defense + first-buyer-pull defense.
- `agenttrust-first-buyer.md` — **[Day 4.5 DONE — Phase 2]** Picked x402 facilitators with Foundation-alignment as additional pull lever. Dexter / atxp_ai / MCPay as top-3 named targets. **SAEP REMOVED from buyer list (now competitor per Phase-0 reclassification).** Regulated enterprises = Phase-2 (parallel cold-emails for discovery quotes).
- `agenttrust-pitch-compression.md` — **[Day 4.5 DONE — Phase 3]** Two 30-second pitches compressed: Variant A (Nike consumer-fraud) + Variant B (Anthropic B2B scam-wrapper). Both Foundation-alignment-embedded; banned-vocabulary-clean (no "primitive"/"infrastructure"/"PolicyVault"/etc); SAEP-differentiation-implicit (never names SAEP). **Primary: Variant B for Frontier judges (Mert+Matty floor); Variant A for technical demo video.** Pre-empted Q&A drafted.
- `agenttrust-solo-build-assessment.md` — **[Day 4.5 DONE — Phase 4]** Honest day-by-day buildability map with **four scope options surfaced** (full 3-component / trimmed 3-component / 2-component-with-ValidationRegistry-as-docs+stub / minimum-viable). Day-cost math per option at 1.4x velocity: Option 1 ~64% over budget, Option 2 ~16% over, Option 3 fits with 0.5 M-day buffer, Option 4 comfortable with 5.5 M-day buffer. Mohit picks scope Day 5 with full math in hand. Pre-decided 6-cut priority order applies to any scope picked; never-cut floor list defines submission-viable threshold. Critical Day-5 action (regardless of scope): pre-warm 3-5 demo agents on Quantu mainnet ATOM (without 12-day tier-vesting runway, headline demo doesn't work Day 12).
- `AgentTrust-SHARPENED.md` — **[Day 4.5 DONE — Phase 6]** Single coherent sharpened spec mirroring AgentSafe-SHARPENED.md structure. Lock-readiness deliverable. Day-5 Mohit reads side-by-side with AgentSafe-SHARPENED, picks one, writes THESIS_LOCK.md.
- `THESIS_LOCK.md` — **[Day 5 owed]** Mohit reads BOTH SHARPENED specs side-by-side, picks one, locks. Decision is now binary (AgentSafe Hooks pure or +Lead-B enrichment vs AgentTrust 2-component scope).

**Phase 5 (founder pre-existing thinking dump) — UNRUN.** Mohit has 1.5 months of prior thinking on fake reviews / trust-credit primitives / sybil-resistance / gaming attacks. Did not surface during Day-4.5 session. Revisitable Day-5+ during build phase as `agenttrust-founder-prior-thinking.md`. Not a lock-blocker.

## Day 4.5 outcome (2026-04-28)

**Both theses sharpened to FULL parity (AgentSafe-SHARPENED.md from Day 3 + AgentTrust-SHARPENED.md from Day 4.5). Lock decision pending Day-5 Mohit-read.**

**Phase-0 SAEP deep recon finding:** SAEP ships 10 Anchor programs on mainnet (agent_registry / treasury_standard / task_market / proof_verifier / dispute_arbitration / governance_program / fee_collector / nxs_staking / capability_registry / template_registry) with Halborn+OtterSec audit prep. BUT: zero Foundation endorsement claims, zero x402 facilitator partnerships, anonymous founder, $SAEP token launched on pump.fun, 2 GitHub stars / 500 X followers / 5 mainnet escrows. **SAEP's TreasuryStandard already ships per-tx/daily/weekly limits + allowlists + streaming budgets — but all are AGENT-SELF-spending, ZERO counterparty-aware gating.** PolicyVault's distinctive wedge survives but the differentiation must explicitly emphasize counterparty-aware-vs-self-spend. Foundation-aligned-vs-sovereign positioning is the load-bearing differentiation.

**Phase-1 moat verdict:** **PolicyVault is THE structural moat.** TrustGate is the demo-vehicle for PolicyVault; ValidationRegistry is the standard-completion narrative-vehicle. Three mutually-reinforcing defensibility properties: reverse-mapping (vs AgentSafe v1.1) + Foundation-stack-completion (vs SAEP v2) + first-buyer-pull (vs Foundation absorption into SDP).

**Phase-2 first-buyer:** x402 facilitators with Foundation-alignment as additional pull lever (Dexter / atxp_ai / MCPay top-3). **SAEP REMOVED from buyer list** (now competitor; zero outreach during Frontier window). Regulated enterprises = Phase-2 parallel cold-emails for discovery quotes.

**Phase-3 pitch:** Two 30-second variants — Variant B (Anthropic B2B scam-wrapper) primary for Frontier judges; Variant A (Nike consumer-fraud) for technical demo video. Both Foundation-alignment-embedded; SAEP-differentiation-implicit (never names SAEP).

**Phase-4 buildability map:** Four scope options surfaced with honest day-cost / risk / pitch-coverage tradeoffs per option. Day-cost math at 1.4x velocity: Option 1 (full 3-component) ~64% over budget; Option 2 (trimmed 3-component) ~16% over; Option 3 (2-component + ValidationRegistry-as-docs+stub) fits with 0.5 M-day buffer; Option 4 (minimum-viable) comfortable with 5.5 M-day buffer. Mohit picks scope Day 5 with full math in hand. Pre-decided 6-cut priority order applies to any scope picked; never-cut floor list defines submission-viable threshold.

**Critical Day-5 action if AgentTrust locks:** Pre-warm 3-5 demo agents on Quantu mainnet ATOM Engine. ATOM tier vesting takes ~20 days; without pre-warming, headline tier-0-vs-tier-3 demo doesn't work Day 12.

## Day 4 outcome (2026-04-27)

**Reframe attempt complete; AgentTrust sharpened to DRAFT depth (then to full SHARPENED depth on Day 4.5).**

**Q1 finding (load-bearing):** Solana Agent Registry (Quantu Labs `8oo4dC4...` mainnet, ATOM Engine `AToMw53a...`) ships AgentTrust components 1 (Identity) + 2 (Reputation) — Foundation-endorsed at solana.com/agent-registry, MIT-licensed, 1,433 agents registered.

**Phase-3 verdict:** DISTINCT (architectural-layer + value-prop + structural-moat all pass).

**Wedge-defensibility caveat:** AgentSafe Hooks holds EMPTY wedge; AgentTrust enters CONTESTED wedge (KAMIYO + SAEP + Cascade + Microsoft cross-chain).

**Six-registry fragmentation finding:** 8004 / 014 / SATI / SAID / SAP / helixa. 8004-Solana is Foundation-endorsed but not ecosystem-dominant. PolicyVault v1 ships 8004-only (Day-4.5 cut); multi-registry adapter is Phase-2.

## Day 3 outcome (2026-04-23)

**Thesis direction LOCKED at recommendation level:** AgentSafe Hooks × VeriHook bundled submission.

**Gates cleared:**
- Gate 1 (Vibhu pressure-test): **(b) GREEN LIGHT** — 449 Vibhu tweets scanned, 0 critical-keyword hits. Vibhu's SDP / STRIDE / agent-commerce roadmap is orthogonal to asset-layer wedge.
- Gate 2 (Public Goods bundling): **(a) ALLOWED** — rules §7 force bundling (one submission per team); silent on multi-award, historical precedent permits. See `research/01-hackathon-mechanics/rules-and-prizes.md` §10.

**Refinements made Day 3:**
1. Wedge narrowed: **asset-layer Token-2022 policy enforcement for agent-payment safety specifically** (vs Day 2's vague "agent safety")
2. Moat concentrated: **hook library alone** (vs Day 2's "open-core + brand")
3. First buyer picked: **x402 facilitators (Dexter first)** (vs Day 2's "facilitators primary + agent devs secondary")
4. Pitch opener chosen: **Variant B (market-shape)** citing Vibhu 99.99%
5. Scope cut: Phantom MCP, Policy DSL, compliance-vendor stubs, full audit-export infra
6. Naming refined: VeriHook is **not "OpenZeppelin for Token-2022"** (collides with SSS). Narrowed to "formally-verified hook library for agent-payment safety."

## Day 3 lock checklist — updated status

1. ~~Send 5 founder DMs~~ → **Drafts written in `day4-dm-drafts.md`**; Mohit reviews + sends Day 4–6 (6 DMs instead of 5).
2. ~~Re-run duplicate-risk pass~~ → **Done via `agentsafe-competitive-deep-scan.md`** (5-layer scan). Key surprises: Privy productized agent-wallet policy; SSS claimed "OpenZeppelin for Solana stablecoins" a month before Frontier; aperturerwa ships a Policy-Registry + Transfer-Hook architecture near-identical to AgentSafe Hooks' plan (RWA vertical, non-overlapping).
3. ~~Confirm Matty accelerator filter~~ → **Still YES**. Pitch Variant B explicitly "shipping in 20 days on Solana" matches Matty's "hyper-commercialize" framing.
4. **Mohit personal agreement** → Day 4 morning: Mohit reads `AgentSafe-SHARPENED.md` cold, locks if no beat stumbles, re-opens only beats that stumble.

## Scoring rubric (binding)
6-axis 1–10: judge fit, narrative fit, solo build fit, skill fit, defensibility, demoability. Sum/60. Below 36 → kill. 36–47 → keep on shortlist. 48+ → top contender. Plus Matty-accelerator filter (YES/MEDIUM/NO) — NO scores cut even with 60/60 sum.
