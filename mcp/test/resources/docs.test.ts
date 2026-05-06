import { expect } from "chai";

import {
  listDocsResources,
  readDocsResource,
  listExampleResources,
  readExampleResource,
} from "../../src/resources/docs";

describe("docs resources", () => {
  it("listDocsResources returns at least 10 entries", () => {
    const list = listDocsResources();
    expect(list.length).to.be.greaterThan(10);
    for (const r of list) {
      expect(r.uri.startsWith("agenttrust://docs/")).to.equal(true);
      expect(r.mimeType).to.equal("text/markdown");
    }
  });

  it("readDocsResource returns content for a known URI", () => {
    const list = listDocsResources();
    const first = list[0];
    const r = readDocsResource(first.uri);
    expect(r).to.exist;
    expect(r!.text.length).to.be.greaterThan(0);
  });

  it("readDocsResource returns null for unknown URI", () => {
    const r = readDocsResource("agenttrust://docs/nonexistent-page");
    expect(r).to.equal(null);
  });

  it("readDocsResource ignores non-docs URIs", () => {
    const r = readDocsResource("agenttrust://devnet/programs");
    expect(r).to.equal(null);
  });

  it("readDocsResource rejects path-traversal URIs", () => {
    // Path-traversal style URIs must not resolve to anything outside the
    // docs-site corpus. The corpus-membership lookup is the load-bearing
    // guard: any URI not in the indexed corpus → null.
    const candidates = [
      "agenttrust://docs/../../etc/passwd",
      "agenttrust://docs/../../../package.json",
      "agenttrust://docs/..%2F..%2Fetc%2Fpasswd",
      "agenttrust://docs/foo/../../bar",
    ];
    for (const uri of candidates) {
      expect(readDocsResource(uri), `traversal accepted: ${uri}`).to.equal(null);
    }
  });
});

describe("example resources", () => {
  it("lists pay-sh-demo and attestor-demo READMEs", () => {
    const list = listExampleResources();
    const uris = list.map((r) => r.uri);
    expect(uris.some((u) => u === "agenttrust://examples/pay-sh-demo/README.md")).to.equal(true);
    expect(uris.some((u) => u === "agenttrust://examples/attestor-demo/README.md")).to.equal(true);
  });

  it("readExampleResource returns README content", () => {
    const r = readExampleResource("agenttrust://examples/pay-sh-demo/README.md");
    expect(r).to.exist;
    expect(r!.text.length).to.be.greaterThan(0);
  });

  it("readExampleResource rejects path traversal", () => {
    const r = readExampleResource("agenttrust://examples/pay-sh-demo/../../../etc/passwd");
    expect(r).to.equal(null);
  });

  it("readExampleResource rejects unknown demo names", () => {
    const r = readExampleResource("agenttrust://examples/totally-fake-demo/README.md");
    expect(r).to.equal(null);
  });
});
