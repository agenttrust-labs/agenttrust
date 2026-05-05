/**
 * POST /verify — facilitator-agnostic dispatch into PolicyVault.gate_payment.
 *
 * Pipeline (all four steps facilitator-AGNOSTIC at this layer):
 *
 *   1. registry.getActiveAdapter(req)   pick adapter by X-Facilitator / env
 *   2. adapter.parseRequest(req)        facilitator body shape → VerifyContext
 *   3. simulateGatePayment(ctx)         read-only PolicyVault simulation
 *   4. adapter.formatChallenge(decision, ctx)  wire-level 200 / 402 response
 *
 * Routes never know which protocol the request rode in on. Adapters never
 * touch policy logic.
 */

import { Request, Response, Router } from "express";
import { BN, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

import { simulateGatePayment } from "../chain";
import {
  FacilitatorRegistry,
  NoFacilitatorRegisteredError,
  UnknownFacilitatorError,
  VerifyContext,
} from "../facilitators";

export interface VerifyDeps {
  registry:    FacilitatorRegistry;
  policyVault: Program;
  /** Facilitator pubkey — signs the simulate-tx, not committed. */
  caller:      PublicKey;
}

export function makeVerifyRoute(deps: VerifyDeps): Router {
  const router = Router();

  router.post("/verify", async (req: Request, res: Response) => {
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
      const msg = e instanceof Error ? e.message : String(e);
      return res.status(500).json({
        error: `${adapter.name}.parseRequest failed: ${msg}`,
      });
    }
    if (!ctx) {
      return res.status(400).json({
        error: `facilitator "${adapter.name}" did not recognise the request body`,
      });
    }

    try {
      const decision = await simulateGatePayment({
        policyVault:     deps.policyVault,
        caller:          deps.caller,
        payerAgentAsset: ctx.payerAgent,
        payeeAgentAsset: ctx.payeeAgent,
        amount:          new BN(ctx.amount.toString()),
        mint:            ctx.mint,
        policyId:        ctx.policyId,
      });

      const challenge = adapter.formatChallenge(decision, ctx);
      Object.entries(challenge.headers).forEach(([k, v]) => {
        res.setHeader(k, v as string | string[]);
      });
      return res.status(challenge.status).json(challenge.body ?? { decision });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ error: msg });
    }
  });

  return router;
}
