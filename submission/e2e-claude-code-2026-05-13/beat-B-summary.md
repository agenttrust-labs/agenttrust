# Beat B — init_policy with self-heal (HEADLINE)

## Verdict: PASS (headline)

## Evidence

### Fresh agent

```
solana-keygen new --no-bip39-passphrase --silent --outfile /tmp/agenttrust-claude-e2e/fresh-agent-B.json
agent_asset = 6JC9ezpopdR7UCUoDoBF4QV5rTh5b7d1VmkrwJSuMrWB
```

PolicyAuthority for this agent did not exist before this call.

### Tool call

`agenttrust_init_policy` with:
- `agent_asset` = `6JC9ezpopdR7UCUoDoBF4QV5rTh5b7d1VmkrwJSuMrWB`
- `policy_id` = `1`
- `enabled_kinds_bitmask` = `1` (KillSwitch)
- `spending.per_tx_max` = `"1000000000"`
- `counterparty.min_tier` = `0`

### structuredContent envelope (verbatim)

```json
{
  "txSignature": "61DefBB1Vjgaqz2k4Zo4c47H6u373tPY9wMqs5CHCwRnVZLr8amxnkVjsdFkScpq7NxZTnA7YyHU8nKYdQRW2vgA",
  "explorerTxUrl": "https://explorer.solana.com/tx/61DefBB1Vjgaqz2k4Zo4c47H6u373tPY9wMqs5CHCwRnVZLr8amxnkVjsdFkScpq7NxZTnA7YyHU8nKYdQRW2vgA?cluster=devnet",
  "policyPda": "FqkKK7cQkVKB3PxoKZ86zQ1UVwsJC1fye8Sbj7cwiVUr",
  "policyExplorer": "https://explorer.solana.com/address/FqkKK7cQkVKB3PxoKZ86zQ1UVwsJC1fye8Sbj7cwiVUr?cluster=devnet",
  "velocityPda": "stwen8X1mQbfsEhmzvdtHx1wqsG3UCyaiMNvyt9YZDB",
  "velocityExplorer": "https://explorer.solana.com/address/stwen8X1mQbfsEhmzvdtHx1wqsG3UCyaiMNvyt9YZDB?cluster=devnet",
  "effectiveSpending": {
    "perTxMax": "1000000000",
    "dailyMax": "1000000000",
    "weeklyMax": "1000000000"
  },
  "selfHealed": true,
  "healedSteps": ["init_authority"]
}
```

### On-chain proof

`getTransaction` RPC for `61Def...vgA` returned:

- Number of instructions: **2**
- Both instructions invoked program `8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR` (policy_vault)
- Log messages (filtered to `Instruction:`):
  1. `Program log: Instruction: InitAuthority`
  2. `Program log: Instruction: InitPolicy`

Both instructions atomic in a single transaction. Self-heal worked exactly as designed: the tool detected the missing PolicyAuthority PDA and prepended `init_authority` before `init_policy` in the same atomic tx.

Explorer: https://explorer.solana.com/tx/61DefBB1Vjgaqz2k4Zo4c47H6u373tPY9wMqs5CHCwRnVZLr8amxnkVjsdFkScpq7NxZTnA7YyHU8nKYdQRW2vgA?cluster=devnet

## Gate criteria check

- `selfHealed: true` — YES
- `healedSteps` includes `init_authority` — YES (exact value `["init_authority"]`)
- On-chain tx carries InitAuthority AND InitPolicy in one tx — YES
- Sensible cap defaulting (unspecified daily/weekly default to per_tx_max) — YES (`dailyMax = weeklyMax = perTxMax = 1000000000`)

## Notes

- Effective spending caps confirm the "0 is hostile, default to max specified cap" defaulting policy is active.
- Cold-path self-heal works on first invocation against a brand-new agent.
