/**
 * `agenttrust_explain_failure` — given a failed payment's reason code
 * (the value of `X-Payment-Reason-Code`), produce a developer-readable
 * explanation + remediation steps the operator can act on.
 */

import { z } from "zod";

import type { Prompt } from "./types";

const ArgsSchema = z.object({
  reason_code: z.string().describe("DenyReason stable code (1..15) as a decimal string"),
  payer_agent: z.string().optional().describe("Payer agent (helps resolve killswitch / velocity)"),
  payee_agent: z.string().optional().describe("Payee agent (helps resolve counterparty / atom)"),
  policy_id:   z.string().optional().describe("Policy ID (helps resolve spending / velocity)"),
});

export const explainFailurePrompt: Prompt = {
  name:        "agenttrust_explain_failure",
  description: "Explain a failed payment given its reason code, and walk through the chain reads needed to confirm root cause + propose remediation.",
  arguments: [
    { name: "reason_code", description: "DenyReason stable code (1..15) as a decimal string", required: true },
    { name: "payer_agent", description: "Payer agent (optional)",                              required: false },
    { name: "payee_agent", description: "Payee agent (optional)",                              required: false },
    { name: "policy_id",   description: "Policy ID (optional)",                                 required: false },
  ],
  argsSchema: ArgsSchema,
  build(args) {
    const ctx: string[] = [];
    if (args.payer_agent) ctx.push(`payer_agent = ${args.payer_agent}`);
    if (args.payee_agent) ctx.push(`payee_agent = ${args.payee_agent}`);
    if (args.policy_id)   ctx.push(`policy_id   = ${args.policy_id}`);
    const ctxBlock = ctx.length > 0 ? ctx.join("\n") + "\n\n" : "";
    return [
      {
        role:    "user",
        content: {
          type: "text",
          text:
            `Explain why a payment failed with reason_code = ${args.reason_code}.\n\n` +
            ctxBlock +
            `Steps to perform:\n` +
            `1. Call agenttrust_explain_decision(reason_code) to surface the enum name + remediation hint.\n` +
            `2. Based on the category in the response, call the relevant read tool to confirm root cause:\n` +
            `   - killswitch  → agenttrust_get_killswitch(payer_agent)\n` +
            `   - spending    → agenttrust_get_policy(payer_agent, policy_id)\n` +
            `   - velocity    → agenttrust_get_velocity(payer_agent, policy_id)\n` +
            `   - counterparty → agenttrust_get_quantu_reputation(payee_agent)\n` +
            `   - validation  → agenttrust_get_validation_attestation(payer_agent, capability_hash) — capability hash comes from policy.fields.requiredCapabilityHashHex\n` +
            `   - atom        → agenttrust_get_quantu_reputation(payee_agent) — verify ownerMatches\n` +
            `3. Synthesise a short answer: what the chain currently says, why the policy denies, and the smallest change that would flip the decision.`,
        },
      },
    ];
  },
};
