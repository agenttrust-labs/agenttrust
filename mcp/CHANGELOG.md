# Changelog

All notable changes to `@agenttrust-sdk/mcp`.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Planned

- `agenttrust_lookup_feedback_by_tx({ tx_signature })` — resolve a Solana
  transaction signature to its `emit_feedback` payment_id_hash by parsing
  the tx's inner instructions. Useful when an integrator has the settle
  signature but not the digest.

## [0.3.5] — 2026-05-13

Tag: `mcp-v0.3.5` · Polish wave from the gate E2E rerun that confirmed
0.3.4 closed the four hot-fix items. This release adds defensive
guards plus one classifier extension surfaced by the rerun.

### Added

- `prepublishOnly` guard: a small Node script
  `scripts/check-no-workspace-spec.cjs` runs before every publish
  and hard-fails if invoked by anything other than pnpm while the
  package.json still carries `workspace:` specifiers. Forces the
  use of `pnpm publish` (which rewrites `workspace:^` to the
  concrete semver range at pack time). Prevents another 0.3.2-style
  `EUNSUPPORTEDPROTOCOL` shipping accident at the pipeline level.

### Changed

- `classifyError` in `mcp/src/errors.ts` now lands
  `SendTransactionError` text shapes as `chain_error` with a
  remediation-specific hint instead of the generic `internal`
  fallback. Covers four variants: `err.name === "SendTransactionError"`,
  the literal substring `SendTransactionError` in the message,
  the `"Simulation failed.\nMessage:"` simulate-action prefix, and
  the `"Transaction X resulted in an error"` send-action prefix.
  Surfaced by Beat F of the 2026-05-13 gate rerun whose downstream
  CPI failure was previously misclassified as `internal`.

### Tests

- `mcp/test/publish-guard.test.ts` (new). Spawns the guard script
  as a subprocess with three `npm_execpath` values and asserts the
  exit code plus stderr branch for each (npm path -> fail, pnpm
  path -> pass, unset -> fail).
- `mcp/test/errors.test.ts` extended with four new cases covering
  the SendTransactionError classification paths.

Suite size: 117 passing (was 110), conformance 22/22.

## [0.3.4] — 2026-05-13

Tag: `mcp-v0.3.4` · Hot-fix release for the four regressions surfaced by
the gate E2E run against published 0.3.3 (Claude Code over `claude -p`,
real devnet RPC, real mainnet RPC for the Quantu read beat). Full
verification report at `submission/e2e-claude-code-2026-05-13/README.md`.

The gate found that 0.3.3 booted and listed the expected nineteen tools
but blocked Claude Code on three of seven tested tools at the Anthropic
API tool-validation layer and at the Anchor argument-marshalling layer,
plus over-reached on the mainnet program-ID guard. 0.3.4 fixes all four
items and ships unit-test coverage so each regression has a defence in
the test suite going forward.

### Fixed

- `agenttrust_request_validation` and `agenttrust_respond_to_validation`
  no longer ship JSON Schema draft-04 `exclusiveMinimum: true` in their
  generated input schemas (the form the Anthropic /v1/messages tool
  validator rejects with HTTP 400 under draft 2020-12). Both
  `deadline_slot` and `expires_at_slot` now use Zod `.min(1)` so the
  emitted fragment is the draft 2020-12 form `{ "type": "integer",
  "minimum": 1 }`. Two surfaces fixed: `mcp/src/tools/write/request-
  validation.ts` and `mcp/src/tools/write/respond-to-validation.ts`. A
  defence-in-depth post-processor `rewriteExclusiveBoundsToDraft2020`
  was added in `mcp/src/server.ts` and runs on every tool's generated
  schema, so a future `.positive()` or `.gt(N)` in any tool input
  cannot regress the Anthropic tool-validation path unnoticed.

