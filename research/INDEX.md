# Colosseum Research Index

Last updated: **2026-04-23 (Day 3, session #3 complete)**
Days until submission: **18** (deadline 2026-05-11, June 23 winners announced)
Thesis status: **SHARPENED-NOT-YET-LOCKED** — Day 4 first action is Mohit reads `research/00-thesis/AgentSafe-SHARPENED.md` and locks.

## Current thesis (sharpened on Day 3, awaiting Day 4 lock)
**VeriHook** (open-source Apache 2.0 library, 6–8 formally-verified Token-2022 TransferHook modules for agent-payment safety) + **AgentSafe Hooks** (hosted policy-registry + monitoring layer on top, sold to x402 facilitators). Single submission, two layers, bundled for Standout + Public Goods tracks. Wedge: **asset-layer policy enforcement for agent payments** — defense-in-depth complement to wallet-layer (Privy/Crossmint). First buyer: **x402 facilitators, Dexter first**.

Day 3 sharpening diff (full: `research/00-thesis/AgentSafe-SHARPENED.md`): asset-layer-vs-wallet-layer distinction added; moat concentrated to hook library alone; first-buyer narrowed to x402 facilitators (was facilitators + agent devs); pitch opener settled on Vibhu 99.99% market-shape framing; 4 scope items cut (Phantom MCP, policy DSL, compliance stubs, full audit export).

## Day 4 first action for Mohit (sharp)

1. Read `research/00-thesis/AgentSafe-SHARPENED.md` cold. If no beat stumbles, write `THESIS_LOCK.md` + proceed to build-prep.
2. Review + personalize 3 DMs in `research/00-thesis/day4-dm-drafts.md` (Dexter, atxp_ai, MCPay) and send before noon.
3. Scaffold `/verihook/` Cargo crate with 6 module stubs + Kani harness structure.

## Open questions blocking Day 4 lock (survived Day 3 sharpening)

1. **Module count (6 hard vs 6+2 stretch)** — Day 3 recommends 6+2 stretch; Mohit picks on Day 4 based on velocity self-assessment.
2. **Mainnet vs devnet ship target at submission** — Day 2 locked devnet; no Day-3 reason to re-open unless mainnet is cheap.
3. **Recruit non-technical Superteam India co-founder for video/pitch Days 4–7?** — Day 2 flagged; Day 3 defers to Day 4 Mohit.
4. **DM-response pivot thresholds** — 2 GREEN = proceed full scope; 0 GREEN + 4 YELLOW = wedge re-sharpen; 3+ RED = Day-10 pivot conversation.

## Directory map
- `00-thesis/` — **8 files**: ideas-longlist, ideas-shortlist (Day 2) + agentsafe-moat-analysis, agentsafe-first-buyer, agentsafe-pitch-compression, AgentSafe-SHARPENED, day4-dm-drafts (Day 3). THESIS_LOCK.md pending Day 4.
- `01-hackathon-mechanics/` — rules-and-prizes.md (Day 1+3) + judges-and-bias.md (Day 1+2+3). Gate 2 confirmation in rules §10; Gate 1 confirmation in judges §5c.
- `02-past-winners/` — grand-champions.md + post-mortem-patterns.md (Day 1). No Day 3 changes.
- `03-ecosystem-narratives/` — narrative-momentum.md (Day 2). No Day 3 changes.
- `04-sponsor-deep-dives/` — pending. Lower priority now that thesis is sharpened (sponsor integration = Day 10+ if relevant).
- `05-grants-and-money/` — active-capital-Q2-2026.md (Day 2). No Day 3 changes.
- `06-competitive-intel/` — **2 files**: duplicate-risk-map (Day 2) + agentsafe-competitive-deep-scan (Day 3 layer-by-layer scan).
- `07-build-prep/` — pending Day 4.

## Most recent files (reverse-chrono, top 10)
- `research/00-thesis/AgentSafe-SHARPENED.md` — Day 3 single-source-of-truth sharpened spec
- `research/00-thesis/day4-dm-drafts.md` — 6 discovery DMs (Dexter, atxp_ai, MCPay, SAEP, Latinum, Corbits)
- `research/00-thesis/agentsafe-pitch-compression.md` — 2 pitch variants, banned-word-tested, Variant B primary
- `research/00-thesis/agentsafe-first-buyer.md` — x402 facilitators, Dexter first
- `research/00-thesis/agentsafe-moat-analysis.md` — 4-candidate moat analysis, picked hook library (A) alone
- `research/06-competitive-intel/agentsafe-competitive-deep-scan.md` — 5-layer scan, asset-layer-vs-wallet-layer moat location
- `research/01-hackathon-mechanics/rules-and-prizes.md` — updated §10 Public Goods bundling rules
- `research/01-hackathon-mechanics/judges-and-bias.md` — updated §5c Vibhu pressure-test
- `research/00-thesis/ideas-shortlist.md` (Day 2) — 5-scored shortlist, AgentSafe Hooks 55/60
- `research/06-competitive-intel/duplicate-risk-map.md` (Day 2) — 5-narrative competitor catalogue

## Kill-list (active)
- NFT PFP / generative art collections
- Memecoin launchpads as primary
- Solana-vs-Ethereum-L2 takes
- Generic "Web3 social" without wedge
- 2021–2022 narratives (P2E, metaverse, DAO-tooling-for-DAOs)
- Cross-chain bridges ([Matty 2026-04-20](https://x.com/mattytay/status/2046021326683734378))
- Vague "AI + crypto" agent slop (the AI-rails narrative is fine, vague-agent slop is not)
- Gaming, consumer-UX-heavy, pure DePIN — solo handicap per File 4
- Pure perp DEX clone of Drift/Hyperliquid — judge saturation
- Pure security audit tool (closest competitor: Alex Biryukov Solana Auditor Skills + STRIDE)
- Pure unified-liquidity aggregator (5+ Frontier competitors + Jupiter dominance)
- Tokenized-securities full stack (SecuritiesDino owns)
- **[Day 3] Wallet-layer agent-wallet policy API** (Privy/Crossmint saturate the category; Day 3 Q1 confirmed)
- **[Day 3] "OpenZeppelin for Token-2022" generic framing** (SSS staked that flag March 2026; must narrow to "for agent-payment safety")
- **[Day 3] "Formally verified DeFi" as standalone moat** (commoditized by Blueshift/HarmonicMath/Asymmetric/Cetora; FV is a feature not a moat)

## Binding constraints (Day 1 + Day 2 + Day 3)
- Vertical: infra primitive / DeFi primitive / stablecoin infra / privacy-security primitive
- Narrative intersection: (c) formally verified DeFi precision × (e) Token-2022 programmable transfers — primary; (d) AI-agents-using-crypto-rails — amplifier
- Target Standout top-20 + accelerator interview (+ Public Goods $10K plausible), not Grand
- Solo-buildable in 15 working days, devnet at submission acceptable
- Security posture = 30-sec segment in technical demo (non-negotiable)
- Project X account + user conversation evidence by Day 5
- Co-founder available for non-technical only (video/ops/pitch)
- Novel protocol layer required — no wrappers
- Must pass Matty accelerator filter (venture-scale, not hobby)
- **[Day 3] Wedge MUST be asset-layer (mint-scoped), not wallet-layer (signer-scoped)** — wallet-layer is Privy/Crossmint territory
- **[Day 3] Must NOT frame as "OpenZeppelin for Token-2022"** — SSS owns that. Frame as "formally-verified agent-payment hooks."
- **[Day 3] Bundled submission mandatory** per Rules §7 (one project per team). VeriHook is the library layer inside the AgentSafe Hooks submission — not a separate project.

## x-recon budget tracking (Day 3)

| Resource | Day 1 used | Day 2 used | Day 3 used | Day 3 remaining | 20-day cap |
|----------|-----------|-----------|-----------|-----------------|-----------|
| Profile scrapes | 8 | 11 (incl. Vibhu, SolanaFndn, asymmetric_re, austin_federa, level941, SecuritiesDino, atxp_ai, BuildOnSAEP, dexteraisol, blueshift, HarmonicMath) | **2** (Crossmint, privy_io) | 63 | ~50 (self-imposed) |
| Searches | 8 | 15 | **4** (Vibhu-latest, Vibhu-top, Vibhu-older, transfer-hook, agent-wallet-safety) | 26 | ~30 (self-imposed) |
| Threads | 0 | 0 | 0 | 10 | ~10 |

Day 3 spend well under budget.

## Session log
- **2026-04-21 session #1 (Day 1)** — Schema + 4 files + 8 profiles + 8 searches.
- **2026-04-22 session #2 (Day 2)** — 4 synthesis files + longlist + shortlist. 11 profiles + 15 searches.
- **2026-04-23 session #3 (Day 3)** — SHARPENING session. 2 Gates cleared (Vibhu = GREEN, Public Goods bundling = ALLOWED) + 4 Questions answered (Q1 deep scan + Q2 moat + Q3 first buyer + Q4 pitch) + single-source-of-truth AgentSafe-SHARPENED.md + 6-DM Day-4 outreach drafts. 2 profiles + 4 searches. Ready for Day 4 lock.
