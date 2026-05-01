/**
 * POST /settle — atomic gate_payment + transfer + emit_feedback tx.
 *
 * Phase 6 ships this as a 501 stub. Phase 7 (`@agenttrust/trustgate` SDK)
 * provides the canonical atomic-tx assembly with the literal-type-guard +
 * runtime-throw atomicity invariant. The Express server then imports the
 * SDK's `mountTrustGate` to fill this endpoint in production.
 */

import { Request, Response, Router } from "express";

export function makeSettleRoute(): Router {
  const router = Router();

  router.post("/settle", async (_req: Request, res: Response) => {
    return res.status(501).json({
      error:       "not_implemented",
      description: "POST /settle ships in Phase 7 via @agenttrust/trustgate's mountTrustGate middleware",
      reference:   "docs/plan/research/05-trustgate-x402-class.md §atomic-tx-invariant",
    });
  });

  return router;
}
