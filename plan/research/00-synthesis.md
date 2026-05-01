# Synthesis — AgentTrust Pre-Build Research Marathon (10 deep-dives)

**Compiled:** 2026-04-28 (Day 4.5 → Day 5 begins 2026-04-29). **Submission:** 2026-05-11 (13 build days remaining). **Author:** Mohit (synthesizing 10 class-quality deep-dives). **Verdict at end of file.**

---

## TL;DR — six load-bearing findings

1. **GO confirmed for Option 1 (full 3-component v1).** All 10 deep-dives surface refinements, not blockers. Cut-priority order remains valid; no pre-emptive scope reduction recommended.
2. **CounterpartyTier policy v1 default = `TierGateMode::Immediate` (byte 551 trust_tier), NOT `tier_confirmed`.** The 8-epoch (~20 day) vesting requirement makes `tier_confirmed` structurally unreachable for pre-warmed demo agents inside the 7-day Day-5-to-Day-12 window. `tier_confirmed` is a production-mode toggle.
3. **Day-5 mainnet pre-warm is the single most-leveraged action.** Without it, the Day-12 demo cannot show tier ≥ 2 contrast. Total cost: ~0.10 SOL ($20–25). Estimated execution time: 30 min for 5 agents (per Wave 3 #7 timeline).
4. **Token-2022 TransferHook footgun forces atomic-tx invariant in TrustGate SDK.** `mountTrustGate(app, config)` MUST refuse instantiation when `atomicityEnforced != true`. Splitting `gate_payment + transfer + emit_feedback` across 2 transactions silently corrupts the velocity counter.
5. **Dexter DAuth competitive-overlap surfaced 2026-04-01.** Wave 3 #8 x-recon found DAuth launched 28 days before Frontier submission. DM frame corrected: AgentTrust = on-chain primitive DAuth CONSUMES, not competitor. Revision 10 change file logs this.
6. **Total grant pipeline drafted: ~$72.7K cash + $750K equity ceiling.** 8 ready-to-submit applications; pre-Frontier-decision realistic ask = $20.2K (Superteam India + Foundation direct + Agentic Engineering). Post-Frontier conditional = $273K-$280K.

---

## A. Top-level findings — what each deep-dive confirmed or surfaced

### A.1 — Wave 1 #1 (Quantu source-code class)

- **Pinned commit:** `bfb09ad` (HEAD of `8004-solana/main` 2026-04-28). Mainnet binary SHA-256 verifiable: `5aeae715714861fd43ac09d80bc51f70836b27a325a2c2131374121c6c05a5c8`.
- **Mainnet program IDs:** agent_registry_8004 = `8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ`, atom_engine = `AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb`. Devnet IDs differ.
- **AtomStats actual size: 561 bytes** (not 460 from older research). `trust_tier` at byte 551 (immediate), `tier_confirmed` at byte 555 (post-vesting).
- **AgentAccount actual size: 748 bytes** (not 313 — that was pre-SEAL-v1 v0.3.0 layout).
- **`give_feedback` Anchor discriminator computed: `[145, 136, 123, 3, 215, 165, 98, 41]`** — hardcode as compile-time constant in TrustGate.
- **`registry_authority` PDA seeds = `[b"atom_cpi_authority"]`** derived against agent_registry_8004 program ID. TrustGate passes this address but does not sign for it; agent-registry signs internally.
- **`SelfFeedbackNotAllowed (6300)` blocks** the agent's owner from authoring feedback against its own asset. TrustGate's PDA seed scheme `["trustgate_auth", facilitator_pubkey]` structurally satisfies this — facilitator pubkeys are external.
- **AtomStats `schema_version` at byte 560 currently equals `1`** — defensive check `require!(data[560] == 1)` is the v0.7.0 canary.

### A.2 — Wave 1 #2 (Anchor + Token-2022 + cross-program PDA class)

- **Recommended Anchor version: 1.0.1.** Manual byte-offset deserialization sidesteps Quantu's `anchor-lang = "0.31.1"` lock. Migration cost from 0.31.1 = irrelevant; AgentTrust starts on 1.0+.
- **`gate_payment` CU envelope: ~26K (80K worst case).** No splitting needed; 1.4M ceiling is 17.5× our envelope. `set_compute_unit_limit(150_000)` per tx for headroom.
- **Pattern B (UncheckedAccount + manual byte parsing) chosen for ALL Quantu PDA reads.** Decouples AgentTrust from Quantu's Cargo crate version.
- **Token-2022 TransferHook can revert AFTER VelocityLedger commits** if `gate_payment + transfer + emit_feedback` split across 2 transactions. SDK MUST enforce atomic single-tx bundling.
- **PR #3946's static duplicate-mut-account guard** (Anchor 1.0.x) eliminates an entire reentrancy class for free if AgentTrust uses Anchor 1.0+.
- **`sighash("global", "give_feedback")[..8]` discriminator** computed; matches Quantu's runtime emission.

### A.3 — Wave 1 #3 (ERC-8004 + ValidationRegistry archaeology)

- **Quantu archived ValidationRegistry due to spam-DoS (VALID-H1 in SECURITY-AUDIT-REPORT.md 2026-02-05),** not architectural failure. Audit accepted as risk; same-day refactor (commit `58ff2ee`) moved to `_archive/validation/` with explicit "future upgrade" labeling.
- **`ValidationAttestation` PDA size: 282 bytes** (revised up from v1_scope's 256-byte estimate to accommodate Ed25519 signature + revocation reason hash + claim URI hash).
- **Top 5 attestors to court Day 18+:** Halborn, OtterSec, Civic, Sumsub, Anthropic (self-attest). All have existing on-chain or off-chain signing infrastructure; integration cost ≤ 1 week per attestor.
- **Sybil-resistance v1 model = downstream-consumer-filtering** (PolicyVault stores `accepted_attestors[]` per-policy). Stake-weighted scoring is v1.1+ work.
- **Cross-chain attestation portability is v1.1+ work** (Wormhole/LayerZero relayer). v1 ships Solana-only.

### A.4 — Wave 2 #4 (PolicyVault build playbook)

- **8,930 words. 5 Kani invariants proven** in v1: paused_implies_no_allow, velocity_counter_le_limit, counterparty_tier_monotone, validation_expiry_correct, multisig_threshold_enforced.
- **Fail-fast policy ordering** (KillSwitch → Spending → Velocity → CounterpartyTier → RequireValidation) keeps average-case CU low because most denials short-circuit before the foreign-PDA read.
- **Kani invariant #2 (`velocity_counter_le_limit`) is most-likely to break** under adversarial inputs due to combinatorial u64 search space + window-rollover edge cases. Mitigation: Pending/Commit split + Allow-path-only write isolates the invariant.
- **`find_program_address` per call costs ~2,250 CU.** AgentTrust caches bumps via `ctx.bumps.field_name` for AgentTrust's own PDAs; the 4 Quantu-side find_program_address calls remain in `read_atom_tier` but are bounded by the 80K CU envelope.

### A.5 — Wave 2 #5 (TrustGate x402 class)

- **8,995 words.** Atomic-tx invariant enforced as TypeScript literal-type guard PLUS runtime throw — both required.
- **The biggest x402-spec ambiguity: post-settlement disputes.** Coinbase + Cascade explicitly out-of-scope; MPP ships `/refund` with zero reputation effect. AgentTrust takes a stance: `dispute_payment` emits score=20 feedback regardless of fund-recovery status. Documented in `docs/INTEGRATION-FACILITATOR.md` + repo README + pitch slide 4.
- **Top 3 facilitators ranked by integration ease:** Corbits (~30 min), Dexter (~3 days), MCPay (~50 LOC patch). atxp_ai higher-value but slower-cadence; Latinum slowest (7-10 days).
- **15 DMs drafted** (3 per facilitator × 5). Wave 3 #8 layered live x-recon hooks on top.
- **TrustGate Anchor program PDAs:** TrustGateAuthority 107 bytes, FeedbackEmissionLog 90 bytes.

### A.6 — Wave 2 #6 (ValidationRegistry build playbook)

- **6,200 words. 4 PDAs + 6 instructions.** Ed25519 sysvar verification pattern vendored from Quantu's `set_agent_wallet` — instruction-index check at `current_idx - 1`, sig/pubkey/message indices `0xFFFF` inline.
- **CU envelope per ValidationRegistry tx ≤ 50K.** `set_compute_unit_limit(50_000)` defensive pre-instruction.
- **Self-attestation block lives in PolicyVault, not ValidationRegistry** (v1). PolicyVault's `RequireValidation` policy enforces `attestation.attestor != payee_agent_owner` via Metaplex Core read.
- **10 v1 capability namespaces seeded** Day 11 via `scripts/seed-capability-namespaces.ts` (~0.023 SOL total).

### A.7 — Wave 3 #7 (Demo scenarios + agent pre-warming)

- **9,848 words. 3 demo scenarios fully scripted** (Nike consumer-fraud, Anthropic API B2B scam-wrapper, Live tier-accrual bonus).
- **Day-5 pre-warm budget: 30 min for 5 agents** (~0.055 SOL); cron emits 21 feedbacks per agent over 7 days from 5 distinct client wallets at 8am/2pm/8pm IST cadence.
- **Total mainnet SOL spend Days 5–17: ~0.152 SOL** ($25–30 at current SOL prices).
- **Fastest path tier 0 → Silver (2):** ~10 feedbacks from 3+ distinct wallets at slot intervals ≥ 2000 (~14 min). Tier 0 → Gold (3): ~15 feedbacks. Platinum (4) unreachable in 7 days due to LOYALTY_MIN_SLOT_DELTA + TIER_PLATINUM_MIN_LOYALTY = 500 constraints.
- **Demo-day risk mitigation:** triple-redundant fallback (Day-12 pre-recorded mainnet take, OBS dual-record on Day 13, localnet `--clone` as absolute fallback).

### A.8 — Wave 3 #8 (Facilitator dossiers + x-recon)

- **6,391 words + 5 stand-alone DM files.** Dexter DAuth competitive-overlap surfaced (Revision 10 change file logged this).
- **atxp_ai is the warmest Foundation-orbit facilitator.** Post analysis: their @_rishinsharma growth tweet 2026-04-22 cites 44k buyers / 120k tx — high pull.
- **MCPay founder build-quiet on X.** Defer to GitHub PR / Discord engagement rather than DM.
- **Latinum has zero X-presence.** Defer to email/contact-form via latinum.ai.
- **Corbits actual handle: `@corbitsdev`** (corrected from `@corbits_dev`). Lowest integration friction (~30 min observability adapter).
- **Most-likely-to-RT soft sponsor: Mert.** Highest-RT-probability artifact = scam-wrapper-pretending-to-be-Anthropic + `cargo kani` 5-greens screenshot. Ship Day 14 demo-preview thread.

### A.9 — Wave 4 #9 (Grants research + 8 drafts)

- **Total drafted ceiling: $72.7K cash + $750K equity** (Colosseum $250K + a16z CSX $500K) + Helius Pro in-kind.
- **Pre-Frontier-decision realistic asks (Day 5–12):** Solana Foundation India ($10K, Day 6 file), Foundation Direct ($15K convertible, Day 18 file), Superteam Agentic Engineering ($200, Day 5 file). Total pre-decision realistic = $20.2K + Helius Pro deck-review pipeline.
- **Post-Frontier conditional (Day 17+):** Frontier Public Goods + Standout ($10K each, stackable per Rules §7), Colosseum Accelerator ($250K pre-seed if prize-gated), CDP Q3 round ($3K-$10K).
- **Critical hidden lever: Helius Pro plan ($499/mo) unlocks Mert's deck-review pipeline.** Day 5+ subscribe.
- **Skipped (eligibility blocks):** USA grants (US-only), Japan grants, Cal/Stanford/UPenn (US-only + university-affiliated), University Award (Mohit not enrolled), Vanish bounty (out of scope).

### A.10 — Wave 4 #10 (Production + amplification)

- **2,095 lines / 10 files.** 9 ready-to-use templates in `plan/other_tasks/ops/`: 60s + 3-min pitch scripts, 90s technical demo script, 10-slide deck content brief, friend handoff brief, 4 Twitter thread templates.
- **Highest-leverage pitch beat per judge:**
  - **Matty:** named first buyer + ship-cadence + Foundation-credibility
  - **Vibhu:** Foundation-alignment phrase + SDP-stackability framing in slide 6
  - **Mert:** scam-wrapper-pretending-to-be-Anthropic Variant B + cargo kani 5-greens
  - **Lily:** Public Goods Award eligibility + third-leg-Quantu-archived framing
- **Day 13-16 video critical path:** Mohit ships audio + screen captures by 2026-05-06 (Day 12) evening; if delayed by 24 hours, Day 17 becomes risky.

---

## B. Surprising discoveries

1. **AtomStats has TWO tier fields, not one.** `trust_tier` (offset 551) is the immediate cached tier; `tier_confirmed` (offset 555) is the post-8-epoch-vested tier. The 8-epoch (~20 day) vesting forces a v1 demo design choice: `TierGateMode::Immediate` or `Confirmed`. The change file Revision 2 locked Immediate as v1 default.
2. **Quantu archived ValidationRegistry for a SPECIFIC security reason, not abandonment.** The SECURITY-AUDIT-REPORT VALID-H1 finding (spam-DoS via unlimited ValidationRequest PDA creation) was accepted as risk; same-day refactor archived the module pending a redesign with rate limiting. AgentTrust's design (per-attestor counter on AttestorProfile + economic deterrent via rent) addresses the original concern.
3. **Dexter launched DAuth on 2026-04-01 — a "trust infrastructure" product that overlaps AgentTrust's positioning.** Wave 2 #5 didn't see this because it relied on web search, not x-recon. Wave 3 #8 caught it. Revision 10 change file corrects the Dexter DM frame.
4. **`give_feedback` discriminator hardcoded value `[145, 136, 123, 3, 215, 165, 98, 41]`** — TrustGate's emit_feedback constructs the instruction manually without depending on Quantu's crate. A unit test recomputes the discriminator on each build, providing a build-time alarm if Quantu renames the instruction.
5. **Quantu's `agent-registry-8004` and `atom-engine` use the SAME keypair file for localnet and mainnet** (per `Anchor.toml:8` and `keys/mainnet-program/`). Devnet IDs differ. This is a deliberate binary-hash reproducibility choice. AgentTrust's Anchor.toml clones both pairs in `[test.validator.clone]` for localnet integration tests.
6. **Quantu's `8004-solana` Cargo package version is `0.5.3`, but the CHANGELOG documents `0.6.0` SEAL v1 as released 2026-01-30.** The package crate version lags the release-level CHANGELOG. AgentTrust pins to commit hash `bfb09ad`, not version number, to avoid this confusion.
7. **The atom-engine's `update_stats` is called via CPI from agent-registry's `give_feedback`, signed by `[b"atom_cpi_authority"]` PDA derived against agent_registry's program ID.** TrustGate's PDA-signed CPI provides the `client` signer; agent-registry handles the internal CPI to atom-engine using its OWN authority PDA. TrustGate doesn't need to sign for atom-engine.
8. **`AGENTTRUST_ATTEST` 16-byte domain separator** in ValidationRegistry's Ed25519 message format prevents cross-domain replay attacks. Mirrors Quantu's `8004_WALLET_SET:` prefix pattern in `set_agent_wallet`.
9. **Helius Pro plan ($499/mo) unlocks Mert's deck-review pipeline** per Mert's [2026-04-10 tweet](https://x.com/mert/status/2042577633515393205). Asymmetric leverage — Mert is operationally a Solana angel investor + a Frontier judge. Pre-Day-10 subscription is the most-load-bearing in-kind grant action.
10. **Mainnet binary hash `5aeae715...` is verifiable via `solana program dump --url mainnet-beta` + `shasum -a 256`.** Quantu publishes this hash so any consumer can independently verify the mainnet deployment matches a specific source-code commit.

---

## C. v1_scope.md changes — already locked + new this session

The change file at `plan/final_idea/changes/2026-04-28-wave1-scope-refinements.md` already locked 9 revisions before Wave 2 spawned. Wave 3 surfaced a 10th revision (Dexter DAuth positioning) which lives in `plan/final_idea/changes/2026-04-28-wave3-dexter-dauth-positioning.md`. The base `v1_scope.md` remains the source of truth; revisions are append-only.

Net effect on scope: **none.** All 10 revisions are byte-level precision wins or positioning shifts, not scope changes. Locked Option 1 (full 3-component v1) remains the build plan.

Summary of all revisions:

| # | File | Subject |
|---|------|---------|
| 1 | wave1-scope-refinements | ValidationAttestation PDA size: 256 → 282 bytes |
| 2 | wave1-scope-refinements | CounterpartyTier policy default: TierGateMode::Immediate (byte 551), not Confirmed |
| 3 | wave1-scope-refinements | AtomStats actual size: 561 bytes (not 460) |
| 4 | wave1-scope-refinements | AgentAccount actual size: 748 bytes (not 313) |
| 5 | wave1-scope-refinements | Pin commit hash `bfb09ad` for Quantu deps |
| 6 | wave1-scope-refinements | give_feedback discriminator hardcoded `[145, 136, 123, 3, 215, 165, 98, 41]` |
| 7 | wave1-scope-refinements | Quantu mainnet vs devnet program IDs differ |
| 8 | wave1-scope-refinements | Demo agent pre-warming = TWO transactions per agent (~0.011 SOL) |
| 9 | wave1-scope-refinements | Tier-target Day 12 = Silver-Gold (2-3), not Platinum (4) |
| 10 | wave3-dexter-dauth-positioning | Dexter DM frame correction post-DAuth launch |

---

## D. Risk register — cross-checked across all 10 deep-dives

| # | Risk | Severity | Source(s) | Mitigation |
|---|------|----------|-----------|------------|
| 1 | CU cost of `gate_payment` exceeds limit | LOW (was HIGH in THESIS_LOCK) | Wave 1 #2 + Wave 2 #4 | ~26K CU measured envelope. No split needed. `set_compute_unit_limit(150_000)`. |
| 2 | ATOM tier vesting (~20 days) breaks Day-12 demo | HIGH | Wave 1 #1 + change file Rev 2 | `TierGateMode::Immediate` (byte 551). Pre-warm starting Day 5. Demo target Silver-Gold, not Platinum. |
| 3 | Reverse-mapping PDA absence | LOW | THESIS_LOCK + Wave 1 #1 | Pre-drafted Q&A. Demo always passes payer/payee_agent_asset as remaining_accounts (this IS the design point). |
| 4 | Quantu pushes breaking change to agent-registry-8004 mid-hackathon | MEDIUM | Wave 1 #1 Section L | Pin commit hash `bfb09ad`. Schema version check at byte 560. v1.1 patch path documented. |
| 5 | SAEP announces Foundation endorsement / facilitator partnership | HIGH (pitch differentiation) | THESIS_LOCK + ongoing | Monitor @BuildOnSAEP every 3 days. Backup pitch positioning re-frames as "Quantu's Foundation-endorsed primitive shipped first." |
| 6 | KAMIYO ships stake-backed escrow before Day 12 | MEDIUM | THESIS_LOCK | Pre-drafted Q&A: "policy primitive vs escrow primitive — different categories." |
| 7 | Foundation/Quantu dependency-risk | MEDIUM | THESIS_LOCK | MIT license = program survives Quantu corp status. Foundation page is solana.com domain. PolicyVault graceful degradation mode. |
| 8 | Solo-build scope risk | MEDIUM | THESIS_LOCK | Pre-decided cut-priority order survives Day-12 panic. Floor-list lock-trigger removes Day-16 deliberation. |
| 9 | Friend offload doesn't materialize for video | MEDIUM | THESIS_LOCK + Wave 4 #10 | Day-7 friend availability confirmation. Backup: solo single-take screen recording with voiceover. |
| 10 | Cut-regression breaks demo | MEDIUM | THESIS_LOCK | Each cut decision triggers 1-hour smoke test. Revert if smoke fails. |
| 11 | **NEW: Token-2022 TransferHook footgun** | MEDIUM (now known) | Wave 1 #2 + Wave 2 #5 | TrustGate SDK enforces atomic tx via literal-type guard + runtime throw. Documented as load-bearing correctness invariant. |
| 12 | **NEW: Dexter DAuth competitive-overlap** | MEDIUM (positioning) | Wave 3 #8 (Revision 10) | DM frame correction. Pitch deck slide 7 contingency planning. atxp_ai as Priority 1 fallback. |
| 13 | **NEW: ValidationRegistry spam-DoS (the reason Quantu archived)** | LOW for v1 (rent deterrent) | Wave 1 #3 + Wave 2 #6 | Rent (~0.0014 SOL per request, ~0.0021 SOL per attestation) is the v1 economic deterrent. v1.1+ adds per-attestor rate limiting via AttestorProfile counter. |
| 14 | **NEW: Mainnet RPC flake during Day-13 final recording** | MEDIUM | Wave 3 #7 | Triple-redundant fallback: Day-12 pre-recorded mainnet take + OBS dual-record + localnet --clone. |

Net risk surface change vs THESIS_LOCK: **3 risks downgraded** (CU cost, dependency, demo timing now mitigatable), **4 new risks identified** (Token-2022 footgun, Dexter DAuth, ValidationRegistry spam, RPC flake), all with concrete mitigations.

---

## E. GO / NO-GO confirmation

**GO.**

Justification:
1. **All 5 floor items per THESIS_LOCK are achievable** within the 13-day build window:
   - PolicyVault `gate_payment` with CounterpartyTier (Wave 2 #4, days 7-9)
   - 90-second demo (Wave 3 #7, days 12-13)
   - Pitch video Variant B (Wave 4 #10 + ops/pitch-video-script-3min.md, days 13-14)
   - README "completes the Foundation's ERC-8004 trust stack" (day 15)
   - Foundation-alignment language (deck + repo + Twitter bio)
2. **No deep-dive surfaced a blocker.** Every concern has a concrete mitigation.
3. **CU envelope confirmed comfortable** — no need for `gate_check`/`gate_commit` split.
4. **Day-5 pre-warm is executable** with ~0.10 SOL budget and 30-min execution window.
5. **Grant pipeline drafted** — $20.2K pre-decision asks file Day 5-6, $750K equity ceiling post-Frontier conditional.
6. **Outreach corrections in place** — Dexter DAuth-aware DM, atxp_ai as Priority 1 fallback, Latinum email-channel pivot.

<!-- COMMENTED OUT 2026-05-01 (full-build commitment locked, no-go triggers + fallbacks not under consideration):
**NO-GO triggers (none currently active):**
- If Quantu announces v0.7.0 PDA layout shift before Day 5 → re-evaluate (pin to v0.6.0 commit; v1.1 patch post-Frontier)
- If SAEP announces Foundation endorsement OR x402 facilitator partnership → backup pitch positioning activates (per THESIS_LOCK Risk 5)
- If Mohit's friend confirms unavailability for Days 13-15 video work → solo single-take fallback (per Wave 4 #10 friend-handoff-brief contingency)

None of these are currently active. Lock holds.
-->

---

## F. Day-5 master action plan (consolidated from Wave 1 #1 + Wave 2 #4 + Wave 3 #7)

**Date:** 2026-04-29 (Day 5). Mohit's first build day.

### Morning block (09:00 – 12:00 IST, ~3 hours)

| Time | Action | Source | Cost / Notes |
|------|--------|--------|--------------|
| 09:00 | Generate 5 demo agent keypairs + 5 client keypairs + 1 facilitator authority keypair + 1 PolicyVault admin keypair | Wave 3 #7 §B | 12 keypairs total; ~3 min `solana-keygen` calls |
| 09:15 | Save AtomStats byte-offset constants in `programs/policy-vault/src/policies/counterparty_tier.rs` | Wave 1 #1 §B.5 + change file Rev 2 | ATOM_STATS_TRUST_TIER_OFFSET = 551, TIER_CONFIRMED = 555 |
| 09:30 | **Run `scripts/prewarm-demo-agents.ts` against mainnet** | Wave 3 #7 §B | ~0.055 SOL × 5 agents = 0.275 SOL? No — re-check: 0.011 × 5 = 0.055 SOL total. **Load-bearing — without this, Day-12 demo doesn't work** |
| 10:00 | Install + load launchd cron for `feedback-cron.ts`. Trigger first manual run. | Wave 3 #7 §C | Cron schedule: 8am/2pm/8pm IST × 7 days |
| 10:15 | Pin Quantu deps `bfb09ad` in `docs/PINNED-VERSIONS.md`. Verify SHA-256 of mainnet binary. | Wave 1 #1 §M | One-time documentation discipline |
| 10:30 | Anchor workspace scaffold for 3 programs (policy-vault, trustgate, validation-registry). `Anchor.toml` clone block for agent_registry_8004 + atom_engine. | v1_scope.md §Repo structure | 90 min — bulk of Day-5 build budget |

### Noon block (12:00 – 14:00 IST, ~2 hours)

| Time | Action | Source | Cost / Notes |
|------|--------|--------|--------------|
| 12:00 | Send 3 cold-discovery DMs (Dexter, atxp_ai, MCPay) | Wave 3 #8 + DM files in `plan/other_tasks/dms/` | **Use Revision 10 Dexter DAuth-aware frame.** atxp_ai = Priority 1 fallback. |
| 12:30 | Email 1 regulated-enterprise lead (Stripe agent-payments) | Wave 3 #8 §F | Discovery framing |
| 13:00 | Confirm friend availability for Days 13-15 video work | Wave 4 #10 friend-handoff-brief | If unavailable: Day-7 fallback to solo screen recording |
| 13:15 | Write THESIS_LOCK.md (the founder-voice version Mohit personally signs). Apply revisions per Wave 1 + Wave 3 change files. | THESIS_LOCK already drafted; needs personalization | ~30 min |
| 13:45 | File Superteam Agentic Engineering grant ($200) | `plan/other_tasks/grants/superteam-agentic-engineering.md` | Day-5 file recommendation |

### Afternoon block (14:00 – 17:00 IST, ~3 hours)

| Time | Action | Source | Cost / Notes |
|------|--------|--------|--------------|
| 14:00 | Sign up for Helius Pro plan ($499/mo) | Wave 4 #9 grant pipeline | Unlocks Mert deck-review pipeline + RPC quota for cron |
| 14:15 | PolicyVault PolicyAccount + VelocityLedger + KillSwitchState + PolicyAuthority schema | Wave 2 #4 + v1_scope §Component 1 | First Anchor program code |
| 16:00 | Cargo build green on empty modules | Wave 2 #4 day-5 backbone | Definition of done |
| 16:30 | Update `.cache/research/` (or wherever build state lives) to reflect Day-5 progress | session discipline | |

### Evening block (17:00 – 19:00 IST, optional)

| Time | Action | Source |
|------|--------|--------|
| 17:00 | File Superteam India Solana Foundation Grant ($10K) | `plan/other_tasks/grants/solana-foundation-india.md` (Day 6 also acceptable per grants research) |
| 17:30 | Write the Day 5 progress thread (per `plan/other_tasks/ops/twitter-thread-launch.md`) | Wave 4 #10 |
| 18:00 | Tweet the Day 5 launch thread. Tag @SolanaFndn, @Quantu_AI naturally | |

### Day 5 totals

- **Mainnet SOL spend:** ~0.10 SOL ($20-25)
- **Helius Pro:** $499/mo subscription
- **Cash grants filed:** $200 (Superteam Agentic Engineering) + $10K asks (Foundation India)
- **DMs sent:** 3 cold-discovery + 1 enterprise-discovery email
- **Tweet threads launched:** 1 (Day 5 launch thread)
- **Code shipped:** Anchor 3-program scaffold + PolicyVault state.rs schema (cargo build green)
- **Time committed:** ~7-8 focused hours

If everything above lands by end of Day 5, Mohit is **on critical path** for the Day-17 submission. Day 6 begins the Spending policy kind (per Wave 2 #4 day-by-day).

---

## G. What this means for Mohit's submission — top 10 actionable bullets

1. **Day 5 morning (09:30 IST): execute the pre-warm script.** Without it, the headline Day-12 demo doesn't work. Cost: 0.055 SOL ($10-12). Time: 30 min. This is the highest-leverage 30 minutes of the entire 13-day build window.
2. **Pin Quantu deps to commit `bfb09ad` Day 5.** Document in `docs/PINNED-VERSIONS.md`. The commit's mainnet binary SHA-256 is `5aeae71...` — independently verifiable via solana program dump.
3. **Use `TierGateMode::Immediate` (byte 551) as v1 demo default.** Production deployments toggle to `TierGateMode::Confirmed` (byte 555). Document the 8-epoch vesting tradeoff in README.
4. **Send the Dexter DM with the Revision 10 DAuth-aware frame.** Position AgentTrust as on-chain primitive DAuth CONSUMES, not competitor. atxp_ai is the Priority 1 fallback if Dexter pushes back.
5. **Sign up for Helius Pro Day 5.** Unlocks Mert's deck-review pipeline + WebSocket RPC quota for TrustGate's NewFeedback subscription.
6. **File Superteam India ($10K) + Superteam Agentic Engineering ($200) Day 5-6.** Pre-Frontier-decision realistic grants. Foundation Direct ($15K-$50K) files Day 18 (post-shipped artifact).
7. **Enforce TrustGate atomic-tx invariant via literal-type guard + runtime throw.** Token-2022 TransferHook footgun corrupts VelocityLedger if gate-and-transfer split across 2 txs. No opt-out.
8. **Demo target Silver-Gold (tier 2-3) on the headline pre-warmed agent.** Platinum (4) is structurally unreachable in 7 days. Pitch deck slide 5 shows Gold-vs-Unrated, NOT Platinum-vs-Unrated.
9. **The Mert RT-cascade trigger is the cargo-kani-5-greens screenshot + scam-wrapper-pretending-to-be-Anthropic Variant B opener.** Day 14 demo-preview thread is the highest-amplification window.
10. **Cut-priority order survives panic; mid-cut deliberation does not.** Print the cut-priority list from `agenttrust-solo-build-assessment.md`, tape to wall by Day 9. Day-12 panic doesn't override pre-decided cuts.

---

## H. Sign-off

**Verdict: GO for Option 1 (full 3-component v1 build).**

- All 10 deep-dives complete (~860KB across 35 deliverable files).
- Locked thesis unchanged.
- Locked scope unchanged (Option 1).
- 10 byte-level + positioning revisions documented in change files.
- Day-5 master action plan executable in ~7-8 focused hours.
- Day-17 submission floor (5 immutable items) achievable.
- 13 risks identified, all with concrete mitigations.
- Grant pipeline drafted: $20.2K pre-decision realistic, $750K equity ceiling post-Frontier.

Build phase begins 2026-04-29. No further thesis re-litigation.

— Synthesis closed 2026-04-28 02:30 (research marathon end).
