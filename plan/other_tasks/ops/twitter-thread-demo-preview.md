# Twitter Thread — Day 14 Demo Preview

**Use case:** Demo-video preview thread. Posts Day 14 (2026-05-08) evening IST. Goal: drive maximum traffic to the technical demo video, get the "Instagram-worthy moment" (cargo kani 5 green checks) widely seen, position for Day 17 submission with momentum.

**Per Matty's framing**: *"hackathons need to hyper-commercialize"* ([2026-03-20](https://x.com/mattytay/status/2034807896249422313)) — this thread is the public launch of the demo, not a trickle.

**Tone:** show the proof. Less narration, more screen capture. Each tweet leads with an image or video clip.

**Author:** Mohit. Last updated 2026-04-28.

---

## Thread (8 tweets)

### Tweet 1 (the killshot)

> Day 14 of 17.
>
> Last month a Solana fund's autonomous treasury bot routed $1.2M USDC to a clone of a real protocol. Funds gone.
> Smart contracts held up. The human-trust layer didn't.
>
> AgentTrust does. Live demo on Solana mainnet:
>
> [VIDEO: 90-second technical demo, square 1:1 cut for Twitter, burned-in subtitles]

**[Video specs: 1080×1080, ≤60 seconds for Twitter ≤2:20 limit (or ≤2:20 for native upload). Burned-in captions. Variant A opener (treasury-bot/clone scenario per `plan/final_idea/PITCH_FRAMES_LOCKED.md`). Pre-roll: title card "AgentTrust" 1 second. End-roll: GitHub URL 2 seconds.]**

---

### Tweet 2 (the architecture summary)

> Three Anchor programs. One CPI call from any x402 facilitator.
>
> 1. Pre-flight policy gate — 5 policy kinds, formally verified
> 2. Post-settlement feedback emission — closes the trust loop
> 3. Permissionless validation registry — third leg of ERC-8004
>
> All MIT-licensed.

**[Image: clean architecture diagram from the deck, Slide 4 export]**

---

### Tweet 3 (the FV moment — Instagram-worthy)

> Five formally-verified invariants. cargo kani proves them every commit.
>
> [GIF or short video clip: terminal showing `cargo kani` running, 5 green checks appearing in sequence, ~6 seconds total]
>
> Mert's defense-in-depth thesis — pre-flight gate is the *first* line, before assets ever move.

**[Image alt: 5 green check marks in a vertical stack, each labeled with invariant name. Crisp, dark mode, screenshot-frameable.]**

---

### Tweet 4 (the integration claim)

> What does integration look like for an x402 facilitator?
>
> One CPI call:
>
> ```
> let allow = invoke_signed(
>     &agent_trust::gate_payment(
>         policy, counterparty, amount
>     )
> );
> ```
>
> If allow.is_ok(), settle. If not, deny + emit reason.
> No migration. No new mint. No new wallet.

**[Image: code snippet card, Rust syntax highlighting, dark mode]**

---

### Tweet 5 (the Foundation alignment)

> Why Solana? Because the Foundation already endorsed Quantu's Agent Registry — ERC-8004 ported to Solana.
>
> Identity ✓ Reputation ✓
>
> The third leg — validation + policy — Quantu archived. AgentTrust productizes it. Same registry. Same standard. Stackable.
>
> [link to solana.com/agent-registry]

---

### Tweet 6 (the named buyers — if quote landed)

> Three x402 facilitators we built against:
>
> [If real quote: "@dexteraisol called it 'the missing trust gate' — full thread of feedback below"]
>
> [If no quote: "Dexter v3 SDK + atxp_ai + MCPay APIs. Drop-in TypeScript module ships in the repo."]
>
> If you're routing agent payments, DM me.

---

### Tweet 7 (the public goods angle)

> Public Goods Award eligibility built in:
> - MIT licensed
> - Zero token
> - Zero fee capture
> - Permissionless attestor model
> - Sybil-resistance via downstream-consumer-filtering, not gatekept registry
>
> The validation layer is a public good or it isn't worth building.

---

### Tweet 8 (the close + CTA)

> Day 14 of 17. Day 17 is submission.
>
> AgentTrust completes the Foundation's ERC-8004 stack — the third leg Quantu archived, fully productized.
>
> Solo. India. Three Anchor programs. Five invariants proven.
>
> Repo: github.com/[handle]/agenttrust
> Full pitch + demo video: [link to YouTube]

