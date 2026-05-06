/**
 * `agenttrust_audit_payment` — guided workflow for inspecting a single
 * payer→payee payment. Walks the user through:
 *   1. simulate the gate decision
 *   2. read the policy
 *   3. read the payee's reputation
 *   4. summarise the decision in plain English
 */

import { z } from "zod";

import type { Prompt } from "./types";

const ArgsSchema = z.object({
  payer_agent: z.string().describe("Payer Quantu agent asset"),
  payee_agent: z.string().describe("Payee Quantu agent asset"),
  amount:      z.string().describe("Amount in mint base units"),
  mint:        z.string().describe("SPL or Token-2022 mint pubkey"),
  policy_id:   z.string().describe("u32 policy ID as string"),
});

export const auditPaymentPrompt: Prompt = {
  name:        "agenttrust_audit_payment",
  description: "Audit a payment by simulating the gate decision, reading the active policy, and resolving the payee's Quantu reputation tier.",
  arguments: [
    { name: "payer_agent", description: "Payer Quantu agent asset",          required: true },
    { name: "payee_agent", description: "Payee Quantu agent asset",          required: true },
    { name: "amount",      description: "Amount in mint base units",         required: true },
    { name: "mint",        description: "SPL or Token-2022 mint pubkey",     required: true },
    { name: "policy_id",   description: "u32 policy ID as a string",         required: true },
  ],
  argsSchema: ArgsSchema,
  build(args) {
    return [
      {
        role:    "user",
        content: {
          type: "text",
          text:
            `Audit this payment end-to-end:\n\n` +
            `payer_agent = ${args.payer_agent}\n` +
            `payee_agent = ${args.payee_agent}\n` +
            `amount      = ${args.amount}\n` +
            `mint        = ${args.mint}\n` +
            `policy_id   = ${args.policy_id}\n\n` +
            `Steps to perform:\n` +
            `1. Call agenttrust_simulate_payment with the inputs above. Capture the GateDecision.\n` +
            `2. Call agenttrust_get_policy(payer_agent, policy_id) to surface the active spending caps and tier thresholds.\n` +
            `3. Call agenttrust_get_quantu_reputation(payee_agent) to surface the payee's tier and risk score.\n` +
            `4. If the decision is Deny, call agenttrust_explain_decision with the reasonCode for the remediation hint.\n` +
            `5. If the decision is RequireValidation, call agenttrust_get_validation_attestation(payer_agent, capabilityHashHex) to check whether an attestation already exists.\n\n` +
            `Summarise in plain English: what would happen, why, and what (if anything) the operator should do next.`,
        },
      },
    ];
  },
};
