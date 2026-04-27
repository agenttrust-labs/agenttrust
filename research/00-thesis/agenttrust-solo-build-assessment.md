# AgentTrust — Solo Build Assessment (Day 4.5 Phase 4)

**Purpose:** Honest day-by-day buildability map for AgentTrust's three-component scope (PolicyVault + TrustGate + ValidationRegistry) against a solo-builder horizon ending 2026-05-11. Surfaces four scope options with honest day-cost / risk / pitch-coverage tradeoffs so Mohit can pick scope on Day 5 with full math in hand.

**The scope decision is Mohit's.** This doc surfaces the math, the cut-priority order if he ends up behind whichever scope he picks, and the never-cut floor (submission-viable threshold). It does NOT lock a scope.

**Velocity calibration:** Mohit grinds at 1.3-1.5x normal solo-builder pace (per `feedback_time_caps.md`). Estimates use 1.4x baseline. Estimates DO NOT inflate to assume he'll just push through hard scope landmines — landmines are honest scope, not velocity-padding.

**Inputs:**
- `research/00-thesis/agenttrust-moat-analysis.md` (PolicyVault as moat; TrustGate + ValidationRegistry as features)
- `research/06-competitive-intel/agent-registry-cpi-surface.md` (ATOM Engine PDA layouts, instruction surface, reverse-mapping problem)
- `research/06-competitive-intel/saep-deep-recon.md` (SAEP shipped 10 programs in ~7 days as comparison-anchor; their team is anonymous so likely multi-dev)
- `research/00-thesis/agenttrust-reframe-draft.md` (Day-4 component scope as starting estimate baseline)

Last verified: 2026-04-28

---

## Calendar reality check

- **Today:** 2026-04-28
- **Frontier deadline:** 2026-05-11 (Sunday, end of day)
- **Calendar days remaining including today:** 14 days
- **Day 5 (lock + build start):** 2026-04-29
- **Working days remaining for build phase:** 13 days (Day 5 = first build day; Day 13 = May 11 submission day)

Solo-builder partnership context (from memory): Mohit has a non-Web3 friend available for execution-only support — video, ops, pitch polish. This OFFLOADS pitch-video production (~2 days) from solo budget if used effectively.

Effective code budget: 13 days × 1.4x velocity = **18.2 "normal-velocity-equivalent" engineering days for ALL non-pitch-video work**, including code, demos, README, integration testing, debugging, submission packaging.

---

## Component-by-component honest day estimates

Estimates are at NORMAL velocity (1.0x). Multiply by 1.0/1.4 = 0.71 for Mohit-velocity-adjusted ("M-days").

### Component 1 — PolicyVault Anchor program

| Sub-task | Normal-day estimate | M-day estimate (÷1.4) | Notes |
|----------|---------------------|------------------------|-------|
| Schema design (PolicyAccount PDA, VelocityLedger PDA, KillSwitchState PDA) | 1.0 | 0.7 | Standard Anchor PDA layout |
| Anchor workspace scaffold + CI + tests harness | 0.5 | 0.4 | Boilerplate |
| Spending policy kind (per-tx + daily + weekly limits with rollover) | 1.5 | 1.1 | Math + rollover edge cases |
| **Counterparty-tier policy kind (manual deserialization of AtomStats, ATOM tier check)** | **2.5** | **1.8** | **THE wedge. Includes manual PDA-deserialization of foreign program data, ownership check, 3-program coordination. Most complex single instruction in the build.** |
| Velocity policy kind (rolling window with tier-decay) | 1.5 | 1.1 | Math heavy |
| KillSwitch policy kind | 0.5 | 0.4 | Trivial |
| RequireValidation policy kind (read ValidationAttestation, expiry, revocation) | 1.5 | 1.1 | Depends on ValidationRegistry shipping |
| `gate_payment` composer instruction (orchestrates all policy kinds) | 1.5 | 1.1 | Decision logic + error mapping |
| Kani FV harness setup (Cargo + sBPF integration) | 1.0 | 0.7 | One-time setup; familiar pattern |
| Kani proofs (per-policy invariants — 5 policies × 0.5 normal-days each) | 2.5 | 1.8 | Each invariant: ~half-day write + iterate to convergence |
| Bankrun integration tests (5 policy kinds × scenarios) | 1.5 | 1.1 | Standard Anchor testing |
| Devnet integration tests against Quantu's ACTUAL Agent Registry on devnet | 1.5 | 1.1 | Network friction; possibly forced to fall back to mocks if devnet unreliable |
| **PolicyVault total (full v1 with 5 policy kinds + Kani harness)** | **17.5** | **12.4 M-days** | **Effectively the entire 13-day budget for ONE component** |

