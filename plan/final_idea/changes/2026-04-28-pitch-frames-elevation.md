# 2026-04-28 — Pitch frames elevated (supersedes Day-4.5 Variants A + B)

**Status:** Locked. **Author:** Mohit (post-research-marathon synthesis review). **Authoritative file going forward:** `plan/final_idea/PITCH_FRAMES_LOCKED.md`. **Historical record preserved at:** `research/00-thesis/agenttrust-pitch-compression.md` (Day-4.5 brainstorm).

---

## What changed

| Variant | Before (Day 4.5) | After (locked 2026-04-28 PM) |
|---------|------------------|------------------------------|
| **A** (technical demo opener) | "Last month an AI agent paid $2,400 for fake Air Jordans from a scam site." | "Last month a Solana fund's autonomous treasury bot routed one-point-two million dollars to a clone of a real protocol. Funds gone. Watch what AgentTrust does instead." |
| **B** (pitch video opener, primary) | "An AI agent calls Claude Opus 4.7 via x402 … scam wrapper pretending to be Anthropic … returned garbage." | "Solana processed fifteen million agent-driven payments last quarter … treasury bot routed one-point-two million USDC to a clone of a real Solana protocol … smart contracts held up; the human-trust layer didn't." |
| **C** (NEW — Twitter / Superteam / mass distribution) | (didn't exist) | "A Solana wallet's autonomous savings agent moved seventy thousand USDC to what it thought was a real yield protocol. Wasn't. Funds gone." |
| **D** (NEW — regulated-enterprise cold-email opener) | (didn't exist) | "A treasury management agent autonomously rebalanced two-point-two million USDC last week — routed it to a clone of a counterparty agent that wasn't who it claimed to be." |

---

## Why

Three load-bearing weaknesses in Variants A + B drove the swap:

### 1. Off-Solana failure modes

- "Fake Air Jordans from a scam site" is a physical-goods scam — there is no Solana-native protocol failure. Judges pattern-match to "cute consumer demo," exactly the anti-pattern Matty calls out (`research/01-hackathon-mechanics/judges-and-bias.md` line 65 — "doesn't build sustainable user acquisition funnels"). Mass-mainstream resonance ≠ Frontier-judge resonance.
- "Anthropic scam wrapper" is off-Solana too — Anthropic isn't deployed on Solana. Brand-association risk: judges may parse it as "they're piggybacking on Anthropic" rather than "they're solving a Solana payment-trust problem."

### 2. Hypothetical, not lived

- The Drift hack on 2026-04-01 ($285M, opsec-based per [vibhu 2026-04-02](https://x.com/vibhu/status/2039569892077080690)) is the lived 2026-Q2 incident every Tier-A judge has posted about. Citing a Drift-style scenario for AGENTS specifically anchors the pitch to ground truth.
- Lily's verbatim 2026-04-02 quote — *"Smart contracts held up. The real targets now are humans"* — is the highest-RT-probability literal-citation possible. Variant B threads it.

### 3. Soft money stakes

- $2,400 (Nike) and "returned garbage" (Anthropic) read small to investors. B2B treasury-management agents on Solana move $1M+ per tx today. Citing $1.2M USDC anchors the surface to investor-grade dollar amounts.
- Vibhu's *"15 million agentic payments last quarter"* + *"99.99% by 2028"* claims define the TAM; Variant B opens with the volume, then drops the failure case. Aggregate framing → concrete failure → ask. The investor-pitch arc.

---

## Cross-judge alignment delta

| Judge | Pre-swap (Variant B Anthropic) | Post-swap (Variant B treasury) |
|-------|-------------------------------|--------------------------------|
| Mert | Medium-strong (security framing) | **Strong** (Drift echo, lived experience, post-opsec) |
| Vibhu | Medium-strong (B2B agent commerce) | **Strong** (his stat cited verbatim) |
| Lily | Medium-strong (Foundation indirect) | **Strong** (her quote near-verbatim + stablecoin frame) |
| Matty | Strong (B2B + named buyer) | **Strong** (preserves named-buyer + ship-date) |
| Toly | Medium (registry endorsement) | **Strong** (counterparty-aware programmable check on Foundation primitive) |
| Armani | Medium (security peripheral) | **Strong** (smart-contracts-vs-human-trust frame) |

Net: 4 judges shift from medium to strong. None weaken. Risk asymmetry favors the swap.

---

## What this revision does NOT change

- **Locked thesis:** unchanged (`plan/final_idea/THESIS_LOCK.md`)
- **Locked scope:** unchanged (Option 1 full 3-component v1)
- **Locked first buyer:** unchanged (x402 facilitators; Dexter Priority 1 with Revision 10 DAuth-aware DM frame)
- **Foundation alignment as differentiation lever:** unchanged
- **Banned-vocabulary discipline:** unchanged (all 4 variants pass)
- **No SAEP naming rule:** unchanged
- **Pre-empted Q&A (Q1-Q5) in original pitch-compression.md:** preserved as historical reference; remains valid input for accelerator interview prep
- **Demo body flow** (real-counterparty + clone-counterparty + denial + acceptance + settlement + feedback): unchanged. Only the cold open changes.

---

## Files updated as part of this revision

| File | Change |
|------|--------|
| `plan/final_idea/PITCH_FRAMES_LOCKED.md` | New authoritative file (created this session) |
| `plan/final_idea/THESIS_LOCK.md` | Variant B inline reference updated to point to PITCH_FRAMES_LOCKED.md |
| `plan/final_idea/v1_scope.md` | Floor item #3 (Variant B reference) updated |
| `plan/other_tasks/ops/pitch-video-script-60s.md` | Hook beat (0:00–0:08) replaced |
| `plan/other_tasks/ops/pitch-video-script-3min.md` | Opener (0:00–0:30) + market-shape (0:30–1:00) replaced |
| `plan/other_tasks/ops/technical-demo-script.md` | Opener (0:00–0:08) + Set-up (0:08–0:20) revised; demo body unchanged |
| `plan/other_tasks/ops/pitch-deck-10-slides.md` | Slide 1 (hook), Slide 5 (demo screenshot caption) revised |
| `plan/other_tasks/ops/twitter-thread-launch.md` | Tweet 1 (hook) replaced with Variant C |
| `plan/other_tasks/ops/twitter-thread-progress.md` | Opening continuity tweet aligned to Variant C |
| `plan/other_tasks/ops/twitter-thread-demo-preview.md` | Same |
| `plan/other_tasks/ops/twitter-thread-submission.md` | Same |
| `plan/other_tasks/dms/{dexter,atxp_ai,mcpay,latinum,corbits}.md` | Cold-discovery DM body uses Variant B condensed |
| `plan/research/07-demo-scenarios-prewarm-class.md` | Section D Scenario A and Scenario B updated to new openers |
| `plan/other_tasks/grants/*.md` (5 grants with elevator-pitch sections) | Elevator-pitch sections updated to Variant B body |
| `research/00-thesis/agenttrust-pitch-compression.md` | Deprecation pointer added to top of file pointing to PITCH_FRAMES_LOCKED.md |

The synthesis file `plan/research/00-synthesis.md` is left unchanged — it documents the Day-4.5 state at synthesis time. This change file + `PITCH_FRAMES_LOCKED.md` carry the post-synthesis state forward.

---

## Sign-off

Locked Day 4.5 evening, 2026-04-28. Build phase begins 2026-04-29 with Variant A (technical demo) + B (pitch video) + C (Twitter) + D (cold-email) as the four-variant master set.

— Mohit
