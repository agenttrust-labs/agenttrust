# Frontier Hackathon — Public Goods Award + Standout Award (combined submission strategy)

> **🔧 AI APPLY-TIME DIRECTIVE.** Read `plan/other_tasks/grants/GRANT_APPLICATION_DISCIPLINE.md` end-to-end FIRST. Apply all 11 rules.
>
> **NOT A SEPARATE FORM.** Public Goods + Standout are awarded from the SAME single Frontier submission via the Colosseum portal. The "application" is your Frontier submission package itself: pitch video, technical demo, GitHub repo, deck.
>
> **Most-load-bearing rules for THIS submission:**
> 1. Rule 1 — Frontier portal fields are the FORM surface; the GitHub repo + deck + pitch video are the DRIVE surface (depth lives there)
> 2. Rule 4 — builder voice in pitch video script + README opener (no em-dashes, no robot bullet lists)
> 3. Rule 5 — strip internal-risk telegraphs from pitch video / deck / README (the cut-priority order stays in private planning)
> 4. Rule 6 — Frontier portal one-liner ≤150 chars same constraint
> 5. Rule 9 — verifiability anchor MUST be in README opener; reviewers verify in 30 sec
> 6. Rule 10 — citation block reused verbatim; Lily quote + Vibhu stat + Quantu archive in pitch script
>
> **Grant-specific gotchas:**
> - **Submission is single-portal at arena.colosseum.org/register.** Public Goods + Standout judged from same pool. README must explicitly frame Public-Goods qualification (MIT + permissionless + Kani as reusable references) per Rules §8(e).
> - **3-min pitch video is the load-bearing artifact.** Variant B opener locked in `plan/final_idea/PITCH_FRAMES_LOCKED.md` — drill cold.
> - **2-3 min technical demo is required.** Variant A opener (treasury-bot/clone scenario). Per `plan/other_tasks/ops/technical-demo-script.md`.
> - **Submit Day 16 (2026-05-10), 24h before deadline.** Portal traffic spikes pre-deadline.
> - **Cross-check `rules-and-prizes.md` Section 7 disqualifier list before submitting** (missing access permissions, over-length video, no why-Solana, pre-existing product).
> - **Set ALL artifacts (Slides, videos, repo) to public/Anyone-with-link.** Forgotten access = auto-rejection per Colosseum data.

