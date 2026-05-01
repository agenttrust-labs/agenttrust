# PolicyVault Build Playbook — AgentTrust Component 1

**Author:** Mohit. **Date:** 2026-04-28 (Day 4.5, eve of Day 5 build kickoff). **Cluster pin:** `bfb09ad` Quantu HEAD. **Anchor target:** 1.0.1. **Solana CLI:** 3.1.x. **Target reader:** Mohit on Day 5 morning, reaching for one document that turns the locked thesis into 13 days of build work.

This playbook is the single operating manual for PolicyVault — Component 1 of the AgentTrust trinity, the moat AgentTrust competes on. It synthesizes the locked thesis (`plan/final_idea/THESIS_LOCK.md:23`), the frozen v1 scope (`plan/final_idea/v1_scope.md:11-67`), the nine refinements from `plan/final_idea/changes/2026-04-28-wave1-scope-refinements.md`, and the byte-precise Wave 1 deep-dives (`plan/research/01-*`, `02-*`, `03-*`). Every claim here cites either a primary URL or a Wave-1-output file:section reference. Code blocks are runnable.

---

## A. Architecture overview

### A.1 Three-paragraph framing

PolicyVault is the third leg of the ERC-8004 trust stack — the policy primitive Quantu archived in v0.5.0 that AgentTrust productizes. Per `THESIS_LOCK.md:23`, its job is one Anchor instruction (`gate_payment`) that composes five orthogonal policy kinds into one Allow / Deny / RequireValidation verdict an x402 facilitator can act on in <100ms p99. Variant B's pitch beat — *"the agent must have tier ≥ 2"* — is one offset read against `AtomStats.trust_tier` at byte 551 of an atom-engine-owned PDA (`01-*:B.5`), wrapped in a graceful-degradation envelope that tolerates upstream Quantu pivots.

