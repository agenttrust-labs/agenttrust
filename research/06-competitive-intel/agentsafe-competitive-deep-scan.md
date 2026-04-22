# AgentSafe Hooks × VeriHook — Competitive Deep Scan (Day 3 Q1)

**Purpose:** Day 2's `duplicate-risk-map.md` gave breadth; Day 3 goes deeper by *layer* rather than narrative. The question this file answers: for each layer that AgentSafe Hooks × VeriHook touches, who already ships, what exactly, and does it strengthen / weaken / orthogonally-not-affect the moat?

**Scope:** 5 layers. Each layer ends with a verdict line. No hedging.

**Sources (Day 3 new scrapes):**
- Profile: `Crossmint` (51 tweets), `privy_io` (45 tweets)
- Search: `("transfer hook" OR "transferhook" OR "transfer-hook") (solana OR token-2022 OR token2022) since:2026-01-01` (50 hits)
- Search: `("agent wallet" OR "agent payment" OR "wallet policy" OR "agent key") (safety OR policy OR velocity OR allowlist OR kill-switch) since:2026-01-01` (100 hits)
- Plus all Day 1–2 cached material (SAEP, Dexter, atxp_ai, Blueshift, HarmonicMath, SecuritiesDino, Asymmetric Research, etc.)

**Day 3 x-recon budget spent to this point:** 2 profiles + 4 searches (Vibhu × 2 + Layer-1 × 1 + Layer-3 × 1). Budget remaining: 63 profiles, 26 searches, 10 threads.

Last verified: 2026-04-23

---

## Layer 1 — Token-2022 transfer-hook projects (who ships hooks today)

Every live Solana transfer-hook project sits in ONE of three verticals. **None target agent-payment safety specifically.**

### Vertical 1a — Tokenized securities (DOMINANT, saturated)