**Sources:**
- Official Rules PDF: [colosseum.com/legal/Solana Frontier Hackathon Rules.pdf](https://colosseum.com/frontier)
- Cross-reference: `research/01-hackathon-mechanics/rules-and-prizes.md` Section 10 (verbatim rules quoted)
- Submission portal: [arena.colosseum.org](https://arena.colosseum.org/register)

**Prize structure (verbatim Section 14):**
- (a) Grand Champion: **$30,000 CASH-SPL**
- (b) Public Goods Award: **$10,000 CASH-SPL**
- (c) University Award: **$10,000 CASH-SPL** (Mohit ineligible — solo + non-student)
- (d) Standout Awards: **$10,000 CASH-SPL × 20 teams** ($200K total pool)
- Accelerator (post-prize-win): $250K pre-seed × 10+ teams ($2.5M+ total pool)

**Eligibility (verbatim Section 8(e)):** *"Open-source: Is this Project Submission open-source? How well does the Project Submission compose with other primitives in the Solana ecosystem?"*

**Bundling rule (verbatim Section 7):** *"Entrant may only be a Member of one (1) Team. A Team may only submit one (1) Project Submission at a time."*

**Status:** OPEN until **2026-05-11**
**Decision timeline:** 2026-05-25 expected results announcement
**Reviewer profile (per `judges-and-bias.md`):** Lily Liu (Public Goods bias — Foundation president), Vibhu Norby (agent commerce — Solana Foundation CPO), Mert Mumtaz (security/fraud — Helius CEO), Matty Taylor (accelerator filter — Colosseum lead) + ~36 additional judges from ecosystem partners

---

## Strategic framing

**One submission, two prize categories.** Per `rules-and-prizes.md` Section 10, Frontier rules don't preclude one submission winning both Public Goods + Standout. Cypherpunk precedent (Samui Wallet won Public Goods; was also Standout-tier consideration) supports stacking. Frontier-Day-4 Discord ask hasn't been resolved as exclusive vs. stackable; treat as stackable until proven otherwise.

**Primary prize target ranking:**
1. **Public Goods Award ($10K)** — highest-probability win because AgentTrust is structurally a public-good (MIT-licensed across all 3 programs + permissionless ValidationRegistry attestor model + 5 Kani FV proofs as reusable references). Lily Liu is the gating Foundation-aligned judge and the Variant B pitch + ERC-8004 completion narrative is dead-center for her bias profile.
2. **Standout Award ($10K)** — 1-in-20 win within a ~400-submission pool. AgentTrust's Variant B pitch + Foundation-alignment + 3-Anchor-program ship-cadence + named-buyer (x402 facilitator) lands all 4 gating judges with at least medium-strong score per `THESIS_LOCK.md`.
3. **Grand Champion ($30K)** — designed-against, not designed-for. AgentTrust's Foundation-alignment narrative is too infrastructure-shaped for Grand Champion's typical shape (consumer app or breakout product per Cypherpunk's Unruggable hardware-wallet win). If Grand lands, it's bonus; not the optimization target.
4. **Accelerator interview** — gated by ANY of the above prize wins; auto-trigger.

**Pitch posture for the submission:**
- **README leads with Foundation-alignment narrative** — the load-bearing line: *"AgentTrust completes the Foundation's ERC-8004 trust stack — the third leg Quantu archived in v0.5.0, fully productized."*
- **Pitch video opens with Variant B (Solana fund treasury-bot routed $1.2M USDC to a clone of a real Solana protocol; Lily's "smart contracts held up; human-trust layer didn't" verbatim)** — lands strongest on Mert + Matty + Lily + Vibhu per `plan/final_idea/PITCH_FRAMES_LOCKED.md`
- **Technical demo opens with Variant A (same treasury-bot/clone scenario, visual cold open)** — visual demo anchor, drives the side-by-side gate_payment denial + acceptance walkthrough
- **Public Goods framing in Slide 5 of deck** — explicit MIT license + permissionless attestor model + Kani FV reusability
- **Closing line of pitch video:** *"Solo engineer, shipping in 17 days. Open source. Foundation-aligned. AgentTrust completes the trust stack."*

**Standing rule:** never name SAEP in pitch / deck / video / README. Foundation-alignment language does the differentiation work.

---

## Submission components — what goes in the Frontier portal

Per `research/01-hackathon-mechanics/rules-and-prizes.md` Section 5, every submission must include:

### 1. GitHub repository (the code)

URL: [Mohit: insert your repo URL]

Required README structure (preflight checklist):
- [ ] Lead line: *"AgentTrust completes the Foundation's ERC-8004 trust stack — the third leg Quantu archived in v0.5.0, fully productized."*
- [ ] One-paragraph project description (≤150 words)
- [ ] 3-component architecture diagram link to `docs/ARCHITECTURE.md`
- [ ] Quick-start: `pnpm i && cargo build-bpf && anchor deploy --provider.cluster mainnet-beta`
- [ ] Links to 3 program directories with one-line summaries each
- [ ] Drop-in SDK install: `npm install @agenttrust/trustgate`
- [ ] Mainnet program IDs (post-Day-16 deployment)
- [ ] License: MIT (workspace root)
- [ ] Public-Goods-Award framing section: *"AgentTrust qualifies for Frontier's Public Goods Award via: MIT license across all programs + workspace; permissionless ValidationRegistry attestor model; 5 Kani formal-verification invariants as reusable correctness references for any Solana program author; ValidationRegistry as Quantu-archived productization."*
- [ ] Twitter / X link to project handle
- [ ] Pitch video link
- [ ] Technical demo video link
- [ ] Pitch deck link (Google Slides or PDF)

Repo content checklist (must be present):
- [ ] All 3 Anchor programs in `programs/` (policy-vault, trustgate, validation-registry)
- [ ] TypeScript workspace in `trustgate/server/` and `trustgate/sdk/`
- [ ] Kani proof harnesses in `policy-vault/proofs/` (5 files, all proving green)
- [ ] `docs/COMPLETING-THE-TRUST-STACK.md` — narrative artifact
- [ ] `docs/ARCHITECTURE.md` — 3-component diagram + CPI flow
- [ ] `docs/CAPABILITY-NAMESPACES.md` — 10 v1 namespaces seeded
- [ ] `docs/ATTESTOR-ONBOARDING.md` — 5 named attestor integration guide
- [ ] `docs/INTEGRATION-FACILITATOR.md` — drop-in TS module guide
- [ ] `docs/SECURITY.md` — Kani harness + threat model + audit roadmap
- [ ] `docs/PINNED-VERSIONS.md` — commit hashes for agent-registry-8004 + atom-engine
- [ ] `LICENSE` — MIT
- [ ] CI passing: `anchor-build.yml`, `anchor-test.yml`, `kani-prove.yml`, `ts-test.yml`
- [ ] Demo agents pre-warmed on mainnet (5 agents, tier ≥2 by Day 12 per `THESIS_LOCK.md`)

### 2. Pitch video (≤3 min)

Format: Loom recommended. Tone: concise, substance over flash, no buzzword stuffing.

**Required content elements (from rules-and-prizes.md Section 5b):**
- Team background (founder-market fit) — 15s
- Problem statement + target user — 25s
- Personal motivation for building — 15s
- Market opportunity — 25s
- User acquisition / traction strategy — 25s
- Live product demo segment ("aha moment") — 60s
- Closing — 15s

**Variant B pitch video script (target 2:30 of the 3:00 max):**

> [0:00-0:15] *"Founder intro: Solo Solana / Rust engineer, India-based, 1 year in Web3, full-time on AgentTrust through Frontier."*
>
> [0:15-0:45] *"Solana processed fifteen million agent-driven payments last quarter. As volume rose, so did counterparty fraud — last week a treasury bot routed one-point-two million USDC to a clone of a real Solana protocol. Smart contracts held up; the human-trust layer didn't. There's no on-chain check that gates payments on counterparty identity and reputation against the registry Solana Foundation just endorsed. AgentTrust is that check."* (Variant B per `plan/final_idea/PITCH_FRAMES_LOCKED.md`.)
>
> [0:45-1:00] *"The buyer is x402 facilitators routing millions in API payments. Solana Foundation joined Linux Foundation's x402 Foundation in April 2026. The trust-stack gap is acknowledged; the buyer category is named; the timing window is now."*
>
> [1:00-2:00] **LIVE DEMO segment** — `gate_payment` invocation showing tier-3 facilitator payment Allow vs. tier-0 scam-wrapper payment Deny. Mainnet RPC trace + reason code. 90 seconds, screen-recorded.
>
> [2:00-2:30] *"Three Anchor programs, all shipped. PolicyVault with 5 policy kinds + 5 Kani formal-verification proofs. TrustGate as x402-spec-compliant facilitator integration kit with drop-in TS module. ValidationRegistry as the third ERC-8004 leg Quantu archived in v0.5.0, fully productized. MIT-licensed, Foundation-aligned, open-source. Solo engineer, shipping in 17 days. AgentTrust completes the trust stack."*

[Mohit: record Day 14-15. Re-record until Variant B opener is fluent without stumble. Friend-team available for video work per Day-5 confirmation action.]

### 3. Technical demo video (2-3 min)

**Required content (per Section 5c):** core features + tech stack + architecture decisions; **must explicitly explain why Solana**; how Solana-specific primitives are used; reasoning behind architectural choices.

**Variant A (Solana-fund treasury-bot/clone) opener — visual anchor demo:**

> [0:00-0:30] *"Last month a Solana fund's autonomous treasury bot routed $1.2M USDC to a clone of a real protocol. Funds gone. Watch what AgentTrust does instead. Setup: treasury bot has a $1.2M USDC rebalance intent. Two counterparties — canonical (Foundation-endorsed Agent Registry, tier 3) and a clone (no registry entry, tier 0)."*
>
> [0:30-1:30] **LIVE TRACE:** treasury bot routes payment to clone → `gate_payment` invocation → CounterpartyTier policy reads `AtomStats.trust_tier == 0` from atom-engine PDA → returns `Deny(InsufficientTier)`. Then bot routes payment to canonical → `gate_payment` returns `Allow` → settlement → `give_feedback` CPI emits positive score → agent-registry-8004 reputation updated.
>
> [1:30-2:30] **Architecture walkthrough:** 3 Anchor programs + drop-in TS module. PolicyVault PDAs. TrustGate PDA-signed CPI for feedback emission. ValidationRegistry's permissionless attestor model. Manual cross-program PDA deserialization to Quantu's `agent-registry-8004` and `atom-engine`. Kani FV harness running green in CI.
>
> [2:30-3:00] **Why Solana:** 400ms finality + sub-cent fees make pre-flight gating economically viable. ATOM Engine reputation primitives are Solana-native. Foundation endorsement of `agent-registry-8004` makes AgentTrust an extension, not a parallel implementation. No EVM equivalent exists.

[Mohit: record Day 14-15.]

### 4. Pitch deck (Google Slides or PDF) — 8-10 slides

Slide structure (load-bearing for Public Goods + Standout judging):

| # | Slide | Content |
|---|-------|---------|
| 1 | **Title** | "AgentTrust completes Foundation's ERC-8004 trust stack." Variant B quote. Founder name + Twitter handle |
| 2 | **The pain** | Variant B scenario as a quote. "Last week a treasury bot routed $1.2M USDC to a clone of a real Solana protocol. Smart contracts held up; the human-trust layer didn't." Concrete dollar figure + Lily's verbatim post-Drift quote |
| 3 | **The 3 components** | PolicyVault + TrustGate + ValidationRegistry diagram. Foundation-endorsed agent-registry-8004 in the middle. |
| 4 | **What's shipped (Frontier proof)** | 3 Anchor programs mainnet, 5 Kani FV proofs green, drop-in SDK published, demo video. Solo, 17 days. GitHub commit graph |
| 5 | **Public Goods qualification** | MIT license; permissionless attestor model; Kani FV proofs as reusable references; ValidationRegistry productizing Quantu's archived v0.5.0 |
| 6 | **Named buyer + buyer-quote (if obtained)** | "x402 facilitators integrate `mountTrustGate(app, config)` in one line." Logo wall: Dexter / atxp_ai / MCPay / PayAI / T54. Quote from facilitator if available |
| 7 | **Why now (the timing thesis)** | Solana Foundation x402 Foundation membership Apr 2026; Foundation x402 gateway announcement Mar 2026; 35M+ x402 transactions on Solana. The trust-stack gap is acknowledged |
| 8 | **Roadmap + ask** | v1 shipped (Day 17). v1.1 = stake-weighted attestor sybil resistance + slashing. v2.0 = TrustGate-enterprise SaaS + cross-chain. Foundation grant filed Day 18. Accelerator interview pipeline open if prize wins |
| 9 | **Why solo + why now in my career** | Founder-market-fit. Senior Solana / Rust / Anchor engineer. Full-time on AgentTrust. India → SF post-cohort if accelerator extends offer |
| 10 | **Closing — Foundation-alignment line** | "AgentTrust is the canonical implementation that completes the trust stack the Foundation endorsed but didn't fully ship." Twitter handle + GitHub URL + email |

[Mohit: ensure judges have access to the Google Slides URL. Forgotten access permissions are the #1 recurring submission mistake per Colosseum.]

### 5. Optional but strongly encouraged

- **Project Twitter / X account** — created Day 5. Bio: *"Building AgentTrust — completing the Foundation's ERC-8004 trust stack. Solo @ Frontier 2026."* By Day 17, target 100+ followers from Day 5-15 build-in-public posts.
- **User feedback evidence** — facilitator DM screenshots if any responded (Dexter, atxp_ai, MCPay, PayAI, T54). Even 1 "interested in evaluating" reply = strong adoption-evidence.
- **Working mainnet deployment with live URL** — npm package + program ID + 1 demo agent that anyone can hit
- **Pre-warmed demo agents on mainnet ATOM** — 5 agents with tier ≥2 by Day 12 per Day-5 action

---

## Submission strategy notes

1. **Single submission portal entry. Apply for Public Goods + Standout via that one entry.** Per Section 7, only 1 project submission per team. The Public-Goods Award is judged from the same submission pool; framing the README + deck Slide 5 + pitch closing line as Public-Goods-anchored covers both prize categories.

2. **Submit early — Day 16 (2026-05-10), not Day 17 (2026-05-11).** Give yourself 24 hours buffer for portal submission glitches. Public-portal traffic spikes pre-deadline. Submitting 24h early is professional-grade hygiene.

3. **Make sure judges have access to:** GitHub repo (public), Google Slides deck (set to "Anyone with link can view"), pitch video Loom (public), technical demo video Loom (public), npm package (published), mainnet program IDs (publicly verifiable). Forgotten access = auto-rejection in practice.

4. **Update Twitter / X bio Day 16 with Frontier submission.** Tag Colosseum + Solana Foundation + relevant ecosystem accounts in the announcement post.

5. **Double-check pitch video duration ≤3:00.** Over-length is strictly penalized. Use Loom analytics to confirm.

6. **Cross-check submission against `rules-and-prizes.md` Section 7 disqualifier list** before clicking submit. Common failure modes: pre-existing product in repo (must be Frontier-window code only); missing access permissions; over-length video; no why-Solana explanation.

---

## Personalization gaps Mohit must fill

- [Mohit: insert your X / Twitter handle and project Twitter handle]
- [Mohit: insert your GitHub URL once published]
- [Mohit: replace TBD video / deck URLs with final URLs by Day 16]
- [Mohit: insert mainnet program IDs once Day-16 deployment confirmed]
- [Mohit: insert facilitator outreach status — Slide 6 logo wall + quote — by Day 13]
- [Mohit: confirm submission portal entry filed by Day 16, 24h pre-deadline]

---

## Decision-makers / reviewer profiles (from `judges-and-bias.md`)

- **Lily Liu** — Solana Foundation president. Public Goods Award gating bias. X-recon Day 14: read her last 30 days of posts on x402 / Foundation initiatives / public-goods. Lean Public-Goods framing harder if her recent posts emphasize that axis.
- **Vibhu Norby** — Solana Foundation CPO. Agent-commerce / SDP gating bias. X-recon Day 14: surface his SDP storytelling cadence + agent-payment scenarios.
- **Mert Mumtaz** — Helius CEO. Security / fraud gating bias. Variant B (treasury-bot routed $1.2M to a clone; "smart contracts held up; human-trust layer didn't" — near-verbatim Lily's [2026-04-02 post-Drift quote](https://x.com/calilyliu/status/2039652201342050713) which Mert engages with weekly post-Drift) lands strongest here. x-recon Day 14: read his last 30 days for security-incident framing he engages with.
- **Matty Taylor** — Colosseum lead. Accelerator-shaped startup gating bias. Named-buyer + ship-cadence + Foundation-credibility = Matty's signal pattern.

---

## Standing-rule compliance checklist

- [ ] Never names SAEP — confirmed in README, deck, both videos
- [ ] Foundation-alignment language present in README + Slides 1, 5, 7, 10 + pitch video opening + pitch video closing
- [ ] Variant B pitch opener (pitch video); Variant A demo opener (technical demo)
- [ ] All 3 components described
- [ ] Public Goods qualification explicit in README + Slide 5 + pitch closing line
- [ ] Why-Solana explicit in README + technical demo + deck slide 7
- [ ] MIT license at workspace root
- [ ] All judges have access to all artifacts (cross-check Day 16)
- [ ] Pitch video ≤3:00 confirmed
- [ ] Technical demo 2:00-3:00 confirmed
- [ ] No banned vocabulary in 30s pitch hook (per `agenttrust-pitch-compression.md` rules)
