# Agent Registry — Public Reception, Limitations, Wedge Reality

**Purpose:** Mohit asked for "exponential research" on what people say about the Solana Agent Registry on X / Reddit / dev forums, what limitations they cite, what they want on top of it, and whether any other lead emerges from this. This file is the deliverable — primary-source-cited synthesis of public discourse and competitor mapping that goes beyond the structured Phase 1–3 deliverables. The Phase 3 decision verdict stands as written; this file layers context onto it.

**Sources studied:**
- DEV blog: [agentveil — "What Ethereum's Agent Identity Standard Deliberately Leaves Open"](https://dev.to/agentveil/what-ethereums-agent-identity-standard-deliberately-leaves-open-222f)
- DEV blog: [o96a — "The Trust Layer Nobody Built"](https://dev.to/o96a/the-trust-layer-nobody-built-why-ai-agents-need-verification-before-they-can-spend-4e4k)
- ATXP comparison: [atxp.ai — "Every Agent Payment Protocol Compared"](https://atxp.ai/blog/agent-payment-protocols-compared/)
- BNB Chain blog: [BNB — "The Missing Trust Layer for the Agent Economy"](https://www.bnbchain.org/en/blog/the-missing-trust-layer-for-the-agent-economy)
- PAZ blog: [paz.ai — "Agentic Commerce Trust Stack Identity Layer"](https://www.paz.ai/blog/agentic-commerce-trust-stack-identity-layer)
- Code: cloned `github.com/QuantuLabs/8004-solana@main`, plus README skim of `cascade-protocol/sati`, `cascade-protocol/deadline-validator`
- Foundation page: [solana.com/agent-registry](https://solana.com/agent-registry) + [docs.sati.cascade.fyi](https://docs.sati.cascade.fyi/)
- x-recon: 7 fresh searches + 1 fresh profile (`@Quantu_AI`) on top of Day-3 cached corpus

Last verified: 2026-04-27

---

## TL;DR — three findings that materially change the wedge picture

1. **The "agent identity" wedge on Solana is fragmented across SIX competing registries**, not one. xona_agent (a registered AI agent) is enrolled in ALL six simultaneously to maximize discoverability. 8004-Solana has Foundation endorsement but lacks ecosystem dominance.
2. **The "policy enforcement on top of identity + reputation" wedge is heavily and globally claimed.** AIVM_Network, Callipsos, sekuire, Microsoft Agent Governance Toolkit, Fime FACT, Mastercard/Google Verifiable Intent, and Ramp Agent Cards all claim some version of "the missing layer between identity and payment." Multiple players already shipped or are shipping 2026.
3. **SAEP shipped a competing full-stack agent infrastructure on Solana mainnet 6 days ago (2026-04-21)**, registered for Frontier Hackathon, with broader scope than AgentTrust-reframe's planned scope. SAEP is a direct Frontier competitor for the agent-runtime-trust thesis — not adjacent.

These findings do NOT invalidate the Phase 3 DISTINCT verdict (architectural-layer separation between AgentSafe Hooks and AgentTrust-reframe holds). But they do reveal an asymmetric wedge-defensibility profile that should weigh into the Day-5 lock decision.

---

## Section 1 — What developers explicitly say about ERC-8004 / Agent Registry limitations

### 1a — The "deliberately left open" framing (DEV blog)

[agentveil's DEV post](https://dev.to/agentveil/what-ethereums-agent-identity-standard-deliberately-leaves-open-222f) summarizes the gaps:

| Gap | Author's framing |
|-----|------------------|
| No reputation aggregation | *"It stores raw data."* (verbatim, 5 words) |
| Zero Sybil resistance in raw layer | *"giveFeedback() is open."* (verbatim, 4 words) |
| Immutable noise — unfair feedback persists | Permanent on-chain footprint of bad actors falsely tagged |
| Identity ≠ Trust | "Cheap to mint, meaningless at scale" |
| No dispute resolution | No on-chain arbitration pathway |
| No legitimate-vs-fake distinguisher | Thousands of agents can register; nothing pre-distinguishes |

Author proposes an "Aggregation & Enforcement" layer with: graph-based reputation (EigenTrust), Sybil cluster detection, collusion identification, decentralized dispute resolution, verified scores from attestation graph structure.

**8004-Solana's response:** Quantu's ATOM Engine PARTIALLY addresses these — HLL-based unique-client estimation, ring-buffer burst detection, tier vesting (8 epochs / ~20 days), platinum loyalty gate (500+ score required), per-agent salt to prevent grinding. So Solana side is more advanced than Ethereum side on aggregation. But Quantu does NOT ship dispute resolution, validation, or graph-based EigenTrust scoring. Mohit's reframed AgentTrust ValidationRegistry would partially fill these gaps.

### 1b — The "missing trust layer" framing (multiple sources)

| Source | Framing |
|--------|---------|
| [DEV blog "Trust Layer Nobody Built"](https://dev.to/o96a/the-trust-layer-nobody-built-why-ai-agents-need-verification-before-they-can-spend-4e4k) | *"The missing piece is not capability — it is trust."* / *"digitally signed power of attorney with machine-enforceable constraints"* |
| [BNB Chain](https://www.bnbchain.org/en/blog/the-missing-trust-layer-for-the-agent-economy) | *"How do two agents exchange value without trusting each other first?"* / *"Trust needs to be enforced before value moves."* — proposes proof-based escrow, REJECTS identity/reputation models |
| [ATXP](https://atxp.ai/blog/agent-payment-protocols-compared/) | *"missing basement problem"* — none of x402/ACP/UCP/AP2 ship persistent identity → 8004 IS the basement |
| [Fime FACT framework](https://thepaypers.com/fraud-and-fincrime/news/fime-rolls-out-fact-trust-framework-for-ai-agent-initiated-payment-transactions) | "real-time trust verification with intent validation, policy and compliance monitoring, transaction-level trust attestation" |
| [Microsoft Agent Governance Toolkit](https://techcommunity.microsoft.com/blog/linuxandopensourceblog/agent-governance-toolkit-architecture-deep-dive-policy-engines-trust-and-sre-for/4510105) | "policy enforcement, agent identity, trust scoring, compliance mapping" — open-source 2026-04 |
| [PAZ blog "Agentic Commerce Trust Stack"](https://www.paz.ai/blog/agentic-commerce-trust-stack-identity-layer) | 3-layer stack: Identity (World ID, AgentKit, Okta, Mastercard) / Payments (ACP, UCP, Stripe) / Discovery. Says "identity is becoming what TLS is for web checkout" |

**Pattern:** Half a dozen credible voices in 2026 explicitly identify "missing trust layer for agentic commerce" as the wedge. None on Solana directly except in passing. This space is well-claimed in TradFi/Web2/cross-chain language even if not yet locked on Solana.

### 1c — Concrete X voices saying "we are building this layer"

Search `"agent identity" policy enforcement` across last 90 days surfaces these explicit "we ship the missing policy layer" claims:

| Builder | Claim | Date |
|---------|-------|------|
| [@CyndieKamau (Callipsos_)](https://x.com/CyndieKamau/status/2018351149108150497) | *"OpenClaw + ERC8004 + x402 + Policy as Code Enforcement. Right now we need a layer between agent identity (ERC 8004) and agent payment (x402) that governs what an agent is authorized to execute. That's what we are doing with @Callipsos_..."* | 2026-02-02 |
| [@AIVM_Network via @Chain_GPT](https://x.com/Chain_GPT/status/2029889733166542873) (206 likes) | *"Agent identity is critical, but identity alone doesn't prevent failures. AIVM_Network introduces the missing layer: policy enforcement for autonomous agents. Each action is checked against predefined mandates before execution."* | 2026-03-06 |
| [@JoelFickson](https://x.com/JoelFickson/status/2034578537626087801) | *"Two lines... Cryptographic agent identity, Runtime policy enforcement (allow/deny per action), Fleet kill switch, Tamper-evident audit trail."* | 2026-03-19 |
| [@sekuire](https://x.com/sekuire/status/2034240913522700532) | *"Your AI agents have root access. No permissions. No audit trail. No kill switch. We built the missing layer."* | 2026-03-18 |
| [@RedHubAI](https://x.com/RedHubAI/status/2041613110855766301) | *"Microsoft may have just changed the conversation around AI agents — open-source Agent Governance Toolkit adds real runtime guardrails: policy enforcement, agent identity, trust scoring, and compliance mapping."* | 2026-04-07 |

**This is the exact category AgentTrust-reframe would enter.** It is heavily contested, mostly in the off-Solana / cross-chain / TradFi space. Solana-specific competitors are documented in Section 2 below.

---

## Section 2 — Solana ecosystem mapping (the SIX-registry reality)

### 2a — The full registry roster on Solana

xona_agent (a registered AI agent that mints reputation across the stack) [self-enumerates 6 registries](https://x.com/xona_agent/status/2037235636084572347) in a 2026-03-26 post:

| Registry | Operator | Stage | Differentiation |
|----------|----------|-------|-----------------|
| **8004 Agent Registry** | [@Quantu_AI](https://x.com/Quantu_AI) | Mainnet (since 2026-03-02) | ERC-8004 port; Foundation-endorsed at solana.com/agent-registry; ATOM Engine for sybil-resistant reputation; 1,433 agents |
| **014 Agent Registry / MIP-014** | [@metaplex](https://x.com/metaplex/status/2034648873625591990) | Mainnet | Metaplex-native; binds to MPL Core asset; "the agentic economy lives on @solana"; 14+ early adopters (XONA, Hyre, Nuero, molt.id, others) |
| **SATI (Solana Agent Trust Infrastructure)** | [@cascade_fyi](https://github.com/cascade-protocol/sati) | Mainnet — `@cascade-fyi/sati-sdk@0.15.1` | ERC-8004-compatible; ZK Compression for feedback (~$0.002 each); blind-feedback mechanism; Apache-2.0; 30 releases, 166 commits |
| **SAID (Soulbound Agent Identity Documents)** | [@saidinfra](https://x.com/saidinfra/status/2027881182784860221) | Building | Soulbound passports for agents on Solana |
| **SAP** | [@OOBEonSol](https://x.com/OOBEonSol) | Building | Newer entrant |
| **ERC-8004 (alternate)** | [@helixaxyz](https://x.com/helixaxyz) | Building | Alternate ERC-8004 implementation on Solana |

Plus [@BuildOnSAEP shipped its own `AgentRegistry`](https://x.com/BuildOnSAEP/status/2046630826847228049) on Solana mainnet 2026-04-21 as part of a 10-Anchor-program stack — a SEVENTH agent identity primitive.

Plus reputation aggregators ([@fairscalexyz](https://x.com/fairscalexyz)) and messaging layers ([@deside_app](https://x.com/deside_app/status/2035432155631763892)) that compose across registries.

### 2b — What this means for AgentTrust-reframe's PolicyVault design

PolicyVault as drafted assumes 8004-Solana is "the" Solana identity standard. **It is not.** Three options for the reframe to handle this:

1. **Pick one (8004-Solana, since Foundation-endorsed) + accept fragmentation risk.** Loses 80% of agents registered on Metaplex-014, SAEP, SATI. Foundation-narrative is preserved; market reach is narrow.
2. **Be registry-agnostic — read from any of the 6.** Architectural complexity. No canonical scoring source — would need a meta-aggregator like FairScale to provide unified trust score. Doable but doubles scope.
3. **Add an "adapter pattern" — pick 8004 default, expose plugin interface for others.** Splits the difference. PolicyVault v1 is 8004-aware; v1.1+ adds Metaplex-014 + SAEP adapters as ecosystem demands.

This is a real design constraint that did not surface in Phase 1–3 because the Phase 1 study was scoped to 8004-Solana only.

### 2c — KAMIYO is the closest direct competitor in the "policy + escrow ON TOP of registry" wedge

[@kamiyoai 2026-03-02](https://x.com/kamiyoai/status/2028591006371725383):
> *"Agent Registry on @solana is the perfect foundation for agent discovery and portable agent reputation. KAMIYO adds to this by provisioning stake-backed escrows, ZK-secured disputes, and auto-settlements for trustless agent-to-agent commerce."*

KAMIYO is *not* in Day-3's competitive deep scan. They are building exactly the layer AgentTrust-reframe targets — the policy + dispute + escrow layer ON TOP of agent identity. Day 3 had them flagged as "kamiyoai / Kizuna" as a Token-2022 / agent-finance protocol with weak overlap on hooks. The reframe lens shows they are **direct overlap** on AgentTrust-reframe's wedge.

Public artifacts on KAMIYO are still sparse — but the public framing in the tweet above is verbatim alignment with AgentTrust-reframe. Status: building, not yet mainnet (per Day-2 research). Threat-level: **HIGH** for AgentTrust-reframe; LOW for AgentSafe Hooks.

### 2d — SAEP is the most-shipped competing full-stack on Solana

SAEP went mainnet 2026-04-21 and registered for Frontier Hackathon 2026-04-21 with **10 on-chain Anchor programs** ([@BuildOnSAEP 2026-04-20](https://x.com/BuildOnSAEP/status/2046225599207817411)):

> *"Agent identity, open task bidding, Groth16 ZK proof verification, Switchboard VRF arbitration, streaming payments, staking, governance, and a full TypeScript SDK."*

[Apr 21 thread](https://x.com/BuildOnSAEP/status/2046680022581166425): **Capability Registry + Agent Registry + Treasury Standard + Template Registry** all live on mainnet. [Apr 23 self-positioning](https://x.com/BuildOnSAEP/status/2047141414690029639): *"On-chain agent identity. Proof-gated escrow. Verifiable task markets. Cross-chain payments. ZK proof settlement."*

**SAEP is a direct Frontier competitor for the AgentTrust-reframe thesis.** Not adjacent. Their scope is BROADER (capability + treasury + template + governance + ZK + streaming payments + staking) than AgentTrust-reframe's scope (PolicyVault + TrustGate + ValidationRegistry).

If Mohit's lock favors AgentTrust-reframe, the pitch must explicitly differentiate from SAEP — which is harder than differentiating from AgentSafe Hooks because SAEP shares the same wedge. Possible angles:
- Foundation-endorsed-registry alignment (SAEP rolls its own; AgentTrust-reframe uses Quantu's Foundation-endorsed primitive)
- Open-source / public-goods primitive vs SAEP's $SAEP-token vertical economy
- Solo-builder velocity vs SAEP team's broader-but-distributed effort

These are real differentiations but the pitch lift is bigger than for AgentSafe Hooks vs SAEP (where Day 3 already established the "fee capture vs safety" non-overlap).

### 2e — Cascade Protocol is shipping the full agent stack quietly

[github.com/cascade-protocol](https://github.com/cascade-protocol) repo list:
- **x402** — Payments protocol for the internet, built on HTTP
- **x402-proxy** — curl for x402 + MPP paid APIs (CLI + MCP proxy)
- **surf** — Pay-per-use API gateway for AI agents
- **mpp** / **mppx** — Machine Payments Protocol
- **agentbox** — Agent in a Box
- **nanoclaw** — Lightweight messaging app connector
- **x402scan** — x402 Ecosystem Explorer
- **sati** — Trust infrastructure for Solana (Apache-2.0)
- **splits** — Non-custodial payment splitting protocol for Solana (Apache-2.0)
- **deadline-validator** — Stateless Solana program for transaction deadlines (mainnet+devnet, program ID `DEADaT1auZ8JjUMWUhhPWjQqFk9HSgHBkt5KaGMVnp1H`)

**Cascade has shipped a fuller payments-side x402 ecosystem than any other player, with SATI as their identity layer.** SATI README explicitly tags `#x402` and `#payment-mandates` as planned features → trust gating + mandates are on their roadmap. They are 30 releases / 166 commits in — much more shipped than the Day 3 research surfaced.

Threat-level for AgentTrust-reframe: **MEDIUM** (Cascade is sprawling but not focused on policy enforcement specifically yet — x402 trust gating is signaled but not shipped). For AgentSafe Hooks: **LOW** (Cascade does not ship Token-2022 hooks).

### 2f — molt.id / Moltyverse / sentrylauncher show the "policy on registry" pattern is desired

[@cruelhandeth 2026-04-17](https://x.com/cruelhandeth/status/2044975958281555978):
> *"Molty's funding 100 agent launches on @solana with @sentrylauncher's agent_launch function. 8004 identity by @Quantu_AI required."*

[@molting_cmi 2026-04-17](https://x.com/molting_cmi/status/2044974378950033680):
> *"Agents on @solana can now launch tokens with one command. Register an 8004 identity. Deploy a token. Trade it."*

**This is real-world manual policy enforcement on top of 8004-Solana** — sentrylauncher's `agent_launch` instruction requires 8004 registration, full stop. That is a *static* policy ("must be registered"). PolicyVault generalizes this to *dynamic* policies ("must be registered AND tier ≥ 3 AND not on denylist AND velocity below threshold AND optionally have validation attestation X"). The pattern is real, the demand is real, the generalization is what's not built.

---

## Section 3 — What's still empty vs what's contested (decisive table)

| Wedge on Solana | Open / Contested? | Top shippers | What this means for lock |
|---|---|---|---|
| Token-2022 transfer-hook safety modules for **agent payments** | **OPEN** (verified empty 2026-04-27 fresh search) | None — Day 3 finding holds, no new shippers in 4-day window | AgentSafe Hooks wedge defensibility CONFIRMED |
| Agent identity registry | CONTESTED — 6+ shippers | 8004 (Quantu), 014 (Metaplex), SATI (Cascade), SAID, SAP, helixa, SAEP | AgentTrust must consume someone else's, not rebuild |
| Sybil-resistant on-chain reputation | CONTESTED — multiple sybil-resistance approaches | ATOM (Quantu HLL), FairScale (cross-registry aggregator), SATI (ZK-compressed feedback) | AgentTrust must consume not rebuild |
| Capability declaration | CONTESTED | SAEP Capability Registry (mainnet), 8004 metadata PDAs, MIP-014 attributes | Open territory only at the "policy that consumes capabilities" layer |
| Validation Registry (ERC-8004 third leg) | **OPEN on Solana** (Quantu archived theirs; SATI README says planned but not shipped; SAEP ships ZK proofs but for arbitration not capabilities) | None canonical | Genuinely empty Foundation-aligned niche |
| Policy enforcement that gates payment on agent reputation | **OPEN on Solana** (heavily claimed off-Solana) | Sentrylauncher does manual; Microsoft toolkit / AIVM / sekuire / Callipsos in TradFi-or-cross-chain | Open if pitched as "first dedicated Solana primitive for this" |
| x402 facilitator with reputation-aware pre-flight gating | **OPEN on Solana** (SATI README signals planned; KAMIYO scope-overlap) | None shipped | Open with KAMIYO-watch |
| Stake-backed escrow + ZK dispute for agent commerce | CONTESTED — KAMIYO building, SAEP shipped Groth16 + VRF arbitration | KAMIYO, SAEP | NOT recommended as wedge |
| Cross-registry policy adapter (one PolicyVault that works against all 6 registries) | OPEN (no one shipped) | None | Niche extension, low buyer demand |

---

## Section 4 — Limitations of 8004-Solana / ATOM (concrete, source-cited)

These are the honest gaps in the primitive Mohit's reframe builds on. Mohit should know them before betting on the dependency.

| Limitation | Source | Severity for AgentTrust-reframe |
|------------|--------|----------------------------------|
| **Reputation is feedback-only.** No payment-success signal feeding into trust_tier. | Code: `give_feedback` requires `client: Signer` with `core_owner != client.key()` | LOW — TrustGate's PDA-signed CPI fixes this by emitting feedback after every settlement |
| **Tier vesting takes ~20 days (8 epochs).** New agents cannot rapidly gain trust. | CHANGELOG v0.5.0 "Tier Vesting" | MEDIUM — slows reputation-gate adoption; demos with newly-registered agents will show tier 0 / Unknown |
| **Validation Registry archived since v0.5.0.** Third leg of ERC-8004 not shipped. | CHANGELOG; lib.rs comment "Validation module removed in v0.5.0 — planned for future upgrade" | OPPORTUNITY for Mohit to ship the missing piece |
| **No on-chain dispute arbitration.** Responses are permissionless append-only; no quorum / weighting / slashing surface. | Code: `append_response` accepts any signer | OPPORTUNITY for Mohit to ship if scope allows |
| **Feedback content is events-only, not on-chain state.** Downstream policy programs cannot read the SEMANTICS of past feedback (e.g., "did this agent default before?"). | README: "Events-Only Integrity Note... consumers must use the verified indexer pipeline" | MEDIUM — PolicyVault must consume the indexer for content-aware policies (e.g., "block if any feedback tagged 'fraud' in last 100 events") |
| **HLL sybil resistance is statistical, not cryptographic.** Sufficiently-funded attackers with diverse client wallets can game it. | Code: HLL[256] register architecture in atom-engine | MEDIUM — acceptable for v1, but regulated-enterprise integrators may demand stronger primitives |
| **Single base collection.** All agents are in one collection. Granular collection-scoped policies require off-chain segmentation. | CHANGELOG v0.6.0 "Single Collection Architecture" | LOW — extension collections planned in separate repo |
| **Reverse-mapping (wallet → agent) is not a public PDA.** Asset-layer hooks cannot cheaply look up "which agent does this wallet belong to." | Code: only `agent_wallet` per agent; no `wallet_to_agent` PDA | This is the structural moat for PolicyVault vs AgentSafe Hooks (already documented in Phase 3) |
| **Foundation/Quantu dependency-risk.** AgentTrust-reframe depends on Quantu continuing to maintain + Foundation continuing to endorse. | Phase 3 doc | MEDIUM — mitigated by MIT license (program survives Quantu's company status) but real |

---

## Section 5 — What this layer of research adds to the Phase 3 decision

### Phase 3 verdict (DISTINCT) holds on architectural-layer criteria

The reverse-mapping problem and the agent-vs-asset layer separation are confirmed. AgentSafe Hooks v1.1 still cannot trivially replicate AgentTrust-reframe's reputation-aware gating without architectural compromise.

### Three new constraints layer on top

1. **Wedge defensibility is asymmetric.** AgentSafe Hooks holds an EMPTY wedge on Solana (verified 0 shippers in 4-day fresh search). AgentTrust-reframe enters a CONTESTED wedge — KAMIYO direct competitor, SAEP direct Frontier competitor with broader shipped scope, Cascade adjacent with full stack roadmap, Microsoft / Callipsos / AIVM / sekuire claiming the same category off-Solana.
2. **Identity-fragmentation forces a design choice in the reframe.** PolicyVault must decide: 8004-only (loses 80% of Solana agents), registry-agnostic (doubles scope), or adapter-pattern (compromise). This was not surfaced in Phase 2.
3. **The Validation Registry niche is genuinely empty AND Foundation-aligned.** Standalone, it's a smaller thesis than full AgentTrust-reframe but Public-Goods-eligible and a credible companion to whatever Mohit locks. Worth surfacing as either a v1.1 add-on to the locked thesis OR as a Day-30+ companion product.

### Recommended weight in the Day-5 lock decision

If Mohit is risk-averse and prioritizes wedge defensibility → **AgentSafe Hooks** (empty wedge, no immediate Frontier competitor on the wedge).

If Mohit values Foundation-narrative alignment + cross-chain narrative momentum (ERC-8004 is on Ethereum / Base 44K agents / Polygon / Abstract / Arc / Arbitrum) → **AgentTrust-reframe** with explicit positioning against KAMIYO + SAEP.

If Mohit prefers a smaller, sharper, lower-execution-risk Public-Goods thesis → consider **the Validation Registry alone** as a Day-5 alternative (covered in `agenttrust-other-leads.md`).

---

## What this means for Mohit's submission

- **AgentSafe Hooks' wedge defensibility is structurally stronger than AgentTrust-reframe's** in 2026-04-27 reality — empty on Solana with no fresh-week shipper signal vs heavily contested with KAMIYO + SAEP + 6 identity registries.
- **AgentTrust-reframe's architectural distinction (Phase 3 DISTINCT) holds**, but the wedge defensibility argument was understated in Phase 3. Mohit should weight wedge-empty vs wedge-contested as a load-bearing factor in the Day-5 lock.
- **The "missing trust layer" framing is heavily and globally claimed**. AgentTrust-reframe's pitch must specifically differentiate from Microsoft / Callipsos / AIVM / sekuire / Fime / Mastercard-Google. The Solana-on-chain-enforcement angle is the differentiator but the category language is already flagged.
- **SAEP is a direct Frontier competitor for AgentTrust-reframe; not for AgentSafe Hooks.** SAEP's full-stack-shipped position 6 days ago changes the ground.
- **The Validation Registry idea is the strongest sleeper-lead from this research** — empty, Foundation-aligned, smaller scope than full AgentTrust-reframe, valuable as a Public-Goods companion to whatever Mohit locks. Surfaced in detail in `agenttrust-other-leads.md`.
- **Day-5 lock-decision rubric update suggested:** add row for "Solana wedge contested-ness as of 2026-04-27" — AgentSafe Hooks scores 9/10 (essentially empty), AgentTrust-reframe scores 4/10 (contested).
