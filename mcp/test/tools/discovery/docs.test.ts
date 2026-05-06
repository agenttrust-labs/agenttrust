/**
 * `agenttrust_docs` returns relevant hits over the real docs corpus.
 * The docs-site MDX directory is checked into the repo so tests are
 * deterministic.
 */

import { expect } from "chai";

import {
  docsTool,
  loadDocsCorpus,
  findDocsRoot,
} from "../../../src/tools/discovery/docs";

import { buildTestConfig } from "../../helpers";
import { ChainClient } from "../../../src/chain";

describe("agenttrust_docs", () => {
  const ctx = { chain: new ChainClient(buildTestConfig()) };

  it("finds the docs root", () => {
    const root = findDocsRoot();
    expect(root).to.be.a("string");
  });

  it("loads at least 10 MDX pages from the corpus", () => {
    const pages = loadDocsCorpus(true);
    expect(pages.length).to.be.greaterThan(10);
    for (const p of pages) {
      expect(p.uri).to.match(/^agenttrust:\/\/docs\//);
      expect(p.title).to.be.a("string");
      expect(p.body).to.be.a("string");
    }
  });

  it("ranks 'validation registry' hits with the dedicated MDX in the top 3", async () => {
    const out = await docsTool.handler({ query: "validation registry", max_results: 5 }, ctx);
    expect(out.hits.length).to.be.greaterThan(0);
    const top3 = out.hits.slice(0, 3).map((h) => h.uri);
    const found = top3.some((uri) => uri.includes("validation-registry"));
    expect(found, `expected validation-registry doc in top 3; got ${top3.join(", ")}`).to.equal(true);
  });

  it("returns empty hits on a query no doc contains", async () => {
    const out = await docsTool.handler({ query: "xyzzy_zorblax_neverappears", max_results: 5 }, ctx);
    expect(out.hits.length).to.equal(0);
  });

  it("validates query length", () => {
    const r = docsTool.inputSchema.safeParse({ query: "a", max_results: 5 });
    expect(r.success).to.equal(false);
  });
});
