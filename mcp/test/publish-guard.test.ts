/**
 * Smoke test for `scripts/check-no-workspace-spec.cjs`.
 *
 * Defends against the 0.3.2 packaging regression — `npm publish` from the
 * mcp workspace shipped a tarball with `"@agenttrust-sdk/trustgate":
 * "workspace:^"` in `dependencies`, breaking every downstream
 * `npm install` with `EUNSUPPORTEDPROTOCOL`. The fix flow forces
 * publication through `pnpm publish` (which rewrites `workspace:` specs
 * at pack time).
 *
 * This guard runs as `prepublishOnly` and FAILS the publish when invoked
 * via `npm publish` against a package.json that still carries
 * `workspace:` specs. We exercise that pathway here without actually
 * publishing — we just spawn the script with different `npm_execpath`
 * values and assert the exit code + stdout/stderr.
 */

import { expect } from "chai";
import { spawnSync } from "child_process";
import * as path from "path";

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

/**
 * Resolve the guard script path from process.cwd(). ts-mocha runs the
 * suite from the package root (mcp/), so this is stable; we avoid
 * `__dirname` because mocha's loader treats these test files as ESM
 * dynamic imports, which leaves `__dirname` undefined at module level.
 */
function scriptPath(): string {
  return path.resolve(process.cwd(), "scripts", "check-no-workspace-spec.cjs");
}

function run(execPath: string | undefined): RunResult {
  const env = { ...process.env };
  if (execPath === undefined) {
    delete env.npm_execpath;
  } else {
    env.npm_execpath = execPath;
  }
  const res = spawnSync(process.execPath, [scriptPath()], { env, encoding: "utf8" });
  return {
    status: res.status,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
  };
}

describe("publish-guard (check-no-workspace-spec.cjs)", () => {
  it("FAILS with exit 1 when invoked via npm against a workspace-specced package.json", () => {
    // mcp/package.json depends on @agenttrust-sdk/trustgate via
    // `workspace:^` (sourced from the monorepo). npm publish would
    // ship that literal verbatim, breaking npm install downstream.
    const r = run("/usr/local/lib/node_modules/npm/bin/npm-cli.js");
    expect(r.status, "exit code").to.equal(1);
    expect(r.stderr, "stderr names @agenttrust-sdk/trustgate").to.match(/@agenttrust-sdk\/trustgate/);
    expect(r.stderr, "stderr mentions workspace:").to.match(/workspace:/);
    expect(r.stderr, "stderr remediation points at pnpm").to.match(/pnpm.*publish/);
  });

  it("PASSES with exit 0 when invoked via pnpm (workspace: specs will be rewritten)", () => {
    const r = run("/Users/x/.local/share/pnpm/global/5/node_modules/pnpm/bin/pnpm.cjs");
    expect(r.status, "exit code").to.equal(0);
    expect(r.stdout, "stdout confirms pnpm path").to.match(/publishing via pnpm/);
  });

  it("FAILS when npm_execpath is unset (rare CI mis-config) and workspace: specs exist", () => {
    // Belt-and-braces: a stray `node scripts/check-no-workspace-spec.cjs`
    // outside any publish lifecycle should also fail noisily so a CI
    // author trying to wire it up the wrong way sees the diagnostic.
    const r = run(undefined);
    expect(r.status, "exit code").to.equal(1);
    expect(r.stderr, "stderr names @agenttrust-sdk/trustgate").to.match(/@agenttrust-sdk\/trustgate/);
  });
});
