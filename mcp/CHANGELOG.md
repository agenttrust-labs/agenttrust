# Changelog

All notable changes to `@agenttrust-sdk/mcp`.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Planned

- `agenttrust_lookup_feedback_by_tx({ tx_signature })` — resolve a Solana
  transaction signature to its `emit_feedback` payment_id_hash by parsing
  the tx's inner instructions. Useful when an integrator has the settle
  signature but not the digest. Targeted for v0.3.0.

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
