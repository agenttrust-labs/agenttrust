/**
 * `@agenttrust-sdk/trustgate` — drop-in TrustGate middleware + facilitator
 * tooling for the AgentTrust trust stack on Solana.
 *
 * Three import surfaces:
 *
 *   ```ts
 *   import { mountTrustGate }                    from "@agenttrust-sdk/trustgate/express";
 *   import { gatePayment, settle }               from "@agenttrust-sdk/trustgate/client";
 *   import { composeAtomicSettleTx }             from "@agenttrust-sdk/trustgate";
 *   ```
 *
 * The root namespace re-exports every helper grouped by concern:
 *
 *   - **Atomicity guard:** `AtomicityEnforced`, `AtomicityNotEnforcedError`,
 *     `composeAtomicSettleTx`
 *   - **PDA derivers + Anchor loaders:** `derivePolicyPda`,
 *     `deriveTrustGateAuthorityPda`, `loadPolicyVault`, `loadTrustGate`
 *   - **Production factories:** `makeValidateOnChainTx`,
 *     `makeEmitFeedbackCpi`, `makePriorEmissionLookup`
 *   - **Quantu:** `deriveAgentAccountPda`, `deriveAtomStatsPda`,
 *     `deriveQuantuFeedbackAccounts`, `DEFAULT_DEVNET_QUANTU_IDS`
 *   - **ValidationRegistry (third leg of ERC-8004):** `buildRegisterNamespaceIx`,
 *     `buildRequestValidationIx`, `buildRespondToValidationIx`,
 *     `fetchValidationAttestation`, etc.
 *   - **SPL helpers:** `buildTransferCheckedIx`, `deriveAssociatedTokenAddress`,
 *     `TOKEN_PROGRAM_ID`, `TOKEN_2022_PROGRAM_ID`
 *   - **Constants:** `DEFAULT_DEVNET_PROGRAM_IDS`,
 *     `VALIDATION_REGISTRY_DEVNET_ID`, x402 header constants
 *
 * See `PUBLISHING.md` for the release workflow and the public-API contract.
 */

export {
  AtomicityEnforced,
  AtomicityNotEnforcedError,
  assertAtomicityEnforced,
  composeAtomicSettleTx,
  deriveStandardAta,
  type AtomicSettleQuantuAccounts,
  type ComposeAtomicSettleArgs,
  type ComposedAtomicSettle,
} from "./atomicity";

export {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  buildTransferCheckedIx,
  deriveAssociatedTokenAddress,
} from "./spl";

export {
  makeValidateOnChainTx,
  type OnChainTxValidation,
  type OnChainTxRejection,
  type ValidateOnChainTxFn,
  type MakeValidateOnChainTxOptions,
} from "./onchain-validator";

export {
  DEFAULT_DEVNET_QUANTU_IDS,
  MAINNET_QUANTU_IDS,
  type QuantuProgramIds,
  type QuantuFeedbackAccounts,
  type QuantuFeedbackAccountsArgs,
  deriveAgentAccountPda,
  deriveAtomConfigPda,
  deriveAtomStatsPda,
  deriveAtomRegistryAuthorityPda,
  deriveQuantuFeedbackAccounts,
} from "./quantu";

export {
  makeEmitFeedbackCpi,
  makePriorEmissionLookup,
  type EmitFeedbackCpiFn,
  type EmitFeedbackCpiInput,
  type EmitFeedbackResult,
  type MakeEmitFeedbackCpiOptions,
  type PriorEmissionLookupFn,
  type PriorEmissionResult,
  type MakePriorEmissionLookupOptions,
} from "./emit-feedback";

// ValidationRegistry — the third leg of the ERC-8004 trust stack.
export {
  VALIDATION_REGISTRY_DEVNET_ID,
  deriveCapabilityNamespacePda,
  deriveAttestorProfilePda,
  deriveValidationRequestPda,
  deriveValidationAttestationPda,
  computeNamespaceHash,
  computeCapabilityHash,
  loadValidationRegistry,
  buildRegisterNamespaceIx,
  buildRegisterAttestorIx,
  buildRequestValidationIx,
  buildRespondToValidationIx,
  buildRevokeValidationIx,
  fetchValidationAttestation,
  fetchValidationRequest,
  fetchAttestorProfile,
  fetchCapabilityNamespace,
  type BuildRegisterNamespaceArgs,
  type BuildRegisterAttestorArgs,
  type BuildRequestValidationArgs,
  type BuildRespondToValidationArgs,
  type BuildRevokeValidationArgs,
} from "./validation-registry";

export {
  derivePolicyPda, deriveVelocityPda, deriveKillSwitchPda,
  deriveFeedbackLogPda, deriveTrustGateAuthorityPda,
  loadPolicyVault, loadTrustGate, makeProvider,
  simulateGatePayment, parseGateDecision,
  type SignerLike,
} from "./chain";

export {
  buildHeadersForDecision, denyReasonName,
  X_PAYMENT_REQUIRED, X_PAYMENT_NETWORK, X_PAYMENT_REASON_CODE,
  X_PAYMENT_REASON_NAME, X_CAPABILITY_REQUIRED, X_AGENT_TRUST_DECISION,
} from "./x402";

export {
  GateDecision, DenyReasonCode, ProgramIds,
  DEFAULT_DEVNET_PROGRAM_IDS, MAINNET_PROGRAM_IDS,
} from "./types";

// Express + client modules also have their own dedicated entry points
// via the package.json `exports` field; the root namespace doesn't
// re-export them to keep tree-shaking effective.
