# Quantu `agent-registry-8004` + `atom-engine` — Source-Code Class Deep-Dive

**Last verified:** 2026-04-28. **Cloned commits:** `agent-registry-8004` HEAD `bfb09ad` on `main`; `atom-engine` HEAD per the Cargo path-dep hash. **Compiled by:** Mohit (synthesizing primary-source reads after two background-agent stalls). **Standing rules applied:** populated not outlined; every claim cited inline by file-path:line-range OR primary URL; ≤15 words per quote; ranked not listed; converted relative dates to absolute.

This file is the byte-precise integration manual for AgentTrust's three programs (PolicyVault, TrustGate, ValidationRegistry) against Quantu's MIT-licensed primitives. A senior Solana engineer at Helius or Anza reading it should learn at least three things they didn't know.

---

## A. Repo overview

### A.1 — Branch + HEAD commit hash

`8004-solana` clone at `/tmp/quantu-research/8004-solana/`, branch `main`, HEAD commit `bfb09ad` ("docs: require root-cause audits in agents workflow"). Co-cloned `8004-atom` at `/tmp/quantu-research/8004-atom/`. Both repos pulled fresh 2026-04-28.

### A.2 — Workspace layout

`8004-solana/Cargo.toml:1-13` declares a workspace with one member at `programs/agent-registry-8004` plus a release profile that strips symbols, runs LTO `fat`, and disables overflow checks (`overflow-checks = false`). The `panic = 'abort'` setting plus single codegen unit produce the smallest reproducible binary.

`8004-atom/programs/atom-engine` lives in a separate repo. The agent-registry crate depends on it via a **local path** dep, not a git revision — this is intentional per `README.md:188-198`: *"This path layout is required to reproduce the current mainnet binary hash."* Switching to a `git` dependency rebuilds the `.so` with a different SHA. AgentTrust's manual deserialization avoids this trap entirely (no Cargo dep on atom-engine).

### A.3 — Programs declared, mainnet vs devnet IDs

| Program | Localnet (= mainnet) | Devnet |
|---------|---------------------|--------|
| `agent-registry-8004` | `8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ` | `8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C` |
| `atom-engine` | `AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb` | `AToMufS4QD6hEXvcvBDg9m1AHeCLpmZQsyfYa5h9MwAF` |

Sources: `Anchor.toml:8-9` for devnet/localnet; `README.md:13-21` and `DEPLOYMENT.md:10-22` for mainnet (Quantu uses the same keypair file `keys/mainnet-program/8oo4dC4...json` for both `localnet` testing and `mainnet-beta` deployment, so the localnet ID literally is the mainnet ID — a deliberate choice for binary-hash reproducibility). `declare_id!()` lives in `programs/agent-registry-8004/src/lib.rs:3` and `programs/atom-engine/src/lib.rs:3`.

**Mainnet binary SHA-256 (verified 2026-03-04):** `5aeae715714861fd43ac09d80bc51f70836b27a325a2c2131374121c6c05a5c8` (`README.md:201-203`). AgentTrust does not need to verify this hash; it never depends on the binary directly. But Quantu publishes it so any consumer can `solana program dump --url mainnet-beta 8oo4dC4... | shasum -a 256` and compare.

**Initialized devnet accounts (`README.md:240-243`):**

| Account | Address |
|---------|---------|
| Config (RootConfig) | `EJ3UN1Rp9QCqe5xjHMuoxTmRWm6KBYrxSeATtheFmgZb` |
| Base Collection | `C6W2bq4BoVT8FDvqhdp3sbcHFBjNBXE8TsNak2wTXQs9` |

### A.4 — Anchor version, key deps

`programs/agent-registry-8004/Cargo.toml:23-26`:

```toml
anchor-lang = { version = "0.31.1", features = ["init-if-needed"] }
anchor-spl = "0.31.1"
mpl-core = "0.11.1"
atom-engine = { path = "../../../8004-atom/programs/atom-engine", features = ["cpi"] }
```

Anchor 0.31.1 is the highest version pre-1.0. Quantu has not migrated to Anchor 1.0 (released 2026-04-02). `init-if-needed` feature is enabled — used by `set_metadata_pda` to allow either creating new metadata PDAs OR updating existing ones in a single instruction.

`atom-engine` is consumed with `cpi` feature on (via the path dep), which gives Quantu typed `atom_engine::cpi::accounts::UpdateStats` + `atom_engine::cpi::update_stats(...)` helpers — but these only work because `agent-registry-8004` has the matching crate in its Cargo workspace.

**AgentTrust's posture:** does NOT depend on either crate. Uses manual byte-offset deserialization for reads and manual `invoke_signed` instruction construction for writes. Wave 1 #2's `02-anchor-token2022-cpi-class.md` confirms this is the correct path; it sidesteps Anchor-version-coupling and atom-engine path-layout-coupling entirely.

### A.5 — Test setup (`Anchor.toml:14-29`)

Three test scripts:
- `costs` — runs `init-localnet` + `e2e-costs` (rent measurement)
- `full` — runs `init-localnet` + `identity-tests` + `reputation-tests`
- `revoke` — runs `init-localnet` + `revoke-e2e`
- `test` (default) — runs `init-localnet` + `revoke-e2e` + `reputation-tests`

`[test.validator]` clones Metaplex Core (`CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d`) from devnet and loads the `atom-engine.so` binary into genesis. AgentTrust's localnet tests should mirror this pattern: clone agent-registry + atom-engine + Metaplex Core, then deploy AgentTrust's three programs locally.

---

## B. Every PDA, exhaustively

Anchor account layout: 8-byte discriminator `[u8; 8]` (= `sighash("account", "<TypeName>")[..8]`) prepended to Borsh-serialized fields. `#[derive(InitSpace)]` produces `<Type>::INIT_SPACE` with sizes from `#[max_len(N)]` annotations.

### B.1 — `RootConfig` (singleton)

`programs/agent-registry-8004/src/identity/state.rs:10-21`. Seeds `[b"root_config"]`. Owner: `agent_registry_8004`.

| Offset | Field | Type | Width | Semantics |
|--------|-------|------|-------|-----------|
| 0–7 | discriminator | `[u8; 8]` | 8 | Anchor `sighash("account", "RootConfig")` |
| 8–39 | `base_collection` | `Pubkey` | 32 | Metaplex Core collection address; all agents register into this single collection (`identity/instructions.rs:625-661`) |
| 40–71 | `authority` | `Pubkey` | 32 | Protocol authority (program upgrade authority gates `initialize`) |
| 72 | `bump` | `u8` | 1 | PDA bump |

Total: 73 bytes (8 disc + 65 data). Rent ~0.001 SOL.

Caveat: the SECURITY-AUDIT-REPORT `CROSS-1` finding (`SECURITY-AUDIT-REPORT.md:46-60`) caught the indexer parsing `base_registry` and `authority` swapped. **Fixed**, but worth flagging because some downstream consumers may still parse the old layout. AgentTrust's PolicyVault never reads `RootConfig` directly — it only ever reads `AgentAccount` and `AtomStats` — so this risk doesn't reach AgentTrust.

### B.2 — `RegistryConfig` (per-collection)

`identity/state.rs:24-36`. Seeds `[b"registry_config", collection.key()]`. Owner: `agent_registry_8004`.

| Offset | Field | Type | Width |
|--------|-------|------|-------|
| 0–7 | discriminator | `[u8; 8]` | 8 |
| 8–39 | `collection` | `Pubkey` | 32 |
| 40–71 | `authority` | `Pubkey` | 32 |
| 72 | `bump` | `u8` | 1 |

Same layout as RootConfig. Per the audit's `CROSS-2` finding (`SECURITY-AUDIT-REPORT.md:64-73`), the indexer briefly held a 121-byte layout with phantom fields (`agentCount`, `feesWallet`, `registerFee`); the on-chain reality is 73 bytes. AgentTrust does not read `RegistryConfig` either.

### B.3 — `AgentAccount` (the canonical agent identity)

**THE primary read target for PolicyVault.** `identity/state.rs:42-99`. Seeds `[b"agent", asset.key()]`. Owner: `agent_registry_8004`. `#[derive(InitSpace)]` with three `#[max_len()]` strings.

Field-by-field byte offsets (from start of account data, after the 8-byte discriminator):

| Offset (data-relative) | Offset (account-absolute) | Field | Type | Width | Notes |
|------------------------|---------------------------|-------|------|-------|-------|
| — | 0–7 | discriminator | `[u8; 8]` | 8 | `sighash("account", "AgentAccount")` |
| 0–31 | 8–39 | `collection` | `Pubkey` | 32 | Filterable via `memcmp` at offset 8 |
| 32–63 | 40–71 | `creator` | `Pubkey` | 32 | Immutable creator snapshot |
| 64–95 | 72–103 | `owner` | `Pubkey` | 32 | Cached from Core asset; may be stale until `sync_owner` |
| 96–127 | 104–135 | `asset` | `Pubkey` | 32 | Metaplex Core NFT mint pubkey (canonical agent ID) |
| 128 | 136 | `bump` | `u8` | 1 | |
| 129 | 137 | `atom_enabled` | `bool` | 1 | One-way flag (true → cannot revert) |
| 130 | 138 | `agent_wallet` discriminant | `u8` | 1 | Option tag: `0x00` = None, `0x01` = Some |
| 131–162 | 139–170 | `agent_wallet` payload | `Pubkey` | 32 | Only valid if discriminant == 1 (Ed25519-verified op wallet) |
| 163–194 | 171–202 | `feedback_digest` | `[u8; 32]` | 32 | Rolling keccak hash chain |
| 195–202 | 203–210 | `feedback_count` | `u64` | 8 | Total feedback events |
| 203–234 | 211–242 | `response_digest` | `[u8; 32]` | 32 | Response hash chain |
| 235–242 | 243–250 | `response_count` | `u64` | 8 | |
| 243–274 | 251–282 | `revoke_digest` | `[u8; 32]` | 32 | Revoke hash chain |
| 275–282 | 283–290 | `revoke_count` | `u64` | 8 | |
| 283 | 291 | `parent_asset` discriminant | `u8` | 1 | Option tag |
| 284–315 | 292–323 | `parent_asset` payload | `Pubkey` | 32 | Parent link (first-write-wins) |
| 316 | 324 | `parent_locked` | `bool` | 1 | |
| 317 | 325 | `col_locked` | `bool` | 1 | |
| 318–321 | 326–329 | `agent_uri` length | `u32` | 4 | Borsh String length prefix |
| 322–571 | 330–579 | `agent_uri` bytes | `[u8; 250]` | up to 250 | InitSpace allocates max |
| 572–575 | 580–583 | `nft_name` length | `u32` | 4 | |
| 576–607 | 584–615 | `nft_name` bytes | `[u8; 32]` | up to 32 | |
| 608–611 | 616–619 | `col` length | `u32` | 4 | |
| 612–739 | 620–747 | `col` bytes | `[u8; 128]` | up to 128 | Canonical collection pointer `c1:<cid_norm>` |