### Component 2 — TrustGate x402 facilitator (Anchor program + TS service + drop-in module)

| Sub-task | Normal-day estimate | M-day estimate (÷1.4) |
|----------|---------------------|------------------------|
| TrustGate Anchor program (PDA-signed CPI to `agent_registry::give_feedback`) | 2.0 | 1.4 |
| TypeScript x402 facilitator service (Express server + endpoints) | 2.0 | 1.4 |
| POST /verify integration (calls PolicyVault `gate_payment` via CPI) | 1.0 | 0.7 |
| POST /settle (x402 settlement + post-settlement `give_feedback` CPI) | 1.5 | 1.1 |
| Dispute path instruction (`dispute_payment` emits negative feedback + optional ValidationRegistry escalation) | 1.0 | 0.7 |
| Drop-in TypeScript module for other facilitators | 1.5 | 1.1 |
| Integration tests (end-to-end flow) | 1.0 | 0.7 |
| **TrustGate total** | **10.0** | **7.1 M-days** |

### Component 3 — ValidationRegistry Anchor program

| Sub-task | Normal-day estimate | M-day estimate (÷1.4) |
|----------|---------------------|------------------------|
| Schema design (ValidationAttestation PDA, ValidationRequest PDA) | 0.5 | 0.4 |
| `request_validation` instruction | 1.0 | 0.7 |
| `respond_to_validation` instruction | 1.0 | 0.7 |
| `revoke_validation` instruction | 0.5 | 0.4 |
| View helpers + capability-namespace docs | 1.0 | 0.7 |
| Tests | 1.0 | 0.7 |
| Documentation (capability hash conventions, validator-rep model, downstream-consumer-filtering pattern) | 1.0 | 0.7 |
| **ValidationRegistry total** | **6.0** | **4.3 M-days** |

### Non-code work (must happen alongside)

| Sub-task | Normal-day estimate | M-day estimate (÷1.4) | Offloadable to friend? |
|----------|---------------------|------------------------|--------------------------|
| Pitch video script | 0.5 | 0.4 | Partial (Mohit drafts, friend polishes) |
| Pitch video recording + editing | 1.5 | 1.1 | YES — friend handles after script lock |
| Technical demo video script | 0.5 | 0.4 | Partial |
| Technical demo video recording + editing | 1.5 | 1.1 | Partial — Mohit needs to drive product, friend edits |
| README + COMPLETING-THE-TRUST-STACK.md narrative doc | 1.5 | 1.1 | Partial — Mohit writes content, friend formats/proofs |
| Pitch deck (5-7 slides) | 1.0 | 0.7 | YES — Mohit feeds bullets, friend polishes design |
| Submission packaging (Colosseum upload, video upload, repo polish) | 0.5 | 0.4 | YES |
| **Non-code total (Mohit-only after friend offload)** | **3.5 normal-days = 2.5 M-days** | **2.5 M-days** | After friend offload |

### Outreach + customer-discovery (alongside)

| Sub-task | Normal-day estimate | M-day estimate (÷1.4) |
|----------|---------------------|------------------------|
| 6 facilitator DMs Day 5-7 | 0.5 (across 3 days) | 0.4 |
| Response handling + follow-up (assume 2 substantive responses) | 1.0 (across the build phase) | 0.7 |
| 2 cold-emails to regulated-enterprise leads (Stripe / Mastercard / Ramp) | 0.5 | 0.4 |
| **Outreach total** | **2.0** | **1.5 M-days** |

---

## Honest 17-day total assessment (re-cast as 13-calendar-day = ~13 M-day budget)

**Mohit's effective M-day budget for non-pitch-video work: 13 calendar days × 1.4x velocity = ~18 M-days, MINUS 1.1 M-days for pitch-video-recording (cannot offload entirely) MINUS 1.5 M-days for outreach = 15.4 M-days for code + demo + non-pitch-video docs.**

