# Beat B — init_policy with self-heal (rerun against 0.3.4, HEADLINE)

## Verdict: PASS (headline)

## Comparison

Previous gate (0.3.3): PASS — tx `61DefBB1Vjgaqz2k...vgA`, agent `6JC9ezpopdR7UCUoDoBF4QV5rTh5b7d1VmkrwJSuMrWB`, selfHealed=true.
Rerun (0.3.4): PASS — tx `5PmVzZVjYLkcKTFw...pxYE`, NEW agent `EkJuNUCVPvqHqoiTcDfRS1JGV7ckEhRehgmEEffLWEVZ`, selfHealed=true.

## Evidence

### Fresh agent (NEW keypair, distinct from previous gate's)

```
solana-keygen new --no-bip39-passphrase --silent --outfile /tmp/agenttrust-claude-e2e-rerun/fresh-agent-B.json
agent_asset = EkJuNUCVPvqHqoiTcDfRS1JGV7ckEhRehgmEEffLWEVZ
```

PolicyAuthority for this agent did not exist before this call (verified by attempting it cold). Self-heal path must fire to land a successful tx.

### Tool call

`agenttrust_init_policy` with:
- `agent_asset` = `EkJuNUCVPvqHqoiTcDfRS1JGV7ckEhRehgmEEffLWEVZ`
- `policy_id` = `1`
- `enabled_kinds_bitmask` = `1` (KillSwitch)
- `spending.per_tx_max` = `"1000000000"`
- `counterparty.min_tier` = `0`

### structuredContent envelope (verbatim)

```json
{
  "txSignature": "5PmVzZVjYLkcKTFw3MAeHey4EqULYRNkVh2ePECgp6gjWHgY8mvU8eV7NBmTQWXiqEdMKmEbhy87LcHUJkM3pxYE",
  "explorerTxUrl": "https://explorer.solana.com/tx/5PmVzZVjYLkcKTFw3MAeHey4EqULYRNkVh2ePECgp6gjWHgY8mvU8eV7NBmTQWXiqEdMKmEbhy87LcHUJkM3pxYE?cluster=devnet",
  "policyPda": "HQHBQVd8hgKcStVXYgohto4ZQRsyqxm9eru81REZVTc1",
  "policyExplorer": "https://explorer.solana.com/address/HQHBQVd8hgKcStVXYgohto4ZQRsyqxm9eru81REZVTc1?cluster=devnet",
  "velocityPda": "8oZnKWioBRHSpMFT3ceoZpXwSgi8WktQbeUnBadfXuzw",
  "velocityExplorer": "https://explorer.solana.com/address/8oZnKWioBRHSpMFT3ceoZpXwSgi8WktQbeUnBadfXuzw?cluster=devnet",
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

`getTransaction` RPC for `5PmVzZVjYL...pxYE` returned (full dump in `beat-B-onchain.json`):

- Slot: **461933423**
- Number of instructions: **2**
- Both instructions invoked program `8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR` (policy_vault)
- Account keys list includes:
  - signer `4tSEHc2vCLqnYd8nK9jRa44vnn8JnPxUgxheEmhWQhRG`
  - velocity_pda `8oZnKWioBRHSpMFT3ceoZpXwSgi8WktQbeUnBadfXuzw`
  - PolicyAuthority `HFWZtRM3zKXkWsbMYCprbtVzWn3x9GwxUg2Zbbvw9s5c`
  - policy_pda `HQHBQVd8hgKcStVXYgohto4ZQRsyqxm9eru81REZVTc1`
  - System program `11111111111111111111111111111111`
  - policy_vault program `8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR`
- Log messages (filtered to `Instruction:`):
  1. `Program log: Instruction: InitAuthority`
  2. `Program log: Instruction: InitPolicy`
- `meta.err` = `null` (tx succeeded)

Both instructions atomic in a single transaction. Self-heal worked exactly as it did in 0.3.3 — the tool detected the missing PolicyAuthority PDA and prepended `init_authority` before `init_policy`.

Explorer: https://explorer.solana.com/tx/5PmVzZVjYLkcKTFw3MAeHey4EqULYRNkVh2ePECgp6gjWHgY8mvU8eV7NBmTQWXiqEdMKmEbhy87LcHUJkM3pxYE?cluster=devnet

## Gate criteria check

- `selfHealed: true` — YES
- `healedSteps` includes `init_authority` — YES (exact value `["init_authority"]`)
- On-chain tx carries InitAuthority AND InitPolicy in one tx — YES
- Sensible cap defaulting (unspecified daily/weekly default to per_tx_max) — YES (`dailyMax = weeklyMax = perTxMax = 1000000000`)

## Notes

- Self-heal flow is unchanged between 0.3.3 and 0.3.4; the hot-fix did not touch this path.
- Cap defaulting policy ("0 is hostile, default to max specified cap") still active.
- Cold-path self-heal fires correctly on a brand-new agent.
