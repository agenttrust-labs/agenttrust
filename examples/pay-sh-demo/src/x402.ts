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
  readonly issuedAt:        number;
  readonly serviceSignature: string;
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

/** Per-challenge ed25519 signer the demo wires to the facilitator
 *  keypair. Signs canonical envelope bytes (B5). */
export type SignChallengeFn = (canonicalBytes: Uint8Array) => Uint8Array;

/** Per-request canonical-bytes builder — produced and used inside
 *  `buildPaymentRequirements` only. Exposed for the test path that
 *  builds requirements from outside the middleware. */
export interface AgentTrustHints {
  readonly payerAgentAsset: string;
  readonly payeeAgentAsset: string;
  readonly payeeRecipient:  string;
  readonly policyId:        number;
}

/**
 * Build a PaymentRequirements builder. Captures static fields once and
 * supplies per-request `memo` + `agentTrust` hints (so the signature
 * binds to the correct payerAgentAsset for THIS request).
 *
 * `signChallenge` is invoked on every emission to bind the requirements
 * to the facilitator's identity (B5).
 * `canonicalBytesOf` derives the signing payload — pass the same fn the
 * AgentTrust adapter uses to keep both sides byte-compatible.
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
  agentTrustFor:     (req: Request) => AgentTrustHints;
  memoFor:           (req: Request) => string;
  signChallenge:     SignChallengeFn;
  canonicalBytesOf:  (input: {
    issuedAt:        number;
    network:         string;
    amount:          bigint;
    asset:           string;
    payTo:           string;
    payerAgentAsset: string;
    payeeAgentAsset: string;
    payeeRecipient:  string;
    policyId:        number;
    paymentIdHashHex: string;
  }) => Uint8Array;
  bytesToHex:        (bytes: Uint8Array) => string;
  paymentIdHashHexFor: (memo: string) => string;
}): PaymentRequirementsBuilder {
  return (req) => {
    const memo       = args.memoFor(req);
    const agentTrust = args.agentTrustFor(req);
    const issuedAt   = Date.now();
    const paymentIdHashHex = args.paymentIdHashHexFor(memo);
    const canonical = args.canonicalBytesOf({
      issuedAt,
      network:         args.network,
      amount:          args.amount,
      asset:           args.asset,
      payTo:           args.payTo,
      payerAgentAsset: agentTrust.payerAgentAsset,
      payeeAgentAsset: agentTrust.payeeAgentAsset,
      payeeRecipient:  agentTrust.payeeRecipient,
      policyId:        agentTrust.policyId,
      paymentIdHashHex,
    });
    const sig = args.signChallenge(canonical);
    return {
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
        memo,
        agentTrust: {
          ...agentTrust,
          issuedAt,
          serviceSignature: args.bytesToHex(sig),
        },
      },
    };
  };
}

export function encodeChallengeEnvelope(envelope: ChallengeEnvelope): string {
  return Buffer.from(JSON.stringify(envelope), "utf-8").toString("base64");
}
