/**
 * Feedback-emission wrapper. Handles the idempotent retry case where the
 * on-chain `FeedbackEmissionLog` PDA is already initialized.
 *
 * Per `programs/trustgate/src/instructions/emit_feedback.rs:38-44`, the
 * emission log is `init`-only — a second call for the same `paymentIdHash`
 * fails at the account-already-in-use constraint. Adapters retry on
 * transient confirmation failures; this wrapper translates that
 * "duplicate" error into a fetch of the prior emission so callers see a
 * stable feedback signature regardless of how many retries happened.
 */

import { PublicKey } from "@solana/web3.js";

import { ConfirmedSettlement, FeedbackEmissionResult, VerifyContext } from "../types";

/** Score the adapter ships with positive settlements. Operators tune via deps later. */
export const DEFAULT_FEEDBACK_SCORE = 100;

/** Tags / endpoint / URI sized to the on-chain `MAX_*` constants in
 *  `programs/trustgate/src/instructions/emit_feedback.rs:18-21`. */
export interface FeedbackFields {
  readonly score:        number;
  readonly tag1:         string;
  readonly tag2:         string;
  readonly endpoint:     string;
  readonly feedbackUri:  string;
}

/**
 * Build the feedback metadata to attach to the on-chain emit. Uses the
 * resource string from the original 402 challenge for `endpoint` so the
 * stored feedback is queryable by service path.
 */
export function buildFeedbackFields(
  ctx: VerifyContext,
  resource: string | undefined,
  facilitatorName: string,
): FeedbackFields {
  return {
    score:        DEFAULT_FEEDBACK_SCORE,
    tag1:         truncate(facilitatorName, 32),
    tag2:         truncate(`policy=${ctx.policyId}`, 32),
    endpoint:     truncate(resource ?? "/", 64),
    feedbackUri:  "",
  };
}

/** Recognise the "this paymentIdHash already has a log" Anchor / Solana error. */
const REPLAY_PATTERNS = [
  /already in use/i,
  /custom program error: 0x0\b/i,
  /custom: 0\b/i,
];

export function looksLikeReplay(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  return REPLAY_PATTERNS.some((re) => re.test(msg));
}

export interface PriorEmissionLookup {
  /** Returns the existing emission log entry, or null if not on chain. */
  (paymentIdHash: Uint8Array): Promise<{
    feedbackTxSignature: string;
    emittedAtSlot?:      number;
  } | null>;
}

export interface EmitFeedbackInput {
  readonly ctx:        VerifyContext;
  readonly settlement: ConfirmedSettlement;
  readonly fields:     FeedbackFields;
}

export type EmitFeedbackFn = (input: EmitFeedbackInput) => Promise<{
  readonly feedbackTxSignature: string;
  readonly emittedAtSlot?:      number;
}>;

/**
 * Idempotency-aware wrapper. On replay collision, looks up the prior
 * emission and returns its signature so the caller observes a stable
 * `FeedbackEmissionResult` across retries.
 */
export async function emitWithIdempotency(
  emit:           EmitFeedbackFn,
  lookupPrior:    PriorEmissionLookup | undefined,
  input:          EmitFeedbackInput,
): Promise<FeedbackEmissionResult> {
  try {
    const r = await emit(input);
    return {
      paymentIdHash:       input.settlement.paymentIdHash,
      feedbackTxSignature: r.feedbackTxSignature,
      emittedAtSlot:       r.emittedAtSlot,
    };
  } catch (e) {
    if (!looksLikeReplay(e) || !lookupPrior) throw e;
    const prior = await lookupPrior(input.settlement.paymentIdHash);
    if (!prior) throw e;
    return {
      paymentIdHash:       input.settlement.paymentIdHash,
      feedbackTxSignature: prior.feedbackTxSignature,
      emittedAtSlot:       prior.emittedAtSlot,
    };
  }
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max);
}

export function placeholderPayer(): PublicKey {
  return PublicKey.default;
}
