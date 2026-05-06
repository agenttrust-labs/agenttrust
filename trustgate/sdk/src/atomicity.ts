/**
 * Atomic-tx invariant enforcement.
 *
 * Per `docs/plan/research/02-anchor-token2022-cpi-class.md §A.2`: the
 * `gate_payment + transfer + emit_feedback` triple MUST execute as ONE
 * Solana transaction. Splitting it across two transactions opens a real
 * footgun on Token-2022 mints with `TransferHook` extensions:
 *
 *   1. Tx1 commits `gate_payment` Allow → VelocityLedger.cumulative += amount
 *   2. Tx2 sends transfer → TransferHook reverts (e.g., compliance check fails)
 *   3. VelocityLedger is now corrupted: counted a payment that never happened
 *
 * The SDK enforces this invariant at TWO layers:
 *   - **Compile-time literal type guard.** The `AtomicityEnforced` marker is
 *     `{ atomicityEnforced: true }` — a literal `true`, not `boolean`. TS
 *     rejects any caller that passes `false` or omits the field. `as any`
 *     escape-hatches are caught at runtime (next).
 *   - **Runtime throw.** Every entry point validates `atomicityEnforced ===
 *     true` and throws `AtomicityNotEnforced` otherwise. Stops `as any`
 *     casts cold.
 *
 * Both layers are required: skipping either one re-opens the corruption
 * vector. This is the load-bearing safety property of the SDK.
 */

/**
 * Marker type. Callers MUST pass `{ atomicityEnforced: true }` (literal
 * true, no booleans). Removing this field or passing `false` is a TS
 * compile error.
 */
export interface AtomicityEnforced {
  readonly atomicityEnforced: true;
}

export class AtomicityNotEnforcedError extends Error {
  constructor(siteName: string) {
    super(
      `[${siteName}] atomicityEnforced=true is required to call this function. ` +
      `Splitting gate_payment + transfer + emit_feedback across multiple ` +
      `transactions silently corrupts VelocityLedger when Token-2022 ` +
      `TransferHook reverts. See docs/plan/research/02-anchor-token2022-cpi-class.md §A.2`,
    );
    this.name = "AtomicityNotEnforcedError";
  }
}

/**
 * Runtime check. Call at the top of every settle/dispute/atomic entrypoint.
 * Catches `as any` casts that bypass the literal-type guard.
 */
export function assertAtomicityEnforced(
  cfg: { atomicityEnforced?: unknown },
  siteName: string,
): void {
  if ((cfg as any).atomicityEnforced !== true) {
    throw new AtomicityNotEnforcedError(siteName);
  }
}