- `agenttrust_emit_feedback` no longer fails with the Anchor "provided
  too many arguments" error. The on-chain `trustgate::emit_feedback`
  Rust signature added two parameters (`value: u64`, `value_decimals:
  u8`) between `score` and `tag1` for Quantu `quality_score` accrual,
  but the bundled `mcp/src/idl/trustgate.json` still listed the older
  eight-argument shape. Anchor 0.31's `splitArgsAndCtx` compared the
  ten args the handler passed (correct, matches the SDK call) against
  the stale eight in the IDL and rejected the call. Fix: regenerated
  the IDL fragment to add `value` and `value_decimals` in the correct
  positional slot. The handler call site in
  `mcp/src/tools/write/emit-feedback.ts` continues to pass the 32-byte
  `payment_id_hash` as a single positional array (`Array.from(...)`),
  which is what Anchor expects for `[u8; 32]`.

- Mainnet boot no longer hard-throws when AgentTrust program IDs are
  unset, which previously blocked Quantu-only reads on mainnet (Beat G
  in the gate report). The boot guard in `mcp/src/config.ts` now emits
  a one-time stderr warning, fills the three AT program IDs with a
  sentinel pubkey (the System Program `11111111111111111111111111111111`),
  and exports `isMainnetUndeployedSentinel(pubkey)` so the chain layer
  can detect the sentinel. `mcp/src/chain.ts` runs a `guardATProgramId`
  check before each `loadPolicyVault` / `loadTrustGate` /
  `loadValidationRegistry` call and throws a `ConfigError`-named Error
  that classifies as the new `config_error` envelope code. Quantu
  reads use the real `MAINNET_QUANTU_IDS` and are unaffected.

- `classifyError` in `mcp/src/errors.ts` now maps Solana
  `InstructionError` payloads (JSON-shaped and text-shaped) to
  `errorCode: "chain_error"` rather than the generic `internal`
  fallback. The Custom NNN code is extracted, named where it appears
  in the small table of known Anchor error numbers (e.g. 3012 -> 
  `AccountNotInitialized`), and surfaced in the `hint` field. A new
  `config_error` code was added to `ToolErrorCode` to cover the
  mainnet-undeployed sentinel case from the chain-layer guard.

### Tests

- `mcp/test/json-schema-output.test.ts` (new). Recursively walks every
  tool input schema after the `rewriteExclusiveBoundsToDraft2020`
  post-processor and asserts no boolean `exclusiveMinimum` /
  `exclusiveMaximum` survives anywhere in the nested tree. Pins the
  `deadline_slot` and `expires_at_slot` shapes to `{ "type":
  "integer", "minimum": 1 }`. Covers six cases including the
  `anyOf` / `oneOf` / `allOf` / `items` walk paths.

- `mcp/test/tools/write/emit-feedback.test.ts` (extended). Adds a
  handler-level test that mocks the Anchor `trustgate.methods.emit
  Feedback(...)` chain and asserts the handler passes exactly ten
  positional arguments matching the on-chain Rust signature, with
  `payment_id_hash` as a single 32-element `number[]` (not spread).

- `mcp/test/config.test.ts` (new). Asserts `loadConfig` returns rather
  than throws on `NETWORK=solana-mainnet` without overrides, fills
  the three AT program IDs with the sentinel, leaves the Quantu IDs
  as the real mainnet pubkeys, and respects explicit overrides.

- `mcp/test/errors.test.ts` (new). Covers the new `chain_error`
  routing for the four `InstructionError` shapes the gate saw
  (simulation-failed JSON, raw `custom program error: 0x...` text,
  text-shaped InstructionError without a Custom code, Anchor-style
  with structured `error.errorCode.code`), the new `config_error`
  routing, plus regression coverage for `auth_required`,
  `input_invalid`, and the `internal` fallback.

