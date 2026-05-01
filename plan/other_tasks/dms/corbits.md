# Corbits (`@corbitsdev` — corrected handle) — DM playbook

**Priority:** 5 of 5. **Send Day:** 2026-04-30 (Day 6) per `08-facilitator-outreach-class.md` §G send schedule. **Send-time:** 11:00 IST = 20:00 UTC 2026-04-29. **Source dossier:** `plan/research/08-facilitator-outreach-class.md` §B.5.

---

## Dossier summary (3 paragraphs)

**Org + product:** Corbits is the x402 endpoint dashboard at [corbits.dev](https://corbits.dev). Cypherpunk Infra runner-up per Wave 2 #5 §F.5. They run a "universal x402 router" via @httpayer. Their surface is observability-side, not facilitator-integration — they DASHBOARD other facilitators' traffic. **Corrected X handle: `@corbitsdev` (no underscore).** The originally-targeted `@corbits_dev` returned 0 tweets. Correct handle confirmed via search 3.

**Live-tweet hooks available:** 1 confirmed tweet in 30d window. **`@corbitsdev` 2026-04-23**: "For agent pilots, looking for another source of useful data and inference, check out Hyre's x402 and MPP endpoints at hyre.api.corbits.dev" ([URL](https://x.com/corbitsdev/status/2047419546622124161)) — 4 likes, 0 RT. Indicates Corbits is dashboarding Hyre's traffic and partnering with new facilitators continuously. Also surfaced the Hyre endpoint URL as a real public artifact.

**Hook to use:** the Hyre dashboard partnership tweet 2026-04-23. AgentTrust framing for Corbits: NOT a sales target — **distribution partner**. Their dashboard surfaces facilitator events; AgentTrust's `NewFeedback` events on every settle (per Wave 2 #5 §F.5) flow into their dashboard as a per-merchant reputation column. **Corbits doesn't compete with Dexter / atxp_ai / MCPay / Latinum — they observe them.** The DM frame: "you surface my data; I bring you a column your customers want." **Foundation-orbit warmth: low-medium** (Cypherpunk Infra runner-up; Foundation-track historical association).

---

## DM 1 — Cold-discovery (Day 6, 2026-04-30 11:00 IST)

**Annotation:** anchored on the [2026-04-23 Hyre dashboard tweet](https://x.com/corbitsdev/status/2047419546622124161). Frame: distribution partnership not sales pitch. Asks about latent demand for Foundation-registry-reputation as dashboard column.

> Hey — saw the Hyre x402+MPP endpoint surface on hyre.api.corbits.dev. Quick observability question: would your facilitator customers benefit from a per-payment Foundation-registry reputation column on top of revenue/volume tracking — i.e., "this $0.03 settle just emitted +100 to the payee's Solana Foundation registry agent account"? Trying to gauge latent demand. One-liner welcome.

(411 chars)

**What it tests:**
- Whether Corbits' dashboard customers ask for Foundation-registry-reputation tracking.
- Whether the per-settle reputation column is differentiated enough from existing volume/revenue tracking.
- Whether Corbits sees themselves as data-pipeline-distribution-channel (their dashboard surfaces other ecosystems' events).

**Green response signals:** "Yes, customers ask for that," "We've thought about reputation surfacing," "What's the data shape" (architecture interest).

**Red response signals:** "Volume + revenue is what they care about," "Out of dashboard scope," no response (low-base-rate but possible due to small team).

---

## DM 2 — Warm-pitch (Day 10, 2026-05-04 11:00 IST)

**Annotation:** introduces the `NewFeedback` event spec + the ~30-min adapter framing. Wave 2 #5 §G.5 voice retained.

> Follow-up: AgentTrust emits NewFeedback events on every settle to the Solana Foundation-endorsed agent registry. The events stream perfectly into a dashboard column. ~30 min adapter on your side, real-time score column on the merchant view. Demo: [link]. Worth surfacing in your dashboard for facilitator operators?

(379 chars)

**What it adds beyond DM 1:** the concrete event-spec (`NewFeedback`), the 30-minute adapter estimate (low friction), the explicit dashboard-column UX framing.

---

## DM 3 — Partnership-proposal (Day 14, 2026-05-08)

**Annotation:** mainnet-Day-16 + co-launch Day-17 framing. The Corbits-side adapter is built by their team (light-integration-by-design per Wave 2 #5 §F.5).

> Demo wrapping. AgentTrust mainnet Day 16; emitting NewFeedback events on every settle. Drafted the Corbits-side adapter spec — your dashboard pulls events via Helius WebSocket subscription, surfaces a per-merchant reputation column. Repo + spec: [link]. Corbits + AgentTrust co-launch on Day 17 if you're game?

(371 chars)

**What it adds beyond DM 2:** the explicit Helius-WebSocket integration path, the joint co-launch ask, the "your team codes the adapter" division-of-labor (lower friction for Corbits).

---

## Send schedule + cadence specific to Corbits

- **Day 6 (2026-04-30) 11:00 IST:** Send DM 1 to `@corbitsdev` (corrected handle).
- **Day 9 (2026-05-03) 11:00 IST:** If no response, send 1 polite bump (single-bump rule).
- **Day 10 (2026-05-04) 11:00 IST:** If green / neutral, send DM 2.
- **Day 14 (2026-05-08) 11:00 IST:** If any positive engagement, send DM 3.
- **Day 17 (2026-05-11):** Submission-day public tweet tags `@corbitsdev` if green response received.

**Engagement-timing rationale:** corbitsdev posted at 20:57 UTC = 4:57pm ET (US-east). 11:00 IST = 20:00 UTC PREV-day, hitting the active window edge. Confirmed in `08-facilitator-outreach-class.md` §A.6.

**Typical response time inferred:** small team; faster response if hook lands. 72h response time plausible. Light-integration-by-design means lower commitment threshold = higher engagement probability.

**Stop-rule:** if Corbits responds "not a fit," log + acknowledge. If no response by Day 12, treat as neutral — Corbits is the lowest-priority of the 5 + a distribution partner regardless. Submission-tweet tag is optional.

---

## Post-response playbook

- **Green response:** offer to write the adapter spec ourselves; ship it as a Corbits-side PR. Push for dashboard column live by Day 17.
- **Yellow response:** acknowledge, send DM 2.
- **Red response:** thank, log, no further outreach.

**Pitch-deck quote target:** "Corbits surfaces AgentTrust reputation events on every facilitator dashboard." If unsigned, fallback: "Corbits-adapter spec drafted in repo; awaiting partner-side ship." Distribution-partner framing means Corbits is a multiplier-of-amplification, not a primary-buyer-quote.

**Cross-facilitator amplification:** Corbits' RT hits operational-x402 audience overlapping Mert's followers (per Wave 2 #5 §F.5). A successful Corbits integration produces a Mert-RT-shaped artifact: "Solana facilitator dashboards now surface Foundation-registry agent reputation in real-time." This is Mert-bias-zone language.

**Hyre downstream potential:** since Hyre is now a Corbits partner, AgentTrust → Corbits → Hyre is a 2-hop integration path. Phase-2 expansion-target consideration: after Day 17, ship Hyre integration as a follow-up.
