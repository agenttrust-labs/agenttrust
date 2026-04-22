# 06-competitive-intel/

**Purpose:** Kill duplicate ideas before wasting a week. Layer-by-layer competitive scan feeds 00-thesis.

## Files
- `duplicate-risk-map.md` — **[Day 2 DONE]** 12 Frontier-cycle shippers + dominant players per narrative (5 narratives covered). AgentSafe Hooks wedge confirmed open at (c)×(d)×(e) intersection.
- `agentsafe-competitive-deep-scan.md` — **[Day 3 DONE]** 5-layer deep scan: Token-2022 transfer hooks, formally-verified DeFi, agent-wallet safety, x402 safety middleware, public-goods libraries. **Key findings:**
  1. Asset-layer (mint-scoped) hook policy enforcement for agent payments = ZERO active shippers on Solana.
  2. Wallet-layer (signer-scoped) policy = saturated (Privy, Crossmint, Bankrbot, OpenClawCash, WaaP, WalletSuite, Starchild, Kamiyo, WLF AgentPay).
  3. SSS (Solana Stablecoin Standard) staked "OpenZeppelin for Solana stablecoins" flag in March 2026 — VeriHook must narrow to "agent-payment hooks" to avoid collision.
  4. aperturerwa's RWA architecture (Policy Registry + ZK Verifier + Transfer Hook) is near-identical to AgentSafe Hooks' plan, vertical-distinct (RWA vs agent-payment) — study their repo Day 4.
  5. Asymmetric Research open-sourced a coverage tool April 9; monitor for parallel open-source push into hook territory.

## Files NOT created (intentionally)
- `github-active-projects.md` — duplicate-risk-map.md + agentsafe-competitive-deep-scan.md together cover shipping-builder intel.
- `twitter-builder-watch.md` — folded into the two scan files above.

## Competitor monitor-list (Day 4 onward, weekly re-scrape)
- `@privy_io` — wallet-layer agent policy leader; watch for asset-layer expansion
- `@Crossmint` — wallet-layer agent policy + Amex/Mastercard partnerships; watch for asset-layer expansion
- `@BuildOnSAEP` — agent-economy protocol; watch for safety-specific hook library announcement
- `@SecuritiesDino` — vertical-locked in securities; low risk unless verticals expand
- `@0xmeett`, `@unnamedcodes`, `@glitchy_moon_` — SSS authors; watch for "SSS-3" or "agent" module announcements
- `@aperturerwa` — RWA Policy-Registry architecture; potential partner more than competitor
- `@asymmetric_re` — coverage-tool open-source push; watch for Token-2022-hook-specific FV tooling
- `@HarmonicMath` — AI-math FV; watch for Solana-Token-2022-vertical product

**Scan cadence:** weekly profile scrape cost = 8 profiles × ~20s each = 3 min of x-recon budget. Cheap insurance.
