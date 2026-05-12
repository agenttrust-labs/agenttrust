/**
 * `agenttrust_docs` — naïve full-text search over the MDX corpus at
 * `docs-site/content/docs/`. Returns the top 5 ranked snippets.
 *
 * Indexer: walks the docs corpus once on first call, caches the
 * resulting `DocPage[]`. Each page is parsed for title/description
 * frontmatter + raw body. Ranking: term-frequency over the body, with
 * a 5x bonus for matches in title or description.
 *
 * The MCP server runs in-process so the cache survives across tool
 * calls. A `MCP_DOCS_DIR` env override exists for tests.
 */

import * as fs from "fs";
import * as path from "path";

import { z } from "zod";

import type { Tool } from "../types";

interface DocPage {
  uri:         string;          // agenttrust://docs/<rel-path>
  filePath:    string;
  title:       string;
  description: string;
  body:        string;
  bodyLower:   string;
}

const InputSchema = z.object({
  query:       z.string().min(2).describe("Free-text query (case-insensitive)"),
  max_results: z.number().int().min(1).max(20).default(5),
});
type Input = z.infer<typeof InputSchema>;

interface Hit {
  uri:         string;
  title:       string;
  description: string;
  score:       number;
  excerpt:     string;
}

interface Output {
  query: string;
  hits:  Hit[];
  /** Set when the docs corpus could not be located at runtime (e.g. a build
   *  skipped `copy-embedded-assets.js` and the clone fallback paths don't
   *  resolve). Optional + additive — existing consumers still see hits: [].
   *  An LLM that branches on this can tell "corpus missing" apart from
   *  "no hits for this query". */
  errorCode?: "docs_corpus_not_found";
}

let cache: DocPage[] | null = null;
// Module-level guard so the corpus-missing warn fires once per process.
let warnedMissingCorpus = false;

export function findDocsRoot(): string | null {
  const candidates = [
    // Env override wins (tests + power-users)
    process.env.MCP_DOCS_DIR ?? "",
    // npm-install path: full MDX corpus copied into dist/embedded-docs
    // by scripts/copy-embedded-assets.js (Phase N2 fix). __dirname at
    // runtime is dist/tools/discovery, so two levels up reaches dist/.
    path.resolve(__dirname, "../../embedded-docs"),
    // Local-clone path: read directly from the source-of-truth tree.
    path.resolve(__dirname, "../../../../docs-site/content/docs"),
    // Process cwd fallback (tests, custom layouts).
    path.resolve(process.cwd(), "docs-site/content/docs"),
  ].filter(Boolean);
  for (const c of candidates) {
    try { if (c && fs.statSync(c).isDirectory()) return c; } catch { /* ignore */ }
  }
  return null;
}

export function loadDocsCorpus(force = false): DocPage[] {
  if (cache && !force) return cache;
  const root = findDocsRoot();
  if (!root) { cache = []; return cache; }
  const pages: DocPage[] = [];
  walk(root, "", pages, root);
  cache = pages;
  return pages;
}

function walk(dir: string, rel: string, pages: DocPage[], root: string) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    const cur = rel ? path.join(rel, ent.name) : ent.name;
    if (ent.isDirectory()) {
      walk(abs, cur, pages, root);
    } else if (ent.isFile() && ent.name.endsWith(".mdx")) {
      const raw = fs.readFileSync(abs, "utf-8");
      const meta = parseFrontmatter(raw);
      const body = stripFrontmatter(raw);
      const uri = "agenttrust://docs/" + cur.replace(/\.mdx$/, "").replace(/\\/g, "/");
      pages.push({
        uri,
        filePath:    abs,
        title:       meta.title       ?? cur,
        description: meta.description ?? "",
        body,
        bodyLower:   body.toLowerCase(),
      });
    }
  }
}

function parseFrontmatter(raw: string): { title?: string; description?: string } {
  if (!raw.startsWith("---\n")) return {};
  const end = raw.indexOf("\n---\n", 4);
  if (end < 0) return {};
  const block = raw.slice(4, end);
  const out: { title?: string; description?: string } = {};
  for (const line of block.split("\n")) {
    const m = /^([A-Za-z_]+):\s*(.+?)\s*$/.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase();
    let val = m[2];
    if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key === "title")       out.title = val;
    if (key === "description") out.description = val;
  }
  return out;
}

function stripFrontmatter(raw: string): string {
  if (!raw.startsWith("---\n")) return raw;
  const end = raw.indexOf("\n---\n", 4);
  if (end < 0) return raw;
  return raw.slice(end + 5);
}

function score(query: string, page: DocPage): { score: number; excerpt: string } {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return { score: 0, excerpt: "" };
  let s = 0;
  let firstHitIdx = -1;
  for (const t of terms) {
    const titleHit = page.title.toLowerCase().includes(t)       ? 5 : 0;
    const descHit  = page.description.toLowerCase().includes(t) ? 5 : 0;
    let bodyHits   = 0;
    let from = 0;
    while (true) {
      const idx = page.bodyLower.indexOf(t, from);
      if (idx < 0) break;
      bodyHits++;
      if (firstHitIdx < 0) firstHitIdx = idx;
      from = idx + t.length;
    }
    s += titleHit + descHit + bodyHits;
  }
  const excerptStart = Math.max(0, firstHitIdx - 80);
  const excerptEnd   = Math.min(page.body.length, (firstHitIdx < 0 ? 0 : firstHitIdx) + 240);
  const excerpt = firstHitIdx >= 0
    ? page.body.slice(excerptStart, excerptEnd).replace(/\n+/g, " ").trim()
    : (page.description || page.body.slice(0, 240).replace(/\n+/g, " ").trim());
  return { score: s, excerpt };
}

export const docsTool: Tool<Input, Output> = {
  name:        "agenttrust_docs",
  description:
    "Full-text search the AgentTrust documentation. Returns up to N ranked " +
    "hits with title, agenttrust:// URI, score, and an excerpt around the " +
    "first match. Use the URI in resources/read to fetch the full doc.",
  inputSchema: InputSchema,

  async handler(input: Input): Promise<Output> {
    const corpus = loadDocsCorpus();
    if (corpus.length === 0) {
      // The corpus is missing AND the find-roots probe came up empty.
      // Surface a machine-parseable signal AND log once to stderr so a
      // regression in copy-embedded-assets.js is visible to operators.
      if (!warnedMissingCorpus) {
        warnedMissingCorpus = true;
        process.stderr.write(
          "[agenttrust] WARN agenttrust_docs: docs corpus not found at runtime. " +
          "Set MCP_DOCS_DIR, re-run the build (scripts/copy-embedded-assets.js), " +
          "or verify the install path includes dist/embedded-docs/. " +
          "Returning empty hits.\n",
        );
      }
      return { query: input.query, hits: [], errorCode: "docs_corpus_not_found" };
    }
    const ranked: Hit[] = [];
    for (const page of corpus) {
      const r = score(input.query, page);
      if (r.score > 0) {
        ranked.push({
          uri:         page.uri,
          title:       page.title,
          description: page.description,
          score:       r.score,
          excerpt:     r.excerpt,
        });
      }
    }
    ranked.sort((a, b) => b.score - a.score);
    return { query: input.query, hits: ranked.slice(0, input.max_results) };
  },
};
