# 2026-04-28 — v1 scope refinements from Wave 1 deep-dives

**Status:** Locked addition. Apply on Day 5 when scaffolding the Anchor workspace.
**Sources:** `plan/research/01-quantu-source-code-class.md`, `02-anchor-token2022-cpi-class.md`, `03-erc8004-validation-registry-archaeology.md`.
**Author:** Mohit (synthesizing Wave 1 findings before Wave 2 deep-dives spawn).

---

## Revision 1 — `ValidationAttestation` PDA: 256 → 282 bytes

**Source:** Wave 1 #3 (`03-erc8004-validation-registry-archaeology.md` Section J). The byte-precise reconstruction of the productized v1 ValidationAttestation revised the size estimate up from `v1_scope.md`'s 256 bytes to 282 bytes total.

**New byte layout:**

| Offset | Field | Width |
|--------|-------|-------|
| 0–7 | discriminator | 8 |
| 8–39 | `subject_asset` | 32 |
| 40–71 | `capability_hash` | 32 |
| 72–103 | `attestor` | 32 |
| 104–135 | `claim_payload_hash` | 32 |
| 136–199 | `attestor_signature` | 64 (Ed25519) |
| 200–207 | `issued_at` (slot) | 8 |
| 208–215 | `expires_at` (slot) | 8 |
| 216 | `revoked` (bool) | 1 |
| 217–224 | `revoked_at` (slot) | 8 |
| 225–256 | `revocation_reason_hash` | 32 |
| 257–288 | `claim_uri_hash` | 32 |
| 289 | `bump` | 1 |

Total: 282 bytes (8 disc + 274 data). Rent ~0.00208 SOL per attestation.

**Why up from 256:** the original v1_scope estimate omitted the Ed25519 signature payload (64 bytes) and the revocation reason hash (32 bytes). Wave 1 #3 added both for sybil-resistance and audit-trail completeness.

**Action on Day 5:** when implementing `validation-registry/src/state.rs`, declare `ValidationAttestation::SIZE = 282`. Update v1_scope.md Component 3 PDA table to reflect 282.

---

## Revision 2 — `CounterpartyTier` policy default: gate on `trust_tier` (offset 551), not `tier_confirmed` (offset 555)

**Source:** Wave 1 #2 (`02-anchor-token2022-cpi-class.md`) + Wave 1 #1 (`01-quantu-source-code-class.md` Section B.5).

**The reality:** AtomStats has TWO tier fields. `trust_tier` (byte offset 551) is the immediate post-feedback tier; `tier_confirmed` (byte offset 555) is the post-8-epoch-vesting (≈20 days) confirmed tier. Wave 1 #2 initially recommended `tier_confirmed` for sybil-resistance. Wave 1 #1 surfaced the demo-blocking implication: pre-warmed agents starting Day 5 cannot reach `tier_confirmed > 0` until ~Day 25 (post-Frontier-submission) given vesting. The headline demo needs `tier_candidate ≥ 2` visible by Day 12, which only `trust_tier` provides.

**Decision:** PolicyVault's `CounterpartyTier` policy kind exposes a `gate_mode: TierGateMode` field with two variants:
- `TierGateMode::Immediate` (default for v1 demo) — reads `trust_tier` at offset 551
- `TierGateMode::Confirmed` (production) — reads `tier_confirmed` at offset 555

The pitch beat *"agent must have tier ≥ 2"* shows Immediate-mode in the demo. The production-grade message in the README explains: *"For production deployments requiring sybil-resistant proof of tier, set `gate_mode = Confirmed` — vested over 8 epochs (~20 days) of feedback history."*

**Action on Day 5:** v1_scope.md Component 1 CounterpartyTier policy specification updates to expose `gate_mode`. Default for the demo policy is `Immediate`.

---

## Revision 3 — `AtomStats` actual size: 561 bytes (not 460)

**Source:** Wave 1 #1 Section B.5 (`atom-engine/src/state.rs:193`: `pub const SIZE: usize = 561`).

The figure 460 in `research/06-competitive-intel/agent-registry-cpi-surface.md` reflects the ATOM v0.2.0 "Fortress" pre-vesting layout. After the v0.5.0 Fortress release added Tier Vesting (`tier_candidate`, `tier_candidate_epoch`, `tier_confirmed`, `flags`) the size went up to 561. Rent at the 2026-04-28 SOL price ≈ 0.0049 SOL per AtomStats — confirms `README.md:170` *"Initialize ATOM Stats: ~0.005 SOL"*.

**Action on Day 5:** PolicyVault's `policies/counterparty_tier.rs` exports `pub const ATOM_STATS_SIZE: usize = 561` and validates `data.len() == 561` before deserializing. The defensive check catches any v0.7.0 schema-bump fail-loud.

---

## Revision 4 — `AgentAccount` actual size: 748 bytes (not 313)

