# GATE E2E artifact index — 2026-05-13

## Top-level reports

- `README.md` — narrative summary, per-beat verdict, final gate decision.
- `INDEX.md` — this file.
- `state.json` — agent_asset, policy_pda, tx signatures threaded across beats.

## Configs (verbatim, as used)

- `mcp-config.json` — devnet config used for Beats A through F.
- `mcp-config-mainnet.json` — mainnet config used for Beat G (default attempt).
- `mcp-config-mainnet-with-ids.json` — mainnet config WITH dummy AT program IDs, used to demonstrate that the Quantu read path is otherwise healthy.

## Beat A — sanity install + version

- `beat-A-claude-output.json` — raw `claude -p --output-format json` result.
- `beat-A-mcp-probe.json` — direct stdio `initialize` + `tools/list` ground-truth probe.
- `beat-A-summary.md` — verdict + evidence.
- `beat-A-screenshot.txt` — terminal-style rendering.

## Beat B — init_policy with self-heal (HEADLINE)

- `beat-B-claude-output.json` — raw `claude -p --output-format json` result containing the verbatim structuredContent envelope with `selfHealed: true, healedSteps: ["init_authority"]`.
- `beat-B-onchain.json` — `getTransaction` RPC dump for tx `61DefBB1Vjgaqz2k4Zo4c47H6u373tPY9wMqs5CHCwRnVZLr8amxnkVjsdFkScpq7NxZTnA7YyHU8nKYdQRW2vgA`. Two instructions, both calling policy_vault `8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR`, logs `InitAuthority` then `InitPolicy`.
- `beat-B-summary.md` — verdict (PASS, headline) + evidence.
- `beat-B-screenshot.txt` — terminal-style rendering.

## Beat C — simulate_payment (denied path, classifier polish item)

- `beat-C-claude-output.json` — raw output. Returned a well-formed structured error envelope; `errorCode: "internal"` with `Custom 3012` (AccountNotInitialized) in the cause field.
- `beat-C-summary.md` — verdict (PARTIAL, known polish item: classifier should map InstructionError to chain_error).
- `beat-C-screenshot.txt` — terminal-style rendering.

## Beat D — request_validation (FAIL, schema regression)

- `beat-D-claude-output.json` — Anthropic API 400 (`tools.11.custom.input_schema: JSON schema is invalid`). The tool never ran.
- `beat-D-summary.md` — verdict (FAIL, regression-class) + root-cause inspection.
- `beat-D-screenshot.txt` — terminal-style rendering with offending schema snippet.

## Beat E — respond_to_validation (FAIL, same schema regression)

- `beat-E-claude-output.json` — same API 400 mode.
- `beat-E-summary.md` — verdict (FAIL, regression-class).
- `beat-E-screenshot.txt` — terminal-style rendering.

## Beat F — emit_feedback (FAIL, handler argument marshalling bug)

- `beat-F-claude-output.json` — well-formed structured envelope. `cause` exposes `provided too many arguments 1,2,3,...,32,<pubkey>,<pubkey>,80,1000000,6,demo,...` — the tool handler is spreading the payment_id_hash byte array as positional args.
- `beat-F-summary.md` — verdict (FAIL, regression-class).
- `beat-F-screenshot.txt` — terminal-style rendering.

## Beat G — Quantu mainnet read (PARTIAL, known W1-A polish item)

- `beat-G-claude-output.json` — Claude session output when mainnet config bootstraps (server fails to boot, so no tool surfaces).
- `beat-G-mainnet-boot-attempt.txt` — direct stdio probe of `npx -y @agenttrust-sdk/mcp@latest` with `NETWORK=solana-mainnet`. Shows the `loadConfig` hard-throw.
- `beat-G-mainnet-workaround.txt` — direct stdio probe with dummy AT program-ID env vars supplied. Server boots and `agenttrust_get_quantu_reputation` returns a structured response (`exists: false` because the test agent pubkey was an atom_stats PDA, not a true agent_asset, but the path is structurally healthy).
- `beat-G-summary.md` — verdict (PARTIAL, known W1-A polish item: guard should not apply to Quantu-only reads).
- `beat-G-screenshot.txt` — terminal-style rendering.
