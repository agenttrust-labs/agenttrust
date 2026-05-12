/**
 * `makePayShFacilitator(deps)` + `makeDefaultRegistry(...)` — one-liner
 * factories that collapse the boilerplate documented in
 * `trustgate/server/src/production.ts` into two SDK calls.
 *
 * The public `@agenttrust-sdk/trustgate` package can construct every
 * piece a PaySh adapter consumes:
 *
 *   - `validateOnChainTx`     (from `@agenttrust-sdk/trustgate/onchain-validator`)
 *   - `emitFeedbackCpi`       (from `@agenttrust-sdk/trustgate/emit-feedback`)
 *   - `priorEmissionLookup`   (same module)
 *   - `replayCache`           (caller-supplied; the in-memory default from
 *                              the server package is NOT production-safe —
 *                              see the F-063 warning)
 *
 * The `PaySh` class itself lives in the private `@agenttrust/trustgate-server`
 * package (per spec, that's intentional — the server is a reference impl).
 * Consumers thread the deps bundle this factory returns into `new PaySh(deps)`
 * in their own code. Same with `FacilitatorRegistry` — `makeDefaultRegistry`
 * takes the `Registry` constructor from the server package and returns it
 * pre-configured.
 *
 * Migration from the pre-0.3.1 manual wiring:
 *
 *   // Before (production.ts ~80 lines of glue):
 *   const validateOnChainTx     = makeValidateOnChainTx({ connection });
 *   const emitFeedbackCpi       = makeEmitFeedbackCpi({ trustgate, ... });
 *   const priorEmissionLookup   = makePriorEmissionLookup({ trustgate, ... });
 *   const replayCache           = new ReplayCache();
 *   const paySh = new PaySh({ signingNetwork, feePayer, validateOnChainTx,
 *                             emitFeedbackCpi, priorEmissionLookup,
 *                             replayCache, signDecision });
 *
 *   // After:
 *   import { PaySh, FacilitatorRegistry } from "@agenttrust/trustgate-server";
 *   const deps  = makePayShFacilitator({ connection, facilitatorKeypair,
 *                                        resolveQuantu, programIds,
 *                                        trustgate, signingNetwork });
 *   const paySh = new PaySh(deps);
 *   const reg   = makeDefaultRegistry(FacilitatorRegistry, { paySh });
 *
 * The `signDecision` field defaults to an ed25519 signer bound to
 * `facilitatorKeypair.secretKey` so callers don't need to import
 * `tweetnacl` themselves.
 */

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";

import {
  makeEmitFeedbackCpi, makePriorEmissionLookup,
  type EmitFeedbackCpiFn, type PriorEmissionLookupFn,
} from "./emit-feedback";
import { makeValidateOnChainTx, type ValidateOnChainTxFn } from "./onchain-validator";
import { ProgramIds } from "./types";
import { QuantuFeedbackAccounts } from "./quantu";

// ---------------------------------------------------------------------------
// Structural shapes
//
// The SDK declares the contracts `PaySh` / `FacilitatorRegistry` satisfy so
// callers can wire the two halves together without the SDK depending on the
// private `@agenttrust/trustgate-server` package (and creating a circular
// workspace import).
// ---------------------------------------------------------------------------

/**
 * Minimal shape of a `replayCache` instance. The default `ReplayCache` in
 * `@agenttrust/trustgate-server/facilitators` satisfies this, as does any
 * custom Redis-backed adapter. PRODUCTION DEPLOYMENTS MUST PROVIDE A
 * PERSISTENT IMPLEMENTATION (F-063) — a process restart wipes the
 * in-memory default and re-opens a replay window bounded only by Solana's
 * `recent_blockhash` lifetime.
 */
export interface ReplayCacheLike {
  /** Records the (signature, paymentIdHash) binding. */
  observe(signature: string, paymentIdHash: Uint8Array): "fresh" | "replay" | "collision";
  /** Number of bindings currently held. Diagnostic only. */
  size(): number;
}

/** Function that signs canonical envelope bytes with the facilitator
 *  keypair. Defaults to ed25519 over `facilitatorKeypair.secretKey`. */
export type SignDecisionFn = (envelopeBytes: Uint8Array) => Uint8Array;

