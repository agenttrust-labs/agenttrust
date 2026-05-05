/**
 * `PaySh` — FacilitatorAdapter for Solana Foundation Pay.sh.
 *
 * Pay.sh launched 2026-05-05 as the Foundation's x402-native payment CLI /
 * MCP server. It speaks both **x402 v1/v2** (`PAYMENT-REQUIRED` /
 * `PAYMENT-SIGNATURE` headers, base64 envelopes) and **MPP**
 * (`WWW-Authenticate: Payment …, intent="charge"`).
 *
 * AgentTrust's TrustGate sits ABOVE Pay.sh's protocol — we never fork their
 * code. We compose: TrustGate exposes the standard x402 facilitator API
 * (`POST /verify`, `POST /settle`), translates between Pay.sh's wire shapes
 * and AgentTrust's `gate_payment` decision, and CPIs into
 * `trustgate::emit_feedback` after settlement.
 *
 * Wire format references:
 *   - `docs/plan/research/05-trustgate-x402-class.md` §A.1–A.7
 *   - `coinbase/x402/specs/transports-v2/http.md`
 *   - `coinbase/x402/specs/schemes/exact/scheme_exact_svm.md`
 *
 * Security envelope (per the adversarial review at HEAD~):
 *   - Replay defense via in-memory signature/paymentId binding
 *   - Self-pay defense (facilitator fee payer ≠ transfer authority)
 *   - Amount + mint + recipient cross-check at proof time
 *   - Wall-clock expiry from `paymentRequirements.maxTimeoutSeconds`
 *   - Network case-insensitive equality
 *   - Strict Zod schemas — unknown fields fail loud
 *   - Idempotent `emit_feedback` retry on `init`-account-in-use
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
  EmitFeedbackFn,
  PriorEmissionLookup,
  buildFeedbackFields,
  emitWithIdempotency,
} from "./feedback";
import { bytesToHex, deriveMemoHash, sameNetwork } from "./helpers";
import {
  ReplayCache,
  crossCheck,
  fromOnChainError,
  parsePaymentPayload,
  rejection,
} from "./proof-validator";
import { sanitizeDetail } from "./helpers";
import { PayShRawMeta, attachMeta, readMeta } from "./request-meta";
import {
  FacilitatorBodySchema,
  PaymentRequirements,
} from "./schemas";

// ---------------------------------------------------------------------------
// Deps — chain calls live here so tests can mock without an Anchor provider
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

export type ValidateOnChainTxFn = (txBase64: string) => Promise<OnChainTxValidation>;

export interface PayShDeps {
  /** Network slug ("solana-devnet" | "solana-mainnet" | "localnet") the
   *  facilitator gates against. parseRequest rejects mismatches. */
  readonly signingNetwork: string;
  /** Pay.sh-side fee payer. The transfer authority MUST NOT equal this — the
   *  x402 SVM spec requires the facilitator fee payer be a separate principal. */
  readonly feePayer: PublicKey;
  /** Validates a base64 VersionedTransaction and extracts the load-bearing
   *  fields. Production: RPC + parser. Tests: deterministic stub. */
  readonly validateOnChainTx: ValidateOnChainTxFn;
  /** Builds + signs + sends `trustgate::emit_feedback`. The signer the
   *  function uses MUST equal `feePayer` (on-chain handler enforces
   *  `payer.key() == facilitator`). */
  readonly emitFeedbackCpi: EmitFeedbackFn;
  /** Looks up an existing `FeedbackEmissionLog` PDA so retries observe a
   *  stable signature. Optional — when absent, retries propagate the
   *  account-already-in-use error. */
  readonly priorEmissionLookup?: PriorEmissionLookup;
  /** Replay cache. Defaults to a fresh in-memory LRU; pass an external one
   *  to share across processes or persist. */
  readonly replayCache?: ReplayCache;
}

// ---------------------------------------------------------------------------
// PaySh adapter
// ---------------------------------------------------------------------------

export class PaySh implements FacilitatorAdapter {
  readonly name = "pay-sh";
  readonly description = "Solana Foundation Pay.sh — x402 + MPP CLI/MCP";
  readonly protocols: ReadonlyArray<FacilitatorProtocol> = ["x402", "mpp"];

  private readonly replays: ReplayCache;

  constructor(private readonly deps: PayShDeps) {
    this.replays = deps.replayCache ?? new ReplayCache();
  }