---

## Quote-RT bait (optional, post 4 hours after Tweet 1)

If thread engagement crosses 200 likes by hour 4, post this as a standalone follow-up tweet (not in-thread):

> If you're a Solana judge skim-reading hackathon submissions next week:
>
> AgentTrust takes 90 seconds to verify. The demo runs on mainnet. The repo is auditable. The Kani harness is in the repo.
>
> Independently checkable: solana.com/agent-registry endorses what AgentTrust extends.

**Anti-thirst rule:** don't post if engagement < 100 likes by hour 4. Reads as begging.

---

## Hashtags + tags

**Hashtags (use 1-2 max, in Tweet 1):**
- `#Solana`
- `#x402`

**Handle tags (place strategically):**

| Tweet | Tags | Why |
|-------|------|-----|
| 1 | none | hook + video carry the tweet |
| 2 | none | architecture statement is enough |
| 3 | `@asymmetric_re` `@toly` | Asymmetric Research engages on FV; Toly RT'd dhkleung sBPF + mmdhrumil Token-2022; cargo kani is in his lane (see judges-and-bias.md §5b) |
| 4 | none | code snippet does the work |
| 5 | `@SolanaFndn` `@QuantuLabs` | Foundation handle for canonical alignment; Quantu for credit |
| 6 | `@dexteraisol` `@atxp_ai` `@MCPay_io` | named buyers; visibility for them = warm DM follow-up |
| 7 | `@calilyliu` | Public Goods is Lily's category; she engages on liquidity but Public Goods is cleanly aligned with her Foundation lane |
| 8 | `@SuperteamIN` | Superteam India amplifies submitting Indian builders; tag justified |

**Don't tag in this thread:**
- `@mattytay` — he reads everything; tagging him directly signals over-eagerness
- `@mert` — tag only AFTER the 5-green-checks Image clearly lands, in a separate quote-RT (see "Mert engagement script" in `research/10-production-amplification-class.md`)
- `@vibhu` — same Foundation-judge logic as Lily; tagging both Foundation execs in one thread is too much

---

## Engagement follow-up (Days 14-16)

1. **Day 14 (post day):** post thread at 8:00pm IST (= 10:30am ET; targets US working hours). Reply to first 15 quote-RTs personally.
2. **Day 15 morning:** reply to thread with mainnet transaction signature of the demo flow + Solana Explorer link.
3. **Day 15 evening:** post a separate quote-tweet of Tweet 3 (FV moment) standalone — "5 green checks. The full thread is below" — re-target the FV image at the technical-judge crowd.
4. **Day 16:** reply to thread with "Submission goes in tomorrow. Asks: Standout / Cohort 5 interview / Public Goods Award / Foundation grant pathway."

---

## Image / video specifications

| Tweet | Asset | Specs |
|-------|-------|-------|
| 1 | Demo video, Twitter cut | 1080×1080 square, ≤60s, burned subtitles, MP4 H.264 |
| 2 | Architecture diagram | 1200×675, transparent or dark BG, exported from deck Slide 4 |
| 3 | Cargo kani GIF | 6-second loop, ~3 MB, 800×500 |
| 4 | Code snippet card | 1200×675, Rust syntax highlight, dark mode |
| 5 | Foundation registry screenshot | 1200×675, full solana.com/agent-registry homepage |
| 6 | Logo strip OR quote card | 1200×675, depending on whether quote landed |
| 7 | none | text-only, white space carries the public-goods claim |
| 8 | End-card | 1200×675, AgentTrust logo + GitHub URL + roadmap snippet |

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
| sybil-resistant | YES (Tweet 7) | Q&A allowance per pitch-compression doc — Tweet 7 is a public-goods explanation, not the spoken pitch; technical audience already knows the term and Tweet 7 names the model explicitly. Permitted under Q&A rules. |
| PolicyVault | NO | "policy gate" used; component name not in pitch language |
| ValidationRegistry | NO | "validation registry" lowercase descriptor in Tweet 2; "validation layer" in Tweet 7 |
| TrustGate | NO | — |
| SAEP | NO | — |

PASS with one caveat: Tweet 7 uses "Sybil-resistance" because the public-goods explanation is technical-audience targeted (Q&A-equivalent context), permitted by the same rule that allows it in Q5 of pitch-compression Q&A. If Mohit prefers absolute discipline, swap "Sybil-resistance" → "spam filtering" in Tweet 7.
