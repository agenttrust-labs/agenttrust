# Duplicate Risk Map — Who's Shipping What Right Now

**Purpose:** For each of the 5 live narratives, list active shippers, what they do precisely, stage, and whether they collide with Mohit's candidate thesis directions. The goal is to protect the Day-3 thesis lock from being a duplicate of something already mainnet-live.

**Scope:** Limited to projects with last-30-day activity per x-recon. Dormant-for-90d projects excluded unless they are Colosseum cycle winners still relevant.

**Primary sources:** x-recon profile scrapes of `BuildOnSAEP`, `dexteraisol`, `blueshift`, `HarmonicMath`, `atxp_ai`, `SecuritiesDino`, `level941`, `asymmetric_re`; x-recon searches for Frontier builders shipping (2026-04-06 onward); Day 1 grand-champions.md winner catalogue.

Last verified: 2026-04-21

---

## Direct Frontier collision matrix (high-priority)

Frontier hackathon submissions that are **already shipping in Mohit's candidate verticals**. These are the direct competitive set.

| Project | Vertical | Stage | Wedge | Collision for Mohit |
|---------|----------|-------|-------|---------------------|
| **SAEP** ([@BuildOnSAEP](https://x.com/BuildOnSAEP/status/2046692722023760338)) | Agent economy + Token-2022 | **Mainnet** (deployed 2026-04-21) | 6 Anchor programs: AgentRegistry, CapabilityRegistry, TaskMarket with x402 gateway, VRF dispute arbitration, streaming payments, Token-2022 TransferHook fee capture | **HIGH** on (d)×(e) agent-Token-2022 direct. Mohit's wedge must be specifically-safety/compliance or specifically-DevEx-SDK, NOT "agent economy protocol." |
| **Darkdrop** ([HitmanNoLimit](https://x.com/HitmanNoLimit/status/2045117008807895494)) | Privacy payments | Devnet (200+ txns, targeting mainnet pre-May 11) | Privacy deposit + relayer flow | MEDIUM on privacy primitives (narrative a). Low on (c)(e). |
| **Soqucoin/Soqushield** ([DaveDMOR](https://x.com/DaveDMOR/status/2046074730352926864)) | Post-quantum custody | Devnet | Bridge Solana ↔ Soqucoin custody | Low. Quantum-custody is a bridge-adjacent play; Matty's "bridges don't exist" disqualifies it anyway. |
| **StreamLock** ([@streamlockfun](https://x.com/streamlockfun/status/2043634265397805176)) | LP/vesting infra + World ID | Devnet → mainnet | LP zap-in, vesting via locksmith_master, Operator API, World ID integration | Low on (c)(d)(e). Touches liquidity infra (b). |
| **uLendMe** ([@bearonionlol](https://x.com/bearonionlol/status/2044119315247473131)) | Lending super-app | Devnet | Reputation Score NFT for undercollateralized borrowing | Low on Mohit's picks. Pure lending product. |
| **Wait a Minute** ([MoonsurferG](https://x.com/MoonsurferG/status/2042570532533498318)) | Priority-fee UX primitive | Devnet | Delay non-urgent txns + earn 30% priority-fee rebate, Solflare integration | Low on (c)(e). Infra UX primitive. |
| **Pollinet** ([@sol_pollinet](https://x.com/sol_pollinet/status/2046581582660558980)) | Mesh payments | Mainnet (Guava × Pollinet USDC transfer live) | Off-grid mesh payments | Low on Mohit's picks. |
| **Crewboard** ([germanarc1](https://x.com/germanarc1/status/2041258298070946152)) | Freelance escrow marketplace | Devnet | Real-escrow smart contract marketplace | Low. Consumer product with escrow backend. |
| **Zaebis** ([CryptoKostyan references](https://x.com/CryptoKostyan/status/2042777803821916490)) | High-frequency prediction | Devnet | Prediction market engine | Low. Consumer. |
| **ForgeFi** ([VishantJadhav7](https://x.com/VishantJadhav7/status/2046447683905425517)) | Proof of Workout | Devnet | Stake SOL, lose if miss gym, squad vaults | Low. Consumer gimmick (kill-list-adjacent). |
| **MardiPay** ([MardiPaydotin](https://x.com/MardiPaydotin/status/2042945859848192306)) | Multi-wallet payments app | Devnet | Multi-wallet + split + charts + yield (simulated) | Low. Consumer app. |
| **Opsonchain** ([opsonchain](https://x.com/opsonchain/status/2046227638008545687)) | Unclear ("mainnet before Frontier submission") | Pre-mainnet | Unclear | Flag for Day 3 re-check |

---

## Narrative (a) — Security-first architecture

### Dominant Players

| Player | What they do | Stage | Mohit-relevance |
|--------|--------------|-------|-----------------|
| **Asymmetric Research** ([@asymmetric_re](https://x.com/asymmetric_re/status/2041246801328795748)) | STRIDE program with Solana Foundation; protocols >$10M TVL get opsec reviews + 24/7 monitoring + formal verification >$100M TVL | Production | Competes at institutional tier only. Solo cannot match. |
| **Unruggable** | Hardware wallet + companion — Cypherpunk Grand Champion, now Cohort 4 accelerator | Production | HW wallet wedge is closed. |
| **Cloak** | Privacy payments — Cypherpunk Stablecoin Track, Cohort 4 | Production | Privacy-payment wedge saturated. |
| **Vanish** | Private swaps Solana-native ~200ms — Breakout DeFi Track | Mainnet, now Frontier sponsor | Private-swap wedge saturated. Vanish is a sponsor you compose with, not compete. |
| **Alex Biryukov Solana Auditor Skills** ([@_AlexBiryukov_](https://x.com/_AlexBiryukov_/status/2030598942644146447)) | Open-source Claude Code skill with 120 attack vectors | Public | **Closest competitor to security-tool-for-builders wedge.** If Mohit went security-audit-tool, he'd compete against this. |
| **0xcastle_chain** ([@0xcastle_chain](https://x.com/0xcastle_chain/status/2031497044775366770)) | Token-2022 security checklist (not a tool, just a list) | Blog post | Open gap: turn his checklist into a tool. |
| **HalbornSecurity SSTS** | Solana Security Token Standard (Token-2022 extensions for compliant security tokens) | Spec, implementing | Overlaps (e) Token-2022 space. |

### Wedges still open for solo
1. Sub-$10M-TVL protocol defense tooling (STRIDE only covers top tier)
2. Wallet-layer opsec UX primitives (HW wallet closed, but software-layer is open: key rotation, transaction-warning middleware, signing-device UX)
3. Builder-side dev tools: fuzz harnesses specific to Solana, invariant generators, Token-2022-extension security linter

### Verdict: Mohit should NOT make (a) the primary. Close gaps exist but all overlap with Token-2022 or formal-verification — so they're really (a)×(e) or (c)×(e) plays.

---

## Narrative (b) — Unified liquidity / Solana-as-trading-venue

### Dominant Players

| Player | What they do | Stage | Mohit-relevance |
|--------|--------------|-------|-----------------|
| **Jupiter / JupiterExchange** | DEX aggregator, router, MCP integrations | Production | Meta-aggregator wedge closed. |
| **EuclidProtocol** ([@EuclidProtocol](https://x.com/EuclidProtocol/status/2045487600203628894)) | 40+ chains in one liquidity layer, <200ms | Production | Cross-chain unified liquidity wedge closed (and bridge-adjacent — Matty's explicit kill-list). |
| **FabriqTrade** ([@SuperteamCAN 2026-04-17](https://x.com/SuperteamCAN/status/2045263002341921233)) | Unified liquidity platform on Solana, Frontier hackathon builder | Devnet | Direct Frontier collision for liquidity-platform wedge. |
| **RiverdotInc** (charlesace_) | Unified liquidity engine (satUSD + layers) | Production | EVM-centric, low direct collision. |
| **Reflect** | Hedge-backed stablecoins, Radar Grand → Frontier sponsor | Production, sponsor | Stablecoin primitive wedge taken. |
| **Hylo, omnipair, Meteora, Phoenix** | Various DeFi venues | Production | Venue-level wedges closed. |

### Wedges still open for solo
- Programmable limits on USDC wrapper (Toly's explicit ask 2026-04-10) — but this is really Token-2022 (e) repackaged as "liquidity"
- None cleanly solo-defensible as primary

### Verdict: (b) is not solo-viable as primary. Confirmed.

---

## Narrative (c) — Formally verified DeFi precision

### Dominant Players

| Player | What they do | Stage | Mohit-relevance |
|--------|--------------|-------|-----------------|
| **Blueshift** ([@blueshift](https://x.com/blueshift/status/2044748461170360790)) — **lead by Dean M Little** | Quasar framework (quasar-pod/spl/lang). **Formally verified via qedgen+kani Apr 16.** Zero-Copy types portable across Pinocchio/Anchor. GitHub Action `setup-quasar` on marketplace. | Production, aggressive shipper | **HIGH collision** on framework-core formal verification. Blueshift owns the base-crate layer. |
| **HarmonicMath / Aristotle** ([@HarmonicMath](https://x.com/HarmonicMath/status/2041938768735957100)) | AI-driven mathematical formal verification "Prove your Solana code is correct mathematically." 91% of Erdős problem formalizations. Well-funded AI math company. | Production, scaling to Solana | **HIGH collision** on AI-driven proof generation. |
| **Cetora** (Jupiter Lend verifier) | Professional formal-verification auditor | Service | Audit-service wedge (not solo). |
| **Kamino** | Formally verified lending markets + $1.5M bug bounty + 18+ audits | Production | User of FV tools, not competitor. |
| **shek_dev** (qedgen author) | Proof-generator toolchain used by Blueshift | Open-source | Collaboration potential. Not Token-2022 specific. |
| **kamiyoai** ([@kamiyoai](https://x.com/kamiyoai/status/2022792267702940144)) | Kani proofs in GitHub Actions for escrow/oracles/collateral/slashing/staking | Public repo | Hobbyist shipper. Direct competitor if Mohit goes generic Kani-for-protocols wedge. |

### Wedges still open for solo
1. **Token-2022 extension verification templates (intersection with (e))** — Blueshift verifies its own crates, not Token-2022-specific templates. SecuritiesDino ships Token-2022 product, not reusable verified SDK. `shek_dev`'s qedgen is low-level proof generator, not Token-2022-specific. **Open wedge.**
2. Transfer-hook-specific verified harness
3. Property-based test framework integrating with Anchor's IDL + formal invariants — no direct player
4. Verified patterns for escrow, rate-limiting, access-control on Token-2022 extensions

### Verdict: (c) × (e) intersection is Mohit's strongest wedge.

---

## Narrative (d) — AI agents using crypto rails (x402 / MCP / agent wallets)

### Dominant Players (CROWDED)

| Player | What they do | Stage | Mohit-relevance |
|--------|--------------|-------|-----------------|
| **atxp_ai** (Circuit & Chisel) | 1M+ transactions, 5K users, top agentic-commerce leaderboard. Moved to x402 + MPP on Solana Apr 16. | Production dominant | Agent-commerce-protocol wedge closed. |
| **dexteraisol** ([@dexteraisol](https://x.com/dexteraisol/status/2044556775769190558)) | **Dexter x402 SDK v3.0**, x402gle search engine + payments protocol explorer, first x402 facilitator for Solana smart wallets (Squads/Crossmint/SWIG). Won Pump.fun hackathon. Aggressive SDK shipper. | Production | **HIGH collision** on x402 SDK/toolchain. |
| **MCPay** | Cypherpunk Stablecoin Grand — MCP + x402 payment infra | Production | Payment-middleware wedge closed. |
| **Latinum** | Breakout AI Grand — MCP payment middleware | Production | Payment-middleware wedge closed. |
| **Corbits** | Cypherpunk Infra runner-up — x402 endpoint dashboard | Production | Dashboard wedge closed. |
| **claw.credit / t54ai** | AI agent credit lines via x402, real-time underwriting Solana/XRPL/Base | Production | Credit-layer wedge closed. |
| **HeyAnonai / Kamino MCP** | Agent DeFi operations via MCP + x402 + ERC 8004 | Production | DeFi-agent-MCP wedge closed. |
| **CoinGecko x402 API** | Pay-per-use market data | Production | Infra integration. |
| **Alchemy x402** | Pay-per-use APIs | Production | Infra integration. |
| **Kibble** (jimchang) | Agent wallet funding UX "skill" | Claude Code skill | Narrow wedge. |
| **BuildOnSAEP** | Agent economy protocol, Token-2022 fee capture, mainnet as of 2026-04-21 | Production | **HIGH collision** on agent-economy-with-Token-2022. |

### Wedges still open for solo
1. **Token-2022 transfer-hook agent-safety layer** (velocity limits, whitelists, kill-switch, compliance for agent payments) — SAEP uses TransferHook for FEE CAPTURE, not safety. Open wedge for agent-payment safety as a reusable module.
2. **Agent wallet recovery / key rotation primitives** (narrative (a)×(d)) — unclear competitor
3. **Formally verified x402 facilitator** (c×d) — Dexter ships x402 SDK but not formally verified
4. **Rust-native x402 SDK** — most existing (Dexter v3 npm, CoinGecko, Alchemy) are TS/Python-weighted. A pure Rust/Anchor x402 SDK with Solana smart-wallet integration is open.

### Verdict: (d) alone is saturated. (d)×(e) with **agent-payment-safety specifically** is an open wedge. (d)×(c) with **formally verified x402 facilitator** is open but narrower.

---

## Narrative (e) — Token-2022 programmable transfers

### Dominant Players

| Player | What they do | Stage | Mohit-relevance |
|--------|--------------|-------|-----------------|
| **SecuritiesDino** ([@SecuritiesDino](https://x.com/SecuritiesDino/status/2045203246848131504)) | Compliant securities layer: Token-2022 Transfer Hooks + DvP atomic settlement + DAO governance + REG-D/S/CF. Tokenizing Equity/Debt/LLC/Fund. Open-source, launching Friday (Apr 2026). | Mainnet-imminent | **HIGH collision** on securities compliance wedge. Mohit's thesis must NOT be "tokenized equity/securities layer." |
| **BuildOnSAEP** | Token-2022 TransferHook for fee capture in agent economy | Mainnet | See (d) above. |
| **HalbornSecurity SSTS** | Solana Security Token Standard (using Token-2022 extensions) | Spec/integrating | Standards-level, not a tool. |
| **Clawbacks** ([@clawbackstech](https://x.com/clawbackstech/status/2045530468813299773)) | Meme → SEC-compliant equity via Token-2022 | Product | Niche (meme-to-equity). |
| **DAMM v2** ([@level941](https://x.com/level941/status/2031482613001589140)) | Permanent LP lock + native Token-2022 support in AMM | Production | AMM product; not SDK competitor. |
| **VectraFi** ([@vectrafinance](https://x.com/vectrafinance/status/2044085116880785805)) | Full-stack product: Rust + Anchor + formally verified + Token-2022 + AI agents + TEEs + Arweave storage | Building | **MEDIUM collision** if Mohit's thesis is "kitchen-sink formally-verified-plus-Token-2022." VectraFi covers that, but as a product (not SDK). Mohit's wedge: they ship a product; he should ship a reusable template SDK. |
| **Jupiter Lend** | Formally verified lending, Token-2022 support | Production | User, not competitor. |
| **0xcastle_chain** | Token-2022 security checklist (blog) | Blog | Open gap for tooling. |
| **b_migliaccio** | Building a crate for Token-2022 creation | Early / building in public | LOW competitor (hobbyist level, low engagement). |
| **level941** | Not shipping themselves, but vocal evangelist | Commentator | Endorser of the narrative. |

### Wedges still open for solo (highest priority for thesis lock)
1. **Formally verified Token-2022 extension templates** (pre-audited TransferHook patterns for common needs: velocity limits, allowlists, compliance gating, royalty enforcement). No direct shipper.
2. **Token-2022 SDK generator** — given a config, generate a custom Token-2022 mint with specified extensions, formally verified boilerplate. b_migliaccio is early on this.
3. **Agent-safety Token-2022 hooks** (see (d)×(e) above)
4. **Compliance-hook library** (pluggable KYC, sanctions, limits) as modules — not tied to a specific securities product like SecuritiesDino
5. **Token-2022 extension testing/simulation tool** — no direct shipper

### Verdict: (e) × (c) remains the strongest solo wedge. Specific framing: **"open-source, formally verified Token-2022 TransferHook template library with reference patterns + verification harness."**

---

## Meta-patterns across the map

- **~75% of Frontier shippers we catalogued are building consumer apps or DeFi products** — verticals Mohit is avoiding per Day-1 binding constraints. His competitive set is narrower than the raw hackathon size suggests.
- **~4 direct duplicate-risk competitors** sit in Mohit's candidate wedge intersections: SAEP (d×e), SecuritiesDino (e), Blueshift (c), HarmonicMath (c). All are product-shaped, not SDK-shaped — Mohit's "template/harness/SDK" framing differentiates cleanly from all four.
- **Prior-cycle winners frequently return as narrative anchors** (Vanish → Frontier sponsor; Reflect → Frontier sponsor; MCPay → agent-payment infra). Compose with them rather than compete against them.
- **Foundation-run programs are not duplicate risks** — STRIDE is not competitive with solo builder tooling; SIRN is incident response; SDP (Solana Developer Platform) is sponsor-level infrastructure.

---

## What this means for Mohit's submission

- **The (c)×(e) "formally verified Token-2022 TransferHook template library + verification harness" wedge has no direct shipper.** Blueshift owns quasar-core FV, SecuritiesDino owns tokenized-securities product, HarmonicMath owns AI-math FV — none of them ship a Token-2022-extension-template SDK. This is the cleanest open wedge surfaced by Day 2 research.
- **(d)×(e) "agent-payment-safety transfer-hook layer" is open but faces SAEP pressure.** SAEP uses TransferHooks for fee capture, not for safety/compliance of agent payments. If Mohit goes this direction, the pitch must emphasize "agent *safety* primitives" (velocity limits, allowlists, kill-switch, regulatory gating) — a product category SAEP does not claim.
- **Avoid security-tool direction as primary.** Alex Biryukov's open-source Solana Auditor Skills and STRIDE absorb the available oxygen.
- **Avoid unified-liquidity direction as primary.** 5+ direct Frontier-cycle competitors plus Jupiter dominance.
- **The 75-project Frontier-cycle duplicate scan is incomplete by nature** — x-recon captures loud builders. Mohit should run one final duplicate-risk pass on Day 3 morning before thesis lock to confirm no new shipper has claimed the specific wedge overnight.
- **Compose, don't compete.** Integrating Vanish Core API ($10K bounty) or Phantom Connect (Grand sponsor alignment) into the template SDK is zero-scope-addition and pulls multiple axes. The template itself remains Mohit's unique contribution; the integrations pull sponsor goodwill.
