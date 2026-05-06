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

function findRepoRoot(): string {
  const candidates = [
    path.resolve(__dirname, "../../.."),
    process.cwd(),
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(path.join(c, "Anchor.toml"))) return c; } catch { /* ignore */ }
  }
  return path.resolve(__dirname, "../../..");
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
  const root = findRepoRoot();
  const out: ResourceDescriptor[] = [];
  for (const demo of EXAMPLE_DEMOS) {
    const demoDir = path.join(root, "examples", demo);
    if (!fs.existsSync(demoDir)) continue;
    out.push({
      uri:         `${EXAMPLES_PROT}${demo}/README.md`,
      name:        `examples/${demo}/README.md`,
      description: `${demo} README — install + smoke walkthrough`,
      mimeType:    "text/markdown",
    });
    // List the source files non-recursively (one level deep keeps the
    // resource list compact; clients fetch full content via read).
    const srcDir = path.join(demoDir, "src");
    if (fs.existsSync(srcDir)) {
      for (const ent of fs.readdirSync(srcDir, { withFileTypes: true })) {
        if (!ent.isFile()) continue;
        if (!ent.name.endsWith(".ts")) continue;
        out.push({
          uri:         `${EXAMPLES_PROT}${demo}/src/${ent.name}`,
          name:        `examples/${demo}/src/${ent.name}`,
          description: `${demo} source: ${ent.name}`,
          mimeType:    "text/x-typescript",
        });
      }
    }
  }
  return out;
}

export function readExampleResource(uri: string): ResourceContent | null {
  if (!uri.startsWith(EXAMPLES_PROT)) return null;
  const rest = uri.slice(EXAMPLES_PROT.length);
  // Validate: only allow accessing files inside examples/<demo>/
  const parts = rest.split("/");
  if (parts.length < 2) return null;
  const demo = parts[0];
  if (!EXAMPLE_DEMOS.includes(demo as typeof EXAMPLE_DEMOS[number])) return null;
  const root = findRepoRoot();
  const fullPath = path.resolve(root, "examples", demo, ...parts.slice(1));
  // Path-traversal guard: resolve must remain within the demo dir.
  const allowed = path.resolve(root, "examples", demo);
  if (!fullPath.startsWith(allowed + path.sep) && fullPath !== allowed) return null;
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) return null;
  const mime = fullPath.endsWith(".ts") ? "text/x-typescript"
             : fullPath.endsWith(".md") ? "text/markdown"
             : "text/plain";
  return { uri, mimeType: mime, text: fs.readFileSync(fullPath, "utf-8") };
}

// Re-export findDocsRoot so server.ts can warm the cache.
export { findDocsRoot };
