/**
 * x402 spec compliance — header builder + DenyReason name table.
 * Mirrors `trustgate/server/src/x402.ts`. Kept in-package so the SDK is
 * self-contained on npm.
 */

import { DenyReasonCode, GateDecision } from "./types";

export const X_PAYMENT_REQUIRED        = "X-Payment-Required";
export const X_PAYMENT_NETWORK         = "X-Payment-Network";
export const X_PAYMENT_REASON_CODE     = "X-Payment-Reason-Code";
export const X_PAYMENT_REASON_NAME     = "X-Payment-Reason-Name";
export const X_CAPABILITY_REQUIRED     = "X-Capability-Required";
export const X_AGENT_TRUST_DECISION    = "X-Agent-Trust-Decision";

const DEFAULT_NETWORK = "solana-devnet";

export const DENY_REASON_NAMES: Record<DenyReasonCode, string> = {
  1:  "KillSwitchEngaged",
  2:  "SpendingPerTxExceeded",
  3:  "SpendingDailyExceeded",
  4:  "SpendingWeeklyExceeded",
  5:  "VelocityWindowExceeded",
  6:  "CounterpartyTierBelowMin",
  7:  "CounterpartyRiskAboveMax",
  8:  "CounterpartyConfidenceBelow",
  9:  "AtomStatsWrongOwner",
  10: "AtomStatsSchemaMismatch",
  11: "AttestationMissing",
  12: "AttestationExpired",
  13: "AttestationRevoked",
  14: "AttestationAttestorRejected",
  15: "UnratedTreatmentDeny",
};

export function denyReasonName(code: DenyReasonCode): string {
  return DENY_REASON_NAMES[code] ?? `Unknown(${code})`;
}

function bytesToHex(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i].toString(16).padStart(2, "0");
  }
  return s;
}

export function buildHeadersForDecision(
  decision: GateDecision,
  network:  string = DEFAULT_NETWORK,
): { httpStatus: 200 | 402; headers: Record<string, string> } {
  const headers: Record<string, string> = {
    [X_PAYMENT_NETWORK]:      network,
    [X_AGENT_TRUST_DECISION]: decision.kind,
  };

  switch (decision.kind) {
    case "Allow":
      return { httpStatus: 200, headers };
    case "Deny":
      headers[X_PAYMENT_REQUIRED]    = "denied";
      headers[X_PAYMENT_REASON_CODE] = String(decision.reasonCode);
      headers[X_PAYMENT_REASON_NAME] = decision.reasonName;
      return { httpStatus: 402, headers };
    case "RequireValidation": {
      headers[X_PAYMENT_REQUIRED]    = "validation";
      headers[X_CAPABILITY_REQUIRED] = bytesToHex(decision.capabilityHash);
      return { httpStatus: 402, headers };
    }
  }
}
