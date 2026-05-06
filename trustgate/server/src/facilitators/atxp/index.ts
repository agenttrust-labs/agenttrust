/**
 * `Atxp` — FacilitatorAdapter for atxp_ai's JWT-bound x402 flow.
 *
 * Differs from Pay.sh / Dexter on the proof shape: atxp signs a JWT
 * carrying the payment claim alongside the partially-signed Solana tx.
 * AgentTrust still verifies the on-chain SPL transfer (via
 * deps.validateOnChainTx) AND additionally verifies the JWT's iss + sig
 * via deps.verifyAtxpJwt. The two layers must agree on payer + amount +
 * mint + recipient; mismatches return mismatched_payment_context.
 *
 * parseRequest is async because JWT verification needs a JWKS fetch
 * (deps.verifyAtxpJwt is responsible for cache + TTL).
 *
 * Reuses pay-sh's pure helpers (canonicalChallengeBytes, ReplayCache,
 * crossCheck, emitWithIdempotency) — these are AgentTrust-wide
 * infrastructure, not facilitator-specific.
 */

import type { Request as ExpressRequest } from "express";
import { PublicKey } from "@solana/web3.js";

import { GateDecision } from "../../types";
import { buildHeadersForDecision } from "../../x402";
import {
  ChallengeResponse,
  ConfirmedSettlement,
  FacilitatorAdapter,
  FacilitatorProtocol,
  FeedbackEmissionResult,
  PaymentProofRejection,
  PaymentProofValidation,
  SettlementResponse,
  VerifyContext,
} from "../types";

import {
  ReplayCache,
  bytesToHex,
  canonicalChallengeBytes,
  deriveMemoHash,
  hexToBytes,
  sameNetwork,
  sanitizeDetail,
  type EmitFeedbackFn,
  type FeedbackFields,
  type PriorEmissionLookup,
  type SignDecisionFn,
  type ValidateOnChainTxFn,
} from "../pay-sh";
import { verifyEnvelope, canonicalDecisionBytes } from "../pay-sh/sig";
import { rejection, parsePaymentPayload, fromOnChainError, crossCheck } from "../pay-sh/proof-validator";
import { emitWithIdempotency } from "../pay-sh/feedback";

import { AtxpFacilitatorBodySchema, AtxpPaymentRequirements } from "./schemas";
import { AtxpRawMeta, attachMeta, readMeta } from "./request-meta";

// ---------------------------------------------------------------------------
// JWT verification contract (deps-injected)
// ---------------------------------------------------------------------------

export interface AtxpJwtClaims {
  readonly iss:                string;     // atxp tenant issuer
  readonly sub:                string;     // payer wallet pubkey, base58
  readonly amount:             string;     // atomic units, stringified
  readonly mint:               string;     // base58
  readonly recipient:          string;     // base58 (ATA)
  readonly paymentIdHashHex:   string;     // 64 hex chars
  readonly exp:                number;     // unix seconds
}

export type VerifyAtxpJwtFn = (token: string, jwksUri: string, kid?: string) => Promise<
  | { ok: true; claims: AtxpJwtClaims }
  | { ok: false; reason: PaymentProofRejection; detail?: string }
>;

// ---------------------------------------------------------------------------
// On-chain validation contract — same as Pay.sh, re-declared local
// ---------------------------------------------------------------------------

export interface OnChainTxValidation {
  readonly confirmed: boolean;
  readonly payer?:             PublicKey;
  readonly signature?:         string;
  readonly slot?:              number;
  readonly transferredAmount?: bigint;
  readonly transferredMint?:   PublicKey;
  readonly transferRecipient?: PublicKey;
  readonly errorReason?:       PaymentProofRejection;
  readonly errorDetail?:       string;
}

export interface AtxpDeps {
  readonly signingNetwork:     string;
  readonly feePayer:           PublicKey;
  readonly validateOnChainTx:  ValidateOnChainTxFn;
  readonly emitFeedbackCpi:    EmitFeedbackFn;
  readonly priorEmissionLookup?: PriorEmissionLookup;
  readonly replayCache?:       ReplayCache;
  readonly signDecision?:      SignDecisionFn;
  readonly clockSkewMs?:       number;
  /** JWT verifier — fetches JWKS, verifies sig, checks `iss`/`exp` claims.
   *  AgentTrust-side only enforces shape + cross-check; tenant-trust
   *  comes from the configured `acceptedIssuers` set inside the verifier. */
  readonly verifyAtxpJwt:      VerifyAtxpJwtFn;
}

const U64_MAX = 0xFFFF_FFFF_FFFF_FFFFn;

export class Atxp implements FacilitatorAdapter {
  readonly name = "atxp";
  readonly description = "atxp_ai — JWT-bound x402 facilitator";
  readonly protocols: ReadonlyArray<FacilitatorProtocol> = ["x402"];