| Scope option | Code M-days needed | Code + non-code total | Math vs 15.4 M-day budget |
|-------|---------------------|------------------------|----------------------------|
| **Full 3-component (5 policy kinds, Kani harness, drop-in TS module, ValidationRegistry full)** | 12.4 + 7.1 + 4.3 = **23.8** | + 1.4 = **25.2 M-days** | Over by 9.8 M-days (~64% over). Requires sustained ~2.0x velocity OR additional days from cutting outreach/non-code work. |
| **Trimmed 3-component (3 policy kinds, Kani harness, drop-in module, ValidationRegistry stub)** | 8.0 + 6.0 + 2.5 = **16.5** | + 1.4 = **17.9 M-days** | Over by 2.5 M-days (~16% over). Closes the gap with ~1.6x velocity OR 2-3 more days from offloading more to friend / cutting outreach scope. |
| **2-component (3 policy kinds, light Kani, no drop-in module, ValidationRegistry as DOCS + stub PDA only)** | 8.0 + 4.5 + 1.0 = **13.5** | + 1.4 = **14.9 M-days** | Fits with ~0.5 M-day buffer at 1.4x velocity. |
| **Minimum viable (2 policy kinds, NO Kani, demo-only facilitator, no ValidationRegistry)** | 5.5 + 3.0 + 0 = **8.5** | + 1.4 = **9.9 M-days** | Comfortable with 5.5 M-day buffer at 1.4x. |

---

## The four scope options compared

The math above is the load-bearing input. The pitch / risk / what-it-loses reads differently per option. Mohit picks Day 5.

### Option 1 — Full 3-component (5 policy kinds + Kani + drop-in module + ValidationRegistry full)

**Pitch coverage:** Maximum. Architecture section + Phase-2 vision both fully shipped. "Trinity is shipped" is literally true.

**Buildability:** ~64% over budget at 1.4x velocity. Requires sustained 2.0x velocity (achievable for some sub-tasks but hard to sustain for 13 days) OR cutting outreach scope to ~zero (no facilitator DM follow-ups, no regulated-enterprise cold-emails) OR friend takes more video-prep work (hard ceiling there since Mohit has to be on camera).

**What it loses if attempted but not completed:** Worst case is half-built ValidationRegistry + half-tested TrustGate + PolicyVault works but no demo — the worst-shape submission. Cut-priority order (below) mitigates by making cuts deliberate not reactive.

**When this option makes sense:** Mohit has stretches of clear focus (no DMs to handle, no integration friction, no CU debugging surprises) AND friend offload is reliable AND he's willing to compress outreach to bare minimum (1 round of DMs, no follow-ups).

### Option 2 — Trimmed 3-component (3 policy kinds + Kani + drop-in module + ValidationRegistry stub)

**Pitch coverage:** Strong. All three components present in repo. ValidationRegistry as stub-with-instruction reads as "shipped a starter implementation" not "spec'd only." Drop-in module strengthens the "any facilitator integrates us" pitch.

**Buildability:** ~16% over budget at 1.4x velocity. Closes the gap with ~1.6x velocity OR 2-3 more days from offloading more to friend / cutting outreach.

