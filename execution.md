# AgentTrust Build Execution Log

## Current Phase

**Phase 4 — gate_payment composer + RequireValidation + first 2 Kani invariants** | Status: planning (Phase 3 verified + committed)

### Phase 0 plan (completed 2026-05-02)

1. ✅ Read 4 context-load files (`CLAUDE.md`, `v1_scope.md`, `00-synthesis.md`, `MEMORY.md`)
2. ✅ Verify toolchain: `solana 3.1.14`, `anchor 1.0.1`, `cargo-kani 0.67.0`, `rustc 1.95.0` — all match locked
3. ✅ Verify Solana keypair: `4tSEHc2vCLqnYd8nK9jRa44vnn8JnPxUgxheEmhWQhRG`, devnet balance 10 SOL, default cluster devnet
4. ✅ Mohit signed off: full build, no scope cuts, 7 questions all "yes / your call where rec'd"
5. ✅ `.gitignore` already configured by Mohit (only `README.md` + `execution.md` ship)
6. ✅ Scaffold Anchor workspace at repo root:
   - `Cargo.toml` (workspace, resolver = 2)
   - `Anchor.toml` (3 programs, devnet default, `[test.validator.clone]` for mainnet `agent-registry-8004` + `atom-engine`)
   - `programs/policy-vault/`, `programs/trustgate/`, `programs/validation-registry/` (each: Cargo.toml + Xargo.toml + src/lib.rs)
   - `package.json` (TS deps for `@coral-xyz/anchor` 1.0+ tests), `tsconfig.json`
   - `LICENSE` (MIT) + `README.md` (Foundation-alignment opener)
7. ✅ `cargo build` green (24.5s), `anchor build` green — 3 `.so` files (56664 bytes each) + 3 IDL JSONs
8. ✅ Commit: `scaffold anchor workspace + 3 program crates` (`6b17009`)

### Phase 1 plan (completed 2026-05-02)

1. ✅ Restructured to SRP layout — `state/` (one struct per file), `policies/` (one policy per file), `instructions/` (one ix per file), `constants.rs` separated, `errors.rs` + `events.rs` at top level.
2. ✅ Moved internal docs to `docs/` (plan/research now under `docs/plan/`, `docs/research/`) — root holds only ship-relevant files. CLAUDE.md path refs updated. New memory rules saved (`feedback_code_quality_first.md`, `feedback_repo_root_clean.md`).
3. ✅ State schema: 4 PDA structs match playbook §B byte offsets exactly (PolicyAccount 240B, VelocityLedger 88B, KillSwitchState 104B, PolicyAuthority 280B).
4. ✅ Decision types: `GateDecision`, `DenyReason` with stable `code()` mapping (decoupled from Borsh wire format because `#[repr(u8)] = N` conflicts with AnchorSerialize derive).
5. ✅ Spending policy: pure function over `(SpendingState, amount, unix_ts) -> SpendingOutcome { Allow(deltas) | Deny(reason) }`. UTC midnight + ISO Monday rollover. `From<&PolicyAccount>` snapshot constructor.
6. ✅ `init_policy` instruction with nested config args (SpendingConfig, VelocityConfig, CounterpartyConfig, ValidationConfig) + range validation + auth-gap SECURITY comment for Phase 3.
7. ✅ 15 unit tests for Spending — happy/sad/edge/boundary/overflow/rollover/ISO-week/negative-ts. All green.
8. ✅ `review-and-iterate` skill ran clean: B (security, scoped Phase-3 init-auth gap), A (correctness), A (error handling), B (testing — integration phase 9), A (organization), B+ (docs). HTML artifact at `docs/internal/reviews/2026-05-02-phase-1-policy-vault-review.html`.

### Program IDs (locked Phase 0)

| Program | Devnet (= localnet) program ID | Keypair file (gitignored, in target/deploy/) |
|---------|-------------------------------|----------------------------------------------|
| `policy_vault` | `8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR` | `target/deploy/policy_vault-keypair.json` |
| `trustgate` | `HF8zHfoyA7b5mhLViopTnRMprc6ZT5KActHTdkFrih2N` | `target/deploy/trustgate-keypair.json` |
| `validation_registry` | `Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv` | `target/deploy/validation_registry-keypair.json` |

These IDs are committed in `Anchor.toml` and `lib.rs declare_id!` calls. The keypair files are gitignored — without them, others can't deploy these IDs (they'd need to redeploy with new keypairs and update `Anchor.toml`).

