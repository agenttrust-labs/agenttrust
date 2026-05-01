# Dexter (`@dexteraisol`) — DM playbook

**Priority:** 1 of 5. **Send Day:** 2026-04-29 (Day 5). **Send-time:** 09:30 IST = 18:30 UTC 2026-04-28 = US-Pacific late afternoon. **Source dossier:** `plan/research/08-facilitator-outreach-class.md` §B.1.

---

## Dossier summary (3 paragraphs, lifted from `08-facilitator-outreach-class.md` §B.1)

**Founder + product:** Dexter is a DAO behind the [dexter.cash/facilitator](https://dexter.cash/facilitator) (program ID `DEXVS3su4dZQWTvvPnLDJLRK1CeeKG6K3QqdzthgAkNV`). v3.0 SDK shipped 2026-04-15 (`npm i @dexterai/x402`). Branch Mathew (`@BranchM`) is the senior-engineer voice; `@dexteraisol` is the org account. US-Pacific business cycles. They run a weekly "x402sday" stream every Tuesday 2pm ET. They are aggressive shippers — 29 tweets/RTs in last 30 days, including v3.0 SDK launch, BSC-chain x402 ship (2026-04-08), x402gle search-engine + analytics product (2026-04-18), Anthropic-claude-code x402-leak claim (2026-04-01), and the **DAuth "trust infrastructure" launch (2026-04-01)** — a competitive-overlap signal AgentTrust must navigate carefully.

**Live-tweet hooks available:** Most engagement-driving tweets last 30 days are: BSC-chain ship 2026-04-08 (68 likes, 29 RT), x402gle sneak-peek 2026-04-18 (75 likes, 24 RT), v3.0 SDK launch 2026-04-15 (67 likes, 32 RT). Smart-wallet support (Squads / Crossmint / SWIG) launched 2026-03-01 ([URL](https://x.com/dexteraisol/status/2028105171549470782)) — outside 30d window but the most architecturally-relevant historic tweet for AgentTrust framing.

**Hook to use:** the DAuth launch on 2026-04-01 ([URL](https://x.com/dexteraisol/status/2039460592415887663)). Dexter publicly claimed the "trust infrastructure" surface area but built a SaaS product, not an on-chain primitive that reads Foundation-endorsed identity. Mohit's DM positions AgentTrust as the on-chain primitive DAuth would CONSUME (per spec, identity-source layer is composable). This avoids the competitive-overlap framing while still using the most-recent product moment as opener. **Foundation-orbit warmth: low** (no `@SolanaFndn` RT in 30d) — DM treats Foundation-alignment as an angle Dexter doesn't currently lean on, presenting it as a leverage opportunity for their enterprise-volume pursuit.

---

## DM 1 — Cold-discovery (Day 5, 2026-04-29 09:30 IST)

**Annotation:** references their [2026-04-01 DAuth-announce tweet](https://x.com/dexteraisol/status/2039460592415887663) AND the smart-wallet launch [2026-03-01 tweet](https://x.com/dexteraisol/status/2028105171549470782). The DM frame: AgentTrust is the on-chain primitive that DAuth (Dexter's own product) would naturally consume. NOT positioned as competitor.

> Hey — saw DAuth ship; the trust-infra framing makes sense for the autonomous-economy thesis. Question on the seam: when DAuth ends, who owns the Foundation-endorsed-on-chain reputation read? I.e., when your enterprise integrators ask "does the facilitator gate on Solana Foundation's agent registry tier?" — is the answer DAuth's job or somebody-else's-CPI? Trying to separate signal from noise on what regulated-volume customers actually ask. One-liner is plenty.

(490 chars — within X DM 500-char limit)

**What it tests:**
- Whether Dexter sees Foundation-endorsed reputation as a product feature THEY would own (DAuth scope) vs. a CPI dependency they'd consume.
- Whether enterprise-volume customers ARE asking about Foundation-registry integration.
- Whether there's a partnership seam (DAuth + AgentTrust as composed flow) vs. a competitive seam.

**Green response signals:** "We've been thinking about that" (interest), "We'd consume that as a CPI" (architecture validation), "Where can I see the primitive" (warmth).

**Red response signals:** "DAuth handles all of it" (defensive — must NOT escalate), "Foundation-registry hasn't surfaced as an ask" (missing-pain signal), no response (neutral; follow up Day 7).

---

## DM 2 — Warm-pitch (Day 10, 2026-05-04 09:30 IST)

**Annotation:** references the same DAuth + smart-wallet hooks. Adds the Kani-harness mainnet-soon artifact. Sent only if DM 1 got a green or neutral response.

> Quick follow-up: shipping AgentTrust this Sunday — Foundation-aligned counterparty-policy primitive that calls into the Solana agent registry via CPI. 5 Kani-proven invariants on `gate_payment` (cargo kani green checks). Drop-in TS module for x402 facilitators — ~10 LOC patch into your `x402Middleware`. Pre-flight gate sits naturally next to DAuth's identity layer. Demo: [link]. Worth a 20-min sync next week?

(486 chars)

**What it adds beyond DM 1:** the formal-verification artifact (cargo kani 5-green), the concrete LOC integration estimate, the architectural framing of "next to DAuth, not replacing." Demo link is a Loom or a deployed devnet endpoint per Wave 2 #5 §F.1.

---

## DM 3 — Partnership-proposal (Day 14, 2026-05-08)

**Annotation:** references mainnet-deploy artifacts + the named-buyer-in-pitch-video pattern. Sent only if DM 1 OR DM 2 got a green response.

> Wrapping the demo: AgentTrust ships @agenttrust/trustgate on npm + Anchor programs deployed mainnet Day 16 (May 7). Drafted a 10-LOC patch for your `x402Middleware` to add Foundation-aligned counterparty gating side-by-side with DAuth. Repo + patch: [link]. Pitch video Day 17 mentions Dexter as first-integration if you're game. Open to ship together?

(388 chars)

**What it adds beyond DM 2:** the named-buyer-in-pitch frame (a Matty-Taylor-shaped accelerator signal), the explicit 10-LOC patch (low-friction ask), the joint-launch-tweet implied-mutual-amplification.

---

## Send schedule + cadence specific to Dexter

- **Day 5 (2026-04-29) 09:30 IST:** Send DM 1.
- **Day 7 (2026-05-01) 09:30 IST:** If no response, send 1 polite bump: "bumping in case this got buried — no rush." (one bump max)
- **Day 10 (2026-05-04) 09:30 IST:** If green or neutral on DM 1, send DM 2.
- **Day 14 (2026-05-08) 09:30 IST:** If any positive engagement on DM 2, send DM 3.
- **Day 17 (2026-05-11):** Submission-day public tweet tags `@dexteraisol` if any DM got a green response; otherwise tag is omitted to avoid over-eager framing.

**Engagement-timing rationale:** Dexter posts 18:00–22:00 UTC. 09:30 IST = 18:30 UTC PREV-day, catching their late-evening / morning catch-up. Confirmed in `08-facilitator-outreach-class.md` §A.6.

**Typical response time inferred:** Branch Mathew engages on Dexter posts within hours. Org account replies plausibly within 48h IF the DM hook lands. Single-bump rule applies.

**Stop-rule:** if Dexter responds "not a fit," log + acknowledge politely, no further outreach during Frontier window. If they respond positively but without specifics, treat as green; advance to DM 2.

---

## Post-response playbook

Per `agenttrust-first-buyer.md` §"Outreach pattern":
- **Green response:** request permission to quote in pitch deck. Offer 20-min sync. Move to integration-pair-program by Day 13.
- **Yellow response:** acknowledge, log, send DM 2 as scheduled but soften ask.
- **Red response:** thank, log in `dm-response-log.md`, no further outreach.

**Pitch-deck quote target:** if Dexter responds positively, push for one quotable line in the pitch video Day 17. Per `THESIS_LOCK` Day-12 pitch-line backup: "Dexter integrated us in 3 days." If unsigned but engaged, fallback line: "Built against Dexter's v3 SDK with a 10-LOC integration patch."
