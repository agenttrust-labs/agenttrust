/**
 * x402 spec compliance — header builder + status code helpers.
 *
 * The x402 protocol uses HTTP 402 Payment Required as a signaling channel:
 * a facilitator's gateway returns 402 with descriptive headers, and the
 * client (agent / wallet) reads those headers to decide whether to retry,
 * route through validation, or escalate. Reference: the Coinbase x402 +
 * Cascade x402 implementations + AgentTrust's playbook §05.
 */

import { DenyReasonCode, GateDecision } from "./types";

// ---------------------------------------------------------------------------
// Header keys (x402 canonical set)
// ---------------------------------------------------------------------------
export const X_PAYMENT_REQUIRED        = "X-Payment-Required";
export const X_PAYMENT_NETWORK         = "X-Payment-Network";
export const X_PAYMENT_REASON_CODE     = "X-Payment-Reason-Code";
export const X_PAYMENT_REASON_NAME     = "X-Payment-Reason-Name";
export const X_CAPABILITY_REQUIRED     = "X-Capability-Required";
export const X_AGENT_TRUST_DECISION    = "X-Agent-Trust-Decision";

const NETWORK = "solana-devnet"; // v1 hard-pinned; v1.1 reads from env

// ---------------------------------------------------------------------------
// Decision-name table (mirrors DenyReason::code() in
// programs/policy-vault/src/state/decision.rs)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Header builder
// ---------------------------------------------------------------------------
export function buildHeadersForDecision(decision: GateDecision): {
  httpStatus: 200 | 402;
  headers:    Record<string, string>;
} {
  const headers: Record<string, string> = {
    [X_PAYMENT_NETWORK]:      NETWORK,
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
      const hex = decision.capabilityHash
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      headers[X_CAPABILITY_REQUIRED] = hex;
      return { httpStatus: 402, headers };
    }
  }
}
