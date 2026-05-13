# Beat A — sanity install + version (rerun against 0.3.4)

## Verdict: PASS

## Comparison

Previous gate (0.3.3): PASS — 19 tools, version 0.3.3.
Rerun (0.3.4): PASS — 19 tools, version 0.3.4.

## Evidence

Two independent probes confirm all gate criteria.

### Direct MCP stdio probe (ground truth)

`node probe-mcp.js` against `npx -y --prefer-online @agenttrust-sdk/mcp@latest` returned:

- `serverInfo.name` = `agenttrust`
- `serverInfo.version` = **`0.3.4`** (matches npm `latest` tag at run time)
- `tools/list` returned **19 tools** including `agenttrust_init_authority`
- All previous tool names preserved (no surface churn between 0.3.3 and 0.3.4)

Raw output saved to `probe-devnet.json`.

The 19 tool names returned (in registration order):

1. agenttrust_get_policy
2. agenttrust_list_policies
3. agenttrust_simulate_payment
4. agenttrust_get_killswitch
5. agenttrust_get_velocity
6. agenttrust_get_feedback_log
7. agenttrust_get_quantu_reputation
8. agenttrust_get_validation_attestation
9. agenttrust_list_facilitators
10. agenttrust_demo_state
11. agenttrust_init_authority
12. agenttrust_init_policy
13. agenttrust_set_killswitch
14. agenttrust_request_validation
15. agenttrust_respond_to_validation
16. agenttrust_emit_feedback
17. agenttrust_docs
18. agenttrust_facilitator_walkthrough
19. agenttrust_explain_decision

### Hot-fix preflight check (built into Beat A's probe)

The stdio probe also dumped the post-fix `agenttrust_request_validation.inputSchema.properties.deadline_slot`:

```json
{
  "anyOf": [
    { "type": "integer", "minimum": 1 },
    { "type": "string", "pattern": "^\\d+$" }
  ],
  "description": "..."
}
```

The previous gate's offending `{ "exclusiveMinimum": true, "minimum": 0 }` (draft-04 boolean form) is gone — replaced by draft 2020-12-compliant `{ "minimum": 1 }`. Same fix in `agenttrust_respond_to_validation.expires_at_slot`. This makes Beats D and E callable by Anthropic's API.

### Claude Code session probe

`claude -p` invocation:

```
claude -p "Connect to the agenttrust MCP server. List all available tools ..." \
  --strict-mcp-config \
  --mcp-config mcp-config.json \
  --permission-mode bypassPermissions \
  --allowedTools 'mcp__agenttrust__*' \
  --output-format json \
  --model sonnet
```

The model listed all 19 tools by inspecting the deferred-tool registry. Total tool count: 19. `agenttrust_init_authority` present: YES. (The model's reply also noted it cannot read the initialize response's version string from inside its own tool surface — that is expected. The authoritative version comes from the stdio probe above.)

## Gate criteria check

- Server version `0.3.4` — YES (was 0.3.3 in previous gate)
- Tool count `>= 19` — YES (exactly 19, unchanged)
- `agenttrust_init_authority` present — YES
- MCP server starts from npm (npx) — YES, cold install + boot via `--prefer-online`
- Hot-fix 1 (schema regression) — VERIFIED in the same probe (no draft-04 booleans remain)
