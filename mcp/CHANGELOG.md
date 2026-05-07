# Changelog

All notable changes to `@agenttrust-sdk/mcp`.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
