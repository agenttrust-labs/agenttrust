# MCPay (`@microchipgnu`) — DM playbook

**Priority:** 3 of 5. **Send Day:** 2026-04-29 (Day 5). **Send-time:** 10:30 IST = 19:30 UTC 2026-04-28. **Source dossier:** `plan/research/08-facilitator-outreach-class.md` §B.3.

---

## Dossier summary (3 paragraphs)

**Founder + product:** MCPay is the open-source x402+MCP middleware ([github.com/microchipgnu/MCPay](https://github.com/microchipgnu/MCPay), docs at [docs.mcpay.tech](https://docs.mcpay.tech)). Founder X handle `@microchipgnu`. Cypherpunk Stablecoin Grand winner per Wave 2 #5 §F.3. Inferred geography: UK / EU / Lisbon based on tweet times (14:00–16:00 UTC bucket). The product is "open-source infrastructure that adds on-chain payments to any MCP server using x402" with revenue-events streaming to dashboards.

**Live-tweet hooks available:** **NONE that ground a product hook.** In 30 days microchipgnu posted only 3 tweets, all personal/aphoristic ([2026-04-25 fingerboards tweet](https://x.com/microchipgnu/status/2048042297221112124), [2026-04-10 retardmaxxing tweet](https://x.com/microchipgnu/status/2042629910825451703), [2026-04-10 markdown-prompting tweet](https://x.com/microchipgnu/status/2042415527893635514)). Founder is in build-head-down mode. **Implication:** DM hook must lean on Cypherpunk Stablecoin Grand history (one-time-dated event) rather than recent tweet. GitHub commits / docs traffic are likely the leading product-news indicator — outside x-recon scope this session.

**Hook to use:** Cypherpunk Stablecoin Grand history + the stablecoin-issuer compliance angle. ValidationRegistry's capability-namespace gating (kyc.tier-2, audit.smart-contract, compliance.payments) maps to MCPay's stablecoin-compliance positioning. **Foundation-orbit warmth: medium** (Cypherpunk = Foundation-organized hackathon, but no recent `@SolanaFndn` interactions). DM expectation: 50% no-response by Day 7 due to founder's thin cadence; lean on follow-up sequence.

---

## DM 1 — Cold-discovery (Day 5, 2026-04-29 10:30 IST)

**Annotation:** anchored on Cypherpunk Stablecoin Grand context (a one-time dated event) since no live-tweet hook available. Asks about KYC-tier capability-namespace as a real-customer-ask vs. hypothetical.

> Hi — Cypherpunk Stablecoin Grand was hard-earned. Question on the next layer: when stablecoin-issuer customers ask "can MCPay verify the agent's KYC tier from a Solana Foundation-aligned attestation registry before settlement?" — is that a real ask or hypothetical? Trying to figure out where the policy seam between MCP middleware + on-chain attestation actually sits. One-liner welcome.

(420 chars)

**What it tests:**
- Whether MCPay's stablecoin-issuer customers are asking about KYC-tier-as-policy-input.
- Whether the on-chain-attestation-registry concept aligns with MCPay's own roadmap or feels orthogonal.
- Whether founder is responsive on X DM at all (low base-rate per his thin cadence).

**Green response signals:** Naming any capability-namespace primitive ("kyc.tier-2", "audit signature", "compliance attestation"); reference to specific issuer customer.

**Red response signals:** "Issuers don't ask that" (missing pain), "MCP spec covers it" (category solved upstream), no response (likely; follow up Day 6 with a different opener).

---

## DM 2 — Warm-pitch (Day 10, 2026-05-04 10:30 IST)

**Annotation:** introduces ValidationRegistry capability-namespace gating + 10 v1 namespaces + names specific attestor candidates (Halborn / OtterSec / Civic). Sent only if DM 1 got green or neutral.

> Follow-up: AgentTrust ships a Foundation-aligned policy primitive + capability-namespace attestation registry (10 v1 namespaces — kyc.tier-2, audit.smart-contract, compliance.payments, etc.). PolicyVault gates on attestations from Halborn/OtterSec/Civic. Drop-in TS module for your MCP-server middleware. Demo: [link]. Mapping to your stablecoin-issuer pipeline?

(408 chars)

**What it adds beyond DM 1:** the concrete primitive (10 v1 capability namespaces), the named attestor candidates (institutional credibility), the explicit MCP-server-middleware integration framing.

---

## DM 3 — Partnership-proposal (Day 14, 2026-05-08)

**Annotation:** mainnet-on-Day-16 + capability-attestation-as-stablecoin-compliance-layer framing. Specific ask: be the first stablecoin-compliance integration in the submission video.

> Demo wrapping; mainnet Day 16. AgentTrust ships @agenttrust/trustgate + capability-attestation registry. Drafted side-by-side patch for MCPay that adds compliance.payments + kyc.tier-2 capability gating before stablecoin settlement. Repo + patch: [link]. MCPay as the first stablecoin-compliance integration in the demo video — open to ship together?

(395 chars)

**What it adds beyond DM 2:** the named-buyer-in-pitch ask, the explicit "stablecoin-compliance integration" framing, the joint-launch implication.

---

## Send schedule + cadence specific to MCPay

- **Day 5 (2026-04-29) 10:30 IST:** Send DM 1 to `@microchipgnu`.
- **Day 6 (2026-04-30) 10:30 IST:** If no response by Day 6 EOD, send a different opener-style bump: "by the way — saw the MCPay docs site refresh; one-liner welcome." (Goal: re-surface in a different way; founder's quiet-on-X pattern means single bump may not work.)
- **Day 10 (2026-05-04) 10:30 IST:** If green / neutral on either, send DM 2.
- **Day 14 (2026-05-08) 10:30 IST:** If any positive engagement, send DM 3.
- **Day 17 (2026-05-11):** Submission-day public tweet tags `@microchipgnu` only if green response received.

**Engagement-timing rationale:** microchipgnu posts 14:00–16:00 UTC (UK/EU afternoon). 10:30 IST = 19:30 UTC PREV-day — outside his peak window but within plausible read time. **Alternative send-time:** 19:00 IST = 13:30 UTC same day, which IS in his peak window. **Mohit-decision:** if 09:30-IST send-window for Dexter+atxp_ai overshoots, defer MCPay to 19:00 IST same day.

**Typical response time inferred:** founder is in build-head-down mode. 5-day response time plausible; 7-day non-response is a strong neutral signal (not a no — just "not seen it yet"). Single bump rule applies but with 2-day stagger (Day 6) instead of typical 48h.

**Stop-rule:** if MCPay responds "not a fit," log + acknowledge. If no response by Day 12, treat as silent-positive: still tag in Day 17 submission tweet (low risk; low-probability of negative reaction).

---

## Post-response playbook

- **Green response:** request permission to quote re: stablecoin-issuer-pain validation. Push for ValidationRegistry capability-namespace integration in their MCP-server middleware.
- **Yellow response:** acknowledge, log, send DM 2.
- **Red response:** thank, log, no further outreach.

**Pitch-deck quote target:** "MCPay validated capability-attestation gating as a real stablecoin-compliance ask from their issuer customers." If unsigned, fallback: "Built against MCPay's MCP-server middleware integration pattern."

**Cypherpunk Stablecoin Grand co-positioning:** if MCPay engages, the Public Goods angle (Lily Liu) gets a credibility multiplier — Cypherpunk-Grand-winner + Foundation-aligned. This is Lily Liu's exact bias zone per Wave 4 #10 §J.5.

**GitHub-stars-as-proxy:** if X DM gets no response, file a low-friction GitHub issue on `microchipgnu/MCPay` asking the same question (e.g., "feature ask: capability-namespace gating before settlement"). GitHub comment is a different surface and may catch the founder's attention better than X DM.
