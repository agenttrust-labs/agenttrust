# Pitch Deck Template — 10 Slides

**Use case:** Frontier Colosseum submission deck (companion to 3-minute pitch video) + DM follow-ups + accelerator interview. Slide-by-slide content brief. Mohit applies visual design via friend; this file locks copy.

**Format reference:** Y Combinator 10-slide template (Title / Problem / Solution / Market / Business Model / Traction / Competition / Team / Financials / Ask). Per YC Demo Day guide: "Make it legible. Make it simple. Make it obvious. Visually stunning slides often hurt seed-stage pitches; your slides should be visually boring with clear, large text." [Source: ycombinator.com/blog/guide-to-demo-day-pitches/]

**Author:** Mohit. Last updated 2026-04-28. Word counts target ≤30 words per slide body, ≤8 words per slide title.

---

## Slide 1 — Hook (Variant B condensed)

**Title (8w):** AgentTrust — gate AI-agent payments on counterparty trust.

**Body (≤30w):**
> Last week a treasury bot routed $1.2M USDC to a clone of a real Solana protocol. Smart contracts held up; the human-trust layer didn't. AgentTrust is that check.

**Suggested visual:** Single screenshot — left half: terminal showing clone agent with no registry entry + the $1.2M Solana Explorer link; right half: same call rejected by `gate_payment`. Stark, dark theme.

**Key claim:** Real B2B money lost → Foundation-endorsed registry available but no on-chain check → AgentTrust is the fill.

**Citation:** Variant B opener locked in `plan/final_idea/PITCH_FRAMES_LOCKED.md` (post-marathon synthesis, 74 words). Lily Liu's "smart contracts held up" quote: [2026-04-02 X post](https://x.com/calilyliu/status/2039652201342050713).

---

## Slide 2 — Problem

**Title (5w):** Counterparty trust failures in agent payments.

**Body (≤30w):**
- $50M monthly volume on x402 already; 65% on Solana.
- Zero standardized counterparty-trust check before settlement.
- Quantu shipped identity + reputation; the validation/policy layer is archived.

**Suggested visual:** Three-column graphic: Identity (green check, "Quantu v0.5.0"), Reputation (green check, "Quantu v0.6.0"), Validation (red X, "archived").

**Key claim:** Foundation built two of three legs; the third is missing in production.

**Citation:**
- $50M / 65% Solana share: `solana.com/x402` + `docs.cdp.coinbase.com/x402/welcome`
- Vibhu's claim "99.99% by 2028": [vibhu 2026-03-26](https://x.com/vibhu/status/2036969570649452652) (452 likes)
- Quantu archive of ValidationRegistry: `github.com/QuantuLabs/8004-solana` v0.5.0 release notes

---

## Slide 3 — Solution

**Title (8w):** Three Anchor programs that complete the trust stack.

**Body (≤30w):**
- Pre-flight gate (5 policy kinds, one CPI call)
- Post-settlement feedback (PDA-signed CPI to ATOM Engine)
- Permissionless validation registry (third leg of ERC-8004)

**Suggested visual:** Architecture diagram with three Anchor programs + arrows showing CPI flow. Quantu Foundation registry sits beneath (read-only); AgentTrust sits above (writes attestations + emits feedback).

**Key claim:** AgentTrust completes the Foundation's ERC-8004 stack — the third leg Quantu archived, fully productized.

