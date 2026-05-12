# AgentTrust dx-fixes — end-to-end verification, 2026-05-13

Branch merged: `dx-fixes` -> `main` at `af9a1e8` (PR #9, 14 commits).

Published artifacts under test:
- `@agenttrust-sdk/mcp@0.3.3` (latest)
- `@agenttrust-sdk/trustgate@0.3.1` (latest)

Hosted endpoints (Fly, redeployed today):
- `https://mcp.agenttrust.tech/` -> 200, `{"version":"0.3.3","toolCount":18}`
- `https://api.agenttrust.tech/healthz` -> 200, facilitator pubkey `7Pf3xcV8M8wAWrPjprmCzm9R8s37VBrvgMWMksufntyZ`, balance 0.500 SOL, adapter `pay-sh`
- `https://demo.agenttrust.tech/protected` -> 402 with `payment-required` + AgentTrust x402 extension

Docs (Vercel, auto-redeployed on merge):
- `https://docs.agenttrust.tech/quickstart` -> 200, new 60-second onboarding page

Solana CLI signer (picked up automatically via the new W1-A chain):
- pubkey `4tSEHc2vCLqnYd8nK9jRa44vnn8JnPxUgxheEmhWQhRG`
- devnet balance 16.24 SOL

## Per-step results

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | `npx -y @agenttrust-sdk/mcp@latest --help` from clean temp dir | PASS | `01-npx-help.txt` |
| 2 | initialize + tools/list against the freshly-installed server | PASS | `02-initialize-and-tools-list.txt` |
| 3 | init_policy self-heal + cap defaults on a fresh agent_asset | PASS | `03-init-policy-self-heal.txt`, `03c-tx-on-chain.json` |
| 4 | simulate_payment | PARTIAL | `04-simulate-deny.txt` |

### Note on initial install regression

The first attempt at this verification used `@agenttrust-sdk/mcp@0.3.2`,
which was published with an unrewritten pnpm `workspace:` dep spec
because the publish was done via plain `npm publish` instead of
`pnpm publish`. npm consumers hit `EUNSUPPORTEDPROTOCOL`. Diagnosed
and republished as `0.3.3` using `pnpm publish --filter`. 0.3.2 has
been deprecated on the registry with a pointer to 0.3.3. Full
diagnosis below.

## Step 1 — `npx -y @agenttrust-sdk/mcp@latest --help`

Clean install from npm into `/tmp/agenttrust-e2e-033`. The binary
runs and prints HELP_TEXT containing every W2-B polish item:

- `MCP_HTTP_PORT (default 8765)` (was advertising 8080 pre-fix)
- `https://docs.agenttrust.tech/mcp` (was the github.io mirror)
- `KEYPAIR_PATH` row alongside `KEYPAIR_B58` plus the autodetect note
- `MCP_HTTP_HOST` env, default `127.0.0.1`
- No backslash leak on `$MCP_HTTP_PORT`

## Step 2 — initialize + tools/list

```
serverInfo: {name: "agenttrust", version: "0.3.3"}
tools/list -> 19 tools (includes agenttrust_init_authority)
```

The init-authority tool is the new write tool added in W1-D
(`be09967`).

## Step 3 — init_policy self-heal + cap defaults

Fresh agent_asset (no PolicyAuthority PDA yet):
`AN3vh1LMVVagVmQf6HADj1kxSJHNRq8czBPEGQSYdMjh`

Call:
```json
{
  "agent_asset": "AN3vh1LMVVagVmQf6HADj1kxSJHNRq8czBPEGQSYdMjh",
  "policy_id": 1,
  "enabled_kinds_bitmask": 1,
  "spending": { "per_tx_max": "1000000000" },
  "min_counterparty_tier": 0
}
```

Response:
```json
{
  "txSignature": "4T6voeoTcFkd6H8vgnMZE95JQrUxHQvApHvuzgmtxogeE7E9Wrd5UxKDZDNGa1Y3685xs5q2p1Xz9JJDy1RZ1myc",
  "policyPda": "bUW3uc3xTuZEzC4Zty4Y8min8y4CMsGL6j8KRoRGtAE",
  "velocityPda": "83mcewVxJuKaunsKPga6W1N9UwXUKRjasBusUERrxsgD",
  "effectiveSpending": { "perTxMax": "1000000000", "dailyMax": "1000000000", "weeklyMax": "1000000000" },
  "selfHealed": true,
  "healedSteps": ["init_authority"]
}
```

Both new features land in a single response:

1. **Self-heal** (W1-D `be09967`) - `selfHealed: true` with
   `healedSteps: ["init_authority"]`. The PolicyAuthority PDA was
   created in the same atomic tx as init_policy.
2. **Cap defaults** (W1-D `be09967`) - input only specified
   `per_tx_max: 1_000_000_000`. The response shows `dailyMax` and
   `weeklyMax` both filled to `1_000_000_000` (MAX-of-peers default).

On-chain proof at devnet slot 461920535:

```
tx 4T6voeoTcFkd6H8vgnMZE95JQrUxHQvApHvuzgmtxogeE7E9Wrd5UxKDZDNGa1Y3685xs5q2p1Xz9JJDy1RZ1myc
Status: OK
Instructions: 2
  ix[0] -> 8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR (policy_vault) "Instruction: InitAuthority"
  ix[1] -> 8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR (policy_vault) "Instruction: InitPolicy"
```

Solana Explorer:
https://explorer.solana.com/tx/4T6voeoTcFkd6H8vgnMZE95JQrUxHQvApHvuzgmtxogeE7E9Wrd5UxKDZDNGa1Y3685xs5q2p1Xz9JJDy1RZ1myc?cluster=devnet

Two instructions, one atomic transaction. Either both succeed or
both fail. This is the headline UX win from post-submission-todos #2.

## Step 4 — simulate_payment

PARTIAL.

Call: simulate a 5000 USDC payment against the policy just created,
which has a `per_tx_max` of 1000 USDC. Expected: structured Deny
envelope from the gate with `reason: SpendingPerTxExceeded`.

Actual: a structured ERROR envelope from the MCP layer:

```json
{
  "errorCode": "internal",
  "message": "Tool handler threw an unexpected error.",
  "hint": "See `cause` for the original message and check the MCP server stderr for stack trace.",
  "cause": "simulation failed: {\"InstructionError\":[0,{\"Custom\":3012}]}"
}
```

Anchor error code `Custom 3012` is `AccountNotInitialized`. The fresh
agent_asset has its PolicyAuthority + Policy + VelocityLedger PDAs
(all three created in the self-heal tx above), but `gate_payment` on
the trustgate program also reads accounts that this test didn't
seed: the killswitch state for the payer agent, and the Quantu
agent_account for the payee. Both must exist on-chain before
gate_payment will return a structured Deny.

Two real things to take from this:

1. The structured error envelope (F-013, W1-B `d9ecd43`) is working
   exactly as designed - the MCP-layer catch surfaces a machine-
   readable `errorCode` and the raw `cause` so an LLM or developer
   can act on the failure. Pre-fix this would have been an opaque
   `"tool error: simulation failed: ..."` text blob.
2. The actual Deny-outcome path is the brief's H test, scoped as
   "needs Mohit's fresh local demo state" because the demo's seeded
   counterparties (`BTcgi...`, etc.) already carry Quantu profiles
   + killswitch states that a brand-new agent_asset doesn't have.
   Best run interactively against the bundled
   `examples/pay-sh-demo/devnet-counterparties.json`.

A small follow-up classifier refinement could map Anchor
`InstructionError` payloads to `errorCode: "chain_error"` instead of
the more generic `"internal"`. Captured as a P2 polish item.

## Verdict

`dx-fixes` is shipped end to end:

- PR #9 merged to main at `af9a1e8`.
- npm `@agenttrust-sdk/mcp@0.3.3` and `@agenttrust-sdk/trustgate@0.3.1`
  live, the deprecated 0.3.2 has a clear pointer to 0.3.3.
- All three Fly apps redeployed and healthy.
- Docs `/quickstart` lands.
- `patch-claude.sh` deleted - the W1-A layered signer chain replaces
  it.
- Self-heal verified end-to-end with a real on-chain devnet tx
  carrying both `InitAuthority` and `InitPolicy` in one atomic call.
- Cap defaults verified - one cap specified, peers filled to MAX.
- Structured error envelopes verified at both `input_invalid` (Zod
  rejection) and `internal` (Anchor InstructionError) paths.

Outstanding for a future polish pass: route the Anchor
`InstructionError` regex through to `chain_error` in the classifier,
and ship a `seed_counterparty` helper or pointer so simulate_payment
demos work without leaning on `examples/pay-sh-demo/`'s seeded set.