---

## Compressed calendar proposal (awaiting sign-off)

Today is **2026-05-02 (Day 8)**. Submission **2026-05-11 (Day 17)** = 10 days remaining inclusive of today. Days 5–7 burned on setup/research, zero code shipped.

| Day | Date | Phase(s) | Deliverable |
|-----|------|----------|-------------|
| 8 | May 2 (today) | **Phase 0** + Phase 1 start | Scaffold green + PolicyVault state schema (PolicyAccount, VelocityLedger, KillSwitchState, PolicyAuthority) |
| 9 | May 3 (Sat) | **Phase 1** finish + Phase 2 start | Spending policy green w/ tests + CounterpartyTier `read_atom_tier` (manual byte-551 deser) |
| 10 | May 4 (Sun) | **Phase 2** finish + Phase 3 start | CounterpartyTier devnet smoke (read live AtomStats) + Velocity sliding-window started |
| 11 | May 5 (Mon) | **Phase 3** finish | Velocity + KillSwitch policies green w/ tests |
| 12 | May 6 (Tue) | **Phase 4** | `gate_payment` composer (5-policy fail-fast) + RequireValidation policy + first 2 Kani invariants green (`paused_implies_no_allow`, `velocity_counter_le_limit`) |
| 13 | May 7 (Wed) | **Phase 5** | Remaining 3 Kani invariants green (`counterparty_tier_monotone`, `validation_expiry_correct`, `multisig_threshold_enforced`) → 5/5 prove green in CI |
| 14 | May 8 (Thu) | **Phase 6** | TrustGate Anchor program (PDA-signed `give_feedback` CPI) + Express service `POST /verify` + `POST /settle` |
| 15 | May 9 (Fri) | **Phase 7** + Phase 8 start | `@agenttrust/trustgate` SDK w/ atomic-tx enforcement + npm publish + ValidationRegistry state schema |
| 16 | May 10 (Sat) | **Phase 8** finish + **Phase 9** + **Phase 10** | ValidationRegistry 4 PDAs + 6 instructions green + E2E integration test (TrustGate → PolicyVault → settle → emit_feedback → ValidationRegistry) + devnet deploy of all 3 programs (on-chain `executable: true` verified) |
| 17 | May 11 (Sun) | **Phase 11** + **Phase 12** + submit | UI (landing + dashboard, Next.js + Tailwind + shadcn + GSAP) + README finalization + CI workflows + final smoke + submission |

### Slack analysis

- **Tightest day**: Day 16 (3 phases stacked). If ValidationRegistry slips, Phase 9 E2E test compresses to a 2-program flow (PolicyVault + TrustGate) on Day 16, ValidationRegistry rolls into Day 17 morning. Devnet deploy is non-negotiable — must land Day 16.
- **Highest-variance day**: Day 13 (Kani 3/5 → 5/5). Kani proofs iterate; mitigations: split each invariant into its own harness file (per `v1_scope` §Kani section) so failures isolate; use `cargo kani --harness <name>` for fast single-prove cycles.
- **UI risk on Day 17**: scope must be tight. Proposal: 2 surfaces — (1) landing page (hero + 3-pillar architecture explainer + Foundation-alignment block + CTA to GitHub), (2) product dashboard (PDA reader: PolicyAccount, VelocityLedger, KillSwitchState; gate_payment simulator form; attestation request/respond flow). No marketing fluff; functional > glossy.

### Scope deltas vs `v1_scope.md` §Acceptance Criteria

The build prompt overrides v1_scope on two points — flagging explicitly so we don't drift later:

1. **Devnet, not mainnet-beta.** v1_scope §Acceptance says "deployed to mainnet-beta"; build prompt says "Ship to devnet by 2026-05-11". I'm building to devnet target. Mainnet deploy can happen Day 18+ post-submission if Mohit chooses.
2. **No pitch video / no demo recording in build scope.** v1_scope acceptance includes pitch video + 90s demo + Twitter bio update; build prompt scope ends at code + UI. I'll treat those as out-of-scope for this conversation.
3. **No mainnet pre-warm for demo agents.** v1_scope had Day 5 pre-warm of 5 mainnet agents to vest tiers by Day 12. That window has passed; pre-warm now is structurally too late for ~20-day vesting. For devnet demos, we'll synthesize AtomStats locally (or mainnet-clone via `[test.validator.clone]`) — see Q2 below.

