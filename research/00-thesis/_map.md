# 00-thesis/

**Purpose:** Convergence funnel. Everything in 01–06 feeds here. Day 3 sharpened; THESIS_LOCK.md still pending Day 4 Mohit-read.

## Files
- `ideas-longlist.md` — **[Day 2 DONE]** 13 candidates, all in (c)×(e) intersection. 9 ideas eliminated against constraints (recorded for transparency).
- `ideas-shortlist.md` — **[Day 2 DONE]** Top 5 scored on 6-axis rubric + Matty-accelerator filter. Winner: AgentSafe Hooks (55/60, Matty: YES) bundled with VeriHook (51/60) as open-source layer.
- `agentsafe-competitive-deep-scan.md` — **[Day 3 DONE — this file lives in 06]** Pointer: `research/06-competitive-intel/agentsafe-competitive-deep-scan.md`. 5-layer competitive scan. Asset-layer-vs-wallet-layer distinction surfaced as key moat location.
- `agentsafe-moat-analysis.md` — **[Day 3 DONE]** 4-candidate moat analysis. Picked A (hook library) as sole moat; B/C/D demoted to features. Cut Phantom MCP + policy DSL + compliance-vendor stubs from v1 scope.
- `agentsafe-first-buyer.md` — **[Day 3 DONE]** 4-segment first-buyer analysis. Picked x402 facilitators (Dexter first), with agent devs as amplifier + wallets as Phase-2 integrators + DeFi as Phase-3.
- `agentsafe-pitch-compression.md` — **[Day 3 DONE]** 2 pitch variants tested against banned-word rule. Primary: Variant B (market-shape, cites Vibhu 99.99% claim) for pitch video; Variant A (concrete-failure, $47K StableShield) for technical demo video.
- `AgentSafe-SHARPENED.md` — **[Day 3 DONE]** Single coherent sharpened spec combining Gates 1 & 2 + Q1–Q4. Single source of truth for Day 4 Mohit-read.
- `day4-dm-drafts.md` — **[Day 3 DONE]** 6 discovery DMs drafted for Dexter / atxp_ai / MCPay / SAEP / Latinum / Corbits. Mohit reviews + personalizes + sends Day 4–6.
- `THESIS_LOCK.md` — **[Day 4 owed]** FINAL DECISION. Mohit reads AgentSafe-SHARPENED.md with rested brain + writes THESIS_LOCK.md with one-sentence pitch + 3 runner-ups (ranked, kill reasons) + judge-perspective argument + 3 highest-risk assumptions.

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
