# `@agenttrust/mcp`

Model Context Protocol (MCP) server for AgentTrust. Drop the binary
into Claude Desktop, Cursor, or any MCP client and interact with the
deployed AgentTrust programs through natural language.

> Reads devnet by default. Mainnet is one env var away once mainnet
> deployment lands.

## Tool inventory

### Read (no signer required)

| Tool | What it returns |
|--|--|
| `agenttrust_get_policy` | Decoded `PolicyAccount` PDA for `(agent_asset, policy_id)` — every spending cap, velocity threshold, counterparty tier requirement, and required capability hash. |
| `agenttrust_list_policies` | All policies registered for an agent (lightweight summary; use `get_policy` for full decode). |
| `agenttrust_simulate_payment` | Read-only `gate_payment` simulation. Returns `Allow`, `Deny(reasonCode)`, or `RequireValidation(capabilityHash)`. |
| `agenttrust_get_killswitch` | `KillSwitchState` + `PolicyAuthority` for an agent. |
| `agenttrust_get_velocity` | `VelocityLedger` for `(agent, policy_id)` — sliding-window cumulative spend. |
| `agenttrust_get_feedback_log` | `FeedbackEmissionLog` by `payment_id_hash` (32-byte hex). |
| `agenttrust_get_quantu_reputation` | Quantu `atom_stats` decoded — tier (0..3), feedback count, risk score, confidence. |
| `agenttrust_get_validation_attestation` | Every `ValidationAttestation` for `(subject_asset, capability_hash)`. |
| `agenttrust_list_facilitators` | Active facilitator adapters (Pay.sh / Dexter / atxp / MCPay) + ship status. |
| `agenttrust_demo_state` | Three pre-warmed devnet counterparties used by `examples/pay-sh-demo`. |

### Write (require `KEYPAIR_B58` env)

| Tool | Effect |
|--|--|
| `agenttrust_init_policy` | Create `PolicyAccount` + `VelocityLedger` for the signer's agent. |
| `agenttrust_set_killswitch` | Pause / unpause the agent's `KillSwitchState` (lead-only multisig in v1). |
| `agenttrust_request_validation` | Open a `ValidationRequest` PDA. |
| `agenttrust_respond_to_validation` | Attestor writes a `ValidationAttestation` PDA. |
| `agenttrust_emit_feedback` | Facilitator-only `emit_feedback` CPI (signer must equal facilitator). |

Every write tool surfaces the resulting `txSignature` + Solana Explorer URL
in its response.

### Discovery

| Tool | What it does |
|--|--|
| `agenttrust_docs` | Full-text search the docs corpus at `docs-site/content/docs/`. Returns ranked hits with excerpts. |
| `agenttrust_facilitator_walkthrough` | Per-adapter integration walkthrough by name. Falls back to the generic adapters guide for unknown names. |
| `agenttrust_explain_decision` | Translate a `DenyReason` code (1..15) into the enum name + remediation hint. |

### Resources

| URI | MIME | Content |
|--|--|--|
| `agenttrust://devnet/programs` | `application/json` | Deployed program IDs + Explorer URLs for the active cluster. |
| `agenttrust://docs/<rel-path>` | `text/markdown` | Each MDX page in the docs corpus exposed individually. |
| `agenttrust://examples/pay-sh-demo/...` | `text/x-typescript` / `text/markdown` | Pay.sh demo source files. |
| `agenttrust://examples/attestor-demo/...` | `text/x-typescript` / `text/markdown` | Attestor demo source files. |

### Prompts (guided workflows)

| Prompt | What it walks the user through |
|--|--|
| `agenttrust_audit_payment` | Simulate a payment, read the policy, read the payee's reputation, surface the decision. |
| `agenttrust_setup_agent` | Bootstrap an agent's PolicyAuthority → KillSwitch → first PolicyAccount. |
| `agenttrust_explain_failure` | Given a failed payment's reason code, explain root cause + remediation. |

## Install

### Claude Desktop

Add to your config (`~/Library/Application Support/Claude/claude_desktop_config.json`
on macOS, `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "agenttrust": {
      "command": "node",
      "args": ["/absolute/path/to/agenttrust/mcp/dist/index.js"],
      "env": {
        "RPC_URL": "https://api.devnet.solana.com",
        "NETWORK": "solana-devnet"
      }
    }
  }
}
```

Or run the helper:

```bash
mcp/scripts/install-claude-desktop.sh
```

The script edits the Claude Desktop config in place. It backs up the
prior config to `claude_desktop_config.json.bak.<timestamp>` so you can
revert if needed.

For write tools, add `KEYPAIR_B58` to the `env` block:

```json
"env": {
  "RPC_URL":     "https://api.devnet.solana.com",
  "NETWORK":     "solana-devnet",
  "KEYPAIR_B58": "<base58-encoded 64-byte secret key>"
}
```

### Cursor

Cursor's MCP config lives at `~/.cursor/mcp.json` (or per-workspace
`.cursor/mcp.json`). Same shape as Claude Desktop:

