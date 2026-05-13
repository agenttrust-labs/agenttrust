# Beat C — simulate_payment over cap (rerun against 0.3.4)

## Verdict: PASS (classifier polish item closed)

## Comparison

Previous gate (0.3.3): PARTIAL — structured envelope present, but `errorCode: "internal"` (classifier didn't map InstructionError to chain_error).
Rerun (0.3.4): PASS — same well-formed envelope, but `errorCode: "chain_error"` AND the hint explicitly names "Custom 3012 (AccountNotInitialized)".

## Evidence

### Tool call

`agenttrust_simulate_payment` with:
- `payer_agent` = `EkJuNUCVPvqHqoiTcDfRS1JGV7ckEhRehgmEEffLWEVZ` (the new fresh agent from Beat B)
- `payee_agent` = `BTcgiDauqVHoGMiXujytE5wycfncDEmNnXJiUZ4s4oWL`
- `amount` = `"5000000000"` (5000 USDC, well over the 1000 USDC `per_tx_max`)
- `mint` = `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` (USDC)
- `policy_id` = `1`

### Structured error envelope (verbatim)

```json
{
  "errorCode": "chain_error",
  "message": "On-chain transaction failed.",
  "hint": "On-chain program returned Custom 3012 (AccountNotInitialized). Inspect the transaction logs on the explorer; the failing constraint or seed mismatch is named in the program's error.rs.",
  "cause": "simulation failed: {\"InstructionError\":[0,{\"Custom\":3012}]}"
}
```

## Analysis — what changed

| Field | 0.3.3 (previous gate) | 0.3.4 (rerun) |
|---|---|---|
| `errorCode` | `internal` | **`chain_error`** |
| `message` | `Tool handler threw an unexpected error.` | `On-chain transaction failed.` |
| `hint` | generic "see cause" | **explicitly names `Custom 3012 (AccountNotInitialized)`** with explorer guidance |
| `cause` | `simulation failed: {"InstructionError":[0,{"Custom":3012}]}` | same |

The classifier change is exactly what hot-fix item 4 specified: Anchor `Custom NNN` (InstructionError) now maps to `chain_error` with a hint that names the Anchor error code class. Caller-facing UX is materially better: a Claude agent reading the hint can now reason about why the simulation failed without parsing the JSON-in-string `cause`.

The underlying simulation behaviour is the same: the fresh agent_asset only had `init_policy` run, not `init_killswitch` / Quantu registration, so the simulation hits a missing PDA and returns `Custom 3012` (AccountNotInitialized) on instruction 0. This is the seeded-state limitation the original brief flagged, not a tool defect.

## Gate criteria check

- Structured envelope present (not a plain text dump) — YES
- All four contract fields populated — YES (`errorCode`, `message`, `hint`, `cause`)
- `errorCode` is `chain_error` (not `internal`) — **YES** (regression class closed)
- Hint names the Anchor code class — **YES** ("Custom 3012 (AccountNotInitialized)")
- No unhandled crash — YES
- Tool returned within time budget — YES (~12s)

## Notes

This was a polish item in the previous gate, not a hard regression — but the hot-fix nonetheless lifted it from PARTIAL to PASS. The structured envelope from 0.3.3 was already well-formed; 0.3.4 just classifies it correctly.
