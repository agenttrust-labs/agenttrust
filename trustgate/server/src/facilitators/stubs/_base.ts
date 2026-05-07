/**
 * Shared base for not-yet-implemented FacilitatorAdapter stubs.
 *
 * Pay.sh, Dexter, atxp, and MCPay are all live full adapters as of
 * Phase D (see sibling directories). New facilitators that ship in
 * stages can register a placeholder via this base first; until the
 * integration is built they extend this class, which throws
 * `NotImplementedError` from every method. Routes catch that error and
 * return 501 with the adapter name so callers know to switch
 * facilitators or wait for the rollout.
 *
 * Adding a new stub (replace `<your-facilitator>` with the real name):
 *
 *   ```ts
 *   export class YourFacilitator extends NotImplementedAdapter {
 *     readonly name        = "your-facilitator";
 *     readonly description = "<short pitch — x402 facilitator stub>";
 *     readonly protocols   = ["x402"] as const;
 *   }
 *   ```
 */

import type { Request as ExpressRequest } from "express";

import { GateDecision } from "../../types";
import { NotImplementedError } from "../registry";
import {
  ChallengeResponse,
  ConfirmedSettlement,
  FacilitatorAdapter,
  FacilitatorProtocol,
  FeedbackEmissionResult,
  PaymentProofValidation,
  SettlementResponse,
  VerifyContext,
} from "../types";

export abstract class NotImplementedAdapter implements FacilitatorAdapter {
  abstract readonly name:        string;
  abstract readonly description: string;
  abstract readonly protocols:   ReadonlyArray<FacilitatorProtocol>;

  async parseRequest(_req: ExpressRequest): Promise<VerifyContext | null> {
    throw new NotImplementedError(this.name, "parseRequest");
  }

  formatChallenge(_decision: GateDecision, _ctx: VerifyContext): ChallengeResponse {
    throw new NotImplementedError(this.name, "formatChallenge");
  }

  formatSettlement(_ctx: VerifyContext): SettlementResponse {
    throw new NotImplementedError(this.name, "formatSettlement");
  }

  async validatePaymentProof(
    _proof: unknown,
    _ctx: VerifyContext,
  ): Promise<PaymentProofValidation> {
    throw new NotImplementedError(this.name, "validatePaymentProof");
  }

  async emitFeedback(
    _ctx: VerifyContext,
    _settlement: ConfirmedSettlement,
  ): Promise<FeedbackEmissionResult> {
    throw new NotImplementedError(this.name, "emitFeedback");
  }
}