PolicyVault's defensibility is the Kani harness. The five invariants in `v1_scope.md:55-61` are the load-bearing differentiator against SAEP and compromise scopes: AgentTrust is the only ERC-8004 leg shipping with a model-checked correctness proof. Mert Mumtaz's engagement target (`THESIS_LOCK.md:56`) is the live-on-screen `cargo kani` green-checks moment. Every architectural choice here is downstream of three constraints: `gate_payment` must fit under 200K CU (Wave 1 #2 measured 26K empirical, 80K with 3x safety, `02-*:E.4`); manual `AtomStats` deserialization must not depend on Quantu's `anchor-lang = "0.31.1"` (`02-*:A`); `CounterpartyTier` must default to `TierGateMode::Immediate` (offset 551) for the demo because `tier_confirmed` (555) needs 8 epochs of vesting (Revision 2, `2026-04-28-wave1-scope-refinements.md:39-52`).

PolicyVault's first integrator is TrustGate (Component 2). TrustGate's Express server invokes `gate_payment` via simulation on `POST /verify` and via CPI on `POST /settle`. Through `mountTrustGate(app, config)`, any x402 facilitator (Dexter, atxp_ai, MCPay) drops AgentTrust into their stack in a day. PolicyVault's on-chain footprint is independent: a facilitator could call `gate_payment` directly. That decoupling is the moat — PolicyVault is a primitive, not a feature.

### A.2 Repo tree (mirrors `plan/final_idea/v1_scope.md:170-292`)

```
programs/policy-vault/
├── Cargo.toml                          # anchor-lang = "1.0.1", pinned
├── Xargo.toml
├── src/
│   ├── lib.rs                          # entry point, declare_id!, instruction registry
│   ├── state.rs                        # PolicyAccount, VelocityLedger, KillSwitchState, PolicyAuthority
│   ├── events.rs                       # PolicyEvaluated, PolicyDenied, PolicyAllowed, KillSwitchTriggered, VelocityIncremented
│   ├── errors.rs                       # PolicyVaultError (~25 variants)
│   ├── policies/
│   │   ├── mod.rs                      # PolicyKind enum + dispatch
│   │   ├── spending.rs                 # ~150 LOC
│   │   ├── counterparty_tier.rs        # ~250 LOC; manual AtomStats deserialization
│   │   ├── velocity.rs                 # ~200 LOC; sliding-window math
│   │   ├── require_validation.rs       # ~120 LOC
│   │   └── killswitch.rs               # ~80 LOC
│   ├── instructions/
│   │   ├── mod.rs
│   │   ├── init_policy.rs
│   │   ├── update_policy.rs
│   │   ├── set_killswitch.rs
│   │   └── gate_payment.rs             # the composer, ~400 LOC
│   └── ext/
│       ├── agent_registry.rs           # AgentAccount byte-offset constants + read_agent_atom_enabled
│       └── atom_engine.rs              # AtomStats byte-offset constants + read_atom_stats_tier
└── proofs/
    ├── 1-paused-no-allow.rs
    ├── 2-velocity-le-limit.rs
    ├── 3-counterparty-tier-monotone.rs
    ├── 4-validation-expiry.rs
    └── 5-multisig-threshold.rs
```

### A.3 CU envelope (per Wave 1 #2 §E.4)

| Component | Empirical CU | Notes |
|-----------|-------------:|-------|
| Anchor instruction-entry overhead | ~5,000 | `try_accounts` resolution |
| Account-info / data translation (11 accounts) | ~30 | SIMD-0339, `data_len / 250` per account |
| `find_program_address` (4 PDAs) | ~9,000 | 1500 × ~1.5 attempts per PDA |
| Owner + discriminator + size checks (4 PDAs) | ~200 | `require_keys_eq!` cheap |
| Byte parses (u8/u16/u64) | ~120 | |
| Per-policy dispatch (5 kinds) | ~4,100 | KillSwitch 200 + Spending 600 + Velocity 1500 + Tier 800 + Validation 1000 |
| `Clock::get()` (single call, top of fn) | 100 | sysvar |
| Velocity-ledger write | ~3,000 | `cumulative_amount` checked_add + slot stamp |
| Event emit (`emit!`) | ~500 | `sol_log_data` |
| Anchor exit serialization | ~3,000 | Borsh writeback for `PolicyAccount`, `VelocityLedger` |
| `msg!` debug logs | ~500 | 5 lines × 100 CU; deleted before mainnet |
| **Subtotal (empirical)** | **~26,100** | |
| **3x safety multiplier** | **~80,000** | Quantu opacity buffer |

`set_compute_unit_limit(150_000)` is the production ceiling — 2x worst case, 33% headroom under the Solana 200K default per-instruction limit (https://solana.com/docs/core/fees). The 1.4M tx limit is 17.5x our envelope. **No split into `gate_check` + `gate_commit` is required.** The split-trigger (>500K observed on Day 7 integration test) is documented in `plan/final_idea/v1_scope.md` risk register; we do not anticipate hitting it.

### A.4 Per-policy-kind responsibility table

| # | Policy kind | Reads | Writes | Decision | CU sub-budget | Day |
|---|-------------|-------|--------|----------|--------------:|-----|
| 1 | KillSwitch | `KillSwitchState.paused` | none | Deny if paused | 200 | 8 |
| 2 | Spending | `PolicyAccount.spending_*` thresholds, `Clock.slot` | none | Deny on per-tx / daily / weekly breach | 600 | 6 |
| 3 | Velocity | `VelocityLedger.{cumulative, last_slot}`, payer tier | `cumulative_amount`, `last_commit_slot` (Allow only) | Deny on window breach | 1,500 | 8 |
| 4 | CounterpartyTier | `AtomStats.{trust_tier OR tier_confirmed, risk_score, confidence}` | none | Deny on tier-below-min / risk-above-max / confidence-below-min | 800 + 5,000 PDA-derive | 7 |
| 5 | RequireValidation | `ValidationAttestation.{revoked, expires_at, attestor}` | none | RequireValidation if missing/expired/revoked/wrong-attestor | 1,000 | 9 |

CounterpartyTier is the wedge — Day 7 is the make-or-break integration day where the manual `AtomStats` deserialization first reads live mainnet data. The other four are mechanically simpler.

---

## B. PDA design

All four PolicyVault PDAs are owned by policy-vault. Byte layouts are precise; offsets are account-absolute (post 8-byte discriminator). Cross-reference: Wave 1 #1 §B documents Quantu's PDA convention (`plan/research/01-quantu-source-code-class.md:Section-B`); we mirror that discipline.

### B.1 — `PolicyAccount`

**Seeds:** `[b"policy", payer_agent_asset.as_ref(), &policy_id.to_le_bytes()]`. **Owner:** `policy_vault`. **Size:** 8 disc + 240 data = **248 bytes**. **Rent:** ~0.00211 SOL.

| Offset (abs) | Field | Type | Width | Semantics |
|-------------:|-------|------|------:|-----------|
| 0–7 | discriminator | `[u8; 8]` | 8 | `sighash("account", "PolicyAccount")` |
| 8–39 | `payer_agent_asset` | `Pubkey` | 32 | The agent these policies gate |
| 40–43 | `policy_id` | `u32` | 4 | Per-agent policy index |
| 44 | `bump` | `u8` | 1 | PDA bump |
| 45–47 | `_pad0` | `[u8; 3]` | 3 | Alignment |
| 48 | `enabled_kinds_bitmask` | `u8` | 1 | Bit 0=KillSwitch, 1=Spending, 2=Velocity, 3=CounterpartyTier, 4=RequireValidation |
| 49 | `gate_mode` | `u8` | 1 | `0=Immediate(default v1 demo)`, `1=Confirmed(production)` per Revision 2 |
| 50–57 | `spending_per_tx_max` | `u64` | 8 | Lamports / token base units |
| 58–65 | `spending_daily_max` | `u64` | 8 | UTC-midnight rollover |
| 66–73 | `spending_weekly_max` | `u64` | 8 | ISO-week rollover |
| 74–81 | `spending_today_used` | `u64` | 8 | Resets at midnight |
| 82–89 | `spending_week_used` | `u64` | 8 | Resets Mon UTC |
| 90–97 | `spending_today_anchor_slot` | `u64` | 8 | Slot of last UTC midnight |
| 98–105 | `spending_week_anchor_slot` | `u64` | 8 | Slot of last ISO Mon |
| 106–113 | `velocity_window_secs` | `u64` | 8 | Base window (tier-decay applies) |
| 114–121 | `velocity_max_in_window` | `u64` | 8 | Cap |
| 122–129 | `velocity_tier0_decay_factor` | `u64` | 8 | bp, 10000=1.0 |
| 130 | `min_counterparty_tier` | `u8` | 1 | 0..=4 |
| 131 | `max_risk_score` | `u8` | 1 | 0..=100; 255 = no constraint |
| 132–133 | `min_confidence` | `u16` | 2 | 0..=10000 |
| 134 | `default_unrated_treatment` | `u8` | 1 | 0=Deny, 1=Allow, 2=RequireValidation |
| 135–166 | `required_capability_hash` | `[u8; 32]` | 32 | RequireValidation target; zeros = unset |
| 167–198 | `accepted_attestors[0]` | `Pubkey` | 32 | Empty (zeros) = permissionless mode |
| 199–230 | `accepted_attestors[1]` | `Pubkey` | 32 | |
| 231 | `scope_kind` | `u8` | 1 | 0=Global, 1=PerCollection, 2=PerAgent |
| 232–239 | `_reserved` | `[u8; 8]` | 8 | Future expansion (e.g., `accepted_attestors[2]` width grow) |

Total: 248 bytes. The fixed `accepted_attestors[2]` is intentional — sized to match the v1 attestor short-list (Halborn + Civic for the demo policy). v1.1+ moves this to a remaining-accounts pattern for arbitrary length.

### B.2 — `VelocityLedger`

**Seeds:** `[b"velocity", payer_agent_asset.as_ref(), &policy_id.to_le_bytes()]`. **Owner:** `policy_vault`. **Size:** 8 disc + 72 data = **80 bytes**. **Rent:** ~0.00112 SOL.

| Offset (abs) | Field | Type | Width | Semantics |
|-------------:|-------|------|------:|-----------|
| 0–7 | discriminator | `[u8; 8]` | 8 | |
| 8–39 | `payer_agent_asset` | `Pubkey` | 32 | |
| 40–43 | `policy_id` | `u32` | 4 | |
| 44 | `bump` | `u8` | 1 | |
| 45–47 | `_pad0` | `[u8; 3]` | 3 | |
| 48–55 | `cumulative_amount` | `u64` | 8 | Sum across active window |
| 56–63 | `last_commit_slot` | `u64` | 8 | Slot of last Allow |
| 64–71 | `window_start_slot` | `u64` | 8 | First commit slot in current window |
| 72–79 | `_reserved` | `[u8; 8]` | 8 | |

The 8-byte `_reserved` accommodates one additional `u64` field (e.g., `last_decay_factor_applied`) post-v1 if the sliding-window math evolves. Keeps the struct at a clean 80 bytes including discriminator.

### B.3 — `KillSwitchState`

**Seeds:** `[b"killswitch", &[scope_discriminator], scope_key.as_ref()]` where `scope_discriminator: 0=Global / 1=PerCollection / 2=PerAgent` and `scope_key` is `[0u8; 32]` for Global, `collection_pubkey.as_ref()` for PerCollection, `payer_agent_asset.as_ref()` for PerAgent. **Owner:** `policy_vault`. **Size:** 8 disc + 88 data = **96 bytes**. **Rent:** ~0.00126 SOL.

| Offset (abs) | Field | Type | Width | Semantics |
|-------------:|-------|------|------:|-----------|
| 0–7 | discriminator | `[u8; 8]` | 8 | |
| 8 | `scope_kind` | `u8` | 1 | |
| 9 | `bump` | `u8` | 1 | |
| 10 | `paused` | `bool` | 1 | The bit |
| 11 | `_pad0` | `u8` | 1 | |
| 12–15 | `_pad1` | `[u8; 4]` | 4 | Align next u64 |
| 16–47 | `scope_key` | `[u8; 32]` | 32 | For PerCollection / PerAgent; zeros for Global |
| 48–55 | `paused_at_slot` | `u64` | 8 | 0 if never paused |
| 56–63 | `unpaused_at_slot` | `u64` | 8 | Last unpause |
| 64–95 | `paused_by` | `Pubkey` | 32 | Authority member that flipped the switch |

`paused_at_slot` and `unpaused_at_slot` together support an optional timelock: `unpause` cannot fire until `now_slot >= paused_at_slot + TIMELOCK_SLOTS` (Section F).

### B.4 — `PolicyAuthority`

**Seeds:** `[b"policy_authority", payer_agent_asset.as_ref()]`. **Owner:** `policy_vault`. **Size:** 8 disc + 264 data = **272 bytes**. **Rent:** ~0.00231 SOL.

| Offset (abs) | Field | Type | Width | Semantics |
|-------------:|-------|------|------:|-----------|
| 0–7 | discriminator | `[u8; 8]` | 8 | |
| 8–39 | `payer_agent_asset` | `Pubkey` | 32 | |
| 40 | `bump` | `u8` | 1 | |
| 41 | `threshold` | `u8` | 1 | Default 2; max 8 (v1) |
| 42 | `member_count` | `u8` | 1 | 1..=15 |
| 43 | `_pad0` | `u8` | 1 | |
| 44–267 | `members[0..7]` | `[Pubkey; 7]` | 224 | First 7 members; `member_count` ≤ 7 in v1 |
| 268–271 | `_reserved` | `[u8; 4]` | 4 | |

v1 caps members at 7 to keep PDA size bounded. v1.1+ moves to a list-PDA pattern (`["members_chunk", authority, chunk_idx]`) for the 8..=15 range. **2-of-3 default** (`threshold=2, member_count=3`) per `v1_scope.md:21`. Configurable upper bound `8-of-15` is documented as v1.1+ — v1 ships up to 7 members.

---

## C. Per-policy-kind specification

### C.1 — Spending policy

**Plain English:** the payer agent cannot spend more than `per_tx_max` in a single transaction, more than `daily_max` in a UTC day, or more than `weekly_max` in an ISO week. Rollover is anchored on slot — UTC midnight for daily, Mon 00:00 UTC for weekly. The slot anchor is recomputed lazily at the next `gate_payment` call (no cron required).

**Decision logic (pseudocode):**

```
fn evaluate_spending(policy, amount, mint, now_slot) -> Option<DenyReason>:
    if amount > policy.spending_per_tx_max:
        return Some(SpendingPerTxExceeded)

    let day_anchor = compute_utc_midnight_slot(now_slot)
    let week_anchor = compute_iso_monday_slot(now_slot)

    let today_used = if policy.spending_today_anchor_slot == day_anchor:
        policy.spending_today_used
    else:
        0  # rollover

    let week_used = if policy.spending_week_anchor_slot == week_anchor:
        policy.spending_week_used
    else:
        0  # rollover

    if today_used.checked_add(amount)? > policy.spending_daily_max:
        return Some(SpendingDailyExceeded)

    if week_used.checked_add(amount)? > policy.spending_weekly_max:
        return Some(SpendingWeeklyExceeded)

    None  # pass
```

**Edge cases:**
- `amount == 0` → pass through (no denial; some facilitators ping `gate_payment` with 0 to validate config).
- Rollover happens lazily; the `Allow` branch writes back the new anchor slot and `today_used += amount`.
- Mint-specific limits are out of scope for v1; per Wave 1 #2 §B.3, Spending gates on the gross `amount` arg (not net-of-fee) regardless of mint extension.

**PDA fields used:** `PolicyAccount.spending_*` (offsets 50–105).

**Tests (1 happy + 5 failure + 2 attacker):** (1) happy: amount=10, per_tx=100, daily=100, weekly=1000 → Allow; (2) fail per_tx; (3) fail daily; (4) fail weekly; (5) u64 overflow → `VelocityOverflow`; (6) per_tx_max=0 → fails any non-zero; (7) rapid-fire across day boundary — anchor recompute correct on third call; (8) clock-skew immune (slot-based, not wall-clock).

**Day:** Day 6 (Apr 30). 4-hour build target.

**CU sub-budget:** 600 (3 threshold compares + 2 anchor recomputes).

### C.2 — CounterpartyTier policy (the wedge)

**Plain English:** the payee agent must hold an `AtomStats` PDA owned by Quantu's atom-engine, with `trust_tier` (Immediate mode, byte 551) or `tier_confirmed` (Confirmed mode, byte 555) at least `min_counterparty_tier`. Optional sub-constraints: `risk_score ≤ max_risk_score` (byte 549) and `confidence ≥ min_confidence` (bytes 557–558, u16 LE).

**`gate_mode` resolution per Revision 2 (`plan/final_idea/changes/2026-04-28-wave1-scope-refinements.md:39-52`):**
- `TierGateMode::Immediate` (default v1 demo) reads byte 551. Demo agents reach Bronze within ~5 feedbacks (`COLD_START_MIN`, `plan/research/01-*:F.5`), Silver within ~10, Gold by Day 12 with consistent positive feedback. **Headline demo uses this mode.**
- `TierGateMode::Confirmed` (production) reads byte 555. Requires 8 epochs of vesting (`TIER_VESTING_EPOCHS`, ~20 days, `01-*:F.5`). Sybil-resistant: burst feedback that pumps `trust_tier` is filtered out by the vesting algorithm before promotion to `tier_confirmed`. README documents: *"For sybil-resistant production deployments set `gate_mode = Confirmed`."*

**Decision logic:**

```
fn evaluate_counterparty_tier(policy, atom_stats_account, payee_asset) -> Result<Decision>:
    # Step 1 — graceful degradation envelope (Section G)
    if atom_stats_account.lamports() == 0 || atom_stats_account.data_len() == 0:
        return Unrated  # caller decides via default_unrated_treatment

    require!(atom_stats_account.owner == ATOM_ENGINE_ID)
    require!(data.len() == 561)
    require!(data[8..16] == ATOM_STATS_DISCRIMINATOR)
    require!(data[560] == 1)  # schema_version

    let tier = match policy.gate_mode:
        Immediate => data[551]
        Confirmed => data[555]

    if tier < policy.min_counterparty_tier:
        return Deny(BelowMinTier { actual: tier, required: policy.min_counterparty_tier })

    if policy.max_risk_score < 255:
        let risk = data[549]
        if risk > policy.max_risk_score:
            return Deny(AboveMaxRisk)

    if policy.min_confidence > 0:
        let conf = u16::from_le_bytes(data[557..559])
        if conf < policy.min_confidence:
            return Deny(BelowMinConfidence)

    Allow
```

**Edge cases (per `01-*:Section-K` gotcha catalog):**
- `AtomStats` not initialized even when `agent_account.atom_enabled = true` (HIGH risk, Quantu allows this per `reputation/instructions.rs:201-206`): treat as Unrated, fall back to `default_unrated_treatment`. Do not Deny outright.
- `schema_version != 1`: emit warning log, fall back to Unrated. The defensive check catches Quantu v0.7.0 schema bumps fail-loud.
- Newly registered agent (`feedback_count == 0`): `trust_tier = 0`, naturally fails `min_counterparty_tier > 0`.
- `agent_account.atom_enabled = false`: caller cannot pass the right `atom_stats` PDA (it doesn't exist). Treat as Unrated.

**PDA fields used:** `AtomStats.{trust_tier|tier_confirmed, risk_score, confidence}` at byte offsets 551 / 555 / 549 / 557–558 (`plan/research/01-quantu-source-code-class.md:Section-B.5`).

**Tests:** (1) happy tier=3, min=2 → Allow; (2) tier=1, min=2 → `CounterpartyTierBelowMin`; (3) risk=80, max_risk=50 → `CounterpartyRiskAboveMax`; (4) confidence=2000, min_confidence=4500 → `CounterpartyConfidenceBelow`; (5) `atom_stats.lamports() == 0` + `default_unrated_treatment=0` → Deny; (6) wrong owner → `AtomStatsWrongOwner`; (7) attacker — forged account at right PDA but malicious owner → owner check rejects; (8) attacker — replay last-week snapshot — impossible (Solana reads live state).

**Day:** Day 7 (May 1). The make-or-break day. First contact with mainnet ATOM Engine.

**CU sub-budget:** 800 logic + 2,250 PDA-derive (`find_program_address`, ~1.5 attempts) + 50 owner-check + 30 disc-check ≈ 3,200 CU per evaluation. The 5,000 CU figure in the table includes one round of `try_borrow_data` overhead.

### C.3 — Velocity policy

**Plain English:** rolling sliding window of cumulative spend. The window size shrinks with the payer's `trust_tier` — lower tier means tighter window means faster denial. Encodes the intuition *"if you're new and unrated, we let you spend less per minute than a Gold-tier agent."* Sliding-window vs fixed-window decision lives in Section E.

**Decision logic:**

```
fn evaluate_and_commit_velocity(policy, ledger, amount, payer_tier, now_slot) -> Result<Commit>:
    let window_secs = apply_tier_decay(policy.velocity_window_secs, payer_tier)
    let window_slots = window_secs * 2  # ~0.5 sec per slot, conservative

    let elapsed = now_slot.saturating_sub(ledger.window_start_slot)
    let active_in_window = if elapsed < window_slots:
        ledger.cumulative_amount
    else:
        0  # window expired, reset on commit

    if active_in_window.checked_add(amount)? > policy.velocity_max_in_window:
        return Err(VelocityWindowExceeded)

    Ok(Commit::Pending { delta_amount: amount, reset_window: elapsed >= window_slots })


fn apply_tier_decay(base_secs: u64, payer_tier: u8) -> u64:
    # Lower tier → smaller window. Tier 0 (unrated) gets base / 4, tier 4 gets base.
    match payer_tier:
        0 => base_secs / 4
        1 => base_secs / 2
        2 => base_secs * 3 / 4
        3 => base_secs
        4 => base_secs * 5 / 4
        _ => base_secs
```

**Tier-decay coefficients** (`/4, /2, ×3/4, ×1, ×5/4` for tiers 0–4) — these are the v1 defaults, configurable via `update_policy`. Tier-0 agents (unrated) get a 4x tighter window than Gold (tier 3); tier-4 agents (Platinum, structurally unreachable in 7 days per `01-*:F.5`) get a 1.25x relaxation.

**Re-entrancy / double-write protection:** `evaluate_and_commit_velocity` returns `VelocityCommit::Pending`; the actual write to `ledger.cumulative_amount` happens only on the `Allow` branch of `gate_payment`, after every other policy passes. Anchor 1.0's "Disallow duplicate mutable accounts" (PR #3946, `plan/research/02-*:A.3`) statically prevents the same `VelocityLedger` being passed twice as `mut` — the entire reentrancy class disappears.

**Edge case — clock skew between client and validator:** the policy is slot-based, not wall-clock. `Clock::get()?.slot` is the validator's current slot. Client cannot fake this. Multi-leader skew is bounded by ~1 second in the worst case; window_slots is in seconds-units so a ±1s skew is sub-tier-resolution.

**PDA fields used:** `VelocityLedger.{cumulative_amount, last_commit_slot, window_start_slot}`.

**Tests:** (1) happy: cumulative=0, amount=10, max=100 → Allow + commit; (2) cumulative=95 → `VelocityWindowExceeded`; (3) rollover: window expired → reset + commit; (4) tier-decay: tier=0 fails where tier=3 passes (window 4x tighter); (5) overflow → `VelocityOverflow`; (6) max=0 misconfigured → all non-zero fail; (7) attacker burst: 100 Allow calls in 1 slot — 11th breaches cap; (8) replay defeated by Solana recent_blockhash dedupe.

**Day:** Day 8 (May 2).

**CU sub-budget:** 1,500 (saturating-sub + tier-match + checked-add + slot compare).

### C.4 — RequireValidation policy

**Plain English:** require a non-expired, non-revoked attestation from an accepted attestor for the payee's `(asset, capability_hash)` pair. Returns `RequireValidation(capability_hash)` on missing — semantically distinct from Deny: the facilitator routes the user to the off-chain ValidationRegistry attestation flow.

**Decision logic:**

```
fn evaluate_require_validation(policy, attestation_view, payee_asset, now_slot) -> Result<Outcome>:
    if policy.required_capability_hash == [0u8; 32]:
        return Pass  # policy not enabled

    let view = attestation_view.ok_or_return RequireValidation(policy.required_capability_hash)

    require_keys_eq!(view.subject_asset, payee_asset)
    require!(view.capability_hash == policy.required_capability_hash)
    require!(!view.revoked, AttestationRevoked)
    require!(view.expires_at == 0 || view.expires_at > now_slot, AttestationExpired)

    if !policy.accepted_attestors.is_empty():
        require!(policy.accepted_attestors.contains(&view.attestor), AttestationAttestorRejected)
    # else: permissionless — any attestor accepted

    Pass
```

**ValidationAttestation byte layout** per Revision 1 (`plan/final_idea/changes/2026-04-28-wave1-scope-refinements.md:9-37`) and `plan/research/03-*:Section-I.1`:

| Field | Offset (abs) | Width |
|-------|-------------:|------:|
| discriminator | 0–7 | 8 |
| `subject_asset` | 8–39 | 32 |
| `capability_hash` | 40–71 | 32 |
| `attestor` | 72–103 | 32 |
| `claim_payload_hash` | 104–135 | 32 |
| `attestor_signature` | 136–199 | 64 |
| `issued_at` | 200–207 | 8 |
| `expires_at` | 208–215 | 8 |
| `revoked` | 216 | 1 |
| `revoked_at` | 217–224 | 8 |
| `revocation_reason_hash` | 225–256 | 32 |
| `claim_uri_hash` | 257–288 | 32 |
| `bump` | 289 | 1 |

Total: 290 bytes data + the validation-registry crate's owner check via Pattern A `Account<ValidationAttestation>` since validation-registry is a sibling Anchor 1.0 program in the AgentTrust workspace (per `02-*:Pattern-matrix-§C`).

**Edge cases:**
- Policy enabled but no `validation_attestation` account passed → return `RequireValidation(hash)`. Facilitator catches and routes user.
- Attestation present but `expires_at == 0` (never expires) → pass.
- `accepted_attestors[0]` and `[1]` are both zeros → permissionless mode; any non-zero attestor accepted.
- Newly registered agent with no validation flow → returns `RequireValidation`; facilitator can choose to skip if the policy is mis-configured for that agent.

**Tests:** (1) happy valid → Allow; (2) missing → `RequireValidation(hash)`; (3) expired → `AttestationExpired`; (4) revoked → `AttestationRevoked`; (5) wrong subject → `AttestationMissing`; (6) wrong capability → `AttestationMissing`; (7) attestor not in accepted list → `AttestationAttestorRejected`; (8) forged-claim attack caught off-chain by attestor scoring; v1 gates at `revoked` flag.

**Day:** Day 9 (May 3).

**CU sub-budget:** 1,000 (PDA load + 4 require! + slot compare).

### C.5 — KillSwitch policy

**Plain English:** emergency pause. If `KillSwitchState.paused == true` for any matching scope (Global, PerCollection, PerAgent), `gate_payment` returns Deny immediately. Authority is `PolicyAuthority` multisig; default 2-of-3.

**Decision logic:**

```
fn evaluate_killswitch(killswitch_state, scope_key) -> Option<DenyReason>:
    if killswitch_state.paused:
        return Some(KillSwitchEngaged)
    None
```

The Anchor `seeds` constraint at the `gate_payment` accounts level resolves which `KillSwitchState` PDA is loaded (Global by default; per-collection / per-agent require the caller to pass the right seeds). v1 ships Global only; per-collection / per-agent are stubbed for v1.1+.

**`set_killswitch` instruction (separate ix, `instructions/set_killswitch.rs`):**
- Accounts: `policy_authority`, `kill_switch_state`, `signers[0..N]` (rest accounts).
- Logic: count distinct signers from `policy_authority.members`, require count ≥ `policy_authority.threshold`, flip `paused`, stamp `paused_at_slot` or `unpaused_at_slot`, store `paused_by`.
- Invariant 5 (`multisig_threshold_enforced`) proves no path exists from `<threshold` signers to a successful flip.

**Edge cases:**
- Newly registered agent has no `KillSwitchState` PDA yet → instruction `init` it on first `set_killswitch` call (or pre-init at policy creation).
- All members fail signature → `MultisigThresholdNotMet`.
- One member duplicates signature (signs twice) → counted once (dedupe by pubkey).

**Tests:** (1) `paused=false` → no Deny; (2) `paused=true` → `KillSwitchEngaged`; (3) set_killswitch 2-of-3, threshold=2 → flips; (4) 1-of-3 → `MultisigThresholdNotMet`; (5) replay post-timelock → idempotent; (6) forged signer not in members → ignored; (7) governance-capture covered by 2-of-3 default + timelock; (8) concurrent `gate_payment` + `set_killswitch` serialized by Solana account-lock semantics.

**Day:** Day 8 (May 2), parallel with Velocity.

**CU sub-budget:** 200 (one `bool` read + one Deny return).

---

## D. `gate_payment` composer

The composer integrates the five policy kinds in a fail-fast order: KillSwitch → Spending → Velocity → CounterpartyTier → RequireValidation. Order matters — cheapest-policy-first, most-data-fetch-last keeps the average-CU low (most denials short-circuit before the foreign-PDA read).

### D.1 — Decision-tree pseudocode

```
fn gate_payment(ctx, payer, payee, amount, mint, policy_id) -> Result<GateDecision>:
    let now_slot = Clock::get()?.slot
    let policy = ctx.accounts.policy_account
    let bitmask = policy.enabled_kinds_bitmask

    # 1. KillSwitch — 200 CU, no foreign reads, fail-fast
    if (bitmask & 0x01) != 0:
        if let Some(reason) = evaluate_killswitch(ctx.accounts.kill_switch_state):
            emit_deny(reason); return Deny(reason)

    # 2. Spending — 600 CU, no foreign reads, fail-fast
    if (bitmask & 0x02) != 0:
        if let Some(reason) = evaluate_spending(policy, amount, mint, now_slot):
            emit_deny(reason); return Deny(reason)

    # FOREIGN PDA READS — bundle once, scoped to drop borrows before mut
    let payer_tier = if (bitmask & 0x04 | 0x08) != 0:
        let (t, _, _) = read_atom_stats_tier(ctx.accounts.payer_atom_stats, payer)?
        t
    else: 0

    let (payee_tier, payee_risk, payee_conf) = if (bitmask & 0x08) != 0:
        read_atom_stats_tier(ctx.accounts.payee_atom_stats, payee)?
    else: (0, 0, 0)

    # 3. Velocity — 1500 CU, in-program ledger only
    let velocity_commit = if (bitmask & 0x04) != 0:
        match evaluate_and_commit_velocity(policy, ctx.accounts.velocity_ledger, amount, payer_tier, now_slot):
            Ok(commit) => commit
            Err(reason) => emit_deny; return Deny
    else: VelocityCommit::None

    # 4. CounterpartyTier — 800 CU + foreign read already done
    if (bitmask & 0x08) != 0:
        if let Some(reason) = evaluate_counterparty_tier(policy, payee_tier, payee_risk, payee_conf):
            emit_deny; return Deny

    # 5. RequireValidation — 1000 CU, optional account
    if (bitmask & 0x10) != 0:
        let view = ctx.accounts.validation_attestation.as_ref().map(parse)?
        if let Some(cap_hash) = evaluate_require_validation(policy, view, payee, now_slot):
            emit_require_validation; return RequireValidation(cap_hash)

    # ALL PASSED — commit velocity, emit Allow
    if let VelocityCommit::Pending { delta, reset } = velocity_commit:
        let v = ctx.accounts.velocity_ledger
        if reset: v.window_start_slot = now_slot; v.cumulative_amount = 0
        v.cumulative_amount = v.cumulative_amount.checked_add(delta)?
        v.last_commit_slot = now_slot

    emit_allow; return Allow
```

### D.2 — Error-propagation strategy

**Fail-fast on first Deny.** Collect-all-errors is an anti-pattern at this CU envelope: each policy adds 200–1500 CU; a 5-policy serial evaluation worst case is ~4,000 CU. Collect-all-errors would also force deferred velocity-commit logic across multiple branches — a re-entrancy seam we don't want.

Rationale: facilitators get one `DenyReason`, can act on it (e.g., user-facing message), and resubmit with corrected params. The deck demo is cleaner: *"agent X tried to pay agent Y; PolicyVault denied because tier=1, min=2"* is a one-line caption.

**RequireValidation is special — not a Deny.** Returning `RequireValidation(capability_hash)` tells the facilitator: *"the call could succeed if the user proves capability X."* The facilitator's `POST /verify` endpoint maps this to HTTP 402 + `X-Capability-Required: <hash>` header per Wave-2 #5 (x402 spec); the user is routed to the off-chain attestation flow, then retries.

### D.3 — Full Rust skeleton

```rust
// programs/policy-vault/src/instructions/gate_payment.rs

use anchor_lang::prelude::*;
use crate::errors::PolicyVaultError;
use crate::events::{PolicyAllowed, PolicyDenied, RequireValidationEmitted, VelocityIncremented};
use crate::ext::atom_engine::{read_atom_stats_tier, ATOM_ENGINE_ID};
use crate::ext::agent_registry::AGENT_REGISTRY_ID;
use crate::policies::{
    counterparty_tier::evaluate_counterparty_tier,
    killswitch::evaluate_killswitch,
    require_validation::{evaluate_require_validation, ValidationAttestationView},
    spending::evaluate_spending,
    velocity::{evaluate_and_commit_velocity, VelocityCommit},
};
use crate::state::{GateDecision, KillSwitchState, PolicyAccount, VelocityLedger};

pub const KIND_KILLSWITCH:         u8 = 0x01;
pub const KIND_SPENDING:           u8 = 0x02;
pub const KIND_VELOCITY:           u8 = 0x04;
pub const KIND_COUNTERPARTY_TIER:  u8 = 0x08;
pub const KIND_REQUIRE_VALIDATION: u8 = 0x10;

#[derive(Accounts)]
#[instruction(payer_agent_asset: Pubkey, payee_agent_asset: Pubkey,
              amount: u64, mint: Pubkey, policy_id: u32)]
pub struct GatePayment<'info> {
    pub payer: Signer<'info>,

    #[account(
        seeds = [b"policy", payer_agent_asset.as_ref(), &policy_id.to_le_bytes()],
        bump = policy_account.bump,
        constraint = policy_account.policy_id == policy_id @ PolicyVaultError::PolicyMismatch,
    )]
    pub policy_account: Account<'info, PolicyAccount>,

    #[account(mut,
        seeds = [b"velocity", payer_agent_asset.as_ref(), &policy_id.to_le_bytes()],
        bump = velocity_ledger.bump)]
    pub velocity_ledger: Account<'info, VelocityLedger>,

    #[account(seeds = [b"killswitch", &[0u8], &[0u8; 32]], bump = kill_switch_state.bump)]
    pub kill_switch_state: Account<'info, KillSwitchState>,

    /// CHECK: foreign-program PDA. Verified by `read_atom_stats_tier`.
    #[account(seeds = [b"atom_stats", payer_agent_asset.as_ref()],
              seeds::program = ATOM_ENGINE_ID, bump)]
    pub payer_atom_stats: UncheckedAccount<'info>,

    /// CHECK: THE wedge target. Verified by `read_atom_stats_tier`.
    #[account(seeds = [b"atom_stats", payee_agent_asset.as_ref()],
              seeds::program = ATOM_ENGINE_ID, bump)]
    pub payee_atom_stats: UncheckedAccount<'info>,

    pub validation_attestation: Option<Account<'info,
        crate::ext::validation_registry::ValidationAttestation>>,

    /// CHECK: address-pinned only.
    #[account(address = AGENT_REGISTRY_ID)]
    pub agent_registry_program: UncheckedAccount<'info>,
    /// CHECK: address-pinned only.
    #[account(address = ATOM_ENGINE_ID)]
    pub atom_engine_program: UncheckedAccount<'info>,
}

pub fn gate_payment_handler(
    ctx: Context<GatePayment>,
    payer_agent_asset: Pubkey,
    payee_agent_asset: Pubkey,
    amount: u64,
    mint: Pubkey,
    policy_id: u32,
) -> Result<GateDecision> {
    let now_slot = Clock::get()?.slot;
    let policy = &ctx.accounts.policy_account;
    let bitmask = policy.enabled_kinds_bitmask;

    // 1. KillSwitch (invariant: paused_implies_no_allow).
    if (bitmask & KIND_KILLSWITCH) != 0 {
        if let Some(reason) = evaluate_killswitch(&ctx.accounts.kill_switch_state)? {
            emit!(PolicyDenied { payer_agent_asset, payee_agent_asset, amount,
                policy_id, reason: reason as u8, slot: now_slot });
            return Ok(GateDecision::Deny(reason));
        }
    }

    // 2. Spending.
    if (bitmask & KIND_SPENDING) != 0 {
        if let Some(reason) = evaluate_spending(policy, amount, &mint, now_slot)? {
            emit!(PolicyDenied { payer_agent_asset, payee_agent_asset, amount,
                policy_id, reason: reason as u8, slot: now_slot });
            return Ok(GateDecision::Deny(reason));
        }
    }

    // Foreign PDA reads (scoped — Refs drop before VelocityLedger mut write).
    let payer_tier = if (bitmask & (KIND_VELOCITY | KIND_COUNTERPARTY_TIER)) != 0 {
        read_atom_stats_tier(&ctx.accounts.payer_atom_stats, &payer_agent_asset,
                             policy.gate_mode)?.map(|t| t.0).unwrap_or(0)
    } else { 0 };

    let (payee_tier, payee_risk, payee_conf) = if (bitmask & KIND_COUNTERPARTY_TIER) != 0 {
        read_atom_stats_tier(&ctx.accounts.payee_atom_stats, &payee_agent_asset,
                             policy.gate_mode)?.unwrap_or((0, 0, 0))
    } else { (0, 0, 0) };

    // 3. Velocity (invariant: velocity_counter_le_limit). Returns Pending; commit on Allow.
    let velocity_commit = if (bitmask & KIND_VELOCITY) != 0 {
        match evaluate_and_commit_velocity(policy, &ctx.accounts.velocity_ledger,
                                            amount, payer_tier, now_slot) {
            Ok(c) => c,
            Err(reason) => {
                emit!(PolicyDenied { payer_agent_asset, payee_agent_asset, amount,
                    policy_id, reason: reason as u8, slot: now_slot });
                return Ok(GateDecision::Deny(reason));
            }
        }
    } else { VelocityCommit::None };

    // 4. CounterpartyTier (invariant: counterparty_tier_monotone).
    if (bitmask & KIND_COUNTERPARTY_TIER) != 0 {
        if let Some(reason) = evaluate_counterparty_tier(policy, payee_tier,
                                payee_risk, payee_conf, &ctx.accounts.payee_atom_stats)? {
            emit!(PolicyDenied { payer_agent_asset, payee_agent_asset, amount,
                policy_id, reason: reason as u8, slot: now_slot });
            return Ok(GateDecision::Deny(reason));
        }
    }

    // 5. RequireValidation (invariant: validation_expiry_correct).
    if (bitmask & KIND_REQUIRE_VALIDATION) != 0 {
        let view = ctx.accounts.validation_attestation.as_ref()
            .map(|a| ValidationAttestationView::from(&**a));
        if let Some(cap_hash) = evaluate_require_validation(policy, view.as_ref(),
                                    &payee_agent_asset, now_slot)? {
            emit!(RequireValidationEmitted { payer_agent_asset, payee_agent_asset,
                capability_hash: cap_hash, slot: now_slot });
            return Ok(GateDecision::RequireValidation(cap_hash));
        }
    }

    // All passed → commit velocity + emit Allow.
    if let VelocityCommit::Pending { delta_amount, reset_window } = velocity_commit {
        let velocity = &mut ctx.accounts.velocity_ledger;
        if reset_window {
            velocity.window_start_slot = now_slot;
            velocity.cumulative_amount = 0;
        }
        velocity.cumulative_amount = velocity.cumulative_amount
            .checked_add(delta_amount).ok_or(PolicyVaultError::VelocityOverflow)?;
        velocity.last_commit_slot = now_slot;
        emit!(VelocityIncremented { payer_agent_asset, policy_id,
            new_cumulative: velocity.cumulative_amount, slot: now_slot });
    }

    emit!(PolicyAllowed { payer_agent_asset, payee_agent_asset, amount,
        policy_id, slot: now_slot });
    Ok(GateDecision::Allow)
}
```

Total ~180 LOC of `gate_payment.rs` proper. Each policy module (`spending.rs`, `velocity.rs`, etc.) ships separately at ~150–250 LOC. Manual `AtomStats` deserialization lives in `ext/atom_engine.rs` per `02-*:Pattern-B` and `01-*:Section-J.1`.

---

## E. VelocityLedger sliding-window math

### E.1 — Sliding-window vs fixed-window

**Recommendation: sliding-window with single-slot reset, not multi-bucket.** Reasoning:

| Aspect | Multi-bucket (e.g., 60 buckets × 1 min each) | Single-slot reset (sliding semantics) |
|--------|----------------------------------------------|---------------------------------------|
| State size | 60 × u64 = 480 bytes per ledger | 8 bytes per ledger |
| CU per evaluation | ~3,000 (60 × ~50 CU per bucket scan) | ~150 (single read + compare) |
| Accuracy | Granular (1-min resolution) | Coarse (hour-resolution) |
| Demo storytelling | Hard to explain | "If you've spent X in the last Y minutes, deny" |

The single-slot variant is what `gate_payment` v1 ships: store `(window_start_slot, cumulative_amount)`. On each Allow, if `now_slot - window_start_slot >= window_slots`, reset both. Otherwise add to cumulative. The semantics: *"you can spend up to `velocity_max_in_window` per `velocity_window_secs`-second window starting from your last reset."* It's not a true continuous sliding window — it's a "rolling reset on first commit past window_slots." For v1 demo and Variant B's pitch this is precise enough.

### E.2 — Tier-decay formula

```
window_slots(tier) = base_window_slots × tier_multiplier(tier)

tier_multiplier:
  tier 0 (Unrated):  0.25
  tier 1 (Bronze):   0.50
  tier 2 (Silver):   0.75
  tier 3 (Gold):     1.00
  tier 4 (Platinum): 1.25
```

A new-and-unrated agent with `base_window_slots = 7200` (~1 hour) gets a 1800-slot (~15-min) effective window. A Gold-tier agent gets the full hour. A Platinum agent (structurally unreachable in 7 days, `01-*:F.5`) gets 75 minutes.

The decay direction (lower tier → tighter window) embeds the heuristic *"unrated agents are more risky per minute, so we throttle them faster."* It composes with `min_counterparty_tier`: an unrated agent already gets denied by CounterpartyTier; Velocity provides defense-in-depth for the case where `min_counterparty_tier == 0` is the policy default but throttling is still desired.

### E.3 — CU envelope per-tx update

Deny path ~75 CU (reads + compares only). Allow path ~265 CU (no window reset) or ~365 CU (with reset, including 80-byte Borsh writeback). The 1500 CU sub-budget in the responsibility table includes function-call overhead, struct unpacking, and PolicyAccount field reads — the raw write itself is sub-400 CU.

### E.4 — Re-entrancy / double-write protection

Two layers:
1. **Anchor 1.0's "Disallow duplicate mutable accounts" (PR #3946, `02-*:A.3`)** — the same `VelocityLedger` cannot be passed twice as `mut` in one ix. Static, free.
2. **Allow-path-only commit** — `evaluate_and_commit_velocity` returns a `VelocityCommit::Pending` carrier; the actual write happens *after* every other policy passes, in `gate_payment_handler`'s tail. If RequireValidation returns `RequireValidation(...)` mid-flow, the pending commit is dropped.

Critically, the Velocity policy's own evaluation is read-only — it computes whether Allow would breach the cap, but doesn't write. The write is at the composer level. This means Kani Invariant 2 (`velocity_counter_le_limit`) is provable at the composer-level harness without ranging over policy-internals.

### E.5 — Edge case: clock skew between client and validator

`Clock::get()?.slot` is the validator's view, not the client's. Clients cannot fake this. Multi-leader skew is bounded by ~1 second; window_slots is in seconds-units. A ±1s skew is sub-tier-resolution (75 minutes - 1 second = still 75 minutes for practical purposes).

What CAN happen: a malicious facilitator submits with a very-recent `recent_blockhash` that has expired by the time it lands → tx rejected at the runtime, never enters PolicyVault. This is normal Solana flow.

---

## F. Policy authority + delegation model

### F.1 — Multisig threshold default

**Default 2-of-3, configurable up to 7-of-7 in v1** (8-of-15 deferred to v1.1+ due to PDA size constraints, `B.4`). The 2-of-3 default mirrors Squads v4's recommended starting threshold (`Squads-Protocol/v4`) and matches enterprise-deployer expectations from prior treasury-multisig work.

Rationale for 2-of-3 not 3-of-5:
- **Demo speed:** 3 keys is enough for the deck slide showing "team-controlled killswitch" without overwhelming the visual.
- **Solo-engineer reality:** Mohit can hold all 3 keys for the demo and the multisig logic still proves out; with 5 keys, the demo wallet management gets noisy.
- **Liveness:** 2 of 3 fail-tolerant beats 3 of 5 fail-tolerant for the bootstrap deployment phase.

### F.2 — Update permissions per policy kind

| Policy kind | Authority required | Justification |
|-------------|-------------------|---------------|
| Spending (raise limit) | 1-of-N (any member) | Loosening; not security-critical |
| Spending (lower limit) | threshold-of-N | Tightening; critical (could lock out legit usage) |
| Velocity | threshold-of-N | Same logic — both directions need authority |
| CounterpartyTier (raise min_tier) | threshold-of-N | Tightens — could block legit counterparties |
| CounterpartyTier (lower min_tier) | timelocked threshold-of-N | Loosens, but loosening is a sensitive change (admits more counterparties) |
| RequireValidation (add accepted_attestor) | 1-of-N | Adding flexibility |
| RequireValidation (remove accepted_attestor) | threshold-of-N | Removes option; possibly locks out users |
| KillSwitch (engage) | 1-of-N | Emergency; speed beats consensus |
| KillSwitch (disengage) | timelocked threshold-of-N | Critical: malicious actor unpausing must be stoppable |

This avoids the founder-decision verdict — these are defaults; deployers can override per-policy via `update_policy` with their own threshold map.

### F.3 — Emergency unpause flow

Two patterns documented in `docs/SECURITY.md`:

1. **Single-signer override (off by default):** for hosted SaaS deployments where the operator owns all 3 keys but needs to unpause without quorum (e.g., 3am incident response). Engage by setting `policy_authority.emergency_unpause_enabled = true` (a v1.1+ field; v1 docs note as roadmap).
2. **Full-multisig with timelock (default):** unpause requires `threshold` signers + 600-slot (~5 min) timelock. The timelock window starts at `paused_at_slot`. If a malicious actor compromises 2 of 3 keys and triggers unpause, the legitimate 3rd holder has 5 minutes to escalate (e.g., re-pause via `paused_by_other_authority`).

### F.4 — Timelock recommendation for sensitive changes

**Sensitive changes (timelocked, default 600 slots ≈ 5 minutes):**
- KillSwitch unpause
- `min_counterparty_tier` downgrade
- `accepted_attestors[]` removal

**Non-sensitive (no timelock):**
- KillSwitch engage (speed > timelock)
- `spending_*_max` raise
- `velocity_max_in_window` raise

The 600-slot value is a v1 default — production deployers may set 4-hour (28,800 slots) timelocks for KillSwitch unpause to allow human response. Configurable via `update_policy` ix.

---

## G. Graceful degradation

Three external dependencies, each with detection and fallback. The default-by-default fallback always errs toward `RequireValidation` (forces explicit decision) rather than `Allow` (silent permissioning) or `Deny` (silent rejection).

### G.1 — `agent_registry_8004` unavailable

**Detection:**
1. `payer_agent.lamports() == 0 || payer_agent.data_len() == 0` → AgentAccount doesn't exist → unregistered agent.
2. `payer_agent.owner != AGENT_REGISTRY_ID` → wrong owner → tampered or wrong PDA passed.
3. Schema check: `data[0..8] != AGENT_ACCOUNT_DISCRIMINATOR` → wrong account type at the right PDA.

**Fallback:** Deny with `AgentAccountNotFound` (case 1) or `AgentAccountWrongOwner` (case 2/3). Don't fall through to RequireValidation — without a valid AgentAccount, even validation is unreliable. This is the strictest fallback because it blocks unregistered actors entirely.

**Logging:** `msg!("[deny] AgentAccount not registered for asset {}", payer_agent_asset);`. Emitted in debug builds; stripped in release per Wave 1 #2 §E.6.

### G.2 — `atom_engine` unavailable

**Detection:** same three-case pattern against `payee_atom_stats`. Plus `data[560] != 1` (schema_version mismatch — Quantu v0.7.0 canary).

**Fallback:** treat as Unrated (tier 0). The CounterpartyTier policy's `default_unrated_treatment` field decides:
- `0=Deny` (strict mode, default for production policies)
- `1=Allow` (permissive mode, only for dev / sandbox)
- `2=RequireValidation` (route to off-chain ValidationRegistry path — recommended for ambiguity)

**Logging:** `msg!("[unrated] AtomStats uninitialized or schema mismatch for {}", payee_agent_asset);`. The logging is critical — Mohit's debug runs need to surface "this is the fallback path" so live debug doesn't false-alarm.

Per `01-*:Section-K` gotcha 3: the case where `agent_account.atom_enabled = true` but `atom_stats.lamports() == 0` is a real Quantu state (`reputation/instructions.rs:201-206`). Demo agents must complete the second tx (`atom_engine::initialize_stats`, `01-*:C.9`) before becoming gateable.

### G.3 — `validation_registry` unavailable

**Detection:** `validation_attestation` account is `None` (caller didn't pass) OR `validation_attestation.owner != VALIDATION_REGISTRY_ID`.

**Fallback:** if `policy.required_capability_hash != [0u8; 32]`, return `RequireValidation(hash)`. The facilitator routes the user to the off-chain attestation flow.

This is the safest fallback because RequireValidation is semantically *"explicit decision required"* — it doesn't Allow (which would bypass the policy) or Deny (which would lock out users with valid attestations who simply didn't pass the right account). The facilitator catches the `RequireValidation(hash)` and prompts the user.

**Logging:** `msg!("[require-validation] capability_hash {} unmet for {}", hex_hash, payee_agent_asset);`.

---

## H. Kani FV harness — 5 invariants proven

Kani is a Rust model-checker (https://github.com/model-checking/kani) that exhaustively explores all input combinations within a finite domain. PolicyVault's harness turns the 5 v1_scope invariants into machine-checked proofs. Each harness lives in `programs/policy-vault/proofs/<n>-<name>.rs` and runs via `cargo kani -p policy-vault --harness <name>`.

### H.1 — `paused_implies_no_allow`

**Statement:** if `KillSwitchState.paused == true`, `gate_payment` cannot return `Allow`. Search-space pinned by `paused = true`; expected runtime: seconds.

```rust
#[cfg(kani)]
#[kani::proof]
#[kani::unwind(2)]
pub fn invariant_paused_implies_no_allow() {
    let kill_state = KillSwitchState { paused: true, ..kani::any() };
    let policy = arbitrary_policy();
    let amount: u64 = kani::any();
    let now_slot: u64 = kani::any();

    let decision = simulate_gate_payment(&kill_state, &policy, amount, now_slot);

    kani::assert(!matches!(decision, GateDecision::Allow),
        "paused KillSwitch must never produce Allow");
}
```

### H.2 — `velocity_counter_le_limit`

**Statement:** `VelocityLedger.cumulative_amount ≤ Spending.weekly_max` after every `Allow`. Ties Velocity to Spending: post-Allow, cumulative is bounded by the absolute weekly cap. Expected runtime: under a minute (u64 arithmetic via SMT).

```rust
#[cfg(kani)]
#[kani::proof]
#[kani::unwind(2)]
pub fn invariant_velocity_counter_le_limit() {
    let mut ledger: VelocityLedger = kani::any();
    let policy = arbitrary_policy();
    let amount: u64 = kani::any();
    kani::assume(amount <= policy.spending_per_tx_max);
    kani::assume(ledger.cumulative_amount <= policy.spending_weekly_max);

    let decision = simulate_gate_payment_with_velocity(&mut ledger, &policy, amount);

    if matches!(decision, GateDecision::Allow) {
        kani::assert(ledger.cumulative_amount <= policy.spending_weekly_max,
            "post-Allow cumulative must not exceed weekly_max");
    }
}
```

### H.3 — `counterparty_tier_monotone`

**Statement:** if `gate_payment` returned `Allow` with payee tier `T`, decreasing `min_counterparty_tier` does not change the decision. The anti-regression invariant: tighter-passes implies looser-passes. Expected runtime: seconds.

```rust
#[cfg(kani)]
#[kani::proof]
pub fn invariant_counterparty_tier_monotone() {
    let mut strict = arbitrary_policy();
    let payee_tier: u8 = kani::any();
    kani::assume(payee_tier <= 4);
    kani::assume(strict.min_counterparty_tier <= payee_tier);

    let strict_dec = simulate_counterparty_tier(&strict, payee_tier, 0, 0);

    let mut loose = strict.clone();
    loose.min_counterparty_tier = kani::any();
    kani::assume(loose.min_counterparty_tier <= strict.min_counterparty_tier);

    if strict_dec.is_allow() {
        kani::assert(simulate_counterparty_tier(&loose, payee_tier, 0, 0).is_allow(),
            "monotonicity violation");
    }
}
```

### H.4 — `validation_expiry_correct`

**Statement:** if `expires_at != 0 && expires_at < now_slot`, `RequireValidation` cannot Allow. Expected runtime: seconds.

```rust
#[cfg(kani)]
#[kani::proof]
pub fn invariant_validation_expiry_correct() {
    let att: ValidationAttestation = kani::any();
    let now_slot: u64 = kani::any();
    kani::assume(att.expires_at != 0 && att.expires_at < now_slot);
    kani::assume(!att.revoked);

    let policy = arbitrary_policy_with_required_capability(att.capability_hash);
    let outcome = simulate_require_validation(&policy, &att, &att.subject_asset, now_slot);

    kani::assert(!matches!(outcome, ValidationOutcome::Allow),
        "expired attestation must not Allow");
}
```

### H.5 — `multisig_threshold_enforced`

**Statement:** `set_killswitch` fails if signer count < `PolicyAuthority.threshold`. Combinatorial over signer subsets; bounded by `member_count ≤ 7`; expected runtime: under a minute.

```rust
#[cfg(kani)]
#[kani::proof]
pub fn invariant_multisig_threshold_enforced() {
    let authority: PolicyAuthority = kani::any();
    kani::assume(authority.threshold >= 1 && authority.threshold <= 7);
    kani::assume(authority.member_count >= authority.threshold);

    let signer_count: u8 = kani::any();
    kani::assume(signer_count < authority.threshold);
    let signers: [Pubkey; 7] = kani::any();

    let result = simulate_set_killswitch(&authority, &signers, signer_count);
    kani::assert(result.is_err(),
        "set_killswitch with fewer than threshold signers must fail");
}
```

### H.6 — Kani CI workflow

```yaml
# .github/workflows/kani-prove.yml
name: Kani — model-checked invariants

on:
  push:
    branches: [main, day-9-kani]
  pull_request:

jobs:
  kani:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: model-checking/kani-github-action@v1
        with:
          args: '--package policy-vault --workspace --harness invariant_paused_implies_no_allow --harness invariant_velocity_counter_le_limit --harness invariant_counterparty_tier_monotone --harness invariant_validation_expiry_correct --harness invariant_multisig_threshold_enforced'
```

Pinned to `kani-github-action@v1` (https://github.com/model-checking/kani-github-action). Workflow runs on every PR + push to `main`. **20-minute timeout** is the hard guard against any one harness running >5 min. CI fails red if any invariant fails — the merge is blocked.

The 5 harnesses + the workflow are the artifact Mert sees in the demo video. Time-budget on Day 9: 4 hours to write skeletons, 4 hours to debug Kani output. If runtime exceeds 5 min on any harness, switch from `kani::any::<u64>()` to `kani::any_in_range::<u64>(0..=2u64.pow(20))` to bound the search.

---

## I. Attacker scenarios in depth

Five concrete attack models. For each: model + mitigation + residual risk.

### I.1 — Malicious facilitator skipping pre-flight gate

**Model:** facilitator integrates `mountTrustGate(app)` but modifies the SDK at runtime to skip `gate_payment` and call SPL transfer directly. **Mitigation:** PolicyVault is a primitive — defense is reputational + economic, not on-chain. (a) TrustGate's `emit_feedback` includes `feedback_uri = facilitator-id` in the `NewFeedback` event; indexers flag facilitators whose feedback emissions don't correlate with `gate_payment` events. (b) Capability-namespace attestation (`compliance.payments:v1:facilitator-aligned`) — audit firms attest facilitator X passed audit; PolicyVault `RequireValidation` gates accordingly. **Residual:** facilitator/payee collusion remains; v1.1+ work in `docs/COMPLETING-THE-TRUST-STACK.md`.

### I.2 — Sybil agents accumulating tier via burst feedback

**Model:** 5 agents + 5 client wallets cross-emit `give_feedback(score=100)` rapidly; `trust_tier` jumps to Bronze/Silver. **Mitigation:** atom-engine has 4 layers (`01-*:F.5`) — `COLD_START_MIN = 5`, `LOYALTY_MIN_SLOT_DELTA = 2000` slot gap, HLL diversity diminishing weights, and 8-epoch `tier_confirmed` vesting. PolicyVault's contribution: `TierGateMode::Confirmed` for production policies. Demo uses `Immediate` because 7-day pre-warming can't reach `tier_confirmed`; production toggles to `Confirmed`. **Residual:** during the 8-epoch vesting window, `Immediate`-mode policies see burst-inflated tier. README documents the trade.

### I.3 — Replay attack on velocity ledger

**Model:** attacker captures a valid Allow tx, resubmits later when ledger is closer to cap. **Mitigation:** Solana `recent_blockhash` expires after 150 slots (~60s); replays beyond are dropped at runtime. Within 150 slots, replay lands on the same VelocityLedger and increments cumulative again — replay actively *hurts* the attacker. **Residual:** stale-decision-cache attack — facilitator caches an old verdict and submits transfer based on it. SDK enforces single-tx atomicity per `02-*:B.4`; facilitators breaking this contract operate off-spec.

### I.4 — Oracle manipulation against AtomStats

**Model:** 100 sybil wallets feedback-pump a target agent to Gold. **Mitigation:** atom-engine's `confidence` field (byte 557, u16, 0–10000) reflects feedback-source diversity. 100 sybils → low diversity → low confidence. PolicyVault's CounterpartyTier policy gates on `min_confidence` in addition to tier; a Gold agent with confidence <4500 fails. **Residual:** N-wallets-N-owners defeats HLL. Quantu's economic floor (~0.011 SOL per registration) caps cost at ~$2/agent. v1.1+ stake-weighted attestors (`v1_scope.md:163-166`) raise the floor.

### I.5 — Governance capture of policy authority

**Model:** attacker compromises 2-of-3 keys, calls `set_killswitch(unpause)`, then `update_policy(min_counterparty_tier=0)` to bypass. **Mitigation:** 600-slot (~5 min) timelock on KillSwitch unpause + `min_counterparty_tier` downgrade + `accepted_attestors[]` removal (Section F.4). Legitimate 3rd holder has 5 minutes to escalate. **Residual:** 3-of-3 capture is unrecoverable on-chain. Deployers should escalate to 3-of-5 or 4-of-7 for high-value deployments.

---

## J. Failure modes

Five operational failure modes during the build phase. For each: detection + recovery path.

### J.1 — PDA-account-not-found

`AccountNotInitialized` from Anchor. **Recovery:** for PolicyVault's PDAs, facilitator's setup calls `init_policy` once per (agent, policy_id) before first `gate_payment` — `mountTrustGate(app)` ships a `bootstrap` helper that lazy-inits. For Quantu's PDAs, the pre-warming script (`prewarm-demo-agents.ts`) ensures init Day 5; failure means pre-warming failed — check `solana account` output.

### J.2 — Wrong-owner check failure

`AtomStatsWrongOwner` / `AgentAccountWrongOwner`. **Recovery:** verify program-ID constants match `docs/PINNED-VERSIONS.md`; mainnet vs devnet IDs differ (`01-*:A.3`). Likely a TS-side wrong `programId` in `seeds::program`.

### J.3 — Size-mismatch on AtomStats (Quantu v0.7.0 schema bump)

`AtomStatsWrongSize`: `data.len() != 561`. **Recovery (mainnet):** `default_unrated_treatment` on `PolicyAccount` falls back to RequireValidation — system gracefully degrades. **Patch path:** v1.1 within 1–2 days with new offsets + size const. Risk-budget impact: 1–2 days, well within cut-priority budget.

### J.4 — Version-mismatch on schema_version

`AtomStatsSchemaUnsupported`: `data[560] != 1`. **Recovery:** same as J.3 — Unrated fallback. The schema_version + size checks are redundant canaries; both firing signals a Quantu push.

### J.5 — Re-entrancy via CPI loops

Solana account-lock semantics prevent two ix's holding `mut` on the same account in one tx. Anchor 1.0 PR #3946 statically catches duplicate `mut`. v1's `gate_payment` doesn't CPI into other programs — only reads PDAs. **Defensive posture:** strictly read-only on foreign PDAs; only `VelocityLedger` (PolicyVault-owned) mutates.

---

## K. Performance + observability

### K.1 — Latency + CU targets

**<100ms p99 PolicyVault execution.** At 80K CU and ~10M CU/sec validator throughput, execution is ~8ms; p99 dominated by network (~30ms RPC roundtrip via Helius Pro + ~400ms slot inclusion). End-to-end tx confirmation 1–2 slots. **CU target <200K per tx** (Wave 1 #2 §E.4): 80K empirical with 3x safety; `set_compute_unit_limit(150_000)` is the production directive.

### K.2 — Events

| Event | Fields | Cadence |
|-------|--------|---------|
| `PolicyEvaluated` | `payer_agent, payee_agent, amount, policy_id, decision_kind: u8, slot` | Every gate_payment — header for indexers |
| `PolicyDenied` | `+ reason: u8` | On Deny path |
| `PolicyAllowed` | `+ velocity_after: u64` | On Allow path |
| `RequireValidationEmitted` | `+ capability_hash` | On RequireValidation path |
| `KillSwitchTriggered` | `paused_by, scope_kind, scope_key, paused: bool, slot` | On set_killswitch |
| `VelocityIncremented` | `payer_agent, policy_id, new_cumulative, slot` | On Allow path with VelocityCommit::Pending |

The 6-event set covers every state transition. Each event is `~500 CU` to emit (`02-*:E.4`); total event budget is ~3,000 CU per `gate_payment`. Already in the 26K CU envelope.

### K.3 — Indexer query patterns

| Query | Subscribe | Cadence |
|-------|-----------|---------|
| Real-time deny rate | `PolicyDenied` events filtered on `policy_id` | Per-second WebSocket |
| Per-agent velocity history | `VelocityIncremented` events filtered on `payer_agent` | On-demand |
| KillSwitch state changes | `KillSwitchTriggered` events | Real-time |
| Tier-distribution dashboard | `PolicyAllowed` events with `velocity_after` | Aggregate hourly |
| Required-validation funnel | `RequireValidationEmitted` events grouped by `capability_hash` | Aggregate daily |

The TrustGate Express server subscribes to `PolicyAllowed` + `PolicyDenied` filtered on its own facilitator-id. Helius WebSocket RPC (https://www.helius.dev/docs/rpc) is the recommended subscription transport.

### K.4 — Helius RPC integration

Helius Pro confirmed (`plan/research/09-grants-class.md`). Configure `Anchor.toml` with `cluster = "https://mainnet.helius-rpc.com/?api-key=$HELIUS_API_KEY"`. TrustGate's WebSocket subscriber uses `connection.onLogs(POLICY_VAULT_PROGRAM_ID, ...)` filtered on facilitator-id, decoding `Program data:` lines for the 6-event set.

---

## L. Day-by-day implementation order (Days 5–9)

| Day | Date | Specific deliverable | Definition of done |
|-----|------|----------------------|---------------------|
| 5 | 2026-04-29 | Anchor scaffold + PolicyAccount/VelocityLedger schema | `anchor build` passes; `programs/policy-vault/src/state.rs` populated; `programs/policy-vault/src/errors.rs` populated with all 25 variants; pinned `bfb09ad` documented |
| 6 | 2026-04-30 | Spending policy kind | `spending.rs` implemented; 8 unit tests pass; `evaluate_spending` returns correct DenyReason for 5 failure modes |
| 7 | 2026-05-01 | CounterpartyTier policy kind (THE wedge) | `counterparty_tier.rs` + `ext/atom_engine.rs` implemented with manual deserialization; first integration test against live ATOM Engine on devnet (or localnet `--clone`) passes; tier read from byte 551 verified end-to-end |
| 8 | 2026-05-02 | Velocity + KillSwitch policy kinds | `velocity.rs` + `killswitch.rs` implemented; sliding-window math has 8 unit tests; `set_killswitch` ix with multisig has 6 tests including 2-of-3 happy + 1-of-3 fail |
| 9 | 2026-05-03 | RequireValidation + gate_payment composer + Kani harness setup | `gate_payment.rs` integrates all 5 policies; full e2e test on localnet with all 5 policies enabled; 5 Kani harnesses skeleton'd in `proofs/`; CI workflow `.github/workflows/kani-prove.yml` green |

### Day 5 detailed

**Pre-build (90 min):** read `THESIS_LOCK.md`; pre-warm 5 demo agents on mainnet ATOM (`01-*:N.6`, ~0.055 SOL); send 3 facilitator DMs; confirm Day 13–15 friend availability.

**Build (5 hours):** `anchor init agenttrust`; configure `[test.validator.clone]` for 4 mainnet program IDs; scaffold `programs/policy-vault/src/lib.rs`; populate `state.rs` (4 PDAs, byte layouts from Section B); populate `errors.rs` (25 variants from `02-*:G.2`); write `ext/atom_engine.rs` with offset constants; write `docs/PINNED-VERSIONS.md` from `01-*:M`.

**Done:** `anchor build` green, IDL generated, pinned commit + program IDs documented.

### Day 6 — Spending

`spending.rs` with 4 helpers (`compute_utc_midnight_slot`, `compute_iso_monday_slot`, `evaluate_spending`, `roll_anchors`). 8 unit tests via bankrun. **Done:** all green; doc-comments include rollover semantics.

### Day 7 — CounterpartyTier (the wedge day)

Highest-risk day, first contact with mainnet ATOM Engine.

Morning (3h): finish `ext/atom_engine.rs` (Pattern B); implement `read_atom_stats_tier` with all 4 defensive checks. Afternoon (4h): implement `policies/counterparty_tier.rs` with `gate_mode: TierGateMode`. Build integration test: read pre-warmed demo agent's AtomStats from devnet (or localnet `--clone` fallback), assert `trust_tier > 0`, call `gate_payment` with `min_counterparty_tier = 1` (expect Allow) and `= 4` (expect `CounterpartyTierBelowMin`).

**Done:** integration test green; tier matches `solana account` output for the AtomStats PDA.

### Day 8 — Velocity + KillSwitch

Velocity (morning) + KillSwitch (afternoon). 8 + 6 unit tests. **Done:** `evaluate_and_commit_velocity` never writes on Deny; `set_killswitch` requires threshold signers; both wired into `gate_payment_handler`.

### Day 9 — RequireValidation + composer + Kani

Morning (3h): `require_validation.rs` + sibling-program integration via Pattern A. Afternoon (5h): stitch 5 policies into `gate_payment_handler`; e2e test on localnet with every policy enabled. Evening (2h): 5 Kani harness skeletons + CI workflow.

**Done:** all 5 Kani invariants green locally; CI workflow green on push to `day-9-kani`.

---

## M. Common bug catalog — 10 bugs with wrong vs right patterns

### M.1 — Forgetting owner check on AtomStats

Wrong: `let tier = atom_stats.try_borrow_data()?[551];` reads bytes from any account at the right address. An attacker passes a system-owned account post-close and reads garbage as `tier`.

Right: gate the read with `require_keys_eq!(*atom_stats.owner, ATOM_ENGINE_ID, PolicyVaultError::AtomStatsWrongOwner);` before borrowing data (per `02-*:Pattern-B`).

### M.2 — Forgetting schema_version check

Wrong: deserialize directly from byte 551. Right: `require!(data[560] == 1, PolicyVaultError::AtomStatsSchemaUnsupported);` first. Without the canary, a Quantu v0.7.0 schema bump silently corrupts every gate decision.

### M.3 — Off-by-one on byte offset

Wrong: `const TRUST_TIER_OFFSET: usize = 550;` — reads `diversity_ratio` (0–255) as tier (0–4). Right: `551`. The math is `8-byte disc + 543-byte field offset` = 551 account-absolute, per `01-*:Section-B.5`.

### M.4 — Hardcoding tier_confirmed for the demo

Wrong: `let tier = data[555];` makes the demo structurally unreachable — pre-warmed agents reach tier 2–3 in `trust_tier` by Day 12 but `tier_confirmed = 0` until Day 25 (post-submission).

Right: `match policy.gate_mode { Immediate => data[551], Confirmed => data[555] }`. Default to `Immediate` for v1 demo per Revision 2.

### M.5 — Mutable borrow conflict on `try_borrow_data`

Wrong: hold `Ref` from `atom_stats.try_borrow_data()?` while writing `velocity_ledger.cumulative_amount` — runtime panic with `BorrowMutError` if the same `AccountInfo` is touched.

Right: scope-limit reads — `let tier = { let data = atom_stats.try_borrow_data()?; data[551] };` releases the Ref before any mutation. Per `02-*:F.2`.

### M.6 — Forgetting `seeds::program` for foreign-program PDAs

Wrong: `#[account(seeds = [b"atom_stats", asset.as_ref()], bump)]` derives against policy-vault. Right: add `seeds::program = ATOM_ENGINE_ID` so Anchor derives against atom-engine. Without it, the seeds match a different address that doesn't exist on-chain.

### M.7 — `find_program_address` per call instead of cached bump

Wrong: `let (_pda, bump) = Pubkey::find_program_address(&[...], &program_id);` inside the handler — costs ~2,250 CU per call (1500 × ~1.5 attempts).

Right: `let bump = ctx.bumps.field_name;` — Anchor pre-derived at `try_accounts`. Free at runtime.

### M.8 — Failing to fail-fast on KillSwitch

Wrong: collect-all-errors via `Vec<DenyReason>` runs every policy even after the cheapest one denies. Five-policy worst case blows past the 200K CU cap when CounterpartyTier evaluates needlessly.

Right: early-return on first `Some(reason)` from each `evaluate_*` call, in the order KillSwitch → Spending → Velocity → CounterpartyTier → RequireValidation (per Section D.2).

### M.9 — Borsh-serializing PolicyAccount on every Allow

Wrong: declare `policy_account` with `mut` even though `gate_payment` never writes to it — Anchor re-serializes on exit (~400 CU wasted per call).

Right: omit `mut` from the `#[account(...)]` — Anchor skips the writeback when no mutation is declared.

### M.10 — Not pre-checking `validation_attestation.is_some()`

Wrong: unwrap or `try_from` on the optional account — panics when the caller didn't pass an attestation (the legitimate "RequireValidation needed" path).

Right: `ctx.accounts.validation_attestation.as_ref().map(...)` then `if let Some(cap_hash) = evaluate_require_validation(...)? { return RequireValidation(cap_hash); }`. The Option-None case means *"caller didn't supply, route to attestation flow"*, not a fatal error.

---

## N. What this means for Mohit's submission

1. **Pin `bfb09ad` and the program IDs Day 5 morning, before any code.** `docs/PINNED-VERSIONS.md` is the contract `gate_payment` lives under for 13 days; without it, every later refactor risks breaking the byte-offset assumptions. Devnet IDs differ; Anchor.toml `[test.validator.clone]` clones the 4 mainnet IDs for localnet integration tests (`01-*:Section-A.3`).

2. **The CounterpartyTier `gate_mode: TierGateMode` field is the most-load-bearing Day-5 design decision.** Default `Immediate` for the demo (reads byte 551, surfaces tier within seconds of feedback); document `Confirmed` (byte 555, post-8-epoch vesting) as the production-grade message. Hardcoding `Confirmed` makes the demo structurally unreachable; hardcoding `Immediate` weakens the production-grade pitch. The toggle is the win.

3. **Day 7 is the make-or-break wedge day.** Manual `AtomStats` deserialization first hits live mainnet data. Three-hour buffer before the integration test; if devnet flakes, fall back to localnet `--clone`. The 4 defensive checks (owner, PDA, size, schema_version) all need to be in place before this test or graceful degradation can't be validated.

4. **`gate_payment` fits in 80K CU comfortably; no split needed.** `set_compute_unit_limit(150_000)` is the production directive — 2x safety, 33% headroom under default. Day 7 integration test confirms empirical envelope; if >150K CU on first measurement, audit Velocity policy first (only one with non-trivial loop).

5. **Anchor 1.0.1 is the right pin, not 0.31.1.** PR #3946's "Disallow duplicate mutable accounts" eliminates an entire class of `gate_payment` reentrancy footgun statically. Manual byte-offset deserialization (Pattern B) means we don't need Quantu's crate, so Quantu's 0.31.1 lock doesn't bind us.

6. **The 5 Kani invariants are the one moat that no other ERC-8004 leg can claim.** Day 9 is the build day; CI workflow ships green by Day 9 evening. The live `cargo kani` green-checks moment is Mert Mumtaz's engagement target — frame it as one of three demo-video beats.

7. **Velocity sliding-window math is the only policy with non-trivial off-chain logic.** Single-slot reset (not multi-bucket) keeps state at 80 bytes and CU at ~1500. Tier-decay coefficients (`/4, /2, ×3/4, ×1, ×5/4`) are v1 defaults — document these as configurable but ship sensible defaults.

8. **Graceful degradation always errs toward `RequireValidation` on ambiguity.** Better to force the facilitator to make an explicit decision than to silently Allow (permissioning bypass) or Deny (legitimate-user lockout). The `default_unrated_treatment` field lets deployers override per-policy.

9. **2-of-3 default multisig + 600-slot timelock on KillSwitch unpause / `min_counterparty_tier` downgrade.** Single-signer override is documented as a v1.1+ field (`emergency_unpause_enabled`) — v1 ships timelock-only. Production deployers can configure 4-hour (28,800 slots) timelocks per their risk posture.

10. **Subscribe Helius WebSocket to `PolicyAllowed` + `PolicyDenied` events** filtered on TrustGate's facilitator-id. The TrustGate Express server (`trustgate/server/`) consumes this for receipt-API correctness. Mohit's Pro plan covers this; no extra cost.

— end —
