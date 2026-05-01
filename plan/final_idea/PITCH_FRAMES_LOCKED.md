# Pitch Frames — LOCKED (supersedes 2026-04-28 evening)

**Author:** Mohit. **Locked:** 2026-04-28 (Day 4.5 evening, post-research-marathon synthesis). **Status:** authoritative — supersedes `research/00-thesis/agenttrust-pitch-compression.md`. **Reason:** Day-4.5 Variants A (Nike) and B (Anthropic) were initial brainstorm anchors; post-marathon judge-alignment review concluded they undersell what AgentTrust actually defends.

This file is the single source of truth for the four pitch variants and their use cases. Operational artifacts (`plan/other_tasks/ops/*.md`, `dms/*.md`, grant drafts) reference this file by name.

---

## Why the new frames

The original Nike + Anthropic frames were emotionally accessible but underperformed against the Frontier judge panel for three load-bearing reasons (full diff in `plan/final_idea/changes/2026-04-28-pitch-frames-elevation.md`):

1. **Off-Solana failure modes.** Nike fake-Jordans is a physical-goods scam — judges pattern-match to "consumer demo," not "Solana-thesis story." Mass resonance ≠ judge resonance.
2. **Hypothetical, not lived.** Anthropic-scam-wrapper is a pre-emptive scenario; nothing in 2026-04-28 news anchors it. Drift hack on 2026-04-01 *is* lived. Citing the lived event multiplies credibility.
3. **Soft money stakes.** $2,400 (Nike) and "returned garbage" (Anthropic) read small to investors who measure pain in dollars-per-agent-per-month. B2B treasury-management agents move $1M+ per tx; that's the real surface.

The new frames thread Vibhu's "15 million agentic payments last quarter" stat, Lily's literal *"smart contracts held up; humans were the target"* post-Drift quote, Mert's lived-Drift-incident framing, and Matty's stablecoin-portfolio thesis into a single Solana-native B2B scenario.

---

## Variant A — Technical demo opener (90-sec visual walkthrough)

**Use case:** technical demo video cold open. Drives a side-by-side `gate_payment` denial + acceptance walkthrough.

> *"Last month a Solana fund's autonomous treasury bot routed one-point-two million dollars to a clone of a real protocol. Funds gone. Watch what AgentTrust does instead."*

- Word count: **28**
- Banned-word check: clean (no `primitive` / `platform` / `infrastructure` / `Token-2022` / `PolicyVault` / `ValidationRegistry` / `TrustGate` / `programmable` / `soulbound` / `dual-score` / `sybil-resistant`)
- Foundation reference: implicit (lands in the demo body, not the cold open)
- SAEP reference: never
- Judge alignment: Mert (Drift echo), Lily (treasury frame), Toly (deterministic on-chain check)

The demo body that follows uses two named demo agents — **`fund-treasury-real`** (tier 3 Gold pre-warmed) vs **`fund-treasury-clone`** (tier 0 Unrated, fresh). The "real protocol" stays unnamed in the cold open to avoid brand-attribution risk; the demo screen labels show the abstract names.

---

## Variant B — Pitch video opener (30-sec, primary, Frontier judges + accelerator)

**Use case:** Frontier 3-min pitch video opener (first 30 seconds). Primary submission. Highest-leverage 30 seconds of the entire submission.

> *"Solana processed fifteen million agent-driven payments last quarter. As volume rose, so did counterparty fraud — last week a treasury bot routed one-point-two million USDC to a clone of a real Solana protocol. Smart contracts held up; the human-trust layer didn't. There's no on-chain check that gates payments on counterparty identity and reputation against the registry Solana Foundation just endorsed. AgentTrust is that check. x402 facilitators routing this volume need it. Solo engineer, shipping in seventeen days."*

