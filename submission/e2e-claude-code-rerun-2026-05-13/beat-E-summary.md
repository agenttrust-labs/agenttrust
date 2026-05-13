# Beat E — respond_to_validation (rerun against 0.3.4)

## Verdict: PASS (regression closed)

## Comparison

Previous gate (0.3.3): FAIL — same root cause as Beat D. `expires_at_slot` used draft-04 `exclusiveMinimum: true`, Anthropic API rejected the tool array with HTTP 400.
Rerun (0.3.4): PASS — schema is draft 2020-12-compliant, tool runs, returns a structured `chain_error` envelope.

## Evidence

### Schema check (before the call)

Direct stdio probe of `agenttrust_respond_to_validation.inputSchema.properties.expires_at_slot`:

```json
{
  "anyOf": [
    { "type": "integer", "minimum": 1 },
    { "type": "string", "pattern": "^\\d+$" }
  ],
  "description": "Attestation expiry slot (0 = never)"
}
```

Draft 2020-12 compliant. The draft-04 boolean form is gone.

### Tool call

`agenttrust_respond_to_validation` with:
- `subject_asset` = `EkJuNUCVPvqHqoiTcDfRS1JGV7ckEhRehgmEEffLWEVZ`
- `capability_name` = `"pay-sh-demo.tier3"`
- `claim_payload_hash_hex` = `"0000...0000"`
- `claim_uri_hash_hex` = `"0000...0000"`
- `expires_at_slot` = `461999999`

### Structured error envelope (verbatim)

```json
{
  "errorCode": "chain_error",
  "message": "On-chain transaction failed.",
  "hint": "Inspect the transaction logs on the explorer; the failing constraint or custom error code is included in the cause.",
  "cause": "Simulation failed.\nMessage: Transaction simulation failed: Error processing Instruction 0: custom program error: 0xbc4.\nLogs:\n[\n  \"Program Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv invoke [1]\",\n  \"Program log: Instruction: RespondToValidation\",\n  \"Program log: AnchorError caused by account: capability_namespace. Error Code: AccountNotInitialized. Error Number: 3012. Error Message: The program expected this account to be already initialized.\",\n  \"Program Cx4RFa6ysw3qXYhugPkF... [truncated]\""
}
```

## Analysis

Same as Beat D — the upstream regression is fixed. The on-chain side hits `AccountNotInitialized` on `capability_namespace` because the validation_registry has not been seeded with the demo capabilities on this devnet build. Expected seeded-state limitation; the envelope captures it cleanly.

## Gate criteria check

- Tool callable (no Anthropic API 400) — **YES** (regression closed)
- Structured envelope present — YES
- All four envelope fields populated — YES
- On-chain failure captured as structured `chain_error` envelope — YES

## Notes

Beats D and E share the same fix and have the same shape of post-fix behaviour. Both regression-class items in hot-fix item 1 are closed.
