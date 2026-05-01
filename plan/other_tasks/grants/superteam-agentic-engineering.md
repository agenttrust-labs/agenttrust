# Superteam Earn — Agentic Engineering Grant ($200) — AgentTrust Application Draft

> **🔧 AI APPLY-TIME DIRECTIVE.** Read `plan/other_tasks/grants/GRANT_APPLICATION_DISCIPLINE.md` end-to-end FIRST. Apply all 11 rules.
>
> **Status: APPROVED 2026-04-29** (same-day turnaround from submission). $200 USDG, tranche 1 payment processes Monday 2026-05-04 noon UTC. Subsequent tranches claimed via "share an update" on grant listing page once milestones ship. Submission artifacts at `/Users/mohit/agenttrust-grant/` (uploaded to Drive). This file is the historical reference; lessons captured in the discipline doc.
>
> **Most-load-bearing rules for THIS grant:**
> 1. Rule 11 — solana.new eligibility check (the form's bottom note evaluates on whether you used solana.new with claude/codex; produce transcript artifact via Drive upload)
> 2. Rule 1 — form fields ≤200 words, Drive folder for depth
> 3. Rule 6 — one-liner ≤150 chars (Earn enforces hard cap)
> 4. Rule 4 — builder voice, no em-dashes (the agent-generated first draft was full of AI-slop tells)
> 5. Rule 5 — strip internal-risk language ("tier vesting takes ~20 days" leaked from change file into milestones; cut it)
>
> **Grant-specific gotchas:**
> - The bottom note about solana.new is the actual eligibility filter. Run the prompt verbatim in solana.new + upload transcript to Drive.
> - "Colosseum Crowdedness Score" is a real requirement (verified via colosseum.com/copilot — solana.new added it correctly, not a hallucination).
> - Earn embedded wallet auto-fill is available; use it.
> - Reviewer Paaru Sethi (Superteam India lead, @paarugsethi on Telegram) — warm intro possible if you re-apply or escalate.

**Grant URL:** [superteam.fun/earn/grants/agentic-engineering](https://superteam.fun/earn/grants/agentic-engineering)
**Cheque size:** **$200 USDG** (average $198)
**Total deployed:** $19.2K across 97 recipients (lifetime)
**Eligibility:** Global (no geographic restriction)
**Status:** OPEN
**Decision timeline:** **1-week** average response
**Sponsor:** Superteam
**Reviewer:** Superteam team — support@superteam.fun
**Required skills:** Frontend / Blockchain / Backend / Content (AgentTrust covers all four)

**Submission target date:** 2026-04-29 (Day 5 — fastest action item)
**Decision target:** 2026-05-06 (Day 12 — well before Frontier submission)

---

## Strategic framing — why apply for $200

Trivial cash. The application is the strategy. Three reasons to file Day 5:

1. **Public listing on Superteam Earn agentic-engineering grants page.** Becomes citable proof in Frontier deck Slide 6 ("supported by Superteam") + Foundation grant application Section 9 (concurrent applications) + accelerator interview answer ("Superteam network credibility").
2. **Reusable narrative artifact.** "Awarded by Superteam Earn agentic-engineering program for AgentTrust — completing Foundation's ERC-8004 trust stack" is a one-line social-proof asset that compounds across other applications.
3. **20-minute application time.** This is the lowest-effort grant in the inventory. Filing Day 5 maximizes time-on-listing visibility (the listing stays public after award).

**Pitch posture:** lightweight; this is a 5-field form, not a milestone-based grant. Variant B pitch in 1-2 paragraphs. GitHub link. That's the shape.

---

## Application draft

The Superteam Earn application form is form-based (~5-7 short fields). Adapt to actual form structure on the application page.

### Q1: Project name
**AgentTrust**

### Q2: One-line description (≤200 characters)
Three Anchor programs that complete Solana Foundation's ERC-8004 trust stack — productizing the third leg Quantu archived. x402-spec-compliant facilitator gating + permissionless Validation registry.

### Q3: GitHub URL
[Mohit: insert your repo URL]

### Q4: Project description (target ~200 words)

AgentTrust is a three-component on-chain trust layer for AI-agent payments on Solana:

1. **PolicyVault** — Anchor program with 5 policy kinds (Spending, CounterpartyTier, Velocity, RequireValidation, KillSwitch) + `gate_payment` composer + 5 Kani formal-verification invariants proving correctness via `cargo kani`.
2. **TrustGate** — Anchor program (PDA-signed `give_feedback` CPI to agent-registry-8004) + TypeScript Express x402 facilitator service + drop-in TS module `@agenttrust/trustgate` so any Express facilitator integrates AgentTrust in 1 line.
3. **ValidationRegistry** — the third ERC-8004 leg Quantu archived in v0.5.0 ([github.com/QuantuLabs/8004-solana](https://github.com/QuantuLabs/8004-solana)), fully productized. 6 instructions, 10 capability namespaces, permissionless attestor model.

The use case: Solana processed fifteen million agent-driven payments last quarter. Last week a treasury bot routed $1.2M USDC to a clone of a real Solana protocol — smart contracts held up; the human-trust layer didn't. There's no on-chain check that gates agent payments on counterparty identity and reputation against the registry Solana Foundation just endorsed. AgentTrust is that check. (Variant B per `plan/final_idea/PITCH_FRAMES_LOCKED.md`.)

MIT-licensed across all 3 programs. Drop-in distribution via npm. Foundation-aligned narrative anchored in `docs/COMPLETING-THE-TRUST-STACK.md`.

### Q5: How will the $200 be used?

Mainnet RPC costs and Solana fees for 5 pre-warmed demo agents on Quantu's ATOM Engine (8-epoch tier vesting requires ~20 days of feedback events; mainnet-only state). Trace: ~$2-5/day × 30 days = $60-$150; remainder covers npm publish + GitHub Actions CI minutes for `cargo kani` runs (formal verification proofs are CPU-intensive).

### Q6: Twitter / X
[Mohit: insert handle]

### Q7: Telegram / Discord (if asked)
[Mohit: insert handle]

### Q8: Country
India

### Q9: Anything else? (catchall — target ~80 words)

AgentTrust is my Frontier 2026 submission (deadline 2026-05-11). Solo build, daily Anchor commits since Day 1 (2026-04-06). The Solana Foundation's recent moves — joining Linux Foundation's x402 Foundation, announcing an x402 payments gateway, endorsing Quantu's `agent-registry-8004` — make this the right window to ship the trust-stack-completion. Foundation-aligned, open-source, no token, no fee capture in v1. Public-Goods Award eligible.

---

## Required attachments / supporting links

- **GitHub repo:** [Mohit: insert URL]
- **Twitter:** [Mohit: insert handle]
- **README leads with Foundation-alignment narrative**

---

## Submission strategy notes

1. **Day 5 morning action.** Highest-priority lowest-effort grant. File before any code work.

2. **Cap fill time at 20 minutes.** This draft text fills in 5 minutes; remaining 15 minutes is reviewing fields + clicking submit.

3. **Don't over-iterate.** $200 grant doesn't justify 2 hours of polish. The narrative quality is more than enough for a 1-week-decision Earn grant.

4. **Re-apply if rejected.** Application has near-100% acceptance rate based on 97 recipients × $198 average; rejection would be unusual.

5. **Day-12 decision check-in.** If awarded, screenshot the public listing on the Superteam Earn agentic-engineering grants page; reuse in Frontier deck Slide 6 + Foundation grant application Section 9.

---

## Personalization gaps Mohit must fill

- [Mohit: insert your X / Twitter handle]
- [Mohit: insert your Telegram / Discord handle]
- [Mohit: insert your repo URL]
- [Mohit: confirm $200 use-of-funds breakdown is accurate to actual cost model]

---

## Decision-makers / reviewer profiles

- **Superteam team (anonymous reviewer).** Earn applications are reviewed by Superteam ops team; not individual judging
- **Email contact:** support@superteam.fun

---

## Standing-rule compliance checklist

- [ ] Never names SAEP — confirmed
- [ ] Foundation-alignment language present (Q4, Q9)
- [ ] Variant B elevator pitch adapted (Q4 paragraph 4)
- [ ] All claims cite primary source URL inline (agent-registry-8004 GitHub)
- [ ] No hedging vocabulary
- [ ] Public-Goods Award eligibility flagged (Q9)
- [ ] India residence confirmed (Q8)
