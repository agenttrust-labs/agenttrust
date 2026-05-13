# AgentTrust 0.4.0 Gate E2E — run-3 (against @agenttrust-sdk/mcp@0.4.1)

**Date:** 2026-05-13
**Verdict:** DO NOT SHIP
**Status of the on-chain init_if_needed fix:** confirmed effective (the run-2 writable-escalation error is gone).
**Status of the full self-bootstrap flow:** still broken by a separate, second client-side bug.

## TL;DR

The 0.4.1 IDL refresh (authority.writable: true) and the on-chain init_if_needed
upgrade on TrustGateAuthority both work as intended: run-2 failed inside the
self-heal init_authority CPI with "writable privilege escalated"; run-3 no longer
hits that error.

But run-3 now exposes a **distinct, separate bug** one layer deeper in the same
`register_agent_via_cpi` instruction: the off-chain SDK helper
`buildRegisterAgentViaCpiIx` never adds the Quantu `agent_registry_8004` program
account (`8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C`) to the instruction's
account-keys list. The on-chain handler then invokes
`agent_registry_8004::register_with_options` via `invoke_signed`, the Solana
runtime tries to resolve the program key, fails because it is not in the outer
instruction's account list, and aborts the tx with `MissingAccount`.

This is reproducible with the SDK's own builder (see `rebuild-and-simulate.js`
and `error-full-logs.txt`).

## Verbatim required fields

1. **txSignature of init_policy bootstrap call:** `null` — tx never landed.
   Simulation rejected during `register_agent_via_cpi` step. Nothing broadcast.
2. **healedSteps array contents:** `null` — `selfHealed` and `healedSteps` were
   never populated; the MCP server returned a `chain_error` envelope before any
   self-heal bookkeeping could run.
3. **PDA presence post-call (yes/no, every PDA absent):**
   - trustgate_authority (`7Zgw7mfL7NjzZd4iNgVn7Eydi4FX5uAJLzCyZc43cJmn`) — **NO**
   - policy_authority   (`53Jf1erFxnbUM4UH3vqL9azAh5acFh5gh1ht1yLhCm5v`) — **NO**
   - agent_account      (`EQuMn7Gm8YaqN7TKLXjV2ckaiN5g7ABUqeJj43qDN4gD`) — **NO**
   - atom_stats         (`4TW3upJrNvF6T8R7J5n7ryRF3owbA7kizFZFJs6MxaJb`) — **NO**
   - policy_account[1]  (`crkY53auKWAUt5TVPqpaM6cJUQvPZpaw6RDtGw5Shtn`) — **NO**
4. **Idempotency selfHealed:** `null` (same error envelope; selfHealed bookkeeping
   not reached). The idempotency call also failed with the identical
   `MissingAccount` cause — internally consistent, but not a passing idempotency
   signal since neither call succeeded.
5. **Simulate-payment kind / reasonName:** `null / null`. The call short-circuited
   in the MCP server with `errorCode: "counterparty_not_registered"`
   (`missing_account_kind: "quantu_agent_account"`) because the caller wallet
   has no Quantu agent profile — a direct consequence of the failed init_policy.
6. **Verdict: DO NOT SHIP**

## Forensic root cause

### What changed between run-2 and run-3

The only diff between `@agenttrust-sdk/mcp@0.4.0` and `@agenttrust-sdk/mcp@0.4.1`
is the bundled `dist/idl/trustgate.json`: the `authority` account on
`register_agent_via_cpi` gained `"writable": true` plus updated docs about the
`init_if_needed` upgrade.

- `dist/tools/write/init-policy.js` — identical between 0.4.0 and 0.4.1
- `@agenttrust-sdk/trustgate/dist/register-agent.js` — identical
- `@agenttrust-sdk/trustgate/dist/quantu.js` — identical

### Run-2 vs run-3 chain-side error

| Run | Outer error | Inner-most log line |
|-----|------------|---------------------|
| run-2 (mcp 0.4.0) | "Cross-program invocation with unauthorized signer or writable account" | `7Zgw7mfL...'s writable privilege escalated` |
| run-3 (mcp 0.4.1) | "An account required by the instruction is missing" | `Unknown program 8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C` |

The first is fixed; the second is new (or rather: was previously masked by the
first failing earlier in the same handler).

### The actual bug — proven

Direct reconstruction of the tx the SDK builds (`rebuild-and-simulate.js`)
shows the outer `register_agent_via_cpi` instruction sends exactly **12 keys**:

```
[ 0] payer        GCoJB3pVSeSwrky3FkHQcXxEj61XyeBWxpFWYtXTFp5o  w=1 s=1
[ 1] asset        GCoJB3pVSeSwrky3FkHQcXxEj61XyeBWxpFWYtXTFp5o  w=1 s=1
[ 2] authority    7Zgw7mfL7NjzZd4iNgVn7Eydi4FX5uAJLzCyZc43cJmn  w=1 s=0   <- init_if_needed fix landed
[ 3] system_prog  11111111111111111111111111111111             w=0 s=0
[ 4] rootConfig   GGQfKNpXq8HchNxecLfXi8D7xz9PDppdPAPgr5Fx4Nvd  w=0 s=0
[ 5] regConfig    Djy4TKPvFyEumcVTDCqJUHWErKqcaeRj4ULWwaPkedor  w=0 s=0
[ 6] agentAccount EQuMn7Gm8YaqN7TKLXjV2ckaiN5g7ABUqeJj43qDN4gD  w=1 s=0
[ 7] baseCollect  6CTyGPcn8dMwKEqgtvx2XCpkGUd7uqCVK6937RSM5bhA  w=1 s=0
[ 8] mplCore      CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d  w=0 s=0
[ 9] atomConfig   4XeDhpmZ5GbfSbqgTcD3t6FKRXpMg8jixbqWDbthDSrk  w=0 s=0
[10] atomStats    4TW3upJrNvF6T8R7J5n7ryRF3owbA7kizFZFJs6MxaJb  w=1 s=0
[11] atomEngine   AToMufS4QD6hEXvcvBDg9m1AHeCLpmZQsyfYa5h9MwAF  w=0 s=0
```

