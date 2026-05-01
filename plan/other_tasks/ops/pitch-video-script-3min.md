# Pitch Video Script — 3 Minute Version (Frontier Submission)

**Use case:** Primary Frontier Colosseum submission (max 3-minute pitch per Colosseum's `perfecting-your-hackathon-submission` brief). Variant B opener (treasury-bot routed $1.2M USDC to a clone of a real Solana protocol) per `plan/final_idea/PITCH_FRAMES_LOCKED.md`. Mohit on camera + screen B-roll. Word target: ~430 words at ~150 wpm.

**Author:** Mohit. Last updated 2026-04-28. Per Colosseum guidance: "treat their pitch like a brief startup pitch, not a product demo" + "a clear and well-structured narrative is more valuable than professional video editing." [Source: blog.colosseum.com/perfecting-your-hackathon-submission/]

---

## Pre-roll (1 second)

[Title card: "AgentTrust — Frontier 2026 submission" lower-third white. Fade in.]

---

## 0:00 – 0:30 — Variant B opener (volume → fraud → Foundation alignment)

**[MOHIT, mid-shot, plain background. Direct eye contact. No music. Steady delivery; deliberate cadence on the dollar figure and the verbatim Lily quote.]**

> "Solana processed fifteen million agent-driven payments last quarter. As volume rose, so did counterparty fraud — last week a treasury bot routed one-point-two million USDC to a clone of a real Solana protocol."

**[half-beat pause]**

> "Smart contracts held up; the human-trust layer didn't. There's no on-chain check that gates payments on counterparty identity and reputation against the registry Solana Foundation just endorsed. AgentTrust is that check. x402 facilitators routing this volume need it. Solo engineer, shipping in seventeen days."

**[Stage direction: end this beat with one second of silence. The "human-trust layer" line is near-verbatim Lily Liu's 2026-04-02 post-Drift quote — let it land at full deliberateness. "AgentTrust is that check" is the positioning line.]**

---

## 0:30 – 1:00 — Market shape (Vibhu's claim) + the Foundation gap

**[Cut to graphic: full-screen text, large white-on-black: "15 million agent-driven payments on Solana — Q1 2026. By 2028: 99.99% of onchain transactions agent-driven." Citation in 12pt: Vibhu Norby, Solana Foundation CPO, Mar 2026. Music starts low.]**

**[Mohit voiceover:]**

> "Solana's CPO says ninety-nine point nine nine percent of onchain transactions in two years will be agent-driven. Today the agent economy already moves $50 million monthly on x402 — sixty-five percent of that on Solana — and the failure rate from counterparty fraud rises with the volume."

**[Cut to graphic: three-column architecture. Column 1 highlighted: "Identity ✓ — Quantu Agent Registry, v0.5.0." Column 2 highlighted: "Reputation ✓ — Quantu ATOM Engine, v0.6.0." Column 3 grey: "Validation — archived in Quantu v0.5.0, never productized."]**

> "The Foundation endorsed the Agent Registry — ERC-8004 ported to Solana. They have identity. They have reputation. The third leg — the validation layer — Quantu archived. AgentTrust productizes it."

**[Stage direction: "Quantu archived" — slight downward inflection. "AgentTrust productizes it" — slight upward. The contrast carries the wedge claim.]**

---

## 1:00 – 1:30 — Architecture (3 components)

**[Cut to architecture diagram: three Anchor programs on Solana. Left to right: PolicyVault (with 5 policy kinds listed), TrustGate (with give_feedback CPI), ValidationRegistry (with attestor model). Connecting arrows show CPI flow. Music holds.]**

> "Three Anchor programs. Component one: a policy gate that any facilitator drops into existing payment flows. Five policy kinds — counterparty tier, spending cap, velocity, validation requirement, kill switch — all composable in one CPI call."

**[Pan diagram right.]**

> "Component two: post-settlement feedback emission. The facilitator signs feedback for the agent who just paid. Quantu's reputation score updates onchain. Closing the trust loop without the agent doing extra work."

**[Pan to component three.]**

> "Component three: the validation registry. Permissionless attestors — Halborn, Asymmetric Research, OpenZeppelin can all post attestations. Policies decide whose attestations they trust. Markets sort the rest."

---

## 1:30 – 2:00 — Demo (live denial / acceptance)

**[Full-screen terminal recording. Cursor blinks. Type `cargo test gate_payment_denies_clone`. Tests run. Green "PASS" lines stream by.]**

**[Mohit voiceover, slightly faster pace:]**

> "Demo. Treasury bot receives a rebalance intent. Discovers two counterparties — one with tier-three reputation in the Foundation's registry, one with no entry at all."

**[Cut to second terminal pane: `gate_payment` invocation against clone. Returns red `Deny: counterparty_tier_below_min(required=2, actual=0)`.]**

> "Pre-flight gate. Tier zero counterparty. Denied. Reason code emitted on chain."

**[Cut to third pane: same call against canonical counterparty. Returns green `Allow`.]**

> "Same gate against the canonical counterparty. Tier three. Allowed. Settlement happens. Feedback CPI fires. Reputation updates. One unified flow."

**[Cut to fourth pane: `cargo kani` running. Five green check marks appear as proof completes.]**

> "Five formally-verified invariants on the gate logic. Kani proves them every commit."

---

## 2:00 – 2:30 — Named buyer + Foundation alignment + public goods

**[Cut back to Mohit, mid-shot. Music drops to low.]**

> "Built against Dexter v3, atxp_ai, and MCPay — three x402 facilitators routing millions in agent payments. Drop-in TypeScript module. Integration is one CPI call, not a migration."

**[Cut to graphic: "MIT licensed. No token. No fee capture." Solana.com/agent-registry screenshot in lower-right corner.]**

> "MIT-licensed. No token. No fee capture. Public Goods Award eligibility built in, not retrofitted. Solana Foundation already endorsed the registry this extends."

**[Stage direction: pause one beat after "endorsed the registry this extends." That's the thesis lock in spoken form.]**

---

## 2:30 – 3:00 — Solo close + ask

**[Mohit, mid-shot. Slight smile. Music swells gently for close.]**

> "I'm Mohit. Solo Solana-Rust engineer, one year in Web3, shipping out of India. Seventeen days from idea to repo to live mainnet demo. Three Anchor programs, formally verified, drop-in for any x402 facilitator."

**[Stage direction: shift to direct-camera. Slow the next beat.]**

> "AgentTrust completes the Foundation's ERC-8004 stack — the third leg Quantu archived, fully productized. I'm here for the accelerator interview, the Public Goods Award, and the Foundation grant pathway."

**[End-card: AgentTrust logo. GitHub URL. Twitter handle. Email. Hold 3 seconds. Music fade. Cut to black.]**

---

## Delivery notes

1. **Three-minute hard limit per Colosseum guidance.** Practice with stopwatch. If recording lands at 3:05 and over, cut the second sentence of the architecture beat (1:00-1:30) — that's the lowest-leverage compression target.
2. **Three load-bearing beats:** opener (0:00-0:30), market+Foundation gap (0:30-1:00), solo close (2:30-3:00). Demo is the proof but the narrative arc is set in those three. Drill those three cold first.
3. **B-roll discipline.** Architecture diagram + four terminal panes + Foundation graphic + MIT-licensed graphic = six B-roll shots total. Do not exceed. Per Colosseum: "Excessive visual effects lacking substance" is a top-listed pitch mistake.
4. **No banned vocabulary** (audit table at end). SAEP never named. "AgentSafe Hooks" never named (separate companion product).
5. **Music:** royalty-free instrumental, 80-95 BPM, no vocals. Starts at 0:30 (after opener lands). Swells at 1:30 (demo). Drops at 2:00 (named buyer). Swells gently for close at 2:30. Fade on end-card.
6. **Subtitles required.** Critical terms to verify post-auto-transcribe: "x402," "Quantu," "ERC-8004," "Kani," "atxp_ai," "Halborn," "Asymmetric Research," "Anthropic," "MCPay," "Dexter," "OpenZeppelin."
7. **Why-Solana baked in.** Per `judges-and-bias.md` §5: chain-agnostic pitches kill the "why Solana" judgment. Foundation-endorsement language is the why-Solana claim — explicit, primary-source, judge-verifiable.

---

## Banned-word audit (FINAL)

| Term | Used? | Notes |
|------|-------|-------|
| soulbound | NO | — |
| primitive | NO | — |
| infrastructure | NO | — |
| platform | NO | — |
| Token-2022 | NO | — |
| programmable | NO | — |
| dual-score | NO | — |
| sybil-resistant | NO | — |
| PolicyVault | NO | — |
| ValidationRegistry | NO | "validation registry" lowercase descriptor used once at 1:00-1:30; component name (capitalized) not used in spoken pitch |
| TrustGate | NO | — |
| SAEP | NO | — |

PASS. (Note: lowercase "validation registry" is descriptive, not the component proper noun. This passes the spirit of the ban — the rule is "don't name the component as a marketing term"; describing the function in plain English is allowed.)
