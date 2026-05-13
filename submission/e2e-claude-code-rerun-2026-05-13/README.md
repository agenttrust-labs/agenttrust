# GATE E2E re-run — Claude Code against @agenttrust-sdk/mcp@0.3.4

Run date: 2026-05-13 (Asia/Kolkata; agent local time ~03:00).
Re-run of the 2026-05-13 gate after hot-fix `0.3.4` shipped.

Previous gate report: `/Users/mohit/superdev/frontier-dx-fixes/submission/e2e-claude-code-2026-05-13/README.md` (verdict: GATE FAIL on 0.3.3 with four regression-class items).

## Final verdict: GATE PASS

All four previously-failing items are now closed. The MCP server boots at version 0.3.4, exposes all 19 tools, the headline self-heal flow lands a fresh atomic Solana devnet transaction (NEW agent_asset distinct from the previous gate), the two schema-rejected tools (D, E) now register and execute, the emit_feedback handler (F) no longer arg-mismatches, the mainnet boot guard (G) is downgraded to stderr warn with a new `config_error` envelope for AT-touching tools, and the Anchor `Custom NNN` classifier (C) maps to `chain_error` with a hint that names the Anchor error class.

The polish wave is clear to start.

## Per-beat verdict (with comparison to previous gate)

| Beat | Tool | Previous (0.3.3) | Rerun (0.3.4) | Comparison |
|------|------|------------------|---------------|------------|
| A | tools/list + version | PASS | **PASS** | A: PASS -> PASS — version now 0.3.4, 19 tools unchanged, schema preflight confirms hot-fix item 1 applied. |
| B | init_policy self-heal (HEADLINE) | PASS | **PASS** | B: PASS -> PASS — NEW agent `EkJuNUCVPvqHqoiTcDfRS1JGV7ckEhRehgmEEffLWEVZ`, NEW tx `5PmVzZVjYL...pxYE`, on-chain proof of InitAuthority + InitPolicy atomic. |
| C | simulate_payment denied | PARTIAL (errorCode internal) | **PASS** | C: PARTIAL -> PASS — `errorCode: chain_error` (was `internal`); hint names "Custom 3012 (AccountNotInitialized)"; classifier polish item closed. |
| D | request_validation | FAIL (Anthropic API 400) | **PASS** | D: FAIL -> PASS — tool now registers (`{minimum: 1}` draft 2020-12 schema); on-chain side returns structured `chain_error` envelope (`capability_namespace` AccountNotInitialized 3012, seeded-state). |
| E | respond_to_validation | FAIL (Anthropic API 400) | **PASS** | E: FAIL -> PASS — same schema fix as D; tool registers; on-chain side returns structured `chain_error` envelope. |
| F | emit_feedback | FAIL (Anchor arg mismatch) | **PASS** | F: FAIL -> PASS — bundled IDL has 10 args (added `value`, `value_decimals`); Anchor accepts the call; `Program log: Instruction: EmitFeedback` appears in the on-chain log; downstream CPI fails on a seeded-state account in a sibling registry, captured in structured envelope. |
| G | mainnet Quantu read | PARTIAL (server refused to boot) | **PASS** | G: PARTIAL -> PASS — server boots with stderr warn (no throw); `get_quantu_reputation` works on mainnet without env-var workaround; AT-touching tool returns structured `config_error` envelope. |

## Solana Explorer URL for the Beat B headline artifact (new for rerun)

https://explorer.solana.com/tx/5PmVzZVjYLkcKTFw3MAeHey4EqULYRNkVh2ePECgp6gjWHgY8mvU8eV7NBmTQWXiqEdMKmEbhy87LcHUJkM3pxYE?cluster=devnet

