import type { Prompt } from "./types";

import { auditPaymentPrompt }   from "./audit-payment";
import { setupAgentPrompt }     from "./setup-agent";
import { explainFailurePrompt } from "./explain-failure";

export const ALL_PROMPTS: ReadonlyArray<Prompt> = [
  auditPaymentPrompt,
  setupAgentPrompt,
  explainFailurePrompt,
];

export type { Prompt } from "./types";