/**
 * Shape that the `@agenttrust/trustgate-server` `PaySh` constructor consumes.
 * Structurally identical to that package's `PayShDeps` export — we redeclare
 * it here so the SDK builds standalone.
 */
export interface PayShFacilitatorDeps {
  readonly signingNetwork:        string;
  readonly feePayer:              PublicKey;
  readonly validateOnChainTx:     ValidateOnChainTxFn;
  readonly emitFeedbackCpi:       EmitFeedbackCpiFn;
  readonly priorEmissionLookup?:  PriorEmissionLookupFn;
  readonly replayCache?:          ReplayCacheLike;
  readonly signDecision?:         SignDecisionFn;
  readonly clockSkewMs?:          number;
}

/**
 * Structural shape any `FacilitatorAdapter` satisfies (PaySh, Dexter, Atxp,
 * McPay, Mock). The SDK doesn't reach into the server package's interface
 * directly — this is the minimum the registry helper needs.
 */
export interface FacilitatorAdapterLike {
  readonly name: string;
}

/**
 * Shape `@agenttrust/trustgate-server`'s `FacilitatorRegistry` satisfies.
 * The SDK helper `makeDefaultRegistry` works against this contract so it
 * can wire any structurally-compatible registry implementation.
 */
export interface FacilitatorRegistryLike {
  register(adapter: FacilitatorAdapterLike): FacilitatorRegistryLike;
  setDefault(name: string): FacilitatorRegistryLike;
}

export type FacilitatorRegistryCtor = new () => FacilitatorRegistryLike;

// ---------------------------------------------------------------------------
// makePayShFacilitator
// ---------------------------------------------------------------------------

export interface MakePayShFacilitatorArgs {
  /** Solana RPC connection used by `validateOnChainTx` to confirm
   *  settle proofs. Reuse the same `Connection` the rest of your
   *  facilitator app already has — no commitment override here. */
  readonly connection: Connection;
  /** Facilitator signer. `publicKey` becomes `deps.feePayer` (the
   *  verify-time signature verification key for SERVICE-signed B5
   *  challenges) AND the signer the `emit_feedback` CPI uses. */
  readonly facilitatorKeypair: Keypair;
  /** Per-counterparty Quantu account bundle resolver. The hosted
   *  facilitator walks a counterparty JSON map (`devnet-counterparties.json`);
   *  production facilitators wire their own. Must derive `atomConfig`
   *  and `registryAuthority` as PDAs (use `deriveAtomConfigPda` and
   *  `deriveAtomRegistryAuthorityPda` from `@agenttrust-sdk/trustgate/quantu`)
   *  — the raw program IDs are wrong (F-048). */
  readonly resolveQuantu: (payeeAgent: PublicKey) => Promise<QuantuFeedbackAccounts>;
  /** AgentTrust program IDs for the target cluster (devnet, mainnet,
   *  custom). Use `DEFAULT_DEVNET_PROGRAM_IDS` for the live devnet
   *  deploy; mainnet ids are caller-supplied until AgentTrust mainnet
   *  programs land. */
  readonly programIds: ProgramIds;
  /** Quantu (`agent_registry` + `atom_engine`) program IDs. Used to
   *  pin the `emit_feedback` CPI's remaining_accounts to the right
   *  cluster. */
  readonly quantuIds: { readonly agentRegistry: PublicKey };
  /** Anchor `trustgate` Program handle. Build via
   *  `loadTrustGate(provider, programIds.trustGate)` from
   *  `@agenttrust-sdk/trustgate/chain` (or pass an explicit IDL snapshot
   *  to skip the on-chain IDL fetch). */
  readonly trustgate: Program;
  /** Network slug the adapter signs against (`solana-devnet` /
   *  `solana-mainnet` / `localnet`). `parseRequest` rejects requests
   *  whose `paymentRequirements.network` slug doesn't match. */
  readonly signingNetwork: string;
  /** Replay cache. Defaults to none (the adapter falls back to the
   *  in-memory `ReplayCache` in `@agenttrust/trustgate-server`). PASS A
   *  PERSISTENT IMPLEMENTATION FOR PRODUCTION — see `ReplayCacheLike`
   *  and the F-063 warning. */
  readonly replayCache?: ReplayCacheLike;
  /** Override the per-tx confirmation commitment of the `emit_feedback`
   *  CPI. Defaults to "confirmed". */
  readonly commitment?: "processed" | "confirmed" | "finalized";
  /** Allowed clock skew between SERVICE and facilitator when validating
   *  `extra.agentTrust.issuedAt`. Defaults to 60_000 ms. */
  readonly clockSkewMs?: number;
  /** Override the decision-envelope signer. Defaults to ed25519 over
   *  `facilitatorKeypair.secretKey` via tweetnacl. Pass an HSM-backed
   *  alternative if you don't want the secret material in process
   *  memory. */
  readonly signDecision?: SignDecisionFn;
}

