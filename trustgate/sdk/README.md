# agentrustt

> Drop-in TrustGate middleware for x402 facilitators on Solana. Adds
> `gate_payment + emit_feedback` to any Express app with atomic-tx
> invariant enforcement.
>
> npm: [`agentrustt`](https://www.npmjs.com/package/agentrustt) ·
> repo: [`mohit-1710/agenttrust`](https://github.com/mohit-1710/agenttrust)

**AgentTrust completes the Solana Foundation's ERC-8004 trust stack** —
this package is the TypeScript surface that lets x402 facilitators
(Dexter, atxp_ai, MCPay, Corbits, Latinum) integrate AgentTrust in a day.

## Install

```bash
pnpm add agentrustt
# or
npm install agentrustt
# or
yarn add agentrustt
```

> **Naming note.** The npm package is `agentrustt` (double-t — `@agenttrust`
> on npm was claimed before AgentTrust the project existed). Imports use
> the same name.

Peer dep: `express ^4.21` (only needed if you mount the middleware).

## Two import surfaces

```ts
import { mountTrustGate } from "agentrustt/express";
import { gatePayment, settle, dispute } from "agentrustt/client";
```

Plus a root namespace with the atomicity guard, PDA derivations, and
shared types:

```ts
import {
  AtomicityEnforced, AtomicityNotEnforcedError,
  derivePolicyPda, DEFAULT_DEVNET_PROGRAM_IDS,
} from "agentrustt";
```

## Quick start — Express middleware

```ts
import express from "express";
import { Keypair } from "@solana/web3.js";
import { mountTrustGate } from "agentrustt/express";

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
- `POST /settle` and `POST /dispute` — atomic-tx assembly stubs
  (501 Not Implemented in v0.1; full transaction builders ship in v0.2
  alongside the Phase 9 E2E integration).

## Quick start — client helpers

```ts
import { Keypair, PublicKey } from "@solana/web3.js";
import { gatePayment } from "agentrustt/client";

const decision = await gatePayment({
  rpcUrl:          "https://api.devnet.solana.com",
  caller:          facilitatorKeypair,
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

## Formal verification

PolicyVault's five core safety properties are machine-checked by Kani:

1. `paused_implies_no_allow` — KillSwitch paused ⇒ never Allow
2. `velocity_counter_le_limit` — Allow preserves cumulative ≤ max
3. `counterparty_tier_monotone` — strict pass ⇒ loose pass
4. `validation_expiry_correct` — expired attestation ⇒ never Allow
5. `multisig_threshold_enforced` — distinct signer count ≥ threshold

CI runs all 5 on every PR. See `.github/workflows/kani-prove.yml` in the
[main repo](https://github.com/mohit-1710/agenttrust).

## License

MIT. © 2026 AgentTrust contributors.
