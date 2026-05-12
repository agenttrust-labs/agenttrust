# @agenttrust/trustgate-server

Private reference impl of the AgentTrust TrustGate facilitator server.
Wraps the public `@agenttrust-sdk/trustgate` SDK with Express route
binders and concrete adapters (Pay.sh, Dexter, Atxp, MCPay, Mock). This
package is `"private": true` in package.json. It is NOT published to
npm. Integrators who want to embed the same flow in their own server
should depend on `@agenttrust-sdk/trustgate` and use
`makePayShFacilitator` from that package's `facilitator-factory` entry.

The hosted facilitator at `https://api.agenttrust.tech` runs the
`startProduction` entry point of this package, built into
`dist/production.js` and shipped via the Dockerfile.

## What this package is

Three concentric layers:

1. `mountFacilitatorRoutes(app, deps)` binds the four x402 endpoints
   onto any Express app. The SDK only ships read-only `/verify` +
   `/receipt`; the write-path `/settle` + `/dispute` lives here.
2. `FacilitatorRegistry` plus the per-protocol adapters (`PaySh`,
   `Dexter`, `Atxp`, `McPay`, `MockFacilitator`). Each implements the
   `FacilitatorAdapter` interface in `src/facilitators/types.ts`.
   Dispatch happens via `X-Facilitator` header, env override, or a
   programmatic default.
3. `startServer(cfg)` is the minimal smoke-test boot.
   `startProduction(cfg)` is the hosted target (rate limits, healthz,
   Quantu resolver wiring, IDL snapshots).

## Boot

### Required env

| Variable | Description |
|---|---|
| `FACILITATOR_KEYPAIR_B58` | Base58-encoded 64-byte secret key for the facilitator signer. Required unless `FACILITATOR_KEYPAIR_JSON` is set. |
| `FACILITATOR_KEYPAIR_JSON` | Solana CLI keypair JSON (64-byte number array). Fallback when the base58 env is unset. |
| `RPC_URL` | Solana RPC endpoint. Defaults to `https://api.devnet.solana.com`. |
| `NETWORK` | Cluster slug (`solana-devnet` / `solana-mainnet` / `localnet`). Defaults to `solana-devnet`. |
| `PORT` | HTTP port. Default 3000 for `startServer`, 8080 for `startProduction`. |
| `TRUSTGATE_DEFAULT_FACILITATOR` | Optional default adapter name at boot. |

The server refuses to boot if neither `FACILITATOR_KEYPAIR_B58` nor
`FACILITATOR_KEYPAIR_JSON` is set. Previous behaviour silently fell
back to `Keypair.generate()` with zero lamports; every `/settle` then
failed at sendTransaction with an opaque insufficient-funds error.

### Mainnet env (for `startProduction`)

`startProduction` hard-throws on `NETWORK=solana-mainnet` unless every
AgentTrust program ID is pinned via env:

| Variable | Description |
|---|---|
| `POLICY_VAULT_PROGRAM_ID` | base58 pubkey for policy_vault on mainnet |
| `TRUSTGATE_PROGRAM_ID` | base58 pubkey for trustgate on mainnet |
| `VALIDATION_REGISTRY_PROGRAM_ID` | base58 pubkey for validation_registry on mainnet |

Mainnet AgentTrust programs aren't deployed yet. Quantu (agent_registry
+ atom_engine) IS deployed on both clusters; `startProduction`
switches to `MAINNET_QUANTU_IDS` automatically on the mainnet slug.

### Optional knobs

| Variable | Description |
|---|---|
| `STRICT_RESOLVERS` | `true` hard-fails boot when the counterparty map is missing (instead of warning). |
| `PAYSH_DEBUG` | `1` surfaces PaySh signature-verification debug lines on stderr. Off in production. |
| `NODE_ENV` | `development` also enables PaySh debug lines. |

## Smoke test

```
curl -sI https://api.agenttrust.tech/healthz
curl -sI https://demo.agenttrust.tech/protected
```

`/healthz` returns 200 with JSON metadata (facilitatorPubkey,
balanceLamports, adapter list, counterparty count). `/protected`
returns 402 with `payment-required` + `x-payment-required` headers
to prove the end-to-end x402 + AgentTrust headers shape is intact.

## Endpoints

`mountFacilitatorRoutes(app, deps)` adds four routes:

- `POST /verify`: read-only gate_payment simulation. Returns 200/Allow,
  402/Deny with reason headers, or 402/RequireValidation with
  capability hash. 400 on adapter-rejected requests (PaySh surfaces
  `reason` + `detail` for `schema_invalid` / `signature_invalid` /
  `expired` / `network_mismatch`).
- `POST /settle`: atomic settlement. Validates the on-chain payment
  proof, emits the trustgate::emit_feedback CPI, returns feedback
  signature + facilitator metadata. 501 from stub adapters.
- `GET /receipt/:paymentIdHashHex`: FeedbackEmissionLog PDA lookup.
  Returns `{ exists: false }` until the payment settles.
- `POST /dispute`: API-symmetric; the on-chain instruction is wired
  but the SDK composer is a tracked follow-up.

`startProduction` adds `GET /healthz` (Fly + status-page polling).
Rate limit: 60 req/min/IP on `/verify` + `/settle`.

## Embedding the flow in your own server

Depend on `@agenttrust-sdk/trustgate` (this server package is not on
npm) and use the public factory:

```ts
import { Connection, Keypair } from "@solana/web3.js";
import {
  DEFAULT_DEVNET_PROGRAM_IDS, DEFAULT_DEVNET_QUANTU_IDS,
  loadTrustGate, makeProvider, makePayShFacilitator,
} from "@agenttrust-sdk/trustgate";

const connection         = new Connection("https://api.devnet.solana.com", "confirmed");
const facilitatorKeypair = Keypair.fromSecretKey(/* your facilitator key */);
const provider           = makeProvider({ rpcUrl: "https://api.devnet.solana.com", wallet: facilitatorKeypair });
const trustgate          = await loadTrustGate(provider, DEFAULT_DEVNET_PROGRAM_IDS.trustGate);

const deps = makePayShFacilitator({
  connection, facilitatorKeypair,
  resolveQuantu:  yourResolverHere,
  programIds:     DEFAULT_DEVNET_PROGRAM_IDS,
  quantuIds:      DEFAULT_DEVNET_QUANTU_IDS,
  trustgate,
  signingNetwork: "solana-devnet",
});
```

`deps` feeds `new PaySh(deps)`. See the SDK README for the full
wiring snippet including `makeDefaultRegistry`.

## Production ops notes

- `ReplayCache` ships in-memory only. Restart wipes the
  (signature, paymentIdHash) bindings and re-opens an anti-replay
  window. Pass a persistent `ReplayCacheLike` (Redis-backed or
  similar) via `PayShDeps.replayCache` for production. The in-memory
  default is fine for unit tests and single-process hackathon demos.
- Anchor IDL fetch is the default path for `loadPolicyVault` /
  `loadTrustGate`. `startProduction` bundles IDL JSON snapshots and
  threads them through to skip the RPC hop and to dodge the
  @coral-xyz/anchor 0.31 vs CLI 1.0+ IDL deserialise mismatch.
- The facilitator signer needs SOL for the `emit_feedback` CPI (rent
  for the FeedbackEmissionLog PDA plus tx fees). Boot prints the
  signer pubkey and balance to stderr; zero balance triggers a WARNING
  log line.

## License

MIT.
