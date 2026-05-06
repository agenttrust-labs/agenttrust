/**
 * `agenttrust_facilitator_walkthrough` — return the per-adapter
 * walkthrough doc, falling back to the generic adapters guide if the
 * name isn't recognised.
 *
 * Mapping is static and matches the four adapters shipped in
 * `trustgate/server/src/facilitators/`. Unknown names get the generic
 * facilitators-adapters MDX and an explicit note that the requested
 * name has no dedicated walkthrough.
 */

import * as fs from "fs";
import * as path from "path";

import { z } from "zod";

import type { Tool } from "../types";

const InputSchema = z.object({
  name: z.string().min(1).describe("Adapter name (pay-sh / dexter / atxp / mcpay) or any registered facilitator"),
});
type Input = z.infer<typeof InputSchema>;

interface Output {
  name:           string;
  matched:        boolean;
  source:         string;
  content:        string;
  fallback?:      string;
  servicesReadme?: string;
}

const ADAPTER_DOCS: Record<string, string> = {
  "pay-sh":  "integration-guides/pay-sh-adapter.mdx",
  "paysh":   "integration-guides/pay-sh-adapter.mdx",
  "pay.sh":  "integration-guides/pay-sh-adapter.mdx",
  "dexter":  "integration-guides/facilitator-adapters.mdx",
  "atxp":    "integration-guides/facilitator-adapters.mdx",
  "atxp_ai": "integration-guides/facilitator-adapters.mdx",
  "mcpay":   "integration-guides/facilitator-adapters.mdx",
};
const GENERIC_FALLBACK = "integration-guides/facilitator-adapters.mdx";
const SERVICES_README  = "trustgate/server/src/facilitators/README.md";

function findRepoRoot(): string {
  const candidates = [
    path.resolve(__dirname, "../../../.."),
    process.cwd(),
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(path.join(c, "Anchor.toml"))) return c; } catch { /* ignore */ }
  }
  return path.resolve(__dirname, "../../../..");
}

export const facilitatorWalkthroughTool: Tool<Input, Output> = {
  name:        "agenttrust_facilitator_walkthrough",
  description:
    "Return the per-adapter integration walkthrough for the named facilitator. " +
    "Recognised names: pay-sh, dexter, atxp, mcpay. Unknown names fall back " +
    "to the generic facilitator-adapters guide plus a note. Also returns " +
    "the trustgate/server facilitators README content for cross-reference.",
  inputSchema: InputSchema,

  async handler(input: Input): Promise<Output> {
    const root = findRepoRoot();
    const docKey = input.name.toLowerCase().replace(/[\s_]/g, "-");
    const matched = !!ADAPTER_DOCS[docKey];
    const docRel  = ADAPTER_DOCS[docKey] ?? GENERIC_FALLBACK;
    const docAbs  = path.join(root, "docs-site", "content", "docs", docRel);
    const readmeAbs = path.join(root, SERVICES_README);

    let content = "";
    try { content = fs.readFileSync(docAbs, "utf-8"); }
    catch (err) {
      content = `(failed to read ${docRel}: ${(err as Error).message})`;
    }
    let services = "";
    try { services = fs.readFileSync(readmeAbs, "utf-8"); }
    catch { /* optional */ }

    const out: Output = {
      name:           input.name,
      matched,
      source:         docRel,
      content,
      servicesReadme: services || undefined,
    };
    if (!matched) {
      out.fallback = "Unknown facilitator; returning the generic adapter guide.";
    }
    return out;
  },
};
