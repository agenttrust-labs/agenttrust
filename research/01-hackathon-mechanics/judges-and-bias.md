# Judges and Judging Bias — Frontier 2026

**Purpose:** Map the judge roster (public + proxy) and their publicly stated preferences. Used to calibrate pitch video + technical demo video to judge bias, not to engineer around it.

**Sources:**
- [colosseum.com/frontier](https://colosseum.com/frontier) — states "40+ judges" from major protocols and investment firms (no public list as of 2026-04-21)
- x-recon profile scrapes (cached): `@colosseum` (41 tweets), `@armaniferrante` (44), `@calilyliu` (55), `@toly` (53), `@mert` (59), `@rajgokal` (14)
- x-recon search: `from:mattytay` (60 tweets)
- Public blog content from Colosseum's [How to Win](https://blog.colosseum.com/how-to-win-a-colosseum-hackathon/) and [Perfecting Your Submission](https://blog.colosseum.com/perfecting-your-hackathon-submission/)

**Handle corrections discovered this session:**
- Matty Taylor's working handle is `@mattytay` (target-accounts.md listed stale `matty_eth`)
- Toly's search/profile works on `@toly` when `@aeyakovenko` is blocked on our dummy
- Mert works on `@mert` when `@0xMert_` is blocked
- `@MaxResnick1` returned 0 tweets — account possibly renamed; he posts but under a different handle

Last verified: 2026-04-21

---

## 1. Most-likely judge roster (tiered probability)

### Tier A — near-certain (public role + historical judging)

| Judge | Role | Evidence |
|-------|------|----------|
| **Matty Taylor** (`@mattytay`) | Colosseum founder | [2026-03-24](https://x.com/mattytay/status/2036521675098136763) — personally announcing $2.5M winner investment |
| **Clay Robbins** | Colosseum co-founder | Historical lead judge in all prior cycles |
| **Anatoly Yakovenko** (`@toly`) | Solana co-founder | Judge in every prior Colosseum cycle; [mattytay 2026-04-06](https://x.com/mattytay/status/2041238525694316682) names him in assembled team |
| **Mert Mumtaz** (`@mert`, Helius CEO) | Ecosystem infra lead | Named by Matty in same "assembling team" tweet |
| **Lily Liu** (`@calilyliu`) | Solana Foundation president | [2026-04-20](https://x.com/calilyliu/status/2046193737555144904) actively commenting on unified-liquidity narrative; historical Foundation judge |
| **Raj Gokal** (`@rajgokal`) | Solana co-founder | Lower posting volume but historically present in judging panel + featured in Jito a16z retrospective |

### Tier B — likely (active in Colosseum orbit; confirmed via scrape)

| Judge | Role | Evidence |
|-------|------|----------|
| **Armani Ferrante** (`@armaniferrante`) | Anchor creator + Backpack founder | Prior Colosseum judging; [2026-04-05 post on security](https://x.com/armaniferrante/status/2040640954588414176) directly relevant to judging bias |
| **Vibhu** (`@vibhu`) | Solana trading infra | Named in Matty's "assembling team"; active in Drift recovery comms + Solana Accelerate NYC |
| **Phantom team lead** | Grand Prize sponsor | [Workshop hosted April 9](https://x.com/phantom/status/2042312082193072422) — sponsor-judge linkage standard |
| **Altitude team lead** | Co-primary sponsor | Workshop April 14 in Colosseum Discord |
| **Austin Federa** (`@austin_federa`) | Solana Foundation comms/ecosystem | Historical judge |
| **Jacob van Creech** (`@jacobvcreech`) | Solana ecosystem | Active in post-Drift security discussion |

### Tier C — investor judges (VC firms confirmed to back Colosseum portfolio per [mattytay 2026-04-15](https://x.com/mattytay/status/2044460444749074683))

Per Matty's list of funds that have invested in Colosseum portfolio the past several months:
- @paradigm, @variantfund, @6thManVentures, @BITKRAFTVC, @SolanaVentures, @Collab_Currency, @TheiaResearch, @VoltCapital, @robotventures

Expect 1–2 partners from each to appear on the judging panel, per prior cycles.

## 2. What each Tier A/B judge has publicly said in the last 60 days

### Matty Taylor — founder ethos, startup discipline, bridge-skeptic

Highest-signal judge. Explicit ethos:

- **"Hackathons need to hyper-commercialize: prizemaxxing, weeks of grinding, real seed capital and winners that feel like they just changed their lives."** — [2026-03-20](https://x.com/mattytay/status/2034807896249422313) — treat this as a startup launch, not a hackathon project.
- **"Since 2020 we've considered rebranding the Solana hackathon to a startup competition, as it's effectively evolved into one."** — [2026-04-11](https://x.com/mattytay/status/2043019496890470452) — Matty views hackathon = startup.
- **"Trustless, decentralized bridges do not exist. And probably never will exist. Reallocate accordingly."** — [2026-04-20](https://x.com/mattytay/status/2046021326683734378) — hard anti-bridge signal, confirms kill-list.
- **"Stablecoins are the LinkedIn of cryptocurrency."** — [2026-03-14 (cycle-earlier)](https://x.com/mattytay/status/2032298822286848307) — payments + stablecoins is serious business, not meme.
- **"The cheapest and most liquid place to exchange SOL is on Solana. That cannot be said of any other L1 asset."** — [2026-03-17](https://x.com/mattytay/status/2034035969176048075) — Solana-as-liquidity thesis is his frame.
- **"By far the most valuable service L1 foundations can provide right now is to subsidize LLM credits for their ecosystem startups."** — [2026-03-11](https://x.com/mattytay/status/2031812782488949239) — AI-tooling ecosystem infrastructure view.
- **"I've come around to toly's view that most tokens should have a staking mechanism to align incentives. Staked tokens ~ preferred (yield, commitment), Unstaked tokens ~ common (liquidity, optionality)."** — [2026-03-18](https://x.com/mattytay/status/2034299717388218770) — token-design sophistication on his mind.
- Anti-ragebait marketing: [2026-04-17](https://x.com/mattytay/status/2045185240239669326) — "doesn't build sustainable user acquisition funnels."
- Reality-check on founder distribution grind: [2026-04-17](https://x.com/mattytay/status/2044958502863667499) — months/years of low engagement.
- Project creation pacing **2.5× prior cycle**: [2026-04-06](https://x.com/mattytay/status/2041244408109203736) — implied ~3,500 Frontier submissions vs. 1,412 Breakout. Competition is denser.

### Anatoly Yakovenko (`@toly`) — formal verification, validator perf, DeFi precision

- **"DeFi needs formally verified precision."** — [2026-04-20](https://x.com/toly/status/2046284918729134215) — high-signal for infra/DeFi entrants.
- **"XDP is a blocker for all block increases and latency reductions."** — [2026-04-19](https://x.com/toly/status/2045952690333831220) — validator performance obsession.
- Retweets endorsing Solana Assembly / sBPF framework work (dhkleung 2026-04-20): *"now you can include files and use macros in sBPF. It is finally possible to build ASM frameworks on Solana."* — low-level DevEx is warm.
- Retweets Token 2022 programmable-transfer-limit content (mmdhrumil 2026-04-19) — programmable stablecoin-style restrictions as a primitive.

### Mert Mumtaz (`@mert`, Helius) — security + privacy + real crypto usage

- **"One of the most misunderstood aspects of privacy is that it's also a core pillar of security. The less information you leak, the less surface area hackers have."** — [2026-04-20](https://x.com/mert/status/2046319222352167199) — privacy-as-security frame.
- **"The obvious problem with cryptographic currencies is that, often, we are not using cryptography but humans to secure them. A lot of DeFi currently is tradfi without the regulation but much more multiplicative in risk due to composability."** — [2026-04-19](https://x.com/mert/status/2045940194516382029) — core critique pattern.
- Post-Drift, 2026-04-18: **"this is like the 10th hack in the past 2 weeks. good time to audit your opsec."** — [link](https://x.com/mert/status/2045582183767916789).
- "AI is the most bullish crypto catalyst in the history of mankind" — [2026-04-18](https://x.com/mert/status/2045543848852775103) — AI × crypto rails.
- Anti-openclaw (Google AI tool) sentiment; pro Anthropic Claude Code dev workflow.

### Lily Liu (`@calilyliu`, Solana Foundation) — liquidity primacy, opsec after Drift

- **"Solana is built for trading, and in markets, liquidity is king."** — [2026-04-16](https://x.com/calilyliu/status/2044790068099842443) — central framing.
- **"Techie speak 'single state machine' → Translated: 'unified liquidity.'"** — [2026-04-20](https://x.com/calilyliu/status/2046193737555144904) — ASAP endorsement.
- Post-Drift (2026-04-02): **"Smart contracts held up. The real targets now are humans: social engineering and opsec weaknesses more than..."** — [link](https://x.com/calilyliu/status/2039652201342050713) — smart-contract dev should flaunt low-surface-area architecture.
- Pro-Tether/USDT on Solana (2026-04-16) — liquidity infra over ideology.

### Armani Ferrante (`@armaniferrante`, Anchor + Backpack) — security-first mandate

- **"Every team in crypto should use this as an opportunity to slow down and focus on security. If possible, dedicate an entire team to it."** — [2026-04-05](https://x.com/armaniferrante/status/2040640954588414176) — 1,204 likes, heaviest-signal judge post 60d.
- Heavy on Backpack operational detail — regulatory/exchange-grade thinking.

### Raj Gokal (`@rajgokal`) — Solana-as-fintech narrative

- "Critical turning point in the future of trading infrastructure" (2026-04-16) — trading-infra obsession.
- "all roads lead to solana" (2026-02-27) — ecosystem dominance frame.
- Surfaces SoFi/xStocks/JPMorgan fintech integrations — institutional gravity theme.

### Colosseum official account — explicit slogans for this cycle

- **"Trusted third parties are security holes."** — [2026-04-20](https://x.com/colosseum/status/2046054547093884962) — direct quote of the Szabo Cypherpunk canon. Signals the judging panel is trust-minimization-oriented.
- **"The original vision of DeFi will prevail."** — [2026-04-20](https://x.com/colosseum/status/2046073848102313995) — non-extractive, primitives-over-volatility framing.
- **Participation prizes rejected**: "Why don't you give out participation prizes in the hackathon?" — [2026-04-16](https://x.com/colosseum/status/2044781727617544553) — Colosseum's stance that the $10K × 20 tier *is* the participation floor; nothing below that is rewarded.

## 3. Synthesized judge biases (the rubric behind the rubric)

Weighted by cross-judge repetition across the last 60 days, top biases this cycle are:

1. **Security-first architecture (Armani + Mert + Lily + Colosseum official)** — post-Drift, every Tier A/B judge is publicly security-focused. Mohit's technical demo video should include ≥30 seconds on security posture: program authority model, emergency halt, multisig setup, formal verification intent, or opsec design. **This is the #1 unspoken bias for Frontier 2026.**
2. **Liquidity-first DeFi framing (Matty + Lily + Raj)** — "Solana is built for trading." Any DeFi project framing itself around liquidity improvements (price discovery, spread capture, venue efficiency, cross-venue routing, intent solving) is narratively aligned. Explicit anti-hype framing scores better than explicit high-APY framing.
3. **Formal verification / precision (Toly)** — not required, but a strong signal for infra/DeFi primitives. Mentioning formal methods, property-based testing, or invariant enforcement in the technical demo is disproportionately high-leverage if Mohit can credibly deliver.
4. **Privacy-as-security (Mert)** — privacy-adjacent projects (Cloak, Vanish, MCPay) have done well and Mert is championing the framing. Frontier may reward privacy primitives more than Cypherpunk did (where they were concentrated in one "Cypherpunk" themed track).
5. **AI × crypto as rails, not hype (Matty + Mert)** — specifically: (a) AI agents *using* crypto (x402, MCP, agent wallets — Phantom just shipped these April 9), (b) AI infra *for* crypto builders (LLM credits subsidy framing). NOT: "vague AI agent" slop.
6. **Founder-market-fit openings from real-world pain (Matty's "Crypto products naturally slotting into real-world stressors")** — stablecoin remittance, compliance-credible lending, payments for underbanked geographies, opsec tooling post-Drift.

## 4. Structural biases (not attributable to individuals)

- **Team size**: Official Colosseum guidance says "winning teams average 3+ members" — solo entrants need an unfair-advantage narrative to compensate.
- **Full-time intent**: Pitch video must make full-time post-hackathon path credible; accelerator = 10 teams relocate to SF.
- **Founder authority**: Judges pattern-match on "this person has unique credentials to build this." A senior Solana/Rust engineer has that authority in infra/DeFi; not in consumer UX.
- **Distribution runway proof**: Matty's "months of zero engagement" post implies judges expect you to have started on distribution (X account, waitlist, user convos) by submission day.

## 5. Explicit anti-biases (don't do these)

- Bridge products (Matty explicit)
- Ragebait/viral-speculation positioning (Matty explicit)
- Chain-agnostic "could be any EVM" pitches (kills "why Solana" judgment)
- Sponsor-track gaming — tracks don't exist this cycle
- Pre-existing products rebranded (out of hackathon scope)
- Missing judge access to repo / docs / video (top recurring submission mistake)

## 5b. Day-2 update: judge ENGAGEMENT patterns (not just statements)

This section tracks what each judge *engages with* (retweets, replies, quotes), which is harder signal than what they post. Updated 2026-04-22 from x-recon Day 2 scrapes (`mert`, `toly`, `calilyliu`, `colosseum`, `armaniferrante`, `mattytay`, `vibhu`, `SolanaFndn`, `asymmetric_re`).

### Matty Taylor (`@mattytay`)
- Highest-engagement crypto-relevant tweet last 60d: **2026-04-09 "Anthropic Mythos taking a first look at DeFi protocols"** (2,130 likes) — Matty engages most with AI-meets-DeFi crossover.
- RT'd Glasswing AI security agent ([2026-04-08](https://x.com/mattytay/status/2041737183363756327)) — actively endorses AI-driven security tools.
- Identifies inner circle: [2026-04-06](https://x.com/mattytay/status/2041238525694316682) names `@toly @mert @crabbylions @vibhu` as his "team."
- Boosts tracked Cohort 4 portfolio: Kormos, Unruggable, Vistadex, Credible, ArcherExchange, Cloak — pattern-matches new submissions to Cohort 4 shape.

### Toly (`@toly`)
- Crypto-tech engagement: RT'd [dhkleung 2026-04-20](https://x.com/dhkleung/status/2046106834784989341) on Solana Assembly + sBPF macro framework — endorses low-level DevEx.
- RT'd [mmdhrumil 2026-04-19](https://x.com/mmdhrumil/status/2045956146717212878) on "wrapped USDC with programmable limits via Token 2022" — direct Token-2022-programmable-stablecoin endorsement.
- RT'd Token-2022 retweeted material via mmdhrumil-style mentions — confirms Token-2022 obsession.
- Most political/personal-economy content has highest engagement (poverty/Bernie/automation memes), but his crypto-tech RTs are concentrated on **Token-2022 + formal-verification + low-level Solana DevEx**.

### Mert (`@mert`)
- [2026-04-10](https://x.com/mert/status/2042577633515393205): explicit angel-investing offer — Helius Pro/Business gets pitch deck review. **Mert is operationally an angel investor at Frontier scale.**
- [2026-04-21 LanaAI launch](https://x.com/mert/status/2046628605393002794): shipped his own AI×Solana product (block explorer killer). Engages most with AI-on-Solana products.
- Warned about Drift exploit live ([2026-04-01](https://x.com/mert/status/2039391990073176258)) — incident-tracking-credible voice, not just commentary.
- Pro-Anthropic, anti-OpenAI engagement pattern visible in tooling preferences.

### Lily Liu (`@calilyliu`)
- [2026-04-20](https://x.com/calilyliu/status/2046193737555144904): "single state machine = unified liquidity" — coining narrative for Foundation messaging.
- [2026-04-16](https://x.com/calilyliu/status/2044790068099842443): celebrates USDT growth on Solana (520 likes) — stablecoin-liquidity-as-Solana-thesis is her top frame.
- Engages with [Tether's Drift recovery 2026-04-16](https://x.com/tether/status/2044763602469507152) — reads the institutional rescue layer.
- [2026-04-02 post-Drift](https://x.com/calilyliu/status/2039652201342050713): "Smart contracts held up. The real targets now are humans" — opsec-narrative co-author.

### Armani Ferrante (`@armaniferrante`)
- Single highest-engagement post 60d: **[2026-04-05 security take](https://x.com/armaniferrante/status/2040640954588414176) (1,204 likes, 178 RTs)** — security-first is his loudest public position.
- TGE/Backpack-ops content dominates volume; security posts dominate engagement-per-tweet ratio.

### Raj Gokal (`@rajgokal`)
- Lower volume (14 tweets/60d) but engages on trading-infra + fintech-on-Solana (xStocks, SoFi, JPMorgan/Citi/HSBC at Solana Accelerate NYC).
- [2026-04-16](https://x.com/rajgokal/status/2044603529390620673): "critical turning point in the future of trading infrastructure" — trading-infra-as-Solana-thesis.

### Vibhu (`@vibhu`) — newly added Tier-A
- [2026-04-06](https://x.com/vibhu/status/2041248631735374042): announced STRIDE security program publicly.
- [2026-03-26](https://x.com/vibhu/status/2036969570649452652): **"99.99% of all onchain transactions in 2 years will be driven by agents, bots, and LLM-based wallets"** (452 likes) — agent-economy true-believer.
- [2026-03-25](https://x.com/vibhu/status/2036861219986878741): "Solana to win in AI: Commerce & Payments, DevEx, Moonshots. Solana facilitated 15 million agentic payments so far in 2026 — nearly 65%."
- [2026-03-24](https://x.com/vibhu/status/2036440301548560586): debuted **SDP (Solana Developer Platform)** — tokenization + payments orchestration with Mastercard, Western Union, Worldpay.
- Core thesis: **AI commerce + tokenization-via-Token-2022 + DevEx**. Direct alignment with (d)×(e) intersection that Mohit is targeting.

### Solana Foundation (`@SolanaFndn`)
- [2026-04-06 STRIDE/SIRN announcement](https://x.com/SolanaFndn/status/2041246400977965124): 1,130 likes — top Foundation post 30d.
- RT'd Brien Colwell's `yo_ur_network` (decentralized VPN on Solana) — privacy infrastructure being elevated.
- RT'd ATXP Music live demo (Circuit & Chisel agent commerce) — endorses x402 product winners.
- RT'd b_migliaccio (Token-2022 crate builder) — picks up small builders, not just protocols.

### Asymmetric Research (`@asymmetric_re`) — STRIDE partner
- Posts cadence is sparse (14 tweets/60d) but high-signal: STRIDE launch, p-token bug discovery before mainnet, "Code coverage for coding agents" prototype open-sourced 2026-04-09.
- **Engages most with formal-verification + AI-audit-tooling crossover.** Not a builder or competitor — but signals what Foundation considers excellence.

### Composite engagement signal
The "Matty inner circle" (Matty + Toly + Mert + Vibhu + crabbylions) collectively engage with **Token-2022 + AI-agent rails + formal verification + security** in disproportionately high frequency. A thesis sitting at the intersection of these themes hits multiple inner-circle attention surfaces.

## 6. Open questions this file cannot yet answer

- Is a single public judge roster expected to drop before May 11? (No evidence yet; may remain opaque until winners' announcement.)
- Does the University Award weight faculty advisors (some schools force one)?
- Does the Public Goods Award require a specific open-source license (MIT/Apache vs GPL)?

---

## What this means for Mohit's submission

- **Security is the single highest-leverage, lowest-competition axis for the technical demo video.** Every judge in Tier A/B posted about security in the last 30 days. A 30-second segment explicitly covering: (a) program authority freeze plan, (b) multisig/timelock stance, (c) invariants the code enforces, (d) deliberately-excluded features to minimize attack surface — this costs Mohit ~1 hour of demo prep and is directly aligned with 5+ judges' publicly stated 2026 priorities.
- **Frame the thesis around liquidity or security, not AI or consumer UX.** Liquidity and security are the two Tier-A judge-aligned frames. AI × crypto can win but requires it to *be* infrastructure, not vibes. Consumer is possible but Mohit as a solo senior engineer has thin authority there.
- **Compensate for solo with a founder-market-fit opening in the pitch video.** 10 seconds of "I'm Mohit, I've shipped X, Y, Z on Solana for N years" buys judge patience that a 2-person team gets for free. Do not apologize for being solo; flip it to "I can ship at infra speed without coordination overhead."
- **Match Matty's "hyper-commercialize" framing.** Project X account live. User-convo screenshots. Stated plan to move to SF if accepted into Cohort 5. This is the accelerator selection criterion, not the $30K criterion — and the accelerator is the real prize.
- **Avoid kill-list explicitly.** No bridge, no ragebait launch, no "vague AI agent." If Mohit's current thesis-longlist has any of these, kill them on Day 2 before the Day 3 thesis lock.
- **Update target-accounts.md**: replace `matty_eth` with `mattytay`, add `toly` and `mert` as working-for-this-dummy alternates to the blocked `aeyakovenko` and `0xMert_`.
