/**
 * `FacilitatorAdapter` — the contract every facilitator integration implements.
 *
 * AgentTrust's TrustGate is, at the wire level, an x402 facilitator (per
 * `docs/plan/research/05-trustgate-x402-class.md` §A.3). Different upstream
 * payment frameworks — Pay.sh today, Dexter / atxp_ai / MCPay / Latinum /
 * Corbits / not-yet-existing ones tomorrow — speak slightly different dialects
 * of x402 and MPP. This interface decouples those dialects from AgentTrust's
 * internal `gate_payment` decision so:
 *
 *   - routes/* never imports a specific facilitator
 *   - policies never know which protocol the request rode in on
 *   - adding a new facilitator = one new file in `facilitators/` + one
 *     line in `registry.ts`'s adapter map
 *
 * Quirks live in concrete adapters (`pay-sh.ts`, future `dexter.ts`, etc.).
 * This file is generic — never modify it to fit a single facilitator's
 * peculiarity. If a real facilitator can't fit, propose a contract change
 * via PR and update every adapter.
 *
 * Companion docs:
 * - `docs/plan/research/05-trustgate-x402-class.md` — locked x402/MPP wire format
 * - `programs/policy-vault/src/instructions/gate_payment.rs` — on-chain decision
 * - `trustgate/server/src/facilitators/README.md` — "Adding a new adapter"
 */

import type { Request as ExpressRequest } from "express";
import { PublicKey } from "@solana/web3.js";

import { GateDecision } from "../types";

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

/**
 * Wire-level payment-protocol family the adapter speaks. An adapter MAY
 * advertise multiple — Pay.sh handles both `x402` (any version) and `mpp`
 * (charge + session) from a single concrete adapter.
 *
 * Extend this union as new families launch (e.g., `'gasless'` for Token-2022
 * fee-payer-relayed flows). Add the string here, then update each adapter's
 * `protocols` field; route + policy code does not branch on protocol.
 */
export type FacilitatorProtocol = "x402" | "mpp";

// ---------------------------------------------------------------------------
// VerifyContext — the AgentTrust-internal view fed into PolicyVault.gate_payment
// ---------------------------------------------------------------------------

/**
 * Facilitator-agnostic view of a payment-verification request. The adapter's
 * `parseRequest` produces this shape; routes + policy logic see only this.
 *
 * Field names mirror the on-chain `gate_payment` arguments in
 * `programs/policy-vault/src/instructions/gate_payment.rs`. `payerAgent` is
 * the Quantu `agent_account` PDA (sometimes called the "agent asset" in the
 * Quantu source — the same 32-byte pubkey).
 */
