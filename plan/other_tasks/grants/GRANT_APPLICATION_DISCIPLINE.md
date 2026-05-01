# Grant Application Discipline

**Purpose.** Encoded lessons from the Superteam Earn Agentic Engineering $200 application (submitted 2026-04-29). Read this file BEFORE applying to any grant in this folder. Every grant-draft file in this directory has an AI-directive header that points back here.

**Why.** The Superteam application took several rounds of pressure-testing to land right. The mistakes were AI-slop tells (em-dashes, robot day-by-day lists, vague "last week" claims, internal-risk telegraphs leaking into marketing surfaces). This file codifies the discipline so we never re-learn the same lesson at the form deadline.

---

## Rule 1 — The two-tier doc model (form vs Drive)

Every grant has two surfaces:

| Surface | Length | Voice | Purpose |
|---------|--------|-------|---------|
| **Form field** (what you paste into the Earn / Foundation / a16z form) | ≤200 words per field, ≤150 chars for one-liners | Tight. Cite-once. End with "→ Drive folder linked above" | Hooks reviewer in <30 sec |
| **Drive folder** (full markdown files uploaded to Google Drive, linked from the form) | ~300-500 words per doc, multiple supporting docs | Builder voice. Full citations. Deep architecture. Audit trail. | Rewards reviewer who clicks through |

**Rule:** never paste the Drive-file content directly into a form field. Form-field text is a compressed version that pointers to depth. Drive-file text is the depth.

---

## Rule 2 — Citation discipline (every claim, primary source, inline)

Every load-bearing claim must have a primary-source URL inline. Reviewer Google-tests claims; vague phrasing reads as bluffing.

