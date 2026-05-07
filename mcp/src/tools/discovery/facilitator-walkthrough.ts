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

/**
 * Resolve the bundled docs root (Phase N2: dist/embedded-docs/) plus
 * the repo-root fallback. The bundled path is preferred — it's the
 * load-bearing fix for npm-install consumers.
 */
function findDocsLookupRoots(): { docsRoot: string; servicesReadme: string }[] {
  // npm install: copy-embedded-assets.js puts the MDX tree under
  // dist/embedded-docs and the facilitators README under
  // dist/trustgate/server/src/facilitators/README.md. __dirname at
  // runtime is dist/tools/discovery, so two levels up reaches dist/.
  const distDocs = path.resolve(__dirname, "../../embedded-docs");
  const distSvc  = path.resolve(__dirname, "../../" + SERVICES_README);
  // Local clone: live tree.
  const repoCandidates = [
    path.resolve(__dirname, "../../../.."),
    process.cwd(),
  ];
  let liveRoot: string | null = null;
  for (const c of repoCandidates) {
    try { if (fs.existsSync(path.join(c, "Anchor.toml"))) { liveRoot = c; break; } } catch { /* ignore */ }
  }
  const out: { docsRoot: string; servicesReadme: string }[] = [];
  if (fs.existsSync(distDocs)) out.push({ docsRoot: distDocs, servicesReadme: distSvc });
  if (liveRoot)                out.push({ docsRoot: path.join(liveRoot, "docs-site/content/docs"), servicesReadme: path.join(liveRoot, SERVICES_README) });
  return out;
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
    const docKey = input.name.toLowerCase().replace(/[\s_]/g, "-");
    const matched = !!ADAPTER_DOCS[docKey];
    const docRel  = ADAPTER_DOCS[docKey] ?? GENERIC_FALLBACK;

    let content = "";
    let services = "";
    for (const { docsRoot, servicesReadme } of findDocsLookupRoots()) {
      const docAbs = path.join(docsRoot, docRel);
      if (!content) {
        try { content = fs.readFileSync(docAbs, "utf-8"); } catch { /* try next */ }
      }
      if (!services) {
        try { services = fs.readFileSync(servicesReadme, "utf-8"); } catch { /* try next */ }
      }
      if (content && services) break;
    }
    if (!content) content = `(no walkthrough bundled for ${docRel})`;

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
