/**
 * Client-side helpers — `gatePayment`, `settle`, `dispute`.
 *
 * Use these from your facilitator's backend (TypeScript) to invoke
 * AgentTrust without the Express middleware. `gatePayment` simulates the
 * decision (read-only); `settle` and `dispute` build atomic transactions
 * with the literal-type-guard + runtime-throw atomicity invariant.
 */

import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  TransactionSignature,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

import {
  AtomicSettleQuantuAccounts,
  AtomicityEnforced,
  assertAtomicityEnforced,
  composeAtomicSettleTx,
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
  facilitator:         Keypair;       // signs gate_payment + emit_feedback
  payerAgent:          Keypair;       // signs SPL transfer
  payerAgentAsset:     PublicKey;
  payeeAgentAsset:     PublicKey;
  amount:              bigint | number;
  mint:                PublicKey;
  mintDecimals:        number;
  policyId:            number;
  payerTokenAccount:   PublicKey;
  payeeTokenAccount:   PublicKey;
  paymentIdHash:       Uint8Array;    // 32 bytes
  feedbackUri:         string;
  score:               number;        // 0..=100
  tag1?:               string;        // ≤32 chars
  tag2?:               string;        // ≤32 chars
  endpoint?:           string;        // ≤64 chars
  /** Quantu accounts the emit_feedback CPI threads through remaining_accounts. */
  quantuAccounts:      AtomicSettleQuantuAccounts;
  /** Optional ATOM accounts for gate_payment to read tier from. */
  payerAtomStats?:     PublicKey;
  payeeAtomStats?:     PublicKey;
  /** Optional Token-2022 program override; defaults to legacy SPL. */
  tokenProgram?:       PublicKey;
  programIds?:         ProgramIds;
}

/**
 * Atomic settlement: gate_payment + SPL transferChecked + emit_feedback in
 * one signed transaction. The on-chain tx commits or reverts as a unit.
 *
 * Race-window note: gate_payment intentionally returns Ok on Deny (so the
 * read-only /verify path can decode via return-data). The full
 * "all three revert on Deny" property requires the caller to have
 * simulated first — the result of `gatePayment(...)` MUST be Allow before
 * calling `settle`. The on-chain `FeedbackEmissionLog` init-only
 * constraint plus B5 SERVICE-signed challenges close the rest of the
 * race surface; see `atomicity.ts:composeAtomicSettleTx` JSDoc for the
 * full reasoning.
 */
export async function settle(req: SettleRequest): Promise<TransactionSignature> {
  assertAtomicityEnforced(req, "settle");
  const programIds = req.programIds ?? DEFAULT_DEVNET_PROGRAM_IDS;
  const provider   = makeProvider({ rpcUrl: req.rpcUrl, wallet: req.facilitator });
  const policyVault = await loadPolicyVault(provider, programIds.policyVault);
  const trustgate   = await loadTrustGate(provider, programIds.trustgate);

  const { tx } = await composeAtomicSettleTx({
    atomicityEnforced: true,
    programIds,
    policyVault,
    trustgate,
    facilitator:        req.facilitator.publicKey,
    payer:              req.payerAgent.publicKey,
    payerAgentAsset:    req.payerAgentAsset,
    payeeAgentAsset:    req.payeeAgentAsset,
    payerTokenAccount:  req.payerTokenAccount,
    payeeTokenAccount:  req.payeeTokenAccount,
    amount:             BigInt(req.amount.toString()),
    mint:               req.mint,
    mintDecimals:       req.mintDecimals,
    policyId:           req.policyId,
    paymentIdHash:      req.paymentIdHash,
    score:              req.score,
    tag1:               req.tag1     ?? "trustgate",
    tag2:               req.tag2     ?? `policy=${req.policyId}`,
    endpoint:           req.endpoint ?? "/protected",
    feedbackUri:        req.feedbackUri,
    quantuAccounts:     req.quantuAccounts,
    payerAtomStats:     req.payerAtomStats,
    payeeAtomStats:     req.payeeAtomStats,
    tokenProgram:       req.tokenProgram,
  });

  return sendAndConfirmTransaction(
    provider.connection,
    tx,
    [req.facilitator, req.payerAgent],
    { commitment: "confirmed" },
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
