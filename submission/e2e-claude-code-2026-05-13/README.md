# GATE E2E verification — Claude Code against @agenttrust-sdk/mcp@0.3.3

Run date: 2026-05-13 (Asia/Kolkata; agent local time ~02:30).

## Final verdict: GATE FAIL

The MCP server boots, reports the expected version, exposes the expected nineteen tools, and the headline self-heal flow (init_policy on a fresh agent) lands a single atomic Solana devnet transaction carrying both InitAuthority and InitPolicy. Beats A and B PASS.

However, the run found three regression-class defects in @agenttrust-sdk/mcp@0.3.3 that block Claude Code from invoking three of the seven tested tools, plus one previously documented W1-A polish item that prevents the MCP from booting on mainnet by default.

Per the gate criteria the user supplied, schema validation failures that block tool invocation and a handler argument marshalling bug both count as REGRESSIONS rather than "known seeded-state limitations". The polish wave is therefore NOT clear to start.

## Per-beat verdict

| Beat | Tool | Verdict | One-sentence evidence |
|------|------|---------|-----------------------|
| A | tools/list + version | PASS | initialize response reports name=agenttrust version=0.3.3; tools/list returns nineteen tools including agenttrust_init_authority. |
| B | init_policy self-heal | PASS (HEADLINE) | selfHealed=true, healedSteps=["init_authority"], devnet tx 61Def...vgA carries both InitAuthority and InitPolicy instructions in one atomic transaction against policy_vault 8Y6f...QTR. |
| C | simulate_payment denied | PARTIAL | Structured error envelope is well-formed (errorCode, message, hint, cause all populated); cause contains the Custom 3012 InstructionError from Solana; the errorCode is "internal" instead of the expected "chain_error" — matches the known classifier polish item the brief flagged. |
| D | request_validation | FAIL | Anthropic API HTTP 400 at request time; agenttrust_request_validation.inputSchema.properties.deadline_slot uses JSON Schema draft-04 boolean form `exclusiveMinimum: true` which is invalid in draft 2020-12; the tool never reaches the MCP server. |
| E | respond_to_validation | FAIL | Same root cause as Beat D; expires_at_slot also uses `exclusiveMinimum: true`. |
| F | emit_feedback | FAIL | Tool handler unpacks the 32-byte payment_id_hash as 32 separate positional args, passing 40+ values into the Anchor emitFeedback IDL signature that expects 8; structured envelope is well-formed but every call to this tool fails with `"provided too many arguments 1,2,3,...,32,..."`. |
| G | get_quantu_reputation on mainnet | PARTIAL | MCP server refuses to boot with NETWORK=solana-mainnet because the W1-A program-ID guard hard-throws even for Quantu-only reads; supplying dummy AgentTrust program IDs as env-var workaround lets the server boot and the Quantu read path returns a healthy structured response. |

## Solana Explorer URL for the Beat B headline artifact

https://explorer.solana.com/tx/61DefBB1Vjgaqz2k4Zo4c47H6u373tPY9wMqs5CHCwRnVZLr8amxnkVjsdFkScpq7NxZTnA7YyHU8nKYdQRW2vgA?cluster=devnet

## Path to the artifact directory

/Users/mohit/superdev/frontier-dx-fixes/submission/e2e-claude-code-2026-05-13/

## Regression details and fix hints

### Regression 1 — request_validation and respond_to_validation schemas reject by Anthropic API (Beats D, E)

`@agenttrust-sdk/mcp@0.3.3` ships these two tool input schemas with the legacy JSON Schema draft-04 boolean form of `exclusiveMinimum`:

```json
{ "type": "integer", "exclusiveMinimum": true, "minimum": 0 }
```

