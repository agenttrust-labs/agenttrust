# Colosseum Accelerator — AgentTrust Application Draft

> **🔧 AI APPLY-TIME DIRECTIVE.** Read `plan/other_tasks/grants/GRANT_APPLICATION_DISCIPLINE.md` end-to-end FIRST.
>
> **THIS IS NOT A FORM APPLICATION.** This is interview prep. Auto-triggered by any Frontier prize win (Standout / Public Goods / Grand). The 11 grant-discipline rules apply differently — interviews are spoken Q&A, not paste-into-form text.
>
> **Most-load-bearing rules for THIS interview:**
> 1. Rule 4 — builder voice in spoken delivery; rehearse Variant B + Q&A cold
> 2. Rule 2 — citation discipline still applies (drop dates + URLs naturally in spoken answers; Matty fact-checks)
> 3. Rule 5 — never telegraph internal risk in interview ("we might fail Day 12" → don't say it; redirect to "the cut-priority order pre-decided each cut")
> 4. Rule 7 — KPI is your post-cohort venture-shape metric (cohort exit → revenue → seed)
>
> **Grant-specific gotchas:**
> - **Q&A vocabulary is FREE** (banned-vocab rules apply only to pitch openers, not to Q&A answers — feel free to say "primitive" / "infrastructure" in technical Q&A).
> - **Matty Taylor leads.** His signal pattern: named-buyer + ship-cadence + Foundation-credibility = accelerator-shaped. Drill these three answers cold.
> - **Cohort 5 = $250K pre-seed at industry-standard equity terms (~7-10%).** Decide your equity-comfort line BEFORE the interview.
> - **SF relocation expectation.** If you can't move, say so upfront; don't waste their time.
> - **Frontier prize win is the gating event.** If no prize, downgrade tier to "follow-up post-Foundation-grant + post-Mert-deck-review" and re-engage Q3 2026.

**Source:** [colosseum.com/accelerator](https://colosseum.com/accelerator)
**Investment size:** $250,000 pre-seed per team (industry-standard ~7-10% equity expected, exact terms not publicly disclosed)
**Cohort size:** 10+ teams per cycle
**Total cohort pool:** $2.5M+ ([mattytay 2026-03-24](https://x.com/mattytay/status/2036521675098136763): *"We plan to invest a minimum of $2.5 million in winners"*)
**Eligibility:** ALL Frontier prize winners (Grand Champion + 20 Standouts + Public Goods + University) are auto-interviewed. Selection criterion: *"intent and ability to build full-time"*; SF relocation expectation
**Status:** GATED by Frontier prize win — no separate application
**Decision timeline:** Cohort 5 selection post-Frontier-results (mid-June 2026 expected); program runs ~July–October 2026 in San Francisco
**Reviewer profile:** Matty Taylor (Colosseum lead), David Kanter, Cohort 4 alumni network as informal reference checks
**Frontier results window:** 2026-05-25 expected announcement

---

## Strategic framing

There is no "apply for the accelerator" path separate from winning the Frontier hackathon. The Frontier submission IS the accelerator application. This draft prepares the **post-Frontier-prize interview** — what Mohit walks into the Colosseum interview room with.

**Auto-interview triggers:** Frontier Standout ($10K × 20 winners) OR Frontier Public Goods ($10K) OR Frontier Grand Champion ($30K) OR Frontier University Award ($10K, but Mohit ineligible). Per `research/01-hackathon-mechanics/rules-and-prizes.md` Section 8, all prize winners get accelerator interviews.

**Interview style (from Cohort 4 alumni recon + Matty's public posts):** ~30-45 min video call with Matty + 1-2 cohort members. Pitch-30s + Q&A; assesses founder authority, full-time commitment intent, SF-relocation willingness, market understanding, post-hackathon roadmap.

**Pitch posture:** founder-market-fit emphasis. Variant B (Anthropic B2B) opener. Ship-cadence proof (3 Anchor programs solo in 17 days). Foundation-alignment as the credibility shortcut. Named-buyer (x402 facilitator) + facilitator-quote (post-Day-12 if outreach lands). Clear path from $250K pre-seed to seed round.

---

## Pre-interview prep document

### What Matty + cohort interviewers will probe

Per `research/01-hackathon-mechanics/judges-and-bias.md` Day-3 analysis of Matty's signal pattern, the interview will test:

1. **Founder-market fit** — why Mohit specifically (not anyone else) builds AgentTrust. Why now in his career arc.
2. **Full-time commitment** — is Mohit moving to SF? Is he leaving any job? What's his runway?
3. **Distribution / GTM clarity** — who is the named first buyer? Is there a customer quote? Pipeline?
4. **Post-hackathon roadmap** — 6-month, 12-month, 24-month plan. What does $250K unlock?
5. **Market sizing** — TAM credibility. Why is this not a small niche?
6. **Competitive defensibility** — moat after open-source release. Why does AgentTrust win against future entrants?
7. **Technical depth** — can Mohit explain `gate_payment` composition to a technical interviewer in 60 seconds?

### 30-second elevator (interview opener — Variant B adapted)

> *"Solana processed fifteen million agent-driven payments last quarter. As volume rose, so did counterparty fraud — last week a treasury bot routed one-point-two million USDC to a clone of a real Solana protocol. Smart contracts held up; the human-trust layer didn't. There's no on-chain check that gates payments on counterparty identity and reputation against the registry Solana Foundation just endorsed. AgentTrust is that check. x402 facilitators routing this volume need it. Three Anchor programs, all shipped in 17 days. Solo engineer, full-time on Solana since Day 1 of Frontier."* (Variant B per `plan/final_idea/PITCH_FRAMES_LOCKED.md`.)

### Answers to the 7 probable interview questions

#### Q1 (Matty): "Why are you the right person to build this?"

> "I'm a senior Solana / Rust / Anchor engineer building solo for Frontier. I made a deliberate choice to compress 3 components into 17 days because the technical depth is what differentiates this submission — formally-verified policy logic, manual cross-program PDA deserialization against Quantu's `agent-registry-8004` and `atom-engine`, x402-spec-compliant facilitator integration. Frontier is the validation step that proves I can ship at this depth solo. AgentTrust isn't my side project; it's the thing I want to spend the next 5 years on."

#### Q2 (Matty): "Are you full-time on this? Will you move to SF?"

> "Full-time. Operating at 40+ hrs/week through Frontier and post-Frontier. I'm based in India today; the SF accelerator move is what I've been building toward. I've talked to NeosLegal about C-corp incorporation post-acceptance and have the pipeline ready. The operational question is when, not whether."

#### Q3 (Matty): "Who's your first paying customer? Have you talked to facilitators?"

> "x402 facilitators are the buyer category. Top targets in priority order: Dexter (`@dexteraisol`), atxp_ai, MCPay (Cypherpunk-stablecoins-track winner). I sent DMs Day 5–7 of the build phase. [Mohit: insert any actual responses here. If a facilitator agreed to integrate or evaluate, this is the load-bearing answer to this question. If no responses landed, frame as: 'Outreach is ongoing; the drop-in TS module `mountTrustGate(app, config)` makes integration a 1-day lift, which is the unlock that converts cold facilitator outreach.']"

#### Q4 (Matty): "What does $250K + 12 weeks in SF unlock for you?"

> "Three things. (1) Three full-time engineering hires to ship v1.1: stake-weighted attestor sybil resistance, slashing for fraudulent attestations, on-chain dispute arbitration. v1 ships permissionless + downstream-consumer-filtering only; v1.1 is the enterprise-grade trust layer that x402 facilitators upgrade to. (2) Audit + bug bounty program. Halborn or OtterSec audit is ~$50K-$80K for a Solana program of this size; the bounty pool funds Code4rena or Cantina hosting. (3) Founding-customer co-marketing with 2-3 facilitators. Case studies that turn Frontier-Standout-credibility into seed-round-narrative."

#### Q5 (Matty): "Why does this not get commoditized when 5 competitors enter?"

> "Three moats. (1) Foundation-alignment narrative. AgentTrust is the canonical implementation that completes the Foundation's ERC-8004 trust stack. Competitors entering 6 months later face the 'why are you a parallel implementation when AgentTrust is already integrated' problem. (2) Drop-in distribution moat. `mountTrustGate(app, config)` is the integration unlock — by the time competitors enter, AgentTrust has 5+ facilitator integrations in production. Switching cost matters. (3) Network effects on the attestor side. Halborn / OtterSec / Civic / Sumsub onboarded as named attestors create a registry that's more valuable to the next attestor than any greenfield alternative. Cold-starting an attestor registry is hard; AgentTrust is past the cold-start."

#### Q6 (Matty): "Is the open-source play sustainable? How do you make money?"

> "Three layers. PolicyVault + ValidationRegistry + TrustGate Anchor programs are MIT-licensed pure public goods — these aren't the revenue layer. TrustGate-enterprise (hosted facilitator service, SLA-backed, with concierge integration support) is the commercial layer. Pricing model: per-transaction fee + monthly SLA tier. Revenue projection: 5 facilitator customers × $5K MRR = $25K MRR by Month 12 baseline. Foundation convertible-grant structure (separate $35K application filed Day 18) is the public-goods funding layer; revenue from TrustGate-enterprise SaaS is the commercial layer. Both stack."

#### Q7 (Matty): "What's the 12-month picture if you get accepted?"

> "Month 1-3 (SF cohort): finalize v1.1 with stake-weighted attestor sybil resistance + slashing. Ship audit. Land 5 facilitator integrations in production. Prep seed-round deck.
> Month 4-6: $2-3M seed round on the back of cohort + cohort demo day exposure. Hire 2-3 engineers. Ship cross-chain validation portability spec (RFC) for Solana ↔ EVM ERC-8004 capability hash compatibility.
> Month 7-12: TrustGate-enterprise hosted-facilitator service in production. 10-15 facilitator integrations. Revenue ramp to $25K MRR. Ship v2.0 with enterprise-grade SLA + multi-region. Position for Series A late 2027.
> The accelerator unlocks Month 1-3; everything else compounds from there."

### Slides to prep (interview deck — 6 slides)

The Colosseum interview is more conversation than presentation but a 6-slide visual aid lands well:

| Slide | Content |
|-------|---------|
| 1 | **Title:** AgentTrust completes Foundation's ERC-8004 trust stack. One-line pitch. Variant B opener as a quote at bottom |
| 2 | **The pain:** $2,400 fake-Air-Jordans story OR scam-wrapper-Anthropic story (whichever lands harder in the moment). Concrete-failure-anchor with a number |
| 3 | **The 3 components:** PolicyVault + TrustGate + ValidationRegistry diagram. Foundation-endorsed agent-registry-8004 in the middle. AgentTrust components surround it |
| 4 | **What's shipped (Frontier proof):** 3 Anchor programs mainnet-deployed, 5 Kani FV proofs green, drop-in SDK on npm, demo video. Solo, 17 days. GitHub stars + commit graph as visual proof |
| 5 | **Named buyer + buyer-quote (if obtained Day 12+):** "x402 facilitators integrate `mountTrustGate(app, config)` in one line." Logo wall: Dexter / atxp_ai / MCPay. Quote from facilitator if available |
| 6 | **Ask + plan:** "$250K accelerator + SF cohort. Month 1-3 hire 3 engineers. Month 4-6 seed round. Month 7-12 TrustGate-enterprise SaaS in production." End with Foundation-alignment line as the final word |

---

## Interview prep — Day 18-20 (post-Frontier-deadline) actions

1. **Day 18-20 (2026-05-12 to 2026-05-14):** rest + decompress from Frontier sprint. Don't burn out before the interview.
2. **Day 21 (2026-05-15):** Mert deck review submission (via Helius Pro support) — feedback on Slides 1-6 lands by Day 25-28.
3. **Day 22 (2026-05-16):** record 30-second elevator pitch on phone, watch back, refine. Practice cold-recital 10x. If Mohit can't recite Variant-B-cold without stumbling on Day 22, the thesis isn't sharp enough — re-read `research/00-thesis/agenttrust-pitch-compression.md`.
4. **Day 23 (2026-05-17):** drill the 7 Q&A above. 60-second answers, no rambling. Test on a Superteam India peer or any technical friend.
5. **Day 24-30:** monitor Frontier-results window. Frontier results expected 2026-05-25. If prize wins, accelerator interview email within 7 days.
6. **Day 30+ (post-results):** if accelerator interview scheduled, do the Q1-Q7 prep again the day before. Also prep 3-5 questions FOR the interviewer (cohort culture, mentor access, follow-on funding pattern).

---

## Personalization gaps Mohit must fill

- [Mohit: confirm full-time intent + SF relocation timeline before interview]
- [Mohit: insert any actual facilitator response/integration evidence post-Day-12]
- [Mohit: insert prior Solana / open-source work concrete examples for Q1 founder-market-fit answer]
- [Mohit: confirm $250K allocation if specifics differ from $50K hires + $80K audit + $7K bounty + $113K runway]
- [Mohit: research Cohort 4 alumni for cold-DM warm-up before interview — find 1-2 alumni who built infrastructure / agent-related projects + DM them for cohort-culture insight]

---

## Decision-makers / reviewer profiles

- **Matty Taylor** — Colosseum lead. X handle: `@mattytay` ([x.com/mattytay](https://x.com/mattytay)). Interview lead. Day-22 x-recon: read his last 30 days of posts to surface his current signal pattern (likely: agent-economy / x402 / Foundation-alignment / accelerator-shaped pitches).
- **David Kanter** — Colosseum cofounder; secondary interviewer / reference reader.
- **Cohort 4 alumni** — informal reference checks. Mercantill (enterprise banking infra for AI agents) is the closest comp. Cold-DM Mercantill founder for cohort culture intel.

---

## Standing-rule compliance checklist

- [ ] Never names SAEP — confirmed throughout
- [ ] Foundation-alignment language explicit in opener, Q1, Q5, slide 1, slide 3
- [ ] Variant B elevator pitch adapted, not copied
- [ ] All Frontier-related claims cite `research/01-hackathon-mechanics/rules-and-prizes.md` derivation
- [ ] Concurrent applications (Foundation grants, India grant, CDP, etc.) disclosed if asked
- [ ] No hedging vocabulary
- [ ] Full-time commitment + SF relocation explicit (Q2)