**What it loses if attempted but not completed:** Drop-in module is the lowest-pitch-cost cut to make first if behind (Cut #2 below) — failure mode is graceful.

**When this option makes sense:** Mohit wants the full trinity narrative AND is willing to lean on 1.6x sustained velocity AND knows he can compress outreach if needed.

### Option 3 — 2-component (PolicyVault + TrustGate-lite + ValidationRegistry as docs+stub)

**Pitch coverage:** Defensible. Architecture section describes 3 components; build plan honestly notes ValidationRegistry as docs+stub for v1, full productization Phase-2. The "completes the stack" narrative still holds because the spec is in the repo as a starter PDA.

**Buildability:** Fits with 0.5 M-day buffer at 1.4x velocity. Small buffer is razor-thin; ANY of Risk 1-8 materializing will trigger the cut-priority order.

**What it loses:** Drop-in TypeScript module (Phase-2 work). Velocity + RequireValidation policy kinds (v1.1). ValidationRegistry's `respond_to_validation` flow + sybil-resistance research (v1.1+).

**When this option makes sense:** Mohit prioritizes shipping-with-buffer over scope-coverage AND values pre-decided cut margin AND wants the most-conservative path to the never-cut floor.

### Option 4 — Minimum viable (2 policy kinds + demo facilitator + no Kani + no ValidationRegistry)

**Pitch coverage:** Thin. The Kani / "formally-verified" pitch beat lost. ValidationRegistry's "completes the third leg" narrative beat lost. Demo can still show counterparty-tier gating (the wedge survives) but visual richness drops.

**Buildability:** 5.5 M-day buffer at 1.4x velocity. Comfortable.

**What it loses:** The two narrative beats above, plus differentiation richness against SAEP's TreasuryStandard (without Velocity policy kind, PolicyVault demos as "spending limits + tier-gate" only — harder to differentiate at a glance).

**When this option makes sense:** Mohit hits unexpected blockers in Days 5-7 (CU debugging, integration friction, friend availability issues) and falls back to minimum-viable proactively. Or: Mohit prefers maximum buffer for outreach + customer-discovery time.

---

## Honest framing

The 14-day window is real. The 1.4x velocity baseline is real. The 1.5x is sustained-rare not sustained-typical. Mohit can stretch to 1.6-1.8x for short periods at cost of fatigue/quality (which compounds risk on integration days like Day 11 when end-to-end test demands focus).

**Tradeoff at the highest level:**
- More components shipped = stronger pitch + tighter buildability margin + higher Day-12 panic probability
- Fewer components shipped = honest pitch with Phase-2 framing + comfortable margin + lower panic probability

The cut-priority order (below) makes ANY scope choice safer because it pre-decides what to drop if behind, removing Day-12 deliberation under stress. The never-cut floor defines the submission-viable threshold regardless of scope chosen.

---

## Daily milestones (illustrated for the 2-component scope; Options 1, 2, 4 shift the same backbone)

Below is one concrete day-by-day schedule, illustrated for the 2-component scope. The spine (PolicyVault → TrustGate → Demo → Pitch → Submission) is the same for any scope option Mohit picks; the difference is where Days 9-12 spend their hours (more policy kinds, more Kani invariants, more ValidationRegistry surface, or drop-in module work).

| Day | Date | Primary deliverable | Stretch |
|-----|------|---------------------|---------|
| **Day 5** | Apr 29 | Mohit reads SHARPENED, writes THESIS_LOCK.md (~1hr). Anchor workspace scaffold (3 programs: policy_vault, trustgate, validation_registry stub). PolicyVault schema design (PolicyAccount PDA, VelocityLedger PDA). FIRST 3 facilitator DMs sent (Dexter, atxp_ai, MCPay). | Cargo build green on empty modules |
| **Day 6** | Apr 30 | PolicyVault Spending policy kind: per-tx + daily + weekly with rollover. Bankrun unit tests. | Pre-warm 3-5 demo agents on Quantu's mainnet ATOM (start the tier-vesting clock) |
| **Day 7** | May 1 | PolicyVault Counterparty-tier policy kind. Manual deserialization of AtomStats from foreign program. Devnet integration test against Quantu's actual ATOM Engine. | Email regulated-enterprise leads (Stripe / Ramp / Mastercard) |
| **Day 8** | May 2 | PolicyVault Velocity policy kind (rolling window). PolicyVault KillSwitch policy kind. | Begin TrustGate Anchor program scaffold |
| **Day 9** | May 3 | PolicyVault `gate_payment` composer instruction. Begin Kani harness setup (`cargo kani` working). | First Kani invariant proven (`paused → no Allow`) |
| **Day 10** | May 4 | TrustGate Anchor program: PDA-signed CPI to `give_feedback`. TrustGate TypeScript service: POST /verify (calls PolicyVault). | Second Kani invariant proven (`velocity ≤ limit`) |
| **Day 11** | May 5 | TrustGate POST /settle + post-settlement `give_feedback` CPI. Full end-to-end test (agent A → TrustGate → PolicyVault → settlement → feedback). | ValidationRegistry stub PDA + `request_validation` instruction |
| **Day 12** | May 6 | Demo dry-run #1: live walkthrough of pre-flight gate denying tier-0 agent + accepting tier-3 agent. Identify and fix any demo-shape bugs. | Demo polish (pre-warmed agents now at tier 2-3) |
| **Day 13** | May 7 | Pitch video script lock. Friend begins pitch video edit. Mohit records technical demo video (consumer-fraud opener variant per Phase 3). | DM follow-ups; aim for 2 affirmative responses |
| **Day 14** | May 8 | Pitch video recording (Mohit on camera, friend directs). Buffer day for any code regressions surfaced in demo dry-runs. | README first draft |
| **Day 15** | May 9 | README final + COMPLETING-THE-TRUST-STACK.md narrative doc. Pitch deck polish (with friend). | Pre-empted-Q&A (Phase 3) drilled for accelerator interview |
| **Day 16** | May 10 | Final integration test on devnet. Mainnet deployment of PolicyVault + TrustGate (program-deploy + initialize). Repo polish. | Pre-submission peer sanity-check (1-2 Superteam India peers watch pitch video cold) |
| **Day 17** | May 11 | Submission upload to Colosseum (video URLs, repo URL, deck, summary). Final-day buffer for any submission-portal friction. | Twitter announcement thread |

### Dependencies graph

```
PolicyVault (Day 5-9) ────┐
                          ↓
                     TrustGate (Day 8-11) ────┐
                                              ↓
                                         Demo (Day 12-13)
                                              ↓
ValidationRegistry stub (Day 11) ─────────────┴──→ Submission (Day 17)
                          ↓
                     Pitch video (Day 13-14, friend-driven)
                          ↓
                     README + Deck (Day 15)
```

PolicyVault is on the critical path. Any 1-day slip on Day 5-9 propagates to Day 11 (TrustGate completion). Any 1-day slip on Day 11 propagates to Day 13 (demo dry-run #1). Any slip past Day 14 puts submission at risk.

---

## Cut-priority order if behind schedule (pre-decided)

Per Day 4.5 brief: "Identify 'what gets cut first if behind schedule' — explicit prioritization order so Day-12 emergency cuts are pre-decided."

**The order below is rigid by design. Day-12 panic disables judgment; pre-decided cut order survives panic. Apply in sequence; do not reorder under stress.**

The order applies regardless of which scope option Mohit picks at lock — every scope option has cuts available in this priority sequence as the budget tightens.

### Cut #1 (if behind by end-of-Day-9): Drop the SECOND Kani invariant proof
- Trigger: Day 9 evening, `gate_payment` composer is shipped but only 1 Kani invariant is proven.
- Action: Ship with 1 Kani proof in v1 instead of 2. Pitch beat shifts from "we proved 2 critical invariants" to "we proved the most critical invariant — kill-switch correctness."
- Cost: 1 pitch beat softer. Demo unchanged.
- Recovers: 0.5 M-days.

### Cut #2 (if behind by end-of-Day-10): Drop ValidationRegistry stub entirely
- Trigger: Day 10 evening, TrustGate is half-built.
- Action: Remove ValidationRegistry from v1 submission entirely. Repo's `validation-registry/` directory is empty + has README.md saying "Phase 2 work — see COMPLETING-THE-TRUST-STACK.md for spec." Pitch beat shifts from "trinity is shipped" to "two of the trinity are shipped + spec'd third leg in repo for Phase 2."
- Cost: 1 narrative beat softer. The "completes the trinity" claim becomes "completes 2 of 3 of the trinity, third specced." Foundation-narrative survives but is slightly weaker.
- Recovers: 1.0 M-days.

### Cut #3 (if behind by end-of-Day-11): Drop the Velocity policy kind from PolicyVault
- Trigger: Day 11 evening, end-to-end TrustGate flow not running.
- Action: Ship PolicyVault with Spending + Counterparty-tier + KillSwitch only. Velocity becomes v1.1 work.
- Cost: One demo scenario lost (the "rapid-burst attack" demo). Pitch unaffected — the wedge is Counterparty-tier policy.
- Recovers: 1.1 M-days.

### Cut #4 (if behind by end-of-Day-12): Drop Kani entirely
- Trigger: Day 12 evening, demo dry-run #1 reveals critical bugs that need full Day 13.
- Action: Drop Kani harness from v1. Pitch beat shifts from "formally-verified" to "open-source, fully-tested, audit-roadmap-published." Repo includes Kani-harness skeleton with README "v1.1 work."
- Cost: One pitch differentiator lost. Demo unaffected.
- Recovers: 1.8 M-days.

### Cut #5 (if behind by end-of-Day-13): Drop TrustGate post-settlement feedback emission
- Trigger: Day 13 evening, demo recording in progress but feedback emission unreliable.
- Action: Ship TrustGate with pre-flight gate only. Post-settlement feedback becomes v1.1. Pitch beat shifts from "closes the trust loop with programmatic feedback" to "pre-flight gate; feedback emission spec'd for v1.1."
- Cost: Half the TrustGate value-prop. The "closes the trust loop" narrative becomes "starts the trust loop."
- Recovers: 0.7 M-days.

### Cut #6 (if behind by Day 14): Drop devnet polish, accept localhost-only demo
- Trigger: Day 14 morning, pitch video recording day, devnet flakes in dry-run.
- Action: Demo runs against localhost validator with mock ATOM Engine. Pitch beat shifts from "live on devnet against Quantu's mainnet ATOM" to "demonstrated against test ATOM data; production deployment to devnet pending OtterSec audit (Phase 2)."
- Cost: Demo loses "live against Foundation-endorsed primitive" beat. Significant. Avoid this cut if at all possible.
- Recovers: 0.7 M-days.

### What is NEVER cut (pitch survival floor)

These are the floor — if any one cannot ship, submission is not viable and Mohit must escalate to "submit AgentSafe Hooks pure" fallback (per Day-4 Lead F):

1. **PolicyVault `gate_payment` instruction with Counterparty-tier policy that reads ACTUAL AtomStats trust_tier.** This IS the wedge. Cannot ship without it.
2. **One demo (90 seconds minimum) showing live denial-then-acceptance based on counterparty tier.** The proof of the pitch claim.
3. **Pitch video at minimum 2-minute length using Phase 3 Variant B opener.** Submission requirement.
4. **README explicitly framing AgentTrust as "completes the Foundation's ERC-8004 trust stack."** The narrative differentiation lives in the README.
5. **Foundation-alignment language in deck + repo + Twitter bio.** Differentiation from SAEP lives in this language.

If any of #1-5 can't be honored by Day 16, switch to AgentSafe Hooks pure submission (Day-4 Lead F). The five-floor list is the lock-trigger for the fallback.

---

## Risk register (specifically what could blow up the build)

### Risk 1 — CU cost of `gate_payment` exceeds limit at scale
- **Severity:** HIGH for production but MEDIUM for hackathon demo (demo is single-tx not 1000 TPS)
- **Cause:** `gate_payment` reads AtomStats from atom-engine + AgentAccount from agent-registry-8004 + own PolicyAccount + own VelocityLedger = 4 PDA reads + manual deserialization of 2 foreign-program accounts. CU budget on Solana mainnet is 1.4M per tx; complex CPI patterns can hit this.
- **Mitigation:** Profile early (Day 7 first integration test). If approaching 800K CU, split `gate_payment` into 2-instruction pattern: `gate_check` (read-only, can be off-chain replicated) + `gate_commit` (write velocity counter). Keep monolithic only if profiling confirms <600K CU.
- **Demo impact if hit:** None — demo is single-payment, well within 1.4M.

### Risk 2 — Quantu's ATOM tier vesting (~20 days) means demo agents are tier 0
- **Severity:** HIGH for demo storytelling (tier-0-vs-tier-3 demo doesn't work if ALL demo agents are tier-0)
- **Cause:** Per Day-4 doc limitation: tier vesting takes 8 epochs ≈ 20 days. New agents register at tier 0 / Unknown. AgentTrust hackathon timeline is too short for organic tier accumulation.
- **Mitigation A:** Pre-warm 3-5 agents starting Day 5 by giving them positive feedback events daily. By Day 12 (demo day), they should be at tier 1-2. Not as visceral as tier 4 (Platinum) but enough to demonstrate the wedge.
- **Mitigation B:** Demo can include "watch reputation accrue over time" framing, where tier-0 agent receives 5 feedback events live in the demo and then re-runs the same payment which now passes. Shows the dynamic.
- **Mitigation C:** Use devnet ATOM Engine where Mohit controls tier directly (if devnet exposes admin-set-tier or if Mohit can run a parallel ATOM instance for demo purposes only).
- **Best path:** Mitigation A + B combined. Pre-warm + show live accrual.

### Risk 3 — Reverse-mapping PDA absence forces demo design constraints
- **Severity:** LOW (demo can be designed around it) but risks pitch if a judge asks "why doesn't AgentSafe Hooks just add reputation gating via a hook?"
- **Cause:** Per Day-4 reframe-decision criterion (a), 8004-Solana has no public PDA at `["wallet_to_agent", wallet]`. Asset-layer hooks structurally cannot do reputation-aware gating cheaply.
- **Mitigation:** Demo always passes `payer_agent_asset` and `payee_agent_asset` as remaining_accounts (the facilitator is responsible for knowing which agents are involved — this is PolicyVault's design point). Pitch Q&A response is pre-drafted (Phase 3 Q1).
- **No blocker for AgentTrust** — this is actually our moat statement.

### Risk 4 — Quantu makes a breaking change to `agent-registry-8004` mid-hackathon
- **Severity:** MEDIUM
- **Cause:** Quantu is shipping aggressively (Day-4 research showed mainnet 2026-03-02 with v0.5.0, v0.6.0). They may push v0.7.0 with PDA layout changes that break AgentTrust's manual deserialization.
- **Mitigation:** Pin to specific commit hash of agent-registry-8004 in AgentTrust's code. Document in README: "AgentTrust v1 integrates with agent-registry-8004 commit [hash]; v1.1 will track upstream stable releases." Acceptable risk.

### Risk 5 — SAEP announces Foundation endorsement or x402 facilitator partnership mid-hackathon
- **Severity:** HIGH for pitch differentiation; MEDIUM for build (no code change required)
- **Cause:** SAEP shipping pace + Frontier-window competitive pressure could force them to seek Foundation alignment publicly. Or Dexter/MCPay might announce SAEP integration to pre-empt AgentTrust.
- **Mitigation:** Monitor [@BuildOnSAEP](https://x.com/BuildOnSAEP) once-per-3-days (Day 7, 10, 13, 16). If announcement happens: rewrite pitch to lead with "Quantu's Foundation-endorsed primitive shipped first — we extend the canonical implementation, not a parallel one." Foundation-alignment language survives competitor pivot because Quantu's Foundation status is independently verifiable on solana.com/agent-registry.

### Risk 6 — KAMIYO ships their stake-backed escrow before Day 12
- **Severity:** MEDIUM (KAMIYO is adjacent, not direct competitor)
- **Cause:** Per Day-4 KAMIYO research, they're "building stake-backed escrows on top of registry." Ship date unknown but feasible mid-hackathon.
- **Mitigation:** Pitch differentiation from KAMIYO is "policy primitive vs escrow primitive — different categories" (per Phase 0 differentiation). Pre-drafted in Phase 3 Q&A. No code change required.

### Risk 7 — One of the cut-priority cuts surfaces a regression that breaks demo
- **Severity:** MEDIUM
- **Cause:** Ripping out a feature mid-build often surfaces hidden coupling. E.g., if Cut #5 (post-settlement feedback) is needed Day 13, the post-settlement code might have crept into the demo flow such that removing it breaks demo entirely.
- **Mitigation:** Each cut decision triggers a 1-hour smoke test of the demo flow. If smoke test fails, REVERT the cut and try the next cut in priority order. Better to ship slower than broken.

### Risk 8 — Friend offload doesn't materialize in time
- **Severity:** MEDIUM
- **Cause:** Non-Web3 friend may be unavailable or slow at video editing.
- **Mitigation:** By Day 7, confirm friend's availability for Days 13-15. If unavailable, drop technical-demo-video to absolute-minimum (single-take screen recording with voiceover, no editing) — recovers ~1 M-day from solo budget but reduces production polish.

---

## Comparison: AgentTrust vs AgentSafe Hooks buildability

For Mohit's lock-decision Day 5, side-by-side buildability inputs:

| Axis | AgentSafe Hooks (Day-3 plan) | AgentTrust (this Phase 4 plan) |
|------|-------------------------------|--------------------------------|
| Total LOC estimate | 1900 LOC over 12-14 days | Range — depends on scope option (Option 4 ~1500 LOC, Option 3 ~2000 LOC, Option 2 ~2700 LOC, Option 1 ~3500 LOC) |
| Components | 1 (VeriHook + AgentSafe Hooks single-repo) | Range — 2 to 3 depending on Mohit's Day-5 scope pick |
| Dependency on external Solana primitive | Token-2022 (canonical, low risk) | Quantu agent-registry-8004 + atom-engine (Foundation-endorsed but Quantu-maintained — medium risk) |
| Critical path | VeriHook hook modules | PolicyVault `gate_payment` composer |
| Demo complexity | Live mint enforcing velocity-cap | Live PolicyVault denying tier-0 + accepting tier-3 |
| Kani harness scope | One harness per hook module (6-8 invariants) | Range — Option 1/2 has full harness, Option 3 has 1-2 invariants, Option 4 has none |
| Foundation-alignment leverage | LOW (Token-2022 is Foundation but not "narrative" Foundation) | HIGH (Foundation-page-endorsed Agent Registry) |
| Wedge-defensibility (per Day-4 broader research) | HIGH (empty wedge) | MEDIUM (contested wedge — SAEP, KAMIYO adjacent) |
| Buildability margin | COMFORTABLE (Day-3 plan finished with buffer) | Scope-dependent — see four-option table above |

The buildability inputs and Foundation-narrative inputs point in opposite directions. Mohit weighs Day 5.

---

## What this means for Mohit's submission

- **The math (above) is the honest input. Pick scope Day 5 with the four-option table in hand.** Each option has a distinct pitch-coverage / buildability-margin / what-it-loses profile. The cut-priority order applies to whichever scope is picked.
- **Pre-warm 3-5 demo agents on Quantu's mainnet ATOM Engine STARTING DAY 5.** This is the single most important Day-5 action that's NOT in the brief, and it applies regardless of scope picked. Without it, demo-day agents are tier 0 and the headline demo doesn't work. Cost: a few cents per agent registration + ~5 min/day of feedback emission. Benefit: tier-2-or-3 agents by Day 12 demo.
- **Pitch claim survives any scope choice.** Pitch (Phase 3) frames AgentTrust as "the policy + verification layer that completes the Foundation's stack." Each scope option has a different shipped/spec'd ratio that supports this claim — Option 1 ships all three; Option 2 ships three (one as stub); Option 3 ships two + one as docs+stub; Option 4 ships two (no ValidationRegistry). All four are honestly defensible by adjusting the "completes the stack" framing per how much was shipped.
- **The two theses cluster differently on buildability vs narrative inputs.** AgentSafe Hooks: comfortable buildability margin + indirect Foundation-narrative. AgentTrust: scope-dependent buildability margin (comfortable at Option 4, razor-thin at Option 3, over-budget at Options 1-2) + direct Foundation-narrative. This is a Day-5 Mohit-decides tradeoff.
- **If Mohit locks AgentTrust Day 5, FIRST DAILY ACTIONS (Day 5):**
  1. Anchor workspace scaffold (3 hours)
  2. PolicyVault PolicyAccount + VelocityLedger schema (2 hours)
  3. Send 3 facilitator DMs (Dexter, atxp_ai, MCPay) — 1 hour
  4. **Pre-warm 5 demo agents on mainnet ATOM** — 30 min one-time + scheduled daily feedback emission (cron job, 15 min setup)
  5. Confirm friend availability for Days 13-15 video work — 15 min
  Total Day-5: ~7 hours focused work, plus the THESIS_LOCK.md write + scope pick at the start of the day.
- **If Mohit locks AgentSafe Hooks Day 5 instead**, this Phase-4 doc becomes archival for the AgentTrust-not-locked path. The buildability findings (PolicyVault complexity, ATOM tier vesting risk, SAEP differentiation positioning) all transfer to a Lead-B (AgentSafe + 8004-read enrichment) variant if Mohit wants to thread the needle.
- **The cut-priority order MUST be drilled into Day-9+ memory regardless of scope picked.** Mohit prints the cut-priority section, tapes it to the wall. Day-12 panic doesn't get to override it. Pre-decided cuts survive panic; mid-cut deliberation does not.