```json
{
  "mcpServers": {
    "agenttrust": {
      "command": "node",
      "args": ["/absolute/path/to/agenttrust/mcp/dist/index.js"]
    }
  }
}
```

### Generic stdio MCP client

The package ships a binary entry point. Once built:

```bash
pnpm --filter ./mcp run build
node ./mcp/dist/index.js   # stdio transport, default
```

The server speaks MCP over stdin/stdout; any compliant MCP client
attaches by spawning this command.

### Hosted HTTP transport

Set `MCP_TRANSPORT=http` and `MCP_HTTP_PORT=8765`:

```bash
MCP_TRANSPORT=http MCP_HTTP_PORT=8765 node ./mcp/dist/index.js
```

The server listens on `http://0.0.0.0:8765` using
`StreamableHTTPServerTransport`. Behind a reverse proxy (Caddy, nginx,
Vercel) this surfaces as a public hosted endpoint.

> A hosted Vercel deployment URL is **not yet shipped**. The streamable-HTTP
> transport surface is present and exercised in CI, but a public hosted
> endpoint requires a Vercel project + DNS. Track this as a follow-up.

## Environment

| Var | Default | Effect |
|--|--|--|
| `RPC_URL` | devnet RPC | Solana RPC endpoint. |
| `NETWORK` | `solana-devnet` | `solana-devnet` or `solana-mainnet`. Drives Quantu program IDs. |
| `KEYPAIR_B58` | unset | Base58-encoded 64-byte secret key. Required for write tools. |
| `MCP_TRANSPORT` | `stdio` | `stdio` or `http`. |
| `MCP_HTTP_PORT` | `8765` | Port for HTTP transport. |
| `POLICY_VAULT_PROGRAM_ID` | devnet ID | Override the policy_vault program ID. |
| `TRUSTGATE_PROGRAM_ID` | devnet ID | Override the trustgate program ID. |
| `VALIDATION_REGISTRY_PROGRAM_ID` | devnet ID | Override the validation_registry program ID. |
| `MCP_DEFAULT_FACILITATOR` | unset | Default facilitator name surfaced in tool replies. |
| `MCP_DOCS_DIR` | repo `docs-site/content/docs` | Override the docs corpus root (tests). |
| `PAY_SH_DEMO_STATE_FILE` | `examples/pay-sh-demo/devnet-counterparties.json` | Override the demo state file. |

## Example natural-language prompts

Once installed, try these in Claude Desktop:

- "Use AgentTrust to look up the three pre-warmed devnet counterparties."
- "Simulate a 5-USDC payment from the tier-3 demo agent to the tier-0 demo agent against policy 1. What does the gate decide?"
- "Pull the policy for agent &lt;asset&gt; ID 1 and tell me the spending caps."
- "Why would a payment with reason code 6 fail, and how do I fix it?"
- "Search the AgentTrust docs for the validation registry data flow."
- "Walk me through adding a new x402 facilitator adapter."

## IDL fetch

All three Anchor IDLs are published on devnet. Re-verify any time with:

```bash
anchor idl fetch 8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR --provider.cluster devnet  # policy_vault
anchor idl fetch HF8zHfoyA7b5mhLViopTnRMprc6ZT5KActHTdkFrih2N --provider.cluster devnet  # trustgate
anchor idl fetch Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv --provider.cluster devnet  # validation_registry
```

The MCP server bundles snapshots at `src/idl/*.json` as a defensive
fallback (saves an RPC round-trip on cold start; keeps the server bootable
in offline / air-gapped harnesses). The latest evidence snapshot is in
[`../docs/proofs/idl-on-chain.json`](../docs/proofs/idl-on-chain.json) —
includes SHA256 hashes + instruction counts for each IDL.

## Build + test

```bash
pnpm install
pnpm --filter ./trustgate/sdk run build   # MCP depends on the SDK build output
pnpm --filter ./mcp run build
pnpm --filter ./mcp test                  # unit tests (no chain access)
INTEGRATION=1 pnpm --filter ./mcp test:integration   # devnet round-trip
```

## Architecture

```
mcp/src/
  index.ts        — entry point + transport selector
  server.ts       — MCP Server with tools/resources/prompts wired up
  config.ts       — env parsing
  chain.ts        — thin façade over @agenttrust-sdk/trustgate
  tools/
    types.ts            — shared Tool<TInput, TOutput> shape
    common.ts           — pubkey / hex helpers + Zod schemas
    index.ts            — aggregates ALL_TOOLS
    read/               — 10 read tools
    write/              — 5 write tools
    discovery/          — 3 discovery tools
  resources/
    docs.ts             — MDX corpus indexer + path-traversal-safe demo readers
    programs.ts         — devnet program manifest as JSON resource
  prompts/
    types.ts            — shared Prompt shape
    audit-payment.ts
    setup-agent.ts
    explain-failure.ts
    index.ts            — aggregates ALL_PROMPTS
```

Chain logic — PDA derivation, IDL loading, `gate_payment` simulation —
lives in `@agenttrust-sdk/trustgate`. The MCP server is a façade. If a
helper is missing in the SDK, add it to the SDK and re-export — never
fork the chain logic into `mcp/`.