// ---------------------------------------------------------------------------
// composeAtomicSettleTx — gate_payment + SPL transfer + emit_feedback in
// ONE Solana transaction. Replaces the v0.1 stub that threw
// AtomicityNotEnforcedError.
//
// Race-window note: the on-chain `gate_payment` handler intentionally
// returns Ok(decision) for both Allow and Deny so the read-only
// /verify path can decode the decision via Anchor's return-data channel.
// "all three succeed or all three revert" therefore relies on the caller
// having simulated first AND on the underlying state being stable across
// the simulate→execute window (~150 slots / 60s blockhash lifetime).
//
// Defenses against a stale Allow-then-Deny race:
//   1. SERVICE-signed challenge envelope binds the requirements to a
//      specific paymentIdHash AND issuedAt (B5)
//   2. on-chain `FeedbackEmissionLog` is init-only, keyed by
//      paymentIdHash — at most one feedback emission per payment
//   3. caller must submit before issuedAt + maxTimeoutSeconds
//
// A future contract addition (gate_payment_strict that returns Err on
// non-Allow) will close the race entirely; for v1 the above defenses
// reduce it to a non-issue at single-tenant scale.
// ---------------------------------------------------------------------------
import { BN, Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

import {
  derivePolicyPda,
  deriveVelocityPda,
  deriveKillSwitchPda,
  deriveFeedbackLogPda,
  deriveTrustGateAuthorityPda,
} from "./chain";
import { buildTransferCheckedIx, deriveAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "./spl";
import { ProgramIds } from "./types";

export interface AtomicSettleQuantuAccounts {
  /** Quantu agent_account PDA for the payee. */
  readonly payeeAgentAccount: PublicKey;
  /** Quantu cnft asset account for the payee. */
  readonly payeeAsset:        PublicKey;
  /** Quantu collection account for the payee. */
  readonly payeeCollection:   PublicKey;
  /** Optional ATOM accounts — all 4 or none. */
  readonly atomConfig?:        PublicKey;
  readonly atomStats?:         PublicKey;
  readonly atomEngineProgram?: PublicKey;
  readonly registryAuthority?: PublicKey;
}

export interface ComposeAtomicSettleArgs extends AtomicityEnforced {
  readonly programIds:         ProgramIds;
  readonly policyVault:        Program;
  readonly trustgate:          Program;
  /** Pubkey that signs gate_payment + transfer authority + feedback. */
  readonly facilitator:        PublicKey;
  /** Payer pubkey that signs the SPL transfer. */
  readonly payer:              PublicKey;
  readonly payerAgentAsset:    PublicKey;
  readonly payeeAgentAsset:    PublicKey;
  readonly payerTokenAccount:  PublicKey;
  readonly payeeTokenAccount:  PublicKey;
  readonly amount:             bigint;
  readonly mint:               PublicKey;
  readonly mintDecimals:       number;
  readonly policyId:           number;
  readonly paymentIdHash:      Uint8Array;       // 32 bytes
  readonly score:              number;           // 0..=100
  readonly tag1:               string;           // ≤32
  readonly tag2:               string;           // ≤32
  readonly endpoint:           string;           // ≤64
  readonly feedbackUri:        string;           // ≤256
  readonly quantuAccounts:     AtomicSettleQuantuAccounts;
  /** Optional ATOM accounts the gate_payment ix reads (vs the emit_feedback CPI). */
  readonly payerAtomStats?:    PublicKey;
  readonly payeeAtomStats?:    PublicKey;
  readonly validationAttestation?: PublicKey;
  /** Optional SPL Token program override (Token-2022 vs Tokenkeg). Defaults to legacy SPL. */
  readonly tokenProgram?:      PublicKey;
}

export interface ComposedAtomicSettle {
  readonly tx:           Transaction;
  readonly instructions: ReadonlyArray<TransactionInstruction>;
  readonly accounts:     {
    readonly policyAccount:    PublicKey;
    readonly velocityLedger:   PublicKey;
    readonly killSwitchState:  PublicKey;
    readonly trustGateAuthority: PublicKey;
    readonly feedbackEmissionLog: PublicKey;
  };
}

/**
 * Compose the atomic gate_payment + SPL transfer + emit_feedback transaction.
 *
 * - Throws `AtomicityNotEnforcedError` unless `atomicityEnforced: true`.
 * - Returns the unsigned `Transaction` plus the resolved PDAs so callers
 *   can simulate / inspect / sign.
 *
 * Required signers: `facilitator` (gate_payment.caller, emit_feedback.payer)
 * and `payer` (SPL transfer authority).
 */
export async function composeAtomicSettleTx(
  args: ComposeAtomicSettleArgs,
): Promise<ComposedAtomicSettle> {
  assertAtomicityEnforced(args, "composeAtomicSettleTx");

  const policyAccount   = derivePolicyPda(args.programIds.policyVault, args.payerAgentAsset, args.policyId);
  const velocityLedger  = deriveVelocityPda(args.programIds.policyVault, args.payerAgentAsset, args.policyId);
  const killSwitchState = deriveKillSwitchPda(args.programIds.policyVault, args.payerAgentAsset);
  const trustGateAuthority = deriveTrustGateAuthorityPda(args.programIds.trustgate, args.facilitator);
  const feedbackEmissionLog = deriveFeedbackLogPda(args.programIds.trustgate, Buffer.from(args.paymentIdHash));

  // ix 0 — gate_payment
  const gateIx = await args.policyVault.methods
    .gatePayment(args.payerAgentAsset, args.payeeAgentAsset, new BN(args.amount.toString()), args.mint, args.policyId)
    .accounts({
      caller:                args.facilitator,
      policyAccount,
      velocityLedger,
      killSwitchState,
      payerAtomStats:        args.payerAtomStats ?? null,
      payeeAtomStats:        args.payeeAtomStats ?? null,
      validationAttestation: args.validationAttestation ?? null,
    } as any)
    .instruction();

  // ix 1 — SPL transferChecked. Default to legacy SPL token program;
  // pass tokenProgram for Token-2022 mints.
  const transferIx = buildTransferCheckedIx({
    source:        args.payerTokenAccount,
    mint:          args.mint,
    destination:   args.payeeTokenAccount,
    authority:     args.payer,
    amount:        args.amount,
    decimals:      args.mintDecimals,
    tokenProgram:  args.tokenProgram ?? TOKEN_PROGRAM_ID,
  });

  // ix 2 — emit_feedback. remaining_accounts must follow the order in
  // programs/trustgate/src/ext/agent_registry.rs::GiveFeedbackAccounts.
  const remainingAccounts: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[] = [
    { pubkey: args.quantuAccounts.payeeAgentAccount, isSigner: false, isWritable: true  },
    { pubkey: args.quantuAccounts.payeeAsset,        isSigner: false, isWritable: false },
    { pubkey: args.quantuAccounts.payeeCollection,   isSigner: false, isWritable: false },
    { pubkey: SystemProgramId,                       isSigner: false, isWritable: false },
  ];
  if (
    args.quantuAccounts.atomConfig &&
    args.quantuAccounts.atomStats &&
    args.quantuAccounts.atomEngineProgram &&
    args.quantuAccounts.registryAuthority
  ) {
    remainingAccounts.push(
      { pubkey: args.quantuAccounts.atomConfig,        isSigner: false, isWritable: false },
      { pubkey: args.quantuAccounts.atomStats,         isSigner: false, isWritable: true  },
      { pubkey: args.quantuAccounts.atomEngineProgram, isSigner: false, isWritable: false },
      { pubkey: args.quantuAccounts.registryAuthority, isSigner: false, isWritable: false },
    );
  }

  const feedbackIx = await args.trustgate.methods
    .emitFeedback(
      Array.from(args.paymentIdHash),
      args.facilitator,
      args.payeeAgentAsset,
      args.score,
      args.tag1,
      args.tag2,
      args.endpoint,
      args.feedbackUri,
    )
    .accounts({
      payer:         args.facilitator,
      authority:     trustGateAuthority,
      emissionLog:   feedbackEmissionLog,
      systemProgram: SystemProgramId,
    } as any)
    .remainingAccounts(remainingAccounts)
    .instruction();

  const tx = new Transaction()
    .add(gateIx)
    .add(transferIx)
    .add(feedbackIx);

  return {
    tx,
    instructions: [gateIx, transferIx, feedbackIx],
    accounts: {
      policyAccount,
      velocityLedger,
      killSwitchState,
      trustGateAuthority,
      feedbackEmissionLog,
    },
  };
}

/**
 * Convenience: derive the standard payee SPL ATA from `payeeWallet + mint`.
 * Demos and integration tests call this; production callers may use a
 * custom ATA (e.g., a Token-2022 transfer-hook-equipped account).
 */
export function deriveStandardAta(
  owner: PublicKey,
  mint:  PublicKey,
  tokenProgram?: PublicKey,
): PublicKey {
  return deriveAssociatedTokenAddress(owner, mint, tokenProgram);
}

const SystemProgramId = new PublicKey("11111111111111111111111111111111");

