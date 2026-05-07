/**
 * MCP resources backed by the docs corpus + the example demo source
 * trees. Each MDX page is exposed as `agenttrust://docs/<rel-path>`;
 * each example is a hierarchical resource rooted at
 * `agenttrust://examples/<demo-name>/...`.
 */

import * as fs from "fs";
import * as path from "path";

import { findDocsRoot, loadDocsCorpus } from "../tools/discovery/docs";

export interface ResourceDescriptor {
  uri:         string;
  name:        string;
  description: string;
  mimeType:    string;
}

export interface ResourceContent {
  uri:      string;
  mimeType: string;
  text:     string;
}

const DOCS_PROTOCOL    = "agenttrust://docs/";
const EXAMPLES_PROT    = "agenttrust://examples/";

/**
 * Resolve the examples root. Phase N1+N2 fix:
 * `dist/embedded-examples/` is preferred (npm-install path) and the
 * live `examples/` tree under the repo root is the local-clone fallback.
 *
 * Returns one or more candidate roots so callers can try each in order.
 */
function findExamplesRoots(): string[] {
  const out: string[] = [];
  // __dirname at runtime is dist/resources, so one level up reaches dist/.
  const distExamples = path.resolve(__dirname, "../embedded-examples");
  if (fs.existsSync(distExamples)) out.push(distExamples);
  const repoCandidates = [path.resolve(__dirname, "../../.."), process.cwd()];
  for (const c of repoCandidates) {
    try { if (fs.existsSync(path.join(c, "Anchor.toml"))) { out.push(path.join(c, "examples")); break; } }
    catch { /* ignore */ }
  }
  return out;
}

export function listDocsResources(): ResourceDescriptor[] {
  const corpus = loadDocsCorpus();
  return corpus.map((p) => ({
    uri:         p.uri,
    name:        p.title,
    description: p.description || `MDX doc: ${p.uri.replace(DOCS_PROTOCOL, "")}`,
    mimeType:    "text/markdown",
  }));
}

export function readDocsResource(uri: string): ResourceContent | null {
  if (!uri.startsWith(DOCS_PROTOCOL)) return null;
  const corpus = loadDocsCorpus();
  const page = corpus.find((p) => p.uri === uri);
  if (!page) return null;
  return {
    uri,
    mimeType: "text/markdown",
    text:     fs.readFileSync(page.filePath, "utf-8"),
  };
}

const EXAMPLE_DEMOS = ["pay-sh-demo", "attestor-demo"] as const;

export function listExampleResources(): ResourceDescriptor[] {
  const roots = findExamplesRoots();
  const seen = new Set<string>();
  const out: ResourceDescriptor[] = [];
  for (const root of roots) {
    for (const demo of EXAMPLE_DEMOS) {
      const demoDir = path.join(root, demo);
      if (!fs.existsSync(demoDir)) continue;
      const readmeUri = `${EXAMPLES_PROT}${demo}/README.md`;
      if (!seen.has(readmeUri) && fs.existsSync(path.join(demoDir, "README.md"))) {
        seen.add(readmeUri);
        out.push({
          uri:         readmeUri,
          name:        `examples/${demo}/README.md`,
          description: `${demo} README — install + smoke walkthrough`,
          mimeType:    "text/markdown",
        });
      }
      // List the source files non-recursively (one level deep keeps
      // the resource list compact; clients fetch full content via read).
      const srcDir = path.join(demoDir, "src");
      if (fs.existsSync(srcDir)) {
        for (const ent of fs.readdirSync(srcDir, { withFileTypes: true })) {
          if (!ent.isFile()) continue;
          if (!ent.name.endsWith(".ts")) continue;
          const uri = `${EXAMPLES_PROT}${demo}/src/${ent.name}`;
          if (seen.has(uri)) continue;
          seen.add(uri);
          out.push({
            uri,
            name:        `examples/${demo}/src/${ent.name}`,
            description: `${demo} source: ${ent.name}`,
            mimeType:    "text/x-typescript",
          });
        }
      }
    }
  }
  return out;
}

export function readExampleResource(uri: string): ResourceContent | null {
  if (!uri.startsWith(EXAMPLES_PROT)) return null;
  const rest = uri.slice(EXAMPLES_PROT.length);
  const parts = rest.split("/");
  if (parts.length < 2) return null;
  const demo = parts[0];
  if (!EXAMPLE_DEMOS.includes(demo as typeof EXAMPLE_DEMOS[number])) return null;
  for (const root of findExamplesRoots()) {
    const fullPath = path.resolve(root, demo, ...parts.slice(1));
    // Path-traversal guard: resolve must remain within the demo dir.
    const allowed = path.resolve(root, demo);
    if (!fullPath.startsWith(allowed + path.sep) && fullPath !== allowed) continue;
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) continue;
    const mime = fullPath.endsWith(".ts") ? "text/x-typescript"
               : fullPath.endsWith(".md") ? "text/markdown"
               : "text/plain";
    return { uri, mimeType: mime, text: fs.readFileSync(fullPath, "utf-8") };
  }
  return null;
}

// Re-export findDocsRoot so server.ts can warm the cache.
export { findDocsRoot };
