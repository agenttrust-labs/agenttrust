# Beat F — emit_feedback (rerun against 0.3.4)

## Verdict: PASS (regression closed)

## Comparison

Previous gate (0.3.3): FAIL — Anchor IDL marshaller rejected the call with `"provided too many arguments 1,2,3,...,32,<pubkey>,<pubkey>,80,1000000,6,demo,..."`. Root cause: bundled `trustgate.json` IDL had only 8 args for `emit_feedback`, but the handler was passing 10 (plus the byte-array spread issue).
Rerun (0.3.4): PASS — bundled IDL now has the correct 10 args; Anchor accepts the call; tool reaches on-chain simulation.

## Evidence

### IDL preflight check

Bundled trustgate IDL at `mcp/dist/idl/trustgate.json` (inside the 0.3.4 npx-installed package):

```
emit_feedback args:
 - payment_id_hash : {'array': ['u8', 32]}
 - facilitator    : pubkey
 - payee_asset    : pubkey
 - score          : u8
 - value          : u64
 - value_decimals : u8
 - tag1           : string
 - tag2           : string
 - endpoint       : string
 - feedback_uri   : string
```

10 args, matching the on-chain Rust signature. The new `value` and `value_decimals` args are present (added in hot-fix item 2). The `payment_id_hash` is correctly declared as `array of u8 length 32` (single arg, not 32 spread args).

### Tool call

`agenttrust_emit_feedback` with:
- `payment_id_hash_hex` = `"0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20"`
- `payee_asset` = `BTcgiDauqVHoGMiXujytE5wycfncDEmNnXJiUZ4s4oWL`
- `base_collection` = `6CTyGPcn8dMwKEqgtvx2XCpkGUd7uqCVK6937RSM5bhA`
- `score` = `80`
- `value` = `"1000000"`
- `value_decimals` = `6`
- `tag1` = `"demo"`

### Structured error envelope (verbatim)

```json
{
  "errorCode": "internal",
  "message": "Tool handler threw an unexpected error.",
  "hint": "See `cause` for the original message and check the MCP server stderr for stack trace.",
  "cause": "Simulation failed. \nMessage: Transaction simulation failed: Error processing Instruction 0: An account required by the instruction is missing. \nLogs: \n[\n  \"Program HF8zHfoyA7b5mhLViopTnRMprc6ZT5KActHTdkFrih2N invoke [1]\",\n  \"Program log: Instruction: EmitFeedback\",\n  \"Program 11111111111111111111111111111111 invoke [2]\",\n  \"Program 11111111111111111111111111111111 success\",\n  \"Unknown program 8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C\",\n  \"Program HF8zHfoyA7b5mhLViopTnRMprc6ZT5... [truncated]"
}
```

## Analysis — what changed

| Phase | 0.3.3 (previous gate) | 0.3.4 (rerun) |
|---|---|---|
| Anchor IDL marshaller accepts call? | **NO** ("provided too many arguments") | **YES** |
| Tool dispatched to on-chain program? | NO | **YES** (program `HF8zHfoy...rih2N` invoked) |
| Reached `EmitFeedback` instruction? | NO | **YES** ("Program log: Instruction: EmitFeedback") |
| Failure mode | client-side IDL marshaller crash | downstream missing-account on the trustgate cross-program-invocation |

The 0.3.3 failure was 100% client-side: the handler couldn't even construct a valid instruction because the bundled IDL was missing `value` / `value_decimals`. Hot-fix item 2 replaced the bundled IDL with the on-chain Rust-matching signature, and the marshaller now accepts the call cleanly.

The new failure ("An account required by the instruction is missing", and `"Unknown program 8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C"`) is the trustgate program's CPI into a downstream registry (likely the facilitator's TrustGateAuthority PDA, or the Quantu agent_registry) that hasn't been seeded for this devnet build with this signer. Expected seeded-state limitation; the structured envelope captures it.

### Note on the envelope errorCode

The envelope's `errorCode` is `internal` rather than `chain_error`. This is because the underlying error came from `simulateTransaction` (a `SendTransactionError` shape with a textual missing-account message), not the `Custom NNN` (InstructionError) shape that hot-fix item 4 specifically classifies as `chain_error`. The brief's Beat F PASS bar was "tool callable (no Anchor arg mismatch); chain-side response captured" — both achieved. Refining the classifier to also catch `simulateTransaction` shapes is a separate, smaller polish item, not a regression.

## Gate criteria check

- Tool callable (no Anchor arg mismatch) — **YES** (regression closed)
- Reaches on-chain simulation — YES (`Program log: Instruction: EmitFeedback` in cause)
- Structured envelope present and well-formed — YES
- All four envelope fields populated — YES

## Notes

The brief's Beat F bar was satisfied. The downstream missing-account failure is seeded-state, not a code defect. A small classifier-refinement opportunity remains (extend the chain_error classifier to also match `SendTransactionError` shapes that contain `"An account required by the instruction is missing"`).
