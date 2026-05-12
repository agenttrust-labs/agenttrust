#!/usr/bin/env node
// Prepublish guard. Fails if invoked via npm publish (which does not
// rewrite pnpm workspace: specs) or if any dep in this package's
// package.json carries a workspace: literal at publish time.

const path = require("node:path");
const fs   = require("node:fs");

const execPath = process.env.npm_execpath || "";
const isPnpm   = execPath.includes("pnpm");

const pkgPath = path.resolve(__dirname, "..", "package.json");
const pkg     = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

const collect = (block) => Object.entries(block || {}).filter(
  ([_, v]) => typeof v === "string" && v.startsWith("workspace:"),
);

const offenders = [
  ...collect(pkg.dependencies),
  ...collect(pkg.peerDependencies),
  ...collect(pkg.optionalDependencies),
];

if (!isPnpm && offenders.length > 0) {
  console.error(`[publish-guard] FAIL: ${pkg.name} package.json carries ${offenders.length} workspace: specifier(s):`);
  for (const [name, spec] of offenders) {
    console.error(`  ${name}: ${spec}`);
  }
  console.error("[publish-guard] npm publish does NOT rewrite these. The published tarball will break npm install with EUNSUPPORTEDPROTOCOL.");
  console.error("[publish-guard] Publish via:  pnpm --filter " + pkg.name + " publish --access public");
  console.error("[publish-guard] Detected npm_execpath:", execPath || "(unset)");
  process.exit(1);
}

if (!isPnpm) {
  console.log(`[publish-guard] OK: no workspace: specifiers in ${pkg.name}; safe to publish via npm too.`);
} else {
  console.log(`[publish-guard] OK: publishing via pnpm; workspace: specifiers will be rewritten.`);
}
