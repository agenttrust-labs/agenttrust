# Contributing to AgentTrust

## Toolchain

- **Package manager: pnpm** (always — never npm or yarn). Commit
  `pnpm-lock.yaml` with every dep change.
- **Node 20+**. Anchor 1.0+ for the on-chain programs. Solana CLI 3.1+.
- **Rust** stable for the Anchor workspace; **Kani 0.67+** for the formal
  proofs in `programs/policy-vault/src/proofs/`.

## Branch + PR workflow

- Never push directly to `main`. Open a PR.
- Branch naming: `feat/<task>` for code, `fix/<task>` for bug fixes,
  `ui/<task>` for UI changes, `docs/<task>` for documentation-only.
- Keep PRs scoped — one logical change per PR.
- Run the relevant test suite before pushing:
  ```
  pnpm --filter ./trustgate/sdk    test
  pnpm --filter ./trustgate/server test
  pnpm --filter ./mcp              test
  pnpm --filter ./examples/pay-sh-demo test
  anchor test --provider.cluster localnet --validator legacy --skip-build
  ```
- All CI workflows must go green before merge. `kani-prove`,
  `anchor-test`, `ts-test`, `secret-scan`, `bundle-size`, plus the
  conformance + format jobs.

## Commit messages

- Terse, imperative mood: "add foo" not "added foo" or "adds foo".
- Lowercase first letter, no trailing period on the subject line.
- No emojis.
- No `Co-Authored-By:` trailer (matches the existing repo log).
- Body wrapped at ~72 cols; explain the *why*, not the *what*.

## License

AgentTrust ships under [MIT](LICENSE). By submitting a PR you agree
to license your contribution under the same terms.