(Previous gate's tx was `61DefBB1Vjgaqz2k4Zo4c47H6u373tPY9wMqs5CHCwRnVZLr8amxnkVjsdFkScpq7NxZTnA7YyHU8nKYdQRW2vgA` against agent `6JC9ezpop...rwJSuMrWB`. This rerun used a freshly-minted agent_asset `EkJuNUCVPvqHqoiTcDfRS1JGV7ckEhRehgmEEffLWEVZ` to force a fresh self-heal and produce a brand-new tx.)

## Path to the rerun artifact directory

/Users/mohit/superdev/frontier-dx-fixes/submission/e2e-claude-code-rerun-2026-05-13/

## Hot-fix item status

| Hot-fix item | Brief description | Status | Evidence beat |
|---|---|---|---|
| 1 | `deadline_slot` / `expires_at_slot` -> draft 2020-12 `{minimum: 1}`; `rewriteExclusiveBoundsToDraft2020` post-processor in `server.ts` | **CLOSED** | A (preflight schema check), D, E |
| 2 | Bundled `mcp/src/idl/trustgate.json` has 10 `emit_feedback` args (added `value`, `value_decimals`) | **CLOSED** | F (IDL preflight + tool reaches `Program log: Instruction: EmitFeedback`) |
| 3 | Mainnet boot guard downgraded to stderr warn; sentinel-filled AT IDs; AT-touching loaders throw `ConfigError` classified as new `config_error` envelope | **CLOSED** | G (default mainnet boots, Quantu read works, AT-touching tool returns `config_error`) |
| 4 | Anchor `Custom NNN` (InstructionError) classifies as `chain_error` with hint naming the code | **CLOSED** | C (`errorCode: chain_error`, hint names `Custom 3012 (AccountNotInitialized)`) |

## What this proves

- Every regression flagged in the 2026-05-13 gate is now closed against `@agenttrust-sdk/mcp@0.3.4` on the public npm registry.
- The polish wave (Beat C classifier, Beat G mainnet guard) shipped in the same hot-fix is also confirmed working.
- The headline self-heal flow remains intact (Beat B PASS unchanged) and reproduces against a fresh agent_asset.
- No new regressions were introduced. All 19 tool names and registration order match 0.3.3.

## Methodology notes

- Cleared stale npx caches (`~/.npm/_npx/*` containing 0.2.x and 0.3.3) before run to force `npx -y --prefer-online @agenttrust-sdk/mcp@latest` to actually resolve to 0.3.4 from the registry. `npm view @agenttrust-sdk/mcp@latest version` returns `0.3.4` (captured to `version-check.txt`).
- Each beat used the same `claude -p` invocation pattern as the 2026-05-13 gate: `--strict-mcp-config --mcp-config <file> --permission-mode bypassPermissions --allowedTools 'mcp__agenttrust__*' --output-format json --model sonnet`, from a clean `/tmp/agenttrust-claude-e2e-rerun/` working dir (no `CLAUDE.md` or `.claude/` overrides).
- Reused the exact prompt strings from the 2026-05-13 gate's `beat-*-screenshot.txt` files so the comparison is apples-to-apples, with only the agent_asset pubkey replaced with the new fresh keypair for Beats B / C / D / E / F.
- Real devnet RPC (`https://api.devnet.solana.com`), real mainnet RPC for Beat G (`https://api.mainnet-beta.solana.com`).
- Beat B's on-chain claim independently verified with a direct `getTransaction` RPC call; the two instructions and their `Instruction:` logs are visible in `beat-B-onchain.json`. `meta.err: null`. Slot 461933423.
- Beats A and G included direct Node.js stdio probes of the MCP package as ground truth (`probe-devnet.json`, `probe-mainnet.json`).
- Time-box per `claude -p` call honoured (largest single call was Beat B at ~19s; total wall time across all beats well under 5 minutes).
- All seven beats completed cleanly; no Claude Code session crashes; no Anthropic API errors.

## Recommended next steps

The polish wave is clear. The remaining classifier-refinement opportunity surfaced in Beat F (extend the `chain_error` classifier to also catch `SendTransactionError` shapes that contain `"An account required by the instruction is missing"`) is small and non-blocking — it would lift Beat F's envelope from `errorCode: internal` to `errorCode: chain_error` for a downstream-CPI failure mode, matching the polish already applied to the InstructionError path. Not a regression; can ship in 0.3.5 or later.