Notice: `atomEngine` program account is present (key 11), but the Quantu
**agent_registry_8004** program account (`8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C`) is **NOT in the list**.

Full untruncated simulateTransaction logs (also in `error-full-logs.txt`):

```
Program HF8zHfoyA7b5mhLViopTnRMprc6ZT5KActHTdkFrih2N invoke [1]
Program log: Instruction: RegisterAgentViaCpi
Program 11111111111111111111111111111111 invoke [2]
Program 11111111111111111111111111111111 success
Unknown program 8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C
Program HF8zHfoyA7b5mhLViopTnRMprc6ZT5KActHTdkFrih2N consumed 14796 of 599850 CU
Program HF8zHfoyA7b5mhLViopTnRMprc6ZT5KActHTdkFrih2N failed: An account required by the instruction is missing
err.InstructionError = [1, "MissingAccount"]
```

The `init_if_needed` self-heal on `TrustGateAuthority` (the system_program::CreateAccount CPI at depth 2) completed successfully — `Program 11111111111111111111111111111111 success`. Run-2's failure mode is gone.

What fails next is the very next CPI: into `agent_registry_8004::register_with_options`. The Solana runtime can't resolve `8oo4J9tBB...` because that program account is absent from the outer ix's account-keys list, so it returns `MissingAccount` and the entire handler aborts.

### Where the off-chain bug lives

`@agenttrust-sdk/trustgate/dist/register-agent.js`,
`buildRegisterAgentViaCpiIx`, `.remainingAccounts([...])` — the array has 8
entries and only `atomEngineProgram` is a program key. The Quantu
`agentRegistryProgram` is not added. This is mirrored in
`@agenttrust-sdk/trustgate/dist/quantu.js`'s `deriveQuantuRegisterAccounts`,
which builds the dictionary the helper iterates — `agentRegistryProgram` is
not a returned field.

### Why this passed unit tests / didn't show in run-2

Run-2 failed earlier inside the same handler (writable-escalation on the
init_if_needed TrustGateAuthority allocation), so the runtime never reached
the second CPI. Now that 0.4.1 + the redeployed program clear that first
hurdle, the second CPI runs and immediately exposes this missing program
account.

## Fix required before SHIP

In `@agenttrust-sdk/trustgate/src/register-agent.ts` (and the matching
`quantu.ts`), append the Quantu agent_registry program to
`remainingAccounts`:

```ts
.remainingAccounts([
  // ... existing 8 entries ...
  { pubkey: remaining.agentRegistryProgram, isWritable: false, isSigner: false },
])
```

and update `deriveQuantuRegisterAccounts` to surface
`agentRegistryProgram: args.programs.agentRegistry`. Then publish 0.4.2,
re-run this gate.

Both the IDL (the named accounts list) and the on-chain `register_agent_via_cpi.rs`
account ordering should be checked at the same time — if the on-chain handler
expects this program key at a fixed slot (rather than walking
`ctx.remaining_accounts`), the IDL and the helper must agree on ordering.

## Artifacts (all under run-3/)

- `gate.js` — driver (0.4.1 pinned)
- `gate-driver.log` — console transcript
- `mcp-stderr.log` — MCP child stderr
- `jsonrpc-requests.jsonl` / `jsonrpc-responses.jsonl` — wire trace
- `tools-list.json` — 21 tools
- `init-policy-raw.json` — call result (chain_error)
- `init-policy-raw-2.json` — idempotency call result (chain_error)
- `gate-results.json`, `gate-results-idempotency.json` — parsed envelopes
- `demo-state.json`, `demo-state-raw.json` — devnet demo registry
- `simulate-payment.json`, `simulate-payment-raw.json` — counterparty_not_registered envelope
- `rebuild-and-simulate.js` — direct tx reconstruction proving the missing account
- `error-full-logs.txt` — full untruncated simulateTransaction output
- `pdas.json` — all derived PDAs + on-chain presence check (all NOT_FOUND)
- `test-wallet.{b58,json,pubkey.txt}` — reused test wallet from run-2 (0.5 SOL on devnet)

## Wallet state

- Pubkey: `GCoJB3pVSeSwrky3FkHQcXxEj61XyeBWxpFWYtXTFp5o`
- Balance: 0.5 SOL (unchanged from pre-run; no broadcast tx)
- Only on-chain tx ever associated with this wallet is the historical funding
  tx `3FUZtav9671bjn3WHzzVmn5vUt39LhUTwEjtqKjei8HDf1FzTCUFQGEuK2QsHjBEAWH9g6r3BijZLLGe5VSA81HU`.

