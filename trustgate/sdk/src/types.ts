import { PublicKey } from "@solana/web3.js";

export type DenyReasonCode = number; // 1..=15

export type GateDecision =
  | { kind: "Allow" }
  | { kind: "Deny"; reasonCode: DenyReasonCode; reasonName: string }
  | { kind: "RequireValidation"; capabilityHash: Uint8Array /* 32 bytes */ };

/// Pinned program IDs. Override via mountTrustGate config to point at a
/// different cluster's deployment (e.g., mainnet program IDs once live).
///
/// All keys camelCase as of SDK 0.2.0. The `trustGate` rename + the new
/// `validationRegistry` field are documented in
/// `trustgate/sdk/README.md` "Breaking changes (0.2.0)".
export interface ProgramIds {
  policyVault:         PublicKey;
  trustGate:           PublicKey;
  validationRegistry:  PublicKey;
}

export const DEFAULT_DEVNET_PROGRAM_IDS: ProgramIds = {
  policyVault:         new PublicKey("8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR"),
  trustGate:           new PublicKey("HF8zHfoyA7b5mhLViopTnRMprc6ZT5KActHTdkFrih2N"),
  validationRegistry:  new PublicKey("Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv"),
};

/**
 * Mainnet program IDs for the AgentTrust three-program stack
 * (`policy_vault`, `trustgate`, `validation_registry`).
 *
 * `undefined` until AgentTrust deploys to mainnet-beta. Mainnet callers
 * MUST pass an explicit `ProgramIds` object built from the live mainnet
 * pubkeys; do not assume `DEFAULT_DEVNET_PROGRAM_IDS` will work — those
 * are devnet-only addresses and will fail with `AccountNotFound` on
 * mainnet RPCs.
 *
 * Once mainnet is live, this constant will be populated and the
 * `loadValidationRegistry` cluster-detection heuristic will allow it
 * to be applied as a default on mainnet RPCs the same way
 * `DEFAULT_DEVNET_PROGRAM_IDS` is applied on devnet RPCs today.
 */
export const MAINNET_PROGRAM_IDS: ProgramIds | undefined = undefined;
