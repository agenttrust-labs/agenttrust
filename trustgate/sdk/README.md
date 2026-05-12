# @agenttrust-sdk/trustgate

> Drop-in TrustGate middleware for x402 facilitators on Solana. Adds
> `gate_payment + emit_feedback` to any Express app with atomic-tx
> invariant enforcement.
>
> npm: [`@agenttrust-sdk/trustgate`](https://www.npmjs.com/package/@agenttrust-sdk/trustgate) ·
> repo: [`agenttrust-labs/agenttrust`](https://github.com/agenttrust-labs/agenttrust)
>
> Component of the **AgentTrust** project (PolicyVault + TrustGate +
> ValidationRegistry). This SDK ships the TrustGate component.

**AgentTrust completes the Solana Foundation's ERC-8004 trust stack** —
this package is the TypeScript surface that lets x402 facilitators
(**Pay.sh** ★ default · Dexter · atxp · MCPay) integrate AgentTrust in a day.

★ Pay.sh is the Solana Foundation's first x402 facilitator,
[launched 2026-05-05 with Google Cloud](https://solana.com/news/solana-foundation-launches-pay-sh-in-collaboration-with-google-cloud).
AgentTrust ships day-one Pay.sh adapter as the canonical reference impl.

> **Companion package:** [`@agenttrust-sdk/mcp`](https://www.npmjs.com/package/@agenttrust-sdk/mcp) —
> 18-tool MCP server. Drop into Claude Desktop / Cursor with
> `npx @agenttrust-sdk/mcp` and query the deployed AgentTrust programs
> via natural language.

## Breaking changes (0.2.0)

The `ProgramIds` shape and the `DEFAULT_DEVNET_PROGRAM_IDS` constant changed:

| 0.1.x | 0.2.0 |
|---|---|
| `ProgramIds.trustgate` | `ProgramIds.trustGate` (camelCase, matches `policyVault`) |
| `ProgramIds = { policyVault, trustgate }` | `ProgramIds = { policyVault, trustGate, validationRegistry }` |

**One-line migration in consumer code:** search-and-replace `.trustgate` →
`.trustGate` for every `programIds.*` / `DEFAULT_DEVNET_PROGRAM_IDS.*`
field access. The new `validationRegistry` field defaults to the live
devnet program ID `Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv`; previous
callers who imported `VALIDATION_REGISTRY_DEVNET_ID` separately can keep
that import or switch to `DEFAULT_DEVNET_PROGRAM_IDS.validationRegistry`.

```ts
// 0.1.x
import { DEFAULT_DEVNET_PROGRAM_IDS } from "@agenttrust-sdk/trustgate";
DEFAULT_DEVNET_PROGRAM_IDS.trustgate.toBase58();

// 0.2.0
import { DEFAULT_DEVNET_PROGRAM_IDS } from "@agenttrust-sdk/trustgate";
DEFAULT_DEVNET_PROGRAM_IDS.trustGate.toBase58();
DEFAULT_DEVNET_PROGRAM_IDS.validationRegistry.toBase58();   // new
```

## Install

```bash
pnpm add @agenttrust-sdk/trustgate
# or
npm install @agenttrust-sdk/trustgate
# or
yarn add @agenttrust-sdk/trustgate
```

Peer dep: `express ^4.21` (only needed if you mount the middleware).

## Two import surfaces

```ts
import { mountTrustGate } from "@agenttrust-sdk/trustgate/express";
import { gatePayment, settle } from "@agenttrust-sdk/trustgate/client";
```

Plus a root namespace with the atomicity guard, PDA derivations, and
shared types:

```ts
import {
  AtomicityEnforced, AtomicityNotEnforcedError,
  derivePolicyPda, DEFAULT_DEVNET_PROGRAM_IDS,
} from "@agenttrust-sdk/trustgate";
```

Every named module is also reachable via subpath import, e.g.
`@agenttrust-sdk/trustgate/atomicity`, `@agenttrust-sdk/trustgate/chain`,
`@agenttrust-sdk/trustgate/emit-feedback`,
`@agenttrust-sdk/trustgate/onchain-validator`,
`@agenttrust-sdk/trustgate/quantu`, `@agenttrust-sdk/trustgate/spl`,
`@agenttrust-sdk/trustgate/types`,
`@agenttrust-sdk/trustgate/validation-registry`, and
`@agenttrust-sdk/trustgate/x402`. Each subpath maps to a single file in
the package — useful when a consumer wants tighter tree-shaking than the
root re-export bundle.

## Quick start — Express middleware

```ts
import express from "express";
import { Keypair } from "@solana/web3.js";
import { mountTrustGate } from "@agenttrust-sdk/trustgate/express";

const app = express();
app.use(express.json());

const facilitatorKeypair = Keypair.fromSecretKey(/* your facilitator key */);

await mountTrustGate(app, {
  rpcUrl:             "https://api.devnet.solana.com",
  facilitatorKeypair,
  network:            "solana-devnet",
  // THIS FIELD IS REQUIRED — see "Atomic-tx invariant" below.
  atomicityEnforced:  true,
});

app.listen(3000);
```

You now have:

- `POST /verify` — read-only `gate_payment` simulation. Returns 200/Allow,
  402/Deny + reason headers, or 402/RequireValidation + capability hash.
- `GET /receipt/:paymentIdHashHex` — looks up the on-chain
  `FeedbackEmissionLog` PDA. Returns `{ exists: false }` until the
  payment settles.

`mountTrustGate` intentionally mounts only the two read-only routes.
The write-path routes (`POST /settle`, `POST /dispute`) live in the
companion `@agenttrust/trustgate-server` package's
`mountFacilitatorRoutes` — that's the canonical home of the keypair /
x402 registry wiring. Use `client.settle(...)` directly for the atomic
settle path from a TypeScript backend, or mount the server routes if
you need HTTP-shaped `/settle`. `dispute_payment` exists on-chain; a
typed SDK composer for it is a tracked follow-up — build the
`disputePayment` tx directly via `loadTrustGate(provider).methods` in
the meantime.

The `facilitatorKeypair` field accepts `Keypair | PublicKey |
{ publicKey: PublicKey }`. The middleware only reads the pubkey
(gate_payment simulation runs with `sigVerify: false`); passing a
`Keypair` is fine but not required.

## Quick start — client helpers

```ts
import { PublicKey } from "@solana/web3.js";
import { gatePayment } from "@agenttrust-sdk/trustgate/client";

// `caller` accepts a full Keypair OR a pubkey-only shape — the simulate
// path runs with sigVerify: false, so no signing occurs. Pass a
// pubkey-only object from a read-only context to avoid handling secret
// keys; pass a Keypair when calling `settle` afterwards.
const decision = await gatePayment({
  rpcUrl:          "https://api.devnet.solana.com",
  caller:          { publicKey: new PublicKey("...") },
  payerAgentAsset: new PublicKey("..."),
  payeeAgentAsset: new PublicKey("..."),
  amount:          1_000_000n, // 1 USDC w/ 6 decimals
  mint:            new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), // USDC devnet
  policyId:        1,
});

switch (decision.kind) {
  case "Allow":             /* proceed with payment */ break;
  case "Deny":              /* show user decision.reasonName */ break;
  case "RequireValidation": /* route user to validation flow with decision.capabilityHash */ break;
}
```

## Atomic-tx invariant

`gate_payment + spl-token transfer + emit_feedback` MUST execute in
**one** Solana transaction. Splitting them across two transactions opens
a real footgun on Token-2022 mints with `TransferHook`:

1. Tx1: `gate_payment` returns Allow → `VelocityLedger.cumulative += amount`
2. Tx2: SPL transfer → `TransferHook` reverts (compliance check fails)
3. `VelocityLedger` is now corrupted: counted a payment that never happened

The SDK enforces atomicity at **two layers**:

- **Compile-time literal type guard.** The `AtomicityEnforced` marker is
  `{ atomicityEnforced: true }` — a literal `true`, not `boolean`. TS
  rejects callers passing `false` or omitting the field.
- **Runtime throw.** Every entry point validates `atomicityEnforced ===
  true` and throws `AtomicityNotEnforcedError` otherwise. Stops `as any`
  escape-hatches cold.

Both layers required: skipping either one re-opens the corruption vector.
This is the load-bearing safety property of the SDK.

## On-chain programs (devnet)

| Program | Address |
|---------|---------|
| `policy_vault` | `8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR` |
| `trustgate` | `HF8zHfoyA7b5mhLViopTnRMprc6ZT5KActHTdkFrih2N` |
| `validation_registry` | `Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv` |

Override via the `programIds` config field for mainnet redeploys.
`MAINNET_PROGRAM_IDS` is exported from the root namespace but is
currently `undefined` — AgentTrust has not deployed to mainnet-beta
yet. Mainnet callers must pass an explicit `ProgramIds` object built
from the live mainnet pubkeys. The `loadValidationRegistry` loader
refuses to apply the devnet default on a non-devnet RPC (URL heuristic
check) and throws with a remediation pointer.

All three Anchor IDLs are published on devnet. Verify with:

```bash
anchor idl fetch <programId> --provider.cluster devnet
```

`loadPolicyVault` / `loadTrustGate` / `loadValidationRegistry` fetch the
IDL from chain by default. Pass an explicit `idl` argument to use a bundled
snapshot instead — useful when avoiding an extra RPC hop in latency-
sensitive paths or when running against a freshly redeployed program
before `anchor idl upgrade` has run.

## Formal verification

PolicyVault's five core safety properties are machine-checked by Kani:

1. `paused_implies_no_allow` — KillSwitch paused ⇒ never Allow
2. `velocity_counter_le_limit` — Allow preserves cumulative ≤ max
3. `counterparty_tier_monotone` — strict pass ⇒ loose pass
4. `validation_expiry_correct` — expired attestation ⇒ never Allow
5. `multisig_threshold_enforced` — distinct signer count ≥ threshold

CI runs all 5 on every PR. See `.github/workflows/kani-prove.yml` in the
[main repo](https://github.com/agenttrust-labs/agenttrust).

## License

MIT. © 2026 AgentTrust contributors.
