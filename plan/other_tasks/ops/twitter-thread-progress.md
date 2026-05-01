# Twitter Thread — Day 10 Progress

**Use case:** Mid-build progress thread. Posts Day 10 (2026-05-04) morning IST. Goal: prove the build is real, sharpen the wedge, surface specific technical artifacts judges can verify, and feed the funnel through Days 12-14.

**Per Matty Taylor's framing** ([2026-04-11](https://x.com/mattytay/status/2043019496890470452): "Since 2020 we've considered rebranding the Solana hackathon to a startup competition") — this thread reads as a startup-launch-week update, not a hackathon log.

**Tone:** specific, technical, results-first. Show, don't claim.

**Author:** Mohit. Last updated 2026-04-28.

---

## Thread (6 tweets)

### Tweet 1 (the headline)

> Day 10 of 17 building AgentTrust.
>
> Three Anchor programs. The pre-flight gate now reads counterparty tier from Quantu's ATOM Engine on mainnet. CounterpartyTier policy passes. Five formally-verified invariants on the gate logic.
>
> One CPI call from any x402 facilitator.

**[Image: Cargo kani output showing 5 invariants proven, all green. 1200×675 dark mode terminal.]**

---

### Tweet 2 (the proof artifacts)

> What's in the repo as of today:
>
> - `programs/policy-vault/` — gate_payment composer, 5 policy kinds, full FV harness
> - `programs/trustgate/` — PDA-signed give_feedback CPI
> - `programs/validation-registry/` — request_validation, respond_to_validation, capability namespaces
>
> Repo public Day 12.

---

### Tweet 3 (the FV detail — for Toly and Mert)

> The 5 invariants Kani proves on `gate_payment`:
>
> 1. Policy authority can only revoke own policies
> 2. Velocity ledger monotonic
> 3. Kill switch overrides all other policies
> 4. AtomStats byte-layout read matches spec
> 5. Gate decision deterministic given inputs
>
> Every commit. No flakes.

---

### Tweet 4 (the first-buyer signal)

> Three x402 facilitators talking to me:
>
> [If Dexter / atxp_ai / MCPay responded with quote — paste quote here, attribute, link to their tweet]
>
> [If no quote landed by Day 10: "Built against Dexter v3 SDK + atxp_ai + MCPay APIs. Drop-in TS module — one CPI integration. DM me if you're a facilitator."]

---

### Tweet 5 (the demo tease)

> Day 12 mainnet program IDs go live.
> Day 14 technical demo video drops.
>
> Preview: a Solana fund's treasury bot receives a $1.2M USDC rebalance intent. Discovers two counterparties — canonical (tier 3 in Foundation registry) + clone (tier 0, fresh registration). Pre-flight gate denies the clone, accepts canonical. Settlement on Solana mainnet.

---

### Tweet 6 (the CTA + Foundation alignment)

> AgentTrust completes the Solana Foundation's ERC-8004 stack — the third leg Quantu archived in v0.5.0.
>
> MIT-licensed. No token. Public Goods Award eligible.
>
> Follow for Day 12 mainnet launch + Day 14 demo. Star the repo when it goes public: github.com/[handle]/agenttrust

---

## Hashtags + tags

**Hashtags (use 1 max, in Tweet 1):**
- `#Solana`

**Handles to tag (carefully placed):**
- Tweet 1: no tag (let the headline + image carry)
- Tweet 2: no tag
- Tweet 3: `@asymmetric_re` (FV crowd) + `@toly` (Toly engages with `cargo kani` style FV work — see judges-and-bias.md §5b "RT'd Glasswing AI security agent" and "RT'd dhkleung sBPF macros")
- Tweet 4: `@dexteraisol` `@atxp_ai` `@MCPay_io` (only if quote landed; otherwise just `@dexteraisol` mention without quote)
- Tweet 5: no tag
- Tweet 6: `@SolanaFndn` (Foundation alignment is the load-bearing claim — Foundation handle has reach)

**Avoid tagging directly:**
- `@mattytay` — too early. He sees outputs Day 14+.
- `@calilyliu` — Foundation alignment language must be tight before tagging Foundation president.
- `@vibhu` — he's likely a judge; tagging signals over-eagerness; let him discover via `@SolanaFndn` retweet path.

---

## Image specifications

| Tweet | Image |
|-------|-------|
| 1 | Cargo kani output, 5 green checks, all 5 invariant names visible |
| 2 | Repo file-tree screenshot showing `programs/policy-vault/`, `programs/trustgate/`, `programs/validation-registry/` |
| 3 | Code-snippet card: 5 invariant names in numbered list, Kani logo or `cargo kani` watermark |
| 4 | Logo strip: Dexter, atxp_ai, MCPay (with "Talking to:" header) — only if real conversations exist; otherwise omit image |
| 5 | Storyboard visual: "Coming Day 14" + Solana Explorer $1.2M-USDC-transfer-to-clone still + canonical-counterparty agent-registry entry side-by-side |
| 6 | AgentTrust roadmap graphic: Day 5 → Day 17 → Phase 2 → Phase 3 |

---

## What changes if the build is behind schedule

If by Day 10 the CounterpartyTier policy doesn't yet read mainnet `AtomStats`:

- **Tweet 1:** rephrase to "tier read from ATOM Engine on devnet. Mainnet by Day 12." Honest. Not fatal.
- **Tweet 2:** drop the `validation-registry/` line if that program is the cut-target. Show 2 of 3 programs, frame Phase-1 as 2-program v1.
- **Tweet 3:** if Kani harness isn't passing all 5 invariants yet, post 3 with "two more landing this week." Don't fake it.

**The thread can be honest about progress without being defeatist.** "Day 10 of 17 — here's what works, here's what's next." Specific > performative.

---

## Engagement follow-up (Days 10-12)

1. **Day 10 (post day):** post thread 9:30am IST. Reply to first 10 quote-RTs personally.
2. **Day 11:** reply to thread with one specific code artifact — e.g., "Here's the `gate_payment` instruction handler" with a 30-line code screenshot.
3. **Day 12 morning:** reply with "Mainnet program IDs live. Repo public." + program ID + repo URL.

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
| PolicyVault | NO | "policy-vault" lowercase as repo path / file name only |
| ValidationRegistry | NO | "validation-registry" lowercase as repo path only |
| TrustGate | NO | "trustgate" lowercase as repo path only |
| SAEP | NO | — |

PASS. (Repo path identifiers are allowed lowercase — they're file names, not marketing terms.)
