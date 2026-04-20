# Solana Frontier Hackathon — Rules, Prizes, Format

**Primary sources:** [colosseum.com/frontier](https://colosseum.com/frontier), [colosseum.com/hackathon](https://colosseum.com/hackathon), [blog.colosseum.com/announcing-the-solana-frontier-hackathon](https://blog.colosseum.com/announcing-the-solana-frontier-hackathon/), [blog.colosseum.com/how-to-win-a-colosseum-hackathon](https://blog.colosseum.com/how-to-win-a-colosseum-hackathon/), [blog.colosseum.com/perfecting-your-hackathon-submission](https://blog.colosseum.com/perfecting-your-hackathon-submission/), [incrypted.com article](https://incrypted.com/en/the-colosseum-frontier-hackathon-has-officially-kicked-off/), [NeosLegal partnership](https://neoslegal.co/neoslegal-solana-hackathon-partnership/), [Flash news Phantom sponsorship](https://blockchain.news/flashnews/phantom-backs-solana-s-2-5m-frontier-hackathon-with-major-sponsorship)

Last verified: 2026-04-21

---

## 1. Timeline (hard dates)

| Event | Date |
|-------|------|
| Registration opens + hackathon starts | **2026-04-06** |
| Submission deadline | **2026-05-11** |
| Duration | 5 weeks online |
| Days remaining (from 2026-04-21) | **20** |

No interim milestone deadlines beyond May 11 submission cutoff. The "weekly updates" field is **optional** per blog guidance — ignoring it "hurts evaluation" but is not disqualifying.

## 2. Prize structure — the full $2.75M

| Tier | Amount | Count | Notes |
|------|--------|-------|-------|
| Grand Champion | **$30,000** | 1 | Sponsored by **Phantom** |
| Standout Team | **$10,000** | 20 | $200,000 total |
| University Award | **$10,000** | 1 | Team must be ≥50% enrolled students |
| Public Goods Award | **$10,000** | 1 | Open-source / non-extractive projects |
| Accelerator pre-seed | **$250,000** | 10+ | $2.5M+ total, post-hackathon |
| **Total direct cash** | **$260,000** | 23 teams | |
| **Total pool (cash + investment)** | **$2.75M** | | |

**No Colosseum-run sponsor-track cash prizes** — the Frontier cycle removed all sponsor-specific $25–30K tracks that existed in Cypherpunk/Renaissance. Secondary sponsors provide workshops, SDKs, and credits only — there is no "win the Arcium track for $X" path this cycle from Colosseum itself.

**Superteam side-track pool — $350K+ aggregated** (separate from Colosseum's $260K cash):
- Per [Colosseum official 2026-04-13](https://x.com/colosseum/status/2043738681052409939): *"Superteam has aggregated $350k+ in side tracks."* These are regional and vertical side tracks run by regional Superteam chapters and sponsor partners — materially important second pool that was missed in the prior "no tracks" characterization.
- Confirmed examples: Superteam Ukraine $100–$10,000 per entrant, Superteam UAE partnership with NeosLegal.
- Action: check `superteam.fun/earn` + the regional Superteam for Mohit's geography in Day 2 research (`05-grants-and-money/superteam-earn-bounties.md`).

**Additional ecosystem side prizes:**
- **NeosLegal** — $10,000+ in legal services to any winning team, global ([NeosLegal partnership](https://neoslegal.co/neoslegal-solana-hackathon-partnership/))
- **Vanish (Breakout DeFi winner, now sponsor)** — $10K bounty for best submission built with Vanish Core API ([Vanish 2026-04-11](https://x.com/vanishTrade/status/2043041802794476031))
- **FluxRPC** — builder-plan discount ($38 → $15/mo) for Frontier participants April 2026 ([FluxRPC 2026-04-08](https://x.com/FluxRPC/status/2041983492423078292))
- **Altitude** (primary sponsor alongside Phantom) — exact role unclear; team is hosting hackathon workshops in Discord + likely direct builder support from Garrett Harper and team

## 3. Sponsors (2026-04-21 confirmed list)

**Primary (Grand Prize sponsor tier):**
- Phantom ($30K Grand sponsor)
- Altitude

**Secondary (workshop / SDK / integration sponsors, no direct cash track):**
Coinbase, Privy, Metaplex, Reflect, Arcium, World, Raydium, MoonPay

**Ecosystem / infrastructure partners:**
Solana Foundation, Superteam (global + regional), plus Developer Relations team office hours

## 4. Eligibility (what's public)

- Open globally — online hackathon
- Team size: **no stated cap or minimum** in official rules. **However**, the Colosseum "How to Win" post explicitly states: *"Form teams of at least 2-3 people. The average winning team now exceeds 3 members."* Solo participation is legal but disadvantaged by design.
- University Award: team ≥50% enrolled students (implied from prior cycles)
- Must register at https://arena.colosseum.org/register and submit a project through that portal
- Participants evaluated on code **created during the hackathon window** — pre-existing products cannot be re-submitted

## 5. Submission format (judge-facing deliverables)

Every submission must include:

### 5a. GitHub repository (code-repo)
- Public repo of all code created during the 5-week window
- Judges must have access (public or granted) — missing access = auto-rejection in practice
- README quality is "load-bearing" per guidance — see §5d

### 5b. Pitch video (the "why")
- **Maximum 3 minutes**. Over is penalized (judges watch hundreds; strict).
- Loom recommended
- Required content elements:
  - Team background (founder-market fit)
  - Problem statement + target user
  - Personal motivation for building
  - Market opportunity (size, viability)
  - User acquisition / traction strategy
  - **Live product demo segment** ("aha moment")
- Tone: concise, substance over flash, no buzzword stuffing

### 5c. Technical demo video (the "how") — NEW since Cypherpunk
- **2–3 minutes**
- Walk through core features built + tech stack + architecture decisions
- **Must explicitly explain why Solana is the chosen chain** and how Solana-specific primitives (Anchor / ALTs / compressed state / ACE / priority fees / etc.) are used
- Judges "particularly interested" in reasoning behind architectural choices
- Not a second pitch — technical and direct

### 5d. Pitch deck / supporting docs
- Google Docs / Slides common
- Judges need explicit access — forgetting access permissions is the #1 recurring mistake per Colosseum's blog
- Content: expanded version of pitch video; vision, architecture, roadmap, revenue model

### 5e. Optional but strongly encouraged
- Project X/Twitter account launched at registration to recruit beta testers + show traction by submission
- User feedback evidence (screenshots of Telegram/Twitter conversations with potential users)
- Working mainnet or devnet deployment with live URL

## 6. Judging criteria (inferred from official "How to Win" + "Perfecting Your Submission")

Weighted (qualitative, not numeric) in this implicit order:

1. **Founder–market fit** — does this person/team have unique authority to build this?
2. **Product viability / revenue model** — can this become a venture-scale company?
3. **Working demo quality** — does the "aha moment" land in 3 min?
4. **Solana integration depth** — are you *using* Solana or is it incidental?
5. **Traction evidence** — did you talk to users during the sprint?
6. **Full-time intent** — will the team keep building post-hackathon?

~40 prizes distributed among ~400+ submissions per cycle; **top ~100 are "typically exceptional"** per Colosseum; the top 20 Standouts tier is the realistic ceiling for a first-time entrant.

## 7. Known disqualifiers / common failure modes

Per [How-to-Win](https://blog.colosseum.com/how-to-win-a-colosseum-hackathon/) and [Perfecting Your Submission](https://blog.colosseum.com/perfecting-your-hackathon-submission/):

- Missing judge access to Google Docs / repo / pitch video (top recurring mistake)
- Pitch video over 3 min (strict)
- No explanation of *why Solana* — judges reject chain-agnostic "could-be-on-any-EVM" submissions
- Unpolished video ("flashy visuals, no substance")
- Pre-existing product submitted (scope of "created during hackathon" enforced)
- Ignoring optional fields (traction, feedback, user count) signals low effort

## 8. Accelerator (the real prize after the $30K)

- 10+ teams accepted per cycle
- $250,000 pre-seed investment per team
- Mentorship network (Solana Labs, Anza, Multicoin, Solana Ventures, Foundation)
- "Substantial AI credits" (quantity unspecified)
- IRL support at Colosseum's **San Francisco office**
- Private Demo Day with crypto VCs
- Selection: **ALL prize winners** are interviewed; selection criterion is "intent and ability to build full-time" — teams must be capable of moving to SF full-time post-hackathon

## 9. What's UNKNOWN as of 2026-04-21 (open questions)

- Exact judge roster — Colosseum states "40+ judges" from "major protocols and investment firms" but no public list (see `judges-and-bias.md`)
- Whether University Award has same team-size advisory as main track
- Whether mainnet deployment at submission is rewarded over devnet
- Interim public workshop schedule beyond the few confirmed Discord sessions with Phantom Connect, Metaplex, World, Altitude

---

## What this means for Mohit's submission

- **The solo team handicap is now explicit and official.** Colosseum's own guidance says winning teams average 3+ members. This is the single most actionable finding in File 1. Either recruit a non-technical cofounder (designer / distribution / domain expert) from Superteam's cofounder directory in the next 2–3 days, OR compensate by making the solo narrative itself a product advantage (e.g., lean infra play where one senior engineer is credible; see also File 4 post-mortem patterns). The win rate at 1 person is not zero but it is materially lower. **Make this decision by Day 3.**
- **With sponsor tracks gone, there is no "easier" side-prize to target.** Every submission competes in a single pool of ~23 cash winners. This raises the bar: the thesis must be a Grand-or-Standout-caliber product from day one. Do not design for "just win the Arcium track" — that track no longer exists.
- **The technical demo video is a forced moat for someone with deep Solana chops.** Many teams will half-ass this new requirement. Mohit's mid-to-advanced Anchor/Rust skill + an architecture-level walkthrough ("here is the instruction surface, here is why it's rent-exempt, here is how I handle priority fees under congestion") is a direct competitive edge **if** the thesis is Solana-primitive-heavy infra/DeFi, not generic consumer UX.
- **The top 20 Standout tier is Mohit's real target, not the Grand.** Realistic ceiling for a solo first-timer. Designing explicitly for Standout (solid product + clear wedge + working demo) rather than "Grand or bust" is higher EV and still lands the $10K + an accelerator interview.
- **Founder-market fit must be explicit in the pitch video.** Mohit should open with 10 seconds of why-*he* is the builder (senior Solana/Rust, specific niche expertise) before problem statement. Judges pattern-match on unfair advantage in the first 20 seconds.
- **The accelerator is the real prize.** $250K + SF office + mentorship > $30K cash. The pitch video should be calibrated for accelerator selection, not just prize ranking — meaning full-time intent and clear path to venture scale must be unambiguous.