---

## Open questions for Mohit (block scaffold until resolved)

**Q1 — `plan/` + `research/` in repo.**
The build prompt's `.gitignore` template ignores `plan/`, `research/`, `agenttrust-grant/`, `docs/`, `*.md` (except README). But `plan/` and `research/` are already tracked in this repo (29 files). Two paths:

  - **A.** Treat this directory AS the public AgentTrust repo. Add `.gitignore` entries + `git rm -r --cached plan/ research/` to untrack (files stay on disk). Loses the version-controlled `plan/research` history from this repo. Future commits ship clean.
  - **B.** Scaffold AgentTrust into a subdirectory (e.g., `./agenttrust/`) which becomes the public repo. Parent stays as the workspace, plan/research keep their git history here.

  My recommendation: **A** — cleaner alignment with "scaffold Anchor workspace at repo root". The plan/research files exist on disk for me to read and stay in their original commits in `git log`; only future writes get ignored. The history isn't lost, just archived in this repo's history.

**Q2 — Pre-warmed demo agents.**
Day-5 pre-warm wasn't executed; tier vesting is structurally moot now. For Phase 9 E2E and Phase 11 UI demos:

  - **A.** Pure devnet: synthesize fake AtomStats accounts via test setup or have Phase 11 UI hit localnet `[test.validator.clone]` mirror (mainnet-clone gives realistic AtomStats from real mainnet agents).
  - **B.** Fire a partial pre-warm on devnet now (no vesting requirement on devnet test data; we control the AtomStats). 5 agents, ~30 min, ~0 SOL on devnet.

  Recommendation: **A + B mixed** — for the on-chain demo: localnet `[test.validator.clone]` for byte-perfect realism in tests; for the deployed devnet UI: 3 synthesized devnet agents at scripted tiers (0, 2, 4) so the UI demo shows tier-gating behavior. ~10 min of script work.

**Q3 — UI dashboard scope.**
Confirm minimum surface: (a) landing page, (b) product dashboard with PDA viewer + gate_payment simulator + attestation flow. Anything else mandatory? E.g., do we need a "facilitator integration" code-snippet showcase page mirroring the SDK README? My instinct: no — the README itself carries that, dashboard is the "product" surface.

**Q4 — UI stack.**
Default per prompt + skill list: **Next.js 15 + Tailwind + shadcn/ui + GSAP for animations + Vercel deploy**. Any deviation? (E.g., do you want the brand-design skill to run first to lock palette/typography, or just go with shadcn defaults + a tasteful dark-mode override?)

**Q5 — npm publish.**
Real publish of `@agenttrust/trustgate` to public npm requires (a) npm account, (b) `@agenttrust` org claimed (or fall back to unscoped `agenttrust-trustgate`). Status?
  - If npm org claim takes time: I publish under `agenttrust-trustgate` (unscoped) on Day 15 and rename later.
  - If you have `@agenttrust` already: confirm and I'll add the npm publish to Day 15 deliverables.
  - If we want to skip npm publish entirely and ship "installable from git" only: that's a 1-line change in the SDK README.

**Q6 — `gh` CLI auth.**
`CLAUDE.md` notes `gh` is authed as `mohit-scaler`; build prompt says PR work happens as `mohit-1710`. When we create the public AgentTrust GitHub repo, do you want me to (a) `gh auth switch` to mohit-1710 (if already logged in) or (b) prompt you to `gh auth login --web` for mohit-1710 from your shell? Surface this on Day 16 when we create the repo, or now?

**Q7 — Devnet SOL budget.**
Devnet program deploy cost: ~3–5 SOL per program × 3 = 9–15 SOL. Current devnet balance: 10 SOL. We may need 1–2 airdrop calls during Phase 10. OK to call `solana airdrop` as needed without flagging each one?

---

## Phases Complete

