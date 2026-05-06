/**
 * `agenttrust_setup_agent` — guided onboarding flow for an agent that
 * needs PolicyAuthority + KillSwitchState + at least one PolicyAccount.
 */

import { z } from "zod";

import type { Prompt } from "./types";

const ArgsSchema = z.object({
  agent_asset: z.string().describe("Quantu agent asset"),
  use_case:    z.string().optional()
                  .describe("Optional one-line description of what this agent will do (e.g., 'pay-per-call API agent')"),
});

export const setupAgentPrompt: Prompt = {
  name:        "agenttrust_setup_agent",
  description: "Walk through the bootstrap sequence for an agent: PolicyAuthority → KillSwitchState → first PolicyAccount with sane defaults.",
  arguments: [
    { name: "agent_asset", description: "Quantu agent asset",                    required: true },
    { name: "use_case",    description: "Optional one-line description",          required: false },
  ],
  argsSchema: ArgsSchema,
  build(args) {
    const useCase = args.use_case ? `Use-case context: ${args.use_case}` : "Use-case context: generic agent.";
    return [
      {
        role:    "user",
        content: {
          type: "text",
          text:
            `Set up AgentTrust for agent ${args.agent_asset}.\n\n` +
            `${useCase}\n\n` +
            `Required steps in order:\n` +
            `1. Confirm the agent already has Quantu agent_account + atom_stats. Use agenttrust_get_quantu_reputation; if exists=false the agent must be registered with Quantu first (out-of-scope for AgentTrust).\n` +
            `2. Initialise PolicyAuthority — out-of-scope for the MCP write tools in v1; surface that the user must call init_authority directly via the SDK or Anchor CLI to seed the multisig (members + threshold).\n` +
            `3. Initialise KillSwitchState — also out-of-scope for the MCP write tools in v1; surface the SDK / Anchor CLI invocation pointing at programs/policy-vault/src/instructions/init_killswitch.rs.\n` +
            `4. Create the first PolicyAccount via agenttrust_init_policy. Recommend an enabled_kinds_bitmask covering at least KillSwitch (1) + Spending (2) for the first policy.\n` +
            `5. Verify with agenttrust_get_policy + agenttrust_list_policies.\n\n` +
            `Output: a step-by-step checklist with the exact tool calls (or, where v1 is missing a write tool, the SDK / Anchor CLI command equivalent), and a one-paragraph summary of what's now on-chain for this agent.`,
        },
      },
    ];
  },
};
