# Solana Foundation India Grants — AgentTrust Application Draft

> **🔧 AI APPLY-TIME DIRECTIVE.** Read `plan/other_tasks/grants/GRANT_APPLICATION_DISCIPLINE.md` end-to-end FIRST. Apply all 11 rules.
>
> **Suggested apply day: Frontier Day 6 (2026-04-30)** with v1 README + devnet demo + GitHub link. 30-day decision lands post-Frontier.
>
> **Most-load-bearing rules for THIS grant:**
> 1. Rule 6 — one-liner ≤150 chars (Earn-platform cap, same as Superteam Agentic Engineering)
> 2. Rule 1 — form fields ≤200 words; Drive folder for depth
> 3. Rule 2 — citation discipline (every claim with primary-source URL inline; Indian reviewers are technical and will Google-check)
> 4. Rule 4 — builder voice, India-builder-natural (don't over-formalize; warm voice OK with Superteam India)
> 5. Rule 7 — Primary KPI must be single + binary + verifiable on Solana mainnet (not "≥3 facilitator integrations")
>
> **Grant-specific gotchas:**
> - **India-only eligibility.** Mohit qualifies (India-based per memory). Mention "Superteam India member" / Bangalore presence if applicable in founder section.
> - **Reviewer is Paaru Sethi** (lead, contactable via @paarugsethi on Telegram). Warm-intro DM via Telegram BEFORE filing the form is high-leverage. Mention you're applying.
> - **$10K cap** (smaller than Foundation Direct's $15-50K). Don't ask for more than $10K.
> - **30-day decision window** — files Day 6, decides ~Day 36 (post-Frontier). Frontier prize win (if landed) is a credibility multiplier in any post-decision conversations.
> - **Reuse the Superteam Earn application's Drive folder** if structurally similar — saves time. But the form fields are different, so reformat.

**Grant URL:** [superteam.fun/earn/grants/solana-foundation-india-grants](https://superteam.fun/earn/grants/solana-foundation-india-grants)
**Maximum check size:** $10,000 USDC
**Average grant:** $3,562 (66 historical recipients, $235.1K total deployed lifetime)
**Eligibility (verbatim from listing):** *"This grant is only open for people in India"*
**Status:** OPEN
**Decision timeline:** 30-day average response
**Reviewer / point of contact:** Paaru Sethi (Superteam India lead, contact via Telegram @paarugsethi or email aditya@adityashetty.xyz per associated CoinDCX listing; main inquiries route through Superteam India support)
**Required application skills:** Frontend / Blockchain / Backend / Content (AgentTrust covers all four)

**Submission target date:** 2026-05-04 (Day 10 of build phase)
**Decision target:** 2026-06-03 (~21 days post-Frontier deadline)

---

## Strategic framing

The 30-day decision window aligns with the Frontier build calendar. The optimal positioning: ask for $10K to ship 3-component v1 by 2026-05-11 — turning the build itself into the funded milestone. Decision lands post-Frontier-submission. If Frontier prize wins, India grant doubles as runway. If Frontier prize doesn't land, India grant funds Day 18+ post-Frontier maintenance and v1.1 work.

**Pitch posture:** open-source, infrastructure, public-goods first. NEVER name SAEP. Foundation-alignment language is the differentiator. Variant B elevator pitch adapted (Anthropic B2B agent-payment fraud → AgentTrust as the trust check). Lead with "completes the Foundation's ERC-8004 trust stack."

---

## Application draft (paste into Superteam Earn application form)

The Superteam Earn grant application is form-based with custom questions per sponsor. Below covers the question-pattern observed across Earn grants. Adapt to actual form fields.

### Q1: Project name
**AgentTrust**

### Q2: One-line description (≤120 characters)
**Three Anchor programs that complete Solana Foundation's ERC-8004 trust stack — productizing the third leg Quantu archived.**

### Q3: GitHub repository URL
**[Mohit: insert your repo URL — e.g., https://github.com/<handle>/agenttrust]**

### Q4: Project lead — full name + Telegram + Twitter
- Name: Mohit [Mohit: confirm last name for grant records]
- Email: swayamps4567@gmail.com
- Twitter / X: [Mohit: insert handle]
- Telegram: [Mohit: insert handle]
- Country: India
- Prior open-source / Solana work: [Mohit: insert prior projects, GitHub stars, hackathon entries, bounties won]

### Q5: What does AgentTrust do? (target ~250 words)

AgentTrust is a three-component on-chain trust layer for AI-agent payments on Solana:

1. **PolicyVault** — an Anchor program with five composable policy kinds (Spending limits, CounterpartyTier verification, Velocity ledger, RequireValidation gating, KillSwitch multisig pause) plus a `gate_payment` composer instruction. PolicyVault is what an x402 facilitator calls before settling any agent payment. Manual deserialization of `AtomStats.trust_tier` from Quantu's atom-engine PDA gives PolicyVault counterparty-aware decisions without needing a parallel registry.
2. **TrustGate** — an Anchor program plus TypeScript Express service plus drop-in TS module (`@agenttrust/trustgate`). TrustGate is the x402-spec-compliant facilitator integration kit. `mountTrustGate(app, config)` adds the four x402 endpoints (verify / settle / dispute / receipt) to any Express app in one line. PDA-signed CPI emits `give_feedback` to `agent-registry-8004` after every clean settlement, feeding reputation into the Foundation-endorsed registry.
3. **ValidationRegistry** — the third leg of ERC-8004 that Quantu archived in v0.5.0. Productized: `request_validation` / `respond_to_validation` / `revoke_validation` / `read_attestation` / capability-namespace registry. 10 v1 capability namespaces seeded (KYC tiers, smart-contract audits, model cards, jurisdiction compliance, agent provenance). Permissionless attestor model with downstream-consumer-filtering sybil resistance.

The narrative anchor is concrete: Solana processed fifteen million agent-driven payments last quarter. As volume rose, so did counterparty fraud — last week a treasury bot routed $1.2M USDC to a clone of a real Solana protocol. Smart contracts held up; the human-trust layer didn't. There's no on-chain check that gates payments on counterparty identity and reputation against the registry Solana Foundation just endorsed. AgentTrust IS that check. (Variant B per `plan/final_idea/PITCH_FRAMES_LOCKED.md`.)

### Q6: Why on Solana? (target ~150 words)

Solana is the only chain where this build is feasible in 17 days:

1. **Solana Foundation has endorsed Quantu's `agent-registry-8004` as the canonical agent-identity primitive.** AgentTrust extends it instead of competing. No EVM equivalent exists with Foundation endorsement.
2. **ATOM Engine (Quantu's reputation primitive) is Solana-native.** Tier vesting requires 8 epochs (~20 days) of feedback events; only mainnet has the production state. Cross-chain ports are roadmap items, not shipped.
3. **400ms finality + sub-cent transaction cost** make pre-flight payment gating economically viable. PolicyVault's `gate_payment` composer must be cheaper than the payment itself for the architecture to make sense; Solana's fee profile is the only chain where this holds at agent-payment scale (millions of API payments per day, 65% of x402 transactions per March 2026 Solana Foundation data).
4. **Anchor + manual cross-program PDA deserialization** allow AgentTrust to bind to specific `agent-registry-8004` commit hashes for deterministic compatibility.

### Q7: Milestones with budget breakdown ($10K total)

The Foundation grant guidance ([solana.org/grants-funding](https://solana.org/grants-funding)) emphasizes *"clear, measurable funding milestones"* with funding *"correlated to the impact"*. AgentTrust's milestone breakdown maps cleanly to Frontier build phases:

| Milestone | Deliverable | Budget | Target date |
|-----------|-------------|--------|-------------|
| **M1: PolicyVault deployment** | 5 policy kinds shipped, `gate_payment` composer, all 5 Kani FV invariants prove green via `cargo kani`, mainnet deployment | $3,500 | 2026-05-08 |
| **M2: TrustGate facilitator + SDK** | Anchor program for PDA-signed feedback emission, Express service with x402-spec endpoints, `@agenttrust/trustgate` npm package, 1+ facilitator integration demo | $3,000 | 2026-05-10 |
| **M3: ValidationRegistry productized** | All 6 instructions, 10 capability namespaces seeded, 1 end-to-end attestation flow, `docs/COMPLETING-THE-TRUST-STACK.md` written | $2,500 | 2026-05-11 |
| **M4: Public-goods documentation + integration onboarding** | `docs/INTEGRATION-FACILITATOR.md`, `docs/ATTESTOR-ONBOARDING.md` with 5 named attestors (Halborn, OtterSec, Civic, Sumsub, etc.), public README leading with Foundation-alignment narrative | $1,000 | 2026-05-15 |

Budget allocation: $7,000 to engineering time (mainnet RPC costs, Solana fees for testing 5 pre-warmed demo agents, Kani license, Anchor toolchain), $2,000 to documentation + integration outreach, $1,000 to friend-team contracted video work for technical demo.

### Q8: How does AgentTrust create a public good? (target ~100 words)

Three layers of public-goods contribution:

1. **MIT-licensed across all 3 programs + workspace root.** Mirrors Quantu's MIT posture. No AGPL, no non-commercial clauses. Any facilitator can integrate without legal friction.
2. **5 Kani FV invariants prove correctness for the entire payment-gating logic.** The proofs are reusable references for any Solana program author wanting to formally verify multi-policy composer logic. This is a public-goods contribution to Solana's correctness/safety ecosystem.
3. **ValidationRegistry as third-leg ERC-8004 productization.** Quantu archived the validation registry in v0.5.0 ([github.com/QuantuLabs/8004-solana](https://github.com/QuantuLabs/8004-solana)). AgentTrust ships it. Permissionless attestor model + 10 capability namespaces = Solana's public-good completion of the ERC-8004 trinity.

### Q9: Are you raising / applying for other grants?

Yes — disclosure is required. Concurrent applications:
- Solana Foundation direct grants (planned 2026-05-12 submission, post-Frontier)
- Frontier Hackathon submission (Standout / Public Goods category, 2026-05-11)
- Coinbase Developer Platform Builder Grants (planned when Q3 2026 round announces)
- Helius Pro plan + Mert deck review pipeline (in-kind, not cash)
- Superteam Earn Agentic Engineering grant ($200, social-proof anchor)

No revenue / no token / no equity round in progress. AgentTrust is open-source; commercial-component (TrustGate-enterprise SaaS) is post-Frontier roadmap.

### Q10: Past open-source / Solana / hackathon work
[Mohit: insert your prior projects with URLs. Examples to draft:
- Anchor program: <repo URL> — <one-line>
- Bounty / hackathon entry: <link> — <one-line>
- Twitter handle for Solana presence: @<handle>
- Total Superteam earnings (if any): $<amount>
- Any prior grant: <name + amount + outcome>]

If no prior public Solana work yet, frame: *"AgentTrust is my first public Solana submission. I have 1 year of Web3 engineering experience, full-time on Solana/Rust/Anchor for the past 6 months. Daily Anchor commits since Day 1 of Frontier (2026-04-06) demonstrate ship-cadence."*

### Q11: Why now? (target ~80 words)
- Solana Foundation joined Linux Foundation's x402 Foundation in April 2026
- Foundation announced an x402-based payments gateway in March 2026
- Foundation endorsed Quantu's `agent-registry-8004` as the canonical agent-identity primitive
- 35M+ x402 transactions on Solana by March 2026 ($600M annualized volume)
- Galaxy Digital forecasts 5% of Solana transactions on x402 by end of 2026
- a16z forecasts $30T x402 market over 5 years
- Foundation has shipped 2 of 3 ERC-8004 legs via Quantu; the third was archived

The trust-stack gap is acknowledged, the buyer category is named, the timing window is now.

### Q12: How will the funds be used?
Itemized breakdown (matches M1–M4 milestone budget): $7K engineering / mainnet RPC / Anchor toolchain; $2K documentation + integration outreach (5 facilitator + 5 attestor introductions); $1K technical demo video production. No team salaries (solo founder; founder labor uncosted to grant). No marketing / paid distribution.

---

## Required attachments / supporting links

- **GitHub repo (public):** [Mohit: confirm URL when repo goes public Day 5+ or earlier with stub README]
- **Pitch video (≤3 min):** [TBD post-Day-15 — replace with Loom URL by Day 16]
- **Technical demo video (2-3 min):** [TBD post-Day-15]
- **Pitch deck:** [TBD post-Day-15 — Google Slides URL]
- **README:** must lead with *"AgentTrust completes the Foundation's ERC-8004 trust stack — the third leg Quantu archived, productized."*
- **Twitter / X:** [Mohit: insert handle once project Twitter is live]
- **Foundation-alignment doc:** `docs/COMPLETING-THE-TRUST-STACK.md` — narrative artifact
- **Kani proof artifacts:** `programs/policy-vault/proofs/` — 5 proof files

---

## Submission strategy notes

1. **Cold-submit OR DM-warm-up first?** DM-warm-up wins. Reach out to Paaru Sethi (@paarugsethi on Telegram) ahead of submission with: "Hey Paaru — I'm filing the Superteam India grant for AgentTrust. Solo build for Frontier, 3 Anchor programs completing the Foundation's ERC-8004 trust stack. Want me to walk you through it before I submit?" 60-second voice note ideal. Build relationship, not just transaction.

2. **Submit with WIP repo, not finished repo.** Day-10 submission means the repo will have PolicyVault + TrustGate scaffolds but ValidationRegistry may be partial. Do NOT wait for finished repo. The reviewer expects WIP at this milestone breakpoint; what they're evaluating is the milestone clarity + execution credibility.

3. **Lead the application with milestone language, not vision language.** Foundation grant teams optimize for "this person will hit M1 by date X with deliverable Y" reading. Vision text fills Q5 / Q8 only. M1-M4 in Q7 is the load-bearing element.

4. **Cap fill time at 90 minutes.** First pass uses this draft as starting text + Mohit personalizes [bracketed markers]. Don't over-iterate. Iteration is cheap if rejected.

5. **Frontier-window risk:** if AgentTrust ships behind schedule (e.g., Day 10 has only PolicyVault done, not TrustGate), the M1 milestone language still survives because PolicyVault IS the load-bearing component. M2/M3 sliding to Day 18+ is acceptable to a Foundation grant team — they fund milestones, not deadlines.

---

## Personalization gaps Mohit must fill

- [Mohit: insert your last name for legal records]
- [Mohit: insert your X / Twitter handle]
- [Mohit: insert your Telegram handle]
- [Mohit: insert your GitHub username]
- [Mohit: insert your AgentTrust repo URL once published]
- [Mohit: insert your prior public Solana work URLs OR write the "first public submission" framing in Q10]
- [Mohit: confirm budget breakdown matches your actual cost model — adjust M1-M4 dollar splits if cost reality differs from estimates]
- [Mohit: when video URLs are ready Day 15-16, replace TBDs in attachments]

---

## Decision-makers / reviewer profiles to research before submission

- **Paaru Sethi** — Superteam India lead. Twitter: search `@paarugsethi`; Telegram same handle. Tier-1 X-recon target before submission to read her recent posts on what she's funding lately
- **Aditya Shetty** — listed CoinDCX/Solana grants liaison email; possibly co-reviews Foundation India grant. aditya@adityashetty.xyz

Day-9 (2026-05-03) action: Mohit runs x-recon on Paaru's last 30 days of posts + DMs. If she's posting about agent-economy / x402 / Foundation-alignment topics, lean those framings harder; if she's posting about consumer apps / DeFi, soften the infrastructure framing toward end-user wins.

---

## Standing-rule compliance checklist

- [ ] Never names SAEP — confirmed throughout
- [ ] Foundation-alignment language present in Q5, Q6, Q11 — confirmed
- [ ] Variant B elevator pitch adapted, not copied — Q5 paragraph 4 adapts the scam-wrapper opener
- [ ] No banned vocabulary in 30-second hook (per `agenttrust-pitch-compression.md` Phase 3 rules)
- [ ] All claims cite primary source URL inline
- [ ] Concurrent-applications disclosed in Q9
- [ ] No hedging vocabulary
