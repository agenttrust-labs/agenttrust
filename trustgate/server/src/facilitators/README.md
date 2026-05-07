# Adding a new facilitator adapter

This directory holds AgentTrust's facilitator-abstraction layer. Pay.sh is the
first concrete implementation; future facilitators (Dexter, atxp_ai, MCPay,
Latinum, Corbits, plus ones that don't exist yet) drop in here as one new
file each. **Routes, policy logic, and the registry stay untouched.**

If you can follow this doc end-to-end in under two hours and end up with a
new adapter that passes its unit tests, the architecture is doing its job.
If you can't, file a bug — that's the architecture failing.

## Mental model

```
HTTP request                                              x402 facilitator API
     │                                                   POST /verify
     ▼                                                   POST /settle
┌────────────────────────┐                                      │
│  routes/{verify,       │   getActiveAdapter(req)               │
│         settle}.ts     ├─────────────────────────────► FacilitatorRegistry
└──────┬─────────────────┘     X-Facilitator header            │
       │                       env TRUSTGATE_DEFAULT_FACILITATOR │
       │                       programmatic default              │
       ▼                                                          │
   adapter.parseRequest(req)            ◄───────────────────── one of:
       │                                                          │
       ▼                                                       PaySh
   simulateGatePayment / decide(ctx)                          Dexter (stub)
       │                                                       Atxp  (stub)
       ▼                                                       McPay (stub)
   adapter.formatChallenge(decision, ctx)                      <new>
       │
       ▼
   adapter.validatePaymentProof(proof, ctx)   (settle only)
       │
       ▼
   adapter.emitFeedback(ctx, settlement)      (settle only)
```

The interface contract (5 methods) lives in [`types.ts`](./types.ts). Every
adapter implements those 5 methods — nothing else. If you find yourself
adding a 6th method, propose an interface change via PR rather than
side-stepping in your adapter.

## Step-by-step

### 1. Read the wire format you're adapting to

Don't guess. Pay.sh's adapter is built from a careful read of
`/tmp/pay/rust/crates/core/src/server/payment.rs` and
`/tmp/pay/rust/crates/core/src/client/x402.rs`. Identify:

- Which HTTP headers carry the 402 challenge?
- Which header carries the proof on retry?
- What's the JSON body shape on /verify and /settle?
- How is the recipient encoded? Wallet pubkey or ATA?
- Is there a payment_id (32-byte) hint anywhere?
- What does the facilitator expect back on Allow vs Deny?

Document the answers in your adapter file's JSDoc header.

### 2. Define your adapter's request body Zod schema

Strict mode at the root, strict on AgentTrust-specific fields, passthrough
on framework-specific fields you don't need. The schema is the contract;
unknown fields fail loud rather than ride through silently.

```ts
// dexter/schemas.ts
import { z } from "zod";
import { PubkeyString, AmountString, AgentTrustExtraSchema } from "../pay-sh";

export const DexterBodySchema = z.object({
  // Dexter-specific fields here
  ...
}).strict();
```

Reuse Pay.sh's `PubkeyString` / `AmountString` / `AgentTrustExtraSchema` —
they encode AgentTrust-wide invariants (u32 policyId, u64 amount).

### 3. Implement the 5-method `FacilitatorAdapter` class

```ts
// dexter/index.ts
export class Dexter implements FacilitatorAdapter {
  readonly name        = "dexter";
  readonly description = "Cascade Dexter — x402 facilitator";
  readonly protocols   = ["x402"] as const;

  constructor(private readonly deps: DexterDeps) {}

  async parseRequest(req: ExpressRequest): Promise<VerifyContext | null> {
    const parsed = DexterBodySchema.safeParse(req.body);
    if (!parsed.success) return null;
    // translate parsed.data → VerifyContext
  }

  formatChallenge(decision: GateDecision, ctx: VerifyContext): ChallengeResponse {
    // translate decision + ctx → wire-level challenge
  }

  formatSettlement(ctx: VerifyContext): SettlementResponse {
    // produce the unsigned tx skeleton + facilitator metadata
  }

  async validatePaymentProof(proof: unknown, ctx: VerifyContext): Promise<PaymentProofValidation> {
    // verify proof shape (Zod), confirm on chain, cross-check vs ctx
  }

  async emitFeedback(ctx: VerifyContext, settlement: ConfirmedSettlement): Promise<FeedbackEmissionResult> {
    // delegate to deps.emitFeedbackCpi
  }
}
```

Constructor takes a `DexterDeps` interface — chain calls live there so the
adapter is testable without an Anchor provider. Mirror Pay.sh's
[`PayShDeps`](./pay-sh/index.ts) shape.

### 4. Register in `index.ts`

```ts
// facilitators/index.ts (existing barrel)
export { Dexter, type DexterDeps } from "./dexter";
```

That's the only change to existing code. Routes already dispatch via
`registry.getActiveAdapter(req)` — they pick up the new adapter
automatically as soon as something registers it.

### 5. Wire the production deps factory

In your application's boot code (e.g., the demo's `createDemoApp`, or a
production `startServer` configuration):