export interface VerifyContext {
  /** Quantu `agent_account` PDA of the payer (1st arg of `gate_payment`). */
  readonly payerAgent: PublicKey;
  /** Quantu `agent_account` PDA of the payee (2nd arg of `gate_payment`). */
  readonly payeeAgent: PublicKey;
  /** Atomic-units token amount (USDC=10^6, SOL=10^9, raw u64 on chain). */
  readonly amount: bigint;
  /** SPL mint. */
  readonly mint: PublicKey;
  /** u32 policy ID — seeds the `PolicyAccount` PDA in PolicyVault. */
  readonly policyId: number;
  /**
   * Which adapter produced this context. Used by /settle to route back to the
   * same adapter for `formatSettlement` / `validatePaymentProof` / `emitFeedback`.
   */
  readonly facilitator: string;
  /**
   * 32-byte payment identifier — present iff the facilitator carries one
   * during /verify. x402 v2 puts it in `extra.memo`; MPP-style adapters
   * derive it later in `formatSettlement`.
   */
  readonly paymentIdHash?: Uint8Array;
  /**
   * Optional auth-extension payload bundled with the payment requirement —
   * e.g., x402 v2 SIWX (sign-in-with-x), atxp_ai's JWT-bound auth claim.
   * The adapter validates the inner shape with Zod at parse time; routes
   * treat this as opaque.
   */
  readonly authExtension?: Readonly<Record<string, unknown>>;
  /**
   * Facilitator-specific fields preserved verbatim for downstream stages
   * (`formatSettlement`, `validatePaymentProof`, `/receipt` audit trails).
   * Routes never read individual keys here — only the adapter does.
   */
  readonly rawRequestMeta: Readonly<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// ParseRequestResult — discriminated parse outcome with debug reason
// ---------------------------------------------------------------------------

/**
 * Machine-parseable reason for a `parseRequestDetailed` rejection.
 *
 *   - `schema_invalid`     — body shape did not pass Zod (missing field,
 *                            wrong type, unknown key on a strict schema).
 *                            `detail` carries the first Zod issue message.
 *   - `signature_invalid`  — facilitator-bound signature failed ed25519
 *                            verification. Caused by a forged challenge,
 *                            wrong signing key, or schema drift between
 *                            SERVICE and AgentTrust.
 *   - `expired`            — `issuedAt + maxTimeoutSeconds + clockSkewMs`
 *                            sits in the past. Caller should retry against
 *                            a fresh 402 challenge.
 *   - `network_mismatch`   — `paymentRequirements.network` (or the
 *                            adapter-specific `expectedNetwork` override)
 *                            disagrees with `deps.signingNetwork`.
 *
 * Adapters MAY return adapter-specific extras alongside `detail` but the
 * `reason` field is the union of these four codes only — routes match on
 * the code, never on the prose.
 */
export type ParseRejectionReason =
  | "schema_invalid"
  | "signature_invalid"
  | "expired"
  | "network_mismatch";

export type ParseRequestResult =
  | { readonly ok: true;  readonly value: VerifyContext }
  | { readonly ok: false; readonly reason: ParseRejectionReason; readonly detail?: string };

// ---------------------------------------------------------------------------
// ChallengeResponse — what `formatChallenge` returns to the routes layer
// ---------------------------------------------------------------------------

/**
 * HTTP status codes TrustGate's facilitator API emits.
 *
 * - `200` Allow (verify) / settled (settle)
 * - `400` malformed body
 * - `401` auth required (e.g., atxp_ai unsigned JWT)
 * - `402` Payment Required (initial 402 OR retry-with-bad-payment)
 * - `403` counterparty banned (KillSwitch on a specific peer)
 * - `409` idempotency conflict — same payment_id with mismatched params
 * - `422` semantically-valid but unprocessable proof
 * - `429` rate-limited
 * - `500` internal error
 * - `503` facilitator paused (global KillSwitch)
 *
 * See `docs/plan/research/05-trustgate-x402-class.md` §A.7 for the contract.
 */
export type FacilitatorHttpStatus =
  | 200
  | 400
  | 401
  | 402
  | 403
  | 409
  | 422
  | 429
  | 500
  | 503;

/**
 * Response a facilitator adapter renders for `formatChallenge`.
 *
 * `headers` values are `string | readonly string[]` because some protocols
 * emit repeated headers — MPP advertises one `WWW-Authenticate` per
 * accepted stablecoin (Pay.sh's gateway emits up to N for USDC/USDT/CASH).
 * The routes layer forwards repeated values via `res.setHeader(name, arr)`.
 */
export interface ChallengeResponse {
  readonly status: FacilitatorHttpStatus;
  readonly headers: Readonly<Record<string, string | readonly string[]>>;
  /** JSON-serialisable body. Omit for header-only responses (x402 v2 minimal 402). */
  readonly body?: Readonly<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// SettlementResponse — what `formatSettlement` produces for the routes layer
// ---------------------------------------------------------------------------

/**
 * Settlement scaffolding the adapter emits BEFORE chain submission.
 *
 * `unsignedTransactionBase64` is `null` when the facilitator constructs and
 * signs the SPL transfer itself (MPP charge flow) — AgentTrust's role is
 * then limited to verifying the proof + emitting feedback, not building tx.
 *
 * `facilitatorMeta` carries protocol-specific fields the /settle response
 * must echo back to the caller (e.g., x402 v2 `extra.feePayer`, MPP
 * recipient ATA).
 */
export interface SettlementResponse {
  readonly unsignedTransactionBase64: string | null;
  readonly facilitatorMeta: Readonly<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// PaymentProofValidation — async proof check result
// ---------------------------------------------------------------------------

/**
 * Rejection reasons mirror x402 v2 `SettlementResponse.errorReason`
 * (per `docs/plan/research/05-trustgate-x402-class.md` §A.6) plus
 * AgentTrust-specific `mismatched_payment_context` (proof valid but
 * doesn't match the verify-time `VerifyContext`).
 *
 * Adapters MUST return one of these — never throw on a malformed proof.
 */
export type PaymentProofRejection =
  | "malformed_payload"
  | "invalid_signature"
  | "expired_payment"
  | "unsupported_scheme"
  | "settlement_failed"
  | "insufficient_funds"
  | "mismatched_payment_context";

export type PaymentProofValidation =
  | {
      readonly valid: true;
      readonly payer: PublicKey;
      /** base58 Solana tx signature of the settlement transaction. */
      readonly txSignature: string;
      /** Slot at which the tx confirmed, when known by the adapter. */
      readonly settledAtSlot?: number;
    }
  | {
      readonly valid: false;
      readonly reason: PaymentProofRejection;
      /** Human-readable diagnostic — never machine-parsed; debug logs only. */
      readonly detail?: string;
    };

// ---------------------------------------------------------------------------
// ConfirmedSettlement — fed into emit_feedback CPI
// ---------------------------------------------------------------------------

export interface ConfirmedSettlement {
  /** base58 signature of the SPL-transfer / facilitator-supplied settlement tx. */
  readonly txSignature: string;
  readonly payer: PublicKey;
  readonly payee: PublicKey;
  readonly amount: bigint;
  readonly mint: PublicKey;
  /** 32-byte payment identifier seeding `FeedbackEmissionLog` PDA. */
  readonly paymentIdHash: Uint8Array;
}

// ---------------------------------------------------------------------------
// FeedbackEmissionResult — return shape of emit_feedback CPI
// ---------------------------------------------------------------------------

export interface FeedbackEmissionResult {
  readonly paymentIdHash: Uint8Array;
  /** base58 signature of the `emit_feedback` CPI tx. */
  readonly feedbackTxSignature: string;
  /**
   * Slot the feedback emission landed at. Optional — pure-in-memory adapters
   * (e.g., `MockFacilitator` in unit tests) leave it undefined.
   */
  readonly emittedAtSlot?: number;
}

// ---------------------------------------------------------------------------
// FacilitatorAdapter — the one interface every adapter implements
// ---------------------------------------------------------------------------

/**
 * Strategy + Adapter pattern. One concrete class per facilitator integration.
 * Construction-time DI: each implementation accepts its chain dependencies
 * (RPC URL, facilitator keypair, Anchor `Program` handles) in its constructor —
 * the public method surface stays narrow.
 *
 * Method contract:
 *
 *   parseRequest        — facilitator request shape → VerifyContext (or null)
 *   formatChallenge     — GateDecision → wire-level 402 / 200 response
 *   formatSettlement    — VerifyContext → unsigned settlement scaffolding
 *   validatePaymentProof — proof + ctx → on-chain-verified result
 *   emitFeedback        — ctx + settlement → emit_feedback CPI signature
 *
 * Adapters MUST treat all five methods as deterministic for a given input
 * (modulo on-chain state for the two async ones). MUST NOT mutate global
 * server state. SHOULD validate every external input via Zod schemas at the
 * adapter boundary; the rest of the server then trusts the parsed shape.
 */
export interface FacilitatorAdapter {
  /** Stable identifier — used as the registry key + `X-Facilitator` header value. */
  readonly name: string;
  /** Human-readable for logs + debug output. Never parsed. */
  readonly description: string;
  /** Wire protocol families this adapter speaks. */
  readonly protocols: ReadonlyArray<FacilitatorProtocol>;

