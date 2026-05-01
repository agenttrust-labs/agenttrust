# Grants Class — AgentTrust Pipeline (Day 5+ Research)

**Author:** Mohit (solo). **Compiled:** 2026-04-28. **Locked thesis:** AgentTrust — three Anchor programs completing the Foundation's ERC-8004 trust stack. **Submission deadline:** 2026-05-11.

**Purpose:** Map every applicable grant program for AgentTrust, rank by EV (probability × dollar amount), and produce 7 ready-to-submit application drafts. Treat grants as a **load-bearing track** ("free money on the idea itself"). Drafts are 80% submission-ready; Mohit personalizes the remaining 20%.

**Scope of this file:** ranked grant inventory + per-grant 1-page summaries + master submission calendar + eligibility matrix + past-winner pattern analysis. Per-grant drafts live in `plan/other_tasks/grants/<grant-name>.md`.

**Standing rule:** never name SAEP. Foundation-alignment language does the differentiation work. Use Variant B (Anthropic B2B) elevator pitch from `research/00-thesis/agenttrust-pitch-compression.md` adapted to grant context.

---

## Section A — Ranked grant inventory (probability × dollar amount)

| Rank | Grant | Max $ | Probability | EV | Status | Decision-window | Draft file |
|------|-------|-------|-------------|-----|--------|------------------|------------|
| 1 | **Solana Foundation Direct Grants** (milestone-based) | **$10K–$50K typical**, larger for convertible | High (open-source / public-goods / Solana-only) | $10K–$25K | Open, rolling | ~3 weeks decision | [solana-foundation-direct.md](../other_tasks/grants/solana-foundation-direct.md) |
| 2 | **Solana Foundation India Grants** (Superteam India) | **$10K USDC** | High (India-based + Foundation alignment + open-source) | $5K–$8K | Open, rolling | 30 days response | [solana-foundation-india.md](../other_tasks/grants/solana-foundation-india.md) |
| 3 | **Colosseum Accelerator** (post-Frontier) | **$250K pre-seed** | Medium (gated by Frontier prize win) | $25K (probabilistic) | Auto-interview if Frontier prize wins | June–July 2026 | [colosseum-accelerator.md](../other_tasks/grants/colosseum-accelerator.md) |
| 4 | **Coinbase Developer Platform Builder Grants** (next round expected Q3 2026) | **$3K–$10K per recipient, $30K pool** | Medium-High (x402 + AgentKit alignment) | $3K–$8K | Closed (last round Dec 2025); next round expected Q3 2026 | TBD | [cdp-builder-grants.md](../other_tasks/grants/cdp-builder-grants.md) |
| 5 | **Frontier Hackathon Public Goods Award** | **$10K USDC** | Medium-High (open-source + ERC-8004 = public-goods bullseye) | $4K | Open until 2026-05-11 | 2026-05-25 result window | [frontier-public-goods.md](../other_tasks/grants/frontier-public-goods.md) |
| 6 | **Frontier Standout Award** ($10K × 20) | **$10K USDC** | Medium (1-in-20 with strong narrative) | $3K | Open until 2026-05-11 | 2026-05-25 result window | (see frontier-public-goods.md submission notes) |
| 7 | **Solana Foundation USA Grants** (via Superteam Earn, USA-only) | **$10K USDG** | LOW for Mohit (USA-only) | $0 | Open | 1 week | (skipped — eligibility blocks) |
| 8 | **Solana Foundation Japan Grants** | **$10K USD** | Zero (Japan-only) | $0 | Open | 1 week | (skipped) |
| 9 | **Solana x Cal Grants** (Berkeley) | **$10K USDG** | Zero (US-only + likely Cal-affiliated) | $0 | Open | 1 week | (skipped) |
| 10 | **Solana x Stanford Crypto Grants** | **$10K USDC** | Zero (US-only + likely Stanford-affiliated) | $0 | Open | 1 week | (skipped) |
| 11 | **FranklinDAO Solana Grants** (UPenn) | **$10K USDG** | Zero (US-only + likely UPenn-affiliated) | $0 | Open | 1 week | (skipped) |
| 12 | **Solana Foundation CoinDCX India Instagrant** | **$15K USDC** | Was high; **CURRENTLY CLOSED** | n/a | CLOSED | n/a | (re-watch for re-open) |
| 13 | **Superteam Earn Agentic Engineering Grant** | **$200 USDG** | Very high acceptance; tiny check | $200 | Open | 1 week | [superteam-agentic-engineering.md](../other_tasks/grants/superteam-agentic-engineering.md) — apply for credibility/social-proof, not money |
| 14 | **Helius Pro plan + Mert deck review** (in-kind) | **In-kind: deck review + investor intros** | High once subscribed | Asymmetric — Mert is the largest Solana angel | Active | Sign up Day 5+ | [helius-pro-mert-pipeline.md](../other_tasks/grants/helius-pro-mert-pipeline.md) |
| 15 | **Vanish Trade $10K Frontier side bounty** | **$10K USDG** | Low (requires Vanish Core API integration; AgentTrust does not natively touch private swaps) | $1K (only if Day-12 scope-stretch lets a private-rails wrapper land) | Frontier-window | 2026-05-11 | (skipped — out of scope) |
| 16 | **Frontier University Award** | **$10K USDG** | Zero (≥50% enrolled students required; Mohit not enrolled) | $0 | n/a | n/a | (skipped) |
| 17 | **a16z CSX Crypto Startup Accelerator** | **$500K @ 7% equity** | Very low pre-Frontier; medium post-Frontier-Standout | $50K probabilistic | Spring 2026 cohort closed Feb 7 2026; next cohort Fall 2026 | TBD | [a16z-csx-pipeline.md](../other_tasks/grants/a16z-csx-pipeline.md) — post-Frontier track |

