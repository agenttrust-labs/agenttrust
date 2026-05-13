# Beat D — request_validation (rerun against 0.3.4)

## Verdict: PASS (regression closed)

## Comparison

Previous gate (0.3.3): FAIL — Anthropic API rejected the entire tool list with HTTP 400 `tools.11.custom.input_schema: JSON schema is invalid` because `deadline_slot` used draft-04 boolean `exclusiveMinimum: true`. The tool never ran.
Rerun (0.3.4): PASS — schema is draft 2020-12-compliant, tool runs, returns a structured `chain_error` envelope.

## Evidence

### Schema check (before the call)

Direct stdio probe of `agenttrust_request_validation.inputSchema.properties.deadline_slot`:

```json
{
  "anyOf": [
    { "type": "integer", "minimum": 1 },
    { "type": "string", "pattern": "^\\d+$" }
  ],
  "description": "Slot by which an attestor must respond. Must be greater than the current Solana slot..."
}
```

`{ minimum: 1 }` is the draft 2020-12-compliant form. Boolean `exclusiveMinimum: true` is gone.

### Tool call

`agenttrust_request_validation` with:
- `subject_asset` = `EkJuNUCVPvqHqoiTcDfRS1JGV7ckEhRehgmEEffLWEVZ`
- `capability_name` = `"pay-sh-demo.tier3"`
- `claim_uri_hash_hex` = `"0000000000000000000000000000000000000000000000000000000000000000"`
- `deadline_slot` = `461933335`

### Structured error envelope (verbatim)

```json
{
  "errorCode": "chain_error",
  "message": "On-chain transaction failed.",
  "hint": "Inspect the transaction logs on the explorer; the failing constraint or custom error code is included in the explorer.",
  "cause": "Simulation failed. \nMessage: Transaction simulation failed: Error processing Instruction 0: custom program error: 0xbc4. \nLogs: \n[\n  \"Program Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv invoke [1]\",\n  \"Program log: Instruction: RequestValidation\",\n  \"Program log: AnchorError caused by account: capability_namespace. Error Code: AccountNotInitialized. Error Number: 3012. Error Message: The program expected this account to be already initialized.\",\n  \"Program Cx4RFa6ysw3qXYhugPkF8p... [truncated]\""
}
```

## Analysis — what changed

| Phase | 0.3.3 (previous gate) | 0.3.4 (rerun) |
|---|---|---|
| Anthropic API tool-list validation | **HTTP 400 reject** | **accepted** |
| Tool handler executed? | NO | YES |
| Reached MCP server? | NO | YES |
| Reached on-chain simulation? | NO | YES |
| Structured envelope returned? | NO (API-level reject) | **YES** |

The Beat D regression was upstream of the tool handler — Claude Code couldn't even invoke the tool because Anthropic's `/v1/messages` draft 2020-12 validator rejected the tool array. Hot-fix item 1 (replace `{exclusiveMinimum: true, minimum: 0}` with `{minimum: 1}`) closes that.

On the on-chain side, the simulation fails with Anchor `AccountNotInitialized` (3012) on the `capability_namespace` account. This is exactly the expected seeded-state limitation the brief flagged: `pay-sh-demo.tier3` capability has not been registered on validation_registry on this devnet build. The envelope captures this cleanly.

## Gate criteria check

- Tool callable (no Anthropic API 400) — **YES** (regression closed)
- Structured envelope present — YES
- All four envelope fields populated — YES
- On-chain failure captured as structured `chain_error` envelope — YES

## Notes

The brief's PASS bar for Beat D was "tool callable; chain-side response captured" — both achieved. The downstream chain error (`capability_namespace` not initialized) is a seeded-state gap on the validation_registry side, expected.
