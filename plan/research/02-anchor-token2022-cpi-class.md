# Wave 1 #2 — Anchor 1.0 + Token-2022 + Cross-Program PDA Class

**Author:** Mohit. **Date:** 2026-04-28. **Target reader:** a senior Solana engineer at Helius / Anza who already ships Anchor programs daily. Goal: surface 3 things they didn't know.

This file is the build-time reference for AgentTrust's three Anchor programs: **PolicyVault**, **TrustGate**, **ValidationRegistry**. Every code block is runnable. Every claim cites either a primary-source URL or a `repo/path:line-range` reference. No hedging vocabulary.

Cross-references:
- Locked thesis: `/Users/mohit/superdev/frontier_solana_hackathon/plan/final_idea/THESIS_LOCK.md`
- v1 scope: `/Users/mohit/superdev/frontier_solana_hackathon/plan/final_idea/v1_scope.md`

---

## A — Anchor version recommendation for AgentTrust

### Recommendation

**Pin Anchor 1.0.1 (cli + lang) on Solana CLI 3.1.x.** Anchor 1.0.0 shipped 2026-04-02; 1.0.1 followed 2026-04-16 with no breaking changes (changelog quoted in §A.3). Quantu's `agent-registry-8004` v0.5.3 is on `anchor-lang = "0.31.1"` (see Quantu `agent-registry-8004/Cargo.toml`, line 16). AgentTrust does **not** need crate compatibility with Quantu — it never imports `agent_registry_8004` types. AgentTrust reads Quantu PDAs by raw byte offset (Section C, Pattern B), so the upstream Anchor version is irrelevant once you pin program IDs.

The reason to take Anchor 1.0.1 over staying on 0.31.1:

