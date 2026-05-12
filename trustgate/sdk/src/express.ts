/**
 * `mountTrustGate(app, config)` — drop-in Express middleware.
 *
 * Adds the two read-only x402 endpoints to any Express app:
 *   - POST /verify          — read-only gate_payment simulation
 *   - GET  /receipt/:hashHex — FeedbackEmissionLog lookup
 *
 * The full settle / dispute write-path routes live in
 * `@agenttrust/trustgate-server`'s `mountFacilitatorRoutes` — that's the
 * canonical home of the tx-signing wiring. This SDK middleware is the
 * minimal read-only surface a facilitator can drop into an existing
 * Express app without taking on the server's keypair / x402 registry
 * configuration.
 *
 * The atomic-tx invariant marker (`AtomicityEnforced`) is still required
 * here because the SDK exports `client.settle` from the same package —
 * passing `{ atomicityEnforced: true }` acknowledges callers will use
 * the literal-type-guard + runtime-throw atomic settle path. Skipping
 * the invariant silently corrupts VelocityLedger on Token-2022
 * TransferHook reverts.
 */

import { BN, Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import type { Application, Request, Response, Router } from "express";

import {
  AtomicityEnforced,
  AtomicityNotEnforcedError,
  assertAtomicityEnforced,
} from "./atomicity";
import {
  deriveFeedbackLogPda, loadPolicyVault, loadTrustGate, makeProvider,
  simulateGatePayment, SignerLike,
} from "./chain";
import { ProgramIds, DEFAULT_DEVNET_PROGRAM_IDS } from "./types";
import { buildHeadersForDecision } from "./x402";

export interface MountTrustGateConfig extends AtomicityEnforced {
  /** Solana RPC URL. */
  rpcUrl: string;
  /**
   * Facilitator identity. Accepts either a full `Keypair` or a pubkey-only
   * shape (`{ publicKey: PublicKey }` / `PublicKey`). The middleware's
   * `/verify` route only reads the pubkey (gate_payment simulation runs
   * with `sigVerify: false`); pass a `Keypair` only if you intend to use
   * the same provider for a downstream signing path. The full settle /
   * dispute write-path lives in `trustgate-server::mountFacilitatorRoutes`
   * and is the right home for the keypair requirement.
   */
  facilitatorKeypair: Keypair | PublicKey | { publicKey: PublicKey };
  /** Default policy_id if `/verify` request omits it. Optional. */
  defaultPolicyId?: number;
  /** Override pinned program IDs (e.g., mainnet redeploy). */
  programIds?: ProgramIds;
  /** Network label for x402 headers (e.g., "solana-devnet", "solana-mainnet"). */
  network?: string;
}

/**
 * Internal: normalise the broadened `facilitatorKeypair` field into the
 * `SignerLike` shape `makeProvider` consumes. `PublicKey` instances are
 * wrapped to `{ publicKey }`; the existing two valid shapes pass through.
 */
function toSignerLike(
  input: Keypair | PublicKey | { publicKey: PublicKey },
): SignerLike {
  if (input instanceof PublicKey) {
    return { publicKey: input };
  }
  return input;
}

/**
 * Mount the read-only x402 endpoints onto `app`. Throws synchronously if
 * `atomicityEnforced` is not literal `true` — callers must pass
 * `{ atomicityEnforced: true }` to acknowledge the invariant covering
 * the companion `client.settle` path.
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
  const wallet     = toSignerLike(config.facilitatorKeypair);
  const provider   = makeProvider({
    rpcUrl: config.rpcUrl,
    wallet,
  });

  const policyVault = await loadPolicyVault(provider, programIds.policyVault);
  const trustgate   = await loadTrustGate(provider, programIds.trustGate);

  // Lazy import to keep `express` as an optional peerDependency.
  const { Router } = await import("express");

  app.use(makeVerifyRoute({
    policyVault,
    programIds,
    caller:  wallet.publicKey,
    network: config.network,
    Router,
  }));

  app.use(makeReceiptRoute({ trustgate, programIds, Router }));
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
      const pda = deriveFeedbackLogPda(deps.programIds.trustGate, paymentIdHash);

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
// /settle and /dispute — intentionally NOT mounted from this middleware.
//
// The write-path routes (settle, dispute) live in
// `@agenttrust/trustgate-server`'s `mountFacilitatorRoutes`. The SDK
// middleware stays minimal so consumers can drop /verify and /receipt
// into an existing Express app without taking on the server's keypair /
// x402 registry configuration. Use `client.settle(...)` directly from
// the SDK for the atomic settle path, or mount the canonical server
// routes from `@agenttrust/trustgate-server` if you want HTTP /settle.
// ---------------------------------------------------------------------------

export { AtomicityNotEnforcedError };
