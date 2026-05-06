# Publishing `@agenttrust-sdk/trustgate`

Operator-gated. Run only when a release is tagged.

## What ships

`npm pack --dry-run` from this directory after `pnpm run build` produces a
~55 kB tarball (~250 kB unpacked, 63 files). The `files` field in
`package.json` controls inclusion:

- `dist/` — compiled JS + `.d.ts` + source maps + declaration maps
  (consumers' IDEs use the maps to jump to the original `.ts`)
- `src/` — original TypeScript source (intentionally shipped so IDE
  go-to-source lands in real source, not generated `.d.ts`)
- `README.md` — public-facing intro
- `LICENSE` — MIT

## Public API surface

The root export (`@agenttrust-sdk/trustgate`) re-exports every public
symbol. Subpath imports are supported:

```ts
import { mountTrustGate }       from "@agenttrust-sdk/trustgate/express";
import { gatePayment, settle }  from "@agenttrust-sdk/trustgate/client";
import { composeAtomicSettleTx } from "@agenttrust-sdk/trustgate";
```

The `package.json#exports` field pins these subpaths so subpath imports
resolve in any modern bundler / runtime that respects `exports`.

Modules:

| module | what it covers |
|--|--|
| `atomicity` | `composeAtomicSettleTx`, the literal-type-guard + runtime-throw atomicity invariant |
| `chain` | PDA derivers + Anchor `Program` loaders for `policy_vault` + `trustgate` |
| `client` | `gatePayment(...)`, `settle(...)`, `dispute(...)` — programmatic facilitator API |
| `emit-feedback` | Production factory for `emit_feedback` CPI + idempotent retry lookup |
| `express` | `mountTrustGate(app, config)` — Express middleware |
| `onchain-validator` | `makeValidateOnChainTx(connection)` — `VersionedTransaction` parser |
| `quantu` | Quantu agent_registry / atom_engine PDA derivers |
| `spl` | Manual SPL `TransferChecked` ix builder + ATA derivation |
| `types` | `GateDecision`, `ProgramIds`, `DEFAULT_DEVNET_PROGRAM_IDS` |
| `validation-registry` | 4 PDA derivers + 5 ix builders for the third ERC-8004 leg |
| `x402` | Header builder + `denyReasonName` lookup |

## Versioning

Semantic versioning. The 0.x line tracks the AgentTrust devnet program
IDs at `Anchor.toml`; a 1.0 release follows the first mainnet deployment.

| version bump | trigger |
|--|--|
| 0.x.Y patch | bug fix, JSDoc, internal refactor with no API change |
| 0.X.0 minor | added export, new optional method param, new public type |
| X.0.0 major | renamed export, removed export, changed required arg, breaking IDL |

The on-chain program IDs are pinned in `DEFAULT_DEVNET_PROGRAM_IDS`. A
mainnet release adds a `MAINNET_PROGRAM_IDS` constant; both stay
exported and `mountTrustGate` accepts an `programIds` override.

## Pre-publish checklist

1. **`pnpm run build`** — clean `tsc` against the pinned TS 4.9.5
2. **`pnpm test`** — all 56 unit tests passing
3. **`anchor test`** — Anchor end-to-end suite green
4. **`cargo kani --all-proofs`** — 5 PolicyVault invariants green
5. **`npm pack --dry-run`** — verify file list + size; commit any new
   intentional inclusions
6. **CHANGELOG.md** — append a release entry under the new version
7. **`git tag v<version>`** — sign the tag
8. **`pnpm run publish:dry`** — `npm publish --dry-run` against the
   registry to surface auth / scope issues before the real publish

## Publishing

```bash
# from trustgate/sdk/
pnpm run build
pnpm run publish:dry      # smoke test
npm publish --access public
```

The `prepublishOnly` script (`pnpm run build && pnpm test`) re-runs the
build + tests as a publish-time guard. Don't bypass it with
`--ignore-scripts`.

## What ships under specific files

The published tarball contains both `dist/` (compiled) and `src/`
(source). Consumers tree-shake at bundle time; including source costs
~30 kB and gives IDE users the source view in `node_modules` instead of
the lossy `.d.ts`. Decision logged here for future maintainers.

## What does NOT ship

- `test/` — excluded via `files` field
- `tsconfig.json`, `vitest.config.ts` — irrelevant to consumers
- internal docs under `docs/` — gitignored, not in the tarball anyway
- type declarations for `@types/*` devDeps — npm strips devDeps on install

## Post-publish

- Tag the release on GitHub: `gh release create v<version> --notes-from-tag`
- Update the docs-site reference page if the public surface changed
- Bump the version in `package.json` to the next `-dev` per the versioning
  table above
- Announce on the AgentTrust X account if the bump is minor or major
