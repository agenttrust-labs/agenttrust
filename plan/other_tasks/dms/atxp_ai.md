# atxp_ai (Circuit & Chisel) — DM playbook

**Priority:** 2 of 5. **Send Day:** 2026-04-29 (Day 5). **Send-time:** 10:00 IST = 19:00 UTC 2026-04-28. **Source dossier:** `plan/research/08-facilitator-outreach-class.md` §B.2.

---

## Dossier summary (3 paragraphs)

**Founder + product:** atxp_ai is the agent-payment protocol from Circuit & Chisel ($19.2M raised — see [PRNewswire](https://www.prnewswire.com/news-releases/circuit--chisel-secures-19-2-million-and-launches-atxp-a-web-wide-protocol-for-agentic-payments-302562331.html)). Co-founder Louis Amira (`@louisamira`, ex-Stripe first external crypto hire, helped shape Bridge + Privy acquisitions per [`@stabledash` 2026-03-30](https://x.com/stabledash/status/2038747850905989137)). Other co-founder David Romas (`@davidnoelromas`) speaking at Stripe Sessions 2026-04-30 ([source](https://x.com/davidnoelromas/status/2047406051297821149)). Engineer voice: `@_rishinsharma`. SF/Bay Area. The org account `@atxp_ai` posts thinly — most signal flows through founder accounts.

**Live-tweet hooks available:** **Strongest hook is `@_rishinsharma` 7-day-growth tweet 2026-04-22** ([URL](https://x.com/_rishinsharma/status/2047052586532892685)): "44k buyers paying ~$1 each, 120k txns over x402 in last 7 days, more volume than rest of top 10 servers on @x402scan" (92 likes, 22 RT). Second hook: `@solana` BREAKING tweet 2026-04-16 ([URL](https://x.com/solana/status/2044877583167201705)) — atxp_ai moves to x402+MPP, 1M+ tx, 5K users. Third hook: David Romas Stripe Sessions speaker confirm 2026-04-23.

**Hook to use:** `@_rishinsharma` 2026-04-22 7-day-growth tweet — anchored on the 44k-buyer-velocity number which is the most concrete-pain-grounded opener of any of the 5 facilitators. Foundation-orbit warmth is the strongest of the 5: `@solana` directly RT'd them. **DM strategy:** the existing Foundation warmth is leverage AND a defensive consideration — Mohit's DM must surface the SPECIFIC primitive gap that takes Foundation-alignment from branding to enforced policy.

---

## DM 1 — Cold-discovery (Day 5, 2026-04-29 10:00 IST)

**Annotation:** references `@_rishinsharma`'s [2026-04-22 7-day-growth tweet](https://x.com/_rishinsharma/status/2047052586532892685) as scale-pain hook. Sent to `@atxp_ai` org account (founder accounts as fallback if no response).

> Hi — saw the 44k buyers / 120k tx in 7 days number from Rishin's tweet last week. Question at that velocity: when enterprise prospects approach ATXP, does "does the facilitator gate on Solana Foundation's agent registry reputation?" surface in the technical due-diligence, or is the next-10X bottleneck somewhere else? Trying to separate "compliance theater" from real rail-layer asks. Any shape of answer is useful.

(495 chars)

**What it tests:**
- Whether atxp_ai's enterprise prospects are asking about Foundation-registry integration as a TDD line-item.
- Whether the next-10X scale bottleneck is policy-aware OR something orthogonal (rate limits, reliability, etc.).
- Whether atxp_ai's existing Foundation warmth makes the Foundation-alignment language redundant or load-bearing.

**Green response signals:** "Yes, we get that ask" (validates pain), "Compliance teams ask about it" (specific buyer name), "Worth a sync" (warmth).

**Red response signals:** "We don't see that bottleneck" (missing pain), "MPP handles it at the spec layer" (category-already-served), no response (neutral; follow up Day 8).

---

## DM 2 — Warm-pitch (Day 10, 2026-05-04 10:00 IST)

**Annotation:** keeps the scale-pain hook AND adds the $19M-backed-security-review framing. Kani harness is the credibility hook for an engineering-heavy team with institutional security review.

> Following up: AgentTrust ships the Foundation-aligned counterparty-policy primitive — `gate_payment` composer with 5 formally-verified invariants (cargo kani green), drop-in TS module that wraps your existing facilitator endpoint. The third leg the Solana agent registry was missing, productized in 17 days. Demo: [link]. For a $19M-backed team, the formal-verification artifact stands up to security review. Worth a 20-min sync to see if it maps?

(497 chars)

**What it adds beyond DM 1:** the cargo-kani formal-verification proof (engineering-team credibility), the "third leg productized" framing (Foundation-narrative), the 17-day-shipped signal (velocity).

---

## DM 3 — Partnership-proposal (Day 14, 2026-05-08)

**Annotation:** mainnet-on-Day-16 + named-buyer-in-pitch-video framing. Specific ask is "first $19M-backed integration in submission video." This is the per-Wave 2 #5 §G.2 line.

> Demo wrapping; submission Day 17. AgentTrust on mainnet + @agenttrust/trustgate on npm. Drafted a side-by-side patch (~50 LOC) for your facilitator that adds Foundation-aligned counterparty-tier + velocity policy before settlement. ATXP would be the first $19M-backed integration. Repo + patch: [link]. Open to ship together?

(386 chars)

**What it adds beyond DM 2:** the explicit named-buyer-in-pitch ask, the LOC integration estimate, and the joint-launch tweet implied for Day 17.

---

## Send schedule + cadence specific to atxp_ai

- **Day 5 (2026-04-29) 10:00 IST:** Send DM 1 to `@atxp_ai` org account.
- **Day 8 (2026-05-02) 10:00 IST:** If no response, send 1 polite bump to org account; if no response by Day 9 EOD, retry to `@_rishinsharma` direct (engineer voice more receptive).
- **Day 10 (2026-05-04) 10:00 IST:** If green or neutral, send DM 2.
- **Day 14 (2026-05-08) 10:00 IST:** If any positive engagement on DM 2, send DM 3.
- **Day 17 (2026-05-11):** Submission-day public tweet tags `@atxp_ai` if any DM got a green response.

**Engagement-timing rationale:** founder accounts post 16:00–22:00 UTC (US-Pacific business). 10:00 IST = 19:00 UTC prev day, in the active window. Confirmed in `08-facilitator-outreach-class.md` §A.6.

**Typical response time inferred:** founders are at scale + raising-team mode. 72h response time plausible. Engineer accounts (`@_rishinsharma`) likely faster than BD accounts. Stripe-Sessions trip 2026-04-30 might delay BD-side responses by 2-3 days.

**Stripe-Sessions warm-intro path:** David Romas speaks at Stripe Sessions 2026-04-30. If Dan's response surface is closed, a Day-13+ ask "would David be open to a 5-min intro re: AgentTrust during Stripe Sessions — saw he's speaking" is a higher-leverage path than direct DM #2.

---

## Post-response playbook

Per `agenttrust-first-buyer.md`:
- **Green response:** request permission to quote in pitch deck. Critical line: "ATXP at scale validates the counterparty-aware policy gap" or similar. Push for warm-intro to Stripe ecosystem via Romas.
- **Yellow response:** acknowledge, log, send DM 2 as scheduled.
- **Red response:** thank, log, no further outreach.

**Pitch-deck quote target:** the highest-leverage line is "atxp_ai validated the counterparty-aware policy gap as a real ask from their next-10X enterprise prospects." If unsigned, fallback: "Built against atxp_ai's MCP-server middleware integration pattern."

**Foundation-orbit-warmth consideration:** atxp_ai is the strongest existing Foundation relationship of the 5 facilitators. If they integrate, the announcement gets a `@solana` RT — this is the highest-leverage Foundation-amplification path of any single integration.
