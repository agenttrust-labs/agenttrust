# Changelog

All notable changes to `@agenttrust-sdk/trustgate`.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.3.2] — 2026-05-13

Tag: `sdk-v0.3.2` · Pipeline-only release pairing the mcp 0.3.5
polish wave.

### Added

- `prepublishOnly` guard: a small Node script
  `scripts/check-no-workspace-spec.cjs` hard-fails any publish that
  would ship a `workspace:` specifier. The sdk has no workspace
  deps today but the guard is in place against future additions.
  Same shape as the matching guard in `@agenttrust-sdk/mcp`.

No runtime changes.

## [0.3.1] — 2026-05-12

Tag: `sdk-v0.3.1` · Developer-experience polish wave covering the
SDK-side audit P1 findings plus a new public facilitator factory.

### Added

- `makePayShFacilitator(args)` and `makeDefaultRegistry(RegistryCtor,
  args)` in a new `@agenttrust-sdk/trustgate/facilitator-factory`
  subpath export. Bundles the `validateOnChainTx` + `emitFeedbackCpi`
  + `priorEmissionLookup` + `signDecision` wiring documented in
  `trustgate/server/src/production.ts` into a single deps-builder.
  The `PaySh` class and `FacilitatorRegistry` themselves stay in the
  private `@agenttrust/trustgate-server` reference impl — consumers
  pass `new PaySh(deps)` and the `FacilitatorRegistry` constructor
  into the SDK factories. Non-breaking; previous manual wiring still
  works.
- `ReplayCacheLike` shape exported alongside the factory. Production
  consumers wire a persistent (Redis-backed or similar)
  implementation; the in-memory default from the private server
  package is documented as NOT production-safe (replay window
  re-opens on restart).
- Nine new subpath exports in `package.json` so the imports the README
  advertises actually resolve: `./atomicity`, `./chain`,
  `./emit-feedback`, `./onchain-validator`, `./quantu`, `./spl`,
  `./types`, `./validation-registry`, `./x402`.
- `MAINNET_PROGRAM_IDS: ProgramIds | undefined` placeholder export
  with JSDoc explaining that AgentTrust programs aren't deployed to
  mainnet yet and mainnet callers must pass explicit pubkeys.
- `SignerLike = Keypair | { publicKey: PublicKey }`. Accepted by
  `gatePayment` and `mountTrustGate.facilitatorKeypair` so read-only
  and simulation flows no longer need to construct a `Keypair` just
  to expose a pubkey.

### Changed

- `loadValidationRegistry` no longer silently defaults to the
  devnet program ID on non-devnet RPCs. The function inspects
  `provider.connection.rpcEndpoint` and applies the devnet default
  only when the URL contains `devnet`, `127.0.0.1`, or `localhost`.
  Other endpoints throw with explicit remediation pointing at
  `DEFAULT_DEVNET_PROGRAM_IDS.validationRegistry`.
- IDL-missing throws from `loadPolicyVault`, `loadTrustGate`, and
  `loadValidationRegistry` point at `anchor idl init <programId>`
  plus the explicit `idl` argument override.
- `parseGateDecision` takes an optional `simLogs` second arg and
  includes a ~400-char summary of the upstream Solana logs in the
  thrown error when the returnData buffer is empty.
  `simulateGatePayment` threads `sim.value.logs` through both the
  empty-returnData and parse-failure paths.
- `emit-feedback` writes a one-time stderr warn when `valueDecimals`
  is omitted. Preserves the USDC default for compat while making the
  magnitude trap visible to non-USDC integrators.

### Removed

- `client.dispute` (the throw-only `"not implemented in v0.1"` stub).
  The on-chain `dispute_payment` instruction exists; a typed
  composer is deferred to a separate PR. README points future
  callers at `loadTrustGate(...).methods.disputePayment(...)`.
- `makeSettleRoute` and `makeDisputeRoute` from `express.ts` (the 501
  stubs). `mountTrustGate` now mounts only `/verify` and `/receipt`.
  The canonical home of `/settle` and `/dispute` HTTP routes is
  `trustgate-server::mountFacilitatorRoutes`; for TypeScript callers,
  `client.settle` is the typed composer.

Net effect of the removals: any consumer who imported these stub
exports was already getting throw-on-call or 501-on-call. Removing
them is a fix to the surface, not a behavioural break to anyone who
was getting real work done.

## [0.2.0] — 2026-05-07

Tag: [`sdk-v0.2.0`](https://github.com/agenttrust-labs/agenttrust/releases/tag/sdk-v0.2.0)
· Commit: `00ca222`

### Changed (breaking)

- `ProgramIds.trustgate` renamed to `ProgramIds.trustGate` (camelCase,
  matches `policyVault`). Same value (the deployed-devnet trustgate
  program ID) — only the field name changed. One-line consumer
  migration: `.trustgate` → `.trustGate`.

### Added

- `ProgramIds.validationRegistry` — populated by default with the
  deployed-devnet validation-registry program ID
  `Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv`. Previously consumers
  had to import `VALIDATION_REGISTRY_DEVNET_ID` separately; that import
  still works but `DEFAULT_DEVNET_PROGRAM_IDS.validationRegistry` is the
  preferred entry point.

## [0.1.1] — 2026-05-04

Tag: [`sdk-v0.1.1`](https://github.com/agenttrust-labs/agenttrust/releases/tag/sdk-v0.1.1)
· Commit: `64fe14d`

### Changed

- Metadata refresh after the org rebrand to
  [`agenttrust-labs`](https://github.com/agenttrust-labs). `homepage`,
  `repository`, and `bugs` URLs now point at the new repo. No code
  changes.

## [0.1.0] — 2026-05-02

Tag: [`sdk-v0.1.0`](https://github.com/agenttrust-labs/agenttrust/releases/tag/sdk-v0.1.0)
· Commit: `29f9961`

### Added

- Initial publish of the TrustGate SDK as a drop-in middleware for x402
  facilitators on Solana.
- Express middleware: `mountTrustGate(app, …)` adds `POST /verify`,
  `POST /settle`, `POST /dispute`, `GET /receipt/:hash`.
- Client helpers: `gatePayment`, `settle`, `dispute`.
- Atomic-tx invariant: `AtomicityEnforced` literal-true marker +
  `assertAtomicityEnforced` runtime guard + `composeAtomicSettleTx`
  that bundles `gate_payment_strict + SPL transferChecked +
  emit_feedback` into one Solana transaction.
- ValidationRegistry surface: `register_namespace` / `register_attestor`
  / `request_validation` / `respond_to_validation` / `revoke_validation`
  instruction builders + PDA derivers + read fetchers.
- PolicyVault surface: `simulateGatePayment`, `parseGateDecision`, all
  PDA derivers (`derivePolicyPda`, `deriveVelocityPda`,
  `deriveKillSwitchPda`, `deriveFeedbackLogPda`,
  `deriveTrustGateAuthorityPda`).
- Quantu helpers: `deriveAgentAccountPda`, `deriveAtomStatsPda`,
  `deriveQuantuFeedbackAccounts`, `DEFAULT_DEVNET_QUANTU_IDS`,
  `MAINNET_QUANTU_IDS`.
- Production factories: `makeValidateOnChainTx`, `makeEmitFeedbackCpi`,
  `makePriorEmissionLookup`.