**Total realistic combined ask if Mohit applies to ranks 1, 2, 3, 4, 5, 13, 14:**
- Pre-Frontier-decision grants: **Solana Foundation direct ($10K) + India ($10K) + Agentic Engineering ($200) = $20.2K**
- Post-Frontier-decision conditional: **Public Goods ($10K) + Standout ($10K) + Accelerator ($250K) + CDP Q3 round ($3K–$10K) = $273K–$280K**
- Combined ceiling on the AgentTrust draft pipeline alone: **~$300K cash + $250K pre-seed conversion**

---

## Section B — Per-grant 1-page summaries

### B.1 — Solana Foundation Direct Grants

- **Source:** [solana.org/grants-funding](https://solana.org/grants-funding)
- **Tiers:** milestone-based (public goods); convertible (public goods + commercial); RFP-targeted ([forum.solana.com/c/rfp/10](https://forum.solana.com/c/rfp/10))
- **Average size:** Q2 2026 research from `research/05-grants-and-money/active-capital-Q2-2026.md` confirms $1K–$10K typical with larger convertible amounts; 500+ projects funded, $100M+ deployed lifetime
- **Eligibility:** "Anyone can apply" — individuals, teams, nonprofits, companies, universities, academics; no geographic restriction; verbatim from solana.org/grants-funding: *"a project to be a public good if it either makes a significant open-source contribution to the Solana ecosystem, or if it has a meaningful free community offering"*
- **Application form structure** (inferred from public guidance): project description, why-Solana, technical design, team background, milestones with dollar amounts per milestone, total funding ask, GitHub URL, prior open-source work
- **Decision timeline:** 1-week review (rolling), 3-week total notification, technical due-diligence call may follow approval
- **Reviewer profile:** Solana Foundation grants team (Ben Hawkins leads grants per public Foundation org chart; subject-matter experts cycle in for technical due diligence)
- **Why AgentTrust fits:** completes ERC-8004 trust stack the Foundation endorsed via Quantu; MIT-licensed; permissionless attestor model = pure public-goods primitive; 5 Kani FV proofs = correctness/safety contribution that benefits all of Solana; ValidationRegistry is "third leg Quantu archived in v0.5.0, fully productized" — direct Foundation-narrative completion
- **Risk:** post-submission timing means decision lands ~2026-06-15 to 2026-07-01 — useful for runway, not pre-Frontier
- **Draft:** [solana-foundation-direct.md](../other_tasks/grants/solana-foundation-direct.md)

### B.2 — Solana Foundation India Grants (Superteam India)

- **Source:** [superteam.fun/earn/grants/solana-foundation-india-grants](https://superteam.fun/earn/grants/solana-foundation-india-grants)
- **Cap:** $10K USDC (average $3,562; 66 recipients, $235.1K total deployed)
- **Eligibility:** verbatim — *"This grant is only open for people in India"*
- **Decision timeline:** 30-day response time
- **Reviewers:** Paaru Sethi (lead, contactable via @paarugsethi on Telegram per `in.superteam.fun`)
- **Application form structure** (from public Superteam Earn pattern): basic project info, GitHub URL, what it does (1 paragraph), why on Solana, milestones, ask amount with breakdown, references
- **Why AgentTrust fits:** Indian builder + open-source + Solana-native + Foundation-aligned = textbook Superteam India fit. The 173 historical recipients in the closed CoinDCX cohort confirm acceptance of infrastructure / DeFi / public-goods builds
- **Apply alongside thesis lock** (per existing `active-capital-Q2-2026.md` recommendation): file Day 6 with v1 README + devnet demo + GitHub link; decision by Day 36 (post-Frontier)
- **Draft:** [solana-foundation-india.md](../other_tasks/grants/solana-foundation-india.md)

### B.3 — Colosseum Accelerator

- **Source:** [colosseum.com/accelerator](https://colosseum.com/accelerator)
- **Size:** $250K pre-seed per team, 10+ teams, equity terms not publicly disclosed (industry-standard ~7-10%)
- **Eligibility:** All Frontier prize winners are auto-interviewed. Selection criterion: *"intent and ability to build full-time"*; SF relocation expectation
- **Application path:** WIN A FRONTIER PRIZE FIRST. There is no separate accelerator application — winning the hackathon IS the application
- **Reviewer profile:** Matty Taylor (lead per [mattytay 2026-03-24](https://x.com/mattytay/status/2036521675098136763)), David Kanter, Cohort 4 alumni network. Per `01-hackathon-mechanics/judges-and-bias.md`, Matty's signal pattern: named-buyer + ship-cadence + Foundation-credibility = accelerator-shaped
- **Why AgentTrust fits:** named-buyer category (x402 facilitators), Foundation-canonical positioning, B2B agent-commerce = venture-scale TAM. Cohort 4 alumni include Mercantill (enterprise banking infra for AI agents) — direct precedent for AgentTrust's space
- **Strategy:** designed-for path; Frontier submission IS the accelerator application via prize-winner pipeline
- **Draft:** [colosseum-accelerator.md](../other_tasks/grants/colosseum-accelerator.md)

### B.4 — Coinbase Developer Platform Builder Grants (next round)

- **Source:** [coinbase.com/developer-platform/discover/launches](https://www.coinbase.com/developer-platform/discover/launches)
- **History:** Spring 2025 ($30K), Summer 2025 ($30K, 13 recipients out of 55 applications, awards $3K-$10K), Round 3 Dec 2025 ($30K AgentKit-themed). Next round expected Q3 2026
- **Tier:** $3K-$10K per recipient depending on stage / depth of CDP integration / readiness to ship
- **Eligibility (Summer 2025 selection criteria, expected to repeat):** *"Credible CDP integration (Wallets, AgentKit, Onramp, x402, Paymaster, OnchainKit, Data API)"*; *"Real potential for adoption"*; *"Strong security and DX"*
- **Application:** form-based; project description + CDP integration evidence + adoption traction + security posture
- **Reviewer profile:** CDP team — Erik Reppel, Yuga Cohler, AgentKit team
- **Why AgentTrust fits:** TrustGate is x402-spec-compliant facilitator; PolicyVault sits below x402 payment flow as gating layer; Coinbase incubated x402, x402 is THE buyer narrative for AgentTrust. Drop-in TS module (`@agenttrust/trustgate`) means any CDP / x402 facilitator integrates AgentTrust in a day. Direct CDP product integration = top-of-stack fit
- **Risk:** next round timing unclear; Mohit applies whenever it opens; AgentTrust can be referenced as live mainnet artifact by then
- **Draft:** [cdp-builder-grants.md](../other_tasks/grants/cdp-builder-grants.md) — pre-drafted for next-round window

### B.5 — Frontier Public Goods Award

- **Source:** Official Rules PDF, [colosseum.com/legal/Solana Frontier Hackathon Rules.pdf](https://colosseum.com/frontier); cross-reference `research/01-hackathon-mechanics/rules-and-prizes.md` Section 10
- **Cap:** $10,000 CASH-SPL
- **Eligibility:** verbatim Section 8(e): *"Open-source: Is this Project Submission open-source? How well does the Project Submission compose with other primitives in the Solana ecosystem?"*
- **Application path:** ONE Frontier submission; Public Goods is awarded by judges from the same submission pool
- **Decision timeline:** Frontier judges evaluate post-2026-05-11 deadline; results expected by 2026-05-25
- **Reviewer profile:** Lily Liu (Foundation president, Public-Goods bias) is the gating judge per `research/01-hackathon-mechanics/judges-and-bias.md`. Other Public-Goods-leaning judges include Solana Foundation grants team members
- **Why AgentTrust fits:** MIT-licensed across all 3 programs + workspace; permissionless ValidationRegistry attestor model = public-goods primitive; "completes the Foundation's ERC-8004 trust stack — the third leg Quantu archived" is verbatim public-goods narrative; Kani FV harness is verifiable open-source correctness contribution
- **Strategy:** present Public Goods framing prominently in README + deck Slide 5 + pitch video closing; ValidationRegistry's attestor-onboarding doc highlights 5 named attestors (Halborn, OtterSec, Civic, Sumsub, Anthropic) showing community-benefit primitive
- **Draft:** [frontier-public-goods.md](../other_tasks/grants/frontier-public-goods.md)

### B.6 — Frontier Standout Award

- **Source:** Official Rules PDF
- **Cap:** $10,000 CASH-SPL × 20 winners ($200K total pool)
- **Eligibility:** judged on full Frontier criteria (`research/01-hackathon-mechanics/rules-and-prizes.md` Section 6); same submission as Public Goods
- **Application:** ONE Frontier submission unlocks both prize categories
- **Reviewer profile:** all 4 gating judges (Vibhu, Mert, Matty, Lily) per Day-3 `judges-and-bias.md`
- **Why AgentTrust fits:** all 4 judge engagement patterns documented in `THESIS_LOCK.md`; Variant B pitch lands all 4 with at least medium-strong score
- **Strategy:** same submission as Public Goods. Frontier rules don't preclude one submission winning both; Cypherpunk precedent (Samui Wallet won Public Goods; was also under Standout consideration) supports stacking
- **Draft:** included in [frontier-public-goods.md](../other_tasks/grants/frontier-public-goods.md) (single submission strategy)

### B.7 — Superteam Earn Agentic Engineering Grant ($200)

- **Source:** [superteam.fun/earn/grants/agentic-engineering](https://superteam.fun/earn/grants/agentic-engineering)
- **Cap:** $200 USDG (average $198; 97 recipients, $19.2K total deployed)
- **Eligibility:** Global; Frontend / Blockchain / Backend / Content
- **Decision timeline:** 1-week response
- **Reviewer:** Superteam team (support@superteam.fun)
- **Why AgentTrust applies:** trivial-amount but Mohit gets a public listing on the agentic-engineering grants page = social proof + Superteam network credibility. The $200 is rounding error; the listed-recipient status is reusable narrative for Frontier deck Slide 6 ("supported by Superteam"). Apply for the badge, not the money
- **Draft:** [superteam-agentic-engineering.md](../other_tasks/grants/superteam-agentic-engineering.md)

### B.8 — Helius Pro plan + Mert deck review (in-kind, asymmetric leverage)

- **Source:** [Mert 2026-04-10](https://x.com/mert/status/2042577633515393205) public offer (per `active-capital-Q2-2026.md`); [helius.dev](https://www.helius.dev) Pro plan signup
- **Tier:** in-kind (no cash grant); Helius Pro plan ($499/mo or similar; check current pricing) unlocks Mert's complimentary pitch deck review + investor intros
- **Eligibility:** any Helius Pro/Business customer
- **Why AgentTrust fits:** Mert is gating judge (security/fraud bias) AND largest Solana angel investor by his own claim (`research/05-grants-and-money/active-capital-Q2-2026.md` ranks Helius Pro #10). Investing $499 in subscription unlocks deck review + intro pipeline = highest-asymmetry move in the grant inventory
- **Strategy:** sign up Day 5–7; submit deck for review Day 14–15; Mert intros land Day 16+; converts to angel-cheque pipeline post-Frontier-submission
- **Draft:** [helius-pro-mert-pipeline.md](../other_tasks/grants/helius-pro-mert-pipeline.md) — playbook + DM templates

### B.9 — a16z CSX (post-Frontier track)

- **Source:** [a16zcrypto.com/accelerator](https://a16zcrypto.com/accelerator)
- **Tier:** $500K investment for 7% equity; 12-week in-person program
- **Eligibility:** global; technical founders with clear web3 product vision; in-person commitment in host city
- **Spring 2026 cohort:** closed Feb 7 2026 (CSX 04). Fall 2026 cohort expected open Q3 2026
- **Decision timeline:** competitive selection; post-application 4–6 weeks
- **Why AgentTrust fits:** a16z's 2026 thesis includes "Know Your Agent (KYA), a cryptographic identity layer linking agents to their owners, constraints, and liabilities" — AgentTrust is structurally what a16z is publicly betting on. Frontier-Standout-win is the credibility shortcut
- **Strategy:** post-Frontier (assuming Standout or better wins), apply for Fall 2026 CSX. Frontier prize win + Foundation grant + 1 named-facilitator-quote = strong CSX application
- **Draft:** [a16z-csx-pipeline.md](../other_tasks/grants/a16z-csx-pipeline.md)

---

## Section C — Submission timing strategy

| Grant | Pre-Frontier (during build) | Post-Frontier (after submission) | Why |
|-------|------------------------------|-----------------------------------|-----|
| Solana Foundation direct | NO | **Day 18 (May 12)** | Needs shipped artifact + mainnet deployment + Kani proofs running. Foundation rolls "1-week review, 3-week notification" so apply Day 18 → decision ~2026-06-08. Filing pre-shipped is weak; filing post-shipped is leveraged |
| Solana Foundation India | **Day 6 (May 4)** | (alternative: Day 18) | India team works rolling; filing Day 6 with WIP repo + Variant B pitch + clear milestones positions against the 30-day decision window. Day-6 ask: "$10K to ship 3-component v1 by 2026-05-11" turns the Frontier-build itself into the funded milestone. This is the optimal timing because the milestone window aligns with Mohit's actual build calendar |
| Colosseum Accelerator | (gated by prize win) | **Auto-interview if Standout+** | No action needed beyond the Frontier submission; interview slots open after 2026-05-25 results |
| CDP Builder Grants | NO (not open) | **Whenever Q3 2026 round opens** | Apply with shipped mainnet TrustGate + integrated x402 flow + named-facilitator-quote |
| Frontier Public Goods | (judging is the application) | **2026-05-11** | Single submission lock |
| Frontier Standout | (same) | **2026-05-11** | Same |
| Superteam Agentic Engineering | **Day 5 (May 3)** | n/a | Apply early for max-time-on-listing visibility; $200 lands by Day 12 |
| Helius Pro | **Day 5 (May 3)** | (continues post) | Sign up Day 5 to capture "deck review + intros" benefits during build phase |
| a16z CSX | NO | **Q3 2026 application window** | Frontier Standout-win + Foundation grant + named-facilitator letter = strongest application |
| Vanish $10K bounty | (if integrating Vanish Core) | (deadline 2026-05-11) | SKIP. AgentTrust does not natively touch private swaps |
| Solana Foundation USA / Cal / Stanford / FranklinDAO / Japan | n/a | n/a | SKIP — eligibility blocks |

---

## Section D — Post-Frontier grant pipeline (Day 18+ applications)

After 2026-05-11 submission, with shipped v1 + demo videos + (likely) Standout outcome, Mohit's grant strategy expands:

1. **2026-05-12 (Day 18) — File Solana Foundation direct grant.** Cite shipped mainnet deployment + Kani proofs + ValidationRegistry as "the third ERC-8004 leg Quantu archived, productized." Ask: $25K-$50K convertible (commercial component = future TrustGate-enterprise SaaS) OR $15K milestone-based public goods (open-source maintenance + 5 attestor onboarding integrations + audit prep). Decision target: 2026-06-08
2. **2026-05-18 (Day 24) — File CDP Builder Grants application** (assumes round opens). Position: x402-facilitator-grade compliance layer; cite TrustGate's drop-in TS module as direct CDP-stack add. Decision target: 2026-06-22
3. **2026-05-22 — Helius Pro deck review submission.** Once Frontier submission video is final, send deck + repo + 90-second demo to Mert via Helius Pro support channel. Decision pace varies; Mert review = 1-3 weeks typical
4. **2026-05-25 — Frontier results.** If Standout / Public Goods / Grand Champion win, accelerator interview triggers automatically
5. **2026-06-15 — Apply to a16z CSX Fall 2026 cohort** (window TBD, expected Q3 2026 open). Use Frontier prize + Foundation grant + facilitator-customer-quote as credibility stack
6. **2026-07-XX — Cubik Round 2 (if announced).** Round 1 had $50K matching pool; AgentTrust as MIT-licensed public good is eligible
7. **Watch for Solana Foundation CoinDCX India Instagrant re-open.** Currently CLOSED; was up to $15K USDC; Mohit applies first if it re-opens

---

## Section E — Re-ranking signals: which grants double-fund vs. exclusive

**Stackable (apply to all):**
- Solana Foundation direct + Solana Foundation India (different programs; some overlap risk — disclose both in each application; per `active-capital-Q2-2026.md`, Indian builders have received both. Risk-free disclosure)
- Solana Foundation direct + CDP Builder Grants + Frontier Standout (orthogonal sponsors)
- Helius Pro + any cash grant (Helius is in-kind, not cash competition)
- Superteam Agentic Engineering ($200) + everything else (trivial; double-fund risk = zero)

**Exclusive:**
- Frontier Standout vs. Frontier Public Goods: rules are SILENT (per `rules-and-prizes.md` Section 10 — Day 4 Discord ask); Cypherpunk precedent is one project can win both. Treat as stackable; one submission strategy
- Frontier University Award: requires ≥50% enrolled students; Mohit ineligible
- a16z CSX vs. Colosseum Accelerator: both equity-cheque accelerators; selection between them is a founder choice, not a grant exclusion. Mohit applies to both if both extend offers
- Vanish $10K bounty: scope-conditional (must integrate Vanish Core API); AgentTrust v1 doesn't, so treat as exclusive-to-Vanish-integrators

**Disclosure rule:** every application discloses concurrent applications. Foundation grant team explicitly asks "are you raising / applying elsewhere" — failure to disclose is a credibility kill

---

## Section F — Master submission calendar

| Date | Grant action | Time budget | Owner |
|------|--------------|-------------|-------|
| **2026-04-29 (Day 5)** | Read this file + draft files; finalize Helius Pro signup | 30 min | Mohit |
| **2026-04-29 (Day 5)** | Submit Superteam Agentic Engineering ($200) — fastest social-proof anchor | 20 min | Mohit |
| **2026-04-29 (Day 5)** | Sign up Helius Pro plan; queue deck-review request for Day 14 | 15 min | Mohit |
| **2026-05-04 (Day 10)** | Submit Solana Foundation India Grants ($10K) — Frontier-build IS the funded milestone | 90 min | Mohit |
| **2026-05-11 (Day 17)** | Submit to Frontier (auto-applies for Standout + Public Goods + Accelerator-interview pipeline) | (build deadline already) | Mohit |
| **2026-05-12 (Day 18)** | Submit Solana Foundation direct grant ($15K–$50K) | 2 hrs | Mohit |
| **2026-05-14 (Day 20)** | Send Helius Pro deck-review request to Mert via support channel | 30 min | Mohit |
| **2026-05-18 (Day 24)** | If CDP Builder Grants Q3 round announced, file | 90 min | Mohit |
| **2026-05-25 (Day 30)** | Frontier results day — if Standout/Public-Goods/Grand, prep for accelerator interview | 2 days prep | Mohit |
| **2026-06-15** | a16z CSX Fall 2026 application opens (expected); file | 4 hrs | Mohit |
| **2026-07-XX** | Cubik Round 2 application if announced | 2 hrs | Mohit |

**Total grant-application time budget through 2026-06-30:** ~12 hours. Cap individual application at 90-120 min on first pass; iteration is cheap if rejected

---

## Section G — Past-winner pattern analysis

I could not access full text of submitted Earn-grant applications (Superteam doesn't publish them); the patterns below come from publicly visible grant-recipient announcements + Cypherpunk hackathon winners + CDP Summer 2025 recipients (the most-public set).

### CDP Summer 2025 Builder Grants — 13 recipients out of 55 applicants (per Coinbase's [summer-builder-grants](https://www.coinbase.com/developer-platform/discover/launches/summer-builder-grants))

Common patterns (extracted from selection criteria + named example projects):

1. **Specific named CDP product integrations:** every winner integrated 1+ of (Wallets, AgentKit, Onramp, x402, Paymaster, OnchainKit, Data API). Generic "we use Coinbase" applications rejected
2. **Adoption story already built-in:** *"Real potential for adoption (merchants, creators, SMBs, consumer apps) or automation at scale (agents, workflows, programmatic payments)"* — winning apps had a named end-buyer
3. **Security/DX emphasis:** *"Strong security and DX (transparent docs, reliable flows, responsible key management)"* — winners showcased threat models, key management, audit posture
4. **Working prototype, not vapor:** all 13 recipients had shippable code; submissions referenced GitHub URL + live demo
5. **Example projects:** prediction-market AI assistant; Hydrex (liquidity toolkit); Yield Seeker (DeFi yield AI agent) — pattern is "infrastructure that an agent uses to act"

### Cypherpunk Hackathon (2025) winner shapes — for Frontier comparison

- **Grand Champion: Unruggable** — hardware wallet + companion app; security-shaped narrative
- **Public Goods: Samui Wallet** — open-source + developer-benefiting; Lily Liu's signature pattern
- **Stablecoins track: MCPay** — open payment infrastructure connecting MCP and x402 protocols. **Direct precedent for AgentTrust: MCPay is named in `THESIS_LOCK.md` as a target buyer; they won Cypherpunk's stablecoin track**
- **Infrastructure: Seer** — transaction debugging developer platform on Solana
- **DeFi: Yumi Finance** — onchain "buy now, pay later" with smart contract underwriting

**Pattern:** Cypherpunk winners had named-vertical-narrative + working-product-shaped-pitch + Solana-specific-justification. Generic "AI agent" framing didn't win; specific "AI-agent-payment infrastructure that x402 facilitators integrate" framing wins

### Solana Foundation grant patterns (from Foundation guidance)

The Foundation explicitly looks for:
1. *"a project to be a public good if it either makes a significant open-source contribution to the Solana ecosystem"* (verbatim, [solana.org/grants-funding](https://solana.org/grants-funding))
2. Clear milestones with funding tied to impact
3. Why-Solana justification (chain-specific value, not chain-agnostic)
4. Past open-source contributions from team

**For AgentTrust:** all four boxes are pre-filled by the v1 architecture — MIT-licensed; 5 Kani FV invariants = measurable correctness milestone; Solana-only rationale = ATOM Engine + agent-registry-8004 are Solana primitives with no EVM equivalent; Mohit's Day-21+ research backlog gives prior-work narrative

### Application length pattern

CDP Builder Grants form: 1–2 page typical (form-based + GitHub + demo URL). Solana Foundation: 3–5 page typical (milestone breakdown is the load-bearing element). Superteam Earn: <15 minutes total fill time (3-5 short fields). Frontier (judging via submission): pitch video ≤3 min + technical demo 2-3 min + GitHub + deck

### Format pattern

- ONE-PAGE README hook in repo: "AgentTrust completes the Foundation's ERC-8004 trust stack — the third leg Quantu archived, productized."
- Pitch video opens with concrete pain (Variant B Anthropic scam-wrapper) in first 15s
- Deck has 6 slides max for grant applications (longer for accelerator)

---

## Section H — Eligibility matrix for solo Indian engineer

| Grant | Indian-eligible? | US-LLC needed? | Solo-allowed? | Action |
|-------|------------------|----------------|----------------|--------|
| Solana Foundation direct | YES | No (open globally) | Yes | Apply; cite India residence in profile |
| Solana Foundation India | YES (India-only) | No | Yes | Apply |
| Colosseum Accelerator | YES (open globally) | RECOMMENDED post-acceptance for SF residency | Yes | Frontier submission triggers; don't form LLC pre-acceptance |
| CDP Builder Grants | YES (global) | No | Yes | Apply when Q3 round opens |
| Frontier Standout / Public Goods | YES (global) | No | Yes (solo legal but disadvantaged per `rules-and-prizes.md`) | Submit |
| Solana Foundation USA | NO (US-only) | Would need US-LLC + US-resident person | n/a | SKIP |
| Solana Foundation Japan | NO (Japan-only) | Would need Japan-resident person | n/a | SKIP |
| Solana x Cal / Stanford / FranklinDAO | NO (US-only + likely university affiliation) | Same | n/a | SKIP |
| Superteam Agentic Engineering | YES (global) | No | Yes | Apply |
| a16z CSX | YES (global) | No (but cohort is in-person SF) | Yes; technical-founder bias preferred | Apply post-Frontier-Standout |
| Cubik | YES (global) | No | Yes | Watch for Round 2 announcement |
| Vanish $10K bounty | YES if Vanish Core integration | No | Yes | SKIP (out of scope) |

**Entity-formation considerations (Day 18+):**
- For Solana Foundation convertible grants ($25K+) commercial-component path, Foundation explicitly notes *"work with Foundation Legal Team on grant agreements"*. An Indian Pvt Ltd (DPIIT-recognized startup) or a Singapore Pte Ltd are the two common Indian-builder structures. NeosLegal partnership ($10K legal services) activates only on Frontier-prize-win and may help with formation
- For CSX a16z: $500K @ 7% equity requires a Delaware C-corp at minimum. Stripe Atlas + Cooley template = ~$2K and 30 days. NeosLegal grant covers this if Frontier-prize-won
- **Pre-Day-18 = NO entity formation work.** Mohit applies as individual; entity formation is post-Frontier-prize conditional

---

## What this means for Mohit's submission

- **The top 3 applications by EV are: (1) Solana Foundation direct grant filed 2026-05-12 ($15K–$50K convertible, decision by 2026-06-08, AgentTrust is bullseye public-goods), (2) Solana Foundation India filed 2026-05-04 ($10K USDC, decision by 2026-06-03, India eligibility unlocks the easiest cash), (3) Colosseum Accelerator post-Frontier-prize ($250K probabilistic via prize-win pipeline).** These three plus the $20K Frontier Standout/Public-Goods take the cash ceiling to ~$295K + $250K accelerator pre-seed — **before the CDP / Helius / a16z pipeline ever activates.**
- **File Solana Foundation India on Day 6 (2026-05-04).** This is the strongest pre-Frontier-deadline grant move because: (a) Mohit is India-based, (b) the 30-day decision window aligns with the Frontier build calendar, (c) the milestone-based ask "$10K to ship 3-component v1 by 2026-05-11" turns the build itself into the funded milestone. Cap effort at 90 minutes. Use the [solana-foundation-india.md](../other_tasks/grants/solana-foundation-india.md) draft as the starting point
- **Skip USA / Cal / Stanford / FranklinDAO / Japan grants.** Eligibility blocks. Don't waste application time on these. Document the ineligibility in INDEX so future Mohit doesn't re-research
- **Helius Pro is the asymmetric move; sign up Day 5.** $499/mo subscription unlocks Mert's deck-review + investor-intro pipeline. Mert is a gating Frontier judge AND the largest public Solana angel. The cost is rounding error vs. the upside; do not skip. Use [helius-pro-mert-pipeline.md](../other_tasks/grants/helius-pro-mert-pipeline.md) DM templates for Day-14 deck-review request
- **Apply for $200 Superteam Agentic Engineering Grant Day 5.** Trivial dollars but a public listing on `superteam.fun/earn/grants/agentic-engineering` is reusable narrative for Frontier deck Slide 6 + provides a Superteam-network credibility anchor. 20-minute application
- **Frontier Standout + Public Goods are the same submission, not two.** Per `rules-and-prizes.md` Section 10 (Cypherpunk precedent), one submission can win both; apply for both via the single Frontier portal entry. The Public Goods framing language goes in README + Slide 5 + closing pitch line
- **CDP Builder Grants is the strongest post-Frontier-deadline external grant.** Coinbase incubated x402; AgentTrust is x402-spec-compliant facilitator gating; drop-in TS module is direct CDP-stack add. Apply whenever Q3 2026 round opens (Mohit watches [coinbase.com/developer-platform/discover/launches](https://www.coinbase.com/developer-platform/discover/launches) for announcement)
- **Total grant-application time through 2026-06-30 is capped at ~12 hours.** Cap each application at 90–120 minutes first pass. Time over-investment in grants is the failure mode — `feedback_research_discipline.md` sets depth-over-speed default but grants have diminishing returns past a 2-hour-per-app threshold. Iteration is cheap if rejected
- **Per-application drafts in `plan/other_tasks/grants/` are 80% submission-ready.** Mohit reviews + personalizes the [Mohit: insert prior project URLs] / [Mohit: add 2-line pitch] / [Mohit: insert GitHub URL] markers + submits. The Foundation-alignment language is locked across drafts to maintain narrative consistency. Never name SAEP in any application
- **The Indian-entity-formation question is NOT pre-Day-18 work.** All applications go in as Mohit-individual; entity formation triggers only after Frontier-prize-win (NeosLegal $10K legal services activates) or Foundation-grant-approval (legal team handles). DO NOT spend Day 5–17 build hours on Stripe Atlas, Pvt Ltd, or Singapore Pte Ltd setup
- **Don't relitigate which grants to skip.** USA-only / Japan-only / University-Award eligibility blocks are non-negotiable; the ranked inventory in Section A is the operational truth-table. If a new grant surfaces (Cubik Round 2, x402 Foundation announcing builder rounds, etc.), add to inventory by editing this file — don't re-run the full ranking
