/**
 * `agenttrust_explain_decision` — translate a numeric reason code into
 * its enum name plus a one-paragraph remediation hint.
 *
 * Authoritative mapping comes from the SDK's `denyReasonName` (which
 * mirrors `programs/policy-vault/src/state/decision.rs`). The hints
 * here are MCP-specific guidance text — they describe what a developer
 * or operator should do next when they see the code.
 */

import { z } from "zod";

import type { Tool } from "../types";
import { denyReasonName } from "@agenttrust-sdk/trustgate";

const InputSchema = z.object({
  reason_code: z.number().int().min(1).max(15).describe("DenyReason stable code (1..15)"),
});
type Input = z.infer<typeof InputSchema>;

interface Output {
  reasonCode:    number;
  reasonName:    string;
  category:      "killswitch" | "spending" | "velocity" | "counterparty" | "atom" | "validation";
  oneLiner:      string;
  remediation:   string;
}

const REMEDIATION: Record<number, { category: Output["category"]; oneLiner: string; remediation: string }> = {
  1: {
    category: "killswitch",
    oneLiner: "The agent's per-agent KillSwitchState is paused.",
    remediation:
      "Read the kill-switch with agenttrust_get_killswitch to see who paused " +
      "it and when. Resume by calling agenttrust_set_killswitch(paused=false) " +
      "as a member of the agent's PolicyAuthority that satisfies threshold.",
  },
  2: {
    category: "spending",
    oneLiner: "amount > policy.spending_per_tx_max for this single tx.",
    remediation:
      "Either lower the tx amount or raise the policy's per_tx_max via a new " +
      "init_policy under a different policy_id (current policies are not " +
      "mutable post-init in v1).",
  },
  3: {
    category: "spending",
    oneLiner: "spending_today_used + amount would exceed spending_daily_max.",
    remediation:
      "Wait for the day-anchor to advance (24h since spending_today_anchor), " +
      "or increase the policy's daily cap via a new init_policy.",
  },
  4: {
    category: "spending",
    oneLiner: "spending_week_used + amount would exceed spending_weekly_max.",
    remediation:
      "Wait for the week-anchor to roll (next Monday since 1970-01-05) or " +
      "raise the weekly cap on a fresh policy.",
  },
  5: {
    category: "velocity",
    oneLiner: "The cumulative velocity-window total + amount exceeds the limit.",
    remediation:
      "Read agenttrust_get_velocity to see window_start_slot and " +
      "cumulative_amount. The window resets after window_secs slots elapse " +
      "from window_start_slot.",
  },
  6: {
    category: "counterparty",
    oneLiner: "Payee tier is below policy.min_counterparty_tier.",
    remediation:
      "Use agenttrust_get_quantu_reputation to confirm the payee's tier. " +
      "Either pick a higher-tier counterparty (the demo's tier-3 pre-warm " +
      "is the canonical happy-path) or relax min_counterparty_tier in a " +
      "new policy.",
  },
  7: {
    category: "counterparty",
    oneLiner: "Payee risk_score is above policy.max_risk_score.",
    remediation:
      "Inspect the Quantu atom_stats risk_score. Lower-risk counterparties " +
      "or a more permissive max_risk_score in policy fix this.",
  },
  8: {
    category: "counterparty",
    oneLiner: "Payee confidence is below policy.min_confidence basis points.",
    remediation:
      "Confidence climbs as the agent accrues feedback. Either accept lower " +
      "confidence in policy or wait for the agent's history to mature.",
  },
  9: {
    category: "atom",
    oneLiner: "atom_stats account is owned by the wrong program.",
    remediation:
      "Verify NETWORK and Quantu program IDs are correct. agenttrust_get_quantu_reputation " +
      "returns ownerProgram + ownerExpected so you can confirm.",
  },
  10: {
    category: "atom",
    oneLiner: "atom_stats schema version does not match what the policy expects.",
    remediation:
      "Quantu rolled a schema; either update the AgentTrust deployment's " +
      "expected schema version or wait for the policy to be re-deployed.",
  },
  11: {
    category: "validation",
    oneLiner: "No ValidationAttestation matches required_capability_hash.",
    remediation:
      "Have an attestor call agenttrust_respond_to_validation for the same " +
      "(subject_asset, capability_name) pair. agenttrust_get_validation_attestation " +
      "confirms the attestation lands.",
  },
  12: {
    category: "validation",
    oneLiner: "Matching attestation exists but expires_at slot has passed.",
    remediation:
      "Re-attest. Each respond_to_validation call writes a fresh expires_at; " +
      "the policy reads the most-recent one keyed by attestor.",
  },
  13: {
    category: "validation",
    oneLiner: "Matching attestation has been revoked by the attestor.",
    remediation:
      "Either pick a different accepted attestor in policy.validation.accepted_attestors " +
      "or have the attestor re-attest after addressing the revocation reason.",
  },
  14: {
    category: "validation",
    oneLiner: "Attestation exists but the attestor is not in the policy's accepted set.",
    remediation:
      "Update policy.validation.accepted_attestors to include the attestor, " +
      "or set it to all-zero (permissionless mode).",
  },
  15: {
    category: "counterparty",
    oneLiner: "Agent has no Quantu reputation yet, and policy default_unrated_treatment is Deny.",
    remediation:
      "Switch policy.counterparty.default_unrated_treatment to UNRATED_ALLOW (0) " +
      "or UNRATED_REQUIRE_VALIDATION (2), or wait for the agent to receive " +
      "its first feedback.",
  },
};

export const explainDecisionTool: Tool<Input, Output> = {
  name:        "agenttrust_explain_decision",
  description:
    "Return the human-readable enum name and a remediation hint for a " +
    "PolicyVault GateDecision::Deny reason code (1..15). Useful when a " +
    "facilitator returns a 402 with X-Payment-Reason-Code and the caller " +
    "needs to know what to fix.",
  inputSchema: InputSchema,

  async handler(input: Input): Promise<Output> {
    const r = REMEDIATION[input.reason_code];
    if (!r) {
      return {
        reasonCode:  input.reason_code,
        reasonName:  denyReasonName(input.reason_code),
        category:    "killswitch",
        oneLiner:    "Unknown reason code.",
        remediation: "No remediation registered for this code; check the SDK's denyReasonName.",
      };
    }
    return {
      reasonCode:  input.reason_code,
      reasonName:  denyReasonName(input.reason_code),
      category:    r.category,
      oneLiner:    r.oneLiner,
      remediation: r.remediation,
    };
  },
};
