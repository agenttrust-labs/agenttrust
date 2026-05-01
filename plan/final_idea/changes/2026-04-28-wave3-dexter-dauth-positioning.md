# 2026-04-28 — Revision 10: Dexter DAuth positioning shift

**Status:** Locked. Apply on Day 5 to the Dexter DM and pitch deck.
**Source:** Wave 3 #8 (`plan/research/08-facilitator-outreach-class.md`) — live x-recon of `@dexteraisol` last 30 days.

---

## The finding

Dexter launched **DAuth** on 2026-04-01 ([tweet URL](https://x.com/dexteraisol/status/2039460592415887663)). DAuth claims "trust infrastructure" surface — overlapping language with AgentTrust's positioning. Wave 2 #5 (TrustGate playbook, written before this x-recon) treated Dexter as an unmodified facilitator buyer; that DM frame is now wrong.

## Why this matters

Per `agenttrust-first-buyer.md`, Dexter is **Priority 1** for the Day-5 cold-discovery DM. If Dexter receives a DM that frames AgentTrust as a competitor to DAuth, they will either ignore or push back. The DM must position AgentTrust as the **on-chain primitive that DAuth CONSUMES** — Dexter remains the facilitator + trust-infrastructure brand; AgentTrust is the underlying open-source primitive their trust-infrastructure rests on.

## DM frame correction

**Old frame (Wave 2 #5 generic):** *"AgentTrust ships counterparty-aware policy gating. Dexter is the natural first integrator."*

**New frame (post-x-recon):** *"Saw your DAuth launch Apr 1. AgentTrust is the on-chain primitive that DAuth-style trust-infrastructure surfaces consume. Foundation-aligned (reads Quantu's endorsed Agent Registry), MIT-licensed, 17-day solo build. Could DAuth consume our gate_payment instruction as the on-chain enforcement layer behind your trust API?"*

Specific phrasing in the Day-5 Dexter DM lives at `plan/other_tasks/dms/dexter.md`.

## Pitch deck implication

Pitch deck slide 7 ("Named first buyer") should NOT lead with "Dexter integrated us" if Dexter doesn't engage by Day 12. Acceptable fallback phrasings, ranked:
1. *"Built against Dexter's v3 SDK; DAuth-compatible primitive"* (if Dexter responds positively but no integration in 12 days)
2. *"Built against Dexter's v3 SDK"* (if no response)
3. *"Built against the canonical Solana x402 facilitator surface"* (worst case — generic facilitator language)

## Risk surface

If Dexter perceives AgentTrust as a DAuth competitor and publicly disagrees, the pitch's first-buyer narrative weakens. Mitigation:
- Day-5 DM uses the corrected frame above
- Public engagement on @dexteraisol's tweets through Day 17 reinforces the COMPLEMENTARY framing
- If Dexter pushes back: pivot first-buyer pitch to atxp_ai (Priority 2 — warmest Foundation-orbit per Wave 3 #8)

## No v1_scope.md edit needed

This is a positioning + outreach revision, not a scope revision. The locked thesis (Foundation-aligned, x402 facilitators as first buyer) survives unchanged. Only the Dexter-specific DM language and the deck's slide-7 contingency planning change.