```ts
import { Dexter, FacilitatorRegistry } from "@agenttrust/trustgate-server";

const registry = new FacilitatorRegistry();
registry.register(new Dexter(makeDexterDeps({ rpcUrl, facilitatorKeypair, ... })));
registry.setDefault("dexter");
```

The deps factory builds `validateOnChainTx`, `emitFeedbackCpi`, and any
other I/O the adapter needs. For Pay.sh's reference deps factory shape,
see [`pay-sh/index.ts`'s `PayShDeps`](./pay-sh/index.ts).

### 6. Add unit tests

```ts
// test/dexter.test.ts
describe("Dexter.parseRequest", () => {
  it("parses valid Dexter body", async () => { ... });
  it("returns null on malformed proof", async () => { ... });
  // ... mirror pay-sh.test.ts's coverage
});
```

The existing [`pay-sh.test.ts`](../../test/pay-sh.test.ts) is the
template. 32 cases for Pay.sh; aim for similar coverage on each adapter.

### 7. (Optional) Add an integration demo

Drop a new `examples/<name>-demo/` next to `examples/pay-sh-demo/`,
mirroring its structure. The integration test spins the demo via
supertest — no real CLI required for CI.

### 8. (Optional) Stub adapters before full integration

Pay.sh, Dexter, atxp, and MCPay are all live full adapters today
(Phase D promotion). New facilitators that ship in stages can register
a placeholder first via the [`stubs/`](./stubs/) pattern:

```ts
// stubs/your-facilitator.ts
import { NotImplementedAdapter } from "./_base";
export class YourFacilitator extends NotImplementedAdapter {
  readonly name        = "your-facilitator";
  readonly description = "<short pitch — x402 facilitator stub>";
  readonly protocols   = ["x402"] as const;
}
```

Stub methods throw `NotImplementedError`; routes catch this and surface
501 with the adapter name. Callers know the integration is on the
roadmap, not absent by accident. The `agenttrust_list_facilitators`
MCP tool reports each adapter's status — full vs stub — so a consumer
can choose accordingly.

## Things to NOT do

- **Don't fork an existing facilitator's source code.** AgentTrust composes
  by implementing the wire spec, not by depending on a vendor's internal
  types. This keeps you decoupled from their version churn and lets a
  single adapter speak multiple flavors.

- **Don't add facilitator-specific behavior to `routes/verify.ts` or
  `routes/settle.ts`.** All quirks live in the adapter. If a route needs
  a new generic capability, propose an interface change in `types.ts`.

- **Don't change the `FacilitatorAdapter` interface to fit one
  adapter's quirks.** The interface is the contract every adapter signs.
  Quirks live in the adapter's `parseRequest` / `formatChallenge`
  implementation and in adapter-private helpers.

- **Don't import directly from a facilitator's npm package.** Read their
  spec / source for context, then implement from spec. The adapter's
  Zod schemas are the canonical source of truth for what's on the wire.

- **Don't skip the security pass** on `validatePaymentProof` and
  `emitFeedback`. Those are the proof-of-payment surfaces — every adapter
  needs:
  - replay defense (sig ↔ paymentIdHash binding via `ReplayCache`)
  - self-pay defense (transfer authority ≠ facilitator fee payer)
  - amount + mint + recipient cross-check vs ctx
  - idempotent feedback emission (catch "account already in use")

  Pay.sh's [`pay-sh/proof-validator.ts`](./pay-sh/proof-validator.ts) and
  [`pay-sh/feedback.ts`](./pay-sh/feedback.ts) are the template. Cargo-cult
  these patterns; don't reinvent them.

## Reference implementations

| File | What it shows |
|--|--|
| [`pay-sh/index.ts`](./pay-sh/index.ts) | The 5-method class + deps DI |
| [`pay-sh/schemas.ts`](./pay-sh/schemas.ts) | Strict Zod schemas |
| [`pay-sh/proof-validator.ts`](./pay-sh/proof-validator.ts) | ReplayCache + crossCheck |
| [`pay-sh/feedback.ts`](./pay-sh/feedback.ts) | Idempotent emit_feedback retry |
| [`pay-sh/request-meta.ts`](./pay-sh/request-meta.ts) | Typed view of `rawRequestMeta` |
| [`mock.ts`](./mock.ts) | Pure in-memory adapter — LSP substitution check |
| [`stubs/_base.ts`](./stubs/_base.ts) | NotImplementedAdapter base class |

## Spec / playbook references

- `docs/plan/research/05-trustgate-x402-class.md` §A — locked x402 wire format
- `coinbase/x402/specs/transports-v2/http.md` — canonical x402 v2
- `coinbase/x402/specs/schemes/exact/scheme_exact_svm.md` — Solana exact scheme
- `programs/trustgate/src/instructions/emit_feedback.rs` — the on-chain CPI
  signature your adapter ultimately calls
