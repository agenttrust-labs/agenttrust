/**
 * POST /dispute — emit a dispute_payment tx for a settled payment.
 *
 * Phase 6 ships this as a 501 stub. Phase 7 SDK fills the dispute-tx
 * construction (PDA-signed CPI to dispute_payment).
 */

import { Request, Response, Router } from "express";

export function makeDisputeRoute(): Router {
  const router = Router();

  router.post("/dispute", async (_req: Request, res: Response) => {
    return res.status(501).json({
      error:       "not_implemented",
      description: "POST /dispute ships in Phase 7 via @agenttrust/trustgate's mountTrustGate middleware",
    });
  });

  return router;
}
