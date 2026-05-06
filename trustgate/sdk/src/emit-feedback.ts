/**
 * Production `emitFeedbackCpi` + `priorEmissionLookup` factories.
 *
 * Wraps Anchor's `trustgate.methods.emitFeedback(...)` and the on-chain
 * `FeedbackEmissionLog` PDA fetch. Adapters consume the returned
 * functions via `PayShDeps.emitFeedbackCpi` / `.priorEmissionLookup` —
 * the chain calls live here so the adapter stays testable without a
 * real Anchor provider.
 *
 * On-chain instruction reference:
 *   programs/trustgate/src/instructions/emit_feedback.rs
 *
 * Required accounts:
 *   payer:          facilitator (signer)            — must equal
 *                   the `facilitator` arg per the on-chain
 *                   `require_keys_eq` constraint
 *   authority:      TrustGate auth PDA              — `[b"trustgate_auth", facilitator]`
 *   emission_log:   FeedbackEmissionLog PDA (init)  — `[b"feedback_log", payment_id_hash]`
 *   system_program
 *
 * remaining_accounts (positional):
 *   0 agent_account, 1 asset, 2 collection, 3 system_program
 *   4..7  optional ATOM 4-tuple (all-or-nothing)
 *
 * Idempotency: the on-chain handler uses Anchor's `init` constraint on
 * `FeedbackEmissionLog`. A retry of the same paymentIdHash hits
 * "account already in use"; the SDK's `emitWithIdempotency` wrapper
 * (in `pay-sh/feedback.ts`) catches this and falls back to
 * `priorEmissionLookup` to surface the prior emission's signature.
 */

import { Program } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";

import { deriveFeedbackLogPda, deriveTrustGateAuthorityPda } from "./chain";
import { QuantuFeedbackAccounts } from "./quantu";

// Same shape as the adapter expects (PayShDeps.emitFeedbackCpi signature).
// We re-declare here to avoid pulling the server package into the SDK's
// public surface — these types are structurally identical and intentionally
// duplicated at the adapter boundary.

export interface EmitFeedbackCpiInput {
  readonly ctx: {
    readonly payerAgent: PublicKey;
    readonly payeeAgent: PublicKey;
    readonly amount:     bigint;
    readonly mint:       PublicKey;
    readonly policyId:   number;
    readonly facilitator: string;
    readonly paymentIdHash?: Uint8Array;
  };
  readonly settlement: {
    readonly txSignature:   string;
    readonly payer:         PublicKey;
    readonly payee:         PublicKey;
    readonly amount:        bigint;
    readonly mint:          PublicKey;
    readonly paymentIdHash: Uint8Array;
  };
  readonly fields: {
    readonly score:       number;
    readonly tag1:        string;
    readonly tag2:        string;
    readonly endpoint:    string;
    readonly feedbackUri: string;
  };
}

export interface EmitFeedbackResult {
  readonly feedbackTxSignature: string;
  readonly emittedAtSlot?:      number;
}

export type EmitFeedbackCpiFn = (input: EmitFeedbackCpiInput) => Promise<EmitFeedbackResult>;

export interface MakeEmitFeedbackCpiOptions {
  /** Anchor `Program` for the trustgate program. */
  readonly trustgate:     Program;
  /** trustgate program ID — used for PDA derivation (separately from the
   *  Anchor handle so we don't need to read trustgate.programId in derives). */
  readonly trustgateId:   PublicKey;
  /** Facilitator keypair — signs the tx. Must equal the `facilitator` arg
   *  the on-chain handler enforces via `require_keys_eq(payer, facilitator)`. */
  readonly facilitator:   Keypair;
  /** Async resolver: given the payee Quantu agent PDA, return the bundle of
   *  Quantu accounts (asset, collection, optional ATOM 4-tuple) the CPI
   *  threads through `remaining_accounts`. */
  readonly resolveQuantu: (payeeAgent: PublicKey) => Promise<QuantuFeedbackAccounts>;
  /** Confirmation commitment for the emit_feedback tx. Defaults to "confirmed". */
  readonly commitment?:   "processed" | "confirmed" | "finalized";
}

