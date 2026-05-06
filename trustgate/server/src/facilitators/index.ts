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
  type SignDecisionFn,
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
  canonicalChallengeBytes,
  canonicalDecisionBytes,
  hexToBytes,
  signEnvelope,
  verifyEnvelope,
  SIGNATURE_HEX_LEN,
  type ChallengeSignArgs,
  type DecisionSignArgs,
} from "./pay-sh";

export { NotImplementedAdapter } from "./stubs/_base";

export {
  Dexter,
  type DexterDeps,
  DexterFacilitatorBodySchema,
  DexterPaymentRequirementsSchema,
  DexterPaymentPayloadSchema,
  DexterAgentTrustExtraSchema,
  DexterExtraSchema,
  DexterRequirementsExtraSchema,
  type DexterFacilitatorBody,
  type DexterPaymentRequirements,
  type DexterPaymentPayload,
  type DexterAgentTrustExtra,
  type DexterExtra,
} from "./dexter";

export {
  Atxp,
  type AtxpDeps,
  type AtxpJwtClaims,
  type VerifyAtxpJwtFn,
  AtxpFacilitatorBodySchema,
  AtxpPaymentRequirementsSchema,
  AtxpPaymentPayloadSchema,
  AtxpAgentTrustExtraSchema,
  AtxpExtraSchema,
  AtxpRequirementsExtraSchema,
  type AtxpFacilitatorBody,
  type AtxpPaymentRequirements,
  type AtxpPaymentPayload,
  type AtxpAgentTrustExtra,
  type AtxpExtra,
} from "./atxp";

export {
  McPay,
  type McPayDeps,
  McPayFacilitatorBodySchema,
  McPayPaymentRequirementsSchema,
  McPayPaymentPayloadSchema,
  McPayAgentTrustExtraSchema,
  McPayExtraSchema,
  McPayRequirementsExtraSchema,
  type McPayFacilitatorBody,
  type McPayPaymentRequirements,
  type McPayPaymentPayload,
  type McPayAgentTrustExtra,
  type McPayExtra,
} from "./mcpay";
