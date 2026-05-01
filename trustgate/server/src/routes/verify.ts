/**
 * POST /verify — read-only gate_payment simulation.
 *
 * Returns 200 Allow / 402 Deny / 402 RequireValidation per x402 spec, with
 * the matching X- headers. Does NOT mutate on-chain state (uses
 * simulateTransaction).
 */

import { Request, Response, Router } from "express";
import { BN, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

import { simulateGatePayment } from "../chain";
import { buildHeadersForDecision } from "../x402";

export interface VerifyDeps {
  policyVault: Program;
  caller:      PublicKey; // facilitator pubkey
}

export function makeVerifyRoute(deps: VerifyDeps): Router {
  const router = Router();

  router.post("/verify", async (req: Request, res: Response) => {
    try {
      const { payerAgentAsset, payeeAgentAsset, amount, mint, policyId } = req.body;

      // Input validation. Returning 400 for malformed; 402 reserved for x402.
      if (!payerAgentAsset || !payeeAgentAsset || amount == null
          || !mint || policyId == null) {
        return res.status(400).json({
          error: "missing required fields: payerAgentAsset, payeeAgentAsset, amount, mint, policyId",
        });
      }

      const decision = await simulateGatePayment({
        policyVault:     deps.policyVault,
        caller:          deps.caller,
        payerAgentAsset: new PublicKey(payerAgentAsset),
        payeeAgentAsset: new PublicKey(payeeAgentAsset),
        amount:          new BN(amount),
        mint:            new PublicKey(mint),
        policyId:        Number(policyId),
      });

      const { httpStatus, headers } = buildHeadersForDecision(decision);
      Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
      return res.status(httpStatus).json({ decision });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ error: message });
    }
  });

  return router;
}
