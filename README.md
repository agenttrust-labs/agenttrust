# AgentTrust

> **AgentTrust completes the Solana Foundation's ERC-8004 trust stack.** Three Anchor programs that turn Quantu's IdentityRegistry + ReputationRegistry primitives into a full agent-payment trust system: programmable spending policies, x402 facilitator integration, and capability attestation. **Five formally-verified safety properties.** Drop-in TypeScript SDK.

[![Web app](https://img.shields.io/badge/web-live-c2410c?style=flat-square)](https://agenttrust-puj6nnyh0-mohit-kumars-projects.vercel.app)
[![npm](https://img.shields.io/npm/v/@agenttrust-sdk/trustgate?style=flat-square&color=c2410c)](https://www.npmjs.com/package/@agenttrust-sdk/trustgate)
[![Kani 5/5](https://img.shields.io/badge/kani-5%2F5_proven-c2410c?style=flat-square)](.github/workflows/kani-prove.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-c2410c?style=flat-square)](./LICENSE)

Submitted to the **Solana Frontier 2026** hackathon by [@mohit-1710](https://github.com/mohit-1710).

---

## The pitch in one paragraph

Quantu Labs shipped two of the three ERC-8004 legs on Solana — `agent-registry-8004` (IdentityRegistry + ReputationRegistry). The third leg, **ValidationRegistry**, was archived in v0.5.0 pending a redesign. AgentTrust productizes that third leg AND introduces a policy-as-code primitive (PolicyVault) plus an x402-native facilitator surface (TrustGate) that consume Quantu's existing primitives via byte-precise PDA reads. Drop-in via npm. Built on top of Foundation-aligned primitives, not parallel to them.

---

## The three components

### 1 · PolicyVault — programmable spending policies

The policy-as-code engine. Five orthogonal policy kinds composed under one `gate_payment` instruction with **fail-fast semantics**:

| # | Policy kind | What it does |
|---|-------------|--------------|
| 1 | `KillSwitch` | Multisig-controlled emergency pause (1..=7 members) |
| 2 | `Spending` | Per-tx + daily (UTC midnight) + weekly (ISO Monday) limits |
| 3 | `Velocity` | Sliding-window cumulative spend, tier-decay (¼, ½, ¾, 1×, 5⁄4×) |
| 4 | `CounterpartyTier` | Reads Quantu `AtomStats.trust_tier` (byte 551) — the wedge |
| 5 | `RequireValidation` | Gates against ValidationAttestation PDA (capability proof) |

Manual byte-offset deserialization of Quantu PDAs (Pattern B per playbook §02-A) — **zero Cargo dep on Quantu's crate**. Schema-version canary at byte 560 catches breaking changes early.

**Five Kani-proven invariants** (machine-checked via [model-checking/kani](https://github.com/model-checking/kani)):

| # | Invariant | Sub-checks | Time |
|---|-----------|-----------:|-----:|
| 1 | `paused_implies_no_allow` — KillSwitch paused ⇒ never Allow | 126 | 0.20s |
| 2 | `velocity_counter_le_limit` — Allow preserves cumulative ≤ max | 9 | 0.03s |
| 3 | `counterparty_tier_monotone` — strict pass ⇒ loose pass | 8 | 0.02s |
| 4 | `validation_expiry_correct` — expired attestation ⇒ never Allow | 85 | 0.21s |
| 5 | `multisig_threshold_enforced` — distinct signer count ≥ threshold | 149 | 62.55s |

**Total: 377 sub-checks, 5/5 proven, ~63s.** CI ([`.github/workflows/kani-prove.yml`](.github/workflows/kani-prove.yml)) runs all five on every PR.

**Devnet:** [`8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR`](https://explorer.solana.com/address/8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR?cluster=devnet)

### 2 · TrustGate — x402 facilitator integration

Anchor program (`emit_feedback` PDA-signed CPI to `give_feedback` + `dispute_payment`) **plus** a TypeScript SDK published on npm. Drop-in middleware for any x402 facilitator's Express app:

```ts
import express from "express";
import { Keypair } from "@solana/web3.js";
import { mountTrustGate } from "@agenttrust-sdk/trustgate/express";

const app = express();
app.use(express.json());

await mountTrustGate(app, {
  rpcUrl:             "https://api.devnet.solana.com",
  facilitatorKeypair: Keypair.fromSecretKey(/* … */),
  network:            "solana-devnet",
  atomicityEnforced:  true, // literal `true` — TS compile error on `false`
});

app.listen(3000);
```

You now have `POST /verify`, `POST /settle`, `POST /dispute`, and `GET /receipt/:hash` on your facilitator. x402-spec headers automatic.

**Atomic-tx invariant:** `gate_payment + transfer + emit_feedback` MUST execute as ONE Solana transaction. Splitting opens a real footgun on Token-2022 mints with `TransferHook` (per `docs/plan/research/02-anchor-token2022-cpi-class.md §A.2`). The SDK enforces atomicity at **two layers** — compile-time literal-type guard `{ atomicityEnforced: true }` + runtime `assertAtomicityEnforced` throw. Skipping either layer re-opens the corruption vector.

**Devnet:** [`HF8zHfoyA7b5mhLViopTnRMprc6ZT5KActHTdkFrih2N`](https://explorer.solana.com/address/HF8zHfoyA7b5mhLViopTnRMprc6ZT5KActHTdkFrih2N?cluster=devnet) · **npm:** [`@agenttrust-sdk/trustgate`](https://www.npmjs.com/package/@agenttrust-sdk/trustgate)

### 3 · ValidationRegistry — capability attestation

The third ERC-8004 leg Quantu archived in v0.5.0, productized. Permissionless namespace + attestor self-registration; downstream-consumer-filtering is the v1 sybil-resistance model (PolicyVault stores `accepted_attestors[]` per-policy). Audit-trail-preserving revocation per ERC-8004 spec.

| Surface | Detail |
|---------|--------|
| PDAs | `CapabilityNamespace`, `AttestorProfile`, `ValidationRequest`, `ValidationAttestation` |
| Instructions | `register_namespace`, `register_attestor`, `request_validation`, `respond_to_validation`, `revoke_validation` |
| v1 capability namespaces | KYC tier-1/2/3 · audit (Halborn, OtterSec) · model-card (Anthropic, OpenAI) · jurisdiction · compliance.payments · agent-source |
| Ed25519 sysvar verify | v1.1+ deliverable per playbook §A.4 (v1 attestor signs via tx signature; non-repudiation against future key compromise needs sysvar pattern) |

**Devnet:** [`Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv`](https://explorer.solana.com/address/Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv?cluster=devnet)

---

## Architecture at a glance

```
┌───────────────────────────────────────────────────────────────────────┐
│  Facilitator (Dexter / atxp_ai / MCPay / Corbits / Latinum)           │
│                                                                       │
│   import { mountTrustGate } from "@agenttrust-sdk/trustgate/express"  │
│   await mountTrustGate(app, { atomicityEnforced: true, … })           │
└───────────────────────────────────────────────────────────────────────┘
                              │
                              ▼  POST /verify | /settle | /dispute
       ┌──────────────────────────────────────────────────────────┐
       │  TrustGate (Anchor program)                              │
       │  ├─ init_authority (per-facilitator PDA)                 │
       │  ├─ emit_feedback  ── PDA-signed CPI ──┐                 │
       │  └─ dispute_payment                    │                 │
       └─────────────────┬──────────────────────┼─────────────────┘
                         │                      │
                         │ CPI                  │ CPI
                         ▼                      ▼
       ┌─────────────────────────────┐  ┌──────────────────────────────┐
       │  PolicyVault                │  │  Quantu agent-registry-8004  │
       │  ├─ gate_payment composer   │  │  ├─ give_feedback            │
       │  │   (fail-fast 5 policies) │  │  └─ atom-engine::AtomStats   │
       │  ├─ KillSwitch • Spending   │  │     (tier @ byte 551)        │
       │  ├─ Velocity • Counterparty │  │                              │
       │  └─ RequireValidation       │  │  Pinned commit: bfb09ad      │
       │                             │  │  Read via byte-offset parser │
       │  Reads → ValidationAttestation │     (zero Cargo dep)         │
       └─────────────────┬───────────┘  └──────────────────────────────┘
                         │
                         ▼
       ┌──────────────────────────────────────────┐
       │  ValidationRegistry                      │
       │  ├─ register_namespace / _attestor       │
       │  ├─ request / respond / revoke           │
       │  └─ ValidationAttestation PDA            │
       │     (read by PolicyVault parser)         │
       └──────────────────────────────────────────┘
```

---

## Quick start

### Install the SDK

```bash
pnpm add @agenttrust-sdk/trustgate
# or: npm install @agenttrust-sdk/trustgate
```

### Verify a payment (read-only)

```ts
import { Keypair, PublicKey } from "@solana/web3.js";
import { gatePayment } from "@agenttrust-sdk/trustgate/client";

const decision = await gatePayment({
  rpcUrl:          "https://api.devnet.solana.com",
  caller:          facilitatorKeypair,
  payerAgentAsset: new PublicKey("…"),
  payeeAgentAsset: new PublicKey("…"),
  amount:          1_000_000n,                     // 1 USDC (6 decimals)
  mint:            new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
  policyId:        1,
});

switch (decision.kind) {
  case "Allow":             /* proceed with payment */ break;
  case "Deny":              console.log(decision.reasonName); break;
  case "RequireValidation": /* route to validation flow with capabilityHash */ break;
}
```

### Mount the middleware

See the snippet in [Component 2 — TrustGate](#2--trustgate--x402-facilitator-integration) above.

---

## Live devnet trace

**Two complete end-to-end flows live on Solana devnet — both captured 2026-05-06.**

### Pay.sh + AgentTrust atomic settlement

A real signed SPL transfer flowed through the demo's `/protected` endpoint, completed gate_payment + transfer + emit_feedback, and wrote a `FeedbackEmissionLog` PDA on chain.

| step | tx signature |
|---|---|
| **emit_feedback** (PDA-signed CPI to `agent_registry::give_feedback` → `atom_engine::update_stats`) | [`jMobmWJUAXuL8FmQujfxW9NmeMbzADUoABzqjiMeuc5m3YXyeuZeUw1ZJc29JGsqyWQGDY8q3vrtBdamhKXraag`](https://explorer.solana.com/tx/jMobmWJUAXuL8FmQujfxW9NmeMbzADUoABzqjiMeuc5m3YXyeuZeUw1ZJc29JGsqyWQGDY8q3vrtBdamhKXraag?cluster=devnet) |
| **signed SPL transferChecked** (the payment proof Pay.sh's CLI would produce) | [`5iV8EYmJh9XSXkBQrrbQ5L9kmBQabD3G3RXVPsHn9PkWceTFoeRsUV4g5aLLzZyRjeBoFvK3Woxr2cZa5xeUwhVD`](https://explorer.solana.com/tx/5iV8EYmJh9XSXkBQrrbQ5L9kmBQabD3G3RXVPsHn9PkWceTFoeRsUV4g5aLLzZyRjeBoFvK3Woxr2cZa5xeUwhVD?cluster=devnet) |

**On-chain artifacts** (click to inspect):

- `FeedbackEmissionLog` PDA: [`HB4BBi9jaD3VPcZkQQaH3DxukSqBiXfW8RejtaLa8bF3`](https://explorer.solana.com/address/HB4BBi9jaD3VPcZkQQaH3DxukSqBiXfW8RejtaLa8bF3?cluster=devnet) — owned by trustgate, score=100, slot 460466788
- Tier-3 `agent_account`: [`5PfaofvEUf3adtJwMho7zzbfvgxwxbvp2V5moqhtLK8y`](https://explorer.solana.com/address/5PfaofvEUf3adtJwMho7zzbfvgxwxbvp2V5moqhtLK8y?cluster=devnet)
- Tier-3 `atom_stats`: [`4z9RiK6B49QZbmqPM9yNZWgfxYD3tvQ3NETU6X89f5mv`](https://explorer.solana.com/address/4z9RiK6B49QZbmqPM9yNZWgfxYD3tvQ3NETU6X89f5mv?cluster=devnet)
- Asset (Metaplex Core): [`C6cuZeDT4kmCC1RXw8mzaoLGwmAMe5fHDvutAjicVi8B`](https://explorer.solana.com/address/C6cuZeDT4kmCC1RXw8mzaoLGwmAMe5fHDvutAjicVi8B?cluster=devnet)
- Facilitator authority PDA: [`4TWqmxoMQRSJTmH879TDWqvqgiEwr9akWnpPVg51Z5Bg`](https://explorer.solana.com/address/4TWqmxoMQRSJTmH879TDWqvqgiEwr9akWnpPVg51Z5Bg?cluster=devnet)

Reproduce locally:

```bash
# 1. publish IDLs (one-time, ~0.03 SOL)
anchor idl init --provider.cluster devnet --filepath target/idl/trustgate.json HF8zHfoyA7b5mhLViopTnRMprc6ZT5KActHTdkFrih2N
anchor idl init --provider.cluster devnet --filepath target/idl/policy_vault.json 8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR
anchor idl init --provider.cluster devnet --filepath target/idl/validation_registry.json Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv

# 2. pre-warm 3 Quantu agents (one-time, ~0.04 SOL)
pnpm --filter ./examples/pay-sh-demo exec ts-node scripts/prewarm-devnet.ts

# 3. run the smoke (~0.03 SOL)
pnpm --filter ./examples/pay-sh-demo exec ts-node scripts/devnet-smoke.ts
```

The full trace (signatures, PDAs, slot numbers) lands in `examples/pay-sh-demo/devnet-smoke.json`. Re-running is idempotent — TrustGateAuthority, test mint, payer keypair, and ATAs are reused if present.

### ValidationRegistry — the third ERC-8004 leg, full lifecycle

All 5 ValidationRegistry instructions exercised end-to-end against the
deployed devnet program. Subject = the same Quantu tier-3 agent the Pay.sh
trace used; capability = `usdc-payment-policy.v1`.

| step | tx |
|---|---|
| **register_namespace** | [`5B3PfDGYhzhusJwj…`](https://explorer.solana.com/tx/5B3PfDGYhzhusJwjXURnhpkZ2umipdegfNREtJbcgZySR7nr976CcSJXqYSzB8eSYT14W3yrzGuks75S7pdZD3WK?cluster=devnet) |
| **register_attestor** | [`Ct3SQ4CR9bu6oijR…`](https://explorer.solana.com/tx/Ct3SQ4CR9bu6oijRELe7pnjj8KfMRVDiQ3AkytNQtYfF2yZBsThMJNoCDADnwWp37PYcsFJSEkBjXmaLY9a9eQD?cluster=devnet) |
| **request_validation** | [`qBQzSTCWfkE9Xw1E…`](https://explorer.solana.com/tx/qBQzSTCWfkE9Xw1EZ2qRwo3Hv451cbVaTRKSa32KHpnL7sfCSVBEhjGinm5qod6W6LtCgAj7xvbhydHf1wjoKq9?cluster=devnet) |
| **respond_to_validation** | [`CCxKvvQ9ZdboukcX…`](https://explorer.solana.com/tx/CCxKvvQ9ZdboukcXPp9jj1a3o53grGR9VjZux7kS1AAWqaVnRXVqhJjphsM1QYjny5oaVP4oRGThBLUQ41DyzwC?cluster=devnet) |

**`ValidationAttestation` PDA** — the artifact PolicyVault's
`RequireValidation` policy reads to flip a Deny back to Allow:
[`C6Yr7oKcZ6sDVibR35SWbFnGCXyfQjLeRCiPbjxYq6vY`](https://explorer.solana.com/address/C6Yr7oKcZ6sDVibR35SWbFnGCXyfQjLeRCiPbjxYq6vY?cluster=devnet)

Reproduce: `pnpm --filter ./examples/attestor-demo run smoke` (~0.012 SOL
total). Full trace in `examples/attestor-demo/devnet-attestor-trace.json`.

---

## Verification — don't trust this README

Every claim on this page is independently checkable. From your terminal:

```bash
# verify all 3 programs are executable on devnet
for p in 8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR \
         HF8zHfoyA7b5mhLViopTnRMprc6ZT5KActHTdkFrih2N \
         Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv; do
  solana program show "$p" --url devnet | grep Executable
done

# install + test the SDK
pnpm add @agenttrust-sdk/trustgate
cat node_modules/@agenttrust-sdk/trustgate/package.json | jq '{ name, version, exports }'

# clone and run the Kani proofs
git clone https://github.com/agenttrust-labs/agenttrust && cd agenttrust
cargo install --locked kani-verifier
cargo kani --manifest-path programs/policy-vault/Cargo.toml \
  --harness paused_killswitch_implies_no_allow

# run the Anchor TS test suite
anchor test --skip-deploy --provider.cluster devnet
```

---

## Repo layout

```
agenttrust/
├── programs/
│   ├── policy-vault/           # 5 policy kinds + Kani proofs
│   ├── trustgate/              # x402 facilitator + give_feedback CPI
│   └── validation-registry/    # capability attestation
├── trustgate/
│   ├── server/                 # Express x402 reference impl
│   └── sdk/                    # @agenttrust-sdk/trustgate npm package
├── tests/                      # Anchor TS integration tests
├── web/                        # Next.js landing + dashboard (Vercel)
└── .github/workflows/
    ├── build.yml               # cargo + anchor build
    ├── kani-prove.yml          # 5 Kani invariants on every PR
    └── ts-test.yml             # SDK + server + web build
```

---

## Test coverage

| Layer | Count | Where |
|-------|-------|-------|
| Rust unit tests | 113 | `cargo test --workspace --lib` |
| Kani proofs | 5 invariants, 377 sub-checks | `cargo kani` per `proofs/*` |
| Anchor TS integration | 32 | `anchor test --provider.cluster devnet` |
| SDK unit tests | 13 | `cd trustgate/sdk && pnpm test` |
| Server unit tests | 5 | `cd trustgate/server && pnpm test` |
| **Total** | **168 tests + 5 formal proofs** | All passing on devnet |

---

## What's deferred to v1.1+

- **Ed25519 sysvar verify in `respond_to_validation`** — v1 attestor signs the tx (sufficient for hackathon demo); v1.1 mirrors Quantu's `set_agent_wallet` pattern for non-repudiation against future key compromise.
- **Stake-weighted attestor scoring + slashing** — v1 ships permissionless attestor + downstream-consumer-filtering. v1.1 adds `staked_amount` on `AttestorProfile`; v2 adds slashing arbitration.
- **AgentAccount.owner cross-program check on `init_authority`** — v1 has a documented bootstrap-race (anyone can init_authority for any agent first). v1.1+ closes via reading byte 72 of Quantu's AgentAccount.
- **Cross-chain attestation portability** — same `capability_hash` working across Base / Polygon / Arbitrum ERC-8004 implementations. Phase-3 deliverable (Day 60+).

These are explicit, scoped, tracked. None are blocking the v1 demo or the Foundation-alignment narrative.

---

## Acknowledgments

- **Quantu Labs** — `8004-solana` (IdentityRegistry + ReputationRegistry + atom-engine), MIT license. AgentTrust reads their PDAs via byte-precise parsers; pinned commit `bfb09ad`.
- **Solana Foundation** — ERC-8004 endorsement, x402 spec, Anchor framework.
- **Model Checking @ AWS / Kani team** — formal verification toolchain that made the 5 invariants tractable in 13 days.

---

## License

MIT for everything in `programs/`, `trustgate/sdk/`, `trustgate/server/`, `tests/`, `scripts/`, and `web/`. CC-BY-4.0 for documentation under `docs/` (kept local). See [LICENSE](./LICENSE).

---

## Contact

Built solo by Mohit ([@mohit-1710](https://github.com/mohit-1710)) for the Solana Frontier 2026 hackathon. Issues / questions: [open an issue](https://github.com/agenttrust-labs/agenttrust/issues).
