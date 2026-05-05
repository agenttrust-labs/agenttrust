/**
 * x402 v2 wire-format helpers — challenge envelope encoder + the
 * `PaymentRequirements` builder shape the demo middleware uses.
 *
 * Implements the spec from `docs/plan/research/05-trustgate-x402-class.md`
 * §A.4 (PaymentRequirements) + §A.5 (PaymentPayload). The demo emits v2;
 * the `X-Payment-Required` header alias is set for v1 fallback compat.
 */

import type { Request } from "express";

export interface AgentTrustExtraInput {
  readonly payerAgentAsset: string;
  readonly payeeAgentAsset: string;
  readonly payeeRecipient:  string;
  readonly policyId:        number;
}

export interface PaymentRequirementsExtraInput {
  readonly feePayer:    string;
  readonly memo:        string;
  readonly agentTrust:  AgentTrustExtraInput;
}

export interface PaymentRequirementsInput {
  readonly scheme:            "exact";
  readonly network:           string;
  readonly maxAmountRequired: string;
  readonly asset:             string;
  readonly payTo:             string;
  readonly resource:          string;
  readonly description?:      string;
  readonly maxTimeoutSeconds: number;
  readonly extra:             PaymentRequirementsExtraInput;
}

export interface ChallengeEnvelope {
  readonly x402Version: 2;
  readonly accepts:     ReadonlyArray<PaymentRequirementsInput>;
}

export type PaymentRequirementsBuilder = (req: Request) => PaymentRequirementsInput;

/**
 * Build a PaymentRequirements builder. Captures static fields once and
 * supplies a per-request `memo` (the 32-byte payment_id_hash) derived from
 * a request-bound id so each call gets its own on-chain emission slot.
 */
export function buildPaymentRequirements(args: {
  scheme:            "exact";
  network:           string;
  amount:            bigint;
  asset:             string;
  payTo:             string;
  resource:          string;
  description?:      string;
  maxTimeoutSeconds: number;
  feePayer:          string;
  agentTrust:        AgentTrustExtraInput;
  memoFor:           (req: Request) => string;
}): PaymentRequirementsBuilder {
  return (req) => ({
    scheme:            args.scheme,
    network:           args.network,
    maxAmountRequired: args.amount.toString(),
    asset:             args.asset,
    payTo:             args.payTo,
    resource:          args.resource,
    description:       args.description,
    maxTimeoutSeconds: args.maxTimeoutSeconds,
    extra: {
      feePayer:   args.feePayer,
      memo:       args.memoFor(req),
      agentTrust: args.agentTrust,
    },
  });
}

export function encodeChallengeEnvelope(envelope: ChallengeEnvelope): string {
  return Buffer.from(JSON.stringify(envelope), "utf-8").toString("base64");
}
