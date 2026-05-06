# CI workflow live triggers — Phase F2.7

Triggered 2026-05-06 via `gh workflow run --ref main` to verify the
workflows actually execute (not just look green via cached badges).

## Active workflows on remote

| Workflow | File | Run URL | Status |
|---|---|---|---|
| TypeScript build + unit tests | `.github/workflows/ts-test.yml` | https://github.com/agenttrust-labs/agenttrust/actions/runs/25451139063 | success |
| Build + Rust unit tests | `.github/workflows/build.yml` | https://github.com/agenttrust-labs/agenttrust/actions/runs/25451140758 | success |
| Kani Formal Verification | `.github/workflows/kani-prove.yml` | https://github.com/agenttrust-labs/agenttrust/actions/runs/25451142598 | success |

## Local-only workflows (not yet pushed to remote)

The following workflow files exist in `.github/workflows/` locally but
the remote `agenttrust-labs/agenttrust` repository's Actions list does
not include them. They will register with the remote on the next push.
Cannot trigger via `gh workflow run` until then.

- `anchor-test.yml` — Anchor program test suite (full local-validator
  run with Quantu state cloned from devnet, MPL Core, and
  `--validator legacy`).
- `devnet-integration.yml` — gated devnet integration job that
  exercises the SDK + MCP devnet read paths and runs the Pay.sh smoke.

## Run-against-state caveat

These workflow runs execute against the current `main` branch on the
remote, which is at commit `505209c` (rebrand repo URLs). The 47
local-only Phase F commits at the time of trigger include:

  699cb35 verify all three IDLs published on devnet
  4287980 anchor test: clone devnet Quantu state for emit_feedback CPI
  9870b6a extend Anchor tests with daily/weekly caps, multisig N=N, dispute, dup namespace
  7f5a3c3 add SDK devnet integration suite (16 live-RPC assertions)
  7dcd289 fill server adapter coverage gaps + cross-adapter LSP test
  ebfff1a extend demo integration coverage
  fdbbfff extend MCP coverage: docs traversal guard + 2 more devnet read-tool tests
  28e887a kani: re-verify 5/5 invariants pass; capture run summary

Pushing those commits + the two new workflow files to remote is the
explicit gate to surface the full Phase F surface in CI. Hold for
operator authorization.
