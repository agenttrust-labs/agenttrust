#!/usr/bin/env node
/* eslint-disable */
/**
 * Build-time copy step: materialise the runtime-read data + docs
 * corpus + examples into mcp/dist/ so the npm tarball ships with
 * everything the read tools and resources need. Without this step,
 * agenttrust_demo_state, agenttrust_docs, agenttrust_facilitator_walkthrough,
 * and the agenttrust://docs/* + agenttrust://examples/* resources all
 * degrade silently on a fresh `npx` install (Phase M Bugs #2 + #3).
 *
 * Targets:
 *   dist/embedded-data/      — devnet JSON snapshots the demo-state tool reads
 *   dist/embedded-docs/      — full MDX corpus + the trustgate facilitators README
 *   dist/embedded-examples/  — pay-sh-demo + attestor-demo source for the
 *                              agenttrust://examples/* resource scheme
 *   dist/idl/                — Anchor IDLs (pre-existing, kept for compatibility)
 *
 * The bundled snapshots freeze at publish time. Live docs at
 * docs.agenttrust.tech stay current independently.
 */

const fs = require("node:fs");
const path = require("node:path");

const MCP_DIR  = path.resolve(__dirname, "..");
const DIST_DIR = path.join(MCP_DIR, "dist");
const REPO_ROOT = path.resolve(MCP_DIR, "..");

function copyFile(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

function copyTree(srcRoot, dstRoot, predicate) {
  if (!fs.existsSync(srcRoot)) return 0;
  let count = 0;
  for (const ent of fs.readdirSync(srcRoot, { withFileTypes: true })) {
    const src = path.join(srcRoot, ent.name);
    const dst = path.join(dstRoot, ent.name);
    if (ent.isDirectory()) {
      count += copyTree(src, dst, predicate);
    } else if (ent.isFile() && (predicate ? predicate(src) : true)) {
      copyFile(src, dst);
      count++;
    }
  }
  return count;
}

// --------------------------------------------------------------------------
// embedded-data — JSON snapshots the demo-state tool consumes
// --------------------------------------------------------------------------
const dataDst = path.join(DIST_DIR, "embedded-data");
fs.mkdirSync(dataDst, { recursive: true });
const dataSources = [
  "examples/pay-sh-demo/devnet-counterparties.json",
  "examples/pay-sh-demo/devnet-demo-policies.json",
  "examples/pay-sh-demo/devnet-smoke.json",
  "examples/attestor-demo/devnet-attestor-trace.json",
  "examples/attestor-demo/devnet-namespaces.json",
  "examples/attestor-demo/devnet-chained-validation.json",
];
let dataCopied = 0;
for (const rel of dataSources) {
  const src = path.join(REPO_ROOT, rel);
  if (!fs.existsSync(src)) continue;
  copyFile(src, path.join(dataDst, path.basename(rel)));
  dataCopied++;
}
console.log(`[copy-embedded-assets] embedded-data: ${dataCopied}/${dataSources.length} files`);

// --------------------------------------------------------------------------
// embedded-docs — full MDX corpus + facilitators README
// --------------------------------------------------------------------------
const docsDst = path.join(DIST_DIR, "embedded-docs");
const mdxRoot = path.join(REPO_ROOT, "docs-site/content/docs");
const mdxCount = copyTree(mdxRoot, docsDst, (p) => p.endsWith(".mdx"));
console.log(`[copy-embedded-assets] embedded-docs: ${mdxCount} mdx files`);

const facilitatorReadme = path.join(REPO_ROOT, "trustgate/server/src/facilitators/README.md");
if (fs.existsSync(facilitatorReadme)) {
  // Keep the original repo path so consumers that grep by SERVICES_README
  // (the literal "trustgate/server/src/facilitators/README.md" string)
  // continue to find it relative to the docs root.
  const dst = path.join(DIST_DIR, "trustgate/server/src/facilitators/README.md");
  copyFile(facilitatorReadme, dst);
  console.log(`[copy-embedded-assets] copied facilitators README`);
}

// --------------------------------------------------------------------------
// embedded-examples — pay-sh-demo + attestor-demo source the
// agenttrust://examples/* resource scheme exposes.
// --------------------------------------------------------------------------
const examplesDst = path.join(DIST_DIR, "embedded-examples");
const demos = ["pay-sh-demo", "attestor-demo"];
let exampleCount = 0;
for (const demo of demos) {
  const demoSrc = path.join(REPO_ROOT, "examples", demo);
  if (!fs.existsSync(demoSrc)) continue;
  // README.md
  const readme = path.join(demoSrc, "README.md");
  if (fs.existsSync(readme)) {
    copyFile(readme, path.join(examplesDst, demo, "README.md"));
    exampleCount++;
  }
  // src/*.ts (one level)
  const srcDir = path.join(demoSrc, "src");
  if (fs.existsSync(srcDir)) {
    for (const ent of fs.readdirSync(srcDir, { withFileTypes: true })) {
      if (!ent.isFile() || !ent.name.endsWith(".ts")) continue;
      copyFile(path.join(srcDir, ent.name), path.join(examplesDst, demo, "src", ent.name));
      exampleCount++;
    }
  }
}
console.log(`[copy-embedded-assets] embedded-examples: ${exampleCount} files`);

// --------------------------------------------------------------------------
// IDL — preserved from the pre-existing build step
// --------------------------------------------------------------------------
const idlSrc = path.join(MCP_DIR, "src/idl");
const idlDst = path.join(DIST_DIR, "idl");
if (fs.existsSync(idlSrc)) {
  fs.mkdirSync(idlDst, { recursive: true });
  let idlCount = 0;
  for (const f of fs.readdirSync(idlSrc)) {
    if (f.endsWith(".json")) {
      copyFile(path.join(idlSrc, f), path.join(idlDst, f));
      idlCount++;
    }
  }
  console.log(`[copy-embedded-assets] idl: ${idlCount} files`);
}
