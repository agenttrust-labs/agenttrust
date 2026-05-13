# Beat G — Quantu mainnet read

## Verdict: PARTIAL (known W1-A polish item: mainnet guard over-applies)

## Evidence

### Attempt 1 — default mainnet config (no explicit program IDs)

Config used: `mcp-config-mainnet.json` with only `NETWORK=solana-mainnet` and `RPC_URL=https://api.mainnet-beta.solana.com`.

Server fails to boot:

```
fatal: Error: AgentTrust programs are not yet deployed on mainnet.
Set explicit POLICY_VAULT_PROGRAM_ID, TRUSTGATE_PROGRAM_ID, and VALIDATION_REGISTRY_PROGRAM_ID env vars,
or use NETWORK=solana-devnet (default).
    at loadConfig (.../dist/config.js:202:15)
    at main (.../dist/index.js:64:41)
```

Result: `tools/list` cannot complete because the MCP process exits before initializing. Claude Code reports "agenttrust_get_quantu_reputation is not available in this environment".

Saved to `beat-G-mainnet-boot-attempt.txt`.

### Attempt 2 — workaround with dummy AgentTrust program IDs

Config used: `mcp-config-mainnet-with-ids.json` with `POLICY_VAULT_PROGRAM_ID=TRUSTGATE_PROGRAM_ID=VALIDATION_REGISTRY_PROGRAM_ID=11111111111111111111111111111111` (System program as placeholder).

Server boots, `tools/call agenttrust_get_quantu_reputation` succeeds structurally:

```json
{
  "pda": "7g7Ah5vkXWs9TJKvGApKJyEUnvCPJsvA4mePDfKUVMXK",
  "explorerUrl": "https://explorer.solana.com/address/7g7Ah5vkXWs9TJKvGApKJyEUnvCPJsvA4mePDfKUVMXK",
  "exists": false,
  "ownerProgram": null,
  "ownerExpected": "AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb",
  "ownerMatches": false,
  "rawByteLen": 0
}
```

The tool path WORKS — it derived the atom_stats PDA from the supplied agent_asset, queried mainnet, and returned a clean structured response with `exists: false`. The `ownerExpected` value `AToMw53...zVVb` correctly resolves to the Quantu atom_engine mainnet program ID (same as the `program_id` in `mainnet-quantu-tier0-scan.json`).

Saved to `beat-G-mainnet-workaround.txt`.

### Note on the agent_asset used

The pubkey `FHvoK58UogWy9ZrX7tHGLcRYUD7qfQZjHtDcMoxZShMc` was sourced from `docs/proofs/mainnet-quantu-tier0-scan.json:sample_first_10[0].pubkey`. That file actually contains atom_stats PDAs, NOT the agent_asset pubkeys, so passing it to `get_quantu_reputation` (which derives `atom_stats = PDA(["atom_stats", agent_asset], atom_engine)`) yields a downstream PDA that doesn't exist on chain (`exists: false`). To prove a tier read against live mainnet data, we would need a real agent_asset pubkey from the Quantu agent_registry — the scan file does not contain those. Within the 5-minute budget the brief allows, no such index is readily available.

## Gate criteria check

- Mainnet read WORKS at the tool-handler level (Attempt 2) — YES
- Default config boots on mainnet — NO (the W1-A guard over-applies)
- Failure is structured Quantu-decode (`auth_required` / `chain_error`) — NO; it is a startup-time guard, not a tool-level error

## Polish item flagged (matches brief's W1-A note)

The brief expected: "the W1-A mainnet program-ID guard ... should ONLY apply to AgentTrust programs not Quantu. ... `get_quantu_reputation` tool doesn't need AgentTrust program IDs since Quantu has its own."

Current behaviour: `loadConfig` in `mcp/src/config.ts` line ~202 hard-throws on any `NETWORK=solana-mainnet` without explicit AT program IDs, even when the caller is only going to invoke Quantu reads. The guard should be a tool-time check (only fire when an AT-program-touching tool is invoked) instead of a startup-time abort.

Fix hint: relax `loadConfig` to log a warning instead of throwing when AgentTrust program IDs are missing on mainnet, and have the AT-touching tools fail at call time with a structured `errorCode: "config_error"` envelope explaining the missing env vars.