  async parseRequest(req: ExpressRequest): Promise<VerifyContext | null> {
    const parsed = FacilitatorBodySchema.safeParse(req.body);
    if (!parsed.success) return null;

    const { paymentRequirements: pr } = parsed.data;
    const amountStr = pickAmount(pr);
    if (amountStr === null) return null;
    if (amountStr === "0") return null;

    // u64 upper bound — Anchor / on-chain `gate_payment` expects u64.
    const amountBig = BigInt(amountStr);
    if (amountBig > U64_MAX) return null;

    if (!sameNetwork(pr.network, this.deps.signingNetwork)) return null;
    if (pr.extra.agentTrust.expectedNetwork
        && !sameNetwork(pr.extra.agentTrust.expectedNetwork, this.deps.signingNetwork)) {
      return null;
    }

    const meta: PayShRawMeta = {
      expectedRecipient: new PublicKey(pr.extra.agentTrust.payeeRecipient),
      network: pr.network,
      body:    parsed.data,
    };

    return attachMeta(
      {
        payerAgent:    new PublicKey(pr.extra.agentTrust.payerAgentAsset),
        payeeAgent:    new PublicKey(pr.extra.agentTrust.payeeAgentAsset),
        amount:        amountBig,
        mint:          new PublicKey(pr.asset),
        policyId:      pr.extra.agentTrust.policyId,
        facilitator:   this.name,
        // memo is required at the schema layer — paymentIdHash is always populated.
        paymentIdHash: deriveMemoHash(pr.extra.memo),
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
        // x402 facilitator-API verify-response: { isValid, payer? }
        // We omit `payer` (the SOL wallet is unknown until settlement) to
        // avoid misleading callers. `payerAgent` is the Quantu PDA.
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
    return { status: httpStatus, headers, body };
  }

  formatSettlement(ctx: VerifyContext): SettlementResponse {
    const meta = readMeta(ctx);
    return {
      // Pay.sh constructs + signs the SPL transfer client-side; we gate +
      // validate. No unsigned tx is returned to the caller.
      unsignedTransactionBase64: null,
      facilitatorMeta: {
        network:    meta?.network ?? this.deps.signingNetwork,
        feePayer:   this.deps.feePayer.toBase58(),
        payeeAgent: ctx.payeeAgent.toBase58(),
        policyId:   ctx.policyId,
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
        "VerifyContext missing pay-sh meta — was parseRequest called?",
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

    // Replay defense — bind sig → paymentIdHash. Same sig with a new hash
    // means someone is trying to pay twice with the same tx under different
    // payment IDs. paymentIdHash is guaranteed populated because the schema
    // layer requires `extra.memo`.
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
    const fields = buildFeedbackFields(
      ctx,
      meta?.body.paymentRequirements.resource,
      this.name,
    );
    return emitWithIdempotency(
      this.deps.emitFeedbackCpi,
      this.deps.priorEmissionLookup,
      { ctx, settlement, fields },
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** u64 max — bound on `amount` to keep on-chain `gate_payment` packing safe. */
const U64_MAX = 0xFFFF_FFFF_FFFF_FFFFn;

/**
 * Pick the amount field, preferring `maxAmountRequired`. Returns `null`
 * when neither is present, OR when both are present with disagreeing
 * values (a footgun — fail loud rather than silently picking one).
 */
function pickAmount(pr: PaymentRequirements): string | null {
  const max = pr.maxAmountRequired;
  const amt = pr.amount;
  if (max && amt && max !== amt) return null;
  return max ?? amt ?? null;
}

// Re-exports for tests + external consumers.
export { ReplayCache } from "./proof-validator";
export {
  AgentTrustExtraSchema,
  AmountString,
  FacilitatorBodySchema as PayShFacilitatorBodySchema,
  PaymentPayloadSchema as PayShPaymentPayloadSchema,
  PaymentRequirementsSchema as PayShPaymentRequirementsSchema,
  PubkeyString,
} from "./schemas";
export type {
  AgentTrustExtra,
  FacilitatorBody as PayShFacilitatorBody,
  PaymentPayload as PayShPaymentPayload,
  PaymentRequirements as PayShPaymentRequirements,
} from "./schemas";
export { deriveMemoHash, bytesToHex, sameNetwork } from "./helpers";
export {
  DEFAULT_FEEDBACK_SCORE,
  type EmitFeedbackFn,
  type EmitFeedbackInput,
  type FeedbackFields,
  type PriorEmissionLookup,
} from "./feedback";
