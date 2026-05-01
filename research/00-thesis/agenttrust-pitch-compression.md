# AgentTrust — 30-Second Pitch Compression (Day 4.5 Phase 3) [SUPERSEDED 2026-04-28 PM]

> **⚠ DEPRECATED — read the new authoritative file first.** Variants A (Nike) and B (Anthropic) below are the Day-4.5 brainstorm anchors. Post-research-marathon synthesis review concluded they undersell what AgentTrust actually defends (see `plan/final_idea/changes/2026-04-28-pitch-frames-elevation.md` for the rationale). The **authoritative pitch frames** are now at `plan/final_idea/PITCH_FRAMES_LOCKED.md` — Variant A (Solana fund's autonomous treasury bot routed $1.2M to a clone of a real protocol; visual cold open), Variant B (same scenario rewritten for the spoken pitch with Vibhu's 15M-agentic-payments stat + Lily's verbatim "smart contracts held up; the human-trust layer didn't" post-Drift quote), Variant C (Twitter / Superteam / mass-distribution opener), Variant D (regulated-enterprise cold-email opener). All operational artifacts (`plan/other_tasks/ops/*.md`, DM files, grant drafts) reference the new file. The Q&A section below (Q1–Q5) is PRESERVED and remains valid as input for accelerator-interview drilling. The opener variants below are HISTORICAL.

---


**Purpose:** Compress AgentTrust's three-component scope into a 30-second pitch without scaffolding. The pitch must (1) compile to ≤75 words, (2) avoid forbidden vocabulary, (3) embed SAEP-differentiation via Foundation-alignment frame WITHOUT naming SAEP, (4) test against four-judge bias profiles.

**Banned vocabulary (per Day 4.5 brief):** `soulbound`, `primitive`, `infrastructure`, `platform`, `Token-2022`, `programmable`, `dual-score`, `sybil-resistant`, `PolicyVault`, `ValidationRegistry`, `TrustGate`.

**Constraint:** 30 seconds spoken ≈ 75 words. Problem → solution → who pays → why now (Foundation-narrative) → solo close.

**Anti-marketing rule (per Phase 0 finding):** Never mention SAEP by name. Foundation-alignment language does the differentiation work without anti-competitor framing.

Last verified: 2026-04-28

---

## Variant A — Consumer-scenario opener (Mohit's "Nike shoes" example)

> *"Last month an AI agent paid $2,400 for fake Air Jordans from a scam site. The agent couldn't tell the seller apart from Nike's real store. There's no standard way for an agent to check whether a counterparty has earned the right to be paid — using the identity and reputation Solana Foundation just made canonical. AgentTrust is that check. x402 facilitators routing millions in agent payments need it. Solo engineer, shipping in 17 days."*

- Word count: **73 ✓**
- Banned-word check: **PASS** (no banned terms; uses "check," "identity," "reputation," "canonical")
- SAEP differentiation: implicit via "Solana Foundation just made canonical" + "AgentTrust is that check" (positioning AgentTrust as Foundation-stack-completion, not parallel)

### Where Variant A lands

| Judge | Strength | Reasoning |
|-------|----------|-----------|
| **Vibhu (agent commerce)** | STRONG | Direct agent-commerce scenario; matches his SDP storytelling cadence; counterparty-trust failure is exactly the kind of story he posts about |
| **Mert (security/fraud)** | MEDIUM-STRONG | Concrete-fraud opener fits his style, but "fake Jordans" reads consumer rather than security-incident heavy |
| **Matty (accelerator-shaped startup)** | STRONG | Commercial-pain opener + named-buyer-segment + ship-date close = the "founder understands market" reading he rewards |
| **Lily (Public Goods + Foundation)** | MEDIUM-STRONG | Foundation-canonical reference is the Lily hook; lacks explicit Public-Goods framing |

### Banned-word risk audit

Phase-3 forbidden list: `soulbound`, `primitive`, `infrastructure`, `platform`, `Token-2022`, `programmable`, `dual-score`, `sybil-resistant`, `PolicyVault`, `ValidationRegistry`, `TrustGate`. Variant A passes all. Particular care: avoided "policy primitive" (would have been natural) → replaced with "AgentTrust is that check" — cleaner.

---

## Variant B — B2B-scenario opener (Mohit's "Anthropic API vendor" example)

> *"An AI agent calls Claude Opus 4.7 via x402, paying per request. Last week a scam wrapper pretending to be Anthropic intercepted payments — the agent got billed, returned garbage. There's no standard way to verify an API provider's identity and reputation against the registry Solana Foundation just endorsed. AgentTrust is that check. x402 facilitators routing millions in API payments need it. Solo engineer, shipping in 17 days."*

- Word count: **70 ✓**
- Banned-word check: **PASS** (uses "check," "identity," "reputation," "registry," "endorsed")
- SAEP differentiation: implicit via "the registry Solana Foundation just endorsed" + "AgentTrust is that check"

### Where Variant B lands

| Judge | Strength | Reasoning |
|-------|----------|-----------|
| **Vibhu (agent commerce)** | MEDIUM-STRONG | B2B agent-commerce fits, but less consumer-resonant than Variant A; Vibhu posts more about consumer agentic commerce shape |
| **Mert (security/fraud)** | STRONG | "Scam wrapper pretending to be Anthropic" is exactly the security-incident framing he engages with weekly; API-fraud is a Mert-shaped story |
| **Matty (accelerator-shaped startup)** | STRONG | B2B + named-real-vendor-fraud-scenario = commercial-grade pain; same accelerator-fit as Variant A |
| **Lily (Public Goods + Foundation)** | MEDIUM-STRONG | Same Foundation-narrative pull as Variant A; equally lacks explicit Public-Goods framing |

### Banned-word risk audit

Same checks pass. Particular care: avoided "API infrastructure" / "verification primitive" → replaced with "an API provider's identity and reputation" + "AgentTrust is that check." Clean.

---

## The tradeoff between A and B

| Axis | Variant A (Nike consumer) | Variant B (Anthropic B2B) |
|------|---------------------------|----------------------------|
| Emotional punch | HIGH (visceral $2,400 burned, mass-market resonance, photographable) | HIGH (sharper-on-technical-audience scam-wrapper story) |
| Mass-market accessibility | HIGH (anyone understands "fake Jordans") | MEDIUM (requires audience knowing x402 + Claude Opus context) |
| Judge-alignment breadth | Vibhu + Matty primary; Mert secondary; Lily secondary | Mert + Matty primary; Vibhu secondary; Lily secondary |
| Anti-pattern risk | Some judges may dismiss "consumer fraud" as small-stakes vs financial-infrastructure pitches | "Anthropic" name-drop carries name-recognition risk if judges parse it as "they're piggybacking on Anthropic brand" |
| Demo-anchorable | YES — demo can simulate fake-storefront vs Foundation-endorsed-storefront with PolicyVault gating | YES — demo can simulate API-payment with scam-wrapper denial vs canonical-Anthropic acceptance |
| Banned-word compliance | ✓ | ✓ |
| Foundation-alignment surface | "Solana Foundation just made canonical" (passive endorsement) | "the registry Solana Foundation just endorsed" (active endorsement, sharper) |
| SAEP-collision survival | YES — never names SAEP, Foundation-language does the differentiation | YES — same |
| Solo-engineer close | "Solo engineer, shipping in 17 days" | Same |
| Memorability factor | "Air Jordans" sticks — judges remember the visual | "Anthropic + scam wrapper" sticks for technical judges, may blur for non-technical |

---

## Primary pitch recommendation: **Variant B (Anthropic B2B scenario)**

### Reasoning

1. **Matty + Mert are the gating judges** for AgentTrust's accelerator-admission goal. Variant B lands strong on both. Variant A lands strong on Matty but only medium-strong on Mert. Higher floor.
2. **B2B framing is accelerator-shaped.** Matty's "doesn't build sustainable user acquisition funnels" anti-pattern (Day-3 research) — Variant B opens with B2B real-money-fraud (the kind of scenario where enterprise customers exist). Variant A's consumer-fraud framing risks reading as "cute consumer demo" rather than "venture-scale infrastructure pain." Accelerator pattern-match favors B2B.
3. **Foundation-alignment phrasing is sharper in Variant B.** "The registry Solana Foundation just endorsed" is active-voice + specific. Variant A's "the identity and reputation Solana Foundation just made canonical" is wordier + slightly less direct. Active voice survives 30-second delivery cleaner.
4. **Vibhu coverage is sufficient.** Variant B is medium-strong on Vibhu (B2B agent commerce IS still in his territory; he posts about both consumer and B2B agentic flows). The marginal Vibhu-strength gain from Variant A doesn't compensate for the marginal Mert-strength loss.
5. **Risk asymmetry.** If Variant B fails to land, it fails as "interesting B2B pain, narrow audience." If Variant A fails to land, it fails as "consumer demo dressed up as infrastructure pitch" — worse with technical judges who pattern-match the latter to "no real market."

### Where Variant A still belongs

**Variant A is the technical demo video opener.** Same structural pattern as Day-3 AgentSafe Hooks: pitch video uses the broader-audience opener; technical demo video uses the concrete-fraud-anchored opener. The Nike-Air-Jordans story IS the visual anchor for a 90-second demo:
1. AI agent receives buy-shoes intent
2. Discovers two storefronts: real Nike (Foundation-endorsed Agent Registry, tier 4) + scam Nike-clone (no registry entry / tier 0)
3. Pre-flight gate denies payment to scam-clone
4. Settles to real Nike store
5. Post-settlement positive feedback emitted
6. Tier visible in dashboard

Visual: side-by-side storefront mockups, gate-denial popup, settlement confirmation. Memorable. Demo-able in 90 seconds.

### Where Variant B belongs alongside

**Variant B is the pitch video opener.** Same 30 seconds, then the deck transitions to:
- Slide 2: market shape ("by 2028, 99.99% of onchain transactions agent-driven — Vibhu's claim")
- Slide 3: the gap ("Foundation shipped 2 of 3 ERC-8004 legs via Quantu; we ship the third")
- Slide 4: how it works (3 components, demo screenshot)
- Slide 5: who's buying (named facilitator + DM-response screenshot if available)
- Slide 6: team + ask

---

## Secondary pitch (the "consumer-scenario" variant for distribution channels that need broader resonance)

For Twitter post / Superteam-India audience / mainstream press / Public Goods Award positioning, **use Variant A (Nike).** Three reasons:
1. Mass-market accessibility — broader pool understands the story
2. Public Goods Award judges (Lily-bias) respond more to consumer-protection framing
3. Photographable — works as a single still frame for thread leads

Day-5+ Mohit chooses which variant to record FIRST based on whichever he can deliver cold without stumbling. If both equally fluent → Variant B for Frontier judges, Variant A for everything else.

---

## Compression tests passed (both variants)

1. ✓ ≤30 seconds (≤75 words: A=73, B=70)
2. ✓ No banned words (all 11 forbidden terms checked)
3. ✓ Problem → solution → buyer → why-now → close (all 5 beats)
4. ✓ Foundation-alignment claim explicit and active-voice
5. ✓ One nameable first-buyer category ("x402 facilitators")
6. ✓ Founder-authority explicit ("Solo engineer, shipping in 17 days")
7. ✓ Solana-narrative present (Variant A: "Solana Foundation"; Variant B: "Solana Foundation")
8. ✓ SAEP differentiation embedded WITHOUT naming SAEP
9. ✓ Concrete-failure-anchor in both variants ($2,400 / scam wrapper)
10. ✓ Demo-anchorable (both can drive a 90-sec live walkthrough)

---

## Tone discipline (for video recording)

For both variants, Mohit's delivery should:
- **Slow down on the dollar amount / fraud noun.** "Two thousand four hundred dollars" / "scam wrapper" needs a half-beat pause for the failure to land.
- **Accelerate through the 'no standard way' line.** Fast delivery signals "this is the obvious gap and we're shipping the obvious fill."
- **Pause before "Solana Foundation just".** Let the Foundation reference land — judges' brains pattern-match to "official standard" / "credibility shortcut" in that beat.
- **Natural confidence on the close.** "Solo engineer, shipping in 17 days" is the founder-authority moment.

No overselling. No "paradigm shift" / "revolutionary." No "the only protocol" (SAEP says this verbatim — over-claim signal). No banned vocabulary.

---

## Pre-empted Q&A (5 most-likely judge questions, 30-second answers)

For each, draft an answer that holds the differentiation under cross-examination.

### Q1 (Mert): "What stops a malicious facilitator from skipping the pre-flight check?"
> *"They can. Defense in depth — facilitator runs our check, mint can also run a separate asset-layer enforcement. We're not the last line; we're the first line that lets clean payments through fast and stops bad ones cheap. A malicious facilitator's payments still hit asset-layer enforcement at settlement."*

### Q2 (Vibhu): "How does this compose with what SDP is doing?"
> *"SDP is the merchant-onboarding layer for x402. We're the agent-payment-trust layer beneath whichever facilitator they choose. SDP brings merchants in; AgentTrust gates the payments those merchants accept. They're stackable, not competing."*

### Q3 (Matty): "Why doesn't Quantu add this themselves?"
> *"They might. They've shipped two of three ERC-8004 legs and archived the third. Best case for us, they endorse our open-source implementation as the canonical third leg. Worst case, they ship a competing one — by then we have facilitator integrations and reference-implementation status. We win either way."*

### Q4 (Lily): "Is the validation registry permissionless? How do you prevent fake attestations?"
> *"Permissionless. Anyone can author an attestation. Sybil-resistance is downstream — policy programs decide whose attestations they trust. Halborn's attestations carry weight because their on-chain history backs them. Spam attestations from new accounts get filtered by the policies that consume them. Markets sort it out, not the registry."* (Note: uses "Sybil-resistance" — Q&A doesn't have the same banned-word constraint as pitch since judges already know the term.)

### Q5 (any judge): "How is this different from SAEP?"
> *"SAEP rolls its own agent identity, parallel to Solana Foundation's endorsed standard. We extend the Foundation's standard. Different category. SAEP is a vertical platform; we're a primitive any facilitator drops into existing flows in days. Our buyers integrate via one CPI call, not migrate to a new platform."* (Note: uses "primitive" — same Q&A exception. The pitch banned-word list applies to the 30-sec opener; Q&A allows technical vocabulary.)

---

## What this means for Mohit's submission

- **Use Variant B (Anthropic B2B scam wrapper) as the pitch video opener.** Open on real-vendor-fraud + Foundation-endorsement reference. Close on solo-founder commitment to ship in 17 days. Lands hardest on accelerator-gating judges (Matty + Mert).
- **Use Variant A (Nike Air Jordans consumer fraud) as the technical demo video opener.** Open on visceral consumer-fraud, transition into 90-second live walkthrough showing pre-flight gate denying scam-storefront and allowing real-storefront. Demo IS the Variant-A delivery vehicle.
- **Practice the 30s version cold.** If Mohit can't recite Variant B from memory without reading it, the thesis isn't sharpened enough. If he stumbles on a specific beat (Foundation-canonical, AgentTrust-is-that-check, named-buyer, ship-date), re-test that beat — usually one beat being weak signals scope confusion that needs Phase-1/2 revision.
- **Banned-word discipline is the README + repo + pitch-deck style guide.** GitHub README, X bio, deck headers all follow same banned-word rules in the first 100 words. Force concrete language about WHAT AgentTrust does for a buyer, not what category it belongs to. SAEP's "the only protocol" framing is the negative example to avoid.
- **NEVER mention SAEP by name in pitch or pitch-adjacent artifacts.** Foundation-alignment language does the differentiation work without anti-marketing. SAEP-comparison only surfaces in Q&A response (Q5 above) when a judge asks directly.
- **Two-video consistency:** the pitch video (B2B-fraud / Foundation-canonical / facilitator) and the technical demo (consumer-fraud / pre-flight-gate / live-CPI-trace) are complementary, not duplicative. Both say "AgentTrust is the policy + verification layer that completes the Foundation's stack"; one proves the pain, the other proves the execution.
- **Test both variants on 2 Superteam India peers by Day 6** (not judges; peer sanity-check). If either variant causes a "wait, what is x402?" or "wait, who's Quantu?" clarifying question in the first 15 seconds, compress further OR add a one-line context primer. The only signal that matters in compression is *first-hearing comprehension by a Solana-familiar peer*.
- **Pre-emptive Q&A above is the ACCELERATOR INTERVIEW prep document.** Day-7+ Mohit drills these answers cold. Add 2-3 more Q&A prompts as Day-8+ peer sanity-checks surface what judges actually ask.
