# Technical Demo Video Script — 90 Second Beat-by-Beat

**Use case:** Frontier Colosseum technical-walkthrough video (Colosseum standard: 2-3 minute hack-style technical walkthrough, separate from pitch video). Variant A opener (Solana fund's autonomous treasury bot routed $1.2M to a clone of a real protocol) per `plan/final_idea/PITCH_FRAMES_LOCKED.md`. Beat-by-beat structure shows live `gate_payment` denial then acceptance, settlement, feedback emission, tier increment. Per Colosseum guidance: "the technical demo is about the how, and it should be technical, direct, and specific to implementation." [Source: blog.colosseum.com/perfecting-your-hackathon-submission/]

**Author:** Mohit. Last updated 2026-04-28. Format: hybrid (screen recording + voiceover, no on-camera Mohit until close). 1080p 30fps. Music absent during CLI moments per audio brief.

---

## Pre-roll (1 second)

[Title card: "AgentTrust — Technical Walkthrough" lower-third white-on-black. Fade in. No music.]

---

## 0:00 – 0:08 — Variant A opener

**[Full-screen: dark terminal still showing a Solana Explorer transaction page with a $1.2M USDC transfer + a small annotation arrow pointing at the receiving wallet labeled "clone." Caption overlay: "Last month."]**

**[Voiceover, Mohit:]**

> "Last month a Solana fund's autonomous treasury bot routed one-point-two million dollars to a clone of a real protocol. Funds gone. Watch what AgentTrust does instead."

**[Stage direction: half-beat pause on "$1.2 million." Slow on "Funds gone." The opener anchors on the dollar figure and the irreversibility.]**

---

## 0:08 – 0:20 — Set-up: treasury bot receives intent, discovers two counterparties

**[Cut to terminal: Node.js REPL. Type `treasury_bot.execute({ intent: "rebalance $1.2M USDC to high-yield protocol" })`. Hit enter. Output streams: "Discovering counterparties..."]**

**[Voiceover:]**

> "Same setup, replayed. The treasury bot receives a rebalance intent. Discovers two counterparties — one is the canonical protocol, registered in Solana's Foundation-endorsed Agent Registry with tier-three reputation. The other is a clone — no registry entry, tier zero."

**[Cut to two-pane visual: left pane shows JSON for canonical counterparty — `agent_id: 0xabcd...`, `tier: 3`, `feedback_count: 4,212`. Right pane shows clone — `agent_id: <none>`, `tier: 0`, `feedback_count: 0`. Both panes side-by-side, labeled "Foundation registry hit" / "no registry entry."]**

---

## 0:20 – 0:35 — Pre-flight gate denial of clone counterparty

**[Cut to terminal pane. Type:]**

```
$ anchor invoke gate_payment \
    --policy=TREASURY_REBALANCE \
    --counterparty=<clone_pubkey> \
    --amount=1200000_USDC
```

**[Hit enter. Output streams: red `RESULT: Deny`. Below it: `reason_code: counterparty_tier_below_min`. `policy_kind: CounterpartyTier`. `required_min_tier: 2, actual_tier: 0`. Hold 3 seconds. No music.]**

**[Voiceover:]**

> "Pre-flight gate. The CounterpartyTier policy reads tier zero from the on-chain `AtomStats` PDA. Denied. Structured reason code emitted on chain — auditable, machine-readable, deterministic."

**[Stage direction: emphasize "deterministic" — that's the FV hook for Toly.]**

---

## 0:35 – 0:50 — Pre-flight gate accept of canonical counterparty

**[Same terminal. Type:]**

```
$ anchor invoke gate_payment \
    --policy=TREASURY_REBALANCE \
    --counterparty=<canonical_pubkey> \
    --amount=1200000_USDC
```

**[Hit enter. Output: green `RESULT: Allow`. Below it: `policy_decision: 5 of 5 policies passed`. `counterparty_tier: 3`. Hold 3 seconds. Music starts low.]**

**[Voiceover:]**

> "Same gate, canonical counterparty, tier three. Five policy kinds checked atomically — counterparty tier, spending cap, velocity ledger, validation requirement, kill switch. All pass. One CPI call from the facilitator. No migration."

---

## 0:50 – 1:05 — Settlement happens (transfer + explorer link)

**[Cut to facilitator service log streaming on terminal. Lines flash: `Payment authorized → settling on Solana mainnet`. Then: `Transaction signature: 4xK...m9P`. Click signature. Cut to Solana Explorer page (web browser tab). Highlight the USDC transfer leg + the AgentTrust gate-decision program log.]**

**[Voiceover:]**

> "Settlement. USDC transfers to the canonical counterparty's settlement wallet. Live on Solana mainnet. Solana Explorer shows the transfer leg plus our policy-decision program log — every gate decision is on-chain, auditable, replayable."

**[Stage direction: the click-through to Explorer is the proof beat. Make sure mouse cursor is visible.]**

---

## 1:05 – 1:20 — Post-settlement feedback CPI + tier increment

**[Cut back to terminal. Show TrustGate facilitator service emitting:]**

```
$ tx 4xK...m9P → confirmed
$ post-settlement: PDA-signed CPI to atom-engine.give_feedback(rating=POSITIVE)
$ atom-engine: AtomStats updated → tier=3, feedback_count=4,213
```

**[Music swells gently. Hold 3 seconds.]**

**[Voiceover:]**

> "Post-settlement, our facilitator service signs a feedback CPI to Quantu's ATOM Engine on behalf of the agent who just paid. Reputation score updates onchain. Tier increment visible in the registry within one slot."

**[Cut to web view: agent registry page on solana.com/agent-registry showing the canonical agent's tier ticking with a fresh feedback event registered. Brief glance, 2 seconds.]**

---

## 1:20 – 1:30 — Close + Foundation alignment

**[Cut to Mohit on camera, mid-shot. Music holds at low. Direct delivery.]**

> "AgentTrust completes the Foundation's ERC-8004 stack — three Anchor programs, five formally-verified invariants, MIT-licensed. Solo, seventeen days, drop-in for any x402 facilitator."

**[End-card: AgentTrust logo + GitHub URL + "Solana Foundation Frontier 2026" credit line. Hold 3 seconds. Music fade.]**

---

## Optional 30-second extension (push to 2:00 if needed)

If pitch flows under 90 seconds, append the formal-verification beat as an Instagram-worthy moment:

**[Full-screen terminal. Type `cargo kani --harness gate_payment_proofs`. Hit enter. Stream proof output. After 4-5 seconds of "VERIFICATION:Successful" lines, five green check marks appear in a row labeled with invariant names: 1) `policy_authority_can_only_revoke_own_policies`, 2) `velocity_ledger_monotonic`, 3) `kill_switch_overrides_all_other_policies`, 4) `counterparty_tier_read_matches_atom_stats_byte_layout`, 5) `gate_decision_deterministic_given_inputs`. Hold all five for 3 seconds.]**