/**
 * Build the `PayShDeps` bundle a `new PaySh(...)` constructor consumes.
 *
 * Doesn't construct `PaySh` directly because the class lives in the
 * private `@agenttrust/trustgate-server` package — importing that
 * package from the public SDK would force callers onto a non-npm
 * dependency. Consumers do `new PaySh(deps)` in their own server code,
 * where they already import the registry + routes.
 *
 * Returns the deps bundle. Caller wires:
 *
 *   const deps  = makePayShFacilitator({ ... });
 *   const paySh = new PaySh(deps);
 *
 * See `trustgate/server/src/production.ts` for the canonical end-to-end
 * wiring.
 */
export function makePayShFacilitator(
  args: MakePayShFacilitatorArgs,
): PayShFacilitatorDeps {
  const facilitatorPk = args.facilitatorKeypair.publicKey;
  const validateOnChainTx = makeValidateOnChainTx({ connection: args.connection });
  const emitFeedbackCpi   = makeEmitFeedbackCpi({
    trustgate:        args.trustgate,
    trustgateId:      args.programIds.trustGate,
    agentRegistryId:  args.quantuIds.agentRegistry,
    facilitator:      args.facilitatorKeypair,
    resolveQuantu:    args.resolveQuantu,
    commitment:       args.commitment,
  });
  const priorEmissionLookup = makePriorEmissionLookup({
    trustgate:   args.trustgate,
    trustgateId: args.programIds.trustGate,
    connection:  args.connection,
  });
  const signDecision = args.signDecision ?? makeDefaultSignDecision(args.facilitatorKeypair);
  return {
    signingNetwork: args.signingNetwork,
    feePayer:       facilitatorPk,
    validateOnChainTx,
    emitFeedbackCpi,
    priorEmissionLookup,
    replayCache:    args.replayCache,
    signDecision,
    clockSkewMs:    args.clockSkewMs,
  };
}

/**
 * Default ed25519 signer. Imports tweetnacl lazily so the helper is only
 * a runtime dep when callers opt into the default; production callers
 * who pass an HSM-backed `signDecision` never load tweetnacl through
 * this code path.
 */
function makeDefaultSignDecision(facilitator: Keypair): SignDecisionFn {
  return (bytes: Uint8Array): Uint8Array => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const nacl = require("tweetnacl");
    return nacl.sign.detached(bytes, facilitator.secretKey);
  };
}

// ---------------------------------------------------------------------------
// makeDefaultRegistry
// ---------------------------------------------------------------------------

export interface MakeDefaultRegistryArgs {
  readonly paySh: FacilitatorAdapterLike;
  /** Optional override of the default adapter name. Defaults to
   *  `paySh.name` ("pay-sh"). */
  readonly defaultName?: string;
}

/**
 * Build a `FacilitatorRegistry` pre-registered with `paySh` and the
 * default pointed at it.
 *
 * Takes the `FacilitatorRegistry` constructor as the first argument so
 * the SDK doesn't have to import the server package — callers thread in
 * `FacilitatorRegistry` from `@agenttrust/trustgate-server` themselves:
 *
 *   import { PaySh, FacilitatorRegistry } from "@agenttrust/trustgate-server";
 *   const paySh    = new PaySh(makePayShFacilitator({...}));
 *   const registry = makeDefaultRegistry(FacilitatorRegistry, { paySh });
 *
 * The two-line stitch replaces the previous five-line ritual documented
 * in `trustgate/server/src/facilitators/README.md`.
 */
export function makeDefaultRegistry<R extends FacilitatorRegistryLike>(
  RegistryCtor: new () => R,
  args:         MakeDefaultRegistryArgs,
): R {
  const registry = new RegistryCtor();
  registry.register(args.paySh).setDefault(args.defaultName ?? args.paySh.name);
  return registry;
}
