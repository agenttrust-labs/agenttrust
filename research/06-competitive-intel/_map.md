# 06-competitive-intel/

**Purpose:** Kill duplicate ideas before wasting a week. Layer-by-layer competitive scan feeds 00-thesis.

## Files
- `duplicate-risk-map.md` — **[Day 2 DONE]** 12 Frontier-cycle shippers + dominant players per narrative.
- `agentsafe-competitive-deep-scan.md` — **[Day 3 DONE]** 5-layer deep scan; asset-layer Token-2022 hooks for agent payments confirmed empty wedge.
- `agent-registry-cpi-surface.md` — **[Day 4 DONE — Phase 1]** Technical reference for the Solana Agent Registry `agent-registry-8004` + atom-engine programs. AgentAccount + AtomStats PDAs are publicly readable; ATOM trust_tier (0–4) + risk_score + diversity_ratio cached + readable. MIT-licensed. Validation Registry archived in v0.5.0 ("planned for future upgrade"). 1,433 agents registered. **Reverse-mapping (wallet → agent) NOT a public PDA** — load-bearing finding for Phase-3 distinctness.
- `agent-registry-public-reception.md` — **[Day 4 DONE — bonus]** Public discourse synthesis: ERC-8004's "deliberately left open" gaps, the "missing trust layer" framing claimed by half a dozen TradFi/Web2 voices, the SIX-registry fragmentation reality on Solana (8004/014/SATI/SAID/SAP/helixa), KAMIYO building stake-backed escrows on top of registry, SAEP shipping 10-program full stack 2026-04-21 as direct Frontier competitor, Cascade Protocol's 30-release SATI ecosystem + x402 trust gating roadmap. **Conclusion: AgentSafe Hooks empty wedge robust; AgentTrust-reframe wedge contested.**
- `saep-deep-recon.md` — **[Day 4.5 DONE — Phase 0]** Full SAEP characterization: 10 Anchor programs (agent_registry/treasury_standard/task_market/proof_verifier/dispute_arbitration/governance/fee_collector/nxs_staking/capability_registry/template_registry), 7 specs read end-to-end, 60-day X timeline (58 tweets), GitHub repo (486 commits / 2 stars / Apache 2.0). Three TL;DR findings: (1) SAEP claims ZERO Foundation endorsement (sovereign positioning); (2) SAEP TreasuryStandard ships per-tx/daily/weekly limits + allowlists BUT all AGENT-SELF-spending — zero counterparty-aware gating; (3) SAEP is real-shipped-scope but near-zero adoption (2 GitHub stars / 500 X followers / 5 mainnet escrows). **8 specific divergence points** between AgentTrust and SAEP (Foundation-aligned vs sovereign / counterparty-aware vs self-spending / pre-flight gate vs post-work proof / permissionless attestors vs governance-curated / open primitive vs full-stack vertical / no-token vs $SAEP-economy / Solana-focused vs cross-chain / named technical wedge vs broad agent-economy). **5 specific risks** to AgentTrust strategy from SAEP (judge-pattern-match / faster-velocity-look-real / partnership-compression / Foundation-pivot / pre-existing-judge-priors) with mitigations.

## Files NOT created (intentionally)
- `github-active-projects.md` — duplicate-risk-map.md + agentsafe-competitive-deep-scan.md together cover shipping-builder intel.
- `twitter-builder-watch.md` — folded into the two scan files above.

## Competitor monitor-list (Day 4 onward, weekly re-scrape)
- `@privy_io` — wallet-layer agent policy leader; watch for asset-layer expansion
- `@Crossmint` — wallet-layer agent policy + Amex/Mastercard partnerships; watch for asset-layer expansion
- `@BuildOnSAEP` — **DIRECT competitor for AgentTrust path**; monitor every 3 days during Frontier for: Foundation endorsement announcement / x402 facilitator partnership announcement (Dexter/MCPay/Latinum/atxp_ai) / counterparty-aware policy v2 / Quantu Agent Registry adapter. Any of these = re-evaluation trigger for AgentTrust positioning.
- `@SecuritiesDino` — vertical-locked in securities; low risk unless verticals expand
- `@0xmeett`, `@unnamedcodes`, `@glitchy_moon_` — SSS authors; watch for "SSS-3" or "agent" module announcements
- `@aperturerwa` — RWA Policy-Registry architecture; potential partner more than competitor
- `@asymmetric_re` — coverage-tool open-source push; watch for Token-2022-hook-specific FV tooling
- `@HarmonicMath` — AI-math FV; watch for Solana-Token-2022-vertical product
- **[Day 4.5] `@kamiyoai`** — building stake-backed escrows + ZK-secured disputes on Solana Agent Registry. Adjacent to AgentTrust (escrow vs policy primitives). Monitor for ship-date + facilitator partnerships.
- **[Day 4.5] `@cascade_fyi`** — SATI + 30 releases + x402 trust gating planned. Monitor for x402 trust gate ship + facilitator partnerships.

**Scan cadence:** weekly profile scrape cost = 10 profiles × ~20s each = 4 min of x-recon budget. Cheap insurance. **BuildOnSAEP scrape every 3 days during Frontier window (Day 5-17) — higher cadence for the direct competitor.**