- **2026-05-02 — Phase 0 — setup + scaffold** — Anchor workspace at repo root, 3 program crates compile to BPF, IDL JSONs generated, devnet/localnet program IDs locked in `Anchor.toml` + `declare_id!`. Commit: `scaffold anchor workspace + 3 program crates`.
- **2026-05-02 — Phase 1 — PolicyVault state schema + Spending policy** — 4 PDA structs (PolicyAccount/VelocityLedger/KillSwitchState/PolicyAuthority) split per-file under `state/`, byte layouts match `docs/plan/research/04-policyvault-build-playbook.md §B`. Pure-function Spending policy with 15 unit tests (happy/sad/edge/boundary/overflow/rollover/ISO-week/negative-ts) — all green. `init_policy` instruction with nested config args + range validation + auth-gap acknowledged via SECURITY comment (Phase 3 deliverable). `review-and-iterate` skill ran clean: B/A-/A/B/A/B+ rubric grades. Anchor TS integration tests added (8 cases) + pnpm switch (commit `40c15c0`). Side-effect: all 3 programs deployed to devnet executable.
- **2026-05-02 — Phase 2 — CounterpartyTier policy + AtomStats byte parser** — `ext/atom_engine.rs` (manual byte-offset reader for Quantu's foreign PDA, 561 bytes, locked offsets 549/551/555/557/560), `ext/agent_registry.rs` (defensive AgentAccount validators), `policies/counterparty_tier.rs` (pure-fn tier-gating policy with `From<&PolicyAccount>` snapshot + `Unrated`/`Allow`/`Deny` outcome). 29 new Rust unit tests (46 total). `build-defi-protocol` skill consulted for Anchor cross-program PDA patterns; `review-and-iterate` flagged 2 issues fixed pre-commit: tier clamping → fail-loud, graceful-degradation early-return doc/code mismatch.
- **2026-05-02 — Phase 3 — Velocity + KillSwitch + PolicyAuthority multisig + init_policy auth gap closed** — `policies/velocity.rs` (pure-fn sliding-window with tier-decay ¼/½/¾/1×/5/4× via u128 saturating math), `policies/killswitch.rs` (paused-flag eval), 3 new instructions: `init_authority` (1..=7 members, no-dups, caller-in-members), `init_killswitch` (PerAgent scope), `set_killswitch` (multisig-gated pause/unpause). `init_policy` now requires payer ∈ `policy_authority.members` — Phase 1 auth gap closed. `PolicyAuthority::count_distinct_signing_members` extracted as pure-fn for Phase 5 Kani harness. 91 tests green (74 Rust + 17 TS). Devnet program data extended by 100KB (~2.3 SOL). `review-and-iterate` flagged 2 findings collapsed into one fix (pubkey-based dedup + pure-fn extraction) applied pre-commit. **Known remaining gap:** init_authority bootstrap race (anyone-can-call-first); documented + scoped to Phase 4 closure via AgentAccount.owner check.

---

## Active Decisions

- **Devnet target locked** (override of v1_scope mainnet-beta acceptance) per build prompt — 2026-05-02
- **No pre-warm rerun** — Day-5 vesting window has closed; demos use synthesized devnet agents + localnet clone of mainnet — 2026-05-02
- **Pattern B (UncheckedAccount + manual byte parsing)** for ALL Quantu PDA reads — locked in v1_scope + research §A.2 — never re-litigate
- **Pinned Quantu commit `bfb09ad`** — locked in `00-synthesis.md` §A.1 — never re-litigate
- **TierGateMode::Immediate (byte 551)** as v1 default — locked in change file Rev 2 — never re-litigate
- **Composer order: KillSwitch → Spending → Velocity → CounterpartyTier → RequireValidation** — locked in v1_scope §Component 1 — never re-litigate
- **Atomic-tx invariant in TrustGate SDK: literal-type guard + runtime throw** — locked in research §A.2 — never re-litigate

---

## Deviations

(none yet)

---

## Learnings

- Toolchain matches locked versions exactly (solana 3.1.14 / anchor 1.0.1 / cargo-kani 0.67.0). Zero version-mismatch friction expected.
- Existing repo is a research workspace, not a code workspace. Phase 0 transforms it into the build target.
- **`cargo-build-sbf` PATH workaround**: Homebrew's `solana` formula at `/opt/homebrew/bin/solana` does NOT include `cargo-build-sbf`. The Agave install at `~/.local/share/solana/install/active_release/bin/` has the matching 3.1.14 toolchain with `cargo-build-sbf`. Every `anchor build` / `anchor test` invocation must prepend `PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"`. Permanent fix would be a fish-config tweak; for now we prepend per-invocation.
- Empty `#[program] mod {}` triggers Anchor cfg warnings (`anchor-debug`, `custom-heap`, `custom-panic`). Harmless; resolve once Phase 1 adds real instructions.
- **Anchor 1.0 `#[program]` macro requires accounts struct + macro-generated `__client_accounts_*` modules to be reachable from crate root.** Pattern: `pub use instructions::init_policy::*;` at `lib.rs` top level brings both into crate scope. Any modular Anchor codebase needs this.
- **`#[repr(u8)]` enum WITH explicit `= N` discriminants conflicts with `AnchorSerialize` / `AnchorDeserialize` derives.** Fix: drop the explicit discriminants. If clients need stable u8 codes, add a `code()` const method that maps each variant to its number — decoupled from the Borsh wire format ordering.
- **Repo organization rule** (per Mohit's feedback 2026-05-02): research/plan/internal docs go in `docs/`; root holds only ship-relevant files. Memory rule saved at `feedback_repo_root_clean.md`.
- **Code-quality discipline rule** (per Mohit's feedback 2026-05-02): SRP per file, pure-fn policies, run `review-and-iterate` skill BEFORE every commit. Memory rule saved at `feedback_code_quality_first.md`. Updated 2026-05-02 to also cover using skills DURING coding (not only review): `build-defi-protocol` for Anchor patterns, `cso` for security-sensitive code, `debug-program` reactively.

---

## Blockers

(none — Phase 2 starting)

---

## Next Phase — Phase 3 plan

**Phase 3 — Velocity + KillSwitch policies + PolicyAuthority multisig + init_policy auth gate** (May 3-4, Day 9-10)

Skills to load before writing: `cso` for the multisig + auth-gate code path (security-critical); reuse `build-defi-protocol` patterns from Phase 2.

Deliverables:
1. `programs/policy-vault/src/policies/velocity.rs` — pure-fn Velocity sliding-window with tier-decay (`apply_tier_decay`: tier 0 → ¼ window, tier 1 → ½, tier 2 → ¾, tier 3 → 1×, tier 4 → 5/4×). Returns `VelocityOutcome { Allow(VelocityDeltas), Deny(reason) }` — composer applies the deltas only on the all-policies-passed branch (Allow-path-only commit).
2. `programs/policy-vault/src/policies/killswitch.rs` — pure-fn KillSwitch evaluator: `evaluate(state) -> Option<DenyReason>`. Plus the KillSwitch state-mutation instruction lives in `instructions/set_killswitch.rs`.
3. `programs/policy-vault/src/instructions/init_authority.rs` — initialise `PolicyAuthority` PDA with members + threshold; default 2-of-3 per playbook §F.1.
4. `programs/policy-vault/src/instructions/init_killswitch.rs` — initialise `KillSwitchState` PDA per scope (Global default).
5. `programs/policy-vault/src/instructions/set_killswitch.rs` — multisig-gated pause/unpause; counts distinct signers from PolicyAuthority.members; require ≥ threshold; stamps `paused_at_slot` / `unpaused_at_slot` / `paused_by`.
6. **Close the Phase-1 init_policy auth gap.** Add `policy_authority` account to `init_policy.rs` accounts struct + `require!(authority.members.contains(&payer.key()), MemberNotInAuthority)` guard. Update SECURITY comment from "Phase 3 deliverable" → "auth-gated as of Phase 3".
7. Pure-Rust unit tests for Velocity + KillSwitch + multisig-distinct-signer dedup. ~30 new test cases.
8. Anchor TS integration tests for `init_authority`, `init_killswitch`, `set_killswitch`. 4-6 new TS test cases.

Edge cases mapped upfront:
- **Velocity overflow**: cumulative + amount > u64::MAX → `VelocityOverflow`. Use `checked_add`.
- **Velocity window expiry**: `now_slot - window_start_slot >= window_slots` → reset (window_start_slot = now_slot, cumulative_amount = 0).
- **Velocity Allow-path-only commit**: policy module returns `Pending(deltas)`; composer applies only after every other policy passes. Phase 2 CounterpartyTier already follows this; Velocity must too.
- **Multisig dedup**: same signer pubkey appearing twice (signs twice or duplicated in `remaining_accounts`) counts once.
- **Member out-of-range**: `member_count` must be 1..=7 (v1 cap); `threshold` must be 1..=member_count.
- **Auth-gate transition**: existing PolicyAccount PDAs created in Phase 1 (no auth gate) — Phase 3 adds the requirement going forward; existing accounts grandfather. Document this; don't break tests.

Verification gate: cargo build green + anchor build green + cargo test green (~76 tests total) + anchor test green (~14 TS tests total) + `review-and-iterate` clean + commit.

Skills to load before writing: `build-defi-protocol` (Anchor 1.0 cross-program PDA read patterns) + `cso` (signer/account-validation rigor on the foreign-account read path).

Deliverables:
1. `programs/policy-vault/src/ext/mod.rs` — re-exports + namespace.
2. `programs/policy-vault/src/ext/atom_engine.rs`:
   - Constants: `ATOM_ENGINE_DEVNET_ID`, `ATOM_ENGINE_MAINNET_ID`, `ATOM_STATS_SIZE = 561`, `ATOM_STATS_TRUST_TIER_OFFSET = 551`, `ATOM_STATS_TIER_CONFIRMED_OFFSET = 555`, `ATOM_STATS_RISK_SCORE_OFFSET = 549`, `ATOM_STATS_CONFIDENCE_OFFSET = 557`, `ATOM_STATS_SCHEMA_VERSION_OFFSET = 560`, `ATOM_STATS_SCHEMA_VERSION_EXPECTED = 1`.
   - `pub struct AtomStatsView { tier_immediate: u8, tier_confirmed: u8, risk_score: u8, confidence: u16 }` returned by parser.
   - `pub fn read_atom_stats_view(account: &UncheckedAccount) -> Result<Option<AtomStatsView>>` — None if uninitialised (lamports == 0); checks owner == ATOM_ENGINE_ID, data_len == 561, schema_version == 1.
3. `programs/policy-vault/src/ext/agent_registry.rs`:
   - Constants: `AGENT_REGISTRY_DEVNET_ID`, `AGENT_REGISTRY_MAINNET_ID`, `AGENT_ACCOUNT_SIZE = 748`.
   - Defensive size + owner validators (used Phase 4 by composer).
4. `programs/policy-vault/src/policies/counterparty_tier.rs`:
   - `pub struct CounterpartyState { gate_mode, min_tier, max_risk_score, min_confidence, default_unrated_treatment }` snapshot.
   - `pub enum CounterpartyOutcome { Allow, Deny(DenyReason), Unrated }`.
   - `pub fn evaluate(state, view: Option<AtomStatsView>) -> CounterpartyOutcome` — pure function over the view (already parsed by `read_atom_stats_view`).
   - `Unrated` is mapped to Allow / Deny / RequireValidation by the composer per `default_unrated_treatment`.
5. Pure-Rust unit tests for `counterparty_tier::evaluate`:
   - tier ≥ min → Allow
   - tier < min → Deny(BelowMinTier)
   - risk > max_risk → Deny(AboveMaxRisk)
   - confidence < min_confidence → Deny(BelowMinConfidence)
   - view = None → Unrated
   - gate_mode toggle: Immediate uses tier_immediate; Confirmed uses tier_confirmed
   - risk constraint disabled (max_risk_score = 255) → ignored
   - confidence constraint disabled (min_confidence = 0) → ignored
6. **Devnet integration smoke** (one TS test in `tests/integration/`): construct an `AtomStatsView`-shaped account on localnet via `[test.validator.clone]` of the mainnet atom-engine; verify our reader extracts the right tier byte. (Live mainnet read is bonus.)

Edge cases mapped upfront:
- Schema bump to v2 → fail-loud with `AtomStatsSchemaMismatch` (schema_version != 1).
- AtomStats account owned by a different program (e.g., system) → `AtomStatsWrongOwner`.
- Account exists but data_len != 561 → `AtomStatsSizeMismatch`.
- Tier byte > 4 → treat as 4 (clamped) since ATOM tiers are 0..=4 by spec; or `AtomStatsSchemaMismatch` if strict. Decision: clamp to 4 (forward-compat — ATOM may add tier 5 someday).
- gate_mode = Immediate but tier_confirmed > tier_immediate (rare but possible during vesting transitions): use whichever the policy asked for; don't second-guess.

Verification gate: cargo build green + anchor build green + cargo test green (~25 tests total) + `review-and-iterate` clean + commit.

**Phase 1 — PolicyVault state schema + Spending policy** (today, May 2 — overlap into May 3 if needed)

Deliverables:
1. `programs/policy-vault/src/state.rs` — 4 account types:
   - `PolicyAccount` (seeds: `["policy", payer_agent_asset, policy_id_le_bytes]`) — holds 5 policy-kind config blocks (~256 bytes total). Uses `PolicyConfig` enum with one variant per kind: Spending, CounterpartyTier, Velocity, RequireValidation, KillSwitchScopeRef.
   - `VelocityLedger` (seeds: `["velocity", payer_agent_asset, policy_id_le_bytes]`) — sliding-window state (~80 bytes): `window_start_slot: u64`, `cumulative_amount: u64`, `last_update_slot: u64`, `bump: u8`.
   - `KillSwitchState` (seeds: `["killswitch", scope_discriminator, scope_key]`) — paused flag + scope (~96 bytes).
   - `PolicyAuthority` (seeds: `["policy_authority", payer_agent_asset]`) — multisig members (up to 15) + threshold (~128 bytes).
2. `programs/policy-vault/src/errors.rs` — `PolicyError` enum (DenyReason variants per `gate_payment` return type).
3. `programs/policy-vault/src/events.rs` — `PolicyDecided` event for telemetry.
4. `programs/policy-vault/src/policies/mod.rs` — `PolicyKind` enum + dispatch.
5. `programs/policy-vault/src/policies/spending.rs` — Spending policy: per-tx + daily + weekly limits + UTC midnight rollover + ISO-week rollover. Pure function over `(SpendingConfig, request, clock)` returning `PolicyOutcome`.
6. `programs/policy-vault/src/instructions/init_policy.rs` — `init_policy(payer_agent_asset, policy_id, configs)` constructor.
7. Wire up `lib.rs` `#[program]` mod with `init_policy` instruction.
8. Unit tests for Spending policy edge cases:
   - per-tx exceeds → Deny
   - daily cumulative exceeds → Deny
   - weekly cumulative exceeds → Deny
   - UTC midnight rollover resets daily counter
   - ISO-week rollover resets weekly counter
   - all under-limit → Allow

Edge cases mapped upfront (no debug-time surprises):
- **UTC midnight rollover boundary** — `clock.unix_timestamp / 86400` for day index. Use `u32` day index; `slot` doesn't map cleanly to civil time so use `unix_timestamp`.
- **ISO-week boundary** — Monday 00:00 UTC. Compute via `(unix_timestamp + 4 days) / (7 days)` since Unix epoch (Jan 1 1970) = Thursday; offset to land Monday boundary.
- **Schema versioning forward-compat** — every account starts with `version: u8` byte 0; current = `1`. Future migrations bump and add migration instruction.
- **Anchor 1.0+ account size**: use `#[account]` macro with `INIT_SPACE` constant or explicit `space = 8 + …` calc. Discriminator is 8 bytes prefix.

Verification gate: `cargo build` green + `anchor build` green + `anchor test` green for Spending policy unit tests + commit lands.

---

## Locked technical constants — DO NOT re-derive

- Toolchain: Anchor 1.0.1, Solana 3.1.14 (Agave), cargo-kani 0.67.0, default cluster: devnet
- Pinned Quantu commit: `bfb09ad`
- **Devnet program IDs** (deploy targets we read from):
  - `agent-registry-8004` = `8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C`
  - `atom-engine` = `AToMufS4QD6hEXvcvBDg9m1AHeCLpmZQsyfYa5h9MwAF`
- **Mainnet IDs** (for `[test.validator.clone]` localnet only):
  - `agent-registry-8004` = `8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ`
  - `atom-engine` = `AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb`
- AtomStats: SIZE = 561 bytes; `trust_tier` at byte 551 (immediate); `tier_confirmed` at byte 555 (post-vesting); `schema_version` at byte 560 (must == 1)
- AgentAccount: SIZE = 748 bytes
- ValidationAttestation: SIZE = 282 bytes
- `give_feedback` discriminator: `[145, 136, 123, 3, 215, 165, 98, 41]`
- `registry_authority` PDA seeds: `[b"atom_cpi_authority"]`
- `gate_payment` CU envelope: ~26K (set `set_compute_unit_limit(150_000)`)
- Composer order (fail-fast): KillSwitch → Spending → Velocity → CounterpartyTier → RequireValidation
- TierGateMode default: Immediate (byte 551)
- TrustGate atomic-tx invariant: literal-type guard PLUS runtime throw
- 5 Kani invariants: `paused_implies_no_allow`, `velocity_counter_le_limit`, `counterparty_tier_monotone`, `validation_expiry_correct`, `multisig_threshold_enforced`
- Quantu PDA reads: Pattern B (UncheckedAccount + manual byte parsing)
