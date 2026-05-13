# Beat A — sanity install + version

## Verdict: PASS

## Evidence

Two independent probes confirmed all gate criteria.

### Direct MCP stdio probe (ground truth)

Spawned the published `npx -y @agenttrust-sdk/mcp@latest` binary, sent `initialize` then `tools/list`:

- `serverInfo.name` = `agenttrust`
- `serverInfo.version` = **`0.3.3`** (matches npm latest)
- `tools/list` returned **19 tools** including `agenttrust_init_authority`

Raw output saved to `beat-A-mcp-probe.json`.

### Claude Code session probe

`claude -p` with `--mcp-config /tmp/agenttrust-claude-e2e/mcp-config.json --strict-mcp-config --permission-mode bypassPermissions --allowedTools 'mcp__agenttrust__*' --model sonnet`.

The model enumerated all 19 tool names by inspecting the deferred-tool registry. The reported "version: 0.2.6" in the model's narrative is a docs-cache hallucination, not a server signal — the authoritative version from `initialize` is `0.3.3` (above). All 19 tools listed including `agenttrust_init_authority`.

## Gate criteria check

- Server version `0.3.3` — YES
- Tool count `>= 19` — YES (exactly 19)
- `agenttrust_init_authority` present — YES
- MCP server starts from `npm` (npx) — YES, cold install + boot in ~15s

## Notes

- HELP_TEXT (printed when the binary is invoked with `--help`) shows correct docs URL `https://docs.agenttrust.tech/mcp`, port `8765`, and `MCP_HTTP_HOST 127.0.0.1` default.