In JSON Schema draft 2020-12 (which Anthropic's `/v1/messages` tool validator enforces), `exclusiveMinimum` must be a number. The Anthropic API rejects the entire tool array with HTTP 400 `tools.11.custom.input_schema: JSON schema is invalid`. Claude Code therefore cannot invoke either tool against the published package. Reproducible across retries with different tool allowlists.

Fix: in `mcp/src/tools/request_validation.ts` and `mcp/src/tools/respond_to_validation.ts`, replace the two affected sub-schemas with `{ "type": "integer", "exclusiveMinimum": 0 }` (drop the separate `minimum: 0` field, set the value of `exclusiveMinimum` to the numeric bound).

### Regression 2 — emit_feedback handler argument marshalling (Beat F)

The published emit_feedback handler invokes the Anchor program method with the 32-byte `payment_id_hash` spread as 32 individual u8 positional arguments, then appends the facilitator pubkey, payee pubkey, score, value, etc. The Anchor IDL marshaller errors:

```
provided too many arguments 1,2,3,...,32,4tSEHc..,BTcgi..,80,1000000,6,demo,...
to instruction emitFeedback expecting:
paymentIdHash, facilitator, payeeAsset, score, tag1, tag2, endpoint, feedbackUri
```

Fix: in the emit_feedback handler, pass `payment_id_hash` as a single `Buffer.from(hex, "hex")` value (or `Uint8Array.from(...)`) as the first positional argument to the Anchor `.methods.emitFeedback(...)` call. Confirm the Anchor IDL signature and remove any iterable spread on the byte array.

### Polish item 1 — InstructionError classifier (Beat C)

When a tool catches a Solana `InstructionError` shape from a simulation or send, it currently maps to `errorCode: "internal"`. Per the brief, `Custom <n>` from on-chain programs should map to `errorCode: "chain_error"` with a hint that names the Anchor error code class (e.g. `"On-chain program returned AccountNotInitialized (Custom 3012)"`). This is not a regression; the envelope is structurally correct.

### Polish item 2 — mainnet program-ID guard (Beat G)

`loadConfig` in the MCP throws fatal at startup whenever `NETWORK=solana-mainnet` without all three AgentTrust program IDs supplied. Quantu reads (`agenttrust_get_quantu_reputation`) do not depend on the AgentTrust programs, so this guard over-reaches and prevents read-only mainnet usage. The fix is to downgrade the guard to a warning at startup and have AT-touching tools fail at call time with a structured `errorCode: "config_error"` envelope.

## Methodology notes

- Used `claude -p --strict-mcp-config --mcp-config <file> --permission-mode bypassPermissions --allowedTools 'mcp__agenttrust__*' --output-format json --model sonnet` from `/tmp/agenttrust-claude-e2e/` (a clean directory with no `CLAUDE.md` or `.claude/` overrides, naturally isolating the session).
- Did NOT use `--bare`. The brief notes `--bare` requires explicit ANTHROPIC_API_KEY; the host is OAuth-authenticated via claude.ai (Max plan). The clean working directory plus `--strict-mcp-config` achieves the same isolation guarantee that `--bare` would for the purposes of this gate.
- Real devnet RPC (`https://api.devnet.solana.com`), real mainnet RPC for Beat G (`https://api.mainnet-beta.solana.com`), real `npx -y @agenttrust-sdk/mcp@latest` from npm registry (resolved to 0.3.3, the npm-latest tag at run time).
- Beat B's on-chain claim was independently verified with a direct `getTransaction` RPC call; the two instructions and their `Instruction:` logs are visible in `beat-B-onchain.json`.
- Beats A and G included a direct Node.js stdio probe of the MCP package as ground truth, independent of any Anthropic-side interpretation; those probes are saved as `beat-A-mcp-probe.json`, `beat-G-mainnet-boot-attempt.txt`, and `beat-G-mainnet-workaround.txt`.
- Time-box per `claude -p` call honoured (largest single call was ~24s; all completed in well under 90s).

## Recommended next steps before re-running the gate

1. Patch the two `exclusiveMinimum: true` schemas (Regression 1).
2. Patch the emit_feedback Anchor invocation to pass payment_id_hash as a single Buffer (Regression 2).
3. Publish a 0.3.4 release of `@agenttrust-sdk/mcp` and re-run this gate.
4. Address the two polish items (Beat C classifier and Beat G mainnet guard) before the demo recording.
