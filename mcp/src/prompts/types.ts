/**
 * Shared shape for MCP prompt templates.
 */

import type { z } from "zod";

export interface PromptArgument {
  readonly name:        string;
  readonly description: string;
  readonly required:    boolean;
}

export interface PromptMessage {
  readonly role:    "user" | "assistant" | "system";
  readonly content: { type: "text"; text: string };
}

export interface Prompt {
  readonly name:        string;
  readonly description: string;
  readonly arguments:   ReadonlyArray<PromptArgument>;
  readonly argsSchema:  z.ZodType<Record<string, string>>;
  build(args: Record<string, string>): PromptMessage[];
}