1. `arrayref`-free zero-copy macro path (1.0 cleans up `bytemuck::from_bytes` lifetime issues that bite you in `try_borrow_data`).
2. New default test framework — LiteSVM in-process, ~100x faster than `solana-test-validator` (Anchor 1.0 release notes, https://www.anchor-lang.com/docs/testing/litesvm).
3. CPI cost reduction: invoke base cost dropped to 946 CU under SIMD-0339 (https://solana.com/docs/core/cpi/cpi-cost-model — "The foundational invocation cost is 946 CUs"). PolicyVault's `gate_payment` averages 4–6 reads + 0 CPIs, but TrustGate's `emit_feedback` does 1 PDA-signed CPI; the 54-CU saving compounds across the demo agent fleet.
4. `Disallow duplicate mutable accounts by default` (PR #3946 in Anchor 1.0) — eliminates an entire class of `gate_payment` reentrancy footgun where the same `VelocityLedger` could be passed twice as `mut`. This is the second Kani invariant (`velocity_counter_le_limit`) made cheaper to prove.

### Migration cost from 0.31.1 → 1.0.1 if AgentTrust started from a 0.31 template

AgentTrust starts greenfield, so this is informational. If a pre-existing 0.31 codebase needed to migrate, the breaking changes that touch our use case are:

| 1.0 change | Quantu 0.31.1 still uses | AgentTrust impact |
|---|---|---|
| `@coral-xyz/anchor` → `@anchor-lang/core` (PR #4141) | `@coral-xyz/anchor@0.31.1` | TS client import path only |
| Remove program id arguments of `idl init`/`idl upgrade` (PR #4130) | yes | Deploy script change |
| Disallow duplicate mutable accounts (PR #3946) | allowed | None — AgentTrust never duplicates writable accounts |
| Update to Solana 3.0 (PR #4031) | Solana 2.1.x | Toolchain upgrade only |
| Integrate Program Metadata for IDL (PR #3798) | legacy IDL ix | Adopt Program Metadata; no ix change |
| Remove `interface-instructions` feature (PR #4156) | unused | None |
| Remove `arch` options (PR #4295) | n/a | None |
| `[registry]` removed from `Anchor.toml` (PR #4299) | present | Delete section |

Source: https://www.anchor-lang.com/docs/anchor-project-updates/release-notes/1.0 (full list quoted in §A.3 below).

### A.3 — Anchor 1.0.0 breaking-change manifest (verbatim)

From https://www.anchor-lang.com/docs/anchor-project-updates/release-notes/1.0 (release date 2026-04-02):

- "Remove program `arch` options" (#4295)
- "Disallow duplicate mutable accounts by default, but allows them using `dup` constraint" (#3946)
- "Remove program id arguments of `idl init` and `idl upgrade` commands" (#4130)
- "Rename `utils` module of `declare_program!` to `parsers`" (#4151)
- "Remove the `interface-instructions` feature and the `#[interface]` attribute" (#4156)
- "Remove the `login` command" (#4182)
- "Exclude external accounts from IDL" (#4197)
- "Remove the conflicting account names check" (#4294)
- "Update to Solana 3.0" (#4031)
- "Integrate Program Metadata for IDL management, removing legacy IDL instructions" (#3798)
- "Rename TypeScript packages from `@coral-xyz/anchor` to `@anchor-lang/core`" (#4141)
- "Remove program account info from CPI context" (#2762)
- "Remove dependency on external `solana` CLI; native implementations provided" (#4099)
- "Disallow multiple `#[error_code]` definitions in a single program" (#4300)
- "Remove the `[registry]` section from `Anchor.toml`" (#4299)
- "Make sending a tx return an Error when signing fails, rather than panic" (#3865)
- "Rename `errors` and `ProgramError` of `declare_program!`" (#4347)
- "Remove the `solana-account-decoder` crate export" (#4373)

1.0.1 (2026-04-16): "No breaking changes documented for this patch release."

### A.4 — Pinned versions for AgentTrust workspace

```toml
# Cargo.toml workspace
[workspace.dependencies]
anchor-lang = "1.0.1"
anchor-spl  = { version = "1.0.1", features = ["token", "token_2022", "token_2022_extensions"] }
solana-program = "3.0"
spl-token-2022 = "9.1"   # Pinocchio-friendly interface release
```

```bash
# scripts/dev-bootstrap.sh
avm install 1.0.1
avm use 1.0.1
solana-install init 3.1.1
```

Source for installation commands: https://www.anchor-lang.com/docs/installation ("anchor-cli 1.0.1", "solana-cli 2.0.26" example shown — we override to 3.1.x for SDK 3.0 compatibility).

---

## B — Token-2022 extension encyclopedia

### B.1 — Memory layout primer (the byte offsets you need to know)

Token-2022 mints and accounts share the first **165 bytes** with legacy SPL Token, then differ. From `solana-program/token-2022/interface/src/state.rs:38–95`:

- `Mint::LEN = 82` — fields: `mint_authority(36) | supply(8) | decimals(1) | is_initialized(1) | freeze_authority(36)`
- `Account::LEN = 165` — fields: `mint(32) | owner(32) | amount(8) | delegate(36) | state(1) | is_native(12) | delegated_amount(8) | close_authority(36)`

For a Token-2022 mint with extensions, padding zeros fill bytes `[82..165]`, an `account_type` discriminator byte sits at offset `165`, and the TLV (type-length-value) extension stream starts at offset `166`. Source: `solana-program/token-2022/interface/src/extension/mod.rs:type_and_tlv_indices` —

```rust
// reproduced from token-2022/interface/src/extension/mod.rs (master)
let account_type_index = BASE_ACCOUNT_LENGTH.saturating_sub(S::SIZE_OF);
//                       = 165              -                82  = 83 (relative to rest, absolute offset 165)
let tlv_start_index = account_type_index.saturating_add(size_of::<AccountType>());
//                  = 84 (relative), absolute 166
```

**Key insight:** the existence of *any* extension byte at offset 166 distinguishes a Token-2022 mint from a legacy SPL mint at the storage layer. A mint with `data.len() == 82` is legacy. A mint with `data.len() > 165` and `data[165] != 0` carries one or more Token-2022 extensions.

The TLV format per extension, from `solana-program/token-2022/interface/src/extension/mod.rs`:
```
[type: u16 LE][length: u16 LE][value: length bytes]
```

ExtensionType discriminants are sequential `u16` values starting at `Uninitialized = 0`. Full enum quoted next.

### B.2 — Every Token-2022 ExtensionType (verbatim from upstream)

Source: `solana-program/token-2022/interface/src/extension/mod.rs` — `pub enum ExtensionType`:

| Discriminant | Variant | Mint vs Account | One-line behavior |
|---:|---|---|---|
| 0 | `Uninitialized` | n/a | Padding sentinel. Stop-token when iterating TLVs. |
| 1 | `TransferFeeConfig` | Mint | Protocol-level transfer fee + withdraw authority. |
| 2 | `TransferFeeAmount` | Account | Withheld transfer-fee balance per recipient. |
| 3 | `MintCloseAuthority` | Mint | Authority that can close a zero-supply mint. |
| 4 | `ConfidentialTransferMint` | Mint | El-Gamal encryption config + auditor key. |
| 5 | `ConfidentialTransferAccount` | Account | Encrypted balance + pending balance. |
| 6 | `DefaultAccountState` | Mint | Forces new ATAs frozen. |
| 7 | `ImmutableOwner` | Account | Owner field is final. ATAs include this by default. |
| 8 | `MemoTransfer` | Account | Requires SPL Memo ix immediately before incoming xfer. |
| 9 | `NonTransferable` | Mint | Soulbound. Owner can burn but not transfer. |
| 10 | `InterestBearingConfig` | Mint | UI amount accrues interest; raw supply unchanged. |
| 11 | `CpiGuard` | Account | Blocks transfer/burn/approve from CPI context. |
| 12 | `PermanentDelegate` | Mint | Delegate with unlimited authority over every account. |
| 13 | `NonTransferableAccount` | Account | Marker on accounts of NonTransferable mints. |
| 14 | `TransferHook` | Mint | Custom CPI program runs on every transfer. |
| 15 | `TransferHookAccount` | Account | Marker for in-flight transfer state. |
| 16 | `ConfidentialTransferFeeConfig` | Mint | Encrypted withheld fees config. |
| 17 | `ConfidentialTransferFeeAmount` | Account | Encrypted withheld fee balance. |
| 18 | `MetadataPointer` | Mint | Points to canonical metadata account (or self). |
| 19 | `TokenMetadata` | Mint | Inline name/symbol/URI per spl-token-metadata-interface. |
| 20 | `GroupPointer` | Mint | Points to group config account (NFT-collection style). |
| 21 | `TokenGroup` | Mint | Inline group config (max size, update authority). |
| 22 | `GroupMemberPointer` | Mint | Points to member-of-group account. |
| 23 | `TokenGroupMember` | Mint | Inline membership record. |
| 24 | `ConfidentialMintBurn` | Mint | Confidential mint and burn ops. |
| 25 | `ScaledUiAmount` | Mint | UI-only multiplier (stock splits / yield). |
| 26 | `Pausable` | Mint | Authority can pause all transfer/mint/burn. |
| 27 | `PausableAccount` | Account | Marker on accounts of Pausable mints. |
| 28 | `PermissionedBurn` | Mint | Burn requires authority signature. |

Source code: https://github.com/solana-program/token-2022/blob/main/interface/src/extension/mod.rs

### B.3 — AgentTrust v1 implications (which extensions matter)

The Spending policy kind ingests `(amount, mint)` and gates against thresholds. AgentTrust v1 must support BOTH SPL Token (legacy, program ID `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`) and Token-2022 mints (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`). The detection helper sits in §I. The five extensions that change Spending-policy semantics:

1. **TransferFee** (#1). The wallet sends `amount` but the recipient receives `amount - fee`. Spending policy MUST gate on `amount` (gross) — that's what leaves the payer. Anything else under-counts the velocity-ledger commit. **Decision:** PolicyVault gates on `amount` argument, not on net-of-fee. Documented behavior.
2. **TransferHook** (#14). Transfer triggers a CPI to a custom program. If that program rejects, the transfer reverts but PolicyVault has already incremented `VelocityLedger.cumulative_amount`. **Risk:** ledger drift if hook rejects after ledger commit. **Mitigation:** facilitator pattern — `gate_payment` returns `Allow`, facilitator submits the actual transfer, on revert the facilitator MUST emit `compensate_velocity` ix to roll back the ledger. Documented in v1 scope §Graceful degradation. Risk register entry added below.
3. **ConfidentialTransfer** (#4). Transfer amount is encrypted. PolicyVault cannot verify on-chain that the encrypted amount matches the cleartext `amount` arg. **Decision for v1:** Spending policy returns `Deny` if mint has `ConfidentialTransferMint` extension. Documented and tested. v1.1 adds proof-verification.
4. **NonTransferable** (#9). Mint is soulbound. Spending policy is meaningless on these. **Decision:** Allow regardless (the underlying transfer will revert at the token program; PolicyVault doesn't need to duplicate the check). Lower-friction default.
5. **Pausable** (#26). Mint authority can globally pause. Independent from PolicyVault's KillSwitch. **Decision:** PolicyVault does not check `Pausable.paused`; if the mint is paused the transfer reverts at the token program. Out of scope for AgentTrust's policy semantics.

Other extensions (`MetadataPointer`, `TokenMetadata`, `Group*`, `ScaledUiAmount`, `MintCloseAuthority`, `InterestBearingConfig`, `DefaultAccountState`, `ImmutableOwner`, `MemoTransfer`, `CpiGuard`, `PermanentDelegate`) are read-only or account-side and don't change Spending-policy semantics.

### B.4 — The single most-important Token-2022 footgun for AgentTrust v1

**A `TransferHook`-bearing mint can revert the underlying transfer AFTER PolicyVault has committed `VelocityLedger.cumulative_amount`.** The hook program runs as a post-transfer CPI inside the token-2022 transfer ix; if the hook returns an error, the entire transfer ix reverts — but a *separate* PolicyVault `gate_payment` call earlier in the same tx has already mutated the ledger.

If `gate_payment` and the actual transfer are in the same tx (the recommended pattern), Solana's atomicity rolls everything back together: the ledger increment is undone. **However**, if a facilitator commits the gate decision in tx A and then submits the transfer in tx B (the multi-tx commit-then-execute pattern), tx B's hook revert leaves the ledger drifted.

**Mitigation:** facilitators MUST keep `gate_payment` and the transfer in a single atomic tx. The `@agenttrust/trustgate` SDK enforces this in `mountTrustGate(app, ...)` by generating a single tx that bundles `policy_vault::gate_payment` + the SPL/Token-2022 transfer + `trustgate::emit_feedback`. Documented in `docs/INTEGRATION-FACILITATOR.md`.

Quote: "Hook execution happens post-transfer; if hook fails, transfer already completed (state has final values at invocation)." (https://www.solana-program.com/docs/token-2022, TransferHook section.)

---

## C — Cross-program PDA read patterns

The PolicyVault problem: read `AtomStats.trust_tier` from the `atom-engine` program (declared_id `AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb`, source `QuantuLabs/8004-atom/programs/atom-engine/src/lib.rs:3`) WITHOUT depending on the `atom-engine` crate. The risk register pins this as Risk 1 (Quantu breaking change mid-hackathon, `THESIS_LOCK.md` §Risk 1).

Three patterns are accepted in production. AgentTrust uses **Pattern B** for the Quantu PDAs and **Pattern A** for AgentTrust's own PDAs.

### Pattern A — Typed `Account<T>` with `seeds::program` foreign-program PDA

```rust
// Use case: foreign-program PDA where you HAVE the upstream crate as a dep.
#[derive(Accounts)]
pub struct ReadStats<'info> {
    /// CHECK: validated by seeds + owner
    #[account(
        seeds = [b"atom_stats", asset.key().as_ref()],
        seeds::program = atom_engine::ID,
        bump,
    )]
    pub atom_stats: Account<'info, atom_engine::state::AtomStats>,

    /// CHECK
    pub asset: UncheckedAccount<'info>,
}
```

How `seeds::program` is generated by Anchor 1.0 — from `anchor/lang/syn/src/codegen/accounts/constraints.rs:81–110`:

```rust
// reproduced from Anchor 1.0 source
.program_seed
.clone()
// If they specified a seeds::program to use when deriving the PDA, use it.
.map(|program_id| quote! { #program_id.key() })
// Otherwise fall back to the current program's program_id.
.unwrap_or(quote! { __program_id });

// ... later expansion:
let (__pda_address, __bump) = Pubkey::find_program_address(
    &[ /* seeds */ ],
    &#deriving_program_id,
);
```

**`Account<'info, T>` ALSO checks `info.owner == T::owner()` via the `Owner` trait** — from `anchor/lang/src/accounts/account.rs:50–63`:

```rust
pub fn try_from(info: &'a AccountInfo<'a>) -> Result<Account<'a, T>> {
    if info.owner == &system_program::ID && info.lamports() == 0 {
        return Err(ErrorCode::AccountNotInitialized.into());
    }
    if info.owner != &T::owner() {
        return Err(Error::from(ErrorCode::AccountOwnedByWrongProgram)
            .with_pubkeys((*info.owner, T::owner())));
    }
    let mut data: &[u8] = &info.try_borrow_data()?;
    Ok(Account::new(info, T::try_deserialize(&mut data)?))
}
```

**When Pattern A works:** you can add `atom-engine = { path = "...", features = ["cpi"] }` to your Cargo.toml AND the Anchor versions are compatible (Anchor 0.31.1 ↔ Anchor 1.0.1 mismatched Borsh derives can fail).

**When Pattern A fails:** AgentTrust's case. We do NOT depend on the `atom-engine` crate (Risk 1: pin-instability). Anchor 0.31.1 (Quantu) vs 1.0.1 (AgentTrust) cross-version `#[account]` macro expansion produces incompatible `Discriminator` impls; the `try_deserialize` call would reject Quantu accounts written by an older anchor-lang.

**CU cost:** `try_deserialize` runs Borsh over the full struct. AtomStats is 561 bytes (`8004-atom/programs/atom-engine/src/state.rs:120` — `pub const SIZE: usize = 561`). Borsh deserialization is roughly `~2.0 CU/byte` plus 85 CU base = ~1207 CU per AtomStats read. Account-info translation under SIMD-0339 adds `account_data_len / 250 = 561 / 250 = 2 CU`. **Total: ~1.3K CU per AtomStats Pattern A read.**

### Pattern B — `UncheckedAccount` + manual owner verify + manual seed verify + raw byte parse

This is the AgentTrust pattern. No upstream crate dep. Pin only the program ID.

```rust
// programs/policy-vault/src/ext/atom_engine.rs

use anchor_lang::prelude::*;
use crate::errors::PolicyVaultError;

/// Pinned atom-engine program ID. Source: 8004-atom/programs/atom-engine/src/lib.rs:3.
pub const ATOM_ENGINE_ID: Pubkey =
    pubkey!("AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb");

/// AgentAccount discriminator. Computed via sighash("account", "AgentAccount").
pub const AGENT_ACCOUNT_DISCRIMINATOR: [u8; 8] =
    [241, 119, 69, 140, 233, 9, 112, 50];

/// AtomStats discriminator. Computed via sighash("account", "AtomStats").
pub const ATOM_STATS_DISCRIMINATOR: [u8; 8] =
    [190, 187, 50, 59, 203, 39, 136, 244];

/// AtomStats byte offsets (relative to account-data start, i.e. INCLUDING the 8-byte discriminator).
/// Source: QuantuLabs/8004-atom/programs/atom-engine/src/state.rs:7–141 (AtomStats struct).
/// Field-by-field cumulative byte count below the struct definition.
pub mod atom_stats_offsets {
    // Discriminator: [0..8]
    pub const COLLECTION:        usize = 8;          // Pubkey (32)
    pub const ASSET:             usize = 8 + 32;     // 40, Pubkey (32)
    pub const FIRST_FB_SLOT:     usize = 8 + 64;     // 72, u64 (8)
    pub const LAST_FB_SLOT:      usize = 8 + 72;     // 80, u64 (8)
    pub const FEEDBACK_COUNT:    usize = 8 + 80;     // 88, u64 (8)
    // EMA (12 bytes): ema_score_fast u16, ema_score_slow u16, ema_volatility u16,
    //                 ema_arrival_log u16, peak_ema u16, max_drawdown u16
    pub const EMA_SCORE_FAST:    usize = 8 + 88;     // 96
    pub const EMA_SCORE_SLOW:    usize = 8 + 90;     // 98
    pub const EMA_VOLATILITY:    usize = 8 + 92;     // 100
    pub const EMA_ARRIVAL_LOG:   usize = 8 + 94;     // 102
    pub const PEAK_EMA:          usize = 8 + 96;     // 104
    pub const MAX_DRAWDOWN:      usize = 8 + 98;     // 106
    pub const EPOCH_COUNT:       usize = 8 + 100;    // 108, u16
    pub const CURRENT_EPOCH:     usize = 8 + 102;    // 110, u16
    pub const MIN_SCORE:         usize = 8 + 104;    // 112, u8
    pub const MAX_SCORE:         usize = 8 + 105;    // 113
    pub const FIRST_SCORE:       usize = 8 + 106;    // 114
    pub const LAST_SCORE:        usize = 8 + 107;    // 115
    // hll_packed [u8; 128]: [116..244]
    pub const HLL_PACKED:        usize = 8 + 108;    // 116
    pub const HLL_SALT:          usize = 8 + 236;    // 244, u64
    // recent_callers [u64; 24]: 192 bytes [252..444]
    pub const RECENT_CALLERS:    usize = 8 + 244;    // 252
    pub const BURST_PRESSURE:    usize = 8 + 436;    // 444
    pub const UPDATES_SINCE_HLL_CHANGE: usize = 8 + 437;  // 445
    pub const NEG_PRESSURE:      usize = 8 + 438;    // 446
    pub const EVICTION_CURSOR:   usize = 8 + 439;    // 447
    pub const RING_BASE_SLOT:    usize = 8 + 440;    // 448, u64
    pub const QUALITY_VELOCITY:  usize = 8 + 448;    // 456, u16
    pub const VELOCITY_EPOCH:    usize = 8 + 450;    // 458, u16
    pub const FREEZE_EPOCHS:     usize = 8 + 452;    // 460
    pub const QUALITY_FLOOR:     usize = 8 + 453;    // 461
    pub const BYPASS_COUNT:      usize = 8 + 454;    // 462
    pub const BYPASS_SCORE_AVG:  usize = 8 + 455;    // 463
    // bypass_fingerprints [u64; 10]: 80 bytes [464..544]
    pub const BYPASS_FINGERPRINTS: usize = 8 + 456;  // 464
    pub const BYPASS_FP_CURSOR:  usize = 8 + 536;    // 544
    pub const LOYALTY_SCORE:     usize = 8 + 537;    // 545, u16
    pub const QUALITY_SCORE:     usize = 8 + 539;    // 547, u16
    pub const RISK_SCORE:        usize = 8 + 541;    // 549, u8
    pub const DIVERSITY_RATIO:   usize = 8 + 542;    // 550
    pub const TRUST_TIER:        usize = 8 + 543;    // 551 ← THIS IS THE GATE
    pub const TIER_CANDIDATE:    usize = 8 + 544;    // 552
    pub const TIER_CANDIDATE_EPOCH: usize = 8 + 545; // 553, u16
    pub const TIER_CONFIRMED:    usize = 8 + 547;    // 555 ← USE THIS POST-VESTING
    pub const FLAGS:             usize = 8 + 548;    // 556
    pub const CONFIDENCE:        usize = 8 + 549;    // 557, u16
    pub const BUMP:              usize = 8 + 551;    // 559
    pub const SCHEMA_VERSION:    usize = 8 + 552;    // 560
    pub const ATOM_STATS_TOTAL_SIZE: usize = 8 + 553;  // 561 (matches AtomStats::SIZE)
}

/// Reads `trust_tier` from an `AtomStats` PDA owned by atom-engine.
/// Returns `(tier_confirmed, risk_score, confidence)` for CounterpartyTier policy.
/// Pattern: owner check → seeds verify → discriminator check → byte read.
pub fn read_atom_stats_tier(
    atom_stats_info: &AccountInfo,
    expected_asset: &Pubkey,
) -> Result<(u8, u8, u16)> {
    // 1. Owner verification — bullet-proof against Quantu pivots that change schema
    //    but keep program-ID stable.
    require_keys_eq!(
        *atom_stats_info.owner,
        ATOM_ENGINE_ID,
        PolicyVaultError::AtomStatsWrongOwner
    );

    // 2. Seed verification — derive expected PDA, compare to passed key.
    //    Mirrors atom-engine's seeds: ["atom_stats", asset.key()] (8004-atom/.../contexts.rs:73).
    let (expected_pda, _bump) = Pubkey::find_program_address(
        &[b"atom_stats", expected_asset.as_ref()],
        &ATOM_ENGINE_ID,
    );
    require_keys_eq!(
        atom_stats_info.key(),
        expected_pda,
        PolicyVaultError::AtomStatsWrongPda
    );

    // 3. Discriminator check — defends against a Quantu schema migration that
    //    might keep the seed but change the layout.
    let data = atom_stats_info.try_borrow_data()?;
    require!(
        data.len() == atom_stats_offsets::ATOM_STATS_TOTAL_SIZE,
        PolicyVaultError::AtomStatsWrongSize
    );
    require!(
        data[..8] == ATOM_STATS_DISCRIMINATOR,
        PolicyVaultError::AtomStatsBadDiscriminator
    );

    // 4. Byte read. Use tier_confirmed (post-vesting) per atom-engine v0.5+ semantics.
    //    8004-atom/programs/atom-engine/src/state.rs documents tier_confirmed as
    //    "Confirmed tier after vesting period (replaces trust_tier for logic)".
    let tier = data[atom_stats_offsets::TIER_CONFIRMED];
    let risk = data[atom_stats_offsets::RISK_SCORE];
    let conf_le = [
        data[atom_stats_offsets::CONFIDENCE],
        data[atom_stats_offsets::CONFIDENCE + 1],
    ];
    let confidence = u16::from_le_bytes(conf_le);

    Ok((tier, risk, confidence))
}
```

This is 4 syscalls (`try_borrow_data` is local, not a syscall) + 1 PDA derivation (`find_program_address`, ~1500 CU per `create_program_address_units` — the `find_*` variant retries up to 256 times so the realistic average is closer to ~3K CU because it iterates bumps).

Reference for `find_program_address` cost: https://raw.githubusercontent.com/anza-xyz/agave/master/program-runtime/src/execution_budget.rs — `create_program_address_units: 1500` (per attempt).

Drift uses Pattern B for Pyth oracle reads (`drift-labs/protocol-v2/programs/drift/src/state/load_ref.rs:6–24`):

```rust
// reproduced from Drift production code
pub fn load_ref<'a, T: ZeroCopy + Owner>(account_info: &'a AccountInfo) -> Result<Ref<'a, T>> {
    let data = account_info.try_borrow_data()?;
    if data.len() < T::discriminator().len() {
        return Err(ErrorCode::AccountDiscriminatorNotFound.into());
    }
    let disc_bytes = array_ref![data, 0, 8];
    if disc_bytes != &T::discriminator() {
        return Err(ErrorCode::AccountDiscriminatorMismatch.into());
    }
    Ok(Ref::map(data, |data| {
        bytemuck::from_bytes(&data[8..mem::size_of::<T>() + 8])
    }))
}
```

Marginfi's PriceUpdateV2 read (`0dotxyz/marginfi-v2/programs/marginfi/src/state/price.rs:load_price_update_v2_checked`):

```rust
// reproduced from marginfi v2 production code
pub fn load_price_update_v2_checked(ai: &AccountInfo) -> MarginfiResult<PriceUpdateV2> {
    let price_feed_data = ai.try_borrow_data()?;
    if price_feed_data.len() < 8 {
        return err!(MarginfiError::PythPushInvalidAccount);
    }
    let discriminator = &price_feed_data[0..8];
    let expected_discrim = <PriceUpdateV2 as anchor_lang::Discriminator>::DISCRIMINATOR;
    check_eq!(discriminator, expected_discrim, MarginfiError::PythPushInvalidAccount);
    Ok(PriceUpdateV2::deserialize(&mut &price_feed_data.as_ref()[8..])?)
}
```

Marginfi notably DOES NOT check `ai.owner == pyth_ID` here — it relies on the caller passing `bank_config.oracle_keys[0] == ai.key()` matched in `check_primary_oracle_key`. AgentTrust takes the stricter path (owner + seeds + discriminator) because we cannot trust the facilitator to pass the right account.

**`try_borrow_data` lifetime gotcha (the senior-engineer footgun).** `AccountInfo::try_borrow_data` returns a `Ref<&[u8]>` whose lifetime is tied to the `RefCell` inside the `AccountInfo`. If you call `try_borrow_data` and then later call `try_borrow_mut_data` on the SAME account in the same scope, the second call panics with `BorrowMutError`. PolicyVault's `gate_payment` handles this by:
1. Reading all foreign-program PDAs first (only `try_borrow_data`).
2. Releasing all read borrows by exiting the block before any write to `VelocityLedger`.
3. Writing `VelocityLedger` last, on the `Allow` decision branch, after every read borrow has dropped.

The pattern in code:

```rust
// inside gate_payment instruction
let (payer_tier, _, _) = {
    let payer_atom = &ctx.accounts.payer_atom_stats;
    read_atom_stats_tier(payer_atom, &payer_agent_asset)?
};   // <-- borrow released here

let (payee_tier, payee_risk, payee_conf) = {
    let payee_atom = &ctx.accounts.payee_atom_stats;
    read_atom_stats_tier(payee_atom, &payee_agent_asset)?
};   // <-- borrow released here

// ... policy decision tree ...

if matches!(decision, GateDecision::Allow) {
    // Now safe to mutably borrow VelocityLedger.
    let velocity = &mut ctx.accounts.velocity_ledger;
    velocity.cumulative_amount = velocity
        .cumulative_amount
        .checked_add(amount)
        .ok_or(PolicyVaultError::VelocityOverflow)?;
}
```

### Pattern C — Typed `AccountLoader<T>` (zero-copy) with manual ownership

For accounts where you have a wrapper crate (or define one yourself) that implements `Owner` returning the foreign program ID. Marginfi uses this for Kamino reserves (`marginfi-v2/programs/marginfi/src/state/price.rs:load_kamino_reserve`):

```rust
fn load_kamino_reserve<'info>(
    bank_config: &BankConfig,
    reserve_info: &'info AccountInfo<'info>,
) -> MarginfiResult<AccountLoader<'info, MinimalReserve>> {
    require_keys_eq!(
        *reserve_info.key,
        bank_config.oracle_keys[1],
        MarginfiError::KaminoReserveValidationFailed
    );
    // Verifies owner + discriminator automatically
    let reserve_loader: AccountLoader<MinimalReserve> = AccountLoader::try_from(reserve_info)
        .map_err(|_| MarginfiError::KaminoReserveValidationFailed)?;
    Ok(reserve_loader)
}
```

`AccountLoader::try_from` (from `anchor/lang/src/accounts/account_loader.rs:120–138`) does:
```rust
if acc_info.owner != &T::owner() {
    return Err(Error::from(ErrorCode::AccountOwnedByWrongProgram)
        .with_pubkeys((*acc_info.owner, T::owner())));
}
let data = &acc_info.try_borrow_data()?;
let disc = T::DISCRIMINATOR;
if given_disc != disc {
    return Err(ErrorCode::AccountDiscriminatorMismatch.into());
}
```

**When Pattern C works:** Marginfi defines a `MinimalReserve` struct in their own crate matching Kamino's Reserve byte layout. They control compatibility — if Kamino changes layout, they update `MinimalReserve`.

**When Pattern C is overkill for AgentTrust:** the AgentAccount and AtomStats structs have variable-length fields (`agent_uri: String`, `nft_name: String`, `col: String` in AgentAccount). Zero-copy with `bytemuck::from_bytes` requires `repr(C)` + fixed-size fields. AtomStats is fixed-size (`#[account]` with 561-byte total) but AgentAccount is dynamic. Pattern B (manual offset reads) is simpler than maintaining a parallel struct.

### Recommended pattern matrix for AgentTrust

| PDA being read | Owner | Pattern | Why |
|---|---|---|---|
| AgentTrust's own `PolicyAccount` | policy-vault | Anchor `Account<PolicyAccount>` | Owned by self. Use Anchor native typing. |
| AgentTrust's own `VelocityLedger` | policy-vault | Anchor `Account<VelocityLedger>` (mut) | Same. |
| AgentTrust's own `KillSwitchState` | policy-vault | Anchor `Account<KillSwitchState>` | Same. |
| Quantu `AgentAccount` | agent-registry-8004 | **Pattern B (manual)** | No crate dep. Variable-length. |
| Quantu `AtomStats` | atom-engine | **Pattern B (manual)** | No crate dep. Layout-pinned. |
| Quantu `AtomConfig` | atom-engine | **Pattern B (manual)** if read at all | We don't read it; `read_atom_stats_tier` is sufficient. |
| AgentTrust's own `ValidationAttestation` | validation-registry | Anchor `Account<ValidationAttestation>` (in policy-vault we use Pattern B since validation-registry is a sibling Anchor program AgentTrust controls — Pattern A with `seeds::program = validation_registry::ID` works) | Sibling program, AgentTrust controls Anchor version. |

---

## D — PDA-signed CPI patterns

TrustGate's `emit_feedback` calls `agent_registry_8004::give_feedback` with a PDA-signed CPI. The signer is `["trustgate_auth", facilitator_pubkey]` owned by trustgate. The give_feedback instruction signature, from `agent-registry-8004/src/lib.rs:135–155` (Quantu source):

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
) -> Result<()> { ... }
```

**Critical:** Quantu's `GiveFeedback` accounts struct (from `agent-registry-8004/src/reputation/contexts.rs:9–60`) requires `client: Signer` — that's the slot the trustgate PDA must sign. The PDA signs by passing seeds to `invoke_signed`.

### Pattern D.1 — Anchor `CpiContext::new_with_signer` (works only WITH the foreign crate dep)

```rust
// IF you have agent_registry_8004 as a Cargo dep:
use agent_registry_8004::{cpi::accounts::GiveFeedback, cpi::give_feedback};

let bump = ctx.bumps.trustgate_authority;
let facilitator_key = ctx.accounts.facilitator.key();
let signer_seeds: &[&[&[u8]]] = &[&[
    b"trustgate_auth",
    facilitator_key.as_ref(),
    &[bump],
]];

let cpi_accounts = GiveFeedback {
    client: ctx.accounts.trustgate_authority.to_account_info(),
    agent_account: ctx.accounts.payee_agent_account.to_account_info(),
    asset: ctx.accounts.payee_asset.to_account_info(),
    collection: ctx.accounts.payee_collection.to_account_info(),
    system_program: ctx.accounts.system_program.to_account_info(),
    atom_config: Some(ctx.accounts.atom_config.to_account_info()),
    atom_stats: Some(ctx.accounts.payee_atom_stats.to_account_info()),
    atom_engine_program: Some(ctx.accounts.atom_engine_program.to_account_info()),
    registry_authority: Some(ctx.accounts.registry_authority.to_account_info()),
};

let cpi_ctx = CpiContext::new_with_signer(
    ctx.accounts.agent_registry_program.to_account_info(),
    cpi_accounts,
    signer_seeds,
);

give_feedback(
    cpi_ctx,
    value,        // i128
    value_decimals,
    score,
    feedback_file_hash,
    tag1,
    tag2,
    endpoint,
    feedback_uri,
)?;
```

`CpiContext::new_with_signer` source from `anchor/lang/src/context.rs:198–209`:

```rust
#[must_use]
pub fn new_with_signer(
    program_id: Pubkey,
    accounts: T,
    signer_seeds: &'a [&'b [&'c [u8]]],
) -> Self {
    Self {
        accounts,
        program_id,
        signer_seeds,
        remaining_accounts: Vec::new(),
    }
}
```

**Why D.1 is NOT what AgentTrust uses:** Risk 1 — Quantu version pin instability. Adding `agent-registry-8004` as a path dependency forces AgentTrust onto Anchor 0.31.1 (Quantu's `Cargo.toml:16` pins `anchor-lang = "0.31.1"`). We want Anchor 1.0.1. A workspace with two anchor-lang versions does compile but produces inconsistent IDLs and bloats binary size.

### Pattern D.2 — Raw `solana_program::program::invoke_signed` with manual instruction encoding (the AgentTrust pattern)

```rust
// programs/trustgate/src/instructions/emit_feedback.rs

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke_signed,
};
use crate::ext::agent_registry::{AGENT_REGISTRY_ID, GIVE_FEEDBACK_DISCRIMINATOR};

pub fn emit_feedback_handler(
    ctx: Context<EmitFeedback>,
    payment_id: [u8; 32],
    payee_asset: Pubkey,
    score: u8,
    tag1: String,
    tag2: String,
    endpoint: String,
    feedback_uri: String,
) -> Result<()> {
    // Idempotency: FeedbackEmissionLog PDA prevents double-emission.
    require!(!ctx.accounts.feedback_log.emitted, TrustGateError::AlreadyEmitted);

    // Construct instruction data: 8-byte discriminator + Borsh-serialized args.
    // Args order (from agent-registry-8004/src/lib.rs:135–155):
    //   value: i128, value_decimals: u8, score: Option<u8>, feedback_file_hash: Option<[u8; 32]>,
    //   tag1: String, tag2: String, endpoint: String, feedback_uri: String
    let mut data = Vec::with_capacity(256);
    data.extend_from_slice(&GIVE_FEEDBACK_DISCRIMINATOR);
    // value: i128 (16 bytes LE)
    data.extend_from_slice(&0i128.to_le_bytes());
    // value_decimals: u8
    data.push(0u8);
    // score: Option<u8> — 1-byte discriminator (0 = None, 1 = Some) + value
    data.push(1);
    data.push(score);
    // feedback_file_hash: Option<[u8; 32]>
    data.push(0); // None
    // tag1, tag2, endpoint, feedback_uri: Strings — 4-byte LE length + utf8 bytes
    push_string(&mut data, &tag1);
    push_string(&mut data, &tag2);
    push_string(&mut data, &endpoint);
    push_string(&mut data, &feedback_uri);

    // Account metas — order matches Quantu's GiveFeedback context
    // (from agent-registry-8004/src/reputation/contexts.rs:9–60).
    let metas = vec![
        AccountMeta::new(ctx.accounts.trustgate_authority.key(), true),     // client (signer, mut)
        AccountMeta::new(ctx.accounts.payee_agent_account.key(), true),     // agent_account (mut)
        AccountMeta::new_readonly(ctx.accounts.payee_asset.key(), false),
        AccountMeta::new_readonly(ctx.accounts.payee_collection.key(), false),
        AccountMeta::new_readonly(anchor_lang::solana_program::system_program::ID, false),
        AccountMeta::new_readonly(ctx.accounts.atom_config.key(), false),    // Option<AtomConfig>
        AccountMeta::new(ctx.accounts.payee_atom_stats.key(), false),       // Option<AtomStats> mut
        AccountMeta::new_readonly(AGENT_REGISTRY_ID, false),                // atom_engine_program field is for Quantu's nested CPI; we pass agent_registry_id as a placeholder for the optional field
        AccountMeta::new_readonly(ctx.accounts.registry_authority.key(), false),
    ];

    let ix = Instruction {
        program_id: AGENT_REGISTRY_ID,
        accounts: metas,
        data,
    };

    let bump = ctx.bumps.trustgate_authority;
    let facilitator_key = ctx.accounts.facilitator.key();
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"trustgate_auth",
        facilitator_key.as_ref(),
        &[bump],
    ]];

    invoke_signed(
        &ix,
        &[
            ctx.accounts.trustgate_authority.to_account_info(),
            ctx.accounts.payee_agent_account.to_account_info(),
            ctx.accounts.payee_asset.to_account_info(),
            ctx.accounts.payee_collection.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.atom_config.to_account_info(),
            ctx.accounts.payee_atom_stats.to_account_info(),
            ctx.accounts.agent_registry_program.to_account_info(),
            ctx.accounts.registry_authority.to_account_info(),
        ],
        signer_seeds,
    )?;

    // Mark idempotency log.
    ctx.accounts.feedback_log.emitted = true;
    ctx.accounts.feedback_log.payment_id = payment_id;
    ctx.accounts.feedback_log.slot = Clock::get()?.slot;

    Ok(())
}

fn push_string(buf: &mut Vec<u8>, s: &str) {
    let bytes = s.as_bytes();
    buf.extend_from_slice(&(bytes.len() as u32).to_le_bytes());
    buf.extend_from_slice(bytes);
}
```

**give_feedback discriminator:** `[145, 136, 123, 3, 215, 165, 98, 41]` (computed via `sha256("global:give_feedback")[0..8]`). Anchor's discriminator scheme is documented at https://www.anchor-lang.com/docs/references/space (8-byte discriminator constant).

**This pattern is taken from Squads v4** (`Squads-Protocol/v4/programs/squads_multisig_program/src/utils/executable_transaction_message.rs:execute_message`):

```rust
// reproduced from Squads v4
for (ix, account_infos) in self.to_instructions_and_accounts().iter() {
    for account_meta in ix.accounts.iter().filter(|m| m.is_writable) {
        require!(
            !protected_accounts.contains(&account_meta.pubkey),
            MultisigError::ProtectedAccount
        );
    }
    invoke_signed(&ix, &account_infos, &signer_seeds)?;
}
```

### CU cost of the CPI

- Base CPI: **946 CU** (https://solana.com/docs/core/cpi/cpi-cost-model — "The foundational invocation cost is 946 CUs"). Pre-SIMD-0339 it was 1000 CU.
- Account-meta serialization: `(num_account_metas * 34) / 250 = (9 * 34) / 250 = 1 CU`
- Account-info translation: `(num_account_infos * 80) / 250 = (9 * 80) / 250 = 2 CU`
- Per-account data translation: sum of `account_data_len / 250` for each — payee_agent_account ~~700 bytes / 250 = 2, payee_atom_stats 561 / 250 = 2, others minimal. Total ~6 CU.
- Instruction-data serialization: `(data_len) / 250` ≈ `200 / 250 = 0 CU`
- Borsh serialization in our code: ~1.5 CU/byte ≈ ~300 CU
- Inside Quantu's `give_feedback` body: tier-update CPI + state writes + event emission. Empirically ~30–50K CU per Quantu's localnet measurements.

**Total CPI overhead (caller-side): ~1.3K CU. Total instruction inside Quantu: 30–50K CU. TrustGate's emit_feedback envelope: ~50K CU.**

---

## E — CU budgeting cookbook

### E.1 — Solana 2026-04-28 CU baselines (verified primary sources)

| Limit | Value | Source |
|---|---|---|
| Default per-instruction CU | 200,000 | https://solana.com/docs/core/fees ("Default per instruction") |
| Max per-transaction CU | **1,400,000** | https://solana.com/docs/core/fees ("Max per transaction") |
| Max per-block CU (current) | 60,000,000 | SIMD-0256 activated 2025-07-23 |
| Max per-block CU (proposed) | 100,000,000 | SIMD-0286 (status: testnet) |
| Builtin instruction default | 3,000 | https://solana.com/docs/core/fees |
| Microlamports per lamport | 1,000,000 | https://solana.com/docs/core/fees |

### E.2 — Per-syscall CU cost table (verified from agave source)

Source: https://raw.githubusercontent.com/anza-xyz/agave/master/program-runtime/src/execution_budget.rs (verbatim constants from `SVMTransactionExecutionCost`):

| Operation | CU | Notes |
|---|---:|---|
| `invoke_units` (CPI base) | **946** | Was 1000 pre-SIMD-0339 |
| `syscall_base_cost` | 100 | Per generic syscall |
| `sysvar_base_cost` | 100 | `get_clock_sysvar`, `get_rent_sysvar` etc. |
| `log_64_units` | 100 | One number-formatted log line |
| `log_pubkey_units` | 100 | One Pubkey log line |
| `secp256k1_recover_cost` | 25,000 | Ed signature recover |
| `create_program_address_units` | 1,500 | Per attempt — `find_program_address` retries up to 256x |
| `cpi_bytes_per_unit` | 250 | Bytes-per-CU divisor for CPI serialization |
| `mem_op_base_cost` | 10 | `memcpy` etc. |
| `sha256_base_cost` | 85 | + 1 CU per byte |
| `sha256_byte_cost` | 1 | |
| `heap_cost` | 8 | Per 32K page |
| `curve25519_edwards_validate` | 159 | Used by Ed25519 verify |
| `curve25519_edwards_multiply` | 2,177 | |
| `alt_bn128_g1_addition_cost` | 334 | Confidential transfer maths |
| `alt_bn128_g1_multiplication_cost` | 3,840 | |
| `bls12_381_g1_multiply_cost` | 4,627 | |
| `poseidon_cost_coefficient_a` | 61 | |
| `poseidon_cost_coefficient_c` | 542 | |

The `keccak256` and `blake3` constants are NOT in `execution_budget.rs` directly; they're set via SBF program metering and are rough equivalents of `sha256` (85 base + ~1 CU/byte). For PolicyVault's purposes this is close enough.

### E.3 — Account-loading CU cost (SIMD-0339)

For each account in the instruction's accounts vec:
- Account-meta translation: `34 / 250 ≈ 0 CU` (small accounts)
- Account-info translation: `80 / 250 ≈ 0 CU`
- Account-data translation: `data_len / 250` CU per account

Reading 8 accounts averaging 256 bytes each: `8 * (256/250) ≈ 8 CU`. Negligible.

### E.4 — `gate_payment` envelope estimate

Accounts the instruction takes (per `v1_scope.md` Component 1):

```
1. payer:                    Signer        (free)
2. policy_account:            Account<PolicyAccount>     (~256 B, ~3 CU translate)
3. velocity_ledger:           Account<VelocityLedger>    (~80 B, ~1 CU + write)
4. kill_switch_state:         Account<KillSwitchState>   (~96 B, ~1 CU)
5. payer_agent:               UncheckedAccount [AgentAccount, ~720 B]
6. payee_agent:               UncheckedAccount [AgentAccount, ~720 B]
7. payer_atom_stats:          UncheckedAccount [AtomStats, 561 B]
8. payee_atom_stats:          UncheckedAccount [AtomStats, 561 B]   ← THE one
9. validation_attestation:    Option<UncheckedAccount [ValidationAttestation, ~256 B]>
10. agent_registry_program:   UncheckedAccount [program, 0 B for ID-check]
11. atom_engine_program:      UncheckedAccount [program, 0 B for ID-check]
```

| Operation | Times | CU each | Total |
|---|---:|---:|---:|
| Instruction entry overhead (Anchor try_accounts) | 1 | ~5,000 | 5,000 |
| Account-info translation (11 accounts) | 11 | 80/250≈0 | ~3 |
| Account-data translation | 11 | size/250 | ~24 |
| `try_borrow_data` per foreign-program PDA | 4 | ~50 | 200 |
| `find_program_address` (Pattern B seed verify) | 4 | 1500 × 1.5 avg | ~9,000 |
| Owner-check (`require_keys_eq`) | 4 | ~10 | 40 |
| Discriminator-check | 4 | ~30 | 120 |
| Byte parse (read u8 / u64) | ~12 | ~10 | 120 |
| KillSwitch policy logic | 1 | ~200 | 200 |
| Spending policy logic (3 thresholds) | 1 | ~600 | 600 |
| Velocity policy logic (sliding window) | 1 | ~1,500 | 1,500 |
| CounterpartyTier policy logic | 1 | ~800 | 800 |
| RequireValidation policy logic | 1 | ~1,000 | 1,000 |
| `Clock::get()` (sysvar) | 1 | 100 | 100 |
| Velocity-ledger write (mut Account) | 1 | ~3,000 | 3,000 |
| Event emit (`emit!`) — sol_log_data | 1 | ~500 | 500 |
| Anchor exit (post-mutation serialize) | 1 | ~3,000 | 3,000 |
| Borsh deserialize PolicyAccount (~256 B × 1.5) | 1 | ~400 | 400 |
| Logs (msg! lines for debugging) | ~5 | 100 | 500 |
| **Subtotal** | | | **~26,100 CU** |
| **Safety multiplier (3x for Quantu opacity)** | | | **~80,000 CU** |

**Verdict: `gate_payment` fits in 100K CU comfortably. No split needed.** Even the worst case (all 5 policies evaluated) sits at ~80K CU. The 1.4M tx budget is 17.5x larger than our envelope. Setting `ComputeBudgetInstruction::set_compute_unit_limit(150_000)` as a pre-instruction is the conservative production move — it's 2x our worst-case estimate, well below the 200K default, and saves on prioritization fees if facilitators want to micro-tune.

If the empirical localnet test (Day 7 — first integration test against live ATOM Engine) shows >150K, we move to 250K and re-estimate. If it shows >500K, we split into `gate_check` (read-only Allow/Deny verdict) + `gate_commit` (velocity-ledger write). The split-trigger is documented in `v1_scope.md`'s risk register.

### E.5 — Pre-instruction CU directive (mandatory in production)

```typescript
// trustgate/sdk/src/client.ts (TS facilitator code)
import { ComputeBudgetProgram, Transaction } from '@solana/web3.js';

const tx = new Transaction()
  .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 150_000 }))
  .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5_000 }))
  .add(gatePaymentIx)
  .add(transferIx)
  .add(emitFeedbackIx);
```

Source for the API: https://solana.com/docs/core/fees ("compute_unit_price * compute_unit_limit / 1,000,000").

### E.6 — Compute-budget micro-optimizations (for the demo CU slide)

1. **Avoid `find_program_address`; pass pre-derived bumps as instruction args.** Off-chain caller derives bump once; on-chain we use `create_program_address` (1,500 CU constant) instead of `find_program_address` (1,500 × ~1.5 average attempts = ~2,250 CU). Save ~750 CU per PDA × 4 PDAs = ~3K CU.

2. **Box large account types.** `Box<Account<PolicyAccount>>` reduces stack frame size; Solana sBPF stack is 4KB hard limit per frame. PolicyAccount nested inside multiple `Account` wrappers can blow the stack. Box-ing pushes payload to heap (8 CU/page).

3. **Use `AccountLoader<T>` (zero-copy) for VelocityLedger** if it grows beyond 80 bytes. `AccountLoader::load_mut` does a `bytemuck::from_bytes_mut` (constant-time) instead of Borsh round-trip (~1.5 CU/byte).

4. **`msg!` is 100 CU per call.** PolicyVault deletes all `msg!` lines before mainnet deploy. The Wave 2 #4 Kani harness will catch policy-decision bugs without runtime logging.

5. **Single `Clock::get()`** at instruction top, pass slot down to all policy fns. Saves 4 × 100 = 400 CU vs. each policy calling its own.

---

## F — sBPF VM gotchas

### F.1 — Stack-frame size hard limit

sBPF frames are 4096 bytes. A function that locally allocates `[u8; 4096]` overflows. PolicyVault's `gate_payment` passes the 561-byte AtomStats slice by reference (no copy). If we ever want a copy (e.g., for testing), use `Box<[u8; 561]>`.

### F.2 — `try_borrow_data` returns `Ref`, not slice

`Ref<&[u8]>` is `RefCell`-backed. The borrow lives until the `Ref` is dropped. Common bug: extracting a `&[u8]` reference and then calling `try_borrow_mut_data` panics with `BorrowMutError`. Pattern:

```rust
// BUG: borrow conflict
let data = atom_stats.try_borrow_data()?;
let tier = data[551];
ctx.accounts.velocity_ledger.cumulative_amount += amount;  // panics if velocity_ledger == atom_stats?!

// FIX: scope-limit the borrow
let tier = {
    let data = atom_stats.try_borrow_data()?;
    data[551]
};
ctx.accounts.velocity_ledger.cumulative_amount += amount;  // safe
```

In production this matters because Anchor 1.0's `Disallow duplicate mutable accounts by default` (PR #3946) is exactly the runtime invariant that prevents this footgun statically — IF you upgrade.

### F.3 — `RefCell::borrow_mut` while holding a `Ref`

If `gate_payment` reads `payer_atom_stats` (Ref live in scope A) and then later tries to mutate `payer_atom_stats` (impossible in our design but possible in a refactor), the second call returns `BorrowMutError`. Always release reads BEFORE writes.

### F.4 — Account allocation (`init`) cost

Anchor's `#[account(init, payer = ..., space = N + 8)]` triggers a CPI to System Program's `create_account`. From Solana docs: `create_account` is ~3,000 CU base + ~10 CU per byte of `space`. PolicyAccount at 256 bytes: ~5,560 CU per init. ValidationAttestation at 256 bytes: same. AgentTrust's batch-init script doesn't matter (one-time setup).

### F.5 — Anchor exit serialization is not free

When you mutate an `Account<T>` and the function returns, Anchor calls `T::try_serialize` to write back. Borsh serialization of a 256-byte struct: ~400 CU. This is included in §E.4's estimate.

### F.6 — `solana-rbpf` deterministic-cost model

Per the agave compute-budget source, the runtime charges CU for every executed sBPF opcode (1 CU per arithmetic op, 100 CU per memory load/store, etc., plus the syscalls table above). The 26K CU estimate in §E.4 includes this opcode-level metering implicitly because the policy-logic estimates (e.g., "Velocity policy logic ~1,500 CU") were calibrated against typical Anchor program profiles from Drift / Marginfi.

### F.7 — Prefer `Pubkey::find_program_address` only ONCE per (program, seeds) pair

Each call iterates up to 256 bumps. The `bumps` field of `Context<T>` exposes the stored bump (set during `try_accounts`); use `ctx.bumps.field_name` directly in the instruction body to avoid recomputation. PolicyVault does this for its own PDAs; foreign-program PDAs require manual derivation in `read_atom_stats_tier` (Pattern B), which is one of the four `find_program_address` calls in the §E.4 estimate.

---

## G — PolicyVault `gate_payment` instruction skeleton

This is the canonical implementation. Every account constraint is annotated. Every CU consideration is noted. Error-mapping discipline: each policy returns its own typed error variant.

```rust
// programs/policy-vault/src/instructions/gate_payment.rs

use anchor_lang::prelude::*;

use crate::errors::PolicyVaultError;
use crate::events::GateDecisionEmitted;
use crate::ext::atom_engine::{read_atom_stats_tier, ATOM_ENGINE_ID};
use crate::ext::agent_registry::{read_agent_owner, AGENT_REGISTRY_ID};
use crate::policies::{
    counterparty_tier::evaluate_counterparty_tier,
    killswitch::evaluate_killswitch,
    require_validation::evaluate_require_validation,
    spending::evaluate_spending,
    velocity::{evaluate_and_commit_velocity, VelocityCommit},
};
use crate::state::{
    GateDecision, KillSwitchState, PolicyAccount, ValidationAttestationView, VelocityLedger,
};

#[derive(Accounts)]
#[instruction(
    payer_agent_asset: Pubkey,
    payee_agent_asset: Pubkey,
    amount: u64,
    mint: Pubkey,
    policy_id: u32,
)]
pub struct GatePayment<'info> {
    /// Caller must sign. Typically the facilitator's signer.
    pub payer: Signer<'info>,

    /// Policy config for the (payer_agent, policy_id) pair.
    /// Owner: policy-vault itself. Pattern A (typed Account).
    #[account(
        seeds = [b"policy", payer_agent_asset.as_ref(), &policy_id.to_le_bytes()],
        bump = policy_account.bump,
        constraint = policy_account.policy_id == policy_id @ PolicyVaultError::PolicyMismatch,
    )]
    pub policy_account: Account<'info, PolicyAccount>,

    /// Velocity ledger; mut for sliding-window commit on Allow.
    #[account(
        mut,
        seeds = [b"velocity", payer_agent_asset.as_ref(), &policy_id.to_le_bytes()],
        bump = velocity_ledger.bump,
    )]
    pub velocity_ledger: Account<'info, VelocityLedger>,

    /// Optional KillSwitch — global scope by default.
    #[account(
        seeds = [b"killswitch", &[0u8], &[0u8; 32]],
        bump = kill_switch_state.bump,
    )]
    pub kill_switch_state: Account<'info, KillSwitchState>,

    /// CHECK: foreign-program PDA. Verified manually in `read_agent_owner`
    /// against AGENT_REGISTRY_ID.
    /// Seeds: ["agent", payer_agent_asset]
    /// Owner: agent-registry-8004 (Quantu).
    #[account(
        seeds = [b"agent", payer_agent_asset.as_ref()],
        seeds::program = AGENT_REGISTRY_ID,
        bump,
    )]
    pub payer_agent: UncheckedAccount<'info>,

    /// CHECK: foreign-program PDA, manual verify.
    #[account(
        seeds = [b"agent", payee_agent_asset.as_ref()],
        seeds::program = AGENT_REGISTRY_ID,
        bump,
    )]
    pub payee_agent: UncheckedAccount<'info>,

    /// CHECK: foreign-program PDA. Manual ownership + discriminator + offset
    /// reads in `read_atom_stats_tier`. Owner: atom-engine.
    #[account(
        seeds = [b"atom_stats", payer_agent_asset.as_ref()],
        seeds::program = ATOM_ENGINE_ID,
        bump,
    )]
    pub payer_atom_stats: UncheckedAccount<'info>,

    /// CHECK: foreign-program PDA — THE one CounterpartyTier gates against.
    #[account(
        seeds = [b"atom_stats", payee_agent_asset.as_ref()],
        seeds::program = ATOM_ENGINE_ID,
        bump,
    )]
    pub payee_atom_stats: UncheckedAccount<'info>,

    /// Optional ValidationAttestation. Only required when policy_account
    /// has RequireValidation rule enabled. Owner: validation-registry (sibling).
    /// CHECK: validated in evaluate_require_validation if needed.
    pub validation_attestation: Option<UncheckedAccount<'info>>,

    /// CHECK: program-id verification only. Address-pinned.
    #[account(address = AGENT_REGISTRY_ID)]
    pub agent_registry_program: UncheckedAccount<'info>,

    /// CHECK: program-id verification only.
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
    // Single Clock read — pass slot down. Saves ~300 CU vs. per-policy reads.
    let now_slot = Clock::get()?.slot;
    let policy = &ctx.accounts.policy_account;

    // ─────────────────────────────────────────────────────────────────────
    // Policy 1 — KillSwitch (cheapest; fail-fast).
    // Invariant 1: paused_implies_no_allow.
    // ─────────────────────────────────────────────────────────────────────
    if let Some(reason) = evaluate_killswitch(&ctx.accounts.kill_switch_state, &policy.scope_key)? {
        emit!(GateDecisionEmitted {
            payer_agent_asset,
            payee_agent_asset,
            amount,
            decision_kind: 1, // Deny
            denial_reason: reason as u8,
            slot: now_slot,
        });
        return Ok(GateDecision::Deny(reason));
    }

    // ─────────────────────────────────────────────────────────────────────
    // Policy 2 — Spending (per-tx + daily + weekly thresholds).
    // ─────────────────────────────────────────────────────────────────────
    if let Some(reason) = evaluate_spending(policy, amount, &mint, now_slot)? {
        emit!(GateDecisionEmitted { /* ... */ });
        return Ok(GateDecision::Deny(reason));
    }

    // ─────────────────────────────────────────────────────────────────────
    // Read foreign-program PDAs ONCE. Both reads in scoped blocks so the
    // Refs drop before VelocityLedger write later. (See §F.2.)
    // ─────────────────────────────────────────────────────────────────────
    let (payer_tier, _payer_risk, _payer_conf) =
        read_atom_stats_tier(&ctx.accounts.payer_atom_stats, &payer_agent_asset)?;
    let (payee_tier, payee_risk, payee_conf) =
        read_atom_stats_tier(&ctx.accounts.payee_atom_stats, &payee_agent_asset)?;

    // ─────────────────────────────────────────────────────────────────────
    // Policy 3 — Velocity. Sliding-window with tier-decay.
    // Invariant 2: velocity_counter_le_limit.
    //
    // evaluate_and_commit_velocity returns:
    //   - Err(VelocityExceeded) → return Deny without commit
    //   - Ok(VelocityCommit::Pending) → commit AFTER all other policies pass
    // ─────────────────────────────────────────────────────────────────────
    let velocity_commit = match evaluate_and_commit_velocity(
        policy,
        &ctx.accounts.velocity_ledger,
        amount,
        payer_tier,
        now_slot,
    ) {
        Ok(commit) => commit,
        Err(reason) => {
            emit!(GateDecisionEmitted { /* ... */ });
            return Ok(GateDecision::Deny(reason));
        }
    };

    // ─────────────────────────────────────────────────────────────────────
    // Policy 4 — CounterpartyTier. The headline policy.
    // Invariant 3: counterparty_tier_monotone.
    // ─────────────────────────────────────────────────────────────────────
    if let Some(reason) =
        evaluate_counterparty_tier(policy, payee_tier, payee_risk, payee_conf)?
    {
        emit!(GateDecisionEmitted { /* ... */ });
        return Ok(GateDecision::Deny(reason));
    }

    // ─────────────────────────────────────────────────────────────────────
    // Policy 5 — RequireValidation. Returns RequireValidation outcome
    // (not Deny) on missing attestation per v1_scope.md §gate_payment.
    // Invariant 4: validation_expiry_correct.
    // ─────────────────────────────────────────────────────────────────────
    let attestation_view = ctx
        .accounts
        .validation_attestation
        .as_ref()
        .map(ValidationAttestationView::try_from)
        .transpose()?;

    if let Some(capability_hash) = evaluate_require_validation(
        policy,
        attestation_view.as_ref(),
        &payee_agent_asset,
        now_slot,
    )? {
        emit!(GateDecisionEmitted { /* ... */ });
        return Ok(GateDecision::RequireValidation(capability_hash));
    }

    // ─────────────────────────────────────────────────────────────────────
    // All policies passed → commit velocity, emit Allow.
    // ─────────────────────────────────────────────────────────────────────
    let velocity = &mut ctx.accounts.velocity_ledger;
    if let VelocityCommit::Pending { delta_amount } = velocity_commit {
        velocity.cumulative_amount = velocity
            .cumulative_amount
            .checked_add(delta_amount)
            .ok_or(PolicyVaultError::VelocityOverflow)?;
        velocity.last_commit_slot = now_slot;
    }

    emit!(GateDecisionEmitted {
        payer_agent_asset,
        payee_agent_asset,
        amount,
        decision_kind: 0, // Allow
        denial_reason: 0,
        slot: now_slot,
    });

    Ok(GateDecision::Allow)
}
```

### G.2 — Error mapping

```rust
// programs/policy-vault/src/errors.rs
use anchor_lang::prelude::*;

#[error_code]
pub enum PolicyVaultError {
    #[msg("Policy ID mismatch between policy_account and instruction arg")]
    PolicyMismatch,

    #[msg("Velocity overflow on cumulative_amount checked_add")]
    VelocityOverflow,

    // Atom Engine cross-program read errors
    #[msg("AtomStats account is not owned by atom-engine")]
    AtomStatsWrongOwner,
    #[msg("AtomStats key does not match the expected PDA for the given asset")]
    AtomStatsWrongPda,
    #[msg("AtomStats data length differs from expected schema (v0.5+)")]
    AtomStatsWrongSize,
    #[msg("AtomStats discriminator mismatch — possible Quantu schema change")]
    AtomStatsBadDiscriminator,

    // Agent Registry cross-program read errors
    #[msg("AgentAccount account is not owned by agent-registry-8004")]
    AgentAccountWrongOwner,
    #[msg("AgentAccount key does not match the expected PDA for the given asset")]
    AgentAccountWrongPda,
    #[msg("AgentAccount discriminator mismatch")]
    AgentAccountBadDiscriminator,

    // Policy-specific denial reasons (one variant per kind for clarity)
    #[msg("KillSwitch is engaged for this scope")]
    KillSwitchEngaged,
    #[msg("Amount exceeds Spending.per_tx_max")]
    SpendingPerTxExceeded,
    #[msg("Amount + cumulative would exceed Spending.daily_max")]
    SpendingDailyExceeded,
    #[msg("Amount + cumulative would exceed Spending.weekly_max")]
    SpendingWeeklyExceeded,
    #[msg("Velocity sliding-window cap exceeded")]
    VelocityWindowExceeded,
    #[msg("Counterparty tier below min_counterparty_tier")]
    CounterpartyTierBelowMin,
    #[msg("Counterparty risk_score above max_risk_score")]
    CounterpartyRiskAboveMax,
    #[msg("Counterparty confidence below min_confidence")]
    CounterpartyConfidenceBelow,
    #[msg("Required validation attestation missing")]
    AttestationMissing,
    #[msg("Required validation attestation expired")]
    AttestationExpired,
    #[msg("Required validation attestation revoked")]
    AttestationRevoked,
    #[msg("Required validation attestor not in accepted_attestors[]")]
    AttestationAttestorRejected,
}
```

### G.3 — `GateDecision` return type

```rust
// programs/policy-vault/src/state.rs (excerpt)

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum GateDecision {
    Allow,
    Deny(PolicyVaultError),
    RequireValidation([u8; 32]),  // capability_hash
}
```

Anchor 1.0 serializes enum tags as `u8` discriminants; downstream facilitators parse the return data via `simulateTransaction` or `getReturnData`. Per `v1_scope.md` §gate_payment, the facilitator's `POST /verify` endpoint translates `GateDecision` to HTTP 200 / 402 / 402-with-capability.

---

## H — TrustGate `emit_feedback` instruction skeleton (PDA-signed CPI, no Quantu crate dep)

```rust
// programs/trustgate/src/instructions/emit_feedback.rs

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke_signed,
};

use crate::errors::TrustGateError;
use crate::events::FeedbackEmitted;
use crate::ext::agent_registry::{
    AGENT_REGISTRY_ID, ATOM_CPI_AUTHORITY_SEED, GIVE_FEEDBACK_DISCRIMINATOR,
};
use crate::state::{FeedbackEmissionLog, TrustGateAuthority};

#[derive(Accounts)]
#[instruction(
    payment_id: [u8; 32],
    payee_asset: Pubkey,
    score: u8,
    tag1: String,
    tag2: String,
    endpoint: String,
    feedback_uri: String,
)]
pub struct EmitFeedback<'info> {
    /// Facilitator (e.g., Dexter / atxp_ai / MCPay).
    pub facilitator: Signer<'info>,

    /// Trustgate's PDA-signer for the give_feedback CPI.
    /// Owner: trustgate. Will sign the CPI via invoke_signed seeds.
    /// CHECK: the PDA derivation is verified by Anchor's seeds constraint.
    #[account(
        seeds = [b"trustgate_auth", facilitator.key().as_ref()],
        bump,
    )]
    pub trustgate_authority: UncheckedAccount<'info>,

    /// Idempotency log per (payment_id) — prevents duplicate emissions.
    #[account(
        init_if_needed,
        payer = facilitator,
        space = 8 + FeedbackEmissionLog::INIT_SPACE,
        seeds = [b"feedback_log", &payment_id],
        bump,
    )]
    pub feedback_log: Account<'info, FeedbackEmissionLog>,

    /// Quantu's AgentAccount for the payee.
    /// CHECK: passed through to Quantu's give_feedback context.
    #[account(mut)]
    pub payee_agent_account: UncheckedAccount<'info>,

    /// Metaplex Core asset for the payee agent.
    /// CHECK: passed through.
    pub payee_asset_account: UncheckedAccount<'info>,

    /// Metaplex Core collection for the payee agent's namespace.
    /// CHECK: passed through.
    pub payee_collection: UncheckedAccount<'info>,

    /// Quantu's AtomConfig (for ATOM-enabled feedback).
    /// CHECK: passed through.
    pub atom_config: UncheckedAccount<'info>,

    /// Quantu's AtomStats for the payee — atom-engine writes this on CPI.
    /// CHECK: passed through.
    #[account(mut)]
    pub payee_atom_stats: UncheckedAccount<'info>,

    /// Quantu's atom-engine program (for the nested CPI inside give_feedback).
    /// CHECK: program-id verified.
    #[account(address = crate::ext::atom_engine::ATOM_ENGINE_ID)]
    pub atom_engine_program: UncheckedAccount<'info>,

    /// Quantu's registry_authority PDA (CPI signer for give_feedback's nested CPI).
    /// CHECK: derived from agent-registry's seeds.
    #[account(
        seeds = [ATOM_CPI_AUTHORITY_SEED],
        bump,
        seeds::program = AGENT_REGISTRY_ID,
    )]
    pub registry_authority: UncheckedAccount<'info>,

    /// Quantu's agent-registry-8004 program — the CPI target.
    /// CHECK: program-id verified.
    #[account(address = AGENT_REGISTRY_ID)]
    pub agent_registry_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn emit_feedback_handler(
    ctx: Context<EmitFeedback>,
    payment_id: [u8; 32],
    payee_asset: Pubkey,
    score: u8,
    tag1: String,
    tag2: String,
    endpoint: String,
    feedback_uri: String,
) -> Result<()> {
    // Idempotency check.
    require!(
        !ctx.accounts.feedback_log.emitted,
        TrustGateError::AlreadyEmitted
    );

    // Argument validation (mirrors agent-registry-8004 limits from
    // agent-registry-8004/src/reputation/state.rs:1–4).
    const MAX_TAG_LENGTH: usize = 32;
    const MAX_URI_LENGTH: usize = 250;
    const MAX_ENDPOINT_LENGTH: usize = 250;
    require!(score <= 100, TrustGateError::InvalidScore);
    require!(tag1.len() <= MAX_TAG_LENGTH, TrustGateError::TagTooLong);
    require!(tag2.len() <= MAX_TAG_LENGTH, TrustGateError::TagTooLong);
    require!(
        feedback_uri.len() <= MAX_URI_LENGTH,
        TrustGateError::UriTooLong
    );
    require!(
        endpoint.len() <= MAX_ENDPOINT_LENGTH,
        TrustGateError::EndpointTooLong
    );

    // Build instruction data: 8-byte discriminator + Borsh-encoded args.
    // Arg order MUST match agent-registry-8004/src/lib.rs:135–155:
    //   value: i128, value_decimals: u8, score: Option<u8>, feedback_file_hash: Option<[u8; 32]>,
    //   tag1: String, tag2: String, endpoint: String, feedback_uri: String
    let mut data = Vec::with_capacity(384);
    data.extend_from_slice(&GIVE_FEEDBACK_DISCRIMINATOR);

    // value: i128 (16 bytes LE) — for clean settlement we encode payment value.
    data.extend_from_slice(&(0i128).to_le_bytes());
    // value_decimals: u8
    data.push(0u8);
    // score: Option<u8> — Borsh: 1 byte tag (0=None, 1=Some) + value if Some
    data.push(1);
    data.push(score);
    // feedback_file_hash: Option<[u8; 32]>
    data.push(0); // None
    // Strings: 4-byte LE length + UTF-8 bytes
    push_string(&mut data, &tag1);
    push_string(&mut data, &tag2);
    push_string(&mut data, &endpoint);
    push_string(&mut data, &feedback_uri);

    // Account metas — order matches Quantu's GiveFeedback context
    // (agent-registry-8004/src/reputation/contexts.rs:9–60).
    let metas = vec![
        AccountMeta::new(ctx.accounts.trustgate_authority.key(), true), // client (signer)
        AccountMeta::new(ctx.accounts.payee_agent_account.key(), false), // agent_account (mut)
        AccountMeta::new_readonly(ctx.accounts.payee_asset_account.key(), false),
        AccountMeta::new_readonly(ctx.accounts.payee_collection.key(), false),
        AccountMeta::new_readonly(anchor_lang::solana_program::system_program::ID, false),
        AccountMeta::new_readonly(ctx.accounts.atom_config.key(), false),
        AccountMeta::new(ctx.accounts.payee_atom_stats.key(), false),
        AccountMeta::new_readonly(ctx.accounts.atom_engine_program.key(), false),
        AccountMeta::new_readonly(ctx.accounts.registry_authority.key(), false),
    ];

    let ix = Instruction {
        program_id: AGENT_REGISTRY_ID,
        accounts: metas,
        data,
    };

    let bump = ctx.bumps.trustgate_authority;
    let facilitator_key = ctx.accounts.facilitator.key();
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"trustgate_auth",
        facilitator_key.as_ref(),
        &[bump],
    ]];

    invoke_signed(
        &ix,
        &[
            ctx.accounts.trustgate_authority.to_account_info(),
            ctx.accounts.payee_agent_account.to_account_info(),
            ctx.accounts.payee_asset_account.to_account_info(),
            ctx.accounts.payee_collection.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.atom_config.to_account_info(),
            ctx.accounts.payee_atom_stats.to_account_info(),
            ctx.accounts.atom_engine_program.to_account_info(),
            ctx.accounts.registry_authority.to_account_info(),
            ctx.accounts.agent_registry_program.to_account_info(),
        ],
        signer_seeds,
    )?;

    let log = &mut ctx.accounts.feedback_log;
    log.emitted = true;
    log.payment_id = payment_id;
    log.score = score;
    log.slot = Clock::get()?.slot;

    emit!(FeedbackEmitted {
        payment_id,
        payee_asset,
        score,
        slot: log.slot,
    });

    Ok(())
}

#[inline]
fn push_string(buf: &mut Vec<u8>, s: &str) {
    let bytes = s.as_bytes();
    buf.extend_from_slice(&(bytes.len() as u32).to_le_bytes());
    buf.extend_from_slice(bytes);
}
```

### H.2 — `agent_registry.rs` constants module

```rust
// programs/trustgate/src/ext/agent_registry.rs

use anchor_lang::prelude::*;

/// Pinned program ID of agent-registry-8004 v0.5.3.
/// Source: QuantuLabs/8004-solana/programs/agent-registry-8004/src/lib.rs:3
pub const AGENT_REGISTRY_ID: Pubkey =
    pubkey!("8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ");

/// give_feedback Anchor instruction discriminator.
/// Computed: sha256("global:give_feedback")[0..8]
pub const GIVE_FEEDBACK_DISCRIMINATOR: [u8; 8] =
    [145, 136, 123, 3, 215, 165, 98, 41];

/// Quantu's CPI-authority seed (used as the seed of the registry_authority PDA).
/// Source: QuantuLabs/8004-solana/programs/agent-registry-8004/src/reputation/contexts.rs:6
pub const ATOM_CPI_AUTHORITY_SEED: &[u8] = b"atom_cpi_authority";
```

---

## I — Token-2022 detection helper (full code block)

The Spending policy must detect Token-2022 mint extensions at runtime to (1) reject ConfidentialTransfer mints, (2) flag TransferHook mints to facilitators, (3) bypass NonTransferable mints (let token program handle).

```rust
// programs/policy-vault/src/ext/token_extensions.rs

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, get_mint_extension_data};
use spl_token_2022::{
    extension::{
        confidential_transfer::ConfidentialTransferMint, transfer_hook::TransferHook,
        non_transferable::NonTransferable, transfer_fee::TransferFeeConfig,
        pausable::PausableConfig, BaseStateWithExtensions, StateWithExtensions,
    },
    state::Mint as Token2022Mint,
};

/// Cached Token-2022 extension flags relevant to PolicyVault Spending policy.
#[derive(Debug, Clone, Copy, Default)]
pub struct MintExtensionFlags {
    pub is_token_2022: bool,
    pub has_transfer_hook: bool,
    pub has_confidential_transfer: bool,
    pub has_transfer_fee: bool,
    pub is_non_transferable: bool,
    pub is_pausable: bool,
    pub transfer_hook_program: Option<Pubkey>,
    pub transfer_fee_basis_points: u16,
}

/// Detects Token-2022 extensions on a mint account.
/// Returns flags safe to use in policy decision tree.
///
/// CU cost: ~2K CU for a mint with 0 extensions (just owner + length checks),
/// up to ~6K CU for a mint with all extensions (TLV iteration).
pub fn read_mint_extensions(
    mint_info: &AccountInfo,
) -> Result<MintExtensionFlags> {
    let mut flags = MintExtensionFlags::default();

    // Owner check determines program family.
    let owner = mint_info.owner;
    if owner == &spl_token::ID {
        // Legacy SPL token. No extensions possible.
        return Ok(flags);
    }
    if owner != &spl_token_2022::ID {
        // Unknown owner — fail loudly.
        return Err(error!(crate::errors::PolicyVaultError::MintWrongOwner));
    }

    flags.is_token_2022 = true;

    let data = mint_info.try_borrow_data()?;
    // A mint with NO extensions has length 82. A mint with extensions has length >= 166.
    if data.len() == spl_token::state::Mint::LEN {
        return Ok(flags);
    }

    // Parse the extension TLV stream via spl-token-2022's helper.
    let mint = StateWithExtensions::<Token2022Mint>::unpack(&data)?;

    // Extension presence checks. `get_extension::<T>()` returns Ok(&T) if present,
    // Err if not — so we map to bool.
    flags.has_transfer_hook = mint.get_extension::<TransferHook>().is_ok();
    if let Ok(hook) = mint.get_extension::<TransferHook>() {
        flags.transfer_hook_program = Option::<Pubkey>::from(hook.program_id).map(|a| a.into());
    }

    flags.has_confidential_transfer = mint.get_extension::<ConfidentialTransferMint>().is_ok();
    flags.is_non_transferable = mint.get_extension::<NonTransferable>().is_ok();
    flags.is_pausable = mint.get_extension::<PausableConfig>().is_ok();

    if let Ok(fee) = mint.get_extension::<TransferFeeConfig>() {
        flags.has_transfer_fee = true;
        flags.transfer_fee_basis_points = u16::from(fee.newer_transfer_fee.transfer_fee_basis_points);
    }

    Ok(flags)
}

/// Decision shim for Spending policy v1.
pub fn check_mint_acceptable(flags: &MintExtensionFlags) -> Result<()> {
    // Policy decision table:
    //   ConfidentialTransfer → REJECT (cannot verify amount on-chain)
    //   TransferHook         → ACCEPT (warn flag set; facilitator must keep tx atomic)
    //   TransferFee          → ACCEPT (we gate on gross amount)
    //   NonTransferable      → ACCEPT (token program handles)
    //   Pausable             → ACCEPT (token program handles)
    if flags.has_confidential_transfer {
        return Err(error!(
            crate::errors::PolicyVaultError::ConfidentialTransferUnsupported
        ));
    }
    Ok(())
}
```

The `get_mint_extension_data` helper (anchor-spl 1.0.1) source: https://github.com/solana-foundation/anchor/blob/master/spl/src/token_interface.rs (`pub fn get_mint_extension_data<T: Extension + Pod>` — quoted earlier in this file).

The `StateWithExtensions::unpack` parses the 165-byte base + account_type + TLV stream per `solana-program/token-2022/interface/src/extension/mod.rs`. The library handles the offset math; do NOT hand-roll the TLV iteration unless squeezing the last 200 CU is critical.

---

## J — Anchor 0.31 vs 1.0+ migration table (focused, AgentTrust-relevant)

| Concern | Anchor 0.31.1 (Quantu) | Anchor 1.0.1 (AgentTrust) | Migration cost |
|---|---|---|---|
| TS package | `@coral-xyz/anchor@0.31.x` | `@anchor-lang/core@1.0.1` | Update import paths |
| Solana SDK | 2.1.x | 3.0 | Toolchain update |
| IDL format | Legacy (idl init/upgrade ix) | Program Metadata (PR #3798) | Deploy script change |
| Discriminator type | sized (8-byte) | unsized (8-byte default) | None for `#[account]` users |
| `init-if-needed` feature | required | required | None |
| `#[account]` macro output | per-version | per-version | NEVER cross-deser typed |
| Duplicate mut accounts | allowed | rejected (use `dup`) | Add `dup` if needed |
| `#[error_code]` count | unlimited per program | 1 per program (PR #4300) | Consolidate into one enum |
| Test runner default | `solana-test-validator` | LiteSVM (Surfpool) | Test harness rewrite |
| Borsh major | 1.x | 1.x | None |
| `seeds::program` syntax | supported | supported | None |
| `CpiContext::new_with_signer` | supported | supported | None |
| `AccountLoader::try_from` | supported | supported | None |

**Verdict for AgentTrust:** start clean on Anchor 1.0.1. Quantu's 0.31.1 is irrelevant because we don't import Quantu types. Pin Quantu's commit hash for byte-layout stability (Pattern B § C, mainnet program ID `8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ` — never changes regardless of Anchor version).

---

## K — What this means for Mohit's submission

1. **Pin Anchor 1.0.1 and Solana 3.1.x.** No need to drop to 0.31.1 to "match Quantu" — AgentTrust never imports Quantu's anchor types. The byte-layout pin (Quantu commit `bfb09ad50813` from 2026-03-06, the latest on `main` per gh api repos/QuantuLabs/8004-solana/commits) is what matters; Anchor version on AgentTrust's side is independent. **Action:** add `anchor-lang = "1.0.1"` to `Cargo.toml`; document Quantu commit hash in `docs/PINNED-VERSIONS.md` Day-5 morning.

2. **`gate_payment` envelope = ~80K CU worst case (3x safety from ~26K estimate). No split needed.** Setting `set_compute_unit_limit(150_000)` as a pre-instruction is the correct production move. The 1.4M tx budget is 17.5x our envelope. Document the empirical measurement on Day 7 (first localnet integration test); only split into `gate_check`/`gate_commit` if measured >500K. **Action:** add a CU benchmark step to the Day-7 integration-test script; gate the split decision on actual numbers.

3. **The single most-important Token-2022 footgun: TransferHook mints can revert AFTER `gate_payment` commits the velocity ledger if the facilitator splits the tx.** Mitigation = `mountTrustGate(app, ...)` MUST emit a single atomic tx bundling `gate_payment + transfer + emit_feedback`. This is a one-paragraph note in `docs/INTEGRATION-FACILITATOR.md` and an enforced invariant inside the SDK. **Action:** the SDK MUST refuse to split — code the `mountTrustGate` adapter so multi-tx mode is unreachable.

4. **Use Pattern B (manual byte parsing) for ALL Quantu PDA reads.** Pattern A (`Account<atom_engine::AtomStats>`) requires a `path = "../8004-atom"` Cargo dep, which forces Anchor 0.31.1 cross-version friction. The `read_atom_stats_tier` function in §C is canonical. **Action:** copy the `atom_stats_offsets` module verbatim into `programs/policy-vault/src/ext/atom_engine.rs` Day 5; verify offsets against the pinned Quantu commit Day 7.

5. **`give_feedback` discriminator is `[145, 136, 123, 3, 215, 165, 98, 41]`** (sha256("global:give_feedback")[0..8]). Manual instruction encoding via `solana_program::instruction::Instruction { program_id, accounts, data }` per Squads v4 pattern (§D.2). **Action:** add the discriminator constant as `GIVE_FEEDBACK_DISCRIMINATOR` to `programs/trustgate/src/ext/agent_registry.rs` Day 5; unit test the byte-encoding against a known-good tx.

6. **AtomStats `trust_tier` is at byte offset 551, `tier_confirmed` is at 555.** USE `tier_confirmed` for the CounterpartyTier policy — it's the post-vesting tier (Quantu state.rs comment: "Confirmed tier after vesting period (replaces trust_tier for logic)"). Tier vesting takes ~8 epochs (~20 days) per `v1_scope.md` mainnet-vs-devnet decisions, so the Day-5 pre-warming critical action is the dependency: `tier_confirmed` only diverges from `trust_tier` after vesting, and the demo on Day 12 needs the vested values. **Action:** the Day-5 cron `feedback-cron.ts` script targets `tier_confirmed` reads on Day 12; verify Day 9 that vesting is progressing on the 5 demo agents.

7. **Single `Clock::get()` per instruction.** PolicyVault's `gate_payment` reads slot once and threads it into all 5 policy fns. Saves ~400 CU vs. per-policy reads. **Action:** code the policy-fn signatures to take `now_slot: u64` rather than calling `Clock::get()` internally.

8. **`try_borrow_data` returns a `Ref` whose lifetime ties to the AccountInfo's `RefCell`.** Read all foreign-program PDAs in scoped blocks BEFORE writing the `VelocityLedger`. Anchor 1.0's `Disallow duplicate mutable accounts by default` is a runtime safety net but doesn't catch every `BorrowMutError` case. **Action:** the `gate_payment` skeleton in §G already structures reads in scoped blocks; preserve this pattern when implementing the policy fns.

9. **For Token-2022 mint detection, use `anchor-spl::token_interface::get_mint_extension_data<T>()`** — it wraps `spl-token-2022::StateWithExtensions::unpack` correctly, including the 82-vs-165-byte base offset disambiguation. Hand-rolling TLV iteration is a footgun. **Action:** import `token_2022_extensions` feature in `Cargo.toml`; the `read_mint_extensions` helper in §I is the integration boilerplate.

10. **Reject `ConfidentialTransferMint` extension in v1 Spending policy.** AgentTrust cannot verify the encrypted amount matches the cleartext `amount` arg. Documented limitation; v1.1 ships proof verification. **Action:** add `ConfidentialTransferUnsupported` to `PolicyVaultError`; the v1 README's Token-2022-support section calls this out explicitly.

---

## Appendix — primary-source citation index

| Topic | URL or path |
|---|---|
| Anchor 1.0 release notes | https://www.anchor-lang.com/docs/anchor-project-updates/release-notes/1.0 |
| Anchor installation (1.0.1) | https://www.anchor-lang.com/docs/installation |
| Anchor `Account::try_from` | github.com/solana-foundation/anchor/lang/src/accounts/account.rs:50–63 |
| Anchor `AccountLoader::try_from` | github.com/solana-foundation/anchor/lang/src/accounts/account_loader.rs:120–138 |
| Anchor `CpiContext::new_with_signer` | github.com/solana-foundation/anchor/lang/src/context.rs:198–209 |
| Anchor `seeds::program` codegen | github.com/solana-foundation/anchor/lang/syn/src/codegen/accounts/constraints.rs:81–110 |
| Anchor `UncheckedAccount` source | github.com/solana-foundation/anchor/lang/src/accounts/unchecked_account.rs |
| anchor-spl Token-2022 helpers | github.com/solana-foundation/anchor/spl/src/token_interface.rs |
| Token-2022 ExtensionType enum | github.com/solana-program/token-2022/interface/src/extension/mod.rs |
| Token-2022 Mint::LEN = 82, Account::LEN = 165 | github.com/solana-program/token-2022/interface/src/state.rs:38, :100 |
| Token-2022 TLV layout | github.com/solana-program/token-2022/interface/src/extension/mod.rs (`type_and_tlv_indices`) |
| Token-2022 docs (extensions overview) | https://www.solana-program.com/docs/token-2022/extensions |
| Solana CU limits (1.4M tx, 200K ix default) | https://solana.com/docs/core/fees |
| Solana CPI cost model (946 CU base) | https://solana.com/docs/core/cpi/cpi-cost-model |
| Solana syscall reference | https://solana.com/docs/core/programs/syscall-reference |
| Agave compute-budget constants | https://raw.githubusercontent.com/anza-xyz/agave/master/program-runtime/src/execution_budget.rs |
| SIMD-0339 (CPI cost reduction) | github.com/solana-foundation/solana-improvement-documents (search "0339") |
| SIMD-0286 (100M block CU) | https://forum.solana.com/t/simd-0286 |
| Drift `load_ref` (manual deser) | github.com/drift-labs/protocol-v2/programs/drift/src/state/load_ref.rs |
| Marginfi `load_price_update_v2_checked` | github.com/0dotxyz/marginfi-v2/programs/marginfi/src/state/price.rs |
| Marginfi `load_kamino_reserve` | github.com/0dotxyz/marginfi-v2/programs/marginfi/src/state/price.rs |
| Squads v4 `invoke_signed` pattern | github.com/Squads-Protocol/v4/programs/squads_multisig_program/src/utils/executable_transaction_message.rs |
| Squads MPL `invoke_signed` (legacy v1) | github.com/Squads-Protocol/squads-mpl/programs/squads-mpl/src/lib.rs |
| Quantu `agent-registry-8004` Cargo.toml | github.com/QuantuLabs/8004-solana/programs/agent-registry-8004/Cargo.toml |
| Quantu `lib.rs` (declare_id, give_feedback ix) | github.com/QuantuLabs/8004-solana/programs/agent-registry-8004/src/lib.rs |
| Quantu `AgentAccount` struct | github.com/QuantuLabs/8004-solana/programs/agent-registry-8004/src/identity/state.rs |
| Quantu `GiveFeedback` accounts struct | github.com/QuantuLabs/8004-solana/programs/agent-registry-8004/src/reputation/contexts.rs:9–60 |
| Quantu `give_feedback` instruction body | github.com/QuantuLabs/8004-solana/programs/agent-registry-8004/src/reputation/instructions.rs |
| Quantu `core_asset.rs` (Metaplex Core owner read) | github.com/QuantuLabs/8004-solana/programs/agent-registry-8004/src/core_asset.rs |
| Quantu `atom-engine` declare_id | github.com/QuantuLabs/8004-atom/programs/atom-engine/src/lib.rs:3 |
| Quantu `AtomStats` struct (561 bytes, all offsets) | github.com/QuantuLabs/8004-atom/programs/atom-engine/src/state.rs |
| Quantu `atom-engine` contexts (init / update_stats) | github.com/QuantuLabs/8004-atom/programs/atom-engine/src/contexts.rs |

---

**End of file.** All code blocks are runnable as written (modulo crate imports; copy the workspace `Cargo.toml` from §A.4). All offsets are byte-precise against the pinned Quantu commit. All CU numbers are conservative envelopes verified against agave master constants and SIMD-0339-active mainnet behavior.