  private readonly replays: ReplayCache;

  constructor(private readonly deps: AtxpDeps) {
    this.replays = deps.replayCache ?? new ReplayCache();
  }

  async parseRequest(req: ExpressRequest): Promise<VerifyContext | null> {
    const parsed = AtxpFacilitatorBodySchema.safeParse(req.body);
    if (!parsed.success) return null;

    const { paymentRequirements: pr, paymentPayload: pp } = parsed.data;
    const amountStr = pickAmount(pr);
    if (amountStr === null || amountStr === "0") return null;
    const amountBig = BigInt(amountStr);
    if (amountBig > U64_MAX) return null;

    if (!sameNetwork(pr.network, this.deps.signingNetwork)) return null;
    if (pr.extra.agentTrust.expectedNetwork
        && !sameNetwork(pr.extra.agentTrust.expectedNetwork, this.deps.signingNetwork)) {
      return null;
    }
    if (pr.payTo !== pr.extra.agentTrust.payeeRecipient) return null;

    const memoHash = deriveMemoHash(pr.extra.memo);
    if (!this.verifyServiceSignature(pr, memoHash, amountBig)) return null;

    const skew = this.deps.clockSkewMs ?? 60_000;
    const expiresAtMs = pr.extra.agentTrust.issuedAt
      + (pr.maxTimeoutSeconds ?? 60) * 1000
      + skew;
    if (Date.now() > expiresAtMs) return null;

    // Async JWT verification — atxp's load-bearing differentiator. Only
    // attempted when a paymentPayload is present (verify-only requests
    // that lack a proof skip this and let routes return 400).
    let verifiedIss = "";
    if (pp) {
      const result = await this.deps.verifyAtxpJwt(
        pp.payload.token, pr.extra.atxp.jwksUri, pr.extra.atxp.kid,
      );
      if (!result.ok) return null;
      // Cross-check JWT claims against the on-the-wire requirements.
      const c = result.claims;
      if (c.amount !== amountStr) return null;
      if (c.mint !== pr.asset) return null;
      if (c.recipient !== pr.extra.agentTrust.payeeRecipient) return null;
      if (c.paymentIdHashHex !== bytesToHex(memoHash)) return null;
      if (c.exp * 1000 < Date.now() - skew) return null;
      verifiedIss = c.iss;
    }

    const meta: AtxpRawMeta = {
      expectedRecipient: new PublicKey(pr.extra.agentTrust.payeeRecipient),
      network:           pr.network,
      jwksUri:           pr.extra.atxp.jwksUri,
      kid:               pr.extra.atxp.kid,
      verifiedJwtIss:    verifiedIss,
      body:              parsed.data,
    };
    return attachMeta(
      {
        payerAgent:    new PublicKey(pr.extra.agentTrust.payerAgentAsset),
        payeeAgent:    new PublicKey(pr.extra.agentTrust.payeeAgentAsset),
        amount:        amountBig,
        mint:          new PublicKey(pr.asset),
        policyId:      pr.extra.agentTrust.policyId,
        facilitator:   this.name,
        paymentIdHash: memoHash,
      },
      meta,
    );
  }

  formatChallenge(decision: GateDecision, ctx: VerifyContext): ChallengeResponse {
    const { httpStatus, headers } = buildHeadersForDecision(decision);
    const payerAgentB58 = ctx.payerAgent.toBase58();

    let body: Record<string, unknown>;
    switch (decision.kind) {
      case "Allow":
        body = { isValid: true, payerAgent: payerAgentB58, decision };
        break;
      case "Deny":
        body = {
          isValid: false, payerAgent: payerAgentB58,
          invalidReason: decision.reasonName, reasonCode: decision.reasonCode, decision,
        };
        break;
      case "RequireValidation":
        body = {
          isValid: false, payerAgent: payerAgentB58,
          invalidReason: "RequireValidation",
          capabilityHash: bytesToHex(decision.capabilityHash), decision,
        };
        break;
    }

    if (this.deps.signDecision && ctx.paymentIdHash) {
      const issuedAt = Date.now();
      const decisionJson = JSON.stringify(decision);
      const sig = this.deps.signDecision(canonicalDecisionBytes({
        issuedAt, paymentIdHashHex: bytesToHex(ctx.paymentIdHash), decisionJson,
      }));
      body = { ...body, envelope: {
        issuedAt, paymentIdHash: bytesToHex(ctx.paymentIdHash),
        signature: bytesToHex(sig), signedDecision: decisionJson,
      } };
    }
    return { status: httpStatus, headers, body };
  }

