# attestor-demo

Devnet ValidationRegistry attestor-lifecycle demo. Captures a real on-chain
trace through all 5 ValidationRegistry instructions, proving the third leg
of the ERC-8004 trust stack works end-to-end against the deployed devnet
program at [`Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv`](https://explorer.solana.com/address/Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv?cluster=devnet).

```bash
pnpm install
pnpm --filter ./examples/attestor-demo run smoke
```

## Live devnet trace (2026-05-06)

> **AgentTrust ValidationRegistry — full lifecycle, live on Solana devnet.**

Subject (Quantu agent_account): [`5PfaofvEUf3adtJwMho7zzbfvgxwxbvp2V5moqhtLK8y`](https://explorer.solana.com/address/5PfaofvEUf3adtJwMho7zzbfvgxwxbvp2V5moqhtLK8y?cluster=devnet)
Capability: `usdc-payment-policy.v1`

| step | tx | PDA |
|---|---|---|
| **register_namespace** | [`5B3PfDGYhzhusJwj…`](https://explorer.solana.com/tx/5B3PfDGYhzhusJwjXURnhpkZ2umipdegfNREtJbcgZySR7nr976CcSJXqYSzB8eSYT14W3yrzGuks75S7pdZD3WK?cluster=devnet) | [`34gonn86FjxzXZMGd43RSvQVyH1r6PrGV9xnHXjjkEwR`](https://explorer.solana.com/address/34gonn86FjxzXZMGd43RSvQVyH1r6PrGV9xnHXjjkEwR?cluster=devnet) |
| **register_attestor** | [`Ct3SQ4CR9bu6oijR…`](https://explorer.solana.com/tx/Ct3SQ4CR9bu6oijRELe7pnjj8KfMRVDiQ3AkytNQtYfF2yZBsThMJNoCDADnwWp37PYcsFJSEkBjXmaLY9a9eQD?cluster=devnet) | [`GTzWJzV5htNi1Ntqwq2e2ydu9h4rArnKQwzv2sJjC9zP`](https://explorer.solana.com/address/GTzWJzV5htNi1Ntqwq2e2ydu9h4rArnKQwzv2sJjC9zP?cluster=devnet) |
| **request_validation** | [`qBQzSTCWfkE9Xw1E…`](https://explorer.solana.com/tx/qBQzSTCWfkE9Xw1EZ2qRwo3Hv451cbVaTRKSa32KHpnL7sfCSVBEhjGinm5qod6W6LtCgAj7xvbhydHf1wjoKq9?cluster=devnet) | [`GnbrSzWsDw1rehCrFJ4ckiM9JJJeAHdjfNDt7QQy7vhV`](https://explorer.solana.com/address/GnbrSzWsDw1rehCrFJ4ckiM9JJJeAHdjfNDt7QQy7vhV?cluster=devnet) |
| **respond_to_validation** | [`CCxKvvQ9ZdboukcX…`](https://explorer.solana.com/tx/CCxKvvQ9ZdboukcXPp9jj1a3o53grGR9VjZux7kS1AAWqaVnRXVqhJjphsM1QYjny5oaVP4oRGThBLUQ41DyzwC?cluster=devnet) | [`C6Yr7oKcZ6sDVibR35SWbFnGCXyfQjLeRCiPbjxYq6vY`](https://explorer.solana.com/address/C6Yr7oKcZ6sDVibR35SWbFnGCXyfQjLeRCiPbjxYq6vY?cluster=devnet) |
| **revoke_validation** | (gated on REVOKE=1) | (in-place — sets revoked=true on the attestation PDA above) |

The `ValidationAttestation` PDA at row 4 is the on-chain artifact the
PolicyVault's `RequireValidation` policy reads via the byte-offset
parser at `programs/policy-vault/src/ext/validation_registry.rs`. Once
this PDA exists for `(subject, capability, attestor) = (5PfaofvE…,
sha256(usdc-payment-policy.v1), GTzWJzV5…)`, a subsequent
`gate_payment` call that passes this attestation account through the
`validation_attestation` slot turns a `RequireValidation` decision
into `Allow`.

Full machine-readable trace at [`devnet-attestor-trace.json`](./devnet-attestor-trace.json).

## What this demonstrates

1. **All 5 ValidationRegistry instructions reachable from the SDK**
   (`@agenttrust-sdk/trustgate`'s `validation-registry` module exposes
   PDA derivers + ix builders for every on-chain entry point).
2. **The third leg of ERC-8004** is real on Solana — Quantu's
   IdentityRegistry + ReputationRegistry sit at the foundation;
   ValidationRegistry's capability attestation closes the trust stack.
3. **The complete `RequireValidation` round-trip**: policy emits
   capabilityHash → attestor responds → policy now Allows. Each step is
   a separate on-chain tx; AgentTrust composes the PDAs without
   trusting any off-chain coordination.

## How it fits the demo narrative

The Pay.sh adapter (in `trustgate/server/src/facilitators/pay-sh/`)
already surfaces `capabilityHash` in its `formatChallenge` response when
the policy gate returns `RequireValidation`. A SERVICE that hits this
branch:

1. Sees `decision.kind = "RequireValidation"` + `capabilityHash` in the
   x402 `/verify` response body.
2. Looks up the attestor service that handles that capability (typically
   discovered out-of-band via a registry or hard-coded contract).
3. Submits the claim payload off chain; the attestor responds on chain
   via `respond_to_validation` (the script in this directory does this).
4. Re-submits the payment to the SERVICE; the new `/verify` call
   includes the `validation_attestation` PDA in the gate_payment
   account list, the policy reads it, and the decision flips to
   `Allow`.

The script proves steps 3-4 work end-to-end on devnet. Steps 1-2 are
business logic the SERVICE owns.

## Configuration

| env var | default | meaning |
|--|--|--|
| `RPC_URL` | `https://api.devnet.solana.com` | Solana RPC endpoint |
| `KEYPAIR` | `~/.config/solana/id.json` | Facilitator keypair path |
| `REVOKE` | (unset) | When `1`, runs the optional 5th step (revoke_validation) |

## Cost

~0.012 SOL across all 5 steps (rent for namespace + attestor +
request + attestation PDAs, ~0.0023 SOL each, plus tx fees).

## Idempotency

Re-running reuses:
- `examples/attestor-demo/attestor-keypair.json` (kept across runs so
  the AttestorProfile PDA stays stable)
- The namespace PDA (skipped if `fetchCapabilityNamespace` already
  returns a record)

It generates a fresh requester keypair each run so request_validation
doesn't collide on the `(subject, capability, requester)` PDA.

If you've already responded to a request once, the
`(subject, capability, attestor)` PDA exists and respond is skipped —
delete the attestor keypair file or change the `CAPABILITY_NAME` to
walk a fresh attestation lifecycle.
