# Beat F — emit_feedback

## Verdict: FAIL (regression-class: argument marshalling bug in tool handler)

## Evidence

### Tool call

`agenttrust_emit_feedback` with:
- `payment_id_hash_hex` = `"0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20"`
- `payee_asset` = `BTcgiDauqVHoGMiXujytE5wycfncDEmNnXJiUZ4s4oWL`
- `base_collection` = `6CTyGPcn8dMwKEqgtvx2XCpkGUd7uqCVK6937RSM5bhA` (from `agenttrust_demo_state`)
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
  "cause": "provided too many arguments 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,4tSEHc2vCLqnYd8nK9jRa44vnn8JnPxUgxheEmhWQhRG,BTcgiDauqVHoGMiXujytE5wycfncDEmNnXJiUZ4s4oWL,80,1000000,6,demo,,,,[object Object] to instruction emitFeedback expecting: paymentIdHash,facilitator,payeeAsset,score,tag1,tag2,endpoint,feedbackUri"
}
```

## Analysis

The envelope itself is well-formed (all four contract fields populated). However, the `cause` reveals a **code defect in the 0.3.3 tool handler**:

- The Anchor `emitFeedback` instruction expects **8 positional args**: `paymentIdHash, facilitator, payeeAsset, score, tag1, tag2, endpoint, feedbackUri`.
- The tool handler is passing the 32 bytes of `paymentIdHash` as **32 separate positional arguments** (the leading `1,2,3,...,32` in the cause string is the unpacked byte sequence), followed by the facilitator pubkey, payee pubkey, score, etc. — totalling 40+ args.
- The Anchor IDL marshaller refuses the call: `"provided too many arguments ... to instruction emitFeedback"`.

This is independent of any on-chain state. Every call to `agenttrust_emit_feedback` on published 0.3.3 will fail with this exact message.

The bug is most likely in the tool handler's invocation of the Anchor client: it is treating the 32-byte payment_id_hash byte array as a spread of u8 args instead of passing it as a single `Buffer` / `Uint8Array` first positional argument.

## Gate criteria check

- Structured envelope present and well-formed — YES (this part works)
- Tool function executes correctly — NO
- This is documented as a "known limitation" — NO; the brief's known limitations are state seeding, not handler bugs

## Fix hint

In `mcp/src/tools/emit_feedback.ts` (or equivalent), wherever the handler calls the Anchor program method, ensure `paymentIdHash` is passed as a single `Buffer.from(hex, 'hex')` first positional argument, not as `...Buffer.from(...).values()` or a JS array. Verify the Anchor IDL signature matches the call.