**Always cite:**
- Statistics ("15M agentic payments" → Vibhu's X post URL)
- Quotes ("smart contracts held up; the human-trust layer didn't" → Lily's X post URL with date)
- Audit findings ("Quantu archived validation due to spam-DoS" → URL of the public audit report)
- Incidents ("Drift exploit" → date + amount, both verifiable)

**Never write:**
- "Last week a treasury bot routed $1.2M USDC..." — invented incident, can't be verified, looks like fabrication
- "Recent reports show..." — no URL, vague
- "Industry sources estimate..." — no source

**Rule:** if a claim doesn't have a URL or a date you can defend under cross-examination, drop it or replace with a verifiable real one.

---

## Rule 3 — Banned vocabulary in marketing surfaces

Banned words in pitch openers, one-liners, project details (form-field surface). These are AI-slop tells and grant-pitch dilutents:

- `soulbound`
- `primitive`
- `infrastructure`
- `platform`
- `Token-2022`
- `programmable`
- `dual-score`
- `sybil-resistant`
- `PolicyVault` / `TrustGate` / `ValidationRegistry` (component names — banned in pitch openers per `plan/final_idea/PITCH_FRAMES_LOCKED.md`; OK in technical detail sections)

**Always banned:** SAEP. Never named in any application surface. Foundation-alignment language carries the differentiation work.

**OK in:** Q&A sections, technical docs, the Drive-file architecture section, milestone descriptions where the component names are unavoidable.

---

## Rule 4 — Builder voice (no AI-slop tells)

The Superteam reviewer recognized AI-slop in the first draft. Indicators to avoid:

| AI-slop pattern | Builder voice replacement |
|-----------------|---------------------------|
| Em-dash everywhere (`—`) | Periods, commas, parentheticals |
| `Day 6: ships X. Day 7: ships Y.` | "First three days I scaffold the workspace and ship the wedge." |
| Bullet lists pretending to be paragraphs | Actual paragraphs in builder voice |
| `(byte 551)` `(8 epochs ≈ 20 days)` byte-level details in marketing copy | Drop — that's research-file detail, not pitch detail |
| Parenthetical citation stuffing `(Vibhu Norby, 2026-03-25)(Lily Liu, 2026-04-02)(Quantu, v0.5.0)` | One source per sentence max, inline as a hyperlink |
| `By 2028, 99.99% of onchain transactions will be agent-driven` (uncited speculation) | "Solana CPO Vibhu Norby reported on 2026-03-25 that..." (cited present-tense fact) |

**Test:** read the paragraph aloud. If it sounds like a builder writing in evening journal mode, keep it. If it sounds like a Claude-generated spec sheet, rewrite.

---

## Rule 5 — Risk-register hygiene (internal risks stay internal)

Internal risk-register language NEVER leaks into application surfaces. Examples that leaked into the first Superteam draft and had to be cut:

- "Tier vesting takes ~20 days" — telegraphs "we might not have full reputation by demo day"
- "If behind schedule by Day 9, drop the second Kani invariant" — telegraphs "we plan to fail"
- "Worst case we ship 2 of 3 components" — telegraphs uncertainty
- "Solo handicap" — telegraphs "I might not deliver"

**Rule:** internal risks live in `plan/final_idea/changes/` + `plan/research/00-synthesis.md`. They NEVER appear in:
- Project Details
- Milestones
- Proof of Work
- One-liner
- Pitch deck

**Why:** reviewers don't fund risk-acknowledged projects; they fund confident-shipper projects. Acknowledge risks in your private planning, present confident outcomes in your applications.

---

## Rule 6 — One-liner compression (≤150 chars)

Most form fields cap one-liner at 150 chars. Structure:

`<function> on Solana + <Foundation alignment> + <buyer / integration shape>`

**Strong example (128 chars):**
> "Gates AI agent payments on Solana by reading Quantu's Foundation linked Agent Registry on mainnet. Drop in for x402 facilitators."

**Weak (over-stuffed):**
> "Three Anchor programs that gate AI agent payments on Solana's Foundation-endorsed agent registry — drop-in for x402 facilitators." (em-dash + over 130 chars)

**Test:** count the characters. If >145, compress. If <100, you have room to add the credibility hook.

---

## Rule 7 — Primary KPI shape

Most grants ask for "the single main metric" or equivalent. The KPI must be:

1. **Single, binary** — not "≥3 facilitators within 90 days" (multi-target). One number, hard yes/no.
2. **Under your control** — not "X partners integrate" (external dependency). "Three Anchor programs deployed to mainnet" is under your control.
3. **Verifiable in 30 seconds** — reviewer can confirm without DM-ing anyone. Solana Explorer link, GitHub release tag, npm package URL.

**Strong KPI for AgentTrust v1:**
> "A single Solana mainnet transaction signature where all three AgentTrust programs compose atomically: gate_payment denies a low reputation counterparty and accepts a high reputation one, settlement transfers USDC, and TrustGate emits feedback that updates Quantu's ATOM Engine reputation score on chain. Verifiable on Solana Explorer."

Reviewer clicks the Explorer link. Sees the tx. Done. Binary yes/no.

**Weak KPI:**
> "Number of facilitators integrating within 30 days. Target: ≥3." (external dependency, multi-tier, can't verify in 30 sec)

---

## Rule 8 — Drive folder pointer (close every Project Details with this)

Every form's "Project Details" / "Project Description" field should END with a pointer to the Drive folder. The pointer is a conversion line: it tells the reviewer "if you want depth, click here."

**Template:**
> "Full architecture, milestones, [Crowdedness Score / audit / etc. as relevant per grant], and AI session transcript: Drive folder linked above."

If the form has no explicit "upload" field, paste the Drive link inline at the end of Project Details OR as a second URL in Proof of Work after the main project URL.

---

## Rule 9 — Verifiability anchor (mainnet program ID + curl)

Every application body should close with the mainnet-verifiable hook:

> "Verifiable now: agent_registry_8004 at `8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ` returns `executable: true` from a stock Solana mainnet RPC call. Any reviewer can confirm in 30 seconds with curl against `api.mainnet-beta.solana.com`."

**Why:** instantly distinguishes AgentTrust from vapor-pitch projects. Reviewer can curl in 30 seconds and see real on-chain code.

**Always update the date** (verified YYYY-MM-DD). Stale dates look unmaintained.

Once AgentTrust's own programs deploy to mainnet (Day 16, 2026-05-10), update the verifiability anchor to include AgentTrust's program IDs alongside Quantu's.

---

## Rule 10 — Reusable citation block (write once, reuse everywhere)

The same primary-source citations show up in every grant. Don't rewrite them per grant. Maintain a canonical block:

```markdown
**Primary-source citation block (canonical, paste into any grant):**

- Solana processed 15M agentic payments in Q1 2026, ~65% of all x402 transactions.
  Source: Vibhu Norby (Solana Foundation CPO), 2026-03-25.
  https://x.com/vibhu/status/2036861219986878741

- Drift exploit, ~$285M drained, 2026-04-01. Opsec-based, not a smart contract failure.
  Lily Liu (Solana Foundation president) summary, 2026-04-02:
  "Smart contracts held up. The real targets now are humans."
  https://x.com/calilyliu/status/2039652201342050713

- Quantu Labs shipped 2 of 3 ERC-8004 legs on Solana mainnet (identity + reputation).
  Archived the third leg (validation) in v0.5.0 of `8004-solana` after a HIGH-severity
  spam-DoS finding (VALID-H1) in their public 2026-02-05 audit:
  https://github.com/QuantuLabs/8004-solana/blob/main/SECURITY-AUDIT-REPORT.md

- Solana Foundation hosts the Agent Registry conceptual page at solana.com/agent-registry.
  Footer says "Managed by Solana Foundation"; Quickstart links directly to QuantuLabs/8004-solana-ts.
  https://solana.com/agent-registry

- Mainnet verifiability: agent_registry_8004 at 8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ
  returns executable: true from a stock Solana mainnet getAccountInfo RPC call.
  Reproducible in 30 seconds:
    curl https://api.mainnet-beta.solana.com -X POST \
      -H "Content-Type: application/json" \
      -d '{"jsonrpc":"2.0","id":1,"method":"getAccountInfo",
           "params":["8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ",{"encoding":"base64"}]}'
```

Paste this block (or relevant excerpts) into any grant's Drive doc. Form-field versions reference 1-2 of these per claim, not all five.

---

## Rule 11 — Solana.new / agentic-tooling eligibility check

The Superteam grant evaluation looked at whether Mohit was using `solana.new` (the Foundation/Superteam-managed CLI agentic dev tool). Other Solana ecosystem grants may have similar eligibility hooks.

**Always check before applying:**
- Does this grant require a specific tool (solana.new, Helius Pro, a specific MCP, etc.) to be in use?
- Does the form have a "Drive link" / "transcript upload" / "agent session log" field that gates evaluation on AI-tool usage?
- Does the form have hidden eligibility filters in the bottom note (like the Superteam form did)?

If yes, run the appropriate session through that tool and produce a transcript artifact BEFORE filling the form.

---

## Apply-time checklist (run through this every time)

Before clicking submit on any grant:

- [ ] All Drive files in builder voice (no em-dashes, no `Day X ships` robot speak)
- [ ] All form-field text under the field's char/word cap (most one-liners ≤150 chars; project-details ≤200-300 words)
- [ ] Every claim has a primary-source URL
- [ ] Banned vocab not in pitch surfaces (Cmd+F search)
- [ ] No internal-risk language leaked (no "if behind," no "tier vesting takes ~20 days," no "worst case")
- [ ] Primary KPI is single + binary + under-control + verifiable-in-30-sec
- [ ] Drive folder pointer present at end of Project Details
- [ ] Mainnet verifiability anchor with current date
- [ ] AI session transcript / Drive folder uploaded if grant requires
- [ ] Eligibility filters checked (solana.new, Helius Pro, etc.)
- [ ] Wallet address + TG handle filled (auto-fill from Earn embedded wallet if available)
- [ ] X handle + GitHub handle filled (don't leave blank; this is free signal)
- [ ] Submit early (24h before deadline) for portal-glitch buffer

---

## Per-grant override notes

Some grants have specific quirks that override the general rules. Each grant draft in this folder has an AI-directive header that flags grant-specific gotchas. Read those before applying.

Common per-grant quirks:
- **Superteam Earn**: bottom note about solana.new eligibility; Crowdedness Score added by solana.new agent (real, not hallucination); Drive link goes in Project Details if no upload field
- **Solana Foundation Direct**: requires milestone-based budget breakdown; convertible-grant variant for commercial work
- **Solana Foundation India**: India-only; warm-intro via @paarugsethi recommended; smaller cap (~$10K)
- **Colosseum Accelerator**: not a form application — interview prep notes; auto-triggered by Frontier prize win
- **a16z CSX**: Fall 2026 cohort; KYA narrative primary; Frontier prize is the credibility shortcut

---

## Sign-off

This file is the discipline carrier. When in doubt during a grant application, default to the rules here. Update this file when new lessons surface.

— Maintained by Mohit. Last updated 2026-04-29 (post-Superteam-application).
