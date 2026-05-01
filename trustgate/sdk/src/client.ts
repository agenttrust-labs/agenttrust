/**
 * Client-side helpers — `gatePayment`, `settle`, `dispute`.
 *
 * Use these from your facilitator's backend (TypeScript) to invoke
 * AgentTrust without the Express middleware. `gatePayment` simulates the
 * decision (read-only); `settle` and `dispute` build atomic transactions
 * with the literal-type-guard + runtime-throw atomicity invariant.
 */

import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, Transaction, TransactionSignature } from "@solana/web3.js";

import {
  AtomicityEnforced,
  assertAtomicityEnforced,
} from "./atomicity";
import {
  loadPolicyVault, loadTrustGate, makeProvider, simulateGatePayment,
} from "./chain";
import { GateDecision, ProgramIds, DEFAULT_DEVNET_PROGRAM_IDS } from "./types";

// ---------------------------------------------------------------------------
// gatePayment — read-only simulation
// ---------------------------------------------------------------------------

export interface GatePaymentRequest {
  rpcUrl:           string;
  caller:           Keypair;       // facilitator (only used to sign the simulate-tx; not committed)
  payerAgentAsset:  PublicKey;
  payeeAgentAsset:  PublicKey;
  amount:           bigint | number;
  mint:             PublicKey;
  policyId:         number;
  programIds?:      ProgramIds;
}

export async function gatePayment(req: GatePaymentRequest): Promise<GateDecision> {
  const programIds = req.programIds ?? DEFAULT_DEVNET_PROGRAM_IDS;
  const provider   = makeProvider({ rpcUrl: req.rpcUrl, wallet: req.caller });
  const policyVault = await loadPolicyVault(provider, programIds.policyVault);

  return simulateGatePayment({
    policyVault,
    programIds,
    caller:          req.caller.publicKey,
    payerAgentAsset: req.payerAgentAsset,
    payeeAgentAsset: req.payeeAgentAsset,
    amount:          new BN(req.amount.toString()),
    mint:            req.mint,
    policyId:        req.policyId,
  });
}

// ---------------------------------------------------------------------------
// settle — atomic gate_payment + transfer + emit_feedback
// ---------------------------------------------------------------------------

export interface SettleRequest extends AtomicityEnforced {
  rpcUrl:              string;
  facilitator:         Keypair;
  payerAgent:          Keypair;          // signs SPL transfer
  payerAgentAsset:     PublicKey;
  payeeAgentAsset:     PublicKey;
  amount:              bigint | number;
  mint:                PublicKey;
  policyId:            number;
  payerTokenAccount:   PublicKey;
  payeeTokenAccount:   PublicKey;
  paymentIdHash:       Uint8Array;       // 32 bytes
  feedbackUri:         string;
  score:               number;           // 0..=100
  /** Quantu PDAs the caller has pre-derived (agent_account, collection). */
  agentAccountPda:     PublicKey;
  collectionPda:       PublicKey;
  programIds?:         ProgramIds;
}

/**
 * Atomic settlement. Phase 7 enforces the atomicity invariant; the actual
 * transaction-builder body is the Phase 9 E2E deliverable that wires real
 * Quantu accounts. Calling this in v0.1 throws unless
 * `atomicityEnforced: true` is passed (literal-type-guard + runtime check).
 *
 * Production callers will replace this stub with their own transaction
 * builder OR wait for the v0.2 release.
 */
export async function settle(req: SettleRequest): Promise<TransactionSignature> {
  assertAtomicityEnforced(req, "settle");
  // Phase 9 E2E fills this body. v0.1 gates the API surface + invariant.
  throw new Error(
    "settle: transaction builder ships in v0.2. Phase 7 of AgentTrust ships " +
    "the atomicity-guard surface; the SPL-token + emit_feedback assembly " +
    "needs real Quantu integration which is wired in Phase 9 E2E. Track at " +
    "https://github.com/mohit-1710/agenttrust",
  );
}

// ---------------------------------------------------------------------------
// dispute — emit negative-score feedback
// ---------------------------------------------------------------------------

export interface DisputeRequest extends AtomicityEnforced {
  rpcUrl:              string;
  facilitator:         Keypair;
  payerAgentAsset:     PublicKey;
  payeeAgentAsset:     PublicKey;
  paymentIdHash:       Uint8Array;
  disputeReasonHash:   Uint8Array;       // 32 bytes
  feedbackUri:         string;
  agentAccountPda:     PublicKey;
  collectionPda:       PublicKey;
  programIds?:         ProgramIds;
}

export async function dispute(req: DisputeRequest): Promise<TransactionSignature> {
  assertAtomicityEnforced(req, "dispute");
  throw new Error(
    "dispute: transaction builder ships in v0.2 alongside settle. v0.1 " +
    "gates the API surface + invariant.",
  );
}

// ---------------------------------------------------------------------------
// Re-export the atomicity types for convenience.
// ---------------------------------------------------------------------------
export { AtomicityEnforced, assertAtomicityEnforced } from "./atomicity";
export { AtomicityNotEnforcedError } from "./atomicity";
