import { PublicKey } from "@solana/web3.js";

/// Mirror of `policy_vault::state::DenyReason` (see
/// `programs/policy-vault/src/state/decision.rs`). Stable u8 codes.
export type DenyReasonCode = number; // 1..=15

/// Mirror of `policy_vault::state::GateDecision`. Anchor returns this via
/// the return-data channel; the server also synthesises it at the HTTP layer.
export type GateDecision =
  | { kind: "Allow" }
  | { kind: "Deny"; reasonCode: DenyReasonCode; reasonName: string }
  | { kind: "RequireValidation"; capabilityHash: Uint8Array /* 32 bytes */ };

export interface VerifyRequest {
  payerAgentAsset: PublicKey;
  payeeAgentAsset: PublicKey;
  amount:          bigint;
  mint:            PublicKey;
  policyId:        number;
}

export interface VerifyResponse {
  decision:    GateDecision;
  /// HTTP status code the facilitator should surface. 200 for Allow,
  /// 402 (Payment Required) for Deny / RequireValidation per x402 spec.
  httpStatus:  200 | 402;
  /// x402 headers the facilitator should set on the upstream HTTP response.
  x402Headers: Record<string, string>;
}

export interface ReceiptResponse {
  paymentIdHash:   number[]; // 32 bytes
  exists:          boolean;
  score:           number | null;
  isDispute:       boolean | null;
  emittedAtSlot:   number | null;
}