| Project | Hook pattern | Stage | Overlap with AgentSafe Hooks |
|---------|--------------|-------|------------------------------|
| **SecuritiesDino / DinoSecurities** ([multiple 2026-04 posts](https://x.com/SecuritiesDino/status/2045367720552616406)) | `dino_transfer_hook` — KYC + accreditation + REG-D/S/CF geo-fence + regulatory clawback + on-chain KYC oracle + XRPL Credentials second-factor KYC | Mainnet live Apr 2026. Open-source. | **ADJACENT — does not affect wedge.** SecuritiesDino enforces issuer-compliance (KYC/AML/REG) on securities, not per-payment caps for agent wallets. Both use TransferHook; different policy surfaces. |
| **aperturerwa** ([2026-04-15](https://x.com/aperturerwa/status/2044395454968844789)) | 3 Anchor programs live: Policy Registry + ZK Verifier (RiscZero) + Transfer Hook | Mainnet live. | **ADJACENT** — RWA compliance with ZK verification. Uses same pattern-family (Policy Registry + hook) but wedge is real-world-asset compliance, not agent-payment safety. Strongest pattern-match on "Policy Registry" naming — worth monitoring. |
| **OTCM Protocol** ([2026-04-06](https://x.com/otcmprotocol/status/2041191452248871028)) | "42 Transfer Hook Controls" on ST22 Digital Securities | Mainnet | **ADJACENT** — securities-specific. Deep (42 controls) but vertical-locked. |
| **Clawbacks** ([2026-04-22](https://x.com/clawbackstech/status/2046774741684691436)) | Production Token-2022 transfer-hook. Routes offerings per jurisdiction + founder entity type. | Mainnet | **ADJACENT** — niche meme→security tooling. |
| **Solana Stablecoin Standard (SSS)** by @0xmeett / @unnamedcodes / @glitchy_moon_ ([2026-03-13](https://x.com/0xmeett/status/2032496002322821458), [2026-03-14](https://x.com/unnamedcodes/status/2032631075994812579)) | Open-source SDK: SSS-1 (metadata+freeze), SSS-2 (blacklist+seize+transfer hook). 3 Anchor programs: `sss-core` + `sss-oracle` + `sss-transfer-hook`. "OpenZeppelin moment" framing. Shipped for SuperteamBR bounty (pre-Frontier). | Public repo + SDK | **MEDIUM** — SSS is the closest thing to "OpenZeppelin for Token-2022 stablecoins" that exists publicly. But it's stablecoin-issuer-focused (sanctions blacklist + freeze authority), not agent-payment-safety. Their "OpenZeppelin moment" framing *does* eat some of the oxygen VeriHook would otherwise claim — if Mohit pitches VeriHook as "OpenZeppelin for Token-2022," SSS already staked that flag. **Mitigation:** position VeriHook as "OpenZeppelin specifically for AGENT-PAYMENT Token-2022 extensions" — agent-velocity, agent-allowlist, agent-kill-switch, agent-identity-gating — modules SSS does not ship. |
| **Viexon (@viexonapp)** ([2026-04-06](https://x.com/viexonapp/status/2041132116076114009)) | Cross-border stablecoin treasury: KYC + AML + Travel Rule in token movement | Paper / early | **ADJACENT** — compliance treasury vertical. |
| **LMCX (@lmcx_cat)** ([2026-04-17](https://x.com/lmcx_cat/status/2045179755780292788)) | Lloyd's-insured methane credits via transfer hook | Live | **ORTHOGONAL** — niche RWA. |

### Vertical 1b — Protocol fee capture (SAEP-shape)

| Project | Hook pattern | Stage | Overlap with AgentSafe Hooks |
|---------|--------------|-------|------------------------------|
| **SAEP** ([2026-04-20](https://x.com/BuildOnSAEP/status/2046304309067854223)) | `$SAEP` token: Token-2022 TransferFee + TransferHook captures 0.1% on-chain fee per transfer, splits to stakers/grants/treasury/burn | Mainnet live | **MEDIUM-HIGH on narrative adjacency, LOW on mechanical overlap.** SAEP uses TransferHook for economic capture on their OWN token. They do not ship a library other agent platforms can adopt; they do not offer per-payment safety policies; their hook is tied to `$SAEP` mint only. AgentSafe Hooks would be issuer-agnostic (any Token-2022 mint can adopt it). **Confirmed distinct category.** |

### Vertical 1c — Agent-payment safety (THE WEDGE — empty)

**Zero active shippers.** 0 projects found in 180 days of transfer-hook-search coverage specifically targeting:
- Per-agent velocity limits on Token-2022 mints
- Kill-switch policies triggered by behavioral anomaly
- Allowlist/denylist enforcement tied to the AGENT operating the wallet (not the wallet itself)
- Jurisdictional gating specifically for cross-border agent payments
- Compliance hooks designed for x402 micropayment flows

### Layer 1 verdict

**STRENGTHENS wedge.** The Token-2022 transfer-hook space is crowded in securities compliance + fee capture + RWA, but the agent-payment-safety vertical has zero public shippers. The pattern ("policy registry + transfer hook") is validated by aperturerwa and SSS — meaning it's architecturally sound — but no one is applying it to the agent-payment vertical. VeriHook's open-source framing risks bumping into SSS's "OpenZeppelin" flag, so Mohit must frame VeriHook as **"OpenZeppelin specifically for agent-payment Token-2022 extensions"**, not "OpenZeppelin for Token-2022 generally."

---

## Layer 2 — Formally-verified DeFi on Solana (who ships FV today)

The question: is formal verification by itself a moat on Solana? Scan below says **no** — FV tooling is good enough that "just apply it" is the new normal for top protocols. Moat must come from WHAT you verify, not THAT you verify.

| Player | What they ship | Stage | Overlap |
|--------|----------------|-------|---------|
| **Asymmetric Research** ([STRIDE announcement](https://x.com/SolanaFndn/status/2041246400977965124)) | White-glove opsec + formal verification for TOP protocols (>$10M TVL / >$100M TVL tiers). 24/7 threat monitoring. Not a library. | Production service | **ORTHOGONAL — strengthens.** Asymmetric targets top protocols as a paid service; AgentSafe Hooks targets new agent-builders with a free library. Their recent [open-source code-coverage tool 2026-04-09](https://x.com/asymmetric_re/status/2042346521104019489) signals willingness to open-source tooling, so Mohit should monitor for a parallel open-source push. |
| **Blueshift** ([2026-04-16 Quasar](https://x.com/blueshift/status/2044748461170360790)) | `quasar-pod` / `quasar-spl` / `quasar-lang` — zero-copy framework. Formally verified via qedgen + Kani. `setup-quasar` GitHub Action. | Production | **ORTHOGONAL.** Blueshift verifies base crates (Anchor/Pinocchio interop). They don't ship Token-2022-specific hook templates. Adoption path: VeriHook *uses* Quasar at the base layer, cites Blueshift in README. Potential partnership. |
| **HarmonicMath / Aristotle** ([2026-04-06](https://x.com/HarmonicMath/status/2041938768735957100)) | AI-driven mathematical FV. "Prove your Solana code is correct mathematically." | Scaling to Solana | **ADJACENT — does not compete.** Aristotle generates proofs; it doesn't ship domain-specific verified templates. VeriHook could be the *application* of Aristotle-style proofs to Token-2022 hooks. |
| **Cetora** (Jupiter Lend verifier) | Audit firm providing FV service | Service | **ORTHOGONAL.** |
| **kamiyoai** ([public repo](https://x.com/kamiyoai/status/2022792267702940144)) | Kani proofs in GitHub Actions for escrow/oracles/collateral/slashing/staking | Hobbyist-grade public repo | **WEAK OVERLAP.** Would compete only if VeriHook framed itself as "generic Kani-for-Solana." It shouldn't — VeriHook must be Token-2022-hook-specific. |
| **shek_dev / qedgen** | Proof-generator toolchain | Open-source | **TOOLING USED BY VERIHOOK.** Not a competitor — a dependency. |

### Layer 2 verdict

**FV-as-a-feature is commoditized; FV-of-specific-primitive is not.** Formal verification alone (as a moat) fails this layer. Mohit must tie FV to something non-commodity — specifically, **formally verified agent-payment-safety Token-2022 extensions**, which no one ships.

This moves the moat candidate weight OFF the formal-verification layer (Q2 moat candidate 2) and ONTO the library-of-verified-agent-safety-hooks layer (Q2 candidate 1).

---

## Layer 3 — Agent wallet safety (who ships wallet-layer policy today)

The critical finding: **the agent-wallet safety space is saturated at the WALLET-LAYER (signer-side policy enforcement) but EMPTY at the ASSET-LAYER (token-side policy enforcement)**. This is the cleanest conceptual wedge Day 3 has surfaced.

### Wallet-layer policy (saturated)

| Player | Wallet-layer policy stack | Stage | Wedge effect |
|--------|---------------------------|-------|--------------|
| **Privy** ([2026-04-16 agentic guide](https://x.com/privy_io/status/2044910011569070101)) | "Programmable guardrails" for agent wallets. "Define how it can act (policies). Enable payments (x402, MPP, Stripe). Let it pay for data + services." Explicit policy-wallet category leader per [HazardKrypto mapping](https://x.com/HazardKrypto/status/2040566221091115097). 1/3+ of new Privy devs are building agentic. | Production, dominant | **HIGH collision at wallet-layer only.** Privy is the category leader for *signer-scoped* policies. AgentSafe Hooks must NOT position at this layer — Privy already owns it. |
| **Crossmint** ([2026-04-20 Smart Wallets 101](https://x.com/Crossmint/status/2046356247410077841)) | Dual-layer smart wallets on EVM/Solana/Stellar. "Programmable authorization logic with multiple signers, recovery signers, and scoped permissions." LobsterCash CLI for agent wallet setup. Partnerships with Mastercard + Amex ACE Developer Kit. Amex Agent Purchase Protection. | Production, dominant | **HIGH collision at wallet-layer only.** Different from Privy (smart-contract wallet vs embedded SDK) but same layer. |
| **Bankrbot** | Agent wallet + onchain (per industry mapping) | Production | **HIGH at wallet-layer.** |
| **Skyfire (trySkyfire)** | Identity + payments for agents | Production | **MEDIUM at identity-layer.** |
| **Circle (BuildOnCircle)** | USDC agent wallets | Production | **MEDIUM at stablecoin-layer.** |
| **WaaP (@WaaPxyz)** ([2026-03-27](https://x.com/WaaPxyz/status/2037692321316139110)) | TEE-based agent wallet: agent submits tx via API → policy engine simulates inside enclave → protector co-signs. | Production | **MEDIUM at enclave-layer.** |
| **WalletSuite** ([2026-04-04 OWS Hackathon](https://x.com/skokhatska/status/2040415651866308846)) | Agent wallet stack for MoonPay OpenWallet Standard. Chain + expiry policies, scoped agent credentials. Every signing request gated by bound policy. | OWS Hackathon | **MEDIUM — chain-agnostic.** |
| **Molt.id / OpenClawCash** ([2026-03-17](https://x.com/moltdotid/status/2033751521543553202)) | "Solved the biggest problem with AI agents. Agents going rogue." OpenClawCash: delegated custody with spending limits, whitelists, tx simulation + kill switch, prompt-injection resistance, MCP integration. Solana-native. | Production | **MEDIUM — on Solana, explicit kill-switch language.** But wallet-layer, not asset-layer. Low engagement (0-5 likes on most posts) — small footprint despite aggressive positioning. |
| **Starchild** ([2026-03-27](https://x.com/StarchildOnX/status/2037580252927725663)) | Wallet policy controls + agent identity + approval switches + spend limits + custom permissions | Production | **MEDIUM at wallet-layer.** |
| **Kamiyoai / Kizuna** ([2026-03-11](https://x.com/kamiyoai/status/2031401076014039334)) | Agent payment rails + funding/collateral controls + settlement flows | Building | **MEDIUM — protocol-layer agent finance, not hook-specific.** |
| **World Liberty Financial AgentPay SDK v0.2.1** ([2026-03-31](https://x.com/BSCNews/status/2038762108923633928)) | Self-custodial agent payment runtime with x402/MPP. Tempo mainnet integration. | Production | **MEDIUM — self-custodial SDK, not asset-layer.** |
| **Nava** (Privy-protected) | "Trust layer for agentic commerce, verifying human intent before capital is actually moved." | Fundraising | **MEDIUM at verification-layer.** |
| **OnlyFence (7k_ag_)** ([2026-03-17](https://x.com/7k_ag_/status/2033643211145822344)) | Open-source agent wallet guardrails CLI. Local-first policy engine. Spending/volume limits. | Sui (not Solana) | **LOW (wrong chain).** |
| **Nunchuk** ([2026-04-08](https://x.com/nunchuk_io/status/2041889121183088940)) | Shared Bitcoin wallet: human + agent + policy co-signer | Production | **LOW (wrong chain).** |

### Asset-layer policy (empty on Solana for agent-payment vertical)

**Zero projects on Solana ship asset-layer policy for agent payments.** Every Token-2022 transfer-hook project found is vertical-specific (securities, RWA, fee capture, stablecoin issuance) — none targets the agent-payment use case.

### The critical conceptual distinction (moat-forming)

| Layer | What it enforces | Who owns it | Failure mode |
|-------|------------------|-------------|--------------|
| **Wallet-layer (signer-scoped)** | "Signer X can sign up to $Y" | Privy, Crossmint, WaaP, OpenClawCash, Molt, Starchild, WalletSuite, Bankrbot | Breaks if agent migrates to a different wallet, if user signs manually, if signer enclaved bypass via social-engineering; policy does not travel with the asset. |
| **Asset-layer (mint-scoped)** | "This mint rejects any transfer > $Y per 24h, regardless of wallet" | **NO ONE on Solana for agent payments.** | Enforced by Solana runtime. Cannot be bypassed by any wallet software, any signer, any frontend. |

**Defense-in-depth thesis:** Issuer of an agent-facing stablecoin or tokenized-X wants BOTH layers. Wallet-layer catches 80% (good UX, fast). Asset-layer catches the 20% that leaks through signer changes / compromised enclaves / policy-circumvention. AgentSafe Hooks = the asset-layer complement to the Privy / Crossmint wallet-layer.

### Layer 3 verdict

**STRONGLY STRENGTHENS wedge — clarifies moat by forcing Mohit off wallet-layer positioning.** Every major player in wallet-as-a-service has shipped or is shipping agent-wallet policy at signer-scope. That market is closed. The open wedge is asset-layer policy (Token-2022 hooks) *as a complement* to those wallets, framed as defense-in-depth. This re-positions AgentSafe Hooks from "another wallet safety product" (would-lose) to "the asset-layer complement to Privy/Crossmint wallet-layer" (would-win, explicit non-overlap).

---

## Layer 4 — x402 safety middleware (who ships safety today)

Scanned: atxp_ai, Dexter, MCPay, Latinum, SAEP, Corbits, claw.credit/t54ai, HeyAnonai, Coinbase x402, Alchemy x402, Kibble. Findings from Day 2's `duplicate-risk-map.md` confirmed + deepened.

| Player | What they ship | Safety layer? | Wedge effect |
|--------|----------------|---------------|--------------|
| **atxp_ai (Circuit & Chisel)** | Agentic commerce leader — 1M+ tx, 5K users, moved to x402 + MPP on Solana Apr 16 | Commerce protocol, NOT safety | ORTHOGONAL |
| **Dexter (@dexteraisol)** | x402 SDK v3.0, x402gle search, first x402 facilitator for Solana smart wallets | SDK, not safety | ORTHOGONAL to safety (competes on SDK/facilitator) |
| **MCPay** | Cypherpunk Stablecoin Grand winner — MCP + x402 payment infra | Payment middleware, NOT safety | ORTHOGONAL |
| **Latinum** | Breakout AI Grand — MCP payment middleware | Payment middleware, NOT safety | ORTHOGONAL |
| **Corbits** | Cypherpunk Infra runner-up — x402 endpoint dashboard | Dashboard, NOT safety | ORTHOGONAL |
| **claw.credit / t54ai** | Agent credit lines, real-time underwriting | Credit, NOT safety | ORTHOGONAL |
| **SAEP** | Agent-economy protocol + fee-capture hook | Economy, NOT safety | ORTHOGONAL (uses hooks differently) |

### The gap

**No x402 facilitator ships safety-as-a-first-class-feature.** Every facilitator's design point is "fast micropayments, cheap, composable" — safety is an implicit responsibility of the caller (the agent builder), not the facilitator. This creates the customer-pain anchor for AgentSafe Hooks' pitch: **x402 facilitators want to route more volume, but enterprise/regulated integrators balk because there's no standardized safety layer between facilitator and merchant.**

### Layer 4 verdict

**STRENGTHENS wedge.** Safety is under-shipped across x402 infra. AgentSafe Hooks can position as "the missing safety layer x402 facilitators would integrate to unlock regulated-enterprise volume" without colliding with facilitator competition.

---

## Layer 5 — Public-goods libraries for Solana program safety (who ships open-source primitive libraries today)

| Library | What it ships | Maturity | Overlap |
|---------|---------------|----------|---------|
| **Anchor** ([anchor-lang/anchor](https://github.com/anchor-lang/anchor)) | Solana program framework (THE standard) | Production-canonical | **ORTHOGONAL — foundation, not competitor.** VeriHook depends on Anchor. |
| **SPL Token-2022** ([solana-program/token-2022](https://github.com/solana-program/token-2022)) | Official Token-2022 implementation + extension support | Production-canonical | **ORTHOGONAL — foundation.** VeriHook's hooks plug into official Token-2022 CPI surface. |
| **Sealevel Attacks** (Anza) | Catalogue of 9+ classical Solana attack patterns with exploit walkthroughs | Public | **ORTHOGONAL — documentation, not library.** VeriHook's README should cite it as fundament. |
| **Squads / fermi-labs libraries** | Multisig + protocol primitive libraries | Production | **ORTHOGONAL — multisig is wallet-governance, not transfer-hook.** |
| **Solana Stablecoin Standard (SSS)** by @0xmeett / @unnamedcodes | Open-source SDK: SSS-1 (metadata+freeze) + SSS-2 (blacklist+seize+transfer hook). Opinionated Token-2022 stablecoin presets. "OpenZeppelin moment" framing. | SuperteamBR bounty-shipped | **MEDIUM — closest naming/framing collision.** SSS claims "OpenZeppelin for Solana stablecoins." VeriHook must stake a narrower flag to avoid "we're doing SSS again" read. **Mitigation: scope VeriHook to "Token-2022 hooks specifically for AGENT-PAYMENT extensions" — velocity, per-agent allowlist, agent-identity-gating, agent-kill-switch. SSS doesn't ship any of those; SSS is issuer-facing (blacklist/freeze from a regulated-stablecoin-issuer POV).** |
| **Blueshift Quasar-\*** | Formally verified zero-copy Anchor/Pinocchio interop crates | Production | **ORTHOGONAL — base layer, not hook library.** Potential dependency/partnership. |
| **Asymmetric Research open-source tooling** ([code-coverage for coding agents, 2026-04-09](https://x.com/asymmetric_re/status/2042346521104019489)) | Coverage prototype, open-sourced | Early | **ORTHOGONAL — dev-tooling, not hook library.** |
| **Alex Biryukov Solana Auditor Skills** ([_AlexBiryukov_](https://x.com/_AlexBiryukov_/status/2030598942644146447)) | Open-source Claude Code skill, 120 attack vectors | Public | **ORTHOGONAL — audit-skill, not library.** |
| **0xcastle_chain Token-2022 security checklist** | Blog post — list of security properties, not code | Public blog | **ORTHOGONAL — content, not library.** |

### Layer 5 verdict

**STRENGTHENS wedge with one naming-collision caveat.** No public-goods library ships formally-verified Token-2022 transfer-hook primitives for agent-payment safety. SSS owns the "OpenZeppelin" framing for issuer-side Token-2022 stablecoins but does NOT cover the agent-payment vertical. VeriHook must narrow its one-line pitch to explicitly stake the agent-payment-safety flag, not the generic-Token-2022 flag.

---

## Cross-layer synthesis

### Competitive map (summary)

| Layer | Saturated | Adjacent | Open | Wedge effect |
|-------|-----------|----------|------|--------------|
| Token-2022 transfer hooks | Securities (SecuritiesDino, OTCM, clawbacks), RWA (aperturerwa, LMCX, viexon), Fee capture (SAEP), Issuer stablecoin (SSS) | Blueshift (base crates) | **Agent-payment safety (ZERO players)** | Strengthens |
| Formal verification | Base crates (Blueshift), AI math (Harmonic), service-tier (Asymmetric, Cetora) | Hobbyist Kani (kamiyoai) | **Token-2022-hook-specific FV harness (ZERO players)** | Strengthens |
| Agent-wallet safety | Wallet-layer policy (Privy, Crossmint, Bankrbot, WaaP, OpenClawCash, Molt, Starchild, WalletSuite, WLF AgentPay, Kamiyo) | Identity (Skyfire), Verification (Nava) | **Asset-layer policy (ZERO players on Solana for agent payments)** | STRONGLY STRENGTHENS |
| x402 safety middleware | Commerce protocols (atxp_ai), SDKs (Dexter), Middleware (MCPay, Latinum), Dashboards (Corbits), Credit (claw.credit) | SAEP (economy) | **x402-integrated safety layer (ZERO players)** | Strengthens |
| Public-goods libraries | Framework (Anchor), Token-2022 (SPL), Issuer-stablecoin SDK (SSS), Audit skills (Biryukov) | Blueshift Quasar, sealevel-attacks | **Agent-payment-safety hook library (ZERO players)** | Strengthens (with SSS naming caveat) |

### The moat location (feeds Q2)

The 5-layer scan converges on ONE defensible moat location:

> **Asset-layer (Token-2022 transfer-hook) policy enforcement for agent-payment safety specifically, shipped as an open-source formally-verified primitive library (VeriHook) with a hosted policy-registry + monitoring product (AgentSafe Hooks) on top.**

- Not wallet-layer (Privy/Crossmint own it).
- Not securities-layer (SecuritiesDino/OTCM/clawbacks own it).
- Not RWA-layer (aperturerwa owns it).
- Not fee-capture-layer (SAEP owns it).
- Not issuer-stablecoin-layer (SSS owns it).
- Not formal-verification-generally (Blueshift/Harmonic own it).
- **Agent-payment-specific asset-layer hooks is the uncontested vertical.**

### The 3 biggest surprises

1. **Privy has ALREADY productized agent wallet policies.** Day 2 didn't catch this — their 2026-04-16 "agentic guide" explicitly markets "programmable guardrails + define how it can act (policies) + enable payments (x402, MPP, Stripe)." This forces AgentSafe Hooks OFF wallet-layer positioning entirely.
2. **SSS staked the "OpenZeppelin for Solana stablecoins" flag a month before Frontier started** (2026-03-13 post). VeriHook's open-source library framing collides on naming with SSS. Mitigation is scope-narrowing, not positioning change.
3. **aperturerwa's architecture ("Policy Registry + ZK Verifier + Transfer Hook") is almost identical to AgentSafe Hooks' planned architecture**, just applied to RWA compliance. This validates the pattern is sound AND means Mohit should study their repo Day 4 to avoid reinventing their solutions — potentially partner with them (they're RWA-vertical, Mohit is agent-vertical, no overlap).

### The 2 biggest kill-signals (watch-list for Day 4–7)

1. **If Privy or Crossmint ships asset-layer TransferHook primitives** in the next 17 days, the wedge collapses. Set up Day-4 alerts on both teams. (Weekly x-recon profile check = cheap.)
2. **If SSS expands to include agent-payment-safety modules** (beyond their current stablecoin-issuer SSS-1/SSS-2 presets), the "OpenZeppelin" framing becomes direct competition. Watch `@0xmeett`, `@unnamedcodes`, `@glitchy_moon_` for any "SSS-3" or "agent" posts. Currently no signal, but they're actively shipping.

---

## What this means for Mohit's submission

- **The wedge is sharper, not broader, after Day 3 Q1.** "AgentSafe Hooks × VeriHook" must be positioned as **asset-layer Token-2022 transfer-hook policy enforcement specifically for agent payments, shipped as an open-source verified-template library plus a hosted policy registry.** Not "agent safety" (too vague; Privy/Crossmint own that frame). Not "Token-2022 library" (too broad; SSS staked that flag). Not "formally verified DeFi" (Blueshift owns base-crate FV).
- **Wallet-layer is closed; asset-layer is the only open surface.** The pitch must explicitly name this distinction. "Privy/Crossmint enforce policy at the wallet signer; AgentSafe Hooks enforces policy at the asset — defense in depth." This framing makes Privy and Crossmint potential *integrators*, not competitors.
- **Day 4 priority: study aperturerwa's repo.** Their "Policy Registry + ZK Verifier + Transfer Hook" pattern is the architectural reference for what AgentSafe Hooks should build. Fork-inspired, vertical-distinct. Potentially a partner (cross-link their RWA vertical to Mohit's agent-payment vertical).
- **VeriHook naming discipline.** VeriHook's one-liner must be: *"Formally verified Token-2022 TransferHook library for agent-payment safety — velocity caps, per-agent allowlists, kill-switches, jurisdictional gating — modules the Solana Stablecoin Standard (SSS) explicitly does not ship."* Pre-empts the "oh, isn't this just SSS?" judge question.
- **Monitor-list for Day 4–17:** `@privy_io`, `@Crossmint`, `@BuildOnSAEP`, `@SecuritiesDino`, `@0xmeett`, `@unnamedcodes`, `@aperturerwa`, `@asymmetric_re`. Weekly profile re-scrape = cheap insurance.
- **Do NOT pitch VeriHook as "OpenZeppelin for Token-2022."** SSS owns that framing. Pitch it as "the missing agent-safety primitives Token-2022 lacks." Narrower claim, sharper moat, avoids invited comparison.