  /**
   * Translate an incoming HTTP request into a `VerifyContext`. Returns `null`
   * when this adapter does not recognise the request shape — the registry
   * then either falls through to another adapter or returns 400.
   *
   * Async because some adapters need a network round-trip (e.g., JWKS fetch
   * for atxp_ai's signed-JWT credential, `/supported` negotiation for a
   * remote facilitator service). Pure adapters (Pay.sh) wrap their sync
   * parser in `async` with no real await.
   *
   * MUST NOT throw on malformed inputs — return `null` and let the registry
   * route the error.
   */
  parseRequest(req: ExpressRequest): Promise<VerifyContext | null>;

  /**
   * Same as `parseRequest` but returns a discriminated union so /verify and
   * /settle can surface a machine-parseable `reason` (`schema_invalid` /
   * `signature_invalid` / `expired` / `network_mismatch`) and human-readable
   * `detail` in the 400 response body.
   *
   * Optional. Adapters that don't override this fall back to the boolean
   * `parseRequest` and the route surfaces an opaque "did not recognise the
   * request body" message. The PaySh adapter implements this for full
   * integrator debugability; new adapters SHOULD override it.
   *
   * Like `parseRequest`, MUST NOT throw on malformed inputs.
   */
  parseRequestDetailed?(req: ExpressRequest): Promise<ParseRequestResult>;

  /**
   * Translate AgentTrust's internal `GateDecision` into the wire-level
   * challenge response the facilitator's caller expects. Pure: no chain
   * calls, no I/O.
   */
  formatChallenge(
    decision: GateDecision,
    ctx: VerifyContext,
  ): ChallengeResponse;

  /**
   * Build the unsigned settlement transaction skeleton + facilitator-required
   * metadata. Pure: no chain calls. The routes layer signs / submits.
   */
  formatSettlement(ctx: VerifyContext): SettlementResponse;

  /**
   * Validate a payment proof returned by the facilitator's signing flow.
   *
   * MUST be idempotent — replays of the same proof return the same result.
   * MUST verify on-chain confirmation when applicable.
   * MUST cross-check the proof against `ctx` (e.g., signed-tx recipient ATA
   * matches `ctx.payeeAgent`'s ATA) — return `mismatched_payment_context` on
   * mismatch.
   *
   * Never throws on malformed proofs. Return `valid: false` with the right
   * `PaymentProofRejection` reason instead.
   */
  validatePaymentProof(
    proof: unknown,
    ctx: VerifyContext,
  ): Promise<PaymentProofValidation>;

  /**
   * CPI into `trustgate::emit_feedback` after settlement is confirmed.
   *
   * Adapter holds its own signer / `Program` references via constructor DI
   * — the caller does NOT supply chain context here. Returns the feedback
   * tx signature so /settle's response can echo a receipt URL.
   *
   * MUST NOT be called before `validatePaymentProof` returns `valid: true`
   * for the same `(ctx, settlement)` pair.
   */
  emitFeedback(
    ctx: VerifyContext,
    settlement: ConfirmedSettlement,
  ): Promise<FeedbackEmissionResult>;
}