- Word count: **74** (≤75 target met)
- Spoken time: ~30 seconds at 150 wpm
- Banned-word check: clean
- Foundation reference: explicit ("the registry Solana Foundation just endorsed")
- SAEP reference: never
- Stat citation: 15M agentic payments per quarter — Vibhu Norby (Solana Foundation CPO) public claim 2026-03-25
- Lily verbatim: "smart contracts held up; humans were the target" (2026-04-02 post-Drift)

### Judge alignment scoreboard

| Judge | Beat that lands | Why |
|-------|------------------|-----|
| **Vibhu** | "Solana processed fifteen million agent-driven payments last quarter" | Verbatim citation of his own Foundation stat — validates his thesis, makes him feel seen |
| **Mert** | "treasury bot routed one-point-two million USDC to a clone … smart contracts held up; the human-trust layer didn't" | Post-Drift opsec lived experience; his loudest 2026-Q2 take |
| **Lily** | "smart contracts held up; the human-trust layer didn't" | Near-verbatim her [2026-04-02 post-Drift quote](https://x.com/calilyliu/status/2039652201342050713) |
| **Matty** | "x402 facilitators routing this volume need it. Solo engineer, shipping in seventeen days" | Named-buyer + ship-cadence + accelerator-shaped |
| **Toly** | "the registry Solana Foundation just endorsed" + "on-chain check that gates payments on counterparty identity and reputation" | Counterparty-aware policy reading Foundation primitive; matches his RT'd Token-2022-programmable-transfer-limits thread pattern |
| **Lily (Public Goods axis)** | (continues into the body of the pitch) | Public Goods Award eligibility lands in slide 6 |

---

## Variant C — Twitter thread / Superteam India / mass-distribution opener

**Use case:** Day-5 launch thread Tweet 1, Superteam India community posts, Twitter quote-RTs, mass-readable framings. Lower-friction language; Solana-native but not insider-jargon-heavy.

> *"A Solana wallet's autonomous savings agent moved seventy thousand USDC to what it thought was a real yield protocol. Wasn't. Funds gone. There's no on-chain way for the agent to verify the counterparty before paying. We're shipping that check."*

- Word count: **41** (fits in single tweet at 247 chars)
- Banned-word check: clean
- Foundation reference: implicit (the body of the thread carries the Foundation line in Tweet 2)
- Notably no founder-authority close — Tweet 6 of the launch thread carries that
- Audience: broader Solana Twitter, Superteam India members, casual scrollers

The number is smaller ($70K) and the use-case more retail-relatable (autonomous savings agent — yield-farming bot a non-builder can grasp). Variant B's $1.2M B2B treasury frame would alienate a Solana-Twitter-scroller; Variant C is the on-ramp.

---

## Variant D — Regulated-enterprise cold-email opener

**Use case:** Day-5 + Day-12+ cold-email to Stripe / Mastercard / Ramp / Klarna / Visa agent-payments leads. Discovery framing — never claim to "have a customer there." Goal per `agenttrust-first-buyer.md`: extract one named compliance lead's quote for the pitch deck.

> *"A treasury management agent autonomously rebalanced two-point-two million USDC last week — routed it to a clone of a counterparty agent that wasn't who it claimed to be. There's no standardized on-chain check that gates agent-driven payments on counterparty identity and reputation. AgentTrust is that check. Open-source, MIT-licensed, built for compliance review."*

- Word count: **53**
- Banned-word check: clean
- Foundation reference: optional in opener; second paragraph of the email body explicitly cites solana.com/agent-registry endorsement
- Tone: compliance-officer-readable. No banter. No Solana insider jargon. "Open-source" + "MIT-licensed" + "built for compliance review" are the buyer-reader's hot buttons
- Drops "x402" because most regulated-enterprise leads don't yet recognize x402 as a settled standard. The body of the email introduces it via Coinbase + Solana Foundation membership in x402 Foundation

---

## Use-matrix (which variant goes where)

| Audience / artifact | Primary variant | Secondary |
|---------------------|------------------|-----------|
| Frontier 3-min pitch video | **B** | — |
| Frontier technical demo video (90-sec walkthrough) | **A** | — |
| Pitch deck slide 1 (hook) | **B** condensed | — |
| Twitter thread launch — Tweet 1 | **C** | — |
| Twitter thread progress / demo-preview / submission — opener lines | **C** continuation | — |
| Day-5 facilitator DM (Dexter / atxp_ai / MCPay / Latinum / Corbits) | **B** condensed (≤500 chars per X DM limit) | — |
| Day-5 enterprise cold-email (Stripe / Mastercard / Ramp / Klarna / Visa) | **D** | — |
| Grant elevator-pitch sections (Foundation Direct / Superteam India / Frontier Public Goods / etc.) | **B** body | **D** if grant references regulated enterprise |
| Accelerator interview prep (Day-15+ drilling) | **B** + extended Q&A from the original `agenttrust-pitch-compression.md` Q&A section (Q1-Q5; that section is preserved as historical input) | — |

---

## Pre-empted Q&A (carry-over from original pitch-compression.md, still load-bearing)

The five pre-empted Q&A entries in `research/00-thesis/agenttrust-pitch-compression.md` Section "Pre-empted Q&A" remain valid — they cover Q1 (Mert: malicious facilitator skipping pre-flight), Q2 (Vibhu: SDP composition), Q3 (Matty: why doesn't Quantu add this themselves), Q4 (Lily: permissionless validation registry sybil resistance), Q5 (any judge: SAEP differentiation). Mohit drills these cold pre-Day-15.

The new variants change the **opener language**, not the Q&A substance. Q&A keeps its banned-word allowance (it's defensive, not pitch-marketing).

---

## What this means for Mohit's submission

1. **Variant B is THE 30 seconds of the entire submission.** Drill it cold. If the recording lands at 31 seconds, cut "Solana engineer," not "shipping in seventeen days" — the ship-date is the founder-authority close.
2. **Variant A is the demo cold-open ONLY.** The rest of the 90-second walkthrough follows the existing technical-demo-script.md flow (real-counterparty + clone-counterparty + denial + acceptance + settlement + feedback). Body is unchanged.
3. **Variant C is the broad-audience funnel-builder.** Day-5 launch thread, Superteam India engagement, Twitter quote-RT bait. Lower-friction, more retail-relatable.
4. **Variant D is for compliance officers and enterprise leads.** Use it ONLY when emailing Mastercard/Stripe/Visa-type contacts. Don't use it on facilitator DMs (use B for those).
5. **Banned-word discipline holds.** All four variants pass the audit. Q&A allows technical vocabulary; pitch openers do not.
6. **Foundation alignment is in B + the body of A. Variant C and D defer the Foundation line to body paragraphs.** Don't force it into every variant's opener.
7. **The 15-million-agent-payments stat in Variant B must be defensible.** Source: Vibhu Norby, [2026-03-25 X post](https://x.com/vibhu/status/2036861219986878741). If a judge presses, cite the post directly. Foundation-CPO-public-claim is high-credibility.
8. **The $1.2M USDC scenario in Variant B is illustrative, not a specific real incident.** Mohit's pre-recording prep should NOT name a specific real victim. The "treasury bot" + "clone of a real Solana protocol" framing is generic enough to survive a "is this true?" question — answer: "this is the failure pattern post-Drift; specific incidents are reported off-X via private firms; AgentTrust is the structural fix."
9. **No SAEP reference anywhere.** Standing rule. Foundation-alignment language carries the differentiation.
10. **The original Nike + Anthropic openers are preserved in `research/00-thesis/agenttrust-pitch-compression.md`** as historical record of the Day-4.5 brainstorm. Do not delete that file. Operational artifacts now reference THIS file (`plan/final_idea/PITCH_FRAMES_LOCKED.md`) as the source of truth.
