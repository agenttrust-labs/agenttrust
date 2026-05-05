/**
 * `MockFacilitator` — pure-in-memory adapter for tests + dev smoke flows.
 *
 * No chain calls, no HTTP, deterministic. Three uses:
 *   1. Unit tests — exercise the registry + route plumbing without an Anchor
 *      provider. Confirms Liskov substitution: any test that passes against
 *      `MockFacilitator` also passes against any concrete adapter.
 *   2. Local dev — boot TrustGate with `TRUSTGATE_DEFAULT_FACILITATOR=mock`
 *      and hit `/verify` with the legacy direct-body shape, no facilitator
 *      framework needed.
 *   3. CI integration tests — drives the full /verify → /settle pipeline in
 *      the demo without a Surfpool localnet or `pay` CLI installed.
 *
 * Accepts the legacy direct-body shape so v0.1 callers keep working:
 *   `{ payerAgentAsset, payeeAgentAsset, amount, mint, policyId, paymentIdHash? }`
 */

import type { Request as ExpressRequest } from "express";
import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

import { GateDecision } from "../types";
import { buildHeadersForDecision } from "../x402";
import {
  ChallengeResponse,
  ConfirmedSettlement,
  FacilitatorAdapter,
  FacilitatorProtocol,
  FeedbackEmissionResult,
  PaymentProofValidation,
  SettlementResponse,
  VerifyContext,
} from "./types";

// ---------------------------------------------------------------------------
// Zod schemas (boundary validation)
// ---------------------------------------------------------------------------

const PubkeyString = z.string().refine(
  (v) => {
    try { new PublicKey(v); return true; } catch { return false; }
  },
  { message: "must be a base58 Solana pubkey" },
);

const NumericLike = z.union([z.string(), z.number()]);

const MockVerifyBody = z.object({
  payerAgentAsset: PubkeyString,
  payeeAgentAsset: PubkeyString,
  amount:          NumericLike,
  mint:            PubkeyString,
  policyId:        NumericLike,
  paymentIdHash:   z.array(z.number().int().min(0).max(255)).length(32).optional(),
}).strict();

// ---------------------------------------------------------------------------
// Mock options + class
// ---------------------------------------------------------------------------

export interface MockFacilitatorOptions {
  /** Override `validatePaymentProof` result. Defaults to always-valid with synthetic sig. */
  readonly proofResult?: PaymentProofValidation;
  /** Override `emitFeedback` result. Defaults to a synthetic in-memory result. */
  readonly feedbackResult?: FeedbackEmissionResult;
}

export class MockFacilitator implements FacilitatorAdapter {
  readonly name = "mock";
  readonly description = "In-memory mock facilitator for tests and dev flows";
  readonly protocols: ReadonlyArray<FacilitatorProtocol> = ["x402"];

  private static counter = 0;

  constructor(private readonly opts: MockFacilitatorOptions = {}) {}

  async parseRequest(req: ExpressRequest): Promise<VerifyContext | null> {
    const parsed = MockVerifyBody.safeParse(req.body);
    if (!parsed.success) return null;
    const body = parsed.data;
    return {
      payerAgent:    new PublicKey(body.payerAgentAsset),
      payeeAgent:    new PublicKey(body.payeeAgentAsset),
      amount:        BigInt(body.amount.toString()),
      mint:          new PublicKey(body.mint),
      policyId:      Number(body.policyId),
      facilitator:   this.name,
      paymentIdHash: body.paymentIdHash
        ? Uint8Array.from(body.paymentIdHash)
        : undefined,
      rawRequestMeta: { source: "mock" },
    };
  }

  formatChallenge(decision: GateDecision, _ctx: VerifyContext): ChallengeResponse {
    const { httpStatus, headers } = buildHeadersForDecision(decision);
    return {
      status:  httpStatus,
      headers,
      body:    { decision },
    };
  }

  formatSettlement(_ctx: VerifyContext): SettlementResponse {
    return {
      unsignedTransactionBase64: null,
      facilitatorMeta: { source: "mock" },
    };
  }

  async validatePaymentProof(
    _proof: unknown,
    _ctx: VerifyContext,
  ): Promise<PaymentProofValidation> {
    if (this.opts.proofResult) return this.opts.proofResult;
    return {
      valid:       true,
      payer:       PublicKey.default,
      txSignature: `mock-tx-${++MockFacilitator.counter}`,
    };
  }

  async emitFeedback(
    _ctx: VerifyContext,
    settlement: ConfirmedSettlement,
  ): Promise<FeedbackEmissionResult> {
    if (this.opts.feedbackResult) return this.opts.feedbackResult;
    return {
      paymentIdHash:       settlement.paymentIdHash,
      feedbackTxSignature: `mock-feedback-${++MockFacilitator.counter}`,
    };
  }
}