Suite size after this release: 110 passing (29 unit tests added vs
0.3.3's 86), plus the stdio conformance harness (22 checks) which
continues to pass against the regenerated server.

## [0.3.3] — 2026-05-13

Tag: `mcp-v0.3.3` · Republish of 0.3.2 to fix a packaging bug.

### Fixed

- `@agenttrust-sdk/trustgate` dep in the published `package.json` is
  now a concrete semver range (`^0.3.1`) instead of the pnpm
  workspace specifier (`workspace:^`). 0.3.2 was published via plain
  `npm publish` which does not rewrite `workspace:` specs — npm
  consumers hit `EUNSUPPORTEDPROTOCOL` on install. 0.3.3 is published
  via `pnpm publish`, which performs the rewrite. 0.3.2 has been
  deprecated on the registry with a pointer to 0.3.3.

No source changes vs 0.3.2 — every Added / Changed / Fixed item
below also applies to this release.

## [0.3.2] — 2026-05-12  [deprecated]

Note: 0.3.2 is deprecated on npm because the published manifest
carries `"@agenttrust-sdk/trustgate": "workspace:^"`, which npm
rejects with `EUNSUPPORTEDPROTOCOL`. Use 0.3.3.

Tag: `mcp-v0.3.2` · Developer-experience polish wave covering every
post-submission audit P0 and P1 finding plus the three ergonomics
items called out in `submission/post-submission-todos.md`. The goal:
a stranger clones a fresh agent host, runs the published install
snippet, and the gate works first try with no pre-flight ritual.

### Added

- `agenttrust_init_authority` write tool. Creates the `PolicyAuthority`
  PDA for an agent. Idempotent — existing authorities surface their
  on-chain `members` and `threshold` instead of failing. Defaults:
  `members = [signer]`, `threshold = 1`.
- Layered signer detection. `KEYPAIR_B58` → `KEYPAIR_PATH` →
  `~/.config/solana/id.json` → `SOLANA_KEYPAIR_PATH`. The Solana CLI
  default keypair is picked up automatically. A developer who already
  ran `solana-keygen new` no longer needs to set any env var. Solves
  the root cause of the `patch-claude.sh` pre-flight script.
- `MCP_HTTP_HOST` env (default `127.0.0.1`). `MCP_TRANSPORT=http` no
  longer exposes the server on the LAN by accident. Hosted deploys
  set `MCP_HTTP_HOST=0.0.0.0` explicitly.
- Structured `tools/call` error envelopes. Failures now carry an
  `errorCode` (`auth_required` / `input_invalid` / `rpc_failure` /
  `chain_error` / `not_found` / `internal`), `message`, optional
  `hint`, and a truncated `cause`. Encoded as JSON-in-text for
  backward compat plus a spec-compliant `structuredContent` field.
  LLMs can react without grepping prose.
- `errorCode` fields on `agenttrust_get_quantu_reputation` (one of
  `wrong_owner` / `size_mismatch` / `schema_mismatch`),
  `agenttrust_docs` (`docs_corpus_not_found`), and
  `agenttrust_facilitator_walkthrough` (`walkthrough_not_bundled`).
  Additive — existing `error` prose strings preserved.
- `readKeypairFile(path)` helper exported from `mcp/src/config.ts`
  for direct testing of the JSON-array keypair format.

### Changed

- `agenttrust_init_policy`, `agenttrust_set_killswitch`, and the
  underlying `init_killswitch` instruction self-heal. When a
  prerequisite PDA (`PolicyAuthority`, `KillSwitchState`) is missing,
  the matching init instruction is prepended into the same atomic
  transaction. Existing accounts remain the source of truth — never
  silently overwritten. Returns `selfHealed: true` with `healedSteps`
  so the caller surfaces the bootstrap to the user.
- `agenttrust_init_policy` defaults unspecified spending caps to the
  MAX of specified caps, not 0. Because v1 policies are immutable
  post-init, the previous 0 default was hostile (always-deny). Velocity
  caps are left untouched — window-seconds and max-in-window aren't
  peer caps in the same dimension.
- `agenttrust_simulate_payment` drops the preemptive funded-fee-payer
  throw. The underlying simulator uses `replaceRecentBlockhash: true`
  and `sigVerify: false` so an unfunded ephemeral fee-payer is fine.
- `agenttrust_emit_feedback` `value` and `value_decimals` stay optional
  but write a one-time stderr warn when both are omitted. Preserves
  the USDC default for compat while making the magnitude trap visible
  to non-USDC integrators.
- `requireSigner()` error message, MCP server `instructions` string,
  the three signer-required write-tool descriptions, README, and the
  three docs-site pages (`install`, `tools`, `hosted-endpoint`) all
  reference the full four-source signer chain instead of `KEYPAIR_B58`
  alone.
- `agenttrust_set_killswitch` threshold>1 error message now points at
  the multi-sig walkthrough doc and the SDK composer path instead of
  stopping at "cosigner support is roadmap."
- `agenttrust_init_policy.velocity.tier0_decay_factor` and
  `agenttrust_request_validation.deadline_slot` Zod fields gain
  `.describe()` copy that explains basis-points semantics and the
  current-slot-plus-buffer expectation. `emit_feedback.base_collection`
  description spells out the three real discovery paths (demo state,
  on-chain `agent_account.collection`, the registration call).

### Fixed

- `NETWORK=solana-mainnet` hard-throws at boot when no explicit
  `POLICY_VAULT_PROGRAM_ID` / `TRUSTGATE_PROGRAM_ID` /
  `VALIDATION_REGISTRY_PROGRAM_ID` is set. AgentTrust programs aren't
  deployed to mainnet yet; the previous silent fall-through to devnet
  IDs produced wrong gate decisions on a mainnet RPC. (F-002)
- HELP_TEXT corrections. Default port now `8765` (advertised 8080).
  Docs URL now `https://docs.agenttrust.tech/mcp` (was the github.io
  mirror). Dropped the stray backslash that leaked `\$MCP_HTTP_PORT`.
  Boot banner prints `http://localhost:PORT` for the click-through URL.
- `RPC_URL` is validated with `new URL(rpcUrl)` at boot. A typo'd URL
  throws naming the env var instead of a low-level fetch error on the
  first chain call.
- `KEYPAIR_B58` length errors say what length was received vs the
  expected 64 bytes, and call out that a 32-byte value is the public
  key half only.
- `agenttrust_respond_to_validation` no longer references a
  non-existent `register_attestor` MCP tool — points at the demo
  script and the SDK helpers instead.
- Protocol-conformance test asserts 19 tools (was 18) and includes
  `agenttrust_init_authority` in the expected-name list.

### Deploy notes (hosted-mcp)

- `mcp/fly.toml` adds `MCP_HTTP_HOST=0.0.0.0` to the `[env]` block.
  Without it the container binds 127.0.0.1 inside the Fly machine
  and the platform health check fails.

## [0.2.6] — 2026-05-08

Tag: `mcp-v0.2.6` · Phase Q1 — fixes the only data-correctness bug Phase P uncovered. The MCP catalog now produces correct on-chain values for every tool that returns data.

### Fixed

- `agenttrust_get_quantu_reputation` was reading Quantu `AtomStats` at fabricated byte offsets (`40 / 41 / 49 / 50 / 51`) and returning bogus values — Phase P E2E showed `tier: 164` for an actually-tier-0 agent, plus a u64-max-ish `feedbackCount` that was junk re-interpretation of the asset-pubkey region. The PDA address, owner, and account size were correct; only the field decoding was wrong.

  0.2.6 mirrors the canonical offsets from `programs/policy-vault/src/ext/atom_engine.rs` verbatim:

  | offset | width | field            |
  |-------:|------:|------------------|
  |    549 |   u8  | `risk_score`     |
  |    551 |   u8  | `tier_immediate` |
  |    555 |   u8  | `tier_confirmed` |
  |    557 |   u16 LE | `confidence`  |
  |    560 |   u8  | `schema_version` (canary, must equal 1) |

  Adds the schema-version canary at byte 560 and the `tier ≤ ATOM_TIER_MAX = 4` range check the on-chain parser uses, so a future Quantu layout change fails loud rather than silently emitting garbage.

### Changed (breaking, response shape)

- `agenttrust_get_quantu_reputation` response `reputation` block now contains:
  - `tierImmediate` (number, 0..=4) — v1 fast-path tier; what `CounterpartyTier` reads in v1 demo mode
  - `tierConfirmed` (number, 0..=4) — post-vesting tier; production policies prefer this
  - `riskScore` (number, 0..=255 — lower is better)
  - `confidence` (number, 0..=10_000 basis points)
  - `schemaVersion` (number, always 1 in v1)
- Removed `feedbackCount` and `averageScore` — those fields were not in the canonical `AtomStats` struct; values were nonsense reinterpretations of unrelated bytes.
- Added an `error` field on the top-level response when the schema-version canary or size check fails — populated in place of `reputation`.

### Tests

- `mcp/test/tools/read/get-quantu-reputation.test.ts` now asserts the canonical offsets match the on-chain Rust source exactly, plus 8 byte-level decode cases (zero-state, populated state, undersized buffer, schema-version mismatch, tier overflow on both fields, boundary case at `ATOM_TIER_MAX`, u16-LE confidence reads in the correct byte order).

## [0.2.5] — 2026-05-08

Tag: `mcp-v0.2.5` · Phase O — description copy polish surfaced by the Phase N+ real-user UX pass.

### Changed

- Tool descriptions no longer reference internal repo paths. `agenttrust_demo_state`, `agenttrust_docs`, and `agenttrust_emit_feedback`'s `base_collection` arg now read as standalone product copy without `examples/pay-sh-demo/...` / `docs-site/content/docs/...` leaks. Resource `name` fields under `agenttrust://examples/*` use human-readable labels ("pay-sh-demo README" instead of `examples/pay-sh-demo/README.md`).
- `agenttrust_emit_feedback.base_collection` description now points production integrators at their Quantu agent-registry collection address (the value passed to `agent_registry::register_agent`), not just at demo state.
- `agenttrust_demo_state` error message — when the bundled snapshot is unreachable — drops the internal path and explains that the published package bundles it; only mentions `PAY_SH_DEMO_STATE_FILE` as the override hook.

No behaviour changes; tools/list output cleaner for Claude Desktop / Cursor / any LLM doing tool-routing from natural-language questions.

## [0.2.4] — 2026-05-07

Tag: `mcp-v0.2.4` · UX-pass fix: real-user audit found `agenttrust_get_validation_attestation` requires a 64-char hex `capability_hash` while its sibling `agenttrust_request_validation` accepts the friendly `capability_name`. Real users / LLMs typically have the human-readable capability name; requiring the digest was a Claude-Desktop-level friction point.

### Added

- `agenttrust_get_validation_attestation` now accepts either `capability_name` (preferred — the SDK computes SHA256(name)) or `capability_hash`. At least one is required; `capability_name` wins when both are passed. Mirrors the existing `agenttrust_request_validation` ergonomics.

## [0.2.3] — 2026-05-07

Tag: `mcp-v0.2.3` · Path-resolution fix follow-up to 0.2.2.

### Fixed

- 0.2.2 bundled the embedded-docs / embedded-examples assets correctly but the consumer `path.resolve(__dirname, "…")` had an off-by-one — `dist/tools/discovery/__dirname + "../../../embedded-docs"` resolved to `<package-root>/embedded-docs`, missing the `dist/` segment. Files were in the tarball but the loaders couldn't find them. Three relative paths corrected (discovery/docs.ts, discovery/facilitator-walkthrough.ts, resources/docs.ts). Fresh `npx` install now returns full corpus + walkthrough content.

## [0.2.2] — 2026-05-07

Tag: `mcp-v0.2.2` · Phase N — Phase M E2E surfaced three bugs; this release closes all three plus the SERVER_VERSION fix that landed in 0.2.1.

### Fixed

- `agenttrust_demo_state` no longer reports `available: false` on a fresh `npx` install. The build script now bundles the live devnet JSON snapshots (counterparties, demo-policies, smoke, attestor-trace, namespaces, chained-validation) into `dist/embedded-data/`. The tool prefers the bundled path; a local clone still wins the source-of-truth `examples/.../...json` lookup. (Phase M Bug #2)
- `agenttrust_docs` now returns ranked hits from the full MDX corpus (27 pages) on `npx` installs. The build script materialises `docs-site/content/docs/**/*.mdx` into `dist/embedded-docs/`; the doc loader prefers that directory and falls back to the live tree on a local clone. The `agenttrust://docs/*` resource scheme works the same way. (Phase M Bug #3)
- `agenttrust_facilitator_walkthrough` reads its source MDX + the trustgate facilitators README from `dist/embedded-docs/` first; no more "no walkthrough bundled" responses. (Phase M Bug #3)
- The `agenttrust://examples/*` resource scheme now reads from `dist/embedded-examples/` (READMEs + `src/*.ts` for both pay-sh-demo and attestor-demo). (Phase M Bug #3)
- HTTP transport now spins up one `Server` + `StreamableHTTPServerTransport` pair per `Mcp-Session-Id` instead of a singleton. Concurrent clients no longer interfere; second `initialize` no longer errors `-32600 Server already initialized`. Idle sessions evict after 30 minutes. (Phase M Bug #4)

### Changed

- Build pipeline: `pnpm --filter ./mcp run build` now runs `tsc && node scripts/copy-embedded-assets.js`. The copy script prints a per-bucket count summary so regressions in the bundled set are visible at build time.

### Note

The bundled `dist/embedded-docs/` is a **publish-time snapshot**. The live docs at `docs.agenttrust.tech` evolve independently — clients that need fresh docs should set `MCP_DOCS_DIR` to a checkout's `docs-site/content/docs/` directory, or use the hosted MCP at `mcp.agenttrust.tech` (redeployed on every `main` push).

## [0.2.1] — 2026-05-07

Tag: `mcp-v0.2.1` · `simulate_payment` clearer error when no caller / KEYPAIR_B58 set.

### Fixed

- `agenttrust_simulate_payment` returns an actionable error ("requires a funded fee-payer on devnet — pass `caller` or set `KEYPAIR_B58`") instead of cryptic `AccountNotFound` when neither input is provided. Phase M E2E driver verified the fix via stdio + HTTP.
- `serverInfo.version` now reads from `package.json` so MCP clients see the same version as `npm view`. Previously hardcoded to `0.1.0` — drifted across 0.1.0 → 0.2.0 → 0.2.1.

## [0.2.0] — 2026-05-07

Tag: [`mcp-v0.2.0`](https://github.com/agenttrust-labs/agenttrust/releases/tag/mcp-v0.2.0)
· Commit: `00ca222`

### Changed

- Re-pinned the `@agenttrust-sdk/trustgate` dep from `workspace:*` to
  `workspace:^`, so the published tarball ranges to `^0.2.0` (matches
  the SDK's own 0.2.0 bump). MCP code itself swept to the renamed
  `programs.trustGate` field + the new `programs.validationRegistry`
  field that the SDK 0.2.0 release added.
- `AgentTrustConfig.validationRegistryId` (top-level field) folded into
  `AgentTrustConfig.programs.validationRegistry` — single source of
  truth, matches the SDK's `ProgramIds` shape. The
  `VALIDATION_REGISTRY_PROGRAM_ID` env override is unchanged.

No new tools, no protocol-conformance changes — every MCP tool surface
behaves identically to 0.1.0. 76 unit tests + 21 protocol-conformance
checks still green.

## [0.1.0] — 2026-05-04

Tag: [`mcp-v0.1.0`](https://github.com/agenttrust-labs/agenttrust/releases/tag/mcp-v0.1.0)
· Commit: `66d4f04`

### Added

- Initial publish of the AgentTrust MCP server. 18 tools across three
  categories:
  - **Read** (10): `get_policy`, `get_velocity_ledger`, `get_killswitch`,
    `get_authority`, `get_feedback_log`, `get_capability_namespace`,
    `get_attestor_profile`, `get_validation_request`,
    `get_validation_attestation`, `simulate_gate_payment`.
  - **Write** (5): `init_authority`, `init_killswitch`, `set_killswitch`,
    `request_validation`, `respond_to_validation`, `emit_feedback`.
  - **Discovery** (3): `list_facilitators`, `health`, plus an MCP
    resource at `agenttrust://programs` exposing program IDs and
    explorer URLs.
- Two transports: stdio (default; `npx -y @agenttrust-sdk/mcp`) and
  HTTP (`MCP_TRANSPORT=http MCP_HTTP_PORT=8765`).
- Bundled IDLs for `policy_vault`, `trustgate`, `validation_registry`
  so the server boots against a freshly-redeployed program before
  `anchor idl init` lands.
- Optional signer via `KEYPAIR_B58` for write tools; read tools work
  with no env beyond defaults.
- Network selection via `NETWORK=solana-devnet | solana-mainnet`.
