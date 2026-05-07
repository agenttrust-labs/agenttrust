# Security policy

## Reporting

Use [GitHub Private Vulnerability Reporting](https://github.com/agenttrust-labs/agenttrust/security/advisories/new).
Don't open a public issue. (`security@agenttrust.tech` is not yet
configured for forwarding — fall back to the GitHub channel.)

## Scope

In scope: the three Anchor programs (`programs/policy-vault/`,
`programs/trustgate/`, `programs/validation-registry/`), the SDK
(`@agenttrust-sdk/trustgate`), the MCP server (`@agenttrust-sdk/mcp`),
the facilitator service (`trustgate/server/`), and the hosted endpoints
at `mcp.agenttrust.tech` / `api.agenttrust.tech` / `demo.agenttrust.tech`.

Out of scope (please report upstream): Quantu (`agent-registry-8004`,
`atom-engine`), Solana runtime, Anchor, MPL Core, and the four
facilitators (Pay.sh / Dexter / atxp / MCPay) themselves —
adapter-side bugs against those facilitators ARE in scope.

## Response

Solo maintainer; best-effort triage. Acknowledgement target: 7 days.
Standard 90-day coordinated-disclosure window from initial report;
earlier disclosure if a fix lands sooner.

## Documented footguns

[`docs/proofs/transfer-hook-atomicity.md`](docs/proofs/transfer-hook-atomicity.md)
is the kind of failure-class this policy already documents publicly
(splitting `gate_payment + transfer + emit_feedback` corrupts state on
Token-2022 + TransferHook mints). New issues in that style are exactly
what this policy covers.
