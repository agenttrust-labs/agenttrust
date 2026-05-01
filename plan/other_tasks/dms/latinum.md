# Latinum — DM playbook

**Priority:** 4 of 5. **Send Day:** 2026-05-01 (Day 7). **Channel:** primarily email / website contact-form (X handle uncertain). **Source dossier:** `plan/research/08-facilitator-outreach-class.md` §B.4.

---

## Dossier summary (3 paragraphs)

**Org + product:** Latinum is the agent-payment middleware behind [latinum.ai](https://latinum.ai/), self-positioned as "Frontier Mathematics Research Lab." Breakout AI Grand winner ([solanafloor](https://solanafloor.com/news/meet-solana-s-next-potential-billion-dollar-unicorns-winners-of-breakout-hackathon-announced)). MCP-compatible wallet + middleware. Founder identity not surfaced via this scrape — `@latinum_ai` returns 0 tweets; their X presence is opaque or uses an alternate handle. Geographic location unknown.

**Live-tweet hooks available:** **NONE.** Search 2 of `latinum agent payment since:2026-02-26` returned 30 tweets but ZERO Latinum-team content (mostly forex / off-topic / Cardano). Confirmed: Latinum is not an active X-presence facilitator at this time. Implication: Day-7 outreach defers from X DM to website / email channel.

**Hook to use:** Cybernetic-positioning-on-Mathematical-Rigor + Foundation-alignment via Breakout AI Grand. Wave 2 #5 §G.4 cold-DM template stands as written. Anchor: Mohit's 5-invariant Kani harness on `gate_payment` is the mathematical-rigor primitive that aligns with their "Frontier Mathematics Research Lab" framing — co-positioning surface. **Foundation-orbit warmth: medium** (Breakout Grand = Foundation hackathon track). **Email-channel discipline:** different format, longer body, professional tone. Allow 7-10 day response window.

---

## Outreach format A — Email / contact-form (Day 7, 2026-05-01)

**Annotation:** since X handle is unverified, primary channel is email or [latinum.ai](https://latinum.ai/) contact-form. Body anchors on Wave 2 #5 §G.4 voice but extended for email format (300-400 words). Sent 09:00 IST 2026-05-01.

```
Subject: AgentTrust × Latinum — Foundation-aligned counterparty policy primitive (discovery)

Hi Latinum team,

Solo engineer shipping AgentTrust this week (submission Solana Frontier 2026, May 11): a Foundation-aligned counterparty-aware policy primitive for x402 facilitators on Solana. PolicyVault reads the Solana Foundation-endorsed Agent Registry to gate payments by counterparty tier + capability attestation, with a 5-invariant formal-verification harness on the gate_payment composer (cargo kani green checks).

Reaching out specifically because of the Latinum positioning as Frontier Mathematics Research Lab. The 5-invariant Kani proofs on PolicyVault's gate_payment instruction (paused-implies-no-allow, velocity-monotonicity, etc.) are exactly the mathematical-rigor co-positioning surface that aligns with what your team has built.

One specific question for the pitch deck: when your middleware customers ask whether agent-side policy enforcement can be Foundation-aligned (i.e., read on-chain from the Solana agent registry as policy input), is that a real customer ask or a hypothetical? Trying to figure out where the rail-vs-middleware seam sits in production.

Even a one-line response would help calibrate the pitch. Happy to share:
- Repo (public May 6): github.com/[mohit]/agenttrust
- Mainnet Anchor program IDs (live May 7)
- Cargo Kani 5-green output as artifact

Time-respectful — discovery framing only. Not selling.

Thanks for any signal,
Mohit (solo engineer, Bangalore IN)
LinkedIn: [URL]
X: @0xMohit17 [or working handle]
```

**What it tests:**
- Whether Latinum's middleware-customer feedback includes Foundation-aligned-policy as a real ask.
- Whether the mathematical-rigor + Kani co-positioning resonates with their "Mathematics Research Lab" framing.
- Whether email-channel response rates are higher than X-DM for this org.

---

## Outreach format B — X DM (if handle verified by Day 7)

**Fallback:** if `@LatinumAI` or `@latinum_io` is verified as active by Day 7 morning, send Wave 2 #5 §G.4 unmodified as the DM. The cold-discovery DM body:

> Hey — Breakout Grand was deserved; the Mathematics Research Lab framing is rare in this space. Question: when your middleware customers ask whether agent-side policy enforcement can be Foundation-aligned (i.e., read on-chain from the Solana agent registry), is that a real customer ask or a hypothetical? Trying to figure out where the rail-vs-middleware seam sits. One-liner welcome.

(409 chars)

---

## DM 2 — Warm-pitch (Day 12, 2026-05-06)

**Annotation:** sent only if email or X DM 1 got green/neutral. Anchor on cargo-kani artifact + the mathematical-rigor co-positioning angle.

> Follow-up: AgentTrust ships Foundation-aligned counterparty policy primitive — `gate_payment` composer has 5 formally-verified invariants (cargo kani, mathematical proofs of properties like paused-implies-no-allow). Drop-in TS module for your middleware. The mathematical-rigor co-positioning surface is genuine — your customers + my customers benefit. Demo: [link].

(420 chars)

---

## DM 3 — Partnership-proposal (Day 15, 2026-05-09)

**Annotation:** later than the priority-1-3 facilitators because Latinum's expected 7-10 day response window. Specific ask: latinum-integration work-in-progress signal in submission video deck.

> Demo wrapping; submission Day 17. AgentTrust ships @agenttrust/trustgate on npm + 5 Kani-proven invariants in repo. Drafted side-by-side patch (~80 LOC) for Latinum. The mathematical-rigor co-positioning surface is genuine — your customers + my customers benefit. Repo + patch + sample mainnet tx: [link]. Open to ship together by Day 17?

(382 chars)

---

## Send schedule + cadence specific to Latinum

- **Day 7 (2026-05-01) 09:00 IST:** Send email via website contact-form. Simultaneously DM `@LatinumAI` / `@latinum_io` / `@latinumlabs` IF any of those handles verifies by Day 7 morning (Mohit verifies via website "Twitter" link).
- **Day 9 (2026-05-03):** If no response, send 1 polite email follow-up (1 line: "bumping in case this got buried").
- **Day 12 (2026-05-06):** If green or neutral on initial outreach, send DM 2 (or email equivalent).
- **Day 15 (2026-05-09):** If any positive engagement on DM 2, send DM 3.
- **Day 17 (2026-05-11):** Submission-day tag IF positive engagement; otherwise mention "Latinum integration work in progress" in deck without tagging.

**Engagement-timing rationale:** unknown without active X timeline. Email is timezone-agnostic. **For X-fallback path, default to 10:30 IST send-time.**

**Typical response time inferred:** 7-10 day window expected per Wave 2 #5 §F.4. Email channel may be faster than X due to dedicated team email-monitoring vs. founder-X-cadence variance.

**Stop-rule:** if Latinum responds "not a fit," log. If no response by Day 14, treat as silent-no for submission-tweet purposes; still mention "Latinum integration WIP" in pitch deck if the email landed and read receipts confirm.

---

## Post-response playbook

- **Green response:** request quote re: middleware-customer Foundation-policy ask. Push for ValidationRegistry attestation column in their MCP-wallet UX.
- **Yellow response:** acknowledge, send DM 2.
- **Red response:** thank, log, no further outreach. Pitch deck mentions "Latinum evaluated; pursued separate path."

**Pitch-deck quote target:** "Latinum middleware customers validate Foundation-policy as a real ask." If unsigned, fallback: "Latinum integration work-in-progress" (acceptable per Wave 2 #5 §F.4 because Latinum's 7-10 day response window may extend past Day 17).

**Mathematical-rigor co-positioning artifact:** the cargo kani 5-green output is the highest-leverage artifact for Latinum specifically. Standalone tweet on Day 14 with the kani output + tag of `@LatinumAI` (if verified) or just the artifact unauthored = a higher-probability engagement vector than the cold-DM approach for an X-quiet team.