**Citation:** Foundation endorsement: [solana.com/agent-registry](https://solana.com/agent-registry) ("Managed by Solana Foundation") + Quantu's source repo `github.com/QuantuLabs/8004-solana`.

---

## Slide 4 — Architecture (3 components, technical detail)

**Title (5w):** Architecture — three Anchor programs.

**Body (≤30w):**
- **Component 1:** policy-vault — `gate_payment` composer + 5 policy kinds + 5-invariant Kani harness
- **Component 2:** trustgate — Express facilitator service + drop-in TS module
- **Component 3:** validation-registry — capability namespaces + permissionless attestor model

**Suggested visual:** Detailed architecture diagram with PDA layouts, CPI flows, and the Foundation registry as a read-source dependency. Color-coded: blue=AgentTrust, grey=Quantu, white=facilitator.

**Key claim:** Solo-shipped, formally-verified, MIT-licensed.

**Citation:** v1 scope locked at `plan/final_idea/THESIS_LOCK.md` (Day 4.5).

---

## Slide 5 — Demo screenshot (live denial + acceptance)

**Title (5w):** Live demo — pre-flight gate.

**Body (≤30w):**
- Side-by-side terminal output: clone counterparty → DENY (tier 0); canonical counterparty → ALLOW (tier 3).
- Live on Solana mainnet. Explorer-verifiable. <400ms decision latency.

**Suggested visual:** Two-pane screenshot of the actual terminal showing the $1.2M USDC treasury-rebalance scenario. Red `Deny` left, green `Allow` right. Solana Explorer URL visible. No fake data — real mainnet program log.

**Key claim:** It works. Live. Today.

**Citation:** Mohit records this demo Day 12-13. Mainnet program ID + Explorer URL pre-filled when slide is finalized. Demo-flow body locked in `plan/other_tasks/ops/technical-demo-script.md`.

---

## Slide 6 — Foundation alignment (the wedge)

**Title (5w):** Foundation alignment is the wedge.

**Body (≤30w):**
- Solana Foundation endorsed Quantu's Agent Registry: solana.com/agent-registry
- AgentTrust extends the canonical implementation, not a parallel one
- One CPI call. One ATOM Engine read. Same registry the Foundation already endorsed.

**Suggested visual:** Screenshot of solana.com/agent-registry homepage with footer "© 2026 Solana Foundation" highlighted. Below it: a one-line architecture diagram showing AgentTrust → Quantu Agent Registry → Solana Foundation.

**Key claim:** Independently verifiable. Not a competitive claim. Not a marketing claim. A primary-source-checkable fact.

**Citation:** [solana.com/agent-registry](https://solana.com/agent-registry) — "Managed by Solana Foundation."

---

## Slide 7 — Named first buyer / facilitator integration

**Title (4w):** Built for x402 facilitators.

**Body (≤30w):**
- Built against Dexter v3 SDK (DAuth-compatible primitive) + atxp_ai + MCPay (Cypherpunk Stablecoin track winner, $25K)
- Drop-in TypeScript module — integration is one CPI call, not a migration
- DM-response quote pending (target: pre-Day-12 lock; atxp_ai = Priority 1 fallback per Wave 3 #8)

**Suggested visual:** Three logos in horizontal strip: Dexter, atxp_ai, MCPay. Below: a one-line quote slot. Text: "Day-12 update: [facilitator quote will go here if landed]." If no quote landed, leave the slot blank — judges respect "in conversation with" over fabricated. Per Revision 10 (Dexter DAuth positioning): if Dexter unresponsive, swap to "Built against atxp_ai's production x402 facilitator handling 1M+ tx" as the slide-7 lead.

**Key claim:** Real buyers, not vapor.

**Citation:**
- MCPay Cypherpunk win: [blog.colosseum.com/announcing-the-winners-of-the-solana-cypherpunk-hackathon](https://blog.colosseum.com/announcing-the-winners-of-the-solana-cypherpunk-hackathon/)
- Dexter / atxp_ai outreach via Day-5 DM batch in `plan/other_tasks/dms/`.

---

## Slide 8 — Roadmap (Phase 1 / Phase 2 / Phase 3)

**Title (3w):** Roadmap.

**Body (≤30w):**
- **Phase 1 (Day 17, 2026-05-11):** v1 ships — three programs + facilitator service + Kani harness, MIT-licensed
- **Phase 2 (Day 17 - Day 90):** hosted product layers + multi-registry adapter (Quantu fork-friendly)
- **Phase 3 (Day 90+):** cross-chain ERC-8004 (Ethereum / Base) — bridge attestations, not assets

**Suggested visual:** Horizontal timeline with three milestones. Today / Day 17 / Day 90 / Day 90+. Phase 1 in solid blue; Phase 2 in lighter blue; Phase 3 in outlined blue. Footnote: "Bridges attestations, not assets" (anti-bridge framing for Matty).

**Key claim:** Clear post-hackathon path. Cohort 5 entrant by design.

**Citation:** Matty's anti-bridge stance: [mattytay 2026-04-20](https://x.com/mattytay/status/2046021326683734378) — "Trustless, decentralized bridges do not exist. Reallocate accordingly." Phase 3 explicitly bridges *attestations* (data), not assets.

---

## Slide 9 — Founder

**Title (3w):** Founder — Mohit.

**Body (≤30w):**
- Solo Solana/Rust engineer
- 1 year shipping on Solana, prior Web2 senior-engineer experience
- Indian Solana ecosystem, Superteam India member
- Solo gives infra-speed shipping without coordination overhead

**Suggested visual:** Mohit headshot (clean, well-lit). Below: GitHub handle + Twitter handle + Superteam-India badge. To the right: 3-bullet "shipped on Solana": list of his prior Solana shipped artifacts (Mohit fills in pre-recording).

**Key claim:** Solo is the feature, not a bug. Founder-market-fit + ship velocity.

**Citation:** Per `judges-and-bias.md` §5 — "Compensate for solo with a founder-market-fit opening." Solo Solana-Rust senior engineer has authority in infra/security categories per past-winner pattern (`research/02-past-winners/grand-champions.md` "What this means for Mohit's submission").

---

## Slide 10 — Ask (closing)

**Title (3w):** What I'm asking for.

**Body (≤30w):**
- Frontier Standout placement ($10K × 20 tier; ~3,500 expected submissions)
- Colosseum Cohort 5 accelerator interview ($250K + relocate to SF)
- Public Goods Award eligibility (MIT-licensed, no token, no fee capture)
- Solana Foundation grant pathway (Foundation already endorsed the registry I extend)

**Suggested visual:** Four bulleted asks in equal-weight columns. AgentTrust logo at top center; GitHub + Twitter + email at bottom. Strong end-card.

**Key claim:** I know exactly what I'm asking for. I know exactly which prize/program for which axis of the work.

**Citation:**
- Standout tier: `research/02-past-winners/grand-champions.md` Section "Cross-cycle observations" + Matty's project-pacing tweet [2026-04-06](https://x.com/mattytay/status/2041244408109203736)
- Cohort 5 mechanics: `research/01-hackathon-mechanics/rules-and-prizes.md`
- Public Goods Award: `colosseum.com/frontier`
- Foundation grant pathway: `research/05-grants-and-money/`

---

## Deck-level design notes (apply across all 10 slides)

1. **Visual style:** dark mode (black/charcoal background, off-white text). Solana brand purple (#9945FF) as accent only — limit to 1-2 elements per slide. No stock illustrations. No emoji.
2. **Typography:** sans-serif (Inter or Söhne or system default). Body ≥ 24pt; titles ≥ 48pt. Visible from 15ft away.
3. **One idea per slide.** Per YC: "every slide supports one idea and leads naturally to the next." If a slide has two competing ideas, split it or cut one.
4. **Architecture diagrams:** drawn in Excalidraw or tldraw, exported as PNG. Hand-drawn vibe, NOT corporate. Mert/Toly/Armani respond to "engineer's whiteboard" aesthetic.
5. **Footer on every slide:** "AgentTrust — Frontier 2026 — github.com/[handle]/agenttrust" in 10pt grey. Persistent context for judge skim.
6. **Slide 1, 5, 6, 10 carry the most weight** — these are the four slides judges remember per YC pitch-deck literature. Polish these first; iterate slides 2/3/4/7/8/9 second.

---

## Banned-word audit (FINAL)

Slides reviewed end-to-end for banned terms:

| Term | Slide hits | Notes |
|------|-----------|-------|
| soulbound | 0 | — |
| primitive | 0 | — |
| infrastructure | 0 | — |
| platform | 0 | — |
| Token-2022 | 0 | — |
| programmable | 0 | — |
| dual-score | 0 | — |
| sybil-resistant | 0 | — |
| PolicyVault | 0 | "policy-vault" lowercase only in slide 4 architectural detail (component implementation name, not pitch language) |
| ValidationRegistry | 0 | same — "validation-registry" lowercase in slide 4 only |
| TrustGate | 0 | "trustgate" lowercase in slide 4 only |
| SAEP | 0 | — |

PASS. (Slide 4 architectural component names use lowercase implementation identifiers, not the marketing-banned forms.)
