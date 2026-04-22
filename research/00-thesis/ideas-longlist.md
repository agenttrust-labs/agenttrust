# Ideas Longlist — Constrained to (c)×(e), with (d) Amplification

**Constraint set (Day 1 + Day 2 binding):**
- Vertical: infra primitive / DeFi primitive / stablecoin infra / privacy-security primitive
- Narrative intersection: **(c) formally verified DeFi precision × (e) Token-2022 programmable transfers**, with **(d) AI-agents-using-crypto-rails** as optional amplifier
- Solo-buildable in 15 working days to credible v1
- Novel protocol layer (NOT a wrapper around existing infra)
- Passes Matty's accelerator filter (venture-scale, not hobby)
- No duplicate of catalogued shippers in [duplicate-risk-map.md](../06-competitive-intel/duplicate-risk-map.md)

**Methodology:** Each idea tagged with primary narrative + wedge + nearest existing shipper + why-novel.

Last verified: 2026-04-21

---

## 13 ideas, all in the c×e (and partially c×e×d) intersection

### 1. **AgentSafe Hooks** — Token-2022 transfer-hook safety layer for AI agent payments
- Narrative: (d) × (e) — primary; (c) — verification adds amplification
- Wedge: drop-in TransferHook modules for x402 facilitators / agent wallets that enforce velocity limits, counterparty allowlists, daily spend caps, panic kill-switch, jurisdictional gating, sanctions screening
- Nearest shipper: SAEP uses Token-2022 TransferHooks for *fee capture*, not safety/compliance. SecuritiesDino does securities compliance, not agent-payment safety.
- Why novel: no one currently treats agent-payment safety as a standalone reusable layer; every x402 facilitator (Dexter, MCPay, Latinum, atxp_ai) reinvents this if at all
- Composability: Phantom Connect agent wallets, Vanish private-swap rails, Helius RPC, x402 facilitator integrations
- Solo-buildability: high (one Anchor program + 5–8 hook modules + Kani proofs + integration tests)

### 2. **VeriHook** — Open-source formally verified Token-2022 TransferHook template library
- Narrative: (c) × (e) — primary
- Wedge: pre-built, kani-verified TransferHook patterns (velocity limits, allowlists, royalty enforcement, fee capture, KYC gating) shipped as a Cargo crate. Builders import the template, plug in config, deploy.
- Nearest shipper: Blueshift formally verifies their own quasar crates, not Token-2022 templates. b_migliaccio is building a Token-2022 creation crate but not verified, hobbyist stage.
- Why novel: Token-2022 audit is universally mishandled per 0xcastle_chain ("same class of bugs every time"); verified templates eliminate the class entirely
- Composability: every Token-2022 mint
- Solo-buildability: highest — 1 person, 15 days, kani harness + 6–8 patterns + docs
- Caveat: pure tool framing weakens accelerator pitch (mitigated by adding hosted SaaS layer post-hackathon)

