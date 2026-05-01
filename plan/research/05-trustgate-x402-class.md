# 05 — TrustGate x402 build playbook (CLASS)

**Status:** Locked Day 5 reference. Build phase 2026-04-29 → 2026-05-11. Author: Mohit (synthesizing Wave 1 deep-dives + primary x402 spec reads + facilitator-API archaeology).

**Companions:**
- `plan/final_idea/THESIS_LOCK.md` — locked thesis, locked scope, locked first-buyer.
- `plan/final_idea/v1_scope.md` — Component 2 TrustGate contract.
- `plan/final_idea/changes/2026-04-28-wave1-scope-refinements.md` — Revisions 1–9 (atomic-tx invariant, discriminator value, devnet ID pairs).
- `plan/research/01-quantu-source-code-class.md` Section J.2, C.3, E — `give_feedback` CPI target.
- `plan/research/02-anchor-token2022-cpi-class.md` Section A, B.4, D, J — Anchor 1.0+, Token-2022 footgun, PDA-signed CPI patterns, migration table.
- `research/00-thesis/agenttrust-first-buyer.md` — facilitator priority order (Dexter / atxp_ai / MCPay / Latinum / Corbits).

**Standing rule:** every claim cited (file:line OR primary URL). Quotes ≤15 words. SAEP never named in DM drafts. Foundation-alignment language is the differentiation lever.

---

## A. x402 spec end-to-end — the contract TrustGate must implement

### A.1 — Two specs, one protocol family

Coinbase's x402 ([github.com/coinbase/x402](https://github.com/coinbase/x402)) + Cascade's `x402-proxy` are the two reference points. Below both sits MPP — Tempo Labs' Machine Payments Protocol, "backwards-compatible with x402... core x402 exact payment flows mapping directly onto MPP's charge intent" ([cascade-protocol/mpp](https://github.com/cascade-protocol/mpp)). MPP is superset; x402 deployed core. **TrustGate targets v2; MPP compat is free.** v2 launched October 2025 with header normalization. PayAI + Dexter ship v2; AgentTrust ships v2 day zero.

### A.2 — The three canonical headers (v2)