**[Voiceover:]**

> "Cargo kani. Five invariants. All proven. Every commit. Mert wanted defense in depth — this is the first line, before assets ever move."

**[Stage direction: the five-green-checks frame IS the screenshot for Twitter. Frame it cleanly.]**

---

## Delivery notes

1. **Hard limit 90 seconds** for the core walk-through. The optional FV extension pushes to ~2:00, well within Colosseum's 3-minute technical-walkthrough cap. Do not exceed 2:30 — judge attention drops sharply per `perfecting-your-hackathon-submission` guidance.
2. **No on-camera Mohit until 1:20.** Per Y Combinator pitch guide: "the focus should be on you and your message, not the design elements" — but the technical demo's job is to *be* the substance, so screen-first is correct here. Mohit only appears for the close to lock founder authority.
3. **Music absent during CLI moments** (0:08 to 0:50). Music starts at 0:35 and stays low until close. The CLI is the music.
4. **Variant A is the technical-demo cold open; Variant B is the pitch-video opener.** Both anchor on the Solana-fund treasury-bot/clone-of-real-protocol scenario per `plan/final_idea/PITCH_FRAMES_LOCKED.md` (Variant A is the visual cold open; B is the spoken pitch). Do not mix the two openers — A is screen-first, B is camera-first.
5. **Foundation alignment baked into close.** "Completes the Foundation's ERC-8004 stack" is the load-bearing phrase. Don't substitute.
6. **No banned vocabulary** — audit below.
7. **Subtitles required.** Verify post-auto-transcribe: "x402," "Quantu," "ATOM Engine," "AtomStats," "PDA," "Kani," "Anchor," "USDC," "ERC-8004," "Halborn," "OpenZeppelin," "Asymmetric Research," "treasury bot."

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
| PolicyVault | NO | "policy gate" / "five policy kinds" used as descriptive phrase, not the component name |
| ValidationRegistry | NO | "validation requirement" used as descriptor of one of five policy kinds, not the component name |
| TrustGate | NO | "facilitator service" used to describe its function |
| SAEP | NO | — |
| AgentSafe Hooks | NO | — |

PASS.
