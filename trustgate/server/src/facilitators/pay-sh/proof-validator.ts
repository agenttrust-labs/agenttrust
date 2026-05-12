/**
 * `validatePaymentProof` helpers — security-critical surface.
 *
 * Defends against:
 *   - replay (same tx signature submitted with a different paymentIdHash)
 *   - self-pay (facilitator's fee payer is the transfer authority)
 *   - amount/mint/recipient mismatch (signed tx for $0.01 USDC submitted to a $1 USDT challenge)
 *   - expiry (tx signed yesterday submitted today against a fresh 60s challenge)
 *   - silent passes from a buggy or malicious deps.validateOnChainTx
 *
 * Invariants the adapter expects from `deps.validateOnChainTx`:
 *   - `confirmed: true` is only returned when the tx has actually landed
 *   - When `confirmed: true`, ALL of `payer`, `signature`, `transferredAmount`,
 *     `transferredMint`, `transferRecipient` are populated
 *   - The function never throws; chain failures are returned as
 *     `errorReason` + `errorDetail`
 */

import { PublicKey } from "@solana/web3.js";

import {
  PaymentProofRejection,
  PaymentProofValidation,
  VerifyContext,
} from "../types";
import { bytesEqual, bytesToHex, sanitizeDetail } from "./helpers";
import { PaymentPayloadSchema } from "./schemas";

/** Minimal cross-check meta — anything that has `expectedRecipient` works.
 *  Used by Pay.sh and Dexter; future adapters can satisfy this surface
 *  with their own request-meta type. */
export interface CrossCheckMeta {
  readonly expectedRecipient: PublicKey;
}

// ---------------------------------------------------------------------------
// Replay cache — in-memory binding of (txSignature → paymentIdHash)
// ---------------------------------------------------------------------------

const REPLAY_CACHE_DEFAULT_MAX = 10_000;

/**
 * Insertion-ordered LRU map. Bounded so a malicious caller cannot exhaust
 * memory by submitting bogus signatures.
 *
 * WARNING — IN-MEMORY ONLY. PRODUCTION DEPLOYMENTS MUST PASS A PERSISTENT
 * IMPLEMENTATION VIA `PayShDeps.replayCache`.
 *
 * The default `ReplayCache` lives in the process's heap. A facilitator
 * restart (deploy, crash, scale-out, Fly machine cycle) wipes the
 * (signature → paymentIdHash) bindings and re-opens a window where an
 * attacker who recorded a confirmed settle proof can re-submit it under
 * a fresh `paymentIdHash` and double-charge the agent's velocity ledger.
 *
 * Replace with a Redis-backed (or similar) adapter implementing the same
 * `observe(signature, paymentIdHash) -> 'fresh' | 'replay' | 'collision'`
 * contract before production rollout. The shim point is `PayShDeps.replayCache`
 * — pass an instance that delegates to your persistent store; the adapter
 * does not care which implementation it gets.
 *
 * The default `ReplayCache` is acceptable for: unit tests, local devnet
 * demos, single-process hackathon runs where a restart is rare enough
 * that the lost-state window is bounded by `paymentRequirements
 * .maxTimeoutSeconds` (typically 60s — anything older is already
 * unconfirmable on chain via Solana's `recent_blockhash` window).
 *
 * It is NOT acceptable for: any multi-machine deployment, any service
 * that restarts mid-day, any deployment that lives beyond `maxTimeout
 * Seconds` of restart.
 */
export class ReplayCache {
  private readonly seen = new Map<string, Uint8Array>();

  constructor(private readonly capacity: number = REPLAY_CACHE_DEFAULT_MAX) {}