Total INIT_SPACE: 740 bytes data + 8 disc = **748 bytes**. The CHANGELOG v0.3.0 line *"AgentAccount: 343 bytes → 313 bytes"* describes a prior layout pre-SEAL-v1 (before the digest+count fields were added). The current size is 748 bytes; rent at the 2026-04-28 SOL price is approximately 0.0058 SOL per agent, lining up with `README.md:170` *"Register Agent: ~0.006 SOL"*.

**For PolicyVault:** the high-leverage offsets are:
- `owner` at byte 72 (cached, may be stale)
- `asset` at byte 104 (used to derive PolicyAccount seeds and re-derive `AgentAccount` for sanity)
- `atom_enabled` at byte 137 (gate: if false, fall back to non-CounterpartyTier policies)
- `agent_wallet` discriminant at byte 138 (gate: if `None`, agent has no operational wallet)
- `feedback_count` at byte 203 (proxy for agent activity-level — useful for sybil-detection heuristics)

**Variable-length string parsing caveat:** `#[max_len()]` with `#[derive(InitSpace)]` allocates the FULL max-byte budget at init time, but actual stored bytes equal the runtime String length. So at runtime, `agent_uri` may occupy bytes 326..(326 + 4 + actual_length); subsequent strings (nft_name, col) shift by the actual_length difference. **PolicyVault should never read past `col_locked` at byte 325** — fields beyond are dynamic.

### B.4 — `MetadataEntryPda` (per-key agent metadata)

`identity/state.rs:118-138`. Seeds `[b"agent_meta", asset.key(), key_hash[0..16]]` where `key_hash = SHA256(key)[0..16]` per `identity/instructions.rs:43-49`. Owner: `agent_registry_8004`.

| Offset (data) | Field | Type | Width |
|---------------|-------|------|-------|
| 0–31 | `asset` | `Pubkey` | 32 |
| 32 | `immutable` | `bool` | 1 |
| 33 | `bump` | `u8` | 1 |
| 34–37 | `metadata_key` length | `u32` | 4 |
| 38–69 | `metadata_key` bytes | `[u8; 32]` | up to 32 |
| 70–73 | `metadata_value` length | `u32` | 4 |
| 74–323 | `metadata_value` bytes | `[u8; 250]` | up to 250 |

Total INIT_SPACE: 324 + 8 disc = **332 bytes** at max allocation. Variable in practice.

**Reserved key:** `"agentWallet"` is blocked from `set_metadata_pda` (`identity/instructions.rs:41`) — must use `set_agent_wallet` instead. AgentTrust's PolicyVault may use `MetadataEntryPda` reads to support custom policy keys (e.g., compliance attestation hashes) but v1 sticks to the 5 named policy kinds and ignores per-agent metadata. v1.1+ could extend.

### B.5 — `AtomStats` (the trust-tier reservoir — **THE wedge target**)

