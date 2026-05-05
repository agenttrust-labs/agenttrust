/**
 * `paymentMiddleware` — Express middleware that gates a route behind
 * Pay.sh / x402 + AgentTrust.
 *
 * Flow:
 *   1. No `PAYMENT-SIGNATURE` / `X-PAYMENT` header → emit 402 with the x402
 *      v2 envelope (base64) advertising the SERVICE's PaymentRequirements
 *   2. Header present → parse the proof, run AgentTrust pipeline:
 *      adapter.parseRequest → decide(ctx) → adapter.formatChallenge
 *      (Deny path) OR adapter.validatePaymentProof + adapter.emitFeedback
 *      (Allow path)
 *   3. Allow → forward to the wrapped handler with `X-Payment-Receipt`
 *      header set to the feedback CPI signature
 *
 * The middleware is the demo's bridge from x402 wire to AgentTrust's
 * adapter pipeline. In production with a real `simulateGatePayment`-backed
 * `decide`, this same shape works for any AgentTrust-aware service.
 */

import type { NextFunction, Request, RequestHandler, Response } from "express";
import { PublicKey } from "@solana/web3.js";

import {
  ConfirmedSettlement,
  GateDecision,
  PaySh,
  VerifyContext,
} from "@agenttrust/trustgate-server";

import { DemoOnChainStub, buildConfirmedSettlement } from "./deps";
import {
  PaymentRequirementsBuilder,
  buildPaymentRequirements,
  encodeChallengeEnvelope,
} from "./x402";

export type DecideFn = (ctx: VerifyContext) => Promise<GateDecision>;

export interface PaymentMiddlewareOptions {
  readonly adapter:                PaySh;
  readonly chainStub:              DemoOnChainStub;
  readonly decide:                 DecideFn;
  readonly buildPaymentRequirements: PaymentRequirementsBuilder;
  readonly facilitator:            PublicKey;
  readonly network:                string;
}

const PAY_SIG_HEADERS = ["payment-signature", "x-payment"];

export function paymentMiddleware(opts: PaymentMiddlewareOptions): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const requirements = opts.buildPaymentRequirements(req);

    const proof = readProofHeader(req);
    if (!proof) {
      sendChallenge(res, requirements);
      return;
    }

    let paymentPayload: unknown;
    try {
      paymentPayload = decodeProofHeader(proof);
    } catch {
      res.status(400).json({ error: "malformed_payment_proof" });
      return;
    }

    const ctx = await opts.adapter.parseRequest(synthesizeRequest({
      paymentRequirements: requirements,
      paymentPayload,
    }));
    if (!ctx) {
      res.status(400).json({ error: "facilitator could not parse request" });
      return;
    }

    const decision = await opts.decide(ctx);

    if (decision.kind !== "Allow") {
      const challenge = opts.adapter.formatChallenge(decision, ctx);
      applyHeaders(res, challenge.headers);
      res.status(challenge.status).json(challenge.body ?? { decision });
      return;
    }

    // Allow path — validate proof + emit feedback.
    opts.chainStub.setHint({
      payer:             new PublicKey(extractPayerPubkey(paymentPayload) ?? ctx.payerAgent),
      transferredAmount: ctx.amount,
      transferredMint:   ctx.mint,
      transferRecipient: opts.adapter
        ? new PublicKey(requirements.extra.agentTrust.payeeRecipient)
        : ctx.payeeAgent,
    });

    const validation = await opts.adapter.validatePaymentProof(paymentPayload, ctx);
    if (!validation.valid) {
      res.status(402).json({
        error:  validation.reason,
        detail: validation.detail,
      });
      return;
    }

    const settlement: ConfirmedSettlement = buildConfirmedSettlement(
      ctx,
      validation.txSignature,
      validation.payer,
    );

    let feedbackSig: string;
    try {
      const fb = await opts.adapter.emitFeedback(ctx, settlement);
      feedbackSig = fb.feedbackTxSignature;
    } catch (e) {
      res.status(500).json({
        error:  "feedback_emission_failed",
        detail: e instanceof Error ? e.message : String(e),
      });
      return;
    }

    const settleResp = opts.adapter.formatSettlement(ctx);
    res.setHeader("X-Payment-Receipt", feedbackSig);
    res.setHeader("X-Payment-Network", opts.network);
    Object.entries(settleResp.facilitatorMeta).forEach(([k, v]) => {
      if (typeof v === "string") res.setHeader(k, v);
    });
    next();
  };
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function readProofHeader(req: Request): string | null {
  for (const name of PAY_SIG_HEADERS) {
    const v = req.header(name);
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

function decodeProofHeader(value: string): unknown {
  // Pay.sh's PAYMENT-SIGNATURE header is the base64-JSON PaymentPayload.
  // X-PAYMENT (v1) is JSON. Try base64-decode first; fall back to plain JSON.
  try {
    const decoded = Buffer.from(value, "base64").toString("utf-8");
    const json = JSON.parse(decoded);
    if (json && typeof json === "object") return json;
  } catch { /* fall through */ }
  return JSON.parse(value);
}

function extractPayerPubkey(paymentPayload: unknown): PublicKey | undefined {
  if (!paymentPayload || typeof paymentPayload !== "object") return undefined;
  const inner = (paymentPayload as Record<string, unknown>).payload;
  if (!inner || typeof inner !== "object") return undefined;
  const auth = (inner as Record<string, unknown>).authorization;
  if (auth && typeof auth === "object") {
    const from = (auth as Record<string, unknown>).from;
    if (typeof from === "string") {
      try { return new PublicKey(from); } catch { /* skip */ }
    }
  }
  return undefined;
}

function sendChallenge(res: Response, requirements: ReturnType<PaymentRequirementsBuilder>): void {
  const envelope = { x402Version: 2 as const, accepts: [requirements] };
  const b64      = encodeChallengeEnvelope(envelope);
  res.setHeader("PAYMENT-REQUIRED", b64);
  res.setHeader("X-Payment-Required", b64);
  res.setHeader(
    "Access-Control-Expose-Headers",
    "PAYMENT-REQUIRED, X-Payment-Required, X-Payment-Receipt",
  );
  res.status(402).json({
    error:   "payment_required",
    accepts: [requirements],
  });
}

function applyHeaders(
  res: Response,
  headers: Readonly<Record<string, string | readonly string[]>>,
): void {
  Object.entries(headers).forEach(([k, v]) => {
    res.setHeader(k, v as string | string[]);
  });
}

function synthesizeRequest(body: unknown): Request {
  return { body, header: () => undefined } as unknown as Request;
}

export { buildPaymentRequirements };