  /**
   * Returns:
   *   - 'fresh'    — first time this signature seen, recorded under this hash
   *   - 'replay'   — signature seen before with the same paymentIdHash (idempotent retry, OK)
   *   - 'collision' — signature seen before with a DIFFERENT paymentIdHash (reject)
   */
  observe(signature: string, paymentIdHash: Uint8Array): "fresh" | "replay" | "collision" {
    const prior = this.seen.get(signature);
    if (prior) {
      return bytesEqual(prior, paymentIdHash) ? "replay" : "collision";
    }
    if (this.seen.size >= this.capacity) {
      const oldest = this.seen.keys().next().value;
      if (oldest !== undefined) this.seen.delete(oldest);
    }
    this.seen.set(signature, paymentIdHash);
    return "fresh";
  }

  size(): number {
    return this.seen.size;
  }
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export function rejection(
  reason: PaymentProofRejection,
  detail?: string,
): PaymentProofValidation {
  return { valid: false, reason, detail };
}

/** Parse a base64-encoded `PaymentPayload` proof shape. */
export function parsePaymentPayload(proof: unknown):
  | { ok: true; txBase64: string }
  | { ok: false; rejection: PaymentProofValidation }
{
  const parsed = PaymentPayloadSchema.safeParse(proof);
  if (!parsed.success) {
    return {
      ok: false,
      rejection: rejection(
        "malformed_payload",
        parsed.error.issues[0]?.message ?? "PaymentPayload schema rejected",
      ),
    };
  }
  return { ok: true, txBase64: parsed.data.payload.transaction };
}

/**
 * Cross-check confirmed on-chain tx fields against the verify-time context.
 *
 * Note on expiry: Solana's recent_blockhash mechanism is the canonical
 * expiry vector — stale signed txs (older than ~150 slots) fail to confirm
 * upstream and `validateOnChainTx` returns `confirmed: false`. This
 * function therefore does NOT impose its own wall-clock check; doing so at
 * parseRequest time would be effectively a no-op (parseRequest runs at
 * settle time, so `now + maxTimeoutSeconds` always sits in the future).
 * If a SERVICE wants belt-and-suspenders expiry, that's a v0.2 follow-up
 * built on a SERVICE-signed `issuedAt` claim.
 */
export function crossCheck(
  onChain: {
    payer:             PublicKey;
    signature:         string;
    slot?:             number;
    transferredAmount: bigint;
    transferredMint:   PublicKey;
    transferRecipient: PublicKey;
  },
  ctx:                 VerifyContext,
  meta:                CrossCheckMeta,
  facilitatorFeePayer: PublicKey,
): PaymentProofValidation {
  // self-pay defense — the x402 SVM spec forbids the fee payer being the authority
  if (onChain.payer.equals(facilitatorFeePayer)) {
    return rejection(
      "invalid_signature",
      "facilitator fee payer cannot be the transfer authority",
    );
  }

  // amount + mint + recipient cross-check
  if (onChain.transferredAmount !== ctx.amount) {
    return rejection(
      "mismatched_payment_context",
      `amount tx=${onChain.transferredAmount} ctx=${ctx.amount}`,
    );
  }
  if (!onChain.transferredMint.equals(ctx.mint)) {
    return rejection("mismatched_payment_context", "mint mismatch");
  }
  if (!onChain.transferRecipient.equals(meta.expectedRecipient)) {
    return rejection("mismatched_payment_context", "recipient mismatch");
  }

  return {
    valid:         true,
    payer:         onChain.payer,
    txSignature:   onChain.signature,
    settledAtSlot: onChain.slot,
  };
}

/** Translate a low-level chain failure object into a PaymentProofValidation. */
export function fromOnChainError(
  errorReason: PaymentProofRejection | undefined,
  errorDetail: string | undefined,
): PaymentProofValidation {
  return rejection(
    errorReason ?? "settlement_failed",
    errorDetail ? sanitizeDetail(errorDetail) : undefined,
  );
}

/** Surface a debug trace for unconfirmed / partial validations. */
export function describePaymentIdHash(hash: Uint8Array | undefined): string {
  return hash ? bytesToHex(hash) : "<no payment_id>";
}