Per `coinbase/x402/specs/transports-v2/http.md` ([primary URL](https://github.com/coinbase/x402/blob/main/specs/transports-v2/http.md)) and the v2 launch post:

| Header (v2) | Direction | Payload | Purpose |
|-------------|-----------|---------|---------|
| `PAYMENT-REQUIRED` | Server → Client (with HTTP 402) | Base64(JSON) of `PaymentRequired` object | Quote the price, token, network, and validity window |
| `PAYMENT-SIGNATURE` | Client → Server (retry) | Base64(JSON) of `PaymentPayload` (carries the partially-signed Solana tx) | Prove the client has authorized the exact payment |
| `PAYMENT-RESPONSE` | Server → Client (final 200 or 402) | Base64(JSON) of `SettlementResponse` | Settlement signature, network, payer pubkey |

v1 used `X-Payment-*` prefixes; v2 dropped them per modern HTTP convention. **TrustGate emits v2 + accepts v1 as backward-compat fallback** during the convergence window.

### A.3 — The three canonical endpoints

Per `docs.x402.org/core-concepts/facilitator` and the v2 transports spec:

| Endpoint | Method | Body | Returns |
|----------|--------|------|---------|
| `/verify` | POST | `{paymentPayload, paymentRequirements}` | `{isValid, invalidReason?, payer}` |
| `/settle` | POST | `{paymentPayload, paymentRequirements}` | `{success, transaction, network, payer, errorReason?}` |
| `/supported` | GET | — | `{kinds: [{scheme, network, x402Version}]}` |

**TrustGate exposes a superset:** `/verify`, `/settle`, plus `/dispute` (negative-feedback emission) and `/receipt/:payment_id` (audit trail with on-chain feedback signature). The base spec defines neither — that's TrustGate's wedge.

### A.4 — The `PaymentRequirements` schema (Solana exact scheme)

Per `coinbase/x402/specs/schemes/exact/scheme_exact_svm.md` ([primary URL](https://github.com/coinbase/x402/blob/main/specs/schemes/exact/scheme_exact_svm.md)):

```json
{
  "scheme": "exact",
  "network": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  "maxAmountRequired": "10000",
  "asset": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "payTo": "DemoMerchantPubkey...",
  "resource": "https://api.example.com/protected",
  "description": "Weather data",
  "mimeType": "application/json",
  "maxTimeoutSeconds": 60,
  "extra": {
    "feePayer": "FacilitatorFeePayerPubkey...",
    "memo": "agt-trust-payment-id-abc123"
  }
}
```

Required fields: `scheme`, `network` (CAIP-2), `maxAmountRequired` (string atomic units), `asset` (SPL mint), `payTo`, `maxTimeoutSeconds` (blockhash-bounded ~60s). `extra.feePayer` is the facilitator's gas-paying signer; `extra.memo` is the seller identifier (≤256 bytes). **AgentTrust uses `extra.memo` to carry `payment_id` — same 32-byte identifier that seeds `FeedbackEmissionLog` PDA.**

### A.5 — The `PaymentPayload` schema (Solana)

```json
{
  "x402Version": 2,
  "scheme": "exact",
  "network": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  "payload": {
    "transaction": "<base64-encoded partially-signed VersionedTransaction>"
  }
}
```

**Partially signed** by client (payer signs TransferChecked authority); facilitator co-signs as fee-payer. Per SVM spec, the facilitator's fee-payer "MUST NOT appear in the `accounts` of any instruction" and "MUST NOT be the `authority` for the TransferChecked instruction" ([scheme_exact_svm.md](https://github.com/coinbase/x402/blob/main/specs/schemes/exact/scheme_exact_svm.md)). Prevents fund drift during settlement.

### A.6 — The `SettlementResponse` schema

```json
{
  "success": true,
  "transaction": "<base58-encoded tx signature>",
  "network": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  "payer": "<base58-encoded payer pubkey>",
  "errorReason": null
}
```

On failure: `errorReason ∈ {insufficient_funds | invalid_signature | expired_payment | unsupported_scheme | settlement_failed}`. AgentTrust returns these strings exactly so existing x402 clients route correctly.

### A.7 — Status code semantics (TrustGate's contract)

| HTTP | x402 meaning | TrustGate response |
|------|--------------|---------------------|
| `200` | Payment verified + settled, resource delivered | Body = requested resource OR `{decision: "Allow"}` from `/verify` simulation |
| `402` | Payment Required (initial OR retry-with-bad-payment) | Body + headers = `PAYMENT-REQUIRED` carrying quote |
| `400` | Malformed payload (Borsh/JSON parse failure, wrong scheme) | `{error: "invalid_payload", detail: "..."}` |
| `409` | Idempotency conflict (same payment_id submitted with different params) | `{error: "idempotency_conflict", original_request_hash: "..."}` |
| `500` | Internal error (RPC down, on-chain CPI failed) | `{error: "internal", retry_after_ms: 5000}` |
| `503` | Facilitator paused (KillSwitch = paused) | `{error: "facilitator_paused", reason_code: "KILL_SWITCH_GLOBAL"}` |

`409` is not in base x402 — TrustGate adds it for AgentTrust idempotency (replays with different amount must not silently succeed). Mirrors Stripe semantics; documented extension.

### A.8 — State transitions

```
NEW          → /verify called, decision: Allow
              ↓
VERIFIED     → client constructs partially-signed tx, retries with PAYMENT-SIGNATURE
              ↓
SETTLING     → /settle called, facilitator simulates + sends, awaits confirmation
              ↓
SETTLED      → on-chain success, FeedbackEmissionLog written, /receipt yields full audit
              ↓
DISPUTED     → /dispute called within window, dispute_payment ix emits score=20 feedback
              ↓
RESOLVED     → either dispute lapses (no further action) or /append_response called (v1.1+)
```

**AgentTrust's state machine**, not base x402's. Base spec ends at SETTLED; AgentTrust extends with DISPUTED + RESOLVED to power reputation feedback. Documented in `docs/INTEGRATION-FACILITATOR.md`.

### A.9 — Idempotency

v2 lists idempotency as an optional extension ([docs.x402.org/llms.txt](https://docs.x402.org/llms.txt)). Standard: clients send `Idempotency-Key: <uuid>`; facilitator stores `(key → response_hash)` for 24h. **AgentTrust uses `payment_id` as canonical idempotency key** — seeds `FeedbackEmissionLog` PDA `["feedback_log", payment_id_hash]`. On-chain idempotency is stronger than off-chain headers: even on facilitator crash mid-settle, replay hits `emitted_at_slot != 0` and returns the original response.

### A.10 — Coinbase x402 vs Cascade x402-proxy vs MPP — convergence + divergence

| Dimension | Coinbase x402 v2 | Cascade x402-proxy | MPP (Tempo/Stripe) |
|-----------|-------------------|---------------------|---------------------|
| **Headers** | `PAYMENT-REQUIRED` / `PAYMENT-SIGNATURE` / `PAYMENT-RESPONSE` | Same (delegates to v2) | `MPP-Charge-Intent` / `MPP-Charge-Receipt` (superset) |
| **Endpoints** | `/verify` `/settle` `/supported` | Client-side proxy (no facilitator API of its own) | `/charge_intent` `/capture` `/refund` (richer) |
| **Schemes** | `exact` (v1+v2), proposed `upto` (v2 RFC) | Same | `exact` + `metered` + `subscription` |
| **Solana support** | v2 native via `@x402/svm` ([npmjs.com/package/@x402/svm](https://www.npmjs.com/package/@x402/svm)) | Solana primary target via SLIP-10 derivation `m/44'/501'/0'/0'` | Solana via x402 backwards-compat |
| **Refunds** | Out of scope | Out of scope | First-class via `/refund` |
| **Trust layer** | Out of scope | Cascade ships SATI separately ([github.com/cascade-protocol/sati](https://github.com/cascade-protocol/sati)) | Out of scope |

**TrustGate's positioning:** the only x402 facilitator shipping counterparty-aware policy + closed-loop reputation as part of `/verify` and `/settle`. Cascade has SATI but ships it separately from x402-proxy; AgentTrust fuses them.

**Convergence:** all facilitators agree on the 3-header contract + `/verify` `/settle` shapes. **Biggest ambiguity: the dispute/refund layer** — Coinbase punts, Cascade punts, MPP ships `/refund` only. AgentTrust's stance: disputes emit on-chain reputation events (not refund money). That's the wedge.

### A.11 — The single biggest x402 spec ambiguity AgentTrust must stake

**"What happens to the payee's reputation when a settled payment was fraudulent?"** Base spec: no answer. Cascade + Coinbase explicitly out-of-scope. MPP has `/refund` but no reputation effect. AgentTrust's stance via `dispute_payment`: **settled-but-disputed → score=20 feedback to payee's `agent_account`**, regardless of fund recovery. Converts x402 from payment rail to trust rail.

---

## B. TrustGate Anchor program (matching v1_scope.md Component 2)

### B.1 — Two PDAs, byte-precise

Per `v1_scope.md` Component 2 (lines 75–88) and Wave 1 #1 Section J.2:

#### `TrustGateAuthority` PDA
Seeds: `["trustgate_auth", facilitator_pubkey]`. Owner: `trustgate`. Purpose: the **PDA-signer** that signs as `client` in the CPI to `agent_registry_8004::give_feedback`. One per facilitator deployment.

| Offset | Field | Width | Purpose |
|--------|-------|-------|---------|
| 0–7 | discriminator | 8 | Anchor sighash |
| 8–39 | `facilitator` | 32 | The facilitator's outer keypair (Dexter's wallet, etc.) |
| 40–71 | `policy_authority` | 32 | Multisig pubkey allowed to set kill-switch |
| 72 | `paused` | 1 | Emergency stop |
| 73 | `version` | 1 | Schema version (start at 1) |
| 74 | `bump` | 1 | Cached bump |
| 75–106 | `_reserved` | 32 | v1.1+ headroom |

Total: 107 bytes (8 disc + 99 data). Rent ≈ 0.00075 SOL per facilitator.

#### `FeedbackEmissionLog` PDA
Seeds: `["feedback_log", payment_id_hash]`. Owner: `trustgate`. Purpose: idempotency + audit trail. One per `payment_id`.

| Offset | Field | Width | Purpose |
|--------|-------|-------|---------|
| 0–7 | discriminator | 8 | |
| 8–39 | `payment_id` | 32 | The 32-byte hash of the off-chain payment_id (same as memo) |
| 40–71 | `payee_asset` | 32 | The Metaplex Core asset receiving the feedback |
| 72 | `score` | 1 | 0–100 (clean settle = 100; dispute = 20) |
| 73–80 | `emitted_at_slot` | 8 | Used as idempotency check (`!= 0` → already emitted) |
| 81–88 | `dispute_at_slot` | 8 | 0 = no dispute; non-zero = disputed at this slot |
| 89 | `bump` | 1 | Cached bump |

Total: 90 bytes (8 disc + 82 data). Rent ≈ 0.00065 SOL per `payment_id`. Across 10K payments/month that's ~6.5 SOL/month rent floor — manageable, and the PDAs are reclaimable via a future GC instruction (out of scope for v1).

### B.2 — Three instructions

#### `init_authority(facilitator)`
Called once per facilitator. Initializes `TrustGateAuthority` PDA. Rent ~0.00075 SOL. Anchor 1.0+ syntax.

```rust
// programs/trustgate/src/instructions/init_authority.rs
#[derive(Accounts)]
pub struct InitAuthority<'info> {
    #[account(mut)] pub payer: Signer<'info>,
    /// CHECK: seed-only
    pub facilitator: UncheckedAccount<'info>,
    /// CHECK: multisig pubkey
    pub policy_authority: UncheckedAccount<'info>,
    #[account(
        init, payer = payer, space = 8 + TrustGateAuthority::INIT_SPACE,
        seeds = [b"trustgate_auth", facilitator.key().as_ref()], bump,
    )]
    pub trustgate_authority: Account<'info, TrustGateAuthority>,
    pub system_program: Program<'info, System>,
}

pub fn init_authority(ctx: Context<InitAuthority>) -> Result<()> {
    let auth = &mut ctx.accounts.trustgate_authority;
    auth.facilitator = ctx.accounts.facilitator.key();
    auth.policy_authority = ctx.accounts.policy_authority.key();
    auth.paused = false; auth.version = 1; auth.bump = ctx.bumps.trustgate_authority;
    Ok(())
}
```

CU envelope: ~5K (init + write).

#### `emit_feedback(payment_id, payee_asset, score, tag1, tag2, endpoint, feedback_uri)`
The PDA-signed CPI to `agent_registry_8004::give_feedback`. **The complete reference skeleton is captured in `plan/research/01-quantu-source-code-class.md` Section J.2 (lines 845–1076, ~150 LOC).** That code is verbatim what AgentTrust ships — copy in on Day 5 morning.

The instruction does seven things in order (per Section J.2 lines 962–1073):
1. **Idempotency** — `feedback_log.emitted_at_slot != 0` → `Ok(())` early.
2. **Score/tag/uri caps** — `score ≤ 100`, tags ≤32, endpoint/uri ≤250 (mirrors Quantu Wave 1 #1 §F.2).
3. **Pause check** — `trustgate_authority.paused == true` → `TrustGateError::Paused`.
4. **Build ix data** — 8-byte discriminator `[145, 136, 123, 3, 215, 165, 98, 41]` (Rev 6) + Borsh args.
5. **Build account metas** — order matches `agent-registry-8004/src/reputation/contexts.rs:9–60`.
6. **`invoke_signed`** — `["trustgate_auth", facilitator, &[bump]]` signer seeds.
7. **Mark log** — `emitted_at_slot = Clock::get()?.slot`, `payment_id`, `score`.

CU envelope (Wave 1 #2 §D): **~50K** = ~1.3K caller + ~30–50K inside Quantu (which CPIs into atom-engine). `set_compute_unit_limit(200_000)` headroom comfortable.

**Error mapping (per Wave 1 #1 Section E):**

| Quantu code | TrustGate response | HTTP mapping |
|-------------|---------------------|--------------|
| `SelfFeedbackNotAllowed (6300)` | `FacilitatorMisconfigured` | 500 (operator must use non-owner authority) |
| `InvalidScore (6050)` | `InvalidScoreRange` | 400 |
| `TagTooLong (6056)` / `EndpointTooLong (6060)` | Truncate client-side; should never fire | 500 if it does |
| `Overflow (6005)` | `ReputationOverflow` | 500 (impossible in practice) |
| `InvalidProgram (6400)` | `WrongAtomEngineId` | 500 |
| `InvalidAtomStatsAccount (6401)` | `WrongAtomStatsPda` | 500 |

#### `dispute_payment(payment_id, payee_asset, dispute_reason)`
Emits negative-score feedback (`score=20`) with `tag1="dispute"`, `tag2=dispute_reason` (≤32 bytes; e.g. `"refund"`, `"fraud"`, `"non-delivery"`).

```rust
// programs/trustgate/src/instructions/dispute_payment.rs
#[derive(Accounts)]
#[instruction(payment_id: [u8; 32])]
pub struct DisputePayment<'info> {
    #[account(
        mut, seeds = [b"feedback_log", payment_id.as_ref()], bump = feedback_log.bump,
        constraint = feedback_log.emitted_at_slot != 0 @ TrustGateError::PaymentNotSettled,
        constraint = feedback_log.dispute_at_slot == 0 @ TrustGateError::AlreadyDisputed,
    )]
    pub feedback_log: Account<'info, FeedbackEmissionLog>,
    // ... rest mirrors EmitFeedback context
}

pub fn dispute_payment(ctx: Context<DisputePayment>, payment_id: [u8; 32], dispute_reason: String) -> Result<()> {
    require!(dispute_reason.len() <= 32, TrustGateError::TagTooLong);
    // Derived dispute_payment_id = SHA256("dispute" || payment_id) avoids feedback_log collision.
    // Body mirrors emit_feedback with score=20, tag1="dispute", tag2=dispute_reason.
    ctx.accounts.feedback_log.dispute_at_slot = Clock::get()?.slot;
    Ok(())
}
```

**v1.1+:** CPI to `validation-registry::request_validation` for attestor review. v1 ships the two-feedback pattern (positive at settle, negative at dispute); indexers aggregate downstream. CU envelope: ~55K.

### B.3 — Anchor 1.0+ syntax

Per Wave 1 #2 §A.3 — the 0.31 → 1.0 breaking changes affecting TrustGate:
1. `disallow_duplicate_mutable_accounts` ON by default — `EmitFeedback`'s two-mut accounts have distinct seeds, satisfied.
2. `init_if_needed` requires explicit cargo feature. TrustGate uses `init` only.
3. `solana_program` re-export path unchanged (Wave 1 #2 §J:1571 confirms).

```toml
# programs/trustgate/Cargo.toml
[dependencies]
anchor-lang = "1.0.1"
sha2 = "0.10"
```

No `agent-registry-8004` dep — Pattern D.2 (raw `invoke_signed` + manual encoding) is the AgentTrust pattern. Pin commit `bfb09ad` (Wave 1 changes Rev 5) is documentation only.

### B.4 — CU envelope per instruction

| Instruction | CU envelope | Set with |
|-------------|-------------|----------|
| `init_authority` | ~5K | Default 200K is overkill; safe to leave |
| `emit_feedback` | ~50K (incl. CPI) | `ComputeBudgetIx::set_compute_unit_limit(80_000)` for headroom |
| `dispute_payment` | ~55K (incl. CPI + hash) | `set_compute_unit_limit(80_000)` |

The TrustGate atomic-tx bundle (`gate_payment + transfer + emit_feedback`) totals ~250K CU (PolicyVault gate ~30K + transfer ~5K + emit_feedback ~50K + headroom). Set `set_compute_unit_limit(300_000)` in the SDK's `mountTrustGate` adapter for safety. Max-tx limit is 1,400K CU (Wave 1 #2 §E.1) — comfortable.

---

## C. TrustGate TypeScript Express service

Path: `trustgate/server/`. Single Express app, ~600 LOC. NPM workspace.

### C.1 — Skeleton + type definitions

```typescript
// trustgate/server/src/index.ts
import express, { Express, Request, Response, NextFunction } from 'express';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { mountTrustGate } from '@agenttrust/trustgate/express';
import bodyParser from 'body-parser';
import * as redis from 'redis';

interface TrustGateServerConfig {
  rpcUrl: string;                          // e.g. 'https://mainnet.helius-rpc.com/?api-key=...'
  wsRpcUrl: string;                        // for NewFeedback log subscriptions
  programIds: {
    policyVault: PublicKey;
    trustGate: PublicKey;
    validationRegistry: PublicKey;
    agentRegistry: PublicKey;              // pinned Quantu mainnet ID
    atomEngine: PublicKey;                 // pinned Quantu mainnet ID
  };
  facilitatorKeypair: Keypair;             // signs as the outer facilitator wallet
  trustGateAuthorityPda: PublicKey;        // pre-derived ["trustgate_auth", facilitator.publicKey]
  defaultPolicyId: number;                 // u32
  redisUrl?: string;                       // for idempotency store; falls back to file
  port: number;
}

const config: TrustGateServerConfig = loadConfigFromEnv();
const app: Express = express();
app.use(bodyParser.json({ limit: '256kb' }));

// Mount the TrustGate SDK middleware — adds /verify, /settle, /dispute, /receipt
mountTrustGate(app, {
  rpcUrl: config.rpcUrl,
  programIds: config.programIds,
  facilitatorKeypair: config.facilitatorKeypair,
  defaultPolicyId: config.defaultPolicyId,
  atomicityEnforced: true,                 // THE invariant — see Section D
  idempotencyStore: config.redisUrl
    ? { kind: 'redis', url: config.redisUrl }
    : { kind: 'file', path: '/tmp/trustgate-idem.json' },
});

// Health check
app.get('/healthz', (_req, res) => res.json({ ok: true, version: '0.1.0' }));

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ error: 'internal', detail: err.message });
});

app.listen(config.port, () => {
  console.log(`TrustGate listening on :${config.port}`);
});
```

### C.2 — `POST /verify` handler

```typescript
// trustgate/server/src/routes/verify.ts
import { Request, Response } from 'express';
import { decodePaymentRequirements, encodePaymentRequired } from '../x402/headers';
import { simulateGatePayment } from '../chain/policy-vault-client';

interface VerifyBody {
  paymentPayload?: PaymentPayload;
  paymentRequirements: PaymentRequirements;
}

interface VerifyResponse {
  isValid: boolean;
  invalidReason?: string;
  payer?: string;
  decision?: 'Allow' | 'Deny' | 'RequireValidation';
  reason_code?: string;
  capability_hash?: string;
}

export async function verifyHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as VerifyBody;
  const { paymentRequirements: reqs, paymentPayload: payload } = body;

  // 1. Validate scheme + network
  if (reqs.scheme !== 'exact') {
    res.status(400).json({ isValid: false, invalidReason: 'unsupported_scheme' });
    return;
  }
  if (!reqs.network.startsWith('solana:')) {
    res.status(400).json({ isValid: false, invalidReason: 'unsupported_network' });
    return;
  }

  // 2. Pre-flight gate via PolicyVault simulation
  //    Inputs from PaymentRequirements + the payload's payer (decoded from tx)
  const payerAgentAsset = await deriveAgentAssetForPayer(payload);
  const payeeAgentAsset = await deriveAgentAssetForPayTo(reqs.payTo, reqs.asset);

  const gateResult = await simulateGatePayment({
    payer_agent_asset: payerAgentAsset,
    payee_agent_asset: payeeAgentAsset,
    amount: BigInt(reqs.maxAmountRequired),
    mint: new PublicKey(reqs.asset),
    policy_id: parseInt(reqs.extra?.policyId ?? defaultPolicyId.toString()),
  });

  if (gateResult.decision === 'Deny') {
    // Return 402 with PAYMENT-REQUIRED + reason_code
    const reqsHeader = encodePaymentRequired(reqs);
    res.status(402).set('PAYMENT-REQUIRED', reqsHeader).json({
      isValid: false,
      invalidReason: 'gate_deny',
      reason_code: gateResult.reason_code,           // e.g. "VELOCITY_LIMIT_EXCEEDED"
    });
    return;
  }

  if (gateResult.decision === 'RequireValidation') {
    res.status(402).json({
      isValid: false,
      invalidReason: 'validation_required',
      capability_hash: gateResult.capability_hash,
    });
    return;
  }

  // gateResult.decision === 'Allow'
  res.status(200).json({
    isValid: true,
    decision: 'Allow',
    payer: payload?.payload.transaction
      ? extractPayerFromTx(payload.payload.transaction)
      : undefined,
  });
}
```

`simulateGatePayment` calls `connection.simulateTransaction` against a constructed `gate_payment` ix and parses the `GateDecision` enum from `returnData.data` (Anchor convention).

### C.3 — `POST /settle` handler — atomic tx construction

THE atomicity invariant (per Section D). One tx with three instructions: `gate_payment` + SPL transfer + `emit_feedback`. Any failure → all three roll back.

```typescript
// trustgate/server/src/routes/settle.ts
import { Request, Response } from 'express';
import {
  TransactionMessage, VersionedTransaction, Transaction,
  ComputeBudgetProgram, SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
} from '@solana/web3.js';
import { idempotencyStore } from '../idem';

export async function settleHandler(req: Request, res: Response): Promise<void> {
  const { paymentPayload, paymentRequirements: reqs } = req.body;

  // 1. Idempotency check — payment_id from extra.memo
  const paymentIdHash = sha256(reqs.extra?.memo ?? '');
  const cached = await idempotencyStore.get(paymentIdHash);
  if (cached) {
    res.status(cached.status).json(cached.body);
    return;
  }

  // 2. Decode the partially-signed client tx
  const clientTx = VersionedTransaction.deserialize(
    Buffer.from(paymentPayload.payload.transaction, 'base64')
  );

  // 3. Verify the SPL TransferChecked ix matches reqs (per SVM spec)
  await assertTransferMatchesRequirements(clientTx, reqs);

  // 4. ATOMIC TX BUILD — gate_payment + transfer + emit_feedback in ONE tx
  const ixs: TransactionInstruction[] = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000 }),

    await buildGatePaymentIx({
      payerAgentAsset: await deriveAgentAssetForPayer(paymentPayload),
      payeeAgentAsset: await deriveAgentAssetForPayTo(reqs.payTo, reqs.asset),
      amount: BigInt(reqs.maxAmountRequired),
      mint: new PublicKey(reqs.asset),
      policyId: defaultPolicyId,
    }),

    // The client-signed TransferChecked ix from the payload
    extractTransferIx(clientTx),

    await buildEmitFeedbackIx({
      paymentId: paymentIdHash,
      payeeAsset: await deriveAgentAssetForPayTo(reqs.payTo, reqs.asset),
      score: 100,                          // clean settle
      tag1: 'x402_settle',
      tag2: '',
      endpoint: reqs.resource,
      feedbackUri: '',
    }),
  ];

  // 5. Wrap in VersionedTransaction, add facilitator fee-payer signature
  const blockhash = await connection.getLatestBlockhash('confirmed');
  const messageV0 = new TransactionMessage({
    payerKey: facilitatorKeypair.publicKey,
    recentBlockhash: blockhash.blockhash,
    instructions: ixs,
  }).compileToV0Message();

  const tx = new VersionedTransaction(messageV0);
  // Apply the original client signature (already in clientTx) + facilitator signature
  tx.signatures = [...clientTx.signatures];
  tx.sign([facilitatorKeypair]);

  // 6. Send + confirm
  let signature: string;
  try {
    signature = await connection.sendTransaction(tx, { skipPreflight: false });
    await connection.confirmTransaction(
      { signature, blockhash: blockhash.blockhash, lastValidBlockHeight: blockhash.lastValidBlockHeight },
      'confirmed'
    );
  } catch (err) {
    // Map Anchor error codes to x402 errorReason
    const errorReason = mapErrorToX402(err);
    const responseBody = { success: false, errorReason, transaction: null };
    await idempotencyStore.set(paymentIdHash, { status: 402, body: responseBody });
    res.status(402).json(responseBody);
    return;
  }

  // 7. Build SettlementResponse
  const responseBody: SettlementResponse = {
    success: true,
    transaction: signature,
    network: reqs.network,
    payer: extractPayerFromTx(paymentPayload.payload.transaction),
    errorReason: null,
  };
  const responseHeader = encodePaymentResponse(responseBody);

  await idempotencyStore.set(paymentIdHash, { status: 200, body: responseBody });

  res.status(200).set('PAYMENT-RESPONSE', responseHeader).json(responseBody);
}
```

The critical bit: **all three instructions in `ixs` → one `VersionedTransaction` → one `sendTransaction`.** Any ix failure (Deny decision, insufficient funds, TransferHook reject) reverts everything including the feedback write. Correct: feedback only fires on actual settlement.

### C.4 — `POST /dispute` handler

```typescript
// trustgate/server/src/routes/dispute.ts
export async function disputeHandler(req: Request, res: Response): Promise<void> {
  const { payment_id, dispute_reason } = req.body;

  // 1. Verify the original payment settled
  const paymentIdHash = sha256(payment_id);
  const cached = await idempotencyStore.get(paymentIdHash);
  if (!cached || cached.status !== 200) {
    res.status(400).json({ error: 'payment_not_settled' });
    return;
  }

  // 2. Build dispute_payment ix
  const ix = await buildDisputePaymentIx({
    paymentId: paymentIdHash,
    payeeAsset: cached.body.payeeAsset,
    disputeReason: dispute_reason,
  });

  const sig = await sendSingleIxAsTx(ix, facilitatorKeypair);

  res.status(200).json({
    dispute_id: sha256(`dispute:${payment_id}`),
    transaction: sig,
    score_emitted: 20,
  });
}
```

### C.5 — `GET /receipt/:payment_id` handler

```typescript
// trustgate/server/src/routes/receipt.ts
export async function receiptHandler(req: Request, res: Response): Promise<void> {
  const paymentIdHash = sha256(req.params.payment_id);

  // 1. Read FeedbackEmissionLog PDA
  const [feedbackLogPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('feedback_log'), paymentIdHash],
    config.programIds.trustGate
  );

  const accountInfo = await connection.getAccountInfo(feedbackLogPda);
  if (!accountInfo) {
    res.status(404).json({ error: 'payment_not_found' });
    return;
  }

  const log = decodeFeedbackEmissionLog(accountInfo.data);

  // 2. Read off-chain idempotency store for the SettlementResponse
  const cached = await idempotencyStore.get(paymentIdHash);

  // 3. Construct receipt
  res.status(200).json({
    payment_id: req.params.payment_id,
    settlement: cached?.body ?? null,
    on_chain: {
      payee_asset: log.payee_asset.toBase58(),
      score: log.score,
      emitted_at_slot: log.emitted_at_slot.toString(),
      dispute_at_slot: log.dispute_at_slot.toString(),
    },
    explorer_links: {
      settlement_tx: cached?.body?.transaction
        ? `https://solscan.io/tx/${cached.body.transaction}`
        : null,
      feedback_log_pda: `https://solscan.io/account/${feedbackLogPda.toBase58()}`,
    },
  });
}
```

### C.6 — x402 header construction

```typescript
// trustgate/server/src/x402/headers.ts
export function encodePaymentRequired(reqs: PaymentRequirements): string {
  return Buffer.from(JSON.stringify(reqs)).toString('base64');
}

export function decodePaymentRequired(headerValue: string): PaymentRequirements {
  return JSON.parse(Buffer.from(headerValue, 'base64').toString('utf8'));
}

export function encodePaymentSignature(payload: PaymentPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function encodePaymentResponse(response: SettlementResponse): string {
  return Buffer.from(JSON.stringify(response)).toString('base64');
}
```

### C.7 — Error mapping (every Quantu code → HTTP)

Per Wave 1 #1 Section E (lines 532–541):

```typescript
const errorMap: Record<number, { status: number; errorReason: string }> = {
  6300: { status: 500, errorReason: 'facilitator_misconfigured' },     // SelfFeedbackNotAllowed
  6050: { status: 400, errorReason: 'invalid_score_range' },
  6056: { status: 500, errorReason: 'tag_too_long_internal' },         // should never fire — truncated client-side
  6060: { status: 500, errorReason: 'endpoint_too_long_internal' },
  6005: { status: 500, errorReason: 'reputation_overflow' },
  6400: { status: 500, errorReason: 'wrong_atom_engine_id' },
  6401: { status: 500, errorReason: 'wrong_atom_stats_pda' },
  6058: { status: 402, errorReason: 'atom_stats_not_initialized' },    // payee not yet warmed
  // PolicyVault errors (custom range 6500+):
  6500: { status: 402, errorReason: 'kill_switch_paused' },
  6501: { status: 402, errorReason: 'spending_per_tx_exceeded' },
  6502: { status: 402, errorReason: 'spending_daily_exceeded' },
  6503: { status: 402, errorReason: 'velocity_limit_exceeded' },
  6504: { status: 402, errorReason: 'counterparty_tier_too_low' },
  6505: { status: 402, errorReason: 'validation_attestation_missing' },
};
```

### C.8 — WebSocket subscription to NewFeedback events

Per Wave 4 #10 J.2 — Mert's deck-review pipeline unlocks at Helius Pro ($499/mo). 5-RPC-TPS unlock:

```typescript
// trustgate/server/src/chain/feedback-subscription.ts
import { Connection, PublicKey } from '@solana/web3.js';

export function subscribeToNewFeedback(
  connection: Connection,
  trustGateAuthorityPda: PublicKey,
  onEvent: (event: NewFeedbackEvent) => void
): number {
  // Subscribe to all logs from agent-registry-8004 mentioning our PDA as `client`
  const subscriptionId = connection.onLogs(
    QUANTU_AGENT_REGISTRY_ID,
    (logs, ctx) => {
      if (!logs.logs.some(l => l.includes(trustGateAuthorityPda.toBase58()))) return;
      // Parse NewFeedback event from logs (Anchor event-emit format: "Program data: <base64>")
      const event = parseNewFeedbackFromLogs(logs.logs);
      if (event) onEvent({ ...event, slot: ctx.slot, signature: logs.signature });
    },
    'confirmed'
  );
  return subscriptionId;
}
```

Helius WebSocket: `wss://mainnet.helius-rpc.com/?api-key=...`. Free Solana RPC is ~100 req/sec — fine for demo, not production.

### C.9 — Idempotency store

Two backends, configurable:

```typescript
export interface IdempotencyStore {
  get(key: string): Promise<{ status: number; body: any } | null>;
  set(key: string, value: { status: number; body: any }, ttlSec?: number): Promise<void>;
}
// RedisIdempotencyStore: SET/GET with EX TTL = 86400 (24h)
// FileIdempotencyStore: append-only JSON at /tmp/trustgate-idem.json; demo-only
```

v1 demo: file backend (single-process). v1.1+: Redis for multi-instance.

---

## D. Atomic-tx invariant (THE Token-2022 footgun mitigation)

Per Wave 1 #2 §B.4 (lines 168–176, primary-source URL: solana-program.com/docs/token-2022 TransferHook section):

> "Hook execution happens post-transfer; if hook fails, transfer already completed (state has final values at invocation)."

A `TransferHook` mint (ext #14) can revert the transfer ix AFTER prior state mutations. Split-tx mode: tx B's revert leaves `VelocityLedger.cumulative_amount` drifted upward — counter believes a payment happened when it did not.

### D.1 — The wrong pattern (2 separate txs)

```typescript
// ❌ DO NOT DO THIS
async function settleWrong(reqs, payload) {
  // Tx A — gate the payment
  const txA = new Transaction().add(buildGatePaymentIx(...));
  await connection.sendAndConfirm(txA);  // VelocityLedger += amount

  // Tx B — transfer
  const txB = new Transaction().add(extractTransferIx(payload));
  try {
    await connection.sendAndConfirm(txB);
  } catch (e) {
    // TransferHook reverted. VelocityLedger is now CORRUPTED — counted +amount
    // but no transfer happened. Future Velocity policy decisions are wrong.
    throw e;
  }
}
```

Silent corruption: no on-chain failure record; the next legitimate payment from this payer is rejected at the wrong threshold. Wave 1 #2 §B.4 line 174 documents this in `docs/INTEGRATION-FACILITATOR.md`.

### D.2 — The right pattern (1 atomic tx with all 3 instructions)

```typescript
// ✅ THE ENFORCED PATTERN
async function settleRight(reqs, payload) {
  const ixs = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
    buildGatePaymentIx(...),       // PolicyVault.gate_payment
    extractTransferIx(payload),    // SPL/Token-2022 transfer
    buildEmitFeedbackIx(...),      // TrustGate.emit_feedback (idempotency-checked)
  ];
  const tx = new VersionedTransaction(buildMessageV0(ixs, blockhash, facilitator));
  tx.signatures = [...payload.signatures];
  tx.sign([facilitatorKeypair]);

  // All-or-nothing: if ANY ix fails, all three roll back.
  await connection.sendTransaction(tx);
}
```

**Solana atomicity:** any-ix failure → all-ix rollback. `VelocityLedger` increment + transfer + `FeedbackEmissionLog` write all-or-nothing. No drift possible.

### D.3 — What happens when each instruction fails

| Failing ix | Solana behavior | TrustGate response |
|------------|-----------------|---------------------|
| `gate_payment` returns `Deny` | Tx reverts before transfer | 402 with reason_code (e.g. `velocity_limit_exceeded`) |
| `gate_payment` returns `RequireValidation` | Tx reverts before transfer | 402 with `capability_hash` for client to obtain attestation |
| Transfer fails (insufficient funds) | Tx reverts; gate ledger unwound | 402 with `errorReason: "insufficient_funds"` |
| Transfer fails (TransferHook reject) | Tx reverts; gate ledger unwound | 402 with `errorReason: "transfer_hook_rejected"` |
| `emit_feedback` fails (e.g. SelfFeedbackNotAllowed) | Tx reverts; transfer + gate unwound | 500 — facilitator misconfigured |

The last row is operationally critical: if `TrustGateAuthority` PDA coincides with payee's `core_owner` (Wave 1 #1 §K.2 demo footgun), `emit_feedback` fires `SelfFeedbackNotAllowed (6300)` and the entire tx reverts. Correct — alternative is settle-without-feedback which breaks the closed-loop.

### D.4 — Atomic-tx enforcement in SDK

Full code in Section C.3. Key invariant: **`atomicityEnforced: true` hard-coded in SDK config; runtime guard refuses opt-out**:

```typescript
export function mountTrustGate(app: Express, config: TrustGateConfig): void {
  if (config.atomicityEnforced !== true) {
    throw new Error('TrustGate v1: atomicityEnforced MUST be true. See docs/INTEGRATION-FACILITATOR.md.');
  }
  // ... rest of mount
}
```

No opt-out. Period.

### D.5 — Token-2022 detection (defense in depth)

Per Wave 1 #2 §B.4+§I — SDK warn-flags Token-2022 mints with `TransferHook` ext so operators can audit hook program IDs. `read_mint_extensions` helper returns `{ has_transfer_hook, hook_program_id, has_confidential_transfer, ... }`. PolicyVault rejects ConfidentialTransfer mints (Spending → Deny). TrustGate logs warnings for TransferHook mints + confirms atomic-tx invariant.

---

## E. Drop-in TypeScript module (`@agenttrust/trustgate`)

### E.1 — Path and package name

Path in repo: `trustgate/sdk/`. NPM package: `@agenttrust/trustgate`. Scoped publish under Mohit's npm org `@agenttrust` (registers org Day 5 morning — 2 minutes via npmjs.com/org/create).

### E.2 — Two import surfaces

```typescript
// Import surface 1 — Express middleware (server-side)
import { mountTrustGate } from '@agenttrust/trustgate/express';

// Import surface 2 — Client helpers (for facilitator-internal use OR client-side)
import { gatePayment, settle, dispute } from '@agenttrust/trustgate/client';
```

### E.3 — Config schema

```typescript
// trustgate/sdk/src/types.ts
export interface TrustGateConfig {
  rpcUrl: string;                          // Solana RPC URL
  wsRpcUrl?: string;                       // Optional WebSocket for feedback subscriptions
  programIds: {
    policyVault: PublicKey;
    trustGate: PublicKey;
    validationRegistry: PublicKey;
    agentRegistry: PublicKey;              // Pinned Quantu mainnet ID per Wave 1 changes Rev 7
    atomEngine: PublicKey;                 // Pinned Quantu mainnet ID per Wave 1 changes Rev 7
  };
  facilitatorKeypair: Keypair;             // Signs the outer tx as fee-payer
  defaultPolicyId: number;                 // u32, set per facilitator
  atomicityEnforced: true;                 // MUST be `true` literal type
  idempotencyStore?: IdempotencyStoreConfig;
}

export interface IdempotencyStoreConfig {
  kind: 'redis' | 'file' | 'memory';
  url?: string;                            // for redis
  path?: string;                           // for file
}
```

The `atomicityEnforced: true` is a TypeScript literal type — `false` is not assignable. Compile-time + runtime enforcement.

### E.4 — Full TS code (~400 LOC, primary export surfaces)

```typescript
// trustgate/sdk/src/index.ts
export { mountTrustGate } from './express';
export { gatePayment, settle, dispute } from './client';
export * from './types';

// trustgate/sdk/src/express.ts
import { Express, Request, Response } from 'express';
import { TrustGateConfig } from './types';
import {
  buildVerifyHandler,
  buildSettleHandler,
  buildDisputeHandler,
  buildReceiptHandler,
} from './handlers';

export function mountTrustGate(app: Express, config: TrustGateConfig): void {
  if (config.atomicityEnforced !== true) {
    throw new Error(
      'TrustGate v1: atomicityEnforced must be true.\n' +
      'Reason: PolicyVault.gate_payment + transfer + emit_feedback must execute atomically.\n' +
      'See: https://github.com/agenttrust/trustgate/blob/main/docs/INTEGRATION-FACILITATOR.md#atomicity'
    );
  }

  // Pre-derive the TrustGateAuthority PDA so we don't recompute on every request
  const [trustGateAuthorityPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('trustgate_auth'), config.facilitatorKeypair.publicKey.toBuffer()],
    config.programIds.trustGate,
  );

  const ctx = { config, trustGateAuthorityPda };

  app.post('/verify', buildVerifyHandler(ctx));
  app.post('/settle', buildSettleHandler(ctx));
  app.post('/dispute', buildDisputeHandler(ctx));
  app.get('/receipt/:payment_id', buildReceiptHandler(ctx));
  app.get('/supported', (_req, res) => {
    res.json({
      kinds: [{ scheme: 'exact', network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', x402Version: 2 }],
    });
  });
}

// trustgate/sdk/src/client.ts
export async function gatePayment(args: GatePaymentArgs): Promise<GateDecision> {
  // Constructs the gate_payment ix; returns the simulated decision
}
export async function settle(args: SettleArgs): Promise<SettlementResponse> {
  // Constructs and submits the atomic tx (gate + transfer + emit_feedback)
}
export async function dispute(args: DisputeArgs): Promise<DisputeResponse> {
  // Constructs and submits the dispute_payment tx
}
```

The complete SDK is ~400 LOC including types + JSDoc; readable in a single Cursor session. The handler files (`buildVerifyHandler`, etc.) are ~50 LOC each because the heavy lifting (atomic-tx construction, idempotency, RPC) lives in the shared `chain/` and `idem/` modules under `trustgate/server/`.

### E.5 — Publishing strategy

Day 5 morning:
1. Create npm org `@agenttrust` at https://www.npmjs.com/org/create (2 min, $7/mo for paid org or free for public-only)
2. `npm login` with Mohit's npm credentials
3. `cd trustgate/sdk && npm publish --access public` — first publish under `@agenttrust/trustgate@0.1.0-rc.1`
4. README with one example: 8 lines from import to mount.

Day 12 (post-demo lock):
1. Bump to `@agenttrust/trustgate@0.1.0` (drop the `-rc`)
2. Update README with the demo video link + the live-deployed program IDs
3. Tweet the npm install command + GitHub stargazer screenshot (per Wave 4 #10 §I.1 thread template)

The published-to-npm artifact is the **distribution moat**: any new x402 facilitator that wants AgentTrust integration runs `npm install @agenttrust/trustgate` and adds 5 lines to their Express app. This is the asymmetric leverage — Dexter's SDK takes ~60 LOC to integrate; AgentTrust's SDK is ~5 LOC because it sits on top of any existing Express server.

---

## F. Per-facilitator integration plans

### F.1 — Dexter (@dexteraisol) — Priority 1

**Public footprint:**
- Facilitator: [dexter.cash/facilitator](https://dexter.cash/facilitator); Solana program ID `DEXVS3su4dZQWTvvPnLDJLRK1CeeKG6K3QqdzthgAkNV`.
- SDK `@dexterai/x402`: Express middleware `x402Middleware()` ([github.com/Dexter-DAO/dexter-x402-sdk](https://github.com/Dexter-DAO/dexter-x402-sdk)).
- v3: chain-agnostic client/server/React. Cross-chain bridging Solana ↔ Base. OpenDexter Marketplace lists 5K+ paid APIs.

**API surface:** `x402Middleware({payTo, amount, network, facilitatorUrl})` is integration point. Two modes:
1. **Side-by-side (~10 LOC):** Dexter calls `gatePayment(...)` from `@agenttrust/trustgate/client` BEFORE `x402Middleware`. Pre-flight + settlement split.
2. **Drop-in (~50 LOC):** replace `x402Middleware` with `mountTrustGate`. Higher AgentTrust value, bigger ask.

**10-step playbook:** D5 Cold DM → D7 follow-up → D10 Warm-pitch (Kani harness) → D12 Proposal + 10-LOC patch → D13 30-min sync → D14 pair-program + staging → D15 testnet tweet → D16 mainnet → D17 joint launch tweet + RT.

**DM voice:** Dexter publicly emphasizes cross-chain, smart-wallet (Squads/Crossmint/SWIG), enterprise-volume pursuit. DM angles AgentTrust as **the missing input layer for their enterprise pipeline** — the bit their facilitator currently cannot answer "yes" to: gating on Solana Foundation's agent registry reputation.

**Time-to-integration:** 3–4 days first-DM → testnet; mainnet by D16. Cohort-alumni warmth + aggressive shipper status (per Day-3 research).

**Foundation-narrative:** *"Your enterprise customers ask 'does your facilitator gate on Solana Foundation's agent registry?' AgentTrust lets you answer yes — without changing your customer flow."*

**Asymmetric leverage:** Dexter is on Helius Pro; Mohit's Helius Pro spend = production-cadence signal Mert reads. Aligned credibility.

### F.2 — atxp_ai (Circuit & Chisel) — Priority 2

**Public footprint:**
- 1M+ tx, 5K users ([solana.com/x402](https://solana.com/x402)). Moved to x402+MPP on Solana ([x.com/solana/status/2044877583167201705](https://x.com/solana/status/2044877583167201705)).
- $19.2M raised by Circuit & Chisel ([prnewswire.com](https://www.prnewswire.com/news-releases/circuit--chisel-secures-19-2-million-and-launches-atxp-a-web-wide-protocol-for-agentic-payments-302562331.html)).
- Foundation-RT'd (per `agenttrust-first-buyer.md:92`).

**API:** standard x402 + ATXP's MCP-server middleware. Side-by-side or drop-in.

**10-step playbook:** D5 Cold (scale-pain) → D7 follow-up (next-10X bottlenecks) → D10 Warm (Kani for $19M-raised security review) → D12 Proposal → D13 technical sync (engineering-heavy) → D14 pair-program → D15 staging → D16 mainnet → D17 joint launch → Post-D17: "first $19M-backed customer" deck line.

**DM voice:** they emphasize compliance-aware enterprise volume, MCP server middleware. DM angles AgentTrust as **the primitive closing their counterparty-aware policy gap**.

**Time-to-integration:** 4–5 days. Engineering-heavy team + institutional security review = Kani harness is the credibility hook.

**Foundation-narrative:** *"You already have the Foundation relationship; this completes the third leg the registry was missing."*

**Asymmetric leverage:** ATXP at 1M tx → Helius-relevant; Mohit's Helius Pro = "operating at the same scale" signal.

### F.3 — MCPay (microchipgnu) — Priority 3

**Public footprint:** open-source `github.com/microchipgnu/MCPay`. Cypherpunk Stablecoin Grand winner. Docs at `docs.mcpay.tech`. "Open-source infrastructure that adds on-chain payments to any MCP server using x402." Streams revenue events to dashboards.

**API:** standard x402 + MCP-server telemetry extensions. Side-by-side fits orthogonally with their MCP framing.

**Playbook:** D5 Cold (stablecoin-compliance) → D7 follow-up (`kyc.tier-2` capability) → D10 Warm (ValidationRegistry namespace) → D12 Proposal → D13–14 technical sync + pair-program → D15 staging → D16 mainnet → D17 joint launch.

**DM voice:** emphasizes Cypherpunk stablecoin compliance + regulated-issuer customer angles. DM angles **ValidationRegistry capability-namespace gating** as the layer letting MCPay tell stablecoin issuers "agent flows policy-gated on KYC-tier-2 attestations from Halborn/OtterSec/Civic."

**Time-to-integration:** 5–7 days. Contributor-driven cadence slower than Dexter/atxp_ai.

**Foundation-narrative:** *"Stablecoin compliance + Foundation-aligned policy. Your issuers ask whether agents are KYC-tier-attested before settlement; AgentTrust ships it."*

**Asymmetric leverage:** Cypherpunk-Grand + Foundation-aligned = Public Goods co-marketing surface.

### F.4 — Latinum — Priority 4

**Public footprint:** Production facilitator + Breakout AI Grand winner ([solanafloor.com](https://solanafloor.com/news/meet-solana-s-next-potential-billion-dollar-unicorns-winners-of-breakout-hackathon-announced)). "Frontier Mathematics Research Lab" at [latinum.ai](https://latinum.ai/). MCP-compatible wallet + middleware.

**Playbook:** mirrors MCPay structure, slower cadence (7–10 days).

**DM voice:** emphasizes broader-AI-agent-economy + mathematical-rigor positioning. DM angles AgentTrust's **Kani formal verification** as the mathematical-rigor primitive aligning with their "Frontier Mathematics Research Lab" framing. Mentions 5-invariant green-checks artifact.

**Time-to-integration:** 7–10 days. May not ship by D17; deck note becomes "Latinum integration work in progress."

**Foundation-narrative:** *"Foundation-aligned + mathematically-verified counterparty policy. The third leg the Solana Foundation's agent stack was missing."*

**Asymmetric leverage:** "Mathematics Research Lab" + Kani harness = research-rigor co-positioning. Lily Liu's Public Goods angle threads through naturally.

### F.5 — Corbits — Priority 5

**Public footprint:** x402 endpoint dashboard ([corbits.dev](https://corbits.dev)). Cypherpunk Infra runner-up. Revenue-per-endpoint tracking; any token on Solana/Base/Polygon/Monad. "Universal x402 router" via @httpayer ([x.com/corbits_dev/status/1988727519483465883](https://x.com/corbits_dev/status/1988727519483465883)).

**API:** Dashboard + endpoint-proxy. Different shape: **observability-side**, not facilitator-integration. AgentTrust's NewFeedback + GateDecision logs feed Corbits' dashboard.

**Playbook (observability-modified):** D5 Cold (observability angle) → D7 "what events?" → D10 Warm (NewFeedback as data source) → D12 Proposal + integration sketch → D13–14 async sync + Corbits-side adapter (their team codes) → D15 ship → D16 events flowing → D17 joint launch (Corbits tweets dashboard view of AgentTrust's first 100 settlements).

**DM voice:** emphasizes dev-ops/rev-ops decisions. DM angles AgentTrust as **highest-signal data source they don't have** — every payment carries on-chain feedback signature from Foundation-endorsed registry.

**Time-to-integration:** 3–5 days adapter-side. Light-integration by design.

**Foundation-narrative:** *"Your dashboard surfaces facilitator metrics; AgentTrust adds the missing reputation-signal layer — every payment now carries an on-chain trust score from Solana Foundation's agent registry."*

**Asymmetric leverage:** dashboard-shape = distribution channel, not customer. Corbits' RT hits operational-x402 audience overlapping Mert's followers.

---

## G. DM drafts for facilitator outreach (15 total — 3 per facilitator)

**Voice rules across all 15:**
- ≤500 chars where possible (X DM limit hard rule)
- Foundation-alignment language in every DM (the differentiation lever per THESIS_LOCK §2.1)
- Never name SAEP
- Open with a specific public observation (shows homework)
- End with question that takes <30 seconds to answer
- No GitHub link in cold; demo link in warm; integration patch in proposal

### G.1 — Dexter (@dexteraisol)

#### Cold-discovery DM (Day 5)
> Hey — saw v3 SDK ship with cross-chain Solana → Base routing. Question: when your enterprise integrators ask "does the facilitator gate on Solana Foundation's agent registry reputation?" — is that a top-5 ask, or hasn't it surfaced? Trying to separate signal from noise on what the regulated-volume customers actually want at the rail layer. One-liner is plenty.

(411 chars)

#### Warm-pitch DM (Day 10)
> Quick follow-up: shipping a Foundation-aligned counterparty-policy primitive that calls on-chain into the Solana agent registry — gate_payment + 5 Kani invariants formally verified, drop-in TS module for x402 facilitators. ~10 LOC integration into your middleware. Demo: [link]. Genuinely curious if this maps to the enterprise asks you mentioned. Worth a 20-min sync?

(401 chars)

#### Partnership-proposal DM (Day 14)
> Wrapping up the demo: AgentTrust ships as @agenttrust/trustgate on npm + the Anchor programs deployed mainnet Day 16. Drafted a 10-LOC patch for your `x402Middleware` to add Foundation-aligned counterparty gating side-by-side. Repo + patch: [link]. Submission video on Day 17 mentions Dexter as first-integration if you're game. Open to ship it together?

(394 chars)

### G.2 — atxp_ai

#### Cold-discovery DM (Day 5)
> Hi — congrats on the 1M tx milestone + x402+MPP move. Curious: at your scale, do enterprise prospects ask whether ATXP gates on Solana Foundation's agent registry as policy input before settlement? Trying to separate "compliance theater" from "actual rail-layer ask" in the next-10X-volume customer pipeline. Any shape of answer useful.

(385 chars)

#### Warm-pitch DM (Day 10)
> Following up: AgentTrust ships the Foundation-aligned counterparty-policy primitive — gate_payment composer with 5 formally-verified invariants (cargo kani green), drop-in TS module that wraps your existing facilitator endpoint. The third leg the Solana agent registry was missing, productized in 17 days. Demo: [link]. Worth a 20-min sync to see if it maps?

(409 chars)

#### Partnership-proposal DM (Day 14)
> Demo wrapping; submission Day 17. AgentTrust on mainnet + @agenttrust/trustgate on npm. Drafted a side-by-side patch (~50 LOC) for your facilitator that adds Foundation-aligned counterparty-tier + velocity policy before settlement. ATXP would be the first $19M-backed integration. Repo + patch: [link]. Open to ship together?

(386 chars)

### G.3 — MCPay (microchipgnu)

#### Cold-discovery DM (Day 5)
> Hi — Cypherpunk Stablecoin Grand was great work. Question: when your stablecoin-issuer customers ask "can MCPay verify the agent's KYC tier from a Solana Foundation-aligned attestation registry before settlement?" — is that a real ask or hypothetical? Trying to figure out where the policy seam between middleware + on-chain attestation actually sits. One-liner welcome.

(420 chars)

#### Warm-pitch DM (Day 10)
> Follow-up: AgentTrust ships a Foundation-aligned policy primitive + capability-namespace attestation registry (10 v1 namespaces — kyc.tier-2, audit.smart-contract, compliance.payments, etc.). PolicyVault gates on attestations from Halborn/OtterSec/Civic. Drop-in TS module for your MCP-server middleware. Demo: [link]. Mapping to your stablecoin-issuer pipeline?

(408 chars)

#### Partnership-proposal DM (Day 14)
> Demo wrapping; mainnet Day 16. AgentTrust ships @agenttrust/trustgate + capability-attestation registry. Drafted side-by-side patch for MCPay that adds compliance.payments + kyc.tier-2 capability gating before stablecoin settlement. Repo + patch: [link]. MCPay as the first stablecoin-compliance integration in the demo video — open to ship together?

(395 chars)

### G.4 — Latinum

#### Cold-discovery DM (Day 5)
> Hey — Breakout Grand was deserved; the Mathematics Research Lab framing is rare in this space. Question: when your middleware customers ask whether agent-side policy enforcement can be Foundation-aligned (i.e. read on-chain from the Solana agent registry), is that a real customer ask or a hypothetical? Trying to figure out where the rail-vs-middleware seam sits. One-liner welcome.

(409 chars)

#### Warm-pitch DM (Day 10)
> Follow-up: AgentTrust ships Foundation-aligned counterparty policy primitive — the gate_payment composer has 5 formally-verified invariants (cargo kani, mathematical proofs of invariants like paused-implies-no-allow). Drop-in TS module for your middleware. Mapping to your "mathematics research lab" positioning + Foundation alignment as a co-positioning surface. Demo: [link].

(420 chars)

#### Partnership-proposal DM (Day 14)
> Demo wrapping; submission Day 17. AgentTrust ships @agenttrust/trustgate on npm + 5 Kani-proven invariants in repo. Drafted side-by-side patch (~80 LOC) for Latinum. The mathematical-rigor co-positioning surface is genuine — your customers + my customers benefit. Repo + patch + sample mainnet tx: [link]. Open to ship together by Day 17?

(382 chars)

### G.5 — Corbits

#### Cold-discovery DM (Day 5)
> Hey — your x402 endpoint dashboard is clean. Quick question on observability: would your facilitator customers benefit from a per-payment reputation signal on top of revenue/volume tracking — i.e. "this $0.03 settle just emitted a +100 score to the payee's Solana Foundation registry agent account" — surfaced as a dashboard column? Trying to figure out latent demand.

(404 chars)

#### Warm-pitch DM (Day 10)
> Follow-up: AgentTrust emits NewFeedback events on every settle to the Solana Foundation-endorsed agent registry. The events stream perfectly into a dashboard column. ~30 min adapter on your side, real-time score column on the merchant view. Demo: [link]. Worth surfacing in your dashboard for facilitator operators?

(379 chars)

#### Partnership-proposal DM (Day 14)
> Demo wrapping. AgentTrust mainnet Day 16; emitting NewFeedback events on every settle. Drafted the Corbits-side adapter spec — your dashboard pulls events via Helius WebSocket subscription, surfaces a per-merchant reputation column. Repo + spec: [link]. Corbits + AgentTrust co-launch on Day 17 if you're game?

(371 chars)

### G.6 — DM length sanity check

All 15 DMs ≤500 chars. The cold-discovery variants average 405 chars — well within X DM limits. The warm-pitch + proposal variants average 395 chars — leave ~100 chars of headroom for tweaking based on Day-5/7 response signals.

---

## H. Send schedule + follow-up cadence

### H.1 — Day 5 morning (3 cold-discovery DMs)

9–11 AM Pacific (US morning + EU afternoon): Dexter first, atxp_ai +30 min, MCPay +60 min. Log all sends in `research/00-thesis/dm-response-log.md` (create Day 5): timestamp, handle, body.

### H.2 — Day 7 evening (2 follow-ups)

- Dexter GREEN → send Latinum + Corbits cold-discovery (G.4 + G.5 v1).
- Dexter YELLOW/silent → re-frame Dexter DM + send Latinum.
- Dexter RED → pivot framing ("single-point-of-failure observation") + Corbits.

### H.3 — Day 10 (warm-pitch DMs)

To every GREEN/YELLOW responder: variant-2 DM at 10 AM Pacific + demo preview link from Day-9 dry-run. Non-responders: do NOT re-send.

### H.4 — Day 14 (partnership-proposal DMs)

Post-Day-13 demo lock: variant-3 DM to all GREEN-responders. Include live mainnet program IDs + integration patch. Request 30-min sync within 48h.

### H.5 — Cadence table

| Day | Action | DMs | Goal |
|-----|--------|-----|------|
| 5 AM | Cold-discovery wave 1 | 3 | 1+ GREEN by D7 |
| 7 PM | Cold-discovery wave 2 + adjust | 2 | broader capture |
| 10 AM | Warm-pitch | up to 5 | sync by D12 |
| 12 EOD | Demo dry-run shareable | 1–2 video previews | inbound sync |
| 14 AM | Partnership proposal | up to 5 | 1+ live integ by D17 |

### H.6 — Channels

X DM = default (all 5 facilitators have public X). Solana Foundation Discord (`#frontier-general`, `#x402`) = 48h escalation if X silent. Email = last resort.

---

## I. "If they say yes" / "If they say no" playbooks

### I.1 — Yes (GREEN, integration interest)

**Day 0:** confirm 30-min sync within 48h (3 timezone slots); pre-share commit hash + npm install + demo video.

**Sync (30 min):** their pain (10 min) → 10-LOC integration walk (10 min) → scope (5 min, side-by-side default) → timeline (5 min, D14 staging / D16 mainnet).

**D1–3 post-sync:** Slack/Telegram channel; Mohit drafts integration patch + opens PR; joint testnet smoke test D14.

**D14–17:** D16 mainnet ship; D17 morning joint launch tweet drafted.

**Joint Twitter template:**
> Day 17 launch: AgentTrust ships @agenttrust/trustgate — Foundation-aligned counterparty policy for x402 facilitators. First integration: @{facilitator}. The third leg the Solana Foundation's agent registry was missing, now drop-in for any facilitator that wants Foundation-aligned trust gating. Repo: [link]. Demo: [link].

(395 chars; `{facilitator}` = first GREEN-responder shipping. Mohit's submission thread leads with this per Wave 4 #10 §I.4.)

### I.2 — Silent (no response)

| Trigger | Action |
|---------|--------|
| 0/3 by D7 PM | Re-frame next 2 DMs (concrete pain + customer name) + Latinum/Corbits |
| 0/5 by D10 | Discord public-channel escalation |
| 0/5 by D14 | Drop facilitator-integration line from deck; fallback to "designed for x402 facilitators including..." |

**Discord escalation:** ≥48h X-silent + facilitator active on X. Frame: "saw you on X earlier today, DM'd you about Foundation-aligned policy — happy to context here if easier."

**Drop trigger:** ≥72h silent across X + Discord → dropped from v1 list.

### I.3 — No (RED — explicit decline)

**Three "why not" categories:**

1. **"We do this in-house"** → Phase-2 framing as Public Goods primitive they consume.
2. **"Foundation alignment isn't a customer ask"** → critical signal; differentiation weaker than expected. Update DM voice to test regulator-alignment / audit-compliance / open-source angles. Don't pivot on single RED.
3. **"We'll build this ourselves"** → worst case. Either bluff (common) or genuine. Drop from v1; future competitor.

**3+ REDs across 5:** trigger Day-12 thesis-validation per `agenttrust-first-buyer.md`. NOT abandon — refine positioning. Update DM voice + README opener + possibly retarget deck slide 4 to operational-economics angle (Wave 1 #1 §M: Foundation-alignment is 1 of 7 differentiators).

---

## J. Helius integration for observability

### J.1 — Helius WebSocket RPC for NewFeedback

`give_feedback` emits two events (Wave 1 #1 §D.2): `NewFeedback` (from agent-registry-8004 — score, tag, endpoint, payee asset, client) and `StatsUpdated` (from atom-engine — trust_tier, quality_score, confidence).

TrustGate subscribes to `NewFeedback` filtered on `client_address == trustGateAuthorityPda` to (a) verify per-settle emission, (b) feed `/receipt`, (c) drive demo-time UI.

Helius WebSocket `wss://mainnet.helius-rpc.com/?api-key={KEY}` supports `logsSubscribe` (mentions filter), `accountSubscribe` (per-PDA), `programSubscribe` (program-wide). Free Solana RPC ~100 req/sec — fine for demo, not production.

### J.2 — Helius Pro economics

- $499/mo. 5 RPC TPS unlock (vs free-tier throttling).
- Unlocks Mert's deck-review pipeline (Wave 4 #10 §J.2 — his explicit deck-review offer).
- Frontier window cost: $499 × 1 month = $499.
- Mert's RT cascades ~250K followers, captures security-aware crowd overlapping Vibhu/Toly/Armani.

**Day 5 morning purchase decision.** Operational asymmetry — same dollars Dexter/atxp_ai spend.

### J.3 — Mert as highest-likelihood-RT judge

Per Wave 4 #10 §J.2 + §J.6: Mert engages with security incidents, AI-on-Solana products, privacy primitives, Helius launches. **Highest-likelihood RT among 5 gating judges.** AgentTrust's scam-wrapper Variant B opener + 5-Kani-invariants green-checks + cargo kani output = the Mert-shaped post. Mohit's Helius Pro = "operates at scale" meta-signal.

### J.4 — Asymmetric leverage calc

| Spend | Value |
|-------|-------|
| Helius Pro $499 | Mert deck review (60 min, highest-likelihood RT judge) |
| Helius Pro $499 | Production RPC (no demo-time flake) |
| Helius Pro $499 | Dexter/atxp_ai signal alignment |
| Helius Pro $499 | v1.1+ multi-facilitator WebSocket headroom |
| Sum | ~$10K-equivalent value for $499 |

**Highest-ROI non-build cost in the 17-day window.**

---

## K. Demo flow (Days 11–12)

### K.1 — End-to-end test against live Quantu primitives on devnet

Day 11 morning: full TrustGate → PolicyVault → settlement → feedback flow tested against live Quantu devnet.

```
Step 1. Pre-warmed payer agent (registered Day 5, tier ≥ Silver by Day 12)
        sends GET /protected to a TrustGate-mounted Express server.
Step 2. Server returns 402 + PAYMENT-REQUIRED with quote.
Step 3. Client constructs partially-signed VersionedTransaction with TransferChecked.
Step 4. Client retries GET /protected with PAYMENT-SIGNATURE header.
Step 5. Server's mountTrustGate handler calls /verify (PolicyVault simulation).
Step 6. PolicyVault.gate_payment returns Allow (counterparty tier check passes).
Step 7. Server constructs atomic-tx (gate_payment + transfer + emit_feedback).
Step 8. atomic-tx confirms; agent-registry-8004::give_feedback CPI emits NewFeedback.
Step 9. Server returns 200 + PAYMENT-RESPONSE; receipt endpoint shows on-chain trust_tier.
Step 10. Subsequent GET /protected from the SAME payer (tier still Silver) → Allow.
         GET /protected from an UNREGISTERED payer (tier 0) → Deny via CounterpartyTier policy.
```

Expected duration on devnet: 5–7 seconds end-to-end (slot time + confirmation). Mainnet: 1–2 seconds.

### K.2 — Localnet fallback if devnet flakes

Per Wave 1 changes Revision 7:

```toml
# Anchor.toml
[test.validator]
url = "https://api.mainnet-beta.solana.com"
[[test.validator.clone]]
address = "8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ"  # agent-registry-8004 mainnet
[[test.validator.clone]]
address = "AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb"  # atom-engine mainnet
```

`solana-test-validator` clones both Quantu programs from mainnet at the pinned commit hash `bfb09ad` (Wave 1 changes Rev 5). The cloned localnet has IDENTICAL program logic to mainnet. Demo recording falls back to localnet `--clone` if devnet has a v0.7.0 breaking change between Day 5 and Day 16.

### K.3 — Pre-warmed agents at Silver-Gold tier

Per Wave 1 changes Revision 9 (the demo-tier target):
- Silver = 2, Gold = 3 (achievable by Day 12 from Day-5 pre-warming).
- Platinum = 4 (structurally unreachable in 7 days from a fresh agent — `TIER_PLATINUM_MIN_LOYALTY = 500`).

Day-12 demo script targets **Silver vs Unrated** for the headline contrast (lower-friction, more credible than Platinum vs Unrated).

The pre-warming script (`scripts/prewarm-demo-agents.ts`):
1. Day 5 morning: register 5 demo agents on Quantu mainnet ATOM (per Wave 1 changes Rev 8 — TWO transactions per agent: `register_with_options(uri, atom_enabled=true)` + `atom_engine::initialize_stats(asset, collection)`. Total 10 txs, ~0.055 SOL).
2. Days 5–12: cron job emits 1–3 positive-score feedbacks per agent per day from 3+ distinct client wallets.
3. Day 12: agents reach Silver-Gold; demo-ready.

### K.4 — Demo script tie-in

Demo script: `plan/other_tasks/ops/technical-demo-script.md` (Variant A Nike opener, Wave 4 #10).

Beats:
- **Variant A opener** — consumer-fraud Nike scenario (90s)
- **Beat 1** — live `cargo kani`, 5 invariants green (Mert-shaped Instagram moment)
- **Beat 2** — live `mountTrustGate(app, ...)` on a fresh Express server (60s)
- **Beat 3** — `curl GET /protected` → 402 → retry → 200 with on-chain receipt link (45s)
- **Beat 4** — `/receipt/:payment_id` surfaces on-chain feedback signature live (30s)

Total ~3.5 min. Variant A locks Day 9; Day 11–12 = dry-run + final cuts.

### K.5 — Demo dry-run dates

| Day | Activity | Output |
|-----|----------|--------|
| 11 AM | E2E devnet smoke test | Bug list (max 3 critical) |
| 11 EOD | Bug fixes complete | Green-tag commit |
| 12 AM | Dry-run #1 (devnet primary) | 90s recording v1 |
| 12 EOD | Dry-run #2 (localnet `--clone` fallback) | Backup recording v1 |
| 13 | Friend-handoff video edit | Final 3-min cut |

---

## L. Production hardening v1.1+

What ships in v1.1+, NOT in v1:

| # | Feature | v1 stance | v1.1+ delivery |
|---|---------|-----------|----------------|
| L.1 | **TLS termination** | Assumes HTTPS proxy (nginx/Caddy/Cloudflare) in front | Optional native TLS via `https.createServer` |
| L.2 | **Rate limiting** | None (relies on operator proxy) | `express-rate-limit` per-`payTo` + per-IP, Redis-backed |
| L.3 | **Multi-tenant facilitator isolation** | Single-tenant (one `TrustGateAuthority` PDA per deployment) | Route by hostname / `X-Facilitator-Id`; per-tenant idem stores + authority PDAs. Unblocks hosted-facilitator service |
| L.4 | **Disaster recovery + idem replay** | File or Redis store; no DR | Replay log to S3/R2 (7-day retention) + recovery script that rebuilds from on-chain `FeedbackEmissionLog` PDAs + cross-region failover |
| L.5 | **Webhook callbacks** | Operators poll `/receipt/:payment_id` | `POST {webhook_url}` HMAC-signed on every settle/dispute; retry queue (exp backoff to 24h); DLQ + alerting |
| L.6 | **Dispute window** | Any settled payment disputable forever | Configurable window (default 7d; per-policy override); past window → `DisputeWindowExpired` |
| L.7 | **Stake-weighted attestor scoring** | Permissionless + downstream-consumer-filtering only | Stake-weighted scoring + slashing per `docs/COMPLETING-THE-TRUST-STACK.md` roadmap |
| L.8 | **Streaming-payment schemes** | x402 `exact` only | `metered` + `subscription` via MPP-compat paths |

---

## M. What this means for Mohit's submission

- **The atomic-tx invariant detail:** `mountTrustGate(app, config)` MUST refuse to instantiate with `atomicityEnforced != true`. TypeScript literal-type guard + runtime throw both required. Wave 1 #2 §B.4 — split-tx mode leaves `VelocityLedger` corrupted. Day 5 build action: implement SDK with line-1 guard; no "enforce later" slippage.

- **Top 3 facilitators by integration ease:** (1) **Corbits** — ~30 min observability adapter, lowest-friction, most-likely Day-17 amplifier. (2) **Dexter** — 10-LOC side-by-side via `x402Middleware`; cohort warmth + aggressive shipper. (3) **MCPay** — ~50 LOC, open-source repo + capability-namespace fit. atxp_ai is higher-value but slower-cadence; Latinum is slowest (7–10 days).

- **Biggest x402 spec ambiguity AgentTrust stakes:** post-settlement disputes have no spec answer. Coinbase + Cascade out-of-scope; MPP `/refund` has no reputation effect. AgentTrust's stance: settled-but-disputed → score=20 feedback to payee's `agent_account` regardless of fund recovery. Converts x402 payment rail to trust rail. Day 5: lock in `docs/INTEGRATION-FACILITATOR.md` + README + pitch slide 4.

- **NPM publish: `@agenttrust/trustgate`** under Mohit's npm org. Day 5: register org (free public), publish `@agenttrust/trustgate@0.1.0-rc.1` placeholder. Day 12: publish `0.1.0` with demo link. Distribution moat = 5-LOC integration.

- **DM cadence 3-2-5-5 across Days 5/7/10/14.** All 15 DMs in Section G; foundation-alignment in each; SAEP never named. Target: 2+ GREEN by Day 7 (Day-8 pivot threshold). Below threshold → re-frame, do not pivot.

- **Helius Pro $499/mo Day 5 morning.** Highest-ROI non-build cost. Unlocks Mert's deck-review (highest-likelihood RT per Wave 4 #10) + production RPC + Dexter/atxp_ai signal alignment.

- **Demo target Silver-Gold (tier 2-3), NOT Platinum.** Wave 1 changes Rev 9. Pitch slide 5 shows Silver/Gold vs Unrated. Platinum unreachable in 7 days.

- **Day-5-morning load-bearing action:** pre-warm 5 demo agents on Quantu mainnet (2 txs per agent, ~0.055 SOL). Cron emits feedback Days 5–12. Without this, Day-12 tier demo doesn't work.

- **Pin-commit discipline is documentation-only.** No `agent-registry-8004` Cargo dep. Manual byte-offset deserialization (Wave 1 #2 Pattern B) sidesteps Anchor version coupling. Pin in `docs/PINNED-VERSIONS.md` for risk-register transparency.

- **Atomic-tx CU envelope ~250K** (gate 30K + transfer 5K + emit_feedback 50K + headroom). Set `set_compute_unit_limit(300_000)` in SDK builder. Max-tx 1,400K — comfortable.

---

## Appendix — primary-source citation index

| # | Source | Purpose |
|---|--------|---------|
| 1 | [github.com/coinbase/x402](https://github.com/coinbase/x402) | x402 v2 root spec |
| 2 | [github.com/coinbase/x402/blob/main/specs/transports-v2/http.md](https://github.com/coinbase/x402/blob/main/specs/transports-v2/http.md) | HTTP transport (3 headers, status codes) |
| 3 | [github.com/coinbase/x402/blob/main/specs/schemes/exact/scheme_exact_svm.md](https://github.com/coinbase/x402/blob/main/specs/schemes/exact/scheme_exact_svm.md) | Solana scheme (PaymentRequirements, PaymentPayload, SettlementResponse, fee-payer rules) |
| 4 | [docs.x402.org/core-concepts/facilitator](https://docs.x402.org/core-concepts/facilitator) | Facilitator API (/verify, /settle, /supported) |
| 5 | [docs.x402.org/llms.txt](https://docs.x402.org/llms.txt) | Doc index (extensions: idempotency, gas sponsoring, SIWX) |
| 6 | [www.x402.org/writing/x402-v2-launch](https://www.x402.org/writing/x402-v2-launch) | v2 launch post (header rename, plugin SDK, lifecycle hooks) |
| 7 | [github.com/cascade-protocol](https://github.com/cascade-protocol) | Cascade org (x402-proxy, surf, sati, mpp, mppx, splits) |
| 8 | [github.com/cascade-protocol/x402-proxy](https://github.com/cascade-protocol/x402-proxy) | x402-proxy (Solana SLIP-10 derivation, MCP proxy) |
| 9 | [github.com/cascade-protocol/sati](https://github.com/cascade-protocol/sati) | SATI primitives (Token-2022 NFTs + compressed attestations + SAS) |
| 10 | [github.com/cascade-protocol/mpp](https://github.com/cascade-protocol/mpp) | MPP (Tempo/Stripe co-author; backwards-compat with x402 exact) |
| 11 | [solana.com/x402](https://solana.com/x402) | Solana x402 ecosystem (37M tx, 70% volume on Solana, named: PayAI, Corbits, T54) |
| 12 | [solana.com/developers/guides/getstarted/intro-to-x402](https://solana.com/developers/guides/getstarted/intro-to-x402) | Solana x402 intro (USDC mint addrs, exact scheme spec) |
| 13 | [dexter.cash/facilitator](https://dexter.cash/facilitator) | Dexter facilitator endpoint |
| 14 | [github.com/Dexter-DAO/dexter-x402-sdk](https://github.com/Dexter-DAO/dexter-x402-sdk) | Dexter SDK (`x402Middleware`, `wrapFetch`, React hooks, dynamic pricing) |
| 15 | [docs.mcpay.tech](https://docs.mcpay.tech/) | MCPay docs |
| 16 | [github.com/microchipgnu/MCPay](https://github.com/microchipgnu/MCPay) | MCPay open-source |
| 17 | [github.com/coinbase/x402/issues/646](https://github.com/coinbase/x402/issues/646) | RFC: Solana scheme deadline + smart-wallet support |
| 18 | [solana-program.com/docs/token-2022](https://www.solana-program.com/docs/token-2022) | Token-2022 TransferHook timing (the footgun source) |
| 19 | [solana.com/docs/core/cpi/cpi-cost-model](https://solana.com/docs/core/cpi/cpi-cost-model) | CPI cost: 946 CU base under SIMD-0339 |
| 20 | [solana.com/docs/core/fees](https://solana.com/docs/core/fees) | Fee + CU baselines (1.4M tx max, 200K default) |
| 21 | [x.com/solana/status/2044877583167201705](https://x.com/solana/status/2044877583167201705) | Solana official: ATXP moves to x402+MPP |
| 22 | [x.com/corbits_dev/status/1988727519483465883](https://x.com/corbits_dev/status/1988727519483465883) | Corbits cross-chain x402 router |
| 23 | [latinum.ai](https://latinum.ai) | Latinum (Frontier Mathematics Research Lab) |
| 24 | [www.npmjs.com/package/@x402/svm](https://www.npmjs.com/package/@x402/svm) | x402 SVM package on npm |

Repo-internal citations:
- `plan/research/01-quantu-source-code-class.md` lines 346–398, 845–1097, 517–545 (give_feedback signature, emit_feedback skeleton, error mapping)
- `plan/research/02-anchor-token2022-cpi-class.md` lines 13–26, 168–176, 503–693, 850–890 (Anchor 1.0+ rec, Token-2022 footgun, PDA-signed CPI patterns, sBPF gotchas)
- `plan/final_idea/v1_scope.md` lines 71–115 (TrustGate Component 2 contract)
- `plan/final_idea/changes/2026-04-28-wave1-scope-refinements.md` Revisions 5–9 (commit pin, discriminator value, devnet IDs, two-tx pre-warming, Silver-Gold target)
- `research/00-thesis/agenttrust-first-buyer.md` lines 89–134 (facilitator priority + DM voice rules)
- `plan/research/10-production-amplification-class.md` Section J (judge engagement scripts; Mert section)
