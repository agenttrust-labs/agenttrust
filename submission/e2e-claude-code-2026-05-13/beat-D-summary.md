# Beat D — request_validation

## Verdict: FAIL (regression-class: published 0.3.3 schema rejected by Anthropic API)

## Evidence

### Tool call attempted

`agenttrust_request_validation` with:
- `subject_asset` = `6JC9ezpopdR7UCUoDoBF4QV5rTh5b7d1VmkrwJSuMrWB`
- `capability_name` = `"pay-sh-demo.tier3"`
- `claim_uri_hash_hex` = `"0000...0000"` (32 zero bytes)
- `deadline_slot` = `461933335`

### Response (Anthropic API error, not an MCP envelope)

```
API Error: 400 tools.11.custom.input_schema: JSON schema is invalid.
It must match JSON Schema draft 2020-12 (https://json-schema.org/draft/2020-12).
Learn more about tool use at https://docs.claude.com/en/docs/tool-use.
```

The MCP tool never ran. The Anthropic API rejected the inbound `messages.create` request because one of the supplied MCP tool schemas does not validate against JSON Schema draft 2020-12.

### Root cause (confirmed by inspecting the published schema)

`agenttrust_request_validation`'s `deadline_slot` property declares:

```json
"deadline_slot": {
  "anyOf": [
    { "type": "integer", "exclusiveMinimum": true, "minimum": 0 },
    { "type": "string", "pattern": "^\\d+$" }
  ]
}
```

`exclusiveMinimum: true` is the **JSON Schema draft-04** boolean form. In **draft 2020-12** (which Anthropic's API enforces), `exclusiveMinimum` MUST be a **number** (not a boolean). The correct draft 2020-12 form is `"exclusiveMinimum": 0` (no separate `minimum` field needed).

The same bug exists in `agenttrust_respond_to_validation.expires_at_slot` (see Beat E).

The bug is the schema definition shipped in `@agenttrust-sdk/mcp@0.3.3`. No state can fix this; Claude Code cannot invoke either tool against the published package.

## Gate criteria check

- Structured error envelope present — NO, no MCP envelope at all (Anthropic API rejected before reaching the MCP server)
- Tool ran — NO

## What this means

This is upstream of the "known limitation" the brief warned about (state seeding). It is a code-level schema bug in two published tool definitions that blocks Claude Code from ever invoking them. Reproducible across two retries.

Fix: in `mcp/src/tools/request_validation.ts` and `respond_to_validation.ts`, change `{ type: "integer", exclusiveMinimum: true, minimum: 0 }` to `{ type: "integer", exclusiveMinimum: 0 }`.