export function makeEmitFeedbackCpi(opts: MakeEmitFeedbackCpiOptions): EmitFeedbackCpiFn {
  return async (input) => {
    const facilitatorPk = opts.facilitator.publicKey;
    const authority     = deriveTrustGateAuthorityPda(opts.trustgateId, facilitatorPk);
    const emissionLog   = deriveFeedbackLogPda(opts.trustgateId, Buffer.from(input.settlement.paymentIdHash));
    const quantu        = await opts.resolveQuantu(input.ctx.payeeAgent);

    const remainingAccounts: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[] = [
      { pubkey: quantu.agentAccount,   isSigner: false, isWritable: true  },
      { pubkey: quantu.asset,          isSigner: false, isWritable: false },
      { pubkey: quantu.collection,     isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];
    if (
      quantu.atomConfig &&
      quantu.atomStats &&
      quantu.atomEngineProgram &&
      quantu.registryAuthority
    ) {
      remainingAccounts.push(
        { pubkey: quantu.atomConfig,        isSigner: false, isWritable: false },
        { pubkey: quantu.atomStats,         isSigner: false, isWritable: true  },
        { pubkey: quantu.atomEngineProgram, isSigner: false, isWritable: false },
        { pubkey: quantu.registryAuthority, isSigner: false, isWritable: false },
      );
    }

    const txSignature = await opts.trustgate.methods
      .emitFeedback(
        Array.from(input.settlement.paymentIdHash),
        facilitatorPk,
        input.ctx.payeeAgent,
        input.fields.score,
        input.fields.tag1,
        input.fields.tag2,
        input.fields.endpoint,
        input.fields.feedbackUri,
      )
      .accounts({
        payer:         facilitatorPk,
        authority,
        emissionLog,
        systemProgram: SystemProgram.programId,
      } as any)
      .remainingAccounts(remainingAccounts)
      .signers([opts.facilitator])
      .rpc({ commitment: opts.commitment ?? "confirmed" });

    return {
      feedbackTxSignature: txSignature,
      // emit_feedback's on-chain log records `emitted_at_slot`. The post-RPC
      // tx response doesn't directly carry it; fetching the log here would
      // double the RPC traffic on every emit. Callers who need the slot can
      // run priorEmissionLookup post-hoc.
      emittedAtSlot: undefined,
    };
  };
}

export interface PriorEmissionResult {
  readonly feedbackTxSignature: string;
  readonly emittedAtSlot?:      number;
}

export type PriorEmissionLookupFn =
  (paymentIdHash: Uint8Array) => Promise<PriorEmissionResult | null>;

export interface MakePriorEmissionLookupOptions {
  readonly trustgate:   Program;
  readonly trustgateId: PublicKey;
  readonly connection:  Connection;
}

/**
 * Build a `priorEmissionLookup` function that:
 *   1. fetches the FeedbackEmissionLog PDA (returns null if absent)
 *   2. reads the slot stored on chain
 *   3. queries `getSignaturesForAddress(pda, limit: 1)` to recover the
 *      original emit_feedback tx signature (the on-chain log doesn't
 *      store the sig itself)
 */
export function makePriorEmissionLookup(
  opts: MakePriorEmissionLookupOptions,
): PriorEmissionLookupFn {
  return async (paymentIdHash) => {
    const pda = deriveFeedbackLogPda(opts.trustgateId, Buffer.from(paymentIdHash));
    let log: { emittedAtSlot?: { toNumber: () => number } } | null;
    try {
      log = await (opts.trustgate.account as any).feedbackEmissionLog.fetchNullable(pda);
    } catch {
      return null;
    }
    if (!log) return null;

    let txSignature = `prior-${pda.toBase58()}`;
    try {
      const sigs = await opts.connection.getSignaturesForAddress(pda, { limit: 1 });
      if (sigs[0]?.signature) txSignature = sigs[0].signature;
    } catch {
      // Tolerate RPC failures here — caller observes the synthetic placeholder.
    }

    const emittedAtSlot = log.emittedAtSlot ? log.emittedAtSlot.toNumber() : undefined;
    return { feedbackTxSignature: txSignature, emittedAtSlot };
  };
}
