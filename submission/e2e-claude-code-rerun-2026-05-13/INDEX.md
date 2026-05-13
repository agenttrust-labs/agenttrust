# GATE E2E re-run artifact index — 2026-05-13 (`@agenttrust-sdk/mcp@0.3.4`)

Re-run of `submission/e2e-claude-code-2026-05-13/`. Every artifact here corresponds 1:1 with one in the previous gate's directory (except `mcp-config-mainnet-with-ids.json`, which is no longer needed because the mainnet boot guard was fixed).

## Top-level reports

- `README.md` — narrative summary, per-beat verdict with comparison column, final gate decision.
- `INDEX.md` — this file.
- `state.json` — agent_asset, policy_pda, tx signatures threaded across beats. Includes `hotfix_items_status` mapping each hot-fix to its closing beat.
- `version-check.txt` — `npm view @agenttrust-sdk/mcp@latest version dependencies` output, captured at the start of the run. Confirms registry serves `0.3.4` as `latest`.

## Configs (verbatim, as used)

- `mcp-config.json` — devnet config used for Beats A through F. Identical to previous gate's `mcp-config.json`.
- `mcp-config-mainnet.json` — mainnet config used for Beat G. Identical to previous gate's `mcp-config-mainnet.json` (no AT program ID workarounds — that file from the previous gate is no longer needed because the mainnet boot guard was fixed).

## Direct stdio probes (ground truth)

- `probe-devnet.json` — `initialize` + `tools/list` against `npx -y --prefer-online @agenttrust-sdk/mcp@latest` with devnet env. Confirms 0.3.4, 19 tools, and that the hot-fixed schemas (`deadline_slot`, `expires_at_slot`) are draft 2020-12-compliant. Used as Beat A ground truth and Beat D / E preflight.
- `probe-mainnet.json` — same probe with mainnet env. Confirms server boots successfully with only a stderr warn (no throw). Used as Beat G ground truth.

## Beat A — sanity install + version

- `beat-A-claude-output.json` — raw `claude -p --output-format json` result.
- `beat-A-summary.md` — verdict (PASS) + evidence + schema preflight (hot-fix item 1).
- `beat-A-screenshot.txt` — terminal-style rendering.

## Beat B — init_policy with self-heal (HEADLINE)

- `beat-B-claude-output.json` — raw `claude -p --output-format json` result containing the verbatim structuredContent envelope with `selfHealed: true, healedSteps: ["init_authority"]` against the NEW fresh agent `EkJuNUCVPvqHqoiTcDfRS1JGV7ckEhRehgmEEffLWEVZ`.
- `beat-B-onchain.json` — `getTransaction` RPC dump for the new tx `5PmVzZVjYLkcKTFw3MAeHey4EqULYRNkVh2ePECgp6gjWHgY8mvU8eV7NBmTQWXiqEdMKmEbhy87LcHUJkM3pxYE`. Two instructions, both calling policy_vault `8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR`, logs `InitAuthority` then `InitPolicy`. Slot 461933423.
- `beat-B-summary.md` — verdict (PASS, headline) + evidence.
- `beat-B-screenshot.txt` — terminal-style rendering.

## Beat C — simulate_payment (denied path, classifier polish closed)

- `beat-C-claude-output.json` — raw output. Returned a well-formed structured error envelope; `errorCode: "chain_error"` (was `"internal"` in 0.3.3); hint explicitly names `Custom 3012 (AccountNotInitialized)`.
- `beat-C-summary.md` — verdict (PASS, hot-fix item 4 closed).
- `beat-C-screenshot.txt` — terminal-style rendering.

## Beat D — request_validation (regression closed)

- `beat-D-claude-output.json` — tool now runs; returns structured `chain_error` envelope (was Anthropic API HTTP 400 in 0.3.3).
- `beat-D-summary.md` — verdict (PASS, hot-fix item 1 closed) + root-cause inspection.
- `beat-D-screenshot.txt` — terminal-style rendering.

## Beat E — respond_to_validation (same regression closed)

- `beat-E-claude-output.json` — tool now runs; structured `chain_error` envelope.
- `beat-E-summary.md` — verdict (PASS, hot-fix item 1 closed).
- `beat-E-screenshot.txt` — terminal-style rendering.

## Beat F — emit_feedback (regression closed)

- `beat-F-claude-output.json` — well-formed structured envelope. Cause shows the tool reached on-chain (`Program log: Instruction: EmitFeedback`), then hit a downstream CPI missing-account on a sibling registry (seeded-state limitation). No more Anchor "provided too many arguments".
- `beat-F-summary.md` — verdict (PASS, hot-fix item 2 closed) + IDL preflight.
- `beat-F-screenshot.txt` — terminal-style rendering.

## Beat G — Quantu mainnet read + AT-touching config_error

- `beat-G-claude-output.json` — Claude session output showing `agenttrust_get_quantu_reputation` working on mainnet without env-var workaround. Server boots cleanly.
- `beat-G-at-touching-claude-output.json` — Claude session output showing `agenttrust_get_policy` on mainnet returning a structured `config_error` envelope (new error code class). Hint is actionable.
- `beat-G-summary.md` — verdict (PASS, hot-fix item 3 closed).
- `beat-G-screenshot.txt` — terminal-style rendering.

## What's NOT in this rerun (compared to the previous gate)

- `mcp-config-mainnet-with-ids.json` — the dummy-AT-program-IDs workaround is no longer needed; default mainnet config boots successfully against 0.3.4.
- `beat-G-mainnet-boot-attempt.txt` — superseded by `probe-mainnet.json` which shows the warn-not-throw behaviour.
- `beat-G-mainnet-workaround.txt` — superseded by `beat-G-claude-output.json` which uses the same flow without any workaround.
- `beat-A-mcp-probe.json` — folded into `probe-devnet.json` (same role, fresher capture).
