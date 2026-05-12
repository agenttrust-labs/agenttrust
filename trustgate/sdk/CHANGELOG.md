# Changelog

All notable changes to `@agenttrust-sdk/trustgate`.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- `makePayShFacilitator(args)` and `makeDefaultRegistry(RegistryCtor, args)`
  in the new `@agenttrust-sdk/trustgate/facilitator-factory` subpath
  export. Bundles the boilerplate `validateOnChainTx` + `emitFeedbackCpi`
  + `priorEmissionLookup` + `signDecision` wiring documented in
  `trustgate/server/src/production.ts` into a single deps-builder. The
  `PaySh` class and `FacilitatorRegistry` themselves remain in the
  private `@agenttrust/trustgate-server` reference impl — consumers pass
  `new PaySh(deps)` and `FacilitatorRegistry` into the SDK factories.
  Non-breaking; previous manual wiring continues to work.
- `ReplayCacheLike` shape exported alongside the factory. Production
  consumers wire a persistent (Redis-backed or similar) implementation;
  the in-memory default from `@agenttrust/trustgate-server` is documented
  as NOT production-safe (replay window re-opens on restart).

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
