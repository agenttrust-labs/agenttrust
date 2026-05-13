# Beat C — simulate_payment over cap

## Verdict: PARTIAL (known classifier polish item)

## Evidence

### Tool call

`agenttrust_simulate_payment` with:
- `payer_agent` = `6JC9ezpopdR7UCUoDoBF4QV5rTh5b7d1VmkrwJSuMrWB`
- `payee_agent` = `BTcgiDauqVHoGMiXujytE5wycfncDEmNnXJiUZ4s4oWL`
- `amount` = `"5000000000"` (5000 USDC, well over the 1000 USDC `per_tx_max`)
- `mint` = `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` (USDC)
- `policy_id` = `1`

### Structured error envelope (verbatim)

```json
{
  "errorCode": "internal",
  "message": "Tool handler threw an unexpected error.",
  "hint": "See `cause` for the original message and check the MCP server stderr for stack trace.",
  "cause": "simulation failed: {\"InstructionError\":[0,{\"Custom\":3012}]}"
}
```

## Analysis

All four envelope fields present and well-formed: `errorCode`, `message`, `hint`, `cause`. No plain-text failure leak. The structured envelope is the proof the surface contract holds.

`Custom 3012` is Anchor's `AccountNotInitialized` — the simulation hit a missing account (most likely the killswitch PDA or Quantu atom_stats for the fresh agent, which only had `init_policy` run, not `init_killswitch` or Quantu registration).

The mapping `Custom 3012 -> errorCode: "internal"` matches the brief's note: "If the envelope appears as errorCode: 'internal' (with the Custom 3012 in cause), that confirms the known classifier polish item (mapping InstructionError to chain_error)."

## Gate criteria check

- Structured envelope present (not a plain text dump) — YES
- All four fields populated — YES
- No unhandled crash — YES
- Tool returned within time budget — YES (~17s)

## Polish item flagged (not a regression)

`mcp/src/tools/utils/error.ts` (or equivalent) should add an `InstructionError`-shaped detector that maps to `errorCode: "chain_error"` with a friendlier `hint` (e.g., `"On-chain program returned AccountNotInitialized (Custom 3012). The required PDA likely was not seeded — see hint for which one."`). This is the polish work the brief expected.
