/**
 * `Dexter` — FacilitatorAdapter for Cascade Dexter.
 *
 * Cascade ships an x402 facilitator named Dexter (per
 * `docs/plan/research/05-trustgate-x402-class.md` §B and the AgentTrust
 * facilitator-priority order in `research/00-thesis/agenttrust-first-buyer.md`).
 * Wire format mirrors x402 v2 with Cascade-specific extensions in the
 * `extra.dexter` block.
 *
 * Implementation note: the security envelope (replay cache, signed
 * challenges, recipient cross-check, idempotent feedback retry) is
 * IDENTICAL to Pay.sh — these are AgentTrust invariants, not
 * facilitator-specific quirks. Where the code is identical, this adapter
 * imports the corresponding helper from `../pay-sh` rather than copying.
 *
 * Differentiation from Pay.sh:
 *   - schema requires `extra.dexter.dexterPolicyVersion`
 *   - settlement metadata includes `settlementRoute`
 *   - facilitator body shape is dexter-specific (own Zod schemas)
 *
 * Anything Cascade-specific that future versions add (a new authentication
 * layer, a different settlement protocol) lives in this file or its
 * sub-modules — never in `pay-sh/` or `types.ts`.
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

// Reuse pay-sh's pure helpers — these are AgentTrust-wide infrastructure,
// not Pay.sh-specific.
import {
  ReplayCache,
  bytesToHex,
  canonicalChallengeBytes,
  deriveMemoHash,
  hexToBytes,
  sameNetwork,
  sanitizeDetail,
  type EmitFeedbackFn,
  type EmitFeedbackInput,
  type FeedbackFields,
  type PriorEmissionLookup,
  type SignDecisionFn,
  type ValidateOnChainTxFn,
} from "../pay-sh";
import { verifyEnvelope } from "../pay-sh/sig";
import {
  rejection,
  parsePaymentPayload,
  fromOnChainError,
  crossCheck,
} from "../pay-sh/proof-validator";
import { emitWithIdempotency } from "../pay-sh/feedback";
import { canonicalDecisionBytes } from "../pay-sh/sig";

import { DexterFacilitatorBodySchema, DexterPaymentRequirements } from "./schemas";
import { DexterRawMeta, attachMeta, readMeta } from "./request-meta";

// ---------------------------------------------------------------------------
// OnChain-validation contract — same shape as Pay.sh's. Re-declared local
// so callers can swap deps without leaking pay-sh's module surface.
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

export interface DexterDeps {
  readonly signingNetwork: string;
  readonly feePayer:       PublicKey;
  readonly validateOnChainTx: ValidateOnChainTxFn;
  readonly emitFeedbackCpi:   EmitFeedbackFn;
  readonly priorEmissionLookup?: PriorEmissionLookup;
  readonly replayCache?: ReplayCache;
  readonly signDecision?: SignDecisionFn;
  readonly clockSkewMs?:  number;
}

const U64_MAX = 0xFFFF_FFFF_FFFF_FFFFn;

export class Dexter implements FacilitatorAdapter {
  readonly name = "dexter";
  readonly description = "Cascade Dexter — x402 facilitator";
  readonly protocols: ReadonlyArray<FacilitatorProtocol> = ["x402"];

  private readonly replays: ReplayCache;

  constructor(private readonly deps: DexterDeps) {
    this.replays = deps.replayCache ?? new ReplayCache();
  }

  async parseRequest(req: ExpressRequest): Promise<VerifyContext | null> {
    const parsed = DexterFacilitatorBodySchema.safeParse(req.body);
    if (!parsed.success) return null;

    const { paymentRequirements: pr } = parsed.data;
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

    const meta: DexterRawMeta = {
      expectedRecipient:   new PublicKey(pr.extra.agentTrust.payeeRecipient),
      network:             pr.network,
      dexterPolicyVersion: pr.extra.dexter.dexterPolicyVersion,
      settlementRoute:     pr.extra.dexter.settlementRoute,
      body:                parsed.data,
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
          isValid:       false,
          payerAgent:    payerAgentB58,
          invalidReason: decision.reasonName,
          reasonCode:    decision.reasonCode,
          decision,
        };
        break;
      case "RequireValidation":
        body = {
          isValid:        false,
          payerAgent:     payerAgentB58,
          invalidReason:  "RequireValidation",
          capabilityHash: bytesToHex(decision.capabilityHash),
          decision,
        };
        break;
    }

    if (this.deps.signDecision && ctx.paymentIdHash) {
      const issuedAt = Date.now();
      const decisionJson = JSON.stringify(decision);
      const envelope = canonicalDecisionBytes({
        issuedAt,
        paymentIdHashHex: bytesToHex(ctx.paymentIdHash),
        decisionJson,
      });
      const sig = this.deps.signDecision(envelope);
      body = {
        ...body,
        envelope: {
          issuedAt,
          paymentIdHash:  bytesToHex(ctx.paymentIdHash),
          signature:      bytesToHex(sig),
          signedDecision: decisionJson,
        },
      };
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
        dexterPolicyVersion: meta?.dexterPolicyVersion,
        settlementRoute:     meta?.settlementRoute,
      },
    };
  }

  async validatePaymentProof(
    proof: unknown,
    ctx: VerifyContext,
  ): Promise<PaymentProofValidation> {
    const meta = readMeta(ctx);
    if (!meta) {
      return rejection(
        "malformed_payload",
        "VerifyContext missing dexter meta — was parseRequest called?",
      );
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
    if (!onChain.confirmed) {
      return rejection("invalid_signature", "transaction not confirmed");
    }
    if (
      !onChain.payer ||
      !onChain.signature ||
      onChain.transferredAmount === undefined ||
      !onChain.transferredMint ||
      !onChain.transferRecipient
    ) {
      return rejection(
        "settlement_failed",
        "validateOnChainTx confirmed=true but required fields are missing",
      );
    }

    // Reuse the shared cross-check via the CrossCheckMeta interface — Dexter
    // satisfies it via DexterRawMeta.expectedRecipient.
    const cross = crossCheck(
      {
        payer:             onChain.payer,
        signature:         onChain.signature,
        slot:              onChain.slot,
        transferredAmount: onChain.transferredAmount,
        transferredMint:   onChain.transferredMint,
        transferRecipient: onChain.transferRecipient,
      },
      ctx,
      meta,
      this.deps.feePayer,
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
      tag1:        truncate("dexter", 32),
      tag2:        truncate(`policy=${ctx.policyId}`, 32),
      endpoint:    truncate(meta?.body.paymentRequirements.resource ?? "/", 64),
      feedbackUri: "",
    };
    return emitWithIdempotency(
      this.deps.emitFeedbackCpi,
      this.deps.priorEmissionLookup,
      { ctx, settlement, fields },
    );
  }

  private verifyServiceSignature(
    pr:        DexterPaymentRequirements,
    memoHash:  Uint8Array,
    amount:    bigint,
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

function pickAmount(pr: DexterPaymentRequirements): string | null {
  const max = pr.maxAmountRequired;
  const amt = pr.amount;
  if (max && amt && max !== amt) return null;
  return max ?? amt ?? null;
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max);
}

// Re-exports so consumers can `import { Dexter, DexterFacilitatorBodySchema, ... } from "@agenttrust/trustgate-server"`.
export {
  DexterFacilitatorBodySchema,
  DexterPaymentRequirementsSchema,
  DexterPaymentPayloadSchema,
  DexterAgentTrustExtraSchema,
  DexterExtraSchema,
  DexterRequirementsExtraSchema,
} from "./schemas";
export type {
  DexterFacilitatorBody,
  DexterPaymentRequirements,
  DexterPaymentPayload,
  DexterAgentTrustExtra,
  DexterExtra,
} from "./schemas";
