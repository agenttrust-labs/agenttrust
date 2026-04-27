# AgentTrust Reframe Decision Document

**Single question:** Is reframed AgentTrust meaningfully distinct from AgentSafe Hooks?

**Decision rule:** All three criteria below must be met for "distinct." Any single failure → "converges." If genuinely ambiguous → flag explicitly. Per Day-4 mission brief: do not soften the answer to give Mohit two options if only one is real.

**Inputs:**
- `research/06-competitive-intel/agent-registry-cpi-surface.md` (Phase 1)
- `research/00-thesis/agenttrust-reframe-draft.md` (Phase 2)
- `research/00-thesis/AgentSafe-SHARPENED.md` (Day-3 reference)
- `research/00-thesis/agentsafe-moat-analysis.md`, `agentsafe-first-buyer.md`, `agentsafe-pitch-compression.md`, `research/06-competitive-intel/agentsafe-competitive-deep-scan.md` (Day-3 supporting analysis)

**Author position before writing this:** I expected CONVERGES going in (because the Q1 finding compressed AgentTrust to two components that overlap heavily with AgentSafe Hooks' wedge). The Phase-1 CPI study and the reverse-mapping problem documented below changed my expected answer mid-analysis.

Last verified: 2026-04-27

---

## Criterion (a) — Different architectural layer

**Claim under test:** Agent-layer policy that references identity + reputation as inputs is genuinely a different architectural layer from asset-layer Token-2022 transfer hooks.

### Evidence in favor of "different layer"

- **Different primary key for policy lookup:**
  - AgentSafe Hooks: policy is keyed on `(mint)`. Per-mint configuration. Velocity counter PDA at `(mint, owner)`.
  - PolicyVault: policy is keyed on `(payer_agent_asset, policy_id)`. Per-agent-relationship configuration. Velocity counter PDA at `(payer_agent_asset)`.
- **Different fire-time:**
  - AgentSafe Hooks: fires inside Token-2022's CPI pipeline at *transfer execution time*. Cannot block construction of the tx.
  - PolicyVault: called by the facilitator pre-flight, before the tx is even constructed. Returns `Allow / Deny / RequireValidation`.
- **Different observability:**
  - AgentSafe Hooks: knows the (mint, source_account, dest_account, amount, signers). Does not know "which agent" without inferring from signer.
  - PolicyVault: knows the (payer_agent_asset, payee_agent_asset, amount, mint). Agent identity is the request context.

### The reverse-mapping problem (load-bearing)

The 8004-Solana program stores agent → wallet via `AgentAccount.agent_wallet: Option<Pubkey>`. There is **no public PDA at `["wallet_to_agent", wallet]`**. So a Token-2022 transfer hook handed `(source, dest, amount)` cannot cheaply derive "which agent does this transfer represent." To bridge the gap, AgentSafe Hooks v1.1 would have to:

1. Force agents to register a reverse-mapping PDA → architectural addition + adoption coordination problem
2. Require facilitators to pass identity hints inline as remaining_accounts → collapses the integration story onto the facilitator (which IS PolicyVault's model)
3. Accept the limitation → reputation-aware policy never lands at asset layer

Asset-layer hooks therefore cannot gate on agent reputation cheaply or generically. PolicyVault sits at a structurally different layer where this gating is natural.

### Counter-arguments considered

- *"You could add an `identity-gate` hook to AgentSafe (Day-3 module #5) that requires a registry signature."* — true for static identity attestation (e.g., "signer must be a registered agent"). NOT true for reputation-tier gating because trust_tier is dynamic state, not a signature, and reading AtomStats requires the agent identity (chicken-and-egg).
- *"PolicyVault could be a TypeScript pre-flight helper, not an Anchor program."* — partially fair. ~50% of PolicyVault's surface (read AtomStats, decide allow/deny) could be TS. But the TS approach loses (i) on-chain composability for downstream programs that want to CPI a gate check, (ii) atomic gate+transfer+feedback in a single tx, (iii) the public-goods narrative that judging panels reward, and (iv) audit-traceable policy state in PDAs.

### Verdict on (a): **PASSES.**

The two are at structurally different architectural layers. Asset-layer (mint-scoped) and agent-layer (relationship-scoped) are both real layers, both useful, neither subsumes the other.

---

## Criterion (b) — Different primary buyer OR different value prop to same buyer

**Claim under test:** The same x402 facilitator (Dexter, the Day-3 first-buyer pick) would adopt both AgentSafe Hooks AND reframed AgentTrust if they are distinct, vs adopt only one if they are substitutes.

### Same primary buyer

Both theses have the same first buyer per Day-3 lock + Phase-2 draft: **x402 facilitators (Dexter first)**. So criterion (b) reduces to *"different value prop to the same buyer."*

### Mapping each thesis to the facilitator's actual pain

A regulated-volume-seeking x402 facilitator has **two** distinct gating problems:

1. **Pre-flight problem:** "Should this payment even be attempted? The agent counterparty looks suspicious — block it now and save the round-trip + on-chain footprint." → Solved by PolicyVault. Zero on-chain cost when denied.
2. **Last-line-of-defense problem:** "Even if my pre-flight check passed (or was bypassed by an integrator skipping the facilitator), I need the mint itself to enforce velocity / kill-switch / jurisdictional gates so a regulated enterprise can confidently issue stablecoins on top of it." → Solved by AgentSafe Hooks. Mint enforces regardless of facilitator behavior.

A regulated-enterprise-aware facilitator wants BOTH. They are stackable defense-in-depth, not substitutes.

### Concrete adoption scenario (Dexter / Stripe-equivalent regulated-enterprise integration)

- Dexter onboards Mastercard as a regulated counterparty for x402 stablecoin payments.
- Mastercard's compliance team requires:
  - Asset-layer enforcement of velocity caps regardless of which wallet/facilitator/signer initiates a transfer (kill-switch authority must be a regulated multisig). → **AgentSafe Hooks satisfies.**
  - Pre-flight refusal to even attempt payments to agents below trust tier 2, plus auto-feedback after each settlement to track reputation drift. → **AgentTrust / PolicyVault + TrustGate satisfies.**
- Dexter integrates both. AgentSafe Hooks is on the mint Mastercard issues; PolicyVault is in the facilitator's request handler. Total integration time: AgentSafe ~1 week, AgentTrust ~1 week. Total ongoing cost: minimal — both are open-source primitives + thin hosted product layers.

### Counter-argument: pricing collapse

If both are open-source primitives at ~zero recurring cost, does the "same buyer adopts both" claim translate to "same buyer pays for both"? In practice — yes, because the *hosted product layers* (AgentSafe Hooks policy registry + AgentTrust facilitator dashboard + ValidationRegistry attestation marketplace) are how the venture revenue lands, and those are independently priced. A facilitator integrating AgentSafe Hooks would pay for the policy-registry SaaS + monitoring; integrating AgentTrust adds a separate dashboard + ValidationRegistry SaaS subscription.

### Verdict on (b): **PASSES.**

Same buyer (x402 facilitators), but two distinct value props (pre-flight gating + reputation accumulation vs asset-layer enforcement). They stack as defense-in-depth and are independently revenue-bearing. A regulated-enterprise-aware facilitator adopts both.

---

## Criterion (c) — Different structural defensibility

**Claim under test:** AgentTrust-reframe's structural moat is something AgentSafe Hooks v1.1 cannot easily replicate.

### Three independent structural moats for AgentTrust-reframe

**Moat 1 — Reverse-mapping advantage (already developed under criterion a).** PolicyVault's per-agent-tuple primary key gives it natural access to identity + reputation reads that asset-layer hooks structurally lack. AgentSafe Hooks v1.1 cannot trivially add reputation-aware gating without one of the architectural compromises listed under (a). This is a real structural barrier, not a feature gap.

**Moat 2 — Programmatic feedback emission via PDA-signed CPI.** TrustGate's `give_feedback`-after-settlement mechanism requires being a *signer* in the feedback transaction. Asset-layer hooks fire as CPI'd validators without natural signer authority — they validate a transfer, they don't author follow-up feedback. To replicate, AgentSafe Hooks v1.1 would have to add a separate "feedback emitter" off-chain or a hot-wallet-signer in the facilitator middleware, both of which collapse the integration story onto the facilitator (which IS AgentTrust's design point).

**Moat 3 — ValidationRegistry as a Foundation-aligned third leg.** Quantu shipped Validation Registry in v0.1.0 and archived it in v0.5.0 with the explicit "planned for future upgrade" label. Mohit shipping a productized Validation Registry implements the third ERC-8004 leg the Foundation page already references. This is **a genuinely empty Foundation-ordained niche** that AgentSafe Hooks structurally cannot occupy (asset-layer hooks have no natural attestation-author surface — attestations are out-of-band capability claims, not transfer-time invariants).

### Counter-argument: Foundation/Quantu dependency-risk

AgentTrust-reframe's defensibility depends on Quantu / 8004-Solana / ATOM Engine continuing to be the canonical identity + reputation primitive on Solana. If Quantu is acquired and absorbed into SDP, or if a competing identity standard (e.g., Foundation rolls its own non-ERC-8004 standard) wins, AgentTrust-reframe loses one foundation it built on.

This is a real risk that AgentSafe Hooks does not carry. AgentSafe Hooks is a pure Token-2022 hook library — its dependencies (Token-2022, Anchor, Kani) are all canonical Solana primitives without category-leader risk.

### Mitigations against dependency-risk

- **MIT license on 8004-Solana means even if Quantu pivots, the program continues running on mainnet.** ATOM Engine is the same. Mohit's PolicyVault would continue to function regardless of Quantu's company status.
- **Foundation-published page (`solana.com/agent-registry`) ties the standard to the Foundation, not to Quantu corp specifically.** A pivot away would require Foundation explicitly rejecting the standard, which is unlikely given they currently endorse it.
- **PolicyVault could fall back to a "no-attestation" mode** if the registry becomes unavailable, degrading gracefully to velocity-only policy. This would lose the differentiation but not crash the integration.

### Verdict on (c): **PASSES, with caveat.**

Three independent structural moats. AgentSafe Hooks v1.1 cannot trivially replicate any of them. But AgentTrust-reframe inherits a Foundation/Quantu dependency-risk that AgentSafe Hooks does not carry. The risk is mitigatable via MIT-license-survivability and graceful-degradation, but it is real and should be acknowledged in the SHARPENED spec.

---

## Decision

### **OUTCOME 1: DISTINCT.**

Reframed AgentTrust passes all three criteria. The two theses are stackable defense-in-depth, not substitutes. Mohit can credibly carry both forward into Day-5 lock as genuinely distinct sharpened specs.

### Two material caveats Mohit must hold while reading the eventual SHARPENED specs

1. **The "buyer adopts both" framing is critical.** If Mohit pitches AgentTrust as a wholesale replacement for AgentSafe Hooks (or vice versa), the convergence will become real in the pitch even though it isn't real in the architecture. The Day-5 lock decision is between two stackable primitives, not two competing product directions.
2. **AgentTrust-reframe inherits dependency-risk that AgentSafe Hooks does not.** The mitigations listed under (c) are real but not free. If Mohit is risk-averse on Foundation/Quantu trajectory, that should weigh toward AgentSafe Hooks; if Mohit values Foundation-narrative alignment more than dependency-independence, that should weigh toward AgentTrust-reframe.

### What this DOES NOT mean

- This is not a recommendation to lock AgentTrust over AgentSafe Hooks. The lock decision is Mohit's Day-5 call. This file only certifies that *both options are genuinely viable* — not that AgentTrust is the better option.
- This is not permission to skip the Day-4 sharpening for AgentTrust. The reframed spec is a DRAFT — it has not been moat-analyzed, first-buyer-picked (beyond inheriting Day-3's lock), pitch-compressed, or buildability-gated. The full Day-4 refinement (Q2-Q4 + buildability + validation-without-DMs + SHARPENED) is what Mohit decides whether to authorize next.
- This is not a license to ship both. Per Rules §7 (one project per submission per Day-3 research), Mohit submits ONE thesis. The lock is Day-5.

### Direction Mohit should authorize next (recommendation)

**Authorize the full Day-4 refinement of AgentTrust-reframe (Q2-Q4 + buildability + validation-without-DMs + SHARPENED), with the explicit constraint that the sharpened spec must:**

1. Treat AgentSafe Hooks as a stackable defense-in-depth complement, not a substitute. Pitch language must support "both" not "instead of."
2. Surface the Foundation/Quantu dependency-risk as an open risk in the decision log, with the MIT-license-survivability mitigation cited.
3. Include the ValidationRegistry component scope-cut decision explicitly (full v1 vs PolicyVault + TrustGate only).
4. Mirror the AgentSafe-SHARPENED.md structure so Day-5 side-by-side comparison is fair.

If Mohit authorizes only one outcome path (e.g., "no, stop, lock AgentSafe Hooks"), this decision document becomes the single record of the Day-4 reframe attempt and the Day-5 lock proceeds with the Day-3 single-source-of-truth.

---

## What this means for Mohit's submission

- **DISTINCT.** The reframed AgentTrust is at a structurally different architectural layer than AgentSafe Hooks, has a different value prop to the same buyer (pre-flight + reputation-loop vs asset-layer-enforcement), and has three independent structural moats AgentSafe Hooks v1.1 cannot trivially replicate.
- **The Day-5 lock decision is between two stackable, complementary primitives** — not two competing product visions. Mohit's lock is about which primitive he wants to BUILD FIRST in 17 days, knowing that the other could be a Day-30+ companion product or partnership target.
- **AgentTrust-reframe carries Foundation/Quantu dependency-risk** that AgentSafe Hooks does not. Mitigatable but real. This is the single decision factor Mohit should weight heaviest.
- **The Validation Registry is the most distinctive piece of AgentTrust-reframe.** Even if AgentTrust-reframe is not locked, the Validation Registry idea may be a worthwhile Day-30+ Public-Goods companion to whichever thesis Mohit locks. Worth flagging in either SESSION_HANDOFF or the locked spec's "future work" section.
- **Recommended next step (pending Mohit's authorization):** full Day-4 refinement of AgentTrust-reframe through Q2-Q4 + buildability + validation-without-DMs + AgentTrust-SHARPENED.md. Estimated time: 4-6 hours. Then Mohit Day-5 morning reads BOTH SHARPENED specs and locks. Per the original Day-4 mission brief, the comparison is Mohit's job, not Claude Code's.
- **STOP here per the Phase-3 instruction. Do not auto-continue to full refinement. Await explicit authorization.**
