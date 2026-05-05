/**
 * POST /settle — facilitator-aware atomic settlement.
 *
 * Pipeline:
 *
 *   1. registry.getActiveAdapter(req)
 *   2. adapter.parseRequest(req)            facilitator body → VerifyContext
 *   3. adapter.validatePaymentProof(p, ctx) on-chain proof check + ctx cross-check
 *   4. adapter.emitFeedback(ctx, settled)   trustgate::emit_feedback CPI
 *   5. adapter.formatSettlement(ctx)        wire-level 200 response
 *
 * Adapters that have not implemented settle (stubs) throw `NotImplementedError`
 * from any of the methods above; the route translates that to 501 with the
 * adapter name so callers know to switch facilitators or wait for the rollout.
 */

import { Request, Response, Router } from "express";

import {
  ConfirmedSettlement,
  FacilitatorRegistry,
  NoFacilitatorRegisteredError,
  NotImplementedError,
  UnknownFacilitatorError,
  VerifyContext,
} from "../facilitators";

export interface SettleDeps {
  registry: FacilitatorRegistry;
}

export function makeSettleRoute(deps: SettleDeps): Router {
  const router = Router();

  router.post("/settle", async (req: Request, res: Response) => {
    const adapter = (() => {
      try { return deps.registry.getActiveAdapter(req); }
      catch (e) {
        if (e instanceof UnknownFacilitatorError) {
          res.status(400).json({ error: e.message });
          return undefined;
        }
        if (e instanceof NoFacilitatorRegisteredError) {
          res.status(503).json({ error: e.message });
          return undefined;
        }
        throw e;
      }
    })();
    if (!adapter) return;

    let ctx: VerifyContext | null;
    try {
      ctx = await adapter.parseRequest(req);
    } catch (e) {
      if (e instanceof NotImplementedError) {
        return res.status(501).json({ error: "not_implemented", description: e.message });
      }
      const msg = e instanceof Error ? e.message : String(e);
      return res.status(500).json({
        error: `${adapter.name}.parseRequest failed: ${msg}`,
      });
    }
    if (!ctx) {
      return res.status(400).json({
        error: `facilitator "${adapter.name}" did not recognise the settle request body`,
      });
    }

    const proof: unknown = req.body?.paymentPayload ?? req.body?.proof ?? null;

    try {
      const validation = await adapter.validatePaymentProof(proof, ctx);
      if (!validation.valid) {
        return res.status(402).json({
          error:  validation.reason,
          detail: validation.detail,
        });
      }

      const settlement: ConfirmedSettlement = {
        txSignature:   validation.txSignature,
        payer:         validation.payer,
        payee:         ctx.payeeAgent,
        amount:        ctx.amount,
        mint:          ctx.mint,
        paymentIdHash: ctx.paymentIdHash ?? new Uint8Array(32),
      };

      const feedback   = await adapter.emitFeedback(ctx, settlement);
      const settleResp = adapter.formatSettlement(ctx);

      Object.entries(settleResp.facilitatorMeta).forEach(([k, v]) => {
        if (typeof v === "string") res.setHeader(k, v);
      });

      return res.status(200).json({
        success:             true,
        transaction:         settlement.txSignature,
        feedbackTransaction: feedback.feedbackTxSignature,
        emittedAtSlot:       feedback.emittedAtSlot,
        unsignedTransaction: settleResp.unsignedTransactionBase64,
        facilitatorMeta:     settleResp.facilitatorMeta,
      });
    } catch (e) {
      if (e instanceof NotImplementedError) {
        return res.status(501).json({
          error:       "not_implemented",
          description: e.message,
        });
      }
      const msg = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ error: msg });
    }
  });

  return router;
}
