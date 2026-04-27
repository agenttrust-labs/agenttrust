# 00-thesis/

**Purpose:** Convergence funnel. Everything in 01–06 feeds here. Day 4 reframe-attempt complete; lock pending Mohit Day-5 read.

## Files
- `ideas-longlist.md` — **[Day 2 DONE]** 13 candidates, all in (c)×(e) intersection. 9 ideas eliminated against constraints.
- `ideas-shortlist.md` — **[Day 2 DONE]** Top 5 scored on 6-axis rubric + Matty-accelerator filter. Winner: AgentSafe Hooks (55/60, Matty: YES) bundled with VeriHook.
- `agentsafe-moat-analysis.md` — **[Day 3 DONE]** 4-candidate moat analysis. Picked A (hook library) as sole moat.
- `agentsafe-first-buyer.md` — **[Day 3 DONE]** Picked x402 facilitators (Dexter first); agent devs amplifier; wallets Phase-2; DeFi Phase-3.
- `agentsafe-pitch-compression.md` — **[Day 3 DONE]** Variant B (market-shape, Vibhu 99.99%) primary for pitch video; Variant A (concrete-failure $47K) for technical demo.
- `AgentSafe-SHARPENED.md` — **[Day 3 DONE]** Single coherent sharpened spec combining Gates 1 & 2 + Q1–Q4. Day-3 lock candidate.
- `day4-dm-drafts.md` — **[Day 3 DONE]** 6 discovery DMs. Decided OFF-TABLE for this sprint (per Day-4 mission brief).
- `agenttrust-reframe-draft.md` — **[Day 4 DONE — Phase 2]** DRAFT reframed AgentTrust spec consuming Solana Agent Registry identity + reputation; ships PolicyVault + TrustGate x402 + ValidationRegistry as 3 components in single submission. Not a sharpened spec — input to Phase-3 decision.
- `agenttrust-reframe-decision.md` — **[Day 4 DONE — Phase 3]** Single-question decision doc: *"is reframed AgentTrust meaningfully distinct from AgentSafe Hooks?"* **OUTCOME: DISTINCT.** All three criteria met; reverse-mapping problem is the load-bearing structural moat. Two caveats: pitch must support "stackable defense-in-depth" not "either-or"; Foundation/Quantu dependency-risk is real but mitigatable via MIT-license-survivability.
- `agenttrust-other-leads.md` — **[Day 4 DONE — bonus]** Six leads ranked: A) standalone Validation Registry (sleeper), B) AgentSafe + 8004-read identity-gate (highest-leverage enrichment), C) AgentSafe + ValidationRegistry dual-bundle, D) AgentTrust-reframe full path, E) cross-registry adapter (not recommended), F) AgentSafe pure Day-3 lock (conservative default).
- `THESIS_LOCK.md` — **[Day 5 owed]** Mohit reads AgentSafe-SHARPENED.md + agenttrust-reframe-draft.md + agenttrust-reframe-decision.md + agenttrust-other-leads.md + agent-registry-public-reception.md, then locks. Five clear options enumerated.

**File NOT produced today (intentional):** `AgentTrust-SHARPENED.md` — Phase-3 decision was DISTINCT but per the Day-4 mission brief STOP instruction, the full Q2–Q4 + buildability + SHARPENED refinement was NOT auto-continued. Mohit explicitly authorizes the next step Day 5.

## Day 4 outcome (2026-04-27)

**Reframe attempt complete; both theses sharpened to DRAFT depth (not full SHARPENED parity); lock decision pending Day-5.**

**Q1 finding (load-bearing):** Solana Agent Registry (Quantu Labs `8oo4dC4...` mainnet, ATOM Engine `AToMw53a...`) ships AgentTrust components 1 (Identity) + 2 (Reputation) — Foundation-endorsed at solana.com/agent-registry, MIT-licensed, 1,433 agents registered. AgentTrust raw spec compressed to 2 components (Policy + x402 mediation). User authorized Option B reframe — consume Agent Registry, ship PolicyVault + TrustGate + ValidationRegistry as the differentiated layer.

**Phase-3 verdict:** DISTINCT (architectural-layer + value-prop + structural-moat all pass; reverse-mapping problem is the load-bearing barrier preventing AgentSafe v1.1 from trivially absorbing the wedge).

**Wedge-defensibility caveat (from broader research):** AgentSafe Hooks holds an EMPTY wedge (verified 0 shippers in 4-day refresh); AgentTrust-reframe enters a CONTESTED wedge (KAMIYO building stake-backed escrows; SAEP shipped 10 Anchor programs as direct Frontier competitor 2026-04-21; Cascade Protocol shipping 30 SATI releases + x402 trust gating roadmap; Microsoft / Callipsos / AIVM / sekuire claiming "missing trust layer" off-Solana).

**Six-registry fragmentation finding:** Solana has 6+ competing agent identity registries (8004 / 014 / SATI / SAID / SAP / helixa). 8004-Solana is Foundation-endorsed but not ecosystem-dominant. PolicyVault would face an adoption-fragmentation problem the Phase-2 draft did not address.

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
