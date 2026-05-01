/**
 * GET /receipt/:paymentIdHashHex — read on-chain FeedbackEmissionLog.
 *
 * `paymentIdHashHex` is the 64-char hex of the 32-byte payment_id_hash the
 * caller used when invoking `emit_feedback` / `dispute_payment`. Returns
 * 200 with `exists: false` if the log doesn't exist yet (settlement hasn't
 * happened); 200 with the full record once on-chain.
 */

import { Request, Response, Router } from "express";
import { Program } from "@coral-xyz/anchor";

import { deriveFeedbackLogPda } from "../chain";

export interface ReceiptDeps {
  trustgate: Program;
}

export function makeReceiptRoute(deps: ReceiptDeps): Router {
  const router = Router();

  router.get("/receipt/:paymentIdHashHex", async (req: Request, res: Response) => {
    try {
      const hex = req.params.paymentIdHashHex;
      if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
        return res.status(400).json({
          error: "paymentIdHashHex must be 64 hex chars (32 bytes)",
        });
      }
      const paymentIdHash = Buffer.from(hex, "hex");
      const pda = deriveFeedbackLogPda(paymentIdHash);

      const account = await (deps.trustgate.account as any).feedbackEmissionLog
        .fetchNullable(pda);

      if (!account) {
        return res.status(200).json({
          paymentIdHash: Array.from(paymentIdHash),
          exists:        false,
          score:         null,
          isDispute:     null,
          emittedAtSlot: null,
        });
      }

      return res.status(200).json({
        paymentIdHash: Array.from(paymentIdHash),
        exists:        true,
        score:         (account as any).score,
        isDispute:     (account as any).isDispute === 1,
        emittedAtSlot: (account as any).emittedAtSlot.toNumber(),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ error: message });
    }
  });

  return router;
}
