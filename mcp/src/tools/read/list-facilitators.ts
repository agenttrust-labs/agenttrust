/**
 * `agenttrust_list_facilitators` — return the active facilitator
 * adapter registry as a static manifest. Mirrors the four adapters
 * shipped in `trustgate/server/src/facilitators/`: Pay.sh (live),
 * Dexter / atxp / MCPay.
 *
 * Manifest is a static module-local constant. The MCP server doesn't
 * boot the Express service, so dynamically introspecting a live
 * `FacilitatorRegistry` would require an extra dependency the SDK
 * doesn't expose. Per the registry/dispatch shape in
 * `trustgate/server/src/facilitators/index.ts`, the four adapters and
 * their protocols/status are pinned values that stay in sync with that
 * file by review.
 */

import { z } from "zod";

import type { Tool } from "../types";

const InputSchema = z.object({});
type Input = z.infer<typeof InputSchema>;

interface FacilitatorEntry {
  name:        string;
  description: string;
  protocols:   string[];
  status:      "live" | "in-flight" | "roadmap";
  docsPath:    string;
}

interface Output {
  count:        number;
  facilitators: FacilitatorEntry[];
}

const FACILITATORS: FacilitatorEntry[] = [
  {
    name:        "pay-sh",
    description: "Pay.sh — first concrete x402 facilitator adapter. Live in the demo and CI integration.",
    protocols:   ["x402"],
    status:      "live",
    docsPath:    "integration-guides/pay-sh-adapter",
  },
  {
    name:        "dexter",
    description: "Cascade Dexter — x402 facilitator. Wire-spec + Zod schemas + adapter wired; full integration in flight.",
    protocols:   ["x402"],
    status:      "in-flight",
    docsPath:    "integration-guides/facilitator-adapters",
  },
  {
    name:        "atxp",
    description: "atxp_ai — x402 facilitator with JWT-claim issuance. Adapter shipped; payment proof validation roadmap.",
    protocols:   ["x402"],
    status:      "roadmap",
    docsPath:    "integration-guides/facilitator-adapters",
  },
  {
    name:        "mcpay",
    description: "MCPay — MCP-native facilitator. Adapter shipped against the wire spec; full integration roadmap.",
    protocols:   ["x402", "mcp"],
    status:      "roadmap",
    docsPath:    "integration-guides/facilitator-adapters",
  },
];

export const listFacilitatorsTool: Tool<Input, Output> = {
  name:        "agenttrust_list_facilitators",
  description:
    "List every facilitator adapter shipped in trustgate/server. Each entry " +
    "names the wire protocol(s) it speaks (x402, mcp), its current ship status " +
    "(live / in-flight / roadmap), and the docs path for its walkthrough.",
  inputSchema: InputSchema,

  async handler(): Promise<Output> {
    return { count: FACILITATORS.length, facilitators: FACILITATORS };
  },
};