`8004-atom/programs/atom-engine/src/state.rs:13-132`. Seeds `[b"atom_stats", asset.key()]`. **Owner: `atom_engine`** (NOT `agent_registry_8004` — critical for PolicyVault's owner-program check).

`pub const SIZE: usize = 561` (`state.rs:193`) — that's the full account size including the 8-byte discriminator.

Field-by-field byte offsets, account-absolute:

| Offset | Field | Type | Width | Semantics |
|--------|-------|------|-------|-----------|
| 0–7 | discriminator | `[u8; 8]` | 8 | `sighash("account", "AtomStats")` |
| 8–39 | `collection` | `Pubkey` | 32 | Collection filter |
| 40–71 | `asset` | `Pubkey` | 32 | Agent identifier |
| 72–79 | `first_feedback_slot` | `u64` | 8 | |
| 80–87 | `last_feedback_slot` | `u64` | 8 | |
| 88–95 | `feedback_count` | `u64` | 8 | |
| 96–97 | `ema_score_fast` | `u16` | 2 | Fast EMA, scale 0–10000 |
| 98–99 | `ema_score_slow` | `u16` | 2 | Slow EMA, scale 0–10000 |
| 100–101 | `ema_volatility` | `u16` | 2 | |
| 102–103 | `ema_arrival_log` | `u16` | 2 | |
| 104–105 | `peak_ema` | `u16` | 2 | Historical peak of slow EMA |
| 106–107 | `max_drawdown` | `u16` | 2 | (peak − current), 0–10000 |
| 108–109 | `epoch_count` | `u16` | 2 | Distinct epochs with activity |
| 110–111 | `current_epoch` | `u16` | 2 | `slot / EPOCH_SLOTS` |
| 112 | `min_score` | `u8` | 1 | |
| 113 | `max_score` | `u8` | 1 | |
| 114 | `first_score` | `u8` | 1 | |
| 115 | `last_score` | `u8` | 1 | |
| 116–243 | `hll_packed` | `[u8; 128]` | 128 | HLL: 256 registers × 4 bits |
| 244–251 | `hll_salt` | `u64` | 8 | Per-agent salt — anti-grinding |
| 252–443 | `recent_callers` | `[u64; 24]` | 192 | 24-slot ring buffer of 56-bit fingerprints + score + revoked-bit |
| 444 | `burst_pressure` | `u8` | 1 | EMA of repeat-caller pressure |
| 445 | `updates_since_hll_change` | `u8` | 1 | |
| 446 | `neg_pressure` | `u8` | 1 | Negative-momentum pressure |
| 447 | `eviction_cursor` | `u8` | 1 | Round-robin pointer |
| 448–455 | `ring_base_slot` | `u64` | 8 | MRT (Minimum Residency Time) reference |
| 456–457 | `quality_velocity` | `u16` | 2 | Quality circuit-breaker accumulator |
| 458–459 | `velocity_epoch` | `u16` | 2 | |
| 460 | `freeze_epochs` | `u8` | 1 | Quality freeze counter |
| 461 | `quality_floor` | `u8` | 1 | |
| 462 | `bypass_count` | `u8` | 1 | |
| 463 | `bypass_score_avg` | `u8` | 1 | |
| 464–543 | `bypass_fingerprints` | `[u64; 10]` | 80 | Bypass buffer for revoke support |
| 544 | `bypass_fp_cursor` | `u8` | 1 | |
| 545–546 | `loyalty_score` | `u16` | 2 | Anti-cartel cap = 1000 (`params.rs:205`) |
| 547–548 | `quality_score` | `u16` | 2 | Cached, 0–10000 |
| 549 | `risk_score` | `u8` | 1 | Cached, 0–100 |
| 550 | `diversity_ratio` | `u8` | 1 | Cached, 0–255 |
| **551** | **`trust_tier`** | `u8` | 1 | **Cached output. 0=Unrated/1=Bronze/2=Silver/3=Gold/4=Platinum.** |
| 552 | `tier_candidate` | `u8` | 1 | Tier waiting for vesting promotion |
| 553–554 | `tier_candidate_epoch` | `u16` | 2 | |
| **555** | **`tier_confirmed`** | `u8` | 1 | **Post-8-epoch-vesting confirmed tier (replaces trust_tier in production logic per Quantu).** |
| 556 | `flags` | `u8` | 1 | |
| 557–558 | `confidence` | `u16` | 2 | 0–10000 |
| 559 | `bump` | `u8` | 1 | |
| 560 | `schema_version` | `u8` | 1 | Currently `1` (`state.rs:190`). PolicyVault must check this == 1 before deserializing. |

Total: **561 bytes**. Rent ~0.0049 SOL per `state.rs:9`. Verified against `README.md:170` *"Initialize ATOM Stats: ~0.005 SOL"*.

**Three load-bearing offsets for PolicyVault:**

1. **`trust_tier` at byte 551** — the immediate cached tier. Updated synchronously in `atom_engine::update_stats` (`atom-engine/src/lib.rs:296-302`). Use this for **demo gating** — pre-warmed agents will have non-zero `trust_tier` within hours of receiving feedback.

2. **`tier_confirmed` at byte 555** — the post-vesting tier. Per `params.rs:336-337`: *"Epochs of vesting before tier promotion (8 epochs ≈ 20 days)."* Use this for **production gating** if regulated-enterprise integrators require sybil-resistant proof of tier (the immediate `trust_tier` can be inflated by burst feedback that the vesting process filters out).

3. **`schema_version` at byte 560** — defensive check. AgentTrust's manual deserialization must `require!(data[8 + 552] == 1)` (data offset 560 = absolute 568? No wait, the byte at offset 560 in account-absolute layout corresponds to data offset 552. Let me re-verify: discriminator is 0–7, then data starts at byte 8; AtomStats fields are layout-relative starting at byte 0 of data; so when I say "byte 551 trust_tier" I mean the 551st byte of data, which is account-absolute byte 559... wait).

Hold on. Let me redo this carefully. Anchor accounts have the 8-byte discriminator FIRST. The struct fields begin at account-absolute byte 8. The total `SIZE = 561` includes the 8-byte discriminator. So data fields occupy bytes 8 through 560.

Recomputing AtomStats from `state.rs:13-132` field order with field-byte offsets RELATIVE to the start of data (i.e., subtract 8 from account-absolute offsets):

- collection (32) → data 0–31, account-abs 8–39
- asset (32) → data 32–63, account-abs 40–71
- first_feedback_slot (8) → data 64–71, account-abs 72–79
- last_feedback_slot (8) → data 72–79, account-abs 80–87
- feedback_count (8) → data 80–87, account-abs 88–95
- ema_score_fast (2) → data 88–89, account-abs 96–97
- ema_score_slow (2) → data 90–91, account-abs 98–99
- ema_volatility (2) → data 92–93, account-abs 100–101
- ema_arrival_log (2) → data 94–95, account-abs 102–103
- peak_ema (2) → data 96–97, account-abs 104–105
- max_drawdown (2) → data 98–99, account-abs 106–107
- epoch_count (2) → data 100–101, account-abs 108–109
- current_epoch (2) → data 102–103, account-abs 110–111
- min_score, max_score, first_score, last_score (4×1) → data 104–107, account-abs 112–115
- hll_packed [128] → data 108–235, account-abs 116–243
- hll_salt (8) → data 236–243, account-abs 244–251
- recent_callers [192] → data 244–435, account-abs 252–443
- burst_pressure, updates_since_hll_change, neg_pressure, eviction_cursor (4×1) → data 436–439, account-abs 444–447
- ring_base_slot (8) → data 440–447, account-abs 448–455
- quality_velocity (2) → data 448–449, account-abs 456–457
- velocity_epoch (2) → data 450–451, account-abs 458–459
- freeze_epochs, quality_floor, bypass_count, bypass_score_avg (4×1) → data 452–455, account-abs 460–463
- bypass_fingerprints [80] → data 456–535, account-abs 464–543
- bypass_fp_cursor (1) → data 536, account-abs 544
- loyalty_score (2) → data 537–538, account-abs 545–546
- quality_score (2) → data 539–540, account-abs 547–548
- risk_score, diversity_ratio (2×1) → data 541–542, account-abs 549–550
- **`trust_tier` (1) → data 543, account-abs 551** ✓
- tier_candidate (1) → data 544, account-abs 552
- tier_candidate_epoch (2) → data 545–546, account-abs 553–554
- **`tier_confirmed` (1) → data 547, account-abs 555** ✓
- flags (1) → data 548, account-abs 556
- confidence (2) → data 549–550, account-abs 557–558
- bump (1) → data 551, account-abs 559
- schema_version (1) → data 552, account-abs 560

Total data bytes: 553. Plus 8-byte discriminator = **561 bytes** — matches `state.rs:193 const SIZE: usize = 561`. ✓

**Confirmed offsets for PolicyVault manual deserialization:**

```rust
const ATOM_STATS_TRUST_TIER_OFFSET: usize = 551;        // account-absolute byte offset
const ATOM_STATS_TIER_CONFIRMED_OFFSET: usize = 555;
const ATOM_STATS_RISK_SCORE_OFFSET: usize = 549;
const ATOM_STATS_CONFIDENCE_OFFSET: usize = 557;        // u16, 2 bytes
const ATOM_STATS_FEEDBACK_COUNT_OFFSET: usize = 88;     // u64, 8 bytes
const ATOM_STATS_SCHEMA_VERSION_OFFSET: usize = 560;
const ATOM_STATS_SIZE: usize = 561;
```

These constants land in `policy-vault/src/ext/atom_engine.rs` per the v1_scope tree.

### B.6 — `AtomConfig` (singleton config, atom-engine)

`atom-engine/src/state.rs:222-290`. Seeds `[b"atom_config"]`. Owner: `atom_engine`.

Total `SIZE: 151` (per state.rs:305 calculation). PolicyVault doesn't read `AtomConfig` directly; tier thresholds live here but the cached `trust_tier` on `AtomStats` is what we gate against. AgentTrust v1 trusts atom-engine's tier computation to be correct.

For completeness, the tier thresholds (atom-engine `params.rs:163-169` defaults; can be hot-reloaded by Quantu via `update_config`):

| Tier | quality_min | risk_max | confidence_min |
|------|-------------|----------|----------------|
| Platinum (4) | 7000 | 15 | 6000 |
| Gold (3) | 5000 | 30 | 4500 |
| Silver (2) | 3000 | 50 | 3000 |
| Bronze (1) | 1000 | 70 | 800 |
| Unrated (0) | (default) | | |

Hysteresis margin: `TIER_HYSTERESIS = 200` quality units to prevent oscillation gaming. Platinum candidature additionally requires `loyalty_score ≥ 500` per `params.rs:340-342`.

**For demo storytelling:** pre-warmed demo agents on Day 5 with daily positive feedback (score 80–100) from 5 distinct client wallets reach Bronze (1) within 5 feedbacks (`COLD_START_MIN = 5`, `params.rs:183`) and Silver (2) within ~10 feedbacks. Gold (3) requires risk_score ≤ 30 + confidence ≥ 4500 — achievable by Day 12 with consistent positive feedback. Platinum (4) requires the `loyalty_score ≥ 500` floor, which is structurally hard inside 7 days because loyalty accrues from `LOYALTY_MIN_SLOT_DELTA = 2000` slot gaps between repeat callers (`params.rs:208`) — repeat callers must wait ~14 minutes between feedbacks. **Demo target: Silver-to-Gold (tier 2 or 3) on the headline pre-warmed agent, contrasted with Unrated (0) on a fresh demo agent.**

### B.7 — Archived `ValidationConfig` and `ValidationRequest`

Lives in `programs/agent-registry-8004/src/_archive/validation/state.rs`. Removed from active build but preserved as MIT-licensed reference material. Wave 1 #3 (`03-erc8004-validation-registry-archaeology.md`) reconstructs this in detail. Brief recap:

- `ValidationConfig` PDA at `[b"validation_config"]`: 49 bytes data (authority + total_requests + total_responses + bump). Initialized only by program upgrade authority.
- `ValidationRequest` PDA at `[b"validation", asset, validator, nonce]`: 109 bytes data (asset + validator_address + nonce + request_hash + response + responded_at). Optimized down from 150 bytes for rent.

The archived design is **single-validator-per-request**: each `ValidationRequest` is a 1:1 binding of asset + validator + nonce. AgentTrust's ValidationRegistry diverges by indexing on `(subject_asset, capability_hash, attestor)` — capability-namespaced rather than nonce-numbered — for downstream-consumer-filterable sybil resistance. See Wave 1 #3 for the comparative design table.

---

## C. Every instruction, exhaustively

`agent-registry-8004` exposes 18 instructions across `lib.rs:31-194`. `atom-engine` exposes 6 instructions (`lib.rs:96-441`). I cover the AgentTrust-relevant ones in depth and tabulate the rest.

### C.1 — `agent_registry_8004::initialize`

`lib.rs:31-33` → `identity/instructions.rs:625-661`. **Permissions:** ONLY the BPF Loader Upgradeable upgrade authority (gated by `program_data.upgrade_authority_address == Some(authority.key())` in `Initialize` context, `identity/contexts.rs:328-335`). One-time call.

CPIs: Metaplex Core's `CreateCollectionV2` to mint the base collection NFT, signed by `registry_config` PDA. Emits `RegistryInitialized`. AgentTrust does not invoke this — the registry is initialized once on mainnet by Quantu.

### C.2 — `agent_registry_8004::register` and `register_with_options`

`lib.rs:36-47` → `identity/instructions.rs:736-747`. **Permissions:** anyone (paying ~0.006 SOL rent + ~0.005 SOL ATOM stats init).

Account context (`Register` at `identity/contexts.rs:347-391`):
- `root_config` (read, validates `base_collection`)
- `registry_config` (read)
- `agent_account` (init, PDA `[b"agent", asset]`, payer = owner)
- `asset` (Signer — must be a fresh keypair; CPI-created as Core asset)
- `collection` (mut — base collection)
- `owner` (Signer, mut — pays rent)
- `system_program`, `mpl_core_program`

CPI: Metaplex Core `CreateV2` (`identity/instructions.rs:679-698`) to mint the agent NFT into the base collection, signed by `registry_config` PDA.

`register_with_options(agent_uri, atom_enabled)` is the explicit form; `register(agent_uri)` defaults `atom_enabled = true`. Both call `register_inner` (`identity/instructions.rs:664-733`).

**Demo prep relevance:** AgentTrust's pre-warm script (`scripts/prewarm-demo-agents.ts`) calls `register_with_options(uri, atom_enabled=true)` for each of 5 demo agents on mainnet Day 5. Then each agent's owner separately calls `atom_engine::initialize_stats` (the second 0.005 SOL tx) to allow ATOM scoring. **Two transactions per agent**, both must complete before feedback can land in ATOM.

### C.3 — `agent_registry_8004::give_feedback` (THE CPI target for TrustGate)

`lib.rs:139-161` → `reputation/instructions.rs:15-206`. **Permissions:** any signer EXCEPT the agent's owner (`reputation/instructions.rs:26-30`):

```rust
let core_owner = get_core_owner(&ctx.accounts.asset)?;
require!(
    core_owner != ctx.accounts.client.key(),
    RegistryError::SelfFeedbackNotAllowed
);
```

Signature:
```rust
pub fn give_feedback(
    ctx: Context<GiveFeedback>,
    value: i128,
    value_decimals: u8,
    score: Option<u8>,
    feedback_file_hash: Option<[u8; 32]>,
    tag1: String,
    tag2: String,
    endpoint: String,
    feedback_uri: String,
) -> Result<()>
```

Account context (`GiveFeedback` at `reputation/contexts.rs:8-57`):
- `client` (Signer, mut) — the feedback author. **For TrustGate this is `["trustgate_auth", facilitator]` PDA.**
- `agent_account` (mut, PDA seeds `[b"agent", asset]`, bump from cached `agent_account.bump`)
- `asset` (UncheckedAccount, constraint `asset.key() == agent_account.asset`)
- `collection` (UncheckedAccount, constraint `collection.key() == agent_account.collection` — added by SECURITY-AUDIT fix)
- `system_program`
- **All five of these are Optional and required-when-`atom_enabled`:**
  - `atom_config` (read, atom-engine PDA `[b"atom_config"]`)
  - `atom_stats` (mut, atom-engine PDA `[b"atom_stats", asset]`, with explicit PDA verification at `reputation/instructions.rs:58-65`)
  - `atom_engine_program` (UncheckedAccount, address-checked == `atom_engine::ID`)
  - `registry_authority` (UncheckedAccount, PDA seeds `[b"atom_cpi_authority"]` of agent_registry — used internally to PDA-sign the CPI to atom_engine)

Internal flow:
1. Verify caller is not agent's owner → reject.
2. Validate `value_decimals ≤ 18`, `score ≤ 100`, tag/uri lengths ≤ 32/250.
3. Check `atom_enabled` flag on `agent_account`.
4. If enabled and `atom_stats` provided: derive expected PDA `[b"atom_stats", asset]` against `atom_engine::ID`, compare, compute `atom_stats.data_len() > 0 && owner == atom_engine::ID`. If all true, `is_atom_initialized = true`.
5. If `is_atom_initialized && score.is_some()`: build `CpiContext::new_with_signer` using seeds `[ATOM_CPI_AUTHORITY_SEED, &[bump]]`, call `atom_engine::cpi::update_stats(client_hash, score)`. The atom-engine validates the registry_authority PDA matches `Pubkey::find_program_address(&[b"atom_cpi_authority"], &agent_registry::ID)` (per `atom-engine/contexts.rs:120-126` `is_valid_registry_authority` check).
6. Compute SEAL hash on-chain (`compute_seal_hash` over all feedback params) → hash-chain leaf → update `agent_account.feedback_digest` (rolling keccak) → increment `feedback_count` (with `checked_add`).
7. Emit `NewFeedback` event with full enriched fields (tier, quality, risk, etc.).

**Critical for TrustGate:** the `client` signer is the FEEDBACK AUTHOR. TrustGate's `["trustgate_auth", facilitator]` PDA becomes the on-chain author of every emitted feedback. This is auditable: the indexer can attribute each `NewFeedback` event to a specific facilitator.

CU envelope (per Wave 1 #2 measurements): `give_feedback` with full ATOM CPI is ~80K CU at typical Solana mainnet CU cost. The total transaction `gate_payment + transfer + emit_feedback` therefore fits comfortably under 200K CU per `set_compute_unit_limit(200_000)` recommendation.

**SelfFeedbackNotAllowed (RegistryError 6300) blocks self-rating.** TrustGate's PDA must NOT be the same pubkey as the agent's `core_owner`. Since TrustGate's PDA seeds are `["trustgate_auth", facilitator]` and facilitators are external entities (Dexter, atxp_ai, MCPay), this is structurally satisfied. Demo-time risk: if Mohit accidentally uses his demo wallet as both an agent owner AND a TrustGate facilitator pubkey, feedback emission breaks. **Mitigation:** demo wallets are separate from the facilitator authority.

### C.4 — `agent_registry_8004::revoke_feedback`

`lib.rs:165-171` → `reputation/instructions.rs:210-342`. Args: `(feedback_index: u64, seal_hash: [u8; 32])`. **Permissions:** any signer (the indexer ignores revocations from non-original-authors per the SECURITY-AUDIT-REPORT REP-H1 dismissal at line 169-176).

Internal flow mirrors `give_feedback` for the CPI to `atom_engine::revoke_stats`. Updates `agent_account.revoke_digest` and `revoke_count`. Emits `FeedbackRevoked`.

**For TrustGate dispute path:** TrustGate's `dispute_payment` instruction would emit a NEW negative-score feedback (score=20, tag1="dispute") rather than revoking a prior positive one. Why: revocation trails are events-only; new negative feedback is the canonical "downstream consumers see and react to" signal. Either approach works — Mohit picks based on demo storytelling.

### C.5 — `agent_registry_8004::append_response`

`lib.rs:175-191` → `reputation/instructions.rs:345-395`. **Permissions:** PERMISSIONLESS — any signer can append a response to any feedback (`reputation/contexts.rs:108-126`). Args: `(client_address, feedback_index, response_uri, response_hash, seal_hash)`. The seal_hash binds the response to the original feedback. Updates `response_digest` and `response_count`. Emits `ResponseAppended`.

AgentTrust does not currently invoke `append_response`. Future v1.1+: TrustGate could append responses to disputed feedback (e.g., merchant explanation of refund flow).

### C.6 — Identity-management instructions (set_metadata_pda, delete_metadata_pda, set_agent_uri, sync_owner, owner_of, core_owner_of, transfer_agent, set_agent_wallet, set_collection_pointer{_with_options}, set_parent_asset{_with_options}, enable_atom)

These are owner-only instructions for managing agent metadata. AgentTrust does not invoke any of them in v1. Brief signatures table (no further coverage):

| Instruction | Args | Permission |
|-------------|------|------------|
| `set_metadata_pda` | `(key_hash, key, value, immutable)` | owner |
| `delete_metadata_pda` | `(key_hash)` | owner |
| `set_agent_uri` | `(new_uri)` | owner |
| `sync_owner` | () | anyone (permissionless reconciliation) |
| `owner_of` | () view | anyone |
| `core_owner_of` | () view | anyone |
| `transfer_agent` | () | owner |
| `set_agent_wallet` | `(new_wallet, deadline)` | owner + Ed25519 sig + ≤300s deadline |
| `set_collection_pointer{_with_options}` | `(col, [lock])` | creator (first-write-wins) |
| `set_parent_asset{_with_options}` | `(parent_asset, [lock])` | parent's creator (first-write-wins) |
| `enable_atom` | () | owner (one-way) |

`set_agent_wallet` is interesting from a security perspective: it requires an Ed25519 verify instruction to be at instruction-index `current_idx - 1` (`identity/instructions.rs:506-509`) and validates that the sig/pubkey/message indices are all `0xFFFF` (inline) per `identity/instructions.rs:529-541`. This pattern is worth replicating in AgentTrust's ValidationRegistry for attestor signatures — it prevents signature-replay attacks across instructions.

### C.7 — `atom_engine::initialize_config`

`atom-engine/lib.rs:97-115`. Permissions: program upgrade authority only (`atom-engine/contexts.rs:14-38`). One-time call. AgentTrust does not invoke.

### C.8 — `atom_engine::update_config`

`atom-engine/lib.rs:120-215`. Permissions: config authority only. Allows hot-reload of EMA parameters, risk weights, thresholds, and pause flag. **Risk:** if Quantu hot-reloads `tier_platinum_quality` from 7000 to 8000 mid-hackathon, demo agents at quality_score 7100 lose tier 4. AgentTrust mitigation: gate on `tier_confirmed` for production paths (which is vested) AND/OR pin the demo to tier ≤ Gold (3) which has more headroom.

### C.9 — `atom_engine::initialize_stats`

`atom-engine/lib.rs:218-264`. **Permissions:** asset owner (must match Metaplex Core's owner read from `BaseAssetV1::from_bytes`). Pays ~0.005 SOL rent. Required before `update_stats` can be called.

**For pre-warming script:** after `register_with_options(uri, atom_enabled=true)`, the demo agent's owner (Mohit's demo wallets) immediately calls `initialize_stats(asset, collection)` to spin up the AtomStats PDA. Two transactions per agent. Optional micro-optimization: bundle both in a Jito bundle if Mohit has bundle access; sequential txs are fine for 5 agents.

### C.10 — `atom_engine::update_stats` (called from `give_feedback`'s CPI)

`atom-engine/lib.rs:270-315`. Args: `(client_hash: [u8; 32], score: u8)`. Returns `UpdateResult { trust_tier, quality_score, confidence, risk_score, diversity_ratio, hll_changed }`. **Permissions:** the `registry_authority` PDA (`[b"atom_cpi_authority"]` of agent_registry-8004 ID) must be a signer.

The actual algorithm runs in `atom-engine/src/compute.rs::update_stats()` (not read in this session — out of scope; the algorithm is correct per Quantu's audit + Kani harnesses, and AgentTrust trusts the cached output `trust_tier`/`tier_confirmed` regardless of internal mechanics).

### C.11 — `atom_engine::get_summary`

`atom-engine/lib.rs:319-341`. Returns the full Summary struct via CPI. Read-only. PolicyVault could call this via CPI to `atom_engine::cpi::get_summary` IF it imports the atom-engine crate — but per design, AgentTrust uses manual byte deserialization to avoid the crate dep. Manual deserialization saves on CPI overhead too (~5K CU per CPI vs 0 CU for direct PDA read).

### C.12 — `atom_engine::revoke_stats`

`atom-engine/lib.rs:357-440`. Permissions: registry_authority signer (same as update_stats). Internal logic searches the ring buffer + bypass buffer for the client's fingerprint, marks revoked, applies inverse correction to `quality_score`, decreases `confidence` by 100, recomputes derived metrics. Returns `RevokeResult`.

**Soft-fail behavior:** if the original feedback is too old (already evicted from the 24-slot ring buffer), revoke returns `had_impact: false` instead of erroring (per `atom-engine/lib.rs:354-359`). This matters for demo: if Mohit revokes feedback older than ~24 events ago, revoke succeeds but does nothing.

---

## D. Every event

### D.1 — Identity events (`identity/events.rs:1-100`)

| Event | Fields |
|-------|--------|
| `MetadataSet` | `asset, immutable, key, value` |
| `MetadataDeleted` | `asset, key` |
| `UriUpdated` | `asset, updated_by, new_uri` |
| `AgentOwnerSynced` | `asset, old_owner, new_owner` |
| `WalletUpdated` | `asset, old_wallet, new_wallet, updated_by` |
| `WalletResetOnOwnerSync` | `asset, old_wallet, new_wallet, owner_after_sync` |
| `CollectionPointerSet` | `asset, set_by, col` |
| `ParentAssetSet` | `asset, parent_asset, parent_creator, set_by` |
| `RegistryInitialized` | `collection, authority` |
| `AgentRegistered` | `asset, collection, owner, atom_enabled, agent_uri` |
| `AtomEnabled` | `asset, enabled_by` |

### D.2 — Reputation events (`reputation/events.rs:1-76`)

| Event | Key fields |
|-------|------------|
| `NewFeedback` | `asset, client_address, feedback_index, slot, value, value_decimals, score, feedback_file_hash, seal_hash, atom_enabled, new_trust_tier, new_quality_score, new_confidence, new_risk_score, new_diversity_ratio, is_unique_client, new_feedback_digest, new_feedback_count, tag1, tag2, endpoint, feedback_uri` |
| `FeedbackRevoked` | `asset, client_address, feedback_index, seal_hash, slot, original_score, atom_enabled, had_impact, new_trust_tier, new_quality_score, new_confidence, new_revoke_digest, new_revoke_count` |
| `ResponseAppended` | `asset, client, feedback_index, slot, responder, response_hash, seal_hash, new_response_digest, new_response_count` |

### D.3 — ATOM events (`atom-engine/events.rs:1-66`)

| Event | Key fields |
|-------|------------|
| `StatsUpdated` | `asset, feedback_index, score, trust_tier, risk_score, quality_score, confidence, diversity_ratio, hll_changed, loyalty_score` |
| `ConfigInitialized` | `authority, agent_registry_program` |
| `ConfigUpdated` | `authority, version` |
| `StatsInitialized` | `asset, collection` |
| `StatsRevoked` | `asset, client, original_score, had_impact, new_trust_tier, new_quality_score, new_confidence` |

**For AgentTrust's TrustGate observability:** subscribe to `NewFeedback` (the headline event with all enriched ATOM data) AND `StatsUpdated` (the atom-engine-side event for redundancy). Both fire on every successful feedback. The indexer (`8004-solana-indexer` reference impl) consumes these and persists to Supabase. AgentTrust's TrustGate Express server would WebSocket-subscribe to `NewFeedback` filtered on `client_address == TrustGate-facilitator-PDA` to verify its own feedback emission landed.

**Indexer multiplicity:** every successful `give_feedback` emits BOTH `NewFeedback` (in agent-registry) AND `StatsUpdated` (in atom-engine). Indexers must dedupe by `(asset, feedback_index)`. AgentTrust doesn't run an indexer in v1; we rely on Quantu's reference indexer + local PDA reads.

### D.4 — Archived validation events (`_archive/validation/events.rs:1-30`)

| Event | Key fields |
|-------|------------|
| `ValidationRequested` | `asset, validator_address, nonce, requester, request_hash, created_at, request_uri` |
| `ValidationResponded` | `asset, validator_address, nonce, response, response_hash, responded_at, response_uri, tag` |

AgentTrust's ValidationRegistry will define its own analogous events (`AttestationRegistered`, `AttestationRevoked`, etc.) per the v1_scope component definition. The archived structure informs but doesn't constrain the new design.

---

## E. Every error variant

`programs/agent-registry-8004/src/error.rs:3-128` defines `RegistryError` with codes 6000–6499 in semantic ranges:

| Range | Category | Notable codes |
|-------|----------|----------------|
| 6000–6049 | Identity | `UriTooLong (6000)`, `Unauthorized (6004)`, `Overflow (6005)`, `InvalidCollection (6010)`, `InvalidAsset (6011)`, `MetadataImmutable (6013)` |
| 6050–6099 | Reputation | `InvalidScore (6050)`, `AlreadyRevoked (6052)`, `InvalidFeedbackIndex (6055)`, `TagTooLong (6056)`, `InvalidDecimals (6061)`, `AtomStatsNotInitialized (6058)` |
| 6100–6149 | Validation (legacy code paths reserved) | `RequestUriTooLong (6100)`, `InvalidResponse (6101)`, `UnauthorizedValidator (6102)` |
| 6150–6199 | Metadata | `KeyHashMismatch (6150)`, `KeyHashCollision (6151)`, `ReservedMetadataKey (6152)` |
| 6200–6249 | Wallet | `DeadlineExpired (6200)`, `MissingSignatureVerification (6202)`, `InvalidSignature (6203)` |
| 6250–6299 | Registry | `RootAlreadyInitialized (6251)` |
| 6300–6309 | Anti-Gaming | `SelfFeedbackNotAllowed (6300)`, `SelfValidationNotAllowed (6301)` |
| 6400–6409 | CPI | `InvalidProgram (6400)`, `InvalidAtomStatsAccount (6401)` |

**TrustGate error mapping (calling `give_feedback`):**

| Quantu error | TrustGate's response |
|--------------|----------------------|
| `SelfFeedbackNotAllowed (6300)` | Map to TrustGate's `FacilitatorMisconfigured` — tells operator to use a non-owner facilitator authority |
| `InvalidScore (6050)` | Should never fire (TrustGate caps score at 100 client-side) — but map to internal-error if it does |
| `TagTooLong (6056)`, `EndpointTooLong (6060)` | TrustGate truncates tags to 32 bytes and endpoints to 250 bytes before constructing the ix |
| `Overflow (6005)` | Feedback counter has hit u64 max — physically impossible but map to internal-error |
| `InvalidProgram (6400)` | TrustGate passed a wrong atom_engine_program; assert correct ID before submission |
| `InvalidAtomStatsAccount (6401)` | TrustGate computed atom_stats PDA wrong; re-derive against `atom_engine::ID` |

`atom-engine/error.rs` defines a smaller `AtomError` (15 variants, codes 6000+ in atom-engine's namespace). PolicyVault's manual reads only fail on PDA-derivation/owner-check errors — not on `AtomError` (which only fire during atom-engine instructions, which AgentTrust doesn't invoke).

---

## F. Every constant

### F.1 — `agent-registry-8004/src/constants.rs`

| Constant | Value | Purpose |
|----------|-------|---------|
| `BPF_LOADER_UPGRADEABLE_ID` | `pubkey!("BPFLoaderUpgradeab1e11111111111111111111111")` | For verifying program upgrade authority |
| `SEED_ROOT_CONFIG` | `b"root_config"` | RootConfig PDA seed |
| `SEED_REGISTRY_CONFIG` | `b"registry_config"` | RegistryConfig PDA seed |
| `SEED_AGENT` | `b"agent"` | AgentAccount PDA seed |
| `SEED_AGENT_META` | `b"agent_meta"` | MetadataEntryPda seed prefix |

### F.2 — `agent-registry-8004/src/reputation/state.rs`

| Constant | Value | Purpose |
|----------|-------|---------|
| `MAX_TAG_LENGTH` | `32` | tag1, tag2 byte cap |
| `MAX_URI_LENGTH` | `250` | feedback_uri, response_uri byte cap |
| `MAX_ENDPOINT_LENGTH` | `250` | endpoint byte cap |
| `MAX_VALUE_DECIMALS` | `18` | value_decimals max |

### F.3 — `agent-registry-8004/src/reputation/contexts.rs`

| Constant | Value | Purpose |
|----------|-------|---------|
| `ATOM_CPI_AUTHORITY_SEED` | `b"atom_cpi_authority"` | Seed for the CPI signer PDA — derived against agent-registry-8004 program ID |

### F.4 — `agent-registry-8004/src/identity/instructions.rs`

| Constant | Value | Purpose |
|----------|-------|---------|
| `MAX_DEADLINE_WINDOW` | `300` (seconds) | set_agent_wallet deadline ceiling |
| `WALLET_SET_MESSAGE_PREFIX` | `b"8004_WALLET_SET:"` | Domain separator for Ed25519 message |
| `COLLECTION_POINTER_PREFIX` | `"c1:"` | col field validation prefix |

### F.5 — `atom-engine/src/params.rs` (highlights — full list ~50 constants)

| Constant | Value | Purpose |
|----------|-------|---------|
| `EPOCH_SLOTS` | `432_000` | ~2.5 days at Solana mainnet slot times |
| `TIER_VESTING_EPOCHS` | `8` | ~20 days before `tier_candidate` → `tier_confirmed` |
| `TIER_PLATINUM_MIN_LOYALTY` | `500` | Loyalty floor to candidate Platinum |
| `TIER_HYSTERESIS` | `200` | Quality units margin for promote/demote |
| `RING_BUFFER_SIZE` | `24` | Recent callers ring slots |
| `MRT_MIN_SLOTS` | `150` (~60s) | Minimum residency time before eviction |
| `HLL_REGISTERS` | `256` | HLL capacity (~6.5% error) |
| `COLD_START_MIN` | `5` | Feedbacks before any confidence |
| `COLD_START_MAX` | `15` | Feedbacks for full confidence |
| `LOYALTY_MIN_SLOT_DELTA` | `2000` | Slot gap for loyalty bonus |
| `LOYALTY_SCORE_MAX` | `1000` | Anti-Sybil cap |

These constants govern the demo math. Mohit's `prewarm-demo-agents.ts` script should target ≥15 feedbacks per agent (full confidence) with ≥3 distinct client wallets (diversity bonus) over Days 5–12 to achieve Bronze→Silver→Gold. Platinum is out of reach in 7 days due to loyalty constraints.

---

## G. Every Cargo dep

`agent-registry-8004/Cargo.toml:23-26`:

| Dep | Version | Reason | Semver-bump risk for AgentTrust |
|-----|---------|--------|---------------------------------|
| `anchor-lang` | `0.31.1` | Anchor framework | LOW — AgentTrust uses Anchor 1.0+ independently; manual deserialization sidesteps ABI coupling |
| `anchor-spl` | `0.31.1` | SPL token integration | NONE for AgentTrust |
| `mpl-core` | `0.11.1` | Metaplex Core CPIs | NONE for AgentTrust (we don't touch Core directly) |
| `atom-engine` | (path dep) | Typed CPI to atom-engine | NONE for AgentTrust (we use manual `invoke_signed` with raw instruction data) |

`atom-engine/Cargo.toml` deps (inferred from imports — not separately read):
- `anchor-lang = "0.31.1"`
- `mpl-core = "0.11.1"`

**AgentTrust's Cargo deps will NOT include any Quantu crate.** This is a deliberate decoupling. Mohit's three programs depend only on `anchor-lang = "1.0.x"` (AgentTrust's choice) + `solana-program` (whatever Anchor brings in) + standard SPL/Token-2022 if needed by Spending policy kind.

---

## H. TODO / FIXME / HACK / WARN catalog

```bash
cd /tmp/quantu-research/8004-solana && grep -rn -E "TODO|FIXME|HACK|WARN" --include="*.rs" programs/
```

Counted ~12 hits, ranked by severity for AgentTrust:

| Severity | File:line | Type | Context |
|----------|-----------|------|---------|
| HIGH | `reputation/instructions.rs` (multiple) | WARN-style comments | "WARNING: This returns the cached owner from AgentAccount, not the live Core owner" — `agent_account.owner` may be stale until `sync_owner` is called. **AgentTrust must call `core_owner_of` for authoritative owner reads, NOT `owner_of`.** |
| MEDIUM | `state.rs` (atom-engine) | DEPRECATED comments | `ALPHA_QUALITY` (`params.rs:25`), `ALPHA_BURST_UP/DOWN` (`params.rs:125-126`), `BURST_NEGATIVE_DAMPENING` (`params.rs:62`), `ENTROPY_GATE_MAX_DAMPENING` (`params.rs:117`), `V7_PANIC_SALT_MASK` (`params.rs:317`) — kept for backwards compatibility. Replaced by asymmetric `ALPHA_QUALITY_UP` / `ALPHA_QUALITY_DOWN`. Risk: a future Quantu cleanup could remove these. AgentTrust doesn't reference them. |
| LOW | `reputation/instructions.rs:202-205` | NOTE comment | "NOTE: If atom_enabled but stats not initialized, feedback still works but without ATOM scoring." — design choice to prevent sellers from blocking all feedback. AgentTrust's CounterpartyTier policy must handle the `atom_stats.data_len() == 0` case gracefully (treat as Unrated tier 0). |
| INFO | Multiple | Comment-noted security-audit fixes | "SECURITY FIX: Ed25519 instruction MUST be at index (current_index - 1)" — relevant if AgentTrust's ValidationRegistry uses Ed25519 attestations. |

The HIGH WARN about cached owner is the single most important footgun. **AgentTrust's CounterpartyTier policy MUST NOT rely on `agent_account.owner` for any authorization decision.** It only reads `trust_tier` from `AtomStats` (which the agent's owner cannot directly manipulate without genuine feedback events).

---

## I. Archived ValidationRegistry — git archaeology + reconstructed design

Wave 1 #3 (`03-erc8004-validation-registry-archaeology.md`) covers this in 1,320 lines. Brief summary here for the source-code class file:

### I.1 — Archival commit + reason

Per `SECURITY-AUDIT-REPORT.md:240-243`, the audit (2026-02-05) flagged `VALID-H1: Validation Request Spam DoS` (HIGH → MEDIUM): *"Attackers can create unlimited ValidationRequest PDAs."* Accepted as risk because the economic deterrent (~0.00120 SOL rent per spam PDA) is non-trivial. The next day (commit `58ff2ee`, per Wave 1 #3's git-log analysis), Quantu refactored to single-collection v0.6.0 architecture and moved validation to `_archive/validation/` with the message *"Validation will be re-added in a future upgrade with improved design."*

`README.md:36` confirms: *"Validation module archived for future upgrade."*

The v0.5.0 CHANGELOG (2026-01-26) doesn't explicitly mention the validation removal (it lists only "Removed: Base Registry Rotation"), but the accompanying refactor introduced single-collection architecture in the same release, so the validation archival happened in the v0.5.0 → v0.6.0 transition window.

### I.2 — Archived design (read from `_archive/validation/`)

**`ValidationConfig` PDA** at `[b"validation_config"]`. 49 bytes data. Initialized only by program upgrade authority. Tracks `total_requests` and `total_responses` counters.

**`ValidationRequest` PDA** at `[b"validation", asset, validator_address, nonce.to_le_bytes()]`. 109 bytes. Single-validator-per-request model: each validator can have multiple validation requests against the same asset (different nonces).

Fields: `asset`, `validator_address`, `nonce` (u32), `request_hash` ([u8;32]), `response` (u8 0–100), `responded_at` (i64).

**Instructions:**
- `initialize_validation_config` (upgrade authority only)
- `request_validation(asset_key, validator_address, nonce, request_uri, request_hash)` — agent owner pays rent
- `respond_to_validation(asset_key, validator_address, nonce, response, response_uri, response_hash, tag)` — validator-only (constraint `validation_request.validator_address == validator.key()`)

**Events:** `ValidationRequested`, `ValidationResponded`. URIs and tag stored in events only (rent optimization).

**Self-validation blocked:** per `_archive/validation/instructions.rs:75-80`: *"core_owner != validator_address"* enforced in both `request_validation` and `respond_to_validation`. Per error code `SelfValidationNotAllowed (6301)`.

**No close/delete:** per ERC-8004 spec — *"On-chain pointers and hashes cannot be deleted, ensuring audit trail integrity"* (`_archive/validation/instructions.rs:204-211`).

### I.3 — How AgentTrust's ValidationRegistry diverges

The archived design is **single-validator** (one PDA per asset+validator+nonce). AgentTrust's design is **capability-namespaced** (one PDA per asset+capability_hash+attestor) — see `v1_scope.md` Component 3.

Key differences:
1. AgentTrust's PDAs index on `capability_hash` (semantic key) rather than `nonce` (sequence number). Allows multiple attestors to attest the same capability.
2. AgentTrust adds `AttestorProfile` PDA at `[b"attestor", attestor_pubkey]` for downstream-consumer-filtering trust weights.
3. AgentTrust's spam-DoS mitigation is per-attestor rate limiting via the AttestorProfile counter (Wave 1 #3 Section J for full design). The archived design relied solely on rent-economic deterrence.
4. AgentTrust adds `register_namespace` to permissionlessly create capability namespaces (10 v1 namespaces seeded) — the archived design had no namespace concept.

Wave 1 #3 confirmed the corrected `ValidationAttestation` PDA size at **282 bytes** (revised up from `v1_scope.md`'s 256-byte estimate to accommodate the Ed25519 signature + revocation reason hash). The change file `plan/final_idea/changes/2026-04-29-validation-attestation-282-bytes.md` (TBD on Day 5) will land this revision.

---

## J. AgentTrust CPI integration cookbook

The most important section of this file. Three runnable code blocks: `gate_payment` PolicyVault skeleton (with manual AtomStats deserialization), TrustGate `emit_feedback` PDA-signed CPI (with manual instruction encoding — no Quantu crate), and the registry_authority PDA derivation helper.

### J.1 — PolicyVault `gate_payment` (CounterpartyTier policy kind)

Goal: read `AtomStats.trust_tier` for the payee and gate Allow/Deny based on `min_counterparty_tier`. Falls back gracefully if AtomStats is uninitialized.

```rust
// File: programs/policy-vault/src/policies/counterparty_tier.rs

use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;

// Constants from Wave 1 #1 byte-offset analysis
pub const ATOM_STATS_SIZE: usize = 561;
pub const ATOM_STATS_TRUST_TIER_OFFSET: usize = 551;
pub const ATOM_STATS_TIER_CONFIRMED_OFFSET: usize = 555;
pub const ATOM_STATS_RISK_SCORE_OFFSET: usize = 549;
pub const ATOM_STATS_CONFIDENCE_OFFSET: usize = 557;
pub const ATOM_STATS_SCHEMA_VERSION_OFFSET: usize = 560;

// Quantu mainnet program ID (pinned via docs/PINNED-VERSIONS.md)
pub const QUANTU_ATOM_ENGINE_ID: Pubkey =
    solana_program::pubkey!("AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb");

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub enum TierGateMode {
    /// Use trust_tier (immediate, but candidate-not-confirmed) — for demos
    Immediate,
    /// Use tier_confirmed (post-8-epoch vesting, ~20 days) — for production
    Confirmed,
}

/// Read AtomStats.trust_tier (or tier_confirmed) from a foreign-owned PDA.
/// Returns Ok(None) if AtomStats is uninitialized — caller decides fallback.
/// Returns Err on PDA mismatch or wrong owner — these are programming bugs.
pub fn read_atom_tier(
    atom_stats_account: &AccountInfo,
    expected_asset: &Pubkey,
    mode: TierGateMode,
) -> Result<Option<u8>> {
    // 1. If account is uninitialized (lamports=0 or data_len=0), atom is not enabled
    if atom_stats_account.lamports() == 0 || atom_stats_account.data_len() == 0 {
        return Ok(None);
    }

    // 2. Owner check — MUST be atom-engine
    require_keys_eq!(
        *atom_stats_account.owner,
        QUANTU_ATOM_ENGINE_ID,
        PolicyError::WrongAtomStatsOwner
    );

    // 3. PDA derivation check
    let (expected_pda, _bump) = Pubkey::find_program_address(
        &[b"atom_stats", expected_asset.as_ref()],
        &QUANTU_ATOM_ENGINE_ID,
    );
    require_keys_eq!(
        atom_stats_account.key(),
        expected_pda,
        PolicyError::WrongAtomStatsPda
    );

    // 4. Size check
    let data = atom_stats_account.try_borrow_data()?;
    require!(data.len() == ATOM_STATS_SIZE, PolicyError::AtomStatsSizeMismatch);

    // 5. Schema version check
    let schema_version = data[ATOM_STATS_SCHEMA_VERSION_OFFSET];
    require!(schema_version == 1, PolicyError::AtomStatsSchemaUnsupported);

    // 6. Read tier byte
    let tier = match mode {
        TierGateMode::Immediate => data[ATOM_STATS_TRUST_TIER_OFFSET],
        TierGateMode::Confirmed => data[ATOM_STATS_TIER_CONFIRMED_OFFSET],
    };

    Ok(Some(tier))
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub struct CounterpartyTierConfig {
    /// Minimum tier the payee must have (0..=4)
    pub min_counterparty_tier: u8,
    /// Optional: maximum risk_score the payee can have (0..=100; 255 = no constraint)
    pub max_risk_score: u8,
    /// Optional: minimum confidence (0..=10000; 0 = no constraint)
    pub min_confidence: u16,
    /// Which tier to gate on
    pub gate_mode: TierGateMode,
}

#[derive(Debug)]
pub enum CounterpartyDecision {
    Allow,
    Deny(DenyReason),
    /// Atom not initialized — caller decides (e.g., RequireValidation fallback)
    Unrated,
}

#[derive(Debug)]
pub enum DenyReason {
    BelowMinTier { actual: u8, required: u8 },
    AboveMaxRisk { actual: u8, max: u8 },
    BelowMinConfidence { actual: u16, required: u16 },
}

pub fn evaluate_counterparty_tier(
    config: &CounterpartyTierConfig,
    atom_stats_account: &AccountInfo,
    payee_asset: &Pubkey,
) -> Result<CounterpartyDecision> {
    let tier_opt = read_atom_tier(atom_stats_account, payee_asset, config.gate_mode)?;

    let Some(tier) = tier_opt else {
        return Ok(CounterpartyDecision::Unrated);
    };

    if tier < config.min_counterparty_tier {
        return Ok(CounterpartyDecision::Deny(DenyReason::BelowMinTier {
            actual: tier,
            required: config.min_counterparty_tier,
        }));
    }

    if config.max_risk_score < 255 {
        let data = atom_stats_account.try_borrow_data()?;
        let risk = data[ATOM_STATS_RISK_SCORE_OFFSET];
        if risk > config.max_risk_score {
            return Ok(CounterpartyDecision::Deny(DenyReason::AboveMaxRisk {
                actual: risk,
                max: config.max_risk_score,
            }));
        }
    }

    if config.min_confidence > 0 {
        let data = atom_stats_account.try_borrow_data()?;
        let confidence = u16::from_le_bytes([
            data[ATOM_STATS_CONFIDENCE_OFFSET],
            data[ATOM_STATS_CONFIDENCE_OFFSET + 1],
        ]);
        if confidence < config.min_confidence {
            return Ok(CounterpartyDecision::Deny(DenyReason::BelowMinConfidence {
                actual: confidence,
                required: config.min_confidence,
            }));
        }
    }

    Ok(CounterpartyDecision::Allow)
}
```

This is 100 LOC. Per Wave 1 #2's CU envelope: ~5K CU per `read_atom_tier` call (PDA derivation 1500 CU + ownership check 100 CU + data borrow 50 CU + offset reads ~50 CU). Well under any threshold.

**Note on `TierGateMode::Immediate` vs `Confirmed`:** demo agents pre-warmed Day 5 use `Immediate` for the headline demo (post-feedback `trust_tier` reflects new tier within seconds). Production deployments use `Confirmed` for the sybil-resistant variant (tier requires 8-epoch vesting). PolicyVault stores the `gate_mode` per-policy, so each facilitator picks at policy-creation time.

### J.2 — TrustGate `emit_feedback` PDA-signed CPI to `give_feedback`

Goal: TrustGate's `emit_feedback` instruction calls `give_feedback` on agent-registry-8004 with TrustGate's own PDA as the `client` signer. No Quantu crate dep — manual instruction encoding.

```rust
// File: programs/trustgate/src/instructions/emit_feedback.rs

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke_signed,
    sysvar,
};
use sha2::{Digest, Sha256};

// Pinned Quantu IDs
pub const QUANTU_AGENT_REGISTRY_ID: Pubkey =
    solana_program::pubkey!("8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ");
pub const QUANTU_ATOM_ENGINE_ID: Pubkey =
    solana_program::pubkey!("AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb");

// Quantu's atom_cpi_authority seed (used to derive the registry-side PDA we pass through)
pub const ATOM_CPI_AUTHORITY_SEED: &[u8] = b"atom_cpi_authority";

// Anchor sighash: keccak("global:give_feedback")[..8]
// Computed at compile time. Wave 1 #2 confirmed this value:
pub const GIVE_FEEDBACK_DISCRIMINATOR: [u8; 8] = [145, 136, 123, 3, 215, 165, 98, 41];

// TrustGate's own seed
pub const TRUSTGATE_AUTH_SEED: &[u8] = b"trustgate_auth";

#[derive(Accounts)]
#[instruction(payment_id: [u8; 32])]
pub struct EmitFeedback<'info> {
    /// TrustGate's program-owned signer PDA (will sign as the give_feedback `client`)
    #[account(
        seeds = [TRUSTGATE_AUTH_SEED, facilitator.key().as_ref()],
        bump,
    )]
    pub trustgate_authority: SystemAccount<'info>,

    /// The facilitator's pubkey (used as a seed)
    /// CHECK: only used as a seed component
    pub facilitator: UncheckedAccount<'info>,

    /// Payer for any rent (idempotency log creation)
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Idempotency log — prevents double-emission
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + FeedbackEmissionLog::INIT_SPACE,
        seeds = [b"feedback_log", payment_id.as_ref()],
        bump,
    )]
    pub feedback_log: Account<'info, FeedbackEmissionLog>,

    /// Quantu agent_registry's AgentAccount for the payee
    /// CHECK: validated by the give_feedback program
    #[account(mut)]
    pub agent_account: UncheckedAccount<'info>,

    /// Payee's Metaplex Core asset
    /// CHECK: validated by give_feedback
    pub asset: UncheckedAccount<'info>,

    /// Payee's collection
    /// CHECK: validated by give_feedback
    pub collection: UncheckedAccount<'info>,

    /// Atom config (for CPI to atom_engine)
    /// CHECK: derived & validated below
    pub atom_config: UncheckedAccount<'info>,

    /// Atom stats (mut — atom_engine writes back)
    /// CHECK: validated by give_feedback's PDA verification
    #[account(mut)]
    pub atom_stats: UncheckedAccount<'info>,

    /// Quantu atom_cpi_authority PDA — derived against agent-registry program ID
    /// CHECK: agent-registry signs for this internally
    pub registry_authority: UncheckedAccount<'info>,

    /// Agent registry program ID
    /// CHECK: address-checked
    #[account(address = QUANTU_AGENT_REGISTRY_ID)]
    pub agent_registry_program: UncheckedAccount<'info>,

    /// Atom engine program ID
    /// CHECK: address-checked
    #[account(address = QUANTU_ATOM_ENGINE_ID)]
    pub atom_engine_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct FeedbackEmissionLog {
    pub payment_id: [u8; 32],
    pub asset: Pubkey,
    pub score: u8,
    pub emitted_at_slot: u64,
    pub bump: u8,
}

pub fn emit_feedback(
    ctx: Context<EmitFeedback>,
    payment_id: [u8; 32],
    score: u8,            // 0..=100
    tag1: String,         // ≤32 bytes
    tag2: String,         // ≤32 bytes
    endpoint: String,     // ≤250 bytes
    feedback_uri: String, // ≤250 bytes
) -> Result<()> {
    // 1. Idempotency: if log already populated, skip
    let log = &mut ctx.accounts.feedback_log;
    if log.emitted_at_slot != 0 {
        msg!("feedback already emitted at slot {}, skipping", log.emitted_at_slot);
        return Ok(());
    }

    // 2. Validate score range (also enforced by agent-registry; we double-check)
    require!(score <= 100, TrustGateError::InvalidScore);

    // 3. Validate string lengths
    require!(tag1.len() <= 32, TrustGateError::TagTooLong);
    require!(tag2.len() <= 32, TrustGateError::TagTooLong);
    require!(endpoint.len() <= 250, TrustGateError::EndpointTooLong);
    require!(feedback_uri.len() <= 250, TrustGateError::UriTooLong);

    // 4. Build give_feedback instruction data manually (no Quantu crate dep).
    //    Args order (per agent-registry-8004/src/lib.rs:139-149):
    //    value: i128, value_decimals: u8, score: Option<u8>,
    //    feedback_file_hash: Option<[u8; 32]>, tag1: String, tag2: String,
    //    endpoint: String, feedback_uri: String
    let mut data = Vec::with_capacity(256);
    data.extend_from_slice(&GIVE_FEEDBACK_DISCRIMINATOR);

    // value: i128 (16 bytes, LE)
    let value: i128 = 0;
    data.extend_from_slice(&value.to_le_bytes());

    // value_decimals: u8
    data.push(0u8);

    // score: Option<u8> -> 0x01 + value
    data.push(0x01);
    data.push(score);

    // feedback_file_hash: Option<[u8; 32]> -> 0x00 (None)
    data.push(0x00);

    // tag1: String (4-byte length + bytes)
    data.extend_from_slice(&(tag1.len() as u32).to_le_bytes());
    data.extend_from_slice(tag1.as_bytes());

    // tag2
    data.extend_from_slice(&(tag2.len() as u32).to_le_bytes());
    data.extend_from_slice(tag2.as_bytes());

    // endpoint
    data.extend_from_slice(&(endpoint.len() as u32).to_le_bytes());
    data.extend_from_slice(endpoint.as_bytes());

    // feedback_uri
    data.extend_from_slice(&(feedback_uri.len() as u32).to_le_bytes());
    data.extend_from_slice(feedback_uri.as_bytes());

    // 5. Build the Instruction. AccountMetas in the same order as agent-registry's
    //    GiveFeedback context:
    //    1) client (Signer, mut) — TrustGate's authority PDA
    //    2) agent_account (mut)
    //    3) asset
    //    4) collection
    //    5) system_program
    //    Then Optional ATOM accounts (all five required when atom_enabled):
    //    6) atom_config
    //    7) atom_stats (mut)
    //    8) atom_engine_program
    //    9) registry_authority
    let ix = Instruction {
        program_id: QUANTU_AGENT_REGISTRY_ID,
        accounts: vec![
            AccountMeta::new(ctx.accounts.trustgate_authority.key(), true), // signer
            AccountMeta::new(ctx.accounts.agent_account.key(), false),
            AccountMeta::new_readonly(ctx.accounts.asset.key(), false),
            AccountMeta::new_readonly(ctx.accounts.collection.key(), false),
            AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
            AccountMeta::new_readonly(ctx.accounts.atom_config.key(), false),
            AccountMeta::new(ctx.accounts.atom_stats.key(), false),
            AccountMeta::new_readonly(ctx.accounts.atom_engine_program.key(), false),
            AccountMeta::new_readonly(ctx.accounts.registry_authority.key(), false),
        ],
        data,
    };

    // 6. PDA-signed invoke. TrustGate signs for its own authority PDA.
    let bump = ctx.bumps.trustgate_authority;
    let facilitator_key = ctx.accounts.facilitator.key();
    let trustgate_seeds: &[&[u8]] = &[TRUSTGATE_AUTH_SEED, facilitator_key.as_ref(), &[bump]];
    let signer_seeds: &[&[&[u8]]] = &[trustgate_seeds];

    invoke_signed(
        &ix,
        &[
            ctx.accounts.trustgate_authority.to_account_info(),
            ctx.accounts.agent_account.to_account_info(),
            ctx.accounts.asset.to_account_info(),
            ctx.accounts.collection.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.atom_config.to_account_info(),
            ctx.accounts.atom_stats.to_account_info(),
            ctx.accounts.atom_engine_program.to_account_info(),
            ctx.accounts.registry_authority.to_account_info(),
            ctx.accounts.agent_registry_program.to_account_info(), // program account, not in metas but required
        ],
        signer_seeds,
    )?;

    // 7. Mark idempotency log
    log.payment_id = payment_id;
    log.asset = ctx.accounts.asset.key();
    log.score = score;
    log.emitted_at_slot = Clock::get()?.slot;
    log.bump = ctx.bumps.feedback_log;

    Ok(())
}
```

This is the complete reference TrustGate `emit_feedback` instruction. ~150 LOC. CU envelope per Wave 1 #2: ~80K CU including the give_feedback CPI (which itself does an internal CPI to atom-engine).

**Two critical correctness conditions:**
1. **`GIVE_FEEDBACK_DISCRIMINATOR` MUST equal `keccak("global:give_feedback")[..8]`** — Wave 1 #2 computed this as `[145, 136, 123, 3, 215, 165, 98, 41]`. AgentTrust must compute it independently (e.g., via a build script or unit test) and assert equality at startup. If Quantu renames `give_feedback` (extremely unlikely — would be a major breaking change), the discriminator changes and this code stops compiling at runtime with a discriminator mismatch.
2. **`registry_authority` PDA MUST be derived from `[b"atom_cpi_authority"]` against `QUANTU_AGENT_REGISTRY_ID`**, not against TrustGate's own ID. The constraint inside `atom_engine::contexts::is_valid_registry_authority` (`atom-engine/contexts.rs:120-126`) enforces this — passing the wrong PDA causes `AtomError::UnauthorizedCaller`.

### J.3 — registry_authority PDA derivation helper

```rust
/// Derive Quantu's atom_cpi_authority PDA — the address agent-registry uses internally
/// to sign CPIs into atom-engine. TrustGate must pass this address as one of the accounts
/// in its CPI call to give_feedback (but does not sign for it).
pub fn derive_registry_authority() -> Pubkey {
    let (pda, _bump) = Pubkey::find_program_address(
        &[ATOM_CPI_AUTHORITY_SEED],
        &QUANTU_AGENT_REGISTRY_ID,
    );
    pda
}
```

The bump is not needed by TrustGate — agent-registry computes its own bump via `ctx.bumps.registry_authority` when it does the internal CPI. TrustGate just passes the PDA address.

---

## K. Gotcha catalog (ranked by severity)

1. **Cached `agent_account.owner` may be stale (HIGH).** Per `identity/instructions.rs:212-220`, post-Metaplex-transfer, the cached owner is stale until `sync_owner` is called. AgentTrust must use `core_owner_of` for any authorization decision — though PolicyVault doesn't make owner-based decisions in v1, ValidationRegistry's "subject's owner can request validation" instruction must use the live read.
2. **TrustGate authority cannot be the agent's owner (HIGH).** `SelfFeedbackNotAllowed (6300)` blocks. Mitigation: facilitator pubkeys are external to demo wallets. **Demo gotcha:** Mohit cannot use his demo Mac wallet as both an agent owner AND a TrustGate `facilitator` seed value.
3. **`AtomStats` may not be initialized even when `atom_enabled = true` (MEDIUM).** Per `reputation/instructions.rs:201-206`. CounterpartyTier policy must check `atom_stats.lamports() > 0 && data_len > 0` before deserializing — fall back to `Unrated` decision (caller chooses Allow/Deny based on `default_unrated_treatment` config).
4. **`AtomStats` is owned by `atom_engine` not `agent_registry` (MEDIUM).** PolicyVault's owner check must compare against `QUANTU_ATOM_ENGINE_ID = AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb`, not the agent_registry ID.
5. **`set_metadata_pda` is `init_if_needed` — same instruction creates OR updates (MEDIUM).** AgentTrust doesn't call this, but if Wave 1.1 adds metadata-policy reads, the caller must distinguish create-vs-update via a prior PDA existence check.
6. **`give_feedback` instruction emits TWO events (MEDIUM).** `NewFeedback` from agent-registry AND `StatsUpdated` from atom-engine. Indexers must dedupe by `(asset, feedback_index)` — or subscribe to one and ignore the other. AgentTrust's TrustGate Express server should subscribe only to `NewFeedback` for simplicity.
7. **Borsh `String` fields in AgentAccount have `#[max_len()]` allocation but variable runtime size (LOW).** Reading past offset 325 (`col_locked`) is unreliable since agent_uri/nft_name/col are dynamic. PolicyVault never reads past 325.
8. **HLL salt rotation could in principle invalidate trust_tier mid-tx (LOW).** Per `params.rs:248-249`, salt rotates every 10,000 slots (~2.5 hours). The post-rotation `update_stats` recomputes against the new salt. AgentTrust's `gate_payment` is single-tx and doesn't span rotations — no impact.
9. **`agent_account.bump` must come from cached value, not `find_program_address` (LOW).** Saves ~1500 CU per read. Already enforced by Anchor `bump = agent_account.bump` constraint.
10. **`ed25519_program` instruction-index check requires `current_idx ≥ 1` (LOW).** Per `identity/instructions.rs:506-509`. AgentTrust's ValidationRegistry attestor signature flow should replicate this check (sig must be at index `current_idx - 1`).

---

## L. Risk register: "what changes if Quantu pushes v0.7.0 mid-hackathon"

The mainnet binary at `8oo4dC4...` is already the latest published; per the README, the current stable is v0.6.0 with mainnet binary hash `5aeae71...`. A v0.7.0 push is plausible (Quantu ships aggressively). Per-PDA risk:

| PDA | Risk of layout shift in v0.7.0 | AgentTrust mitigation | Days of rework if hit |
|-----|---------------------------------|------------------------|------------------------|
| `RootConfig` | LOW — small singleton | Not consumed by AgentTrust | 0 |
| `RegistryConfig` | LOW | Not consumed | 0 |
| `AgentAccount` | MEDIUM — InitSpace strings could shift if max_lens change | PolicyVault reads only `atom_enabled` (offset 137) and `agent_wallet` discriminant (offset 138) which are pre-string fields. Risk: only if Quantu inserts new fields BEFORE these. | 0–1 if pre-string fields shift |
| `MetadataEntryPda` | LOW | Not consumed in v1 | 0 |
| `AtomStats` | **MEDIUM-HIGH — schema_version IS the canary** | Schema version check at offset 560: `require!(data[560] == 1)`. If v0.7.0 bumps to schema_version = 2, AgentTrust fails-loud and falls back to `Unrated`. Mohit then publishes a v1.1 patch with new offsets. | 1–2 if AgentTrust patch needed |
| `AtomConfig` | LOW | Not directly read | 0 |

**Per-instruction risk:**

| Instruction | Risk of arg signature change | Mitigation |
|-------------|-------------------------------|------------|
| `give_feedback` | LOW — args set in stone since v0.5.0 | Discriminator pinned. If signature changes, tx fails-loud at deserialization. |
| `update_stats` (atom-engine) | LOW — internal CPI from agent-registry | AgentTrust never calls directly |
| `register` | NONE — AgentTrust does not call | N/A |

**Aggregate risk assessment:** v0.7.0 is **medium-likely** mid-hackathon (Quantu ships every 2-4 weeks). The single critical path is `AtomStats` schema. Mitigation: defensive schema_version check + graceful Unrated fallback. Probability of catastrophic break: **<10%**. Days lost if hit: **1–2 max**, well within the cut-priority budget.

**Pin commit hash:** `bfb09ad` (HEAD of `main` 2026-04-28). AgentTrust documents this in `docs/PINNED-VERSIONS.md` and includes the binary hash `5aeae71...` for mainnet verification. If Quantu pushes a new mainnet deploy, AgentTrust's pinned hash continues to refer to the v0.6.0 layout — and AgentTrust's manual deserialization stays correct.

---

## M. Pinned commit recommendation

**Pin to `bfb09ad`** (HEAD of `main`, 2026-04-28).

`docs/PINNED-VERSIONS.md` reference content:

```markdown
# Pinned external dependencies

AgentTrust v1 binds to specific versions of Quantu's MIT-licensed primitives.
The pin is informational — AgentTrust uses manual byte-offset deserialization
that does not require Quantu's Cargo crate as a dependency. The pin commit
defines the byte layouts AgentTrust's manual deserialization targets.

## agent-registry-8004
- Repo: https://github.com/QuantuLabs/8004-solana
- Pin commit: bfb09ad ("docs: require root-cause audits in agents workflow")
- As-of: 2026-04-28
- Mainnet program ID: 8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ
- Mainnet binary SHA-256: 5aeae715714861fd43ac09d80bc51f70836b27a325a2c2131374121c6c05a5c8
- Verified by: solana program dump --url mainnet-beta + shasum -a 256 (per Quantu README)

## atom-engine
- Repo: https://github.com/QuantuLabs/8004-atom
- Pin commit: HEAD on 2026-04-28 (co-cloned snapshot)
- As-of: 2026-04-28
- Mainnet program ID: AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb

## Schema versions consumed
- AtomStats schema_version: 1 (verified at byte offset 560)
- AgentAccount: post-SEAL-v1 layout (collection at offset 8, atom_enabled at 137,
  agent_wallet discriminant at 138, agent_wallet pubkey at 139–170 if Some)
```

AgentTrust does NOT add a Cargo `git = ".../8004-solana", rev = "bfb09ad"` dep — that would couple AgentTrust to Quantu's `anchor-lang = "0.31.1"` while AgentTrust uses Anchor 1.0. Manual deserialization is the chosen path; the pin is a documentation discipline.

---

## N. What this means for Mohit's submission

1. **Pin commit hash `bfb09ad`** in `docs/PINNED-VERSIONS.md` Day 5 morning. Mainnet program IDs are fixed: `8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ` (agent-registry), `AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb` (atom-engine). Devnet differs: `8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C`, `AToMufS4QD6hEXvcvBDg9m1AHeCLpmZQsyfYa5h9MwAF`.
2. **AtomStats trust_tier byte offset = 551 (account-absolute), tier_confirmed = 555.** PolicyVault's `read_atom_tier` helper in `policies/counterparty_tier.rs` should expose `TierGateMode::Immediate` (offset 551) for demos and `TierGateMode::Confirmed` (offset 555) for production. Schema version check at offset 560.
3. **CounterpartyTier policy MUST handle three uninitialized states gracefully:** (a) `atom_enabled = false` on AgentAccount → fall back to non-tier policies; (b) `atom_stats.lamports() == 0` → return `Unrated`; (c) `schema_version != 1` → return `Unrated` + emit warning log. None of these should `Deny` outright; the facilitator-side `default_unrated_treatment` config decides Allow vs Deny for unrated agents.
4. **TrustGate's PDA seed scheme is `["trustgate_auth", facilitator_pubkey]`.** Facilitator pubkey is the external integrator's wallet (Dexter's, atxp_ai's, MCPay's). Demo gotcha: Mohit must NOT use his agent-owner wallet as a `facilitator_pubkey` seed value — `SelfFeedbackNotAllowed (6300)` would break feedback emission.
5. **`give_feedback` Anchor discriminator = `[145, 136, 123, 3, 215, 165, 98, 41]`.** Hardcode in `trustgate/src/instructions/emit_feedback.rs` with a unit test that recomputes `keccak("global:give_feedback")[..8]` and asserts equality. If Quantu ever renames the instruction, the test fails — Mohit gets a build-time alarm.
6. **Pre-warming script (`scripts/prewarm-demo-agents.ts`) is two transactions per agent:** `register_with_options(uri, atom_enabled=true)` then `atom_engine::initialize_stats(asset, collection)`. ~0.011 SOL per agent (0.006 + 0.005). 5 agents = 0.055 SOL. Day 5 budget.
7. **For the headline demo, target Silver-Gold (tier 2-3) on the high-tier demo agent + Unrated (tier 0) on a fresh demo agent.** Platinum is structurally unreachable in 7 days due to `LOYALTY_MIN_SLOT_DELTA = 2000` slot gaps and `TIER_PLATINUM_MIN_LOYALTY = 500`. Gold is the realistic stretch goal by Day 12 with consistent positive feedback from 3+ distinct client wallets.
8. **CU envelope for `gate_payment` end-to-end is ~80K** (per Wave 1 #2). Set `ComputeBudgetInstruction::set_compute_unit_limit(200_000)` per tx — comfortable headroom under 1.4M ceiling. No need to split into `gate_check` + `gate_commit`.
9. **Subscribe TrustGate Express server's WebSocket to `NewFeedback` events filtered on `client_address == TrustGate-facilitator-PDA`.** Confirms each feedback emission landed. Use Helius WebSocket RPC (Mohit's anyway-purchased Helius Pro plan, per grants research) for log subscriptions.
10. **The Validation Registry archive (`_archive/validation/`) is a load-bearing artifact for the Foundation-narrative-completion pitch.** The `README.md:36` line *"Validation module archived for future upgrade"* is independently verifiable on Quantu's GitHub. AgentTrust's pitch deck slide 3 ("the gap") cites this directly.

— end —
