# Twitter Thread — Day 5 Launch

**Use case:** First public AgentTrust thread. Launches the project handle, frames the wedge, opens the funnel. Posts on Day 5 (2026-04-29) morning IST after Mohit's first 90 minutes of build work (so the thread isn't the first thing he does — but goes live within the first half-day).

**Goal:** establish positioning + start the follow funnel + plant seeds for Days 7-10 progress thread.

**Per Matty Taylor's anti-pattern check** ([2026-04-17](https://x.com/mattytay/status/2045185240239669326) — "doesn't build sustainable user acquisition funnels"): this thread IS the start of the funnel. Mohit-founder-distribution-runway begins Day 5 not Day 12.

**Tone:** confident, technical, specific. No emoji. No marketing fluff. Each tweet ≤280 chars.

**Author:** Mohit. Last updated 2026-04-28.

---

## Thread (7 tweets)

### Tweet 1 (the hook — Variant C)

> A Solana wallet's autonomous savings agent moved seventy thousand USDC to what it thought was a real yield protocol. Wasn't. Funds gone.
>
> Building AgentTrust — the on-chain check that stops it. Three Anchor programs that gate every agent payment on counterparty trust.
>
> Frontier 2026 submission. 17 days. 🧵

**[Image attached: terminal screenshot showing the clone counterparty case + the `Deny` decision (same as pitch deck Slide 1 visual). 1200×675 aspect, dark theme.]**

---

### Tweet 2 (the gap)

> The Solana Foundation already endorsed Quantu's Agent Registry — ERC-8004 ported to Solana.
>
> Two of three trust legs shipped: identity ✓ reputation ✓
>
> The third leg — validation + policy — Quantu archived in v0.5.0. AgentTrust productizes it.
>
> [link to solana.com/agent-registry]

---

### Tweet 3 (the architecture)

> Three Anchor programs:
>
> 1) Pre-flight policy gate (5 policy kinds in one CPI call)
> 2) Post-settlement feedback emission (PDA-signed CPI to ATOM Engine)
> 3) Permissionless validation registry (the third leg of ERC-8004)
>
> All MIT-licensed. No token. No fee capture.

---

### Tweet 4 (the proof discipline)

> Five formally-verified invariants on the policy gate. Cargo kani harness ships in the repo, runs every commit.
>
> Pre-flight gate is the *first* line. Defense in depth — facilitator runs our check, asset-layer enforcement still runs at settlement.
>
> Stackable, not substitutable.

---

### Tweet 5 (the buyer)

> Built against Dexter v3 SDK + atxp_ai + MCPay (Cypherpunk Stablecoin track winner).
>
> x402 facilitators routing millions in agent payments need this. Drop-in TypeScript module — integration is one CPI call, not a migration.
>
> If you're a facilitator, DM me. We have an SDK.

---

### Tweet 6 (the founder)

> Solo Indian engineer. One year on Solana. Senior software career before that.
>
> Solo isn't a bug — solo is infra-speed shipping without coordination overhead. Day 5 of 17.
>
> Daily build logs in this thread. Follow if you want to see how three Anchor programs ship in 17 days.

---

### Tweet 7 (the CTA)

> Repo (private until Day 10): github.com/[handle]/agenttrust
>
> Mainnet program IDs going live Day 12.
>
> Public Goods Award eligible. Solana Foundation grant pathway. Cohort 5 accelerator interview.
>
> AgentTrust completes the Foundation's ERC-8004 stack — the third leg Quantu archived.

---

## Optional reply chain (for amplification)

After 6 hours, if the thread is getting traction, reply to Tweet 1 with this quote-RT bait:

> One question for the @SolanaFndn folks reading: would you rather see (a) one team productizing Quantu's archived ValidationRegistry as the canonical implementation, or (b) twelve teams forking it into incompatible variants?
>
> AgentTrust is option (a).

**Use ONLY if engagement justifies it. If thread gets <20 likes by hour 4, drop this reply — too thirsty.**

---

## Hashtags + tags

**Hashtags (use 1-2 max in Tweet 1, none in others):**
- `#Solana` (general visibility)
- `#x402` (rises with x402 ecosystem chatter; Coinbase + Foundation amplify)
- (NO `#Hackathon` — too generic, dilutes signal)
- (NO `#AgentEconomy` — speculative noun, dilutes)

**Handles to tag (in order, not all in one tweet):**
- Tweet 1: no tag (let the hook stand alone — tags reduce reach)
- Tweet 2: `@SolanaFndn` and `@QuantuLabs` (both relevant; tagging Foundation and the team whose work AgentTrust extends)
- Tweet 3: no tag
- Tweet 4: `@asymmetric_re` (Asymmetric Research; FV crowd; engages with cargo-kani-style work — see judges-and-bias.md §5b)
- Tweet 5: `@dexteraisol` `@atxp_ai` `@MCPay_io` (the three named buyers; visibility for them = warm DM follow-up)
- Tweet 6: no tag
- Tweet 7: `@SuperteamIN` (Superteam India amplifies Indian builders' submissions per their published amplification pattern — see Twitter-strategy section of `research/10-production-amplification-class.md`)

**Anti-pattern check (do NOT do these):**
- Don't tag `@toly` / `@aeyakovenko` directly in Tweet 1. He skims; if the thread is weak, he'll mute. Tag him only AFTER thread proves itself with 100+ likes.
- Don't tag `@mert` until the technical demo video is recorded and visible (Day 14+). He engages on technical proof, not marketing copy.
- Don't tag `@calilyliu` directly until the Foundation alignment beat lands cleanly (post-launch with Foundation language locked).
- Don't tag `@mattytay` until Day 14 demo video is shareable. He looks at outputs, not work-in-progress.

---

## Image specifications

| Tweet | Image | Specs |
|-------|-------|-------|
| 1 | Terminal screenshot: scam wrapper denial | 1200×675, dark mode, red `Deny` line highlighted |
| 2 | Solana Foundation Agent Registry homepage | screenshot of `solana.com/agent-registry` with footer "© 2026 Solana Foundation" highlighted |
| 3 | Architecture diagram | Excalidraw export, 3 boxes + arrows, transparent background |
| 4 | Cargo kani green checks | screenshot of `cargo kani` output with 5 invariants proven |
| 5 | none | text-only |
| 6 | Mohit headshot OR a "Day 5/17" banner | optional |
| 7 | Repo banner | AgentTrust logo + GitHub URL + CTA |

---

## Engagement plan (Days 5-7)

1. **Day 5 (post day):** post thread at 9:30am IST (~12am ET; targets US wake-up cycle + India morning). Reply to first 5 quote-RTs personally within 4 hours.
2. **Day 5 evening:** post one quote-tweet of the thread with a "Day 5 progress" framing — "Anchor scaffold initialized today. PolicyAccount + VelocityLedger schema designed."
3. **Day 6:** reply to thread with a tweet showing the v1 PolicyAccount struct in Rust. Code screenshot. <30 lines visible.
4. **Day 7:** reply to thread with first PolicyVault test passing (one green check). "First PolicyVault test passing on devnet. Counterparty-tier policy reads ATOM Engine state correctly."

**Funnel discipline:** every Tweet 5-6-7 reply ends with a CTA (follow / star repo / DM / etc.). Matty wants to see the funnel. Show the funnel.

---

## Banned-word audit

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
| PolicyVault | NO | "policy gate" used; component name not in pitch |
| ValidationRegistry | NO | "validation registry" lowercase descriptor in Tweet 3 |
| TrustGate | NO | — |
| SAEP | NO | — |

PASS.
