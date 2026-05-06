# Phase F4 — docs + link verification

Captured 2026-05-06. Every load-bearing external reference verified.

## Solana Explorer URLs (devnet)

`solana account` against `api.devnet.solana.com` — every address listed
in the public READMEs resolves to live on-chain state with the expected
owner.

| Address | README source | Owner | Status |
|---|---|---|---|
| `8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR` | root README, SDK README | BPFLoaderUpgradeable | live (policy_vault) |
| `HF8zHfoyA7b5mhLViopTnRMprc6ZT5KActHTdkFrih2N` | root README, SDK README | BPFLoaderUpgradeable | live (trustgate) |
| `Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv` | root README, SDK README, attestor-demo README | BPFLoaderUpgradeable | live (validation_registry) |
| `HB4BBi9jaD3VPcZkQQaH3DxukSqBiXfW8RejtaLa8bF3` | pay-sh-demo README | trustgate program | live (FeedbackEmissionLog) |
| `C6Yr7oKcZ6sDVibR35SWbFnGCXyfQjLeRCiPbjxYq6vY` | attestor-demo README | validation_registry program | live (D1 attestation) |
| `5PfaofvEUf3adtJwMho7zzbfvgxwxbvp2V5moqhtLK8y` | attestor-demo README | Quantu agent_registry (devnet) | live (counterparty agent_account) |

## External services

| URL | Method | Status |
|---|---|---|
| https://agenttrust-puj6nnyh0-mohit-kumars-projects.vercel.app | curl HEAD | HTTP/2 200 |
| https://www.npmjs.com/package/@agenttrust-sdk/trustgate | `npm view` | live, 0.1.0 |
| https://github.com/agenttrust-labs/agenttrust | `gh repo view` | live, **PRIVATE** |

**Note (npm homepage drift):** the published 0.1.0 npm tarball's
`homepage` still points to the legacy `mohit-1710/agenttrust` repo
because that's what was committed at publish time. The current source
in `trustgate/sdk/package.json` already has the rebranded
`agenttrust-labs/agenttrust` URL — republishing 0.1.1 (or 0.2.0)
synchronises this.

**Note (private repo):** the GitHub repo is private. WebFetch / curl
returns 404 for unauthed access; Frontier judges with access pull via
gh-cli or the configured remote.

## SDK tarball (npm pack)

```
$ pnpm pack
agenttrust-sdk-trustgate-0.1.0.tgz
```

Contents include 12 `.d.ts` files (one per source module — every
public TypeScript export has a declaration shipped):

  package/dist/atomicity.d.ts
  package/dist/chain.d.ts
  package/dist/client.d.ts
  package/dist/emit-feedback.d.ts
  package/dist/express.d.ts
  package/dist/index.d.ts
  package/dist/onchain-validator.d.ts
  package/dist/quantu.d.ts
  package/dist/spl.d.ts
  package/dist/types.d.ts
  package/dist/validation-registry.d.ts
  package/dist/x402.d.ts

The `files` field includes `dist`, `src`, `README.md`, `LICENSE` —
matches what the published tarball ships. No node_modules, no test
files, no IDLs in the publish artefact.

## MCP `agenttrust_docs` query verification

Six probe queries via direct stdio JSON-RPC against `mcp/dist/index.js`.
Top-3 ranked hits captured below; each query lands a relevant doc as
its top-1 (or close 2nd):

| Query | Top result | Top score |
|---|---|---|
| `validation registry` | `agenttrust://docs/integration-guides/custom-attestor` (rank 2: `programs/validation-registry`) | 27 |
| `quickstart` | `agenttrust://docs/getting-started/quickstart` | 5 |
| `atomic settle` | `agenttrust://docs/sdk/atomic-tx-invariant` | 15 |
| `facilitator` | `agenttrust://docs/integration-guides/facilitator-adapters` | 26 |
| `kani` | `agenttrust://docs/reference/formal-verification` | 8 |
| `gate_payment` | `agenttrust://docs/getting-started/architecture-overview` | 1 |

For `validation registry` the score-1 hit is the custom-attestor doc
because of higher keyword density; the canonical
`programs/validation-registry` doc lands at rank 2 with score 23. Both
are relevant; future docs work could re-balance the scoring to put the
program reference first.

## Findings

- All 6 on-chain artifacts the public docs reference are live on devnet.
- All 3 external service URLs resolve (Vercel 200, npm package live,
  GitHub repo accessible via authed paths).
- SDK tarball ships every module's `.d.ts`.
- MCP docs search returns relevant hits for every probe query.
- One non-blocker: the **published** npm 0.1.0's `homepage` field still
  points to the pre-rebrand mohit-1710 URL. Source is already updated
  for the next publish.
