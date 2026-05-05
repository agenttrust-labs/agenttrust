/**
 * `mountTrustGate(app, config)` — drop-in Express middleware.
 *
 * Adds the four x402 endpoints to any Express app:
 *   - POST /verify          — read-only gate_payment simulation
 *   - GET  /receipt/:hashHex — FeedbackEmissionLog lookup
 *   - POST /settle          — atomic gate_payment + transfer + emit_feedback
 *   - POST /dispute         — dispute_payment ix
 *
 * The atomic-tx invariant is enforced at compile-time + runtime via the
 * `AtomicityEnforced` marker (see `./atomicity`). Skipping either layer
 * silently corrupts VelocityLedger on Token-2022 TransferHook reverts.
 */

import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import type { Application, Request, Response, Router } from "express";

import {
  AtomicityEnforced,
  AtomicityNotEnforcedError,
  assertAtomicityEnforced,
} from "./atomicity";
import {
  deriveFeedbackLogPda, loadPolicyVault, loadTrustGate, makeProvider,
  simulateGatePayment,
} from "./chain";
import { ProgramIds, DEFAULT_DEVNET_PROGRAM_IDS } from "./types";
import { buildHeadersForDecision } from "./x402";

export interface MountTrustGateConfig extends AtomicityEnforced {
  /** Solana RPC URL. */
  rpcUrl: string;
  /** Facilitator keypair (signs emit_feedback CPIs and pays tx fees). */
  facilitatorKeypair: Keypair;
  /** Default policy_id if `/verify` request omits it. Optional. */
  defaultPolicyId?: number;
  /** Override pinned program IDs (e.g., mainnet redeploy). */
  programIds?: ProgramIds;
  /** Network label for x402 headers (e.g., "solana-devnet", "solana-mainnet"). */
  network?: string;
}

/**
 * Mount the four x402 endpoints onto `app`. Throws synchronously if
 * `atomicityEnforced` is not literal `true` — callers must pass
 * `{ atomicityEnforced: true }` to acknowledge the invariant.
 *
 * Returns a Promise that resolves once IDLs are loaded from the cluster
 * and routes are bound.
 */
export async function mountTrustGate(
  app:    Application,
  config: MountTrustGateConfig,
): Promise<void> {
  assertAtomicityEnforced(config, "mountTrustGate");

  const programIds = config.programIds ?? DEFAULT_DEVNET_PROGRAM_IDS;
  const provider   = makeProvider({
    rpcUrl: config.rpcUrl,
    wallet: config.facilitatorKeypair,
  });

  const policyVault = await loadPolicyVault(provider, programIds.policyVault);
  const trustgate   = await loadTrustGate(provider, programIds.trustgate);

  // Lazy import to keep `express` as an optional peerDependency.
  const { Router } = await import("express");

  app.use(makeVerifyRoute({
    policyVault,
    programIds,
    caller:  config.facilitatorKeypair.publicKey,
    network: config.network,
    Router,
  }));

  app.use(makeReceiptRoute({ trustgate, programIds, Router }));
  app.use(makeSettleRoute({ Router }));
  app.use(makeDisputeRoute({ Router }));
}

// ---------------------------------------------------------------------------
// /verify
// ---------------------------------------------------------------------------
function makeVerifyRoute(deps: {
  policyVault: Program;
  programIds:  ProgramIds;
  caller:      PublicKey;
  network?:    string;
  Router:      typeof import("express")["Router"];
}): Router {
  const router = deps.Router();

  router.post("/verify", async (req: Request, res: Response) => {
    try {
      const { payerAgentAsset, payeeAgentAsset, amount, mint, policyId } = req.body;
      if (!payerAgentAsset || !payeeAgentAsset || amount == null || !mint || policyId == null) {
        return res.status(400).json({
          error: "missing required fields: payerAgentAsset, payeeAgentAsset, amount, mint, policyId",
        });
      }

      const decision = await simulateGatePayment({
        policyVault:     deps.policyVault,
        programIds:      deps.programIds,
        caller:          deps.caller,
        payerAgentAsset: new PublicKey(payerAgentAsset),
        payeeAgentAsset: new PublicKey(payeeAgentAsset),
        amount:          new BN(amount),
        mint:            new PublicKey(mint),
        policyId:        Number(policyId),
      });

      const { httpStatus, headers } = buildHeadersForDecision(decision, deps.network);
      Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
      return res.status(httpStatus).json({ decision });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ error: message });
    }
  });

  return router;
}

// ---------------------------------------------------------------------------
// /receipt
// ---------------------------------------------------------------------------
function makeReceiptRoute(deps: {
  trustgate:  Program;
  programIds: ProgramIds;
  Router:     typeof import("express")["Router"];
}): Router {
  const router = deps.Router();

  router.get("/receipt/:paymentIdHashHex", async (req: Request, res: Response) => {
    try {
      const hex = req.params.paymentIdHashHex;
      if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
        return res.status(400).json({ error: "paymentIdHashHex must be 64 hex chars" });
      }
      const paymentIdHash = Buffer.from(hex, "hex");
      const pda = deriveFeedbackLogPda(deps.programIds.trustgate, paymentIdHash);

      const account = await (deps.trustgate.account as any).feedbackEmissionLog
        .fetchNullable(pda);

      if (!account) {
        return res.status(200).json({
          paymentIdHash: Array.from(paymentIdHash),
          exists:        false,
        });
      }
      return res.status(200).json({
        paymentIdHash: Array.from(paymentIdHash),
        exists:        true,
        score:         account.score,
        isDispute:     account.isDispute === 1,
        emittedAtSlot: account.emittedAtSlot.toNumber(),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ error: message });
    }
  });

  return router;
}

// ---------------------------------------------------------------------------
// /settle and /dispute — atomic-tx assembly stubs
//
// Phase 7 ships the atomicity-guard pattern; the actual atomic transaction
// builder (gate_payment + spl-token transfer + emit_feedback) requires
// real Quantu agent registration to test end-to-end and is therefore wired
// up in Phase 9 E2E. Calling these endpoints in v0.1 returns 501 with a
// pointer to the atomicity invariant — production deployments fill via a
// project-specific transaction builder that calls `assertAtomicityEnforced`.
// ---------------------------------------------------------------------------
function makeSettleRoute(deps: {
  Router: typeof import("express")["Router"];
}): Router {
  const router = deps.Router();
  router.post("/settle", async (_req: Request, res: Response) => {
    return res.status(501).json({
      error: "settle_not_implemented_in_v0_1",
      description:
        "atomic gate_payment+transfer+emit_feedback assembly ships in a follow-up. " +
        "Implement using `client.settle({ ..., atomicityEnforced: true })` once " +
        "your facilitator has registered Quantu agents on-chain.",
      reference: "https://github.com/agenttrust-labs/agenttrust/blob/main/docs/plan/research/02-anchor-token2022-cpi-class.md#a2",
    });
  });
  return router;
}

function makeDisputeRoute(deps: {
  Router: typeof import("express")["Router"];
}): Router {
  const router = deps.Router();
  router.post("/dispute", async (_req: Request, res: Response) => {
    return res.status(501).json({
      error: "dispute_not_implemented_in_v0_1",
      description:
        "dispute_payment tx assembly ships in a follow-up. Use " +
        "`client.dispute({ ..., atomicityEnforced: true })` directly when ready.",
    });
  });
  return router;
}

export { AtomicityNotEnforcedError };
