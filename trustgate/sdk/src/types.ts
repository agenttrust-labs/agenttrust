import { PublicKey } from "@solana/web3.js";

export type DenyReasonCode = number; // 1..=15

export type GateDecision =
  | { kind: "Allow" }
  | { kind: "Deny"; reasonCode: DenyReasonCode; reasonName: string }
  | { kind: "RequireValidation"; capabilityHash: number[] /* 32 bytes */ };

/// Pinned program IDs. Override via mountTrustGate config to point at a
/// different cluster's deployment (e.g., mainnet program IDs once live).
export interface ProgramIds {
  policyVault: PublicKey;
  trustgate:   PublicKey;
}

export const DEFAULT_DEVNET_PROGRAM_IDS: ProgramIds = {
  policyVault: new PublicKey("8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR"),
  trustgate:   new PublicKey("HF8zHfoyA7b5mhLViopTnRMprc6ZT5KActHTdkFrih2N"),
};
