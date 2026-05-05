/**
 * Demo `PayShDeps` factory.
 *
 * The demo runs without a Solana RPC connection — `validateOnChainTx`
 * synthesises a confirmed-tx fixture from `ctx`-implied fields, and
 * `emitFeedbackCpi` returns a deterministic synthetic signature.
 *
 * This is intentional: the demo's purpose is to prove the AgentTrust
 * pipeline (parse → policy gate → format → validate-shape → emit) end-to-end.
 * Real proof-of-payment confirmation is an integration concern that lives
 * in the production deps factory (a future module that wires Anchor +
 * spl-token tx parsing). Demo flows the happy path.
 */

import { PublicKey } from "@solana/web3.js";

import {
  ConfirmedSettlement,
  EmitFeedbackInput,
  OnChainTxValidation,
  PayShDeps,
  PriorEmissionLookup,
  ReplayCache,
  ValidateOnChainTxFn,
  VerifyContext,
} from "@agenttrust/trustgate-server";

const SYNTHETIC_SIG_PREFIX = "demo-sig-";
const SYNTHETIC_FEEDBACK_PREFIX = "demo-feedback-";

/**
 * Per-request hint for `validateOnChainTx`. The middleware threads the
 * verify-time `VerifyContext` through this so the synthetic on-chain
 * fixture mirrors the SERVICE-supplied requirements (cross-check passes
 * cleanly without parsing the actual signed tx bytes).
 */
export interface DemoChainHint {
  readonly payer:             PublicKey;
  readonly transferredAmount: bigint;
  readonly transferredMint:   PublicKey;
  readonly transferRecipient: PublicKey;
}

export class DemoOnChainStub {
  private hint: DemoChainHint | null = null;
  private counter = 0;
  private readonly emittedLogs = new Map<string, {
    feedbackTxSignature: string;
    emittedAtSlot:       number;
  }>();

  /** Set the next-call hint. Called by the middleware right before each
   *  validatePaymentProof. Single-shot — cleared after consumption. */
  setHint(hint: DemoChainHint): void {
    this.hint = hint;
  }

  validateOnChainTx: ValidateOnChainTxFn = async (_txBase64) => {
    const hint = this.hint;
    this.hint = null;

    const signature = `${SYNTHETIC_SIG_PREFIX}${++this.counter}`;
    if (!hint) {
      // Without a hint we can't synthesise transfer fields; surface as
      // settlement_failed (matches the all-or-nothing contract).
      return {
        confirmed:   false,
        errorReason: "settlement_failed",
        errorDetail: "demo stub has no chain hint",
      } satisfies OnChainTxValidation;
    }
    return {
      confirmed:         true,
      payer:             hint.payer,
      signature,
      slot:              0,
      transferredAmount: hint.transferredAmount,
      transferredMint:   hint.transferredMint,
      transferRecipient: hint.transferRecipient,
    } satisfies OnChainTxValidation;
  };

  emitFeedbackCpi = async (input: EmitFeedbackInput) => {
    const key = paymentIdHashKey(input.settlement.paymentIdHash);
    const prior = this.emittedLogs.get(key);
    if (prior) {
      const err = new Error(`paymentIdHash ${key} already in use`);
      throw err;
    }
    const result = {
      feedbackTxSignature: `${SYNTHETIC_FEEDBACK_PREFIX}${++this.counter}`,
      emittedAtSlot:       0,
    };
    this.emittedLogs.set(key, result);
    return result;
  };

  priorEmissionLookup: PriorEmissionLookup = async (paymentIdHash) => {
    return this.emittedLogs.get(paymentIdHashKey(paymentIdHash)) ?? null;
  };
}

export interface MakeDemoPayShDepsArgs {
  readonly signingNetwork: string;
  readonly feePayer:       PublicKey;
}

export interface DemoPayShDepsBundle {
  readonly deps: PayShDeps;
  readonly chainStub: DemoOnChainStub;
  readonly replayCache: ReplayCache;
}

export function makeDemoPayShDeps(args: MakeDemoPayShDepsArgs): DemoPayShDepsBundle {
  const stub = new DemoOnChainStub();
  const replayCache = new ReplayCache();
  const deps: PayShDeps = {
    signingNetwork:      args.signingNetwork,
    feePayer:            args.feePayer,
    validateOnChainTx:   stub.validateOnChainTx,
    emitFeedbackCpi:     stub.emitFeedbackCpi,
    priorEmissionLookup: stub.priorEmissionLookup,
    replayCache,
  };
  return { deps, chainStub: stub, replayCache };
}

/** Build a `ConfirmedSettlement` from the proof-validation result + ctx. */
export function buildConfirmedSettlement(
  ctx:       VerifyContext,
  txSig:     string,
  payer:     PublicKey,
): ConfirmedSettlement {
  return {
    txSignature:   txSig,
    payer,
    payee:         ctx.payeeAgent,
    amount:        ctx.amount,
    mint:          ctx.mint,
    paymentIdHash: ctx.paymentIdHash ?? new Uint8Array(32),
  };
}

function paymentIdHashKey(hash: Uint8Array): string {
  let s = "";
  for (let i = 0; i < hash.length; i++) {
    s += hash[i].toString(16).padStart(2, "0");
  }
  return s;
}
