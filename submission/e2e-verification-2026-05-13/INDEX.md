# E2E verification artifacts — 2026-05-13

| File | Description |
|---|---|
| `README.md` | Full verification narrative, per-step results, verdict |
| `01-npx-help.txt` | `npx -y @agenttrust-sdk/mcp@latest --help` (HELP_TEXT verification) |
| `02-initialize-and-tools-list.txt` | MCP JSON-RPC `initialize` + `tools/list` against 0.3.3 |
| `03a-agent-pubkey.txt` | Fresh agent_asset pubkey minted for the self-heal test |
| `03-init-policy-self-heal.txt` | `tools/call agenttrust_init_policy` response (selfHealed: true) |
| `03c-tx-on-chain.json` | `getTransaction` proving InitAuthority + InitPolicy in one tx |
| `04-simulate-deny.txt` | `tools/call agenttrust_simulate_payment` response (structured envelope) |

Solana Explorer for the headline self-heal transaction:
https://explorer.solana.com/tx/4T6voeoTcFkd6H8vgnMZE95JQrUxHQvApHvuzgmtxogeE7E9Wrd5UxKDZDNGa1Y3685xs5q2p1Xz9JJDy1RZ1myc?cluster=devnet
