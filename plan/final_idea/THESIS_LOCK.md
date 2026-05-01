# THESIS LOCK — AgentTrust

**Author:** Mohit (solo). **Locked:** 2026-04-28 (Day 4.5 → Day 5 begins 2026-04-29). **Submission:** 2026-05-11. **Build days remaining:** 13.

This file is the single source of truth for what I'm shipping. After this, no thesis re-litigation. Everything downstream — research, code, demo, pitch, deck, DMs, grants — orbits these decisions.

---

## One-sentence pitch (25 words)

**AgentTrust gates AI-agent payments on counterparty identity + reputation from Solana Foundation's endorsed Agent Registry — the third leg Quantu archived, productized in 17 days.**

(Spoken-pitch primary is **Variant B** from `plan/final_idea/PITCH_FRAMES_LOCKED.md` — Solana fund treasury-bot routed $1.2M USDC to a clone of a real Solana protocol; smart-contracts-held-up-but-human-trust-layer-didn't framing. **Variant A** is the technical-demo cold open — same Solana-fund treasury scenario, walk-through driver. **Variant C** is the Twitter / Superteam mass-distribution opener; **Variant D** is the regulated-enterprise cold-email opener. Foundation-alignment embedded across all four. Never name SAEP.)

---

## Scope locked: Option 1 — full 3-component v1 build

I am taking the most ambitious of the four scope options Phase 4 surfaced. I own the time risk. Per `agenttrust-solo-build-assessment.md`, Option 1 is ~64% over the 1.4x-velocity budget; I am operating that as a velocity stretch + outreach compression, not as a scope reduction.

**Three components, all shipped:**

1. **PolicyVault** — Anchor program with **5 policy kinds** (Spending / CounterpartyTier / Velocity / RequireValidation / KillSwitch) + `gate_payment` composer + **full Kani FV harness** (5 invariants).
2. **TrustGate** — Anchor program (PDA-signed `give_feedback` CPI) + TypeScript Express facilitator service + **drop-in TS module** for other facilitators.
3. **ValidationRegistry** — fully productized third leg of ERC-8004. `request_validation` + `respond_to_validation` + `revoke_validation` + `read_attestation` + capability-namespace registry + permissionless attestor v1 (downstream-consumer-filtering sybil model).

<!-- COMMENTED OUT 2026-05-01 (full-build commitment locked, no cut paths under consideration):
The cut-priority order from `agenttrust-solo-build-assessment.md` Section "Cut-priority order" applies if I fall behind. I will *not* deliberate cuts under Day-12 panic — pre-decided cuts survive panic, mid-cut deliberation does not.
-->

Full Option 1 build commitment. No cut paths under consideration during the build phase.

---

## Three runner-ups (with kill reasons)

### Runner-up 1 — AgentSafe Hooks pure (Day-3 sharpened spec)

**Kill reason:** Empty wedge but indirect Foundation-narrative. AgentTrust's load-bearing differentiator — *"completes the Foundation's ERC-8004 trust stack"* — gives a single-shot, Solana-judge-aligned narrative that AgentSafe Hooks structurally cannot stake. The wedge-defensibility advantage of AgentSafe (empty Token-2022 hooks) is real but worth less to me than direct Foundation-narrative alignment when accelerator + Public Goods + Standout are the targets. Day-4.5 reframe-decision verdict already certified DISTINCT — they're stackable, not substitutes — so AgentSafe Hooks moves to Day-30+ companion product, not v1.

### Runner-up 2 — Lead-B enrichment (AgentSafe Hooks + 8004 read)

**Kill reason:** Compromise scope that gets neither benefit cleanly. Lead-B retains AgentSafe Hooks' asset-layer wedge while adding a thin "read AgentAccount tier" hook. Problem: the reverse-mapping problem (`agent-registry-8004` exposes no `["wallet_to_agent", wallet]` PDA) means asset-layer hooks structurally cannot derive *which agent does this transfer represent* cheaply. Adding the read collapses the integration story onto the facilitator — at which point it IS PolicyVault, just architecturally crippled. Pick one layer; the agent-relationship layer is where reputation gating is natural.

### Runner-up 3 — Standalone ValidationRegistry (Public Goods narrow-frame)

**Kill reason:** Strongest *single-component* Foundation-alignment claim, but loses Vibhu (agent commerce), Mert (security/fraud), Matty (accelerator) — three of four gating judges. Lily (Public Goods + Foundation) lands strong but the accelerator-admission goal needs multi-judge bias coverage. ValidationRegistry alone gets Public Goods + Foundation grant pathway but doesn't get accelerator interview, and accelerator is the leveraged outcome. ValidationRegistry stays as Component 3 of the trinity; standalone-frame killed.

---

## Judge-perspective argument — why each gating judge engages

I have to land four judges. Here is what I want each to think when the pitch ends:

### Vibhu Norby (agent commerce — SDP Stripe)
**Engagement target:** *"This finishes the agent-payment trust layer SDP needs. Solo guy, shipped fast, Foundation-aligned, integrates into our flow as one CPI call."*
**How AgentTrust earns it:** Variant B opens citing his own *"15 million agent-driven payments last quarter"* stat verbatim, then drops a $1.2M USDC treasury-bot-routed-to-clone failure case — exactly the SDP storytelling cadence Vibhu posts in. Every PolicyVault `gate_payment` invocation is a primitive SDP could compose with on the merchant-onboarding side. The Q&A response Q2 is pre-drafted: SDP brings merchants in; AgentTrust gates the payments those merchants accept. Stackable, not competing.

### Mert Mumtaz (security / fraud — Helius)
**Engagement target:** *"This is the policy primitive Solana needs to make agent-payments enterprise-safe. The Kani harness on `gate_payment` invariants is the kind of correctness work I respect."*
**How AgentTrust earns it:** Variant B's *"smart contracts held up; the human-trust layer didn't"* line is near-verbatim Lily's [2026-04-02 post-Drift quote](https://x.com/calilyliu/status/2039652201342050713) — Mert engages with that exact framing weekly on X (he lived through the Drift exploit live). The 5-invariant Kani harness on PolicyVault is an Instagram-worthy moment in the technical demo (`cargo kani`, green checks, all 5 invariants proven live on screen). Pre-flight gating is the *first line* — Mert understands defense-in-depth, and TrustGate stacks naturally with asset-layer enforcement on the mint side.

### Matty Taylor (accelerator filter)
**Engagement target:** *"Named buyer in the pitch (x402 facilitator). Open-source primitive that locks the category name. Founder ships solo at 1.5x velocity. Accelerator pattern-match."*
**How AgentTrust earns it:** Three accelerator-shaped signals in the 30-second pitch: (1) named first-buyer category — *"x402 facilitators routing millions in API payments"*; (2) ship-date close — *"Solo engineer, shipping in 17 days"*; (3) Foundation-alignment — *"the registry Solana Foundation just endorsed"* maps to Matty's "real-credibility-shortcut" pattern. Day-5+ DM cadence to Dexter / atxp_ai / MCPay produces the named-customer-quote in the deck that converts a Standout into an accelerator interview.

### Lily Liu (Public Goods + Foundation)
**Engagement target:** *"This completes the ERC-8004 trinity. Open-source, MIT-licensed, no token. The third leg Quantu archived, fully productized."*
**How AgentTrust earns it:** README leads with *"AgentTrust completes the Foundation's ERC-8004 trust stack — the third leg Quantu archived in v0.5.0, fully productized."* ValidationRegistry as a permissionless-attestor primitive is the cleanest Public-Goods-eligible artifact in the trinity. No token. No fee capture. Public-Goods Award eligibility is built into the architecture, not retrofitted in pitch.

---

## Three highest-risk assumptions (and what I'm doing about them)

### Risk 1 — Quantu pushes a breaking change to `agent-registry-8004` mid-hackathon

**Probability:** medium-high (Quantu is shipping aggressively; v0.5.0 → v0.6.0 already happened; v0.7.0 plausible by Day 12).
**Impact:** PolicyVault's manual `AtomStats` deserialization breaks at the byte-offset level if PDA layout shifts.
**Mitigation:** I pin to a **specific commit hash** of `agent-registry-8004` and `atom-engine` and document it in the README. AgentTrust v1 binds to that commit; v1.1 tracks upstream stable releases. The pinning is a one-line Cargo dep + a one-paragraph README note. I will choose the pin commit on Day 5 after reading Wave 1 deep-dive #1 (`plan/research/01-quantu-source-code-class.md`).

### Risk 2 — SAEP announces Foundation endorsement OR x402 facilitator partnership

**Probability:** low-medium (currently zero Foundation reference and zero facilitator partnerships per `saep-deep-recon.md`; but Frontier-window competitive pressure could force a public pivot).
**Impact:** Foundation-alignment differentiation collapses or is shared; pitch must be rewritten under stress.
**Mitigation:** I monitor `@BuildOnSAEP` once per 3 days (Day 7, 10, 13, 16). If announcement happens, the rewritten pitch lead is *"Quantu's Foundation-endorsed primitive shipped first — we extend the canonical implementation, not a parallel one."* Foundation-endorsement-of-Quantu is independently verifiable on solana.com/agent-registry; the differentiation survives the pivot but softens. If Dexter/MCPay/atxp_ai announce SAEP integration before Day 12, I switch first-buyer pitch to whichever facilitator hasn't moved + escalate ValidationRegistry-as-public-goods framing.

### Risk 3 — 17-day scope discipline (the time risk I am owning)

**Probability:** real (Option 1 is 64% over the 1.4x-velocity budget per Phase-4 math).
**Impact:** Cut #1 through Cut #6 trigger in priority order; floor-list breaks if all six cuts don't recover enough.
<!-- COMMENTED OUT 2026-05-01 (full-build commitment locked):
**Mitigation:** I have pre-decided the cut-priority order. I am taping the cut-priority list to the wall. Day-12 panic does not get to override pre-decided cuts. If by Day 16 any of the five floor items breaks, I switch to AgentSafe Hooks pure submission (Day-4 Lead F fallback). The floor-list lock-trigger removes Day-16 panic deliberation.
-->

**Mitigation:** Full-build velocity stretch. **What I am explicitly accepting:** outreach is compressed to 1 round of DMs Day 5-7 with light Day-10 follow-ups; non-essential pitch-deck polish moves to Day 15-16 with friend offload.

---

## First Day-5+ build action (top of the list, before any code)

**Pre-warm 5 demo agents on Quantu's mainnet ATOM Engine.** This is the single most-important Day-5 action that is *not* in the original brief and applies regardless of any other choice I make. Without 12-day tier-accumulation runway starting Day 5, the headline tier-0-vs-tier-3 demo on Day 12 doesn't work.

**Concrete Day-5 morning actions, in order:**

1. **Pre-warm 5 demo agents on Quantu mainnet ATOM** (30 min one-time setup + cron job for daily feedback emission). Cost: cents per registration + 15 min/day.
2. **Anchor workspace scaffold** — single repo, 3 programs (`policy-vault`, `trustgate`, `validation-registry`) + shared `docs/`.
3. **PolicyVault PolicyAccount + VelocityLedger schema** designed (not yet implemented).
4. **3 facilitator DMs sent** — Dexter (@dexteraisol), atxp_ai, MCPay (drafts in `plan/other_tasks/dms/`).
5. **Confirm friend availability** for Days 13-15 video work (15 min).
6. **Pin commit hash** of `agent-registry-8004` + `atom-engine` chosen and documented in v1_scope.

Total Day-5 budget: ~7 hours focused work, plus this lock + scope-pick-confirmation at the start of the day.

---

## What "shipped" means for AgentTrust v1 (the locked deliverables)

<!-- COMMENTED OUT 2026-05-01: "If by Day 16 any of these is broken, I switch to AgentSafe Hooks pure submission" — full-build commitment locked; AgentSafe fallback is not under consideration. -->

These five items are the locked v1 deliverables:

1. PolicyVault `gate_payment` instruction with **CounterpartyTier** policy kind that reads ACTUAL `AtomStats.trust_tier` from atom-engine.
2. One demo (90 seconds minimum) showing live denial-then-acceptance based on counterparty tier.
3. Pitch video at minimum 2-minute length using **Variant B opener** (per `plan/final_idea/PITCH_FRAMES_LOCKED.md` — Solana fund treasury-bot routed $1.2M USDC to a clone of a real Solana protocol; smart-contracts-held-up-but-human-trust-layer-didn't framing).
4. README explicitly framing AgentTrust as **"completes the Foundation's ERC-8004 trust stack — the third leg Quantu archived."**
5. **Foundation-alignment language** in deck + repo + Twitter bio.

These five items are immutable. Everything else has a cut path.

---

## Standing rules I will not violate

1. Never name SAEP in pitch / deck / video / README. Foundation-alignment language does the differentiation work.
2. Never chase agent-developer mindshare during Frontier window — SAEP is courting that segment aggressively (Hermes / Nous / Python SDK / Solana Agent Kit plugin / MCP bridge); facilitator mindshare is where I compete.
3. Never frame as either-or with AgentSafe Hooks. AgentTrust is stackable defense-in-depth — pre-flight gate (PolicyVault) + asset-layer enforcement (AgentSafe Hooks) — not substitute.
4. Always cite Foundation-endorsement of `solana.com/agent-registry` as the load-bearing differentiator. Independently verifiable; survives any competitor pivot.
5. Pre-decided cuts survive panic; mid-cut deliberation does not. The cut-priority order in `agenttrust-solo-build-assessment.md` is rigid by design.

---

## Sign-off

Locked Day 5 morning, 2026-04-29. No further thesis re-litigation. Build phase begins.

— Mohit