  formatSettlement(ctx: VerifyContext): SettlementResponse {
    const meta = readMeta(ctx);
    return {
      unsignedTransactionBase64: null,
      facilitatorMeta: {
        network:    meta?.network ?? this.deps.signingNetwork,
        feePayer:   this.deps.feePayer.toBase58(),
        payeeAgent: ctx.payeeAgent.toBase58(),
        policyId:   ctx.policyId,
        atxpIssuer: meta?.verifiedJwtIss,
        jwksUri:    meta?.jwksUri,
      },
    };
  }

  async validatePaymentProof(
    proof: unknown,
    ctx: VerifyContext,
  ): Promise<PaymentProofValidation> {
    const meta = readMeta(ctx);
    if (!meta) {
      return rejection("malformed_payload",
        "VerifyContext missing atxp meta — was parseRequest called?");
    }
    const parse = parsePaymentPayload(proof);
    if (!parse.ok) return parse.rejection;

    let onChain: OnChainTxValidation;
    try {
      onChain = await this.deps.validateOnChainTx(parse.txBase64);
    } catch (e) {
      return rejection(
        "settlement_failed",
        sanitizeDetail(e instanceof Error ? e.message : "validateOnChainTx threw"),
      );
    }

    if (onChain.errorReason || onChain.errorDetail) {
      return fromOnChainError(onChain.errorReason, onChain.errorDetail);
    }
    if (!onChain.confirmed) return rejection("invalid_signature", "transaction not confirmed");
    if (
      !onChain.payer || !onChain.signature ||
      onChain.transferredAmount === undefined ||
      !onChain.transferredMint || !onChain.transferRecipient
    ) {
      return rejection("settlement_failed",
        "validateOnChainTx confirmed=true but required fields are missing");
    }

    const cross = crossCheck(
      {
        payer:             onChain.payer,
        signature:         onChain.signature,
        slot:              onChain.slot,
        transferredAmount: onChain.transferredAmount,
        transferredMint:   onChain.transferredMint,
        transferRecipient: onChain.transferRecipient,
      },
      ctx, meta, this.deps.feePayer,
    );
    if (!cross.valid) return cross;

    if (ctx.paymentIdHash) {
      const observe = this.replays.observe(cross.txSignature, ctx.paymentIdHash);
      if (observe === "collision") {
        return rejection(
          "mismatched_payment_context",
          "tx signature already bound to a different paymentIdHash",
        );
      }
    }
    return cross;
  }

  async emitFeedback(
    ctx: VerifyContext,
    settlement: ConfirmedSettlement,
  ): Promise<FeedbackEmissionResult> {
    const meta = readMeta(ctx);
    const fields: FeedbackFields = {
      score:       100,
      tag1:        truncate("atxp", 32),
      tag2:        truncate(`policy=${ctx.policyId}`, 32),
      endpoint:    truncate(meta?.body.paymentRequirements.resource ?? "/", 64),
      feedbackUri: "",
    };
    return emitWithIdempotency(
      this.deps.emitFeedbackCpi, this.deps.priorEmissionLookup,
      { ctx, settlement, fields },
    );
  }

  private verifyServiceSignature(
    pr:       AtxpPaymentRequirements,
    memoHash: Uint8Array,
    amount:   bigint,
  ): boolean {
    const sigHex = pr.extra.agentTrust.serviceSignature;
    let sig: Uint8Array;
    try { sig = hexToBytes(sigHex); } catch { return false; }
    const message = canonicalChallengeBytes({
      issuedAt:        pr.extra.agentTrust.issuedAt,
      network:         pr.network,
      amount,
      asset:           pr.asset,
      payTo:           pr.payTo,
      payerAgentAsset: pr.extra.agentTrust.payerAgentAsset,
      payeeAgentAsset: pr.extra.agentTrust.payeeAgentAsset,
      payeeRecipient:  pr.extra.agentTrust.payeeRecipient,
      policyId:        pr.extra.agentTrust.policyId,
      paymentIdHashHex: bytesToHex(memoHash),
    });
    return verifyEnvelope(message, sig, this.deps.feePayer.toBytes());
  }
}

function pickAmount(pr: AtxpPaymentRequirements): string | null {
  const max = pr.maxAmountRequired;
  const amt = pr.amount;
  if (max && amt && max !== amt) return null;
  return max ?? amt ?? null;
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max);
}

export {
  AtxpFacilitatorBodySchema,
  AtxpPaymentRequirementsSchema,
  AtxpPaymentPayloadSchema,
  AtxpAgentTrustExtraSchema,
  AtxpExtraSchema,
  AtxpRequirementsExtraSchema,
} from "./schemas";
export type {
  AtxpFacilitatorBody, AtxpPaymentRequirements, AtxpPaymentPayload,
  AtxpAgentTrustExtra, AtxpExtra,
} from "./schemas";