**Source:** Wave 1 #1 Section B.3.

CHANGELOG v0.3.0 lists 313 bytes for `AgentAccount` — that was the pre-SEAL-v1 layout (before `feedback_digest`, `response_digest`, `revoke_digest`, `feedback_count`, `response_count`, `revoke_count` were added in v0.4.0–v0.6.0). Current InitSpace calculation: 748 bytes data + 8 disc.

**No action required:** AgentTrust's PolicyVault never reads past byte 325 (`col_locked`). The variable-length strings beyond don't affect AgentTrust.

---

## Revision 5 — Pin commit hash for Quantu deps

**Source:** Wave 1 #1 Section M.

Pin to `bfb09ad` (HEAD of `main` 2026-04-28). Mainnet binary SHA-256 verified at `5aeae715714861fd43ac09d80bc51f70836b27a325a2c2131374121c6c05a5c8` (Quantu README). `docs/PINNED-VERSIONS.md` content drafted in Wave 1 #1 Section M; copy verbatim on Day 5.

**Cargo dep posture:** AgentTrust does NOT add a `git = ".../8004-solana", rev = "bfb09ad"` dependency. Quantu's `anchor-lang = "0.31.1"` would couple AgentTrust to that Anchor version, conflicting with AgentTrust's choice (Anchor 1.0+, per Wave 1 #2). Manual byte-offset deserialization sidesteps the coupling. The pin is documentation discipline.

---

## Revision 6 — `give_feedback` Anchor discriminator hardcoded value

**Source:** Wave 1 #2 + #1 Section J.2.

`GIVE_FEEDBACK_DISCRIMINATOR = [145, 136, 123, 3, 215, 165, 98, 41]` — keccak("global:give_feedback")[..8].

**Action on Day 5:** TrustGate's `instructions/emit_feedback.rs` declares this constant. Add a unit test that recomputes the discriminator at compile-time (or in CI) and asserts equality. The test guarantees a build-time alarm if Quantu renames the instruction in v0.7.0+.

---

## Revision 7 — Quantu mainnet program IDs are different on devnet

**Source:** Wave 1 #1 Section A.3.

| Program | Localnet (= mainnet) | Devnet |
|---------|---------------------|--------|
| agent-registry-8004 | `8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ` | `8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C` |
| atom-engine | `AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb` | `AToMufS4QD6hEXvcvBDg9m1AHeCLpmZQsyfYa5h9MwAF` |

**Action on Day 5:** AgentTrust's `Anchor.toml` clones both pairs in `[test.validator.clone]` for localnet integration tests. Devnet integration tests target devnet IDs explicitly. Mainnet deployment Day 16 uses mainnet IDs.

`docs/PINNED-VERSIONS.md` drafted by Wave 1 #1 already includes both ID pairs.

---

## Revision 8 — Demo agent pre-warming is TWO transactions per agent

**Source:** Wave 1 #1 Section C.2.

Per-agent pre-warming = `register_with_options(uri, atom_enabled=true)` (~0.006 SOL) THEN `atom_engine::initialize_stats(asset, collection)` (~0.005 SOL). Total ~0.011 SOL per agent × 5 agents = ~0.055 SOL Day-5 mainnet cost.

**Action on Day 5:** `scripts/prewarm-demo-agents.ts` issues both transactions sequentially per agent (or in a Jito bundle if available). Total 10 transactions for 5 agents. `feedback-cron.ts` (separate script) emits 1–3 positive-score feedbacks per agent per day from 3+ distinct client wallets to drive the tier accrual.

---

## Revision 9 — Tier-target for Day-12 demo: Silver-Gold (2-3), not Platinum (4)

**Source:** Wave 1 #1 Section B.6.

`TIER_PLATINUM_MIN_LOYALTY = 500` (atom-engine `params.rs:340-342`) requires extensive repeat-caller history with `LOYALTY_MIN_SLOT_DELTA = 2000` slot gaps. Structurally unreachable in 7 days from a fresh agent. Gold (3) requires `risk_score ≤ 30` AND `confidence ≥ 4500` — achievable by Day 12 with consistent positive feedback from 3+ client wallets. Silver (2) is comfortable.

**Action on Day 5:** demo script targets Silver-Gold on the headline pre-warmed agent. Pitch deck slide 5 ("Demo screenshot") shows Gold or Silver vs Unrated, NOT Platinum vs Unrated.

---

## Net effect on `v1_scope.md`

The base v1_scope.md remains valid. These nine refinements are the build-time corrections. None alter the locked thesis, locked scope option (Option 1), locked first buyer (x402 facilitators), or locked pitch (Variant B). All are byte-level precision wins from primary-source-cited Wave 1 deep-dives.

**No further re-scope contemplated.** Wave 2 deep-dives may surface additional refinements; if so, they get their own date-stamped change file in this directory.
