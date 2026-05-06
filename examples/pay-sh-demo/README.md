# pay-sh-demo

Pay.sh + AgentTrust TrustGate live-demo Express server. Single endpoint
(`/protected`), gated by a counterparty-tier policy and exercised end-to-end
through the AgentTrust facilitator pipeline.

```
pay --sandbox curl http://localhost:3402/protected
```

## Live devnet trace (2026-05-06)

> **AgentTrust + Pay.sh atomic settlement, live on Solana devnet.**

| step | tx |
|---|---|
| signed SPL transfer | [`5iV8EYmJh9XSXkBQrrbQ5L9kmBQabD3G3RXVPsHn9PkWceTFoeRsUV4g5aLLzZyRjeBoFvK3Woxr2cZa5xeUwhVD`](https://explorer.solana.com/tx/5iV8EYmJh9XSXkBQrrbQ5L9kmBQabD3G3RXVPsHn9PkWceTFoeRsUV4g5aLLzZyRjeBoFvK3Woxr2cZa5xeUwhVD?cluster=devnet) |
| emit_feedback CPI (PDA-signed → `agent_registry::give_feedback` → `atom_engine::update_stats`) | [`jMobmWJUAXuL8FmQujfxW9NmeMbzADUoABzqjiMeuc5m3YXyeuZeUw1ZJc29JGsqyWQGDY8q3vrtBdamhKXraag`](https://explorer.solana.com/tx/jMobmWJUAXuL8FmQujfxW9NmeMbzADUoABzqjiMeuc5m3YXyeuZeUw1ZJc29JGsqyWQGDY8q3vrtBdamhKXraag?cluster=devnet) |
| FeedbackEmissionLog PDA (init-only, score=100) | [`HB4BBi9jaD3VPcZkQQaH3DxukSqBiXfW8RejtaLa8bF3`](https://explorer.solana.com/address/HB4BBi9jaD3VPcZkQQaH3DxukSqBiXfW8RejtaLa8bF3?cluster=devnet) |

Captured in [`devnet-smoke.json`](./devnet-smoke.json). Reproduce with `scripts/devnet-smoke.ts`.

## What it shows

The demo proves the full Pay.sh → AgentTrust loop without depending on a real
Solana RPC connection:

1. The CLI hits `/protected` with no payment.
2. The middleware emits a `402 Payment Required` carrying the x402 v2
   `PAYMENT-REQUIRED` envelope (base64). The envelope embeds AgentTrust's
   policy hints in `extra.agentTrust`.
3. Pay.sh signs the payment locally (Surfpool sandbox) and retries with
   `PAYMENT-SIGNATURE`.
4. The middleware:
   - calls `PaySh.parseRequest` → `VerifyContext`
   - calls `decide(ctx)` — the demo policy maps the `X-Demo-Payer-Agent`
     header to a counterparty tier and compares against `minTier=2`
   - on **Allow**: validates the proof shape, emits a synthetic feedback
     CPI signature, and forwards to the resource handler
   - on **Deny**: returns 402 with the reason code from the gate decision

## Three demo counterparties

The `defaultCounterpartyTable()` in `src/index.ts` seeds three deterministic
agent PDAs:

| header value (X-Demo-Payer-Agent) | tier | expected outcome |
|--|--|--|
| (output of `seed("tier0")`) | 0 | **402 Deny** — `CounterpartyTierBelowMin` |
| (output of `seed("tier1")`) | 1 | **402 Deny** — `CounterpartyTierBelowMin` |
| (output of `seed("tier3")`) | 3 | **200 Allow** |

Hit `GET /health` for the actual base58 strings. Then drive each path with
the matching header.

## Run

```bash
# from repo root
pnpm install
pnpm --filter ./examples/pay-sh-demo build
pnpm --filter ./examples/pay-sh-demo dev
# server listens on :3402

# in another shell — Allow path (tier 3)
PAYER=$(curl -s http://localhost:3402/health | jq -r '.counterparties[2].agent')
pay --sandbox curl -H "X-Demo-Payer-Agent: $PAYER" http://localhost:3402/protected

# Deny path (tier 0)
PAYER=$(curl -s http://localhost:3402/health | jq -r '.counterparties[0].agent')
pay --sandbox curl -H "X-Demo-Payer-Agent: $PAYER" http://localhost:3402/protected
```

If the `pay` CLI isn't installed, the integration tests in `test/` exercise
the same flow via supertest with synthesised x402 challenge / proof bodies.

```bash
pnpm --filter ./examples/pay-sh-demo test
```

## Configuration

| env var | default | meaning |
|--|--|--|
| `PORT` | `3402` | HTTP port |
| `NETWORK` | `solana-devnet` | network slug — must match Pay.sh's `--sandbox`/`--mainnet` flag |
| `MINT` | USDC mainnet | SPL mint advertised in the `extra.asset` field |

## What this demo does NOT do

- It does **not** verify the signed Solana transaction landed on chain — the
  `validateOnChainTx` dep is a stub that synthesises a confirmed-tx fixture
  matching the verify-time context. Production wires the same dep to a real
  RPC + spl-token tx parser.
- It does **not** CPI into `trustgate::emit_feedback` — `emitFeedbackCpi` is
  a stub that returns synthetic signatures. Production wires it to an Anchor
  methods builder per `programs/trustgate/src/instructions/emit_feedback.rs`.
- It does **not** exercise the on-chain `gate_payment` simulation — `decide`
  is a static tier table. Production replaces it with a closure over
  `simulateGatePayment` from `@agenttrust/trustgate-server`.

These three injection points are exactly what the production deps factory
fills. The demo proves the *pipeline* works; production wires the chain.

## Adding to the demo

- New counterparty tier: append to `defaultCounterpartyTable()` in
  `src/index.ts`.
- New gated route: import `paymentMiddleware` and mount it next to
  `/protected`.
- Real chain wiring: build a deps factory that returns the same `PayShDeps`
  shape, replace `makeDemoPayShDeps()` in `createDemoApp`.
