/**
 * Facilitator-abstraction barrel. Public re-exports + registry helpers.
 *
 * Adding a new adapter:
 *   1. Create `<your-name>.ts` implementing `FacilitatorAdapter`
 *   2. Re-export it from this file
 *   3. Register it in `createDefaultRegistry()` (in `src/index.ts`)
 *
 * See `facilitators/README.md` for the full walkthrough.
 */

export {
  // Identity
  FacilitatorAdapter,
  FacilitatorProtocol,
  // Per-method shapes
  VerifyContext,
  ChallengeResponse,
  FacilitatorHttpStatus,
  SettlementResponse,
  PaymentProofValidation,
  PaymentProofRejection,
  ConfirmedSettlement,
  FeedbackEmissionResult,
} from "./types";

export {
  FacilitatorRegistry,
  UnknownFacilitatorError,
  NoFacilitatorRegisteredError,
  DuplicateFacilitatorError,
  NotImplementedError,
} from "./registry";

export { MockFacilitator, MockFacilitatorOptions } from "./mock";

export {
  PaySh,
  ReplayCache,
  type PayShDeps,
  type ValidateOnChainTxFn,
  type OnChainTxValidation,
  type PriorEmissionLookup,
  type EmitFeedbackFn,
  type EmitFeedbackInput,
  type FeedbackFields,
  PayShFacilitatorBodySchema,
  PayShPaymentPayloadSchema,
  PayShPaymentRequirementsSchema,
  AgentTrustExtraSchema,
  AmountString,
  PubkeyString,
  type PayShFacilitatorBody,
  type PayShPaymentPayload,
  type PayShPaymentRequirements,
  type AgentTrustExtra,
  deriveMemoHash,
  bytesToHex,
  sameNetwork,
  DEFAULT_FEEDBACK_SCORE,
} from "./pay-sh";