### 3. **HookProof** — Verification-as-a-service for Token-2022 extensions
- Narrative: (c) × (e) — primary; (a) — security adds amplification
- Wedge: SaaS layer that takes any Token-2022 program, runs the verified-template-conformance checker + property-based fuzzer + invariant generator, returns a public attestation. Free for sub-$10M-TVL.
- Nearest shipper: STRIDE covers protocols >$10M TVL with paid auditing; this fills the gap below.
- Why novel: STRIDE is human-driven and only for big protocols; HookProof is automated and free for small builders
- Composability: any Token-2022 user
- Solo-buildability: medium-high (CLI tool + simple web frontend + verification engine — leans on #2's library)
- Risk: similar to AlexBiryukov Solana Auditor Skills if positioned as AI agent → differentiate by protocol-level focus on Token-2022 extensions

### 4. **TransferHook Compliance Modules** — Reusable, plug-in compliance hooks
- Narrative: (e) — primary; (b) — touches stablecoin infra
- Wedge: opinionated, audited Solana Token-2022 modules for KYC, sanctions screening, jurisdictional gating, age verification, OFAC checks, all as composable TransferHooks. SDK + reference frontend.
- Nearest shipper: SecuritiesDino implements compliance for full securities issuance product (vertical SaaS); Mohit's framing is horizontal modules anyone can compose.
- Why novel: SecuritiesDino is a vertical product; nobody ships a horizontal compliance-module library
- Composability: any token issuer needing compliance hooks
- Solo-buildability: medium (compliance integrations require more research; KYC vendor integration adds scope)
- Caveat: less Tier-1-narrative-aligned than #1/#2; Lily/Toly haven't explicitly endorsed compliance per se

### 5. **AgentEscrow** — Token-2022-based formally verified escrow primitive for agent-to-agent payments
- Narrative: (d) × (e) — primary; (c) — amplification
- Wedge: pre-built, kani-verified Anchor program implementing escrow with TransferHook-based safety conditions (timeout, multi-signer, dispute resolution). Designed for agent-to-agent x402 payments where neither party trusts the other.
- Nearest shipper: SAEP has dispute arbitration via VRF; not the same as a reusable escrow primitive.
- Why novel: SAEP bundles disputes inside its agent-economy product; no standalone reusable escrow primitive exists for x402-flavored payments
- Composability: any x402 / agent-payment system
- Solo-buildability: high (single Anchor program + kani proofs + reference x402 facilitator demo)
- Risk: SAEP could absorb if they pivot

### 6. **VelocityHook + AllowlistHook + KillSwitchHook** — Single-purpose, kani-verified TransferHook primitives, packaged separately
- Narrative: (c) × (e) — primary
- Wedge: ships as 3 minimal Cargo crates, each implementing one safety primitive. Builders pick the one they need. Each ≤200 LOC + kani harness.
- Nearest shipper: none — closest is b_migliaccio's general Token-2022 creation crate
- Why novel: composable single-purpose modules don't exist; everyone re-implements
- Composability: maximal — every Token-2022 mint
- Solo-buildability: highest (effectively a subset of #2 broken into independent crates)
- Caveat: feels like a *feature set* of #2 — better to merge than ship separately

### 7. **VeriX402** — Rust-native, formally verified x402 facilitator for Solana smart wallets
- Narrative: (c) × (d) — primary; (e) — TransferHooks for safety amplification
- Wedge: where Dexter ships JS/TS SDK, Mohit ships an on-chain Anchor program that *is* a verified facilitator. Token-2022 TransferHooks enforce per-payment policies (velocity, allowlists, KYC) at the protocol layer.
- Nearest shipper: Dexter (TS SDK), Coinbase x402 facilitator, MCPay, Latinum
- Why novel: protocol-layer formally verified facilitator is uncrowded; existing facilitators are middleware in TS/Python
- Composability: x402 endpoints, Phantom Connect, smart wallets (Squads, Crossmint, SWIG)
- Solo-buildability: medium (facilitator + x402 spec adherence + smart-wallet integration is real scope)
- Risk: Dexter is aggressive, well-funded, and shipping fast; differentiation must be sharp

### 8. **HookBench** — Simulation + benchmarking tool for Token-2022 TransferHooks under high-volume load
- Narrative: (c) × (e) — primary
- Wedge: CLI tool that takes a Token-2022 program + a workload spec + safety invariants, runs simulation under high-volume agent traffic, reports invariant violations, gas consumption, attack surface
- Nearest shipper: none — closest is Blueshift's setup-quasar GitHub Action (build/test infra, not simulation)
- Why novel: Token-2022 stress testing is unsolved; agent-payment volume scenarios unaddressed
- Composability: every Token-2022 mint
- Solo-buildability: medium (simulation engine is real work)
- Caveat: dev tool — weak accelerator pitch on its own; should bundle with #1 or #2 as part of a larger offering

### 9. **SafeTransfer Std** — A "Solana Safe Transfer Standard" with conformance verifier
- Narrative: (c) × (e) — primary
- Wedge: define a curated Solana Safe Transfer Standard (SSTS extension) with a verifier; protocols can adopt and prove conformance for downstream user trust
- Nearest shipper: HalbornSecurity SSTS (Solana Security Token Standard) — but that's compliance-focused securities. Mohit's would be safety/operational.
- Why novel: standard + verifier combo; HalbornSecurity owns the security-token name
- Composability: any token issuer
- Solo-buildability: medium-low (standard adoption requires social work, not just code)
- Risk: standards plays often die in the wilderness; needs ecosystem buy-in

### 10. **MintForge** — Visual + CLI tool for designing Token-2022 mints with a verified extension picker
- Narrative: (c) × (e) — primary
- Wedge: web tool + Rust SDK; builder picks Token-2022 extensions visually, the tool generates verified Anchor program code with kani proofs ready
- Nearest shipper: b_migliaccio is building a "crate to make Token-2022 tokens easy" — early hobbyist
- Why novel: no visual + verified combination exists
- Composability: every new Token-2022 mint
- Solo-buildability: medium (web frontend adds scope; could ship CLI-only v1)
- Risk: feels like #2 with extra UI bloat — strip to CLI

### 11. **AgentPayPolicy** — Pluggable policy DSL for Token-2022 transfer hooks specific to agent payments
- Narrative: (d) × (e) — primary; (c) — amplification
- Wedge: small declarative DSL ("max 100 USDC/hour to wallet X, never to sanctioned list, kill-switch on owner signature"); compiles to verified TransferHook bytecode
- Nearest shipper: SAEP has agent capability registry but not a policy DSL specifically
- Why novel: DSL approach to TransferHook composition is unaddressed
- Composability: any agent-payment system
- Solo-buildability: medium-high (DSL design is finite; codegen + kani harness is buildable)

### 12. **HookAudit** — Open-source security audit harness specifically for Token-2022 extensions
- Narrative: (a) × (c) × (e) — three-narrative composition
- Wedge: a Cargo plugin + GitHub Action that runs a battery of Token-2022-extension-specific security checks (the bugs 0xcastle_chain documented), formal property checks via Kani, and produces an audit report
- Nearest shipper: Alex Biryukov Solana Auditor Skills (general 120-vector AI auditor); 0xcastle_chain blog only
- Why novel: Token-2022-extension-specific automated audit harness doesn't exist; AlexBiryukov's tool is generic AI-assisted, not Kani-formal
- Composability: every Token-2022 mint repo
- Solo-buildability: medium (battery of checks + Kani integration is real engineering)
- Caveat: tool framing again — bundle with #1/#2

### 13. **TokenRails MCP Server** — A Token-2022 mint + transfer-policy MCP server for Phantom agent wallets
- Narrative: (d) × (e) — primary
- Wedge: an MCP server that exposes a Token-2022 mint (with chosen safety hooks) as a discoverable agent service via Phantom MCP. AI agents can pay using Token-2022-protected USDC variants where the mint enforces velocity/allowlist policy.
- Nearest shipper: HeyAnonai Kamino MCP, MCPay, Latinum, Phantom MCP — all middleware, none ship Token-2022 mints with safety hooks
- Why novel: combines Phantom Grand-sponsor alignment + Token-2022 safety hooks + MCP standardization
- Composability: Phantom (Grand sponsor), Vanish, Helius
- Solo-buildability: medium (MCP server + Anchor mint program + safety hooks)
- Risk: requires MCP wire-protocol compliance + Phantom-specific integration

---

## Eliminated by constraints (recorded for transparency)

| Idea | Why killed |
|------|------------|
| Generic Solana audit tool | Alex Biryukov Solana Auditor Skills already shipping |
| Hardware wallet | Unruggable Cypherpunk Grand winner, sponsor-track now |
| Privacy payments | Cloak / Vanish already shipped; Vanish is now a sponsor |
| Cross-chain bridge for Token-2022 | Matty's explicit anti-bridge kill-list ([2026-04-20](https://x.com/mattytay/status/2046021326683734378)) |
| Generic AI agent for crypto | Vague-AI-agent slop — kill-list |
| Tokenized securities full stack | SecuritiesDino owns this wedge |
| LP/AMM with Token-2022 | DAMM v2 owns; team-shaped |
| Generic stablecoin issuance | Reflect, Perena, etc. dominate; team-shaped |
| Lending protocol with Token-2022 | Jupiter Lend / Kamino dominate; team-shaped |

---

## Top-5 candidates passing initial filter (for shortlist scoring)

In order of immediate gut-fit:
1. **AgentSafe Hooks** (#1) — best 3-narrative coverage + accelerator-shape
2. **VeriHook** (#2) — best solo-fit + Tier-1 alignment, but tool-shape
3. **AgentEscrow** (#5) — narrow + clean + composable
4. **VeriX402** (#7) — high judge-fit, higher build risk
5. **HookProof** (#3) — service angle on top of #2's library

These are the 5 advanced to `ideas-shortlist.md` for 6-axis scoring.
