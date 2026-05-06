/**
 * Production `PayShDeps` factory — wires real Anchor + RPC into the
 * adapter. Companion to `deps.ts` (the in-memory mock) for the
 * INTEGRATION=1 path.
 *
 * Real chain dependencies:
 *   - validateOnChainTx → trustgate-sdk's makeValidateOnChainTx (parses
 *     VersionedTransaction, polls connection.getSignatureStatus)
 *   - emitFeedbackCpi   → trustgate-sdk's makeEmitFeedbackCpi (Anchor
 *     methods builder, signed by facilitator keypair)
 *   - priorEmissionLookup → trustgate-sdk's makePriorEmissionLookup
 *     (fetches FeedbackEmissionLog PDA + recovers signature via
 *     getSignaturesForAddress)
 *
 * Quantu account resolution: the demo expects `resolveQuantu(payeeAgent)`
 * to return the bundle of Quantu accounts (asset, collection, optional
 * ATOM) for the given payee agent. For the integration test we use a
 * static map (the demo's payee Quantu accounts are pre-registered or
 * mocked as cloned mainnet accounts under `anchor test`).
 */

import { AnchorProvider, Idl, Program, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

import {
  DEFAULT_DEVNET_QUANTU_IDS,
  DEFAULT_DEVNET_PROGRAM_IDS,
  MAINNET_QUANTU_IDS,
  QuantuFeedbackAccounts,
  QuantuProgramIds,
  deriveQuantuFeedbackAccounts,
  loadTrustGate,
  makeEmitFeedbackCpi,
  makePriorEmissionLookup,
  makeValidateOnChainTx,
} from "@agenttrust-sdk/trustgate";

import {
  PayShDeps,
  ReplayCache,
  signEnvelope,
} from "@agenttrust/trustgate-server";

export interface MakeRealPayShDepsArgs {
  /** RPC endpoint (e.g. https://api.devnet.solana.com). */
  readonly rpcUrl:           string;
  /** Network slug — gates the adapter against mismatched challenges. */
  readonly signingNetwork:   string;
  /** Facilitator keypair — payer for emit_feedback, signer of decisions. */
  readonly facilitator:      Keypair;
  /** Quantu account resolver. The integration test wires a static map. */
  readonly resolveQuantu:    (payeeAgent: PublicKey) => Promise<QuantuFeedbackAccounts>;
  /** Optional override of trustgate program ID (mainnet vs devnet). */
  readonly trustgateProgramId?: PublicKey;
  /** Optional Quantu program IDs override. Default = devnet (matches
   *  programs/trustgate/src/constants.rs). Use MAINNET_QUANTU_IDS when
   *  running under `anchor test` (clones mainnet pubkeys). */
  readonly quantuPrograms?:  QuantuProgramIds;
  /** Optional replay cache override (defaults to a fresh in-memory LRU). */
  readonly replayCache?:     ReplayCache;
  /** Optional locally-loaded Anchor IDL. When set, the demo skips the
   *  on-chain IDL fetch (useful when the program is deployed but the IDL
   *  hasn't been published via `anchor idl init`). */
  readonly trustgateIdl?:    Idl;
}

export interface RealPayShDepsBundle {
  readonly deps:        PayShDeps;
  readonly connection:  Connection;
  readonly trustgate:   Program;
  readonly replayCache: ReplayCache;
}

/**
 * Build a `PayShDeps` bundle backed by real Solana RPC + Anchor.
 *
 * Loads the trustgate IDL from chain (the program must be deployed at
 * `trustgateProgramId` — defaults to devnet). Quantu account resolution is
 * caller-supplied so the demo can plug in static fixtures or a real
 * registry-walk strategy.
 */
export async function makeRealPayShDeps(
  args: MakeRealPayShDepsArgs,
): Promise<RealPayShDepsBundle> {
  const trustgateId = args.trustgateProgramId ?? DEFAULT_DEVNET_PROGRAM_IDS.trustgate;

  const connection = new Connection(args.rpcUrl, "confirmed");
  const wallet     = new Wallet(args.facilitator);
  const provider   = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const trustgate  = args.trustgateIdl
    ? new Program(args.trustgateIdl, provider)
    : await loadTrustGate(provider, trustgateId);

  const validateOnChainTx = makeValidateOnChainTx({ connection });
  const emitFeedbackCpi   = makeEmitFeedbackCpi({
    trustgate,
    trustgateId,
    facilitator:   args.facilitator,
    resolveQuantu: args.resolveQuantu,
  });
  const priorEmissionLookup = makePriorEmissionLookup({
    trustgate,
    trustgateId,
    connection,
  });

  const replayCache = args.replayCache ?? new ReplayCache();

  const deps: PayShDeps = {
    signingNetwork:    args.signingNetwork,
    feePayer:          args.facilitator.publicKey,
    validateOnChainTx,
    emitFeedbackCpi,
    priorEmissionLookup,
    replayCache,
    signDecision: (bytes: Uint8Array) =>
      signEnvelope(bytes, args.facilitator.secretKey),
  };

  return { deps, connection, trustgate, replayCache };
}

/**
 * Convenience: build a static Quantu resolver from a Map<payeeAgentB58, accounts>.
 * Use this when the demo runs against a small fixed counterparty set.
 */
export function staticQuantuResolver(
  table: ReadonlyMap<string, { asset: PublicKey; collection: PublicKey; atomEnabled?: boolean }>,
  programs: QuantuProgramIds = DEFAULT_DEVNET_QUANTU_IDS,
): (payeeAgent: PublicKey) => Promise<QuantuFeedbackAccounts> {
  return async (payeeAgent) => {
    const entry = table.get(payeeAgent.toBase58());
    if (!entry) {
      throw new Error(
        `staticQuantuResolver: no entry for payeeAgent=${payeeAgent.toBase58()}. ` +
        `Add it to the demo's Quantu account table.`,
      );
    }
    return deriveQuantuFeedbackAccounts({
      programs,
      asset:       entry.asset,
      collection:  entry.collection,
      atomEnabled: entry.atomEnabled ?? false,
    });
  };
}

export { DEFAULT_DEVNET_QUANTU_IDS, MAINNET_QUANTU_IDS };
