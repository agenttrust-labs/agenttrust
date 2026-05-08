# Phase R-docs — Phase 1 plan

**Date:** 2026-05-08. **Branch:** `docs/r-presentable-v1`. **Scope (locked by Mohit):** `docs-site/` only — `web/`, `programs/`, `trustgate/`, `mcp/`, `examples/`, `tests/`, `status-page/` are out of scope. The website agent owns `web/` on `ui/r-presentable-v1` (their stash preserved).

## Watchpoints baked in (per amendment)

1. **§2 Architecture vs §3 Programs ownership.** Clean line — §2 = wiring + one paragraph per program (the "what is it" and how it composes); §3 = byte-precise reference (PDAs, instructions, offsets). If the line fuzzes during execution, §2 collapses into the homepage.
2. **Capability namespaces split.** §6 Integration guides hosts the *walkthrough* ("how do I use one?"); §8 Reference hosts the auto-generated *list* (10 seeded namespaces, table built from `examples/attestor-demo/devnet-namespaces.json` at lint time — never hardcoded).
3. **Live evidence is the FIRST page under §7 Verification.** Single consolidated page: Kani 6/6 + 635 sub-checks, chained-validation 4-sig trace, FeedbackEmissionLog PDA, 10 namespaces, daily smoke, every claim with an Explorer URL. Not buried.
4. **`@agenttrust/trustgate-server` package status — VERIFIED 2026-05-08.** `npm view @agenttrust/trustgate-server` → 404. The import in current `facilitator-adapters.mdx` is broken; the rewrite refactors examples around `@agenttrust-sdk/trustgate` only, points readers at `trustgate/server/src/facilitators/pay-sh/index.ts` for the in-repo adapter pattern.

## Per-page audit — every existing MDX page

Source root: `docs-site/content/docs/`. Read 2026-05-08 against current `main` (post-Phase Q1).

| # | Path | Current purpose | Accurate? | Complete? | Well-placed? | Verdict |
|---|------|-----------------|-----------|-----------|--------------|---------|
| 1 | `index.mdx` | Homepage / introduction | Mostly — facilitator status table is the right voice; Pay.sh launch link works; but the `pnpm --filter ./examples/pay-sh-demo dev` snippet implies local clone, contradicts hosted-first quickstart | Thin — no narrative payoff, no devnet evidence, no atomic-tx invariant headline | OK as homepage | **Rewrite** — collapse §2 architecture overview into a "How it composes" subsection on the homepage and lean on `<KaniProofBadge>` + `<ProgramIdsTable>` |
| 2 | `getting-started/quickstart.mdx` | 60-second onboarding | **Stale** — references `localhost:3402`, `/health` JSON shape, `pay --sandbox curl localhost:3402` (discipline rule banned); package version not pinned | Partial — no `npx @agenttrust-sdk/mcp` route; no Explorer link payoff after running | OK in nav | **Rewrite** — three live paths only: curl `demo.agenttrust.tech/protected`, install `@agenttrust-sdk/trustgate`, install `@agenttrust-sdk/mcp` for Claude Desktop. Every snippet runs against the live hosted endpoints. |
| 3 | `getting-started/architecture-overview.mdx` | Architecture / composition | Mostly correct on byte offsets (549/551/557, 8/40/72/208/216) but lists *5* Kani harnesses (we ship 6) | Thin on the `gate_payment_strict_correctness` invariant + atomic-tx 3-layer story | **Misplaced** — architecture is its own nav peer, not a "getting-started" sub-page | **Move + rewrite** to `architecture.mdx` at the new top-level §2; refresh Kani count to 6/635, add the strict-correctness contract paragraph |
| 4 | `integration-guides/pay-sh-adapter.mdx` | Pay.sh walkthrough | Mostly correct; `localhost:3402` references should resolve to `https://demo.agenttrust.tech` (already does in most places) | Decent technical scaffold but doesn't surface the live `devnet-smoke.json` trace + Explorer links | OK in §6 | **Rewrite** with hosted demo as primary path + crosslink to verification §7 live-evidence |
| 5 | `integration-guides/facilitator-adapters.mdx` | Adapter contract | **Wrong package scope** — line 58 imports from `@agenttrust/trustgate-server`, which is **not published** (404). The server is a workspace package | OK on the 5-method contract concept | OK in §6 | **Rewrite** — drop the `@agenttrust/trustgate-server` import; use `trustgate/server/src/facilitators/pay-sh/index.ts` workspace path as the reference, mount example uses `@agenttrust-sdk/trustgate` |
| 6 | `integration-guides/x402-facilitator.mdx` | Generic x402 integration | Correct | OK as a quick-reference | OK | **Keep + light edit** to point at §6 pay-sh-adapter for the worked example, deduplicate against §4 mountTrustGate |
| 7 | `integration-guides/capability-namespaces.mdx` | Namespace usage | Stub (`In progress`) | Empty | OK in §6 | **Rewrite** — full walkthrough: name → SHA-256 → PDA seeds → register. Cross-link to the auto-generated table in §8. |
| 8 | `integration-guides/custom-attestor.mdx` | Build an attestor | Stub (`In progress`) | Empty | OK in §6 | **Rewrite** — full lifecycle: register profile, respond to validation, revoke. Use the `examples/attestor-demo` 4-sig trace as the demo payoff. |
| 9 | `programs/policy-vault/index.mdx` | PolicyVault overview | Correct | Decent technical sketch; missing `gate_payment_strict_correctness` mention | OK in §3 | **Rewrite** to reference-grade with composer/Anchor wrapper split + DenyReason code table |
| 10 | `programs/policy-vault/kill-switch-policy.mdx` | KillSwitch | Stub | Empty | OK | **Rewrite** with `KillSwitchState` byte layout, `set_killswitch` ix, multisig threshold rules, the `paused_implies_no_allow` proof |
| 11 | `programs/policy-vault/spending-policy.mdx` | Spending | Stub | Empty | OK | **Rewrite** with per-tx / daily / weekly fields + UTC anchor math + DenyReason codes 2/3/4 |
| 12 | `programs/policy-vault/velocity-policy.mdx` | Velocity | Stub | Empty | OK | **Rewrite** with `VelocityLedger` fields + tier-decay table + `velocity_counter_le_limit` proof + DenyReason 5 |
| 13 | `programs/policy-vault/counterparty-tier-policy.mdx` | CounterpartyTier | Stub | Empty | OK | **Rewrite** — the wedge. AtomStats byte layout, `tier_immediate` vs `tier_confirmed`, `unrated_treatment` table, DenyReasons 6/7/8/9/10 |
| 14 | `programs/policy-vault/require-validation-policy.mdx` | RequireValidation | Stub | Empty | OK | **Rewrite** — ValidationAttestation byte layout, `accepted_attestors[]` semantics, expiry check, DenyReasons 11/12/13/14 |
| 15 | `programs/trustgate.mdx` | TrustGate program | Decent | Missing FeedbackEmissionLog byte layout + dispute_payment ix + atomicity link to §7 | OK in §3 | **Rewrite** to reference-grade |
| 16 | `programs/validation-registry.mdx` | ValidationRegistry program | Decent | Missing AttestorProfile + ValidationRequest fields + the SHA-256 attestation message | OK in §3 | **Rewrite** to reference-grade |
| 17 | `sdk/index.mdx` | SDK landing | Mostly correct | Lists `settle` and `dispute` as "guarded SDK surface" — accurate but reads as half-done | OK in §4 | **Rewrite** to mirror the npm README structure (install / two import surfaces / atomic-tx invariant / formal-verification) but cross-link to npm + GitHub instead of restating |
| 18 | `sdk/gate-payment.mdx` | gatePayment | Stub | Empty | OK | **Rewrite** — full type signature, every config field, decision union shape, runtime errors |
| 19 | `sdk/mount-trustgate.mdx` | mountTrustGate | Stub | Empty | OK | **Rewrite** — every route + headers shape + atomicity guard |
| 20 | `sdk/atomic-tx-invariant.mdx` | Atomic tx invariant | Decent technical content | OK; could surface the localnet test layer | **Move** to §7 Verification (atomic-tx-invariant proof page) — the SDK docs link to it | **Move + rewrite** as a §7 page |
| 21 | `reference/byte-offset-reference.mdx` | Byte offsets | Correct | OK | OK | **Keep + light edit** — cross-link from §3 program pages |
| 22 | `reference/changelog.mdx` | Release notes | **Stale** — last entry 2026-05-06; no SDK 0.2.0, no MCP 0.1.0 → 0.2.6 | Empty for the entire Phase F-Q span | OK | **Rebuild from `mcp/CHANGELOG.md` + `trustgate/sdk/CHANGELOG.md`** at lint time (no manual sync drift) |
| 23 | `reference/devnet-program-ids.mdx` | Devnet IDs | Correct | OK | OK | **Keep + cross-link** to ProgramIdsTable component |
| 24 | `reference/discriminator-constants.mdx` | Discriminators | Stub | Empty | OK | **Rewrite** — Quantu `give_feedback` discriminator + every PDA seed prefix + a few size constants |
| 25 | `reference/formal-verification.mdx` | Kani | **Stale** — 5 invariants listed; ship is **6** (Phase J5 added strict-correctness with 258 sub-checks) | Empty on the per-harness sub-check counts | **Move** to §7 Verification (kani-proofs page) | **Move + rewrite** as §7 page; redirect from `/reference/formal-verification` |
| 26 | `reference/mainnet-program-ids.mdx` | Quantu mainnet IDs | Correct | OK | OK | **Keep + light edit** |
| 27 | `reference/quantu-agent-registry.mdx` | Quantu CPI surface | Stub | Empty | OK | **Rewrite** — the CPI signature, the discriminator, the byte offsets we read |

**Summary:** 1 keep / 4 keep+light edit / 18 rewrite / 4 move (3 of those rewrite-on-move). 0 retire (every existing page covers a load-bearing concern).

## New pages

| Section | Path | What it covers | Why it matters |
|---------|------|----------------|----------------|
| §1 Get started | (covered by index + quickstart rewrite — no new pages) | — | — |
| §2 Architecture | `architecture.mdx` | Single page: composition diagram, per-program paragraph, FacilitatorAdapter pattern, atomic-tx invariant, ERC-8004 wiring | Promotes architecture out of "getting-started" so a reader looking for the wiring story doesn't have to dig past install steps |
| §3 Programs | `programs/policy-vault/composer.mdx` | The pure-Rust composer: fail-fast order, ComposerInput/Result shape, deltas-on-Allow rule, link to all 5 policy pages | The composer is the load-bearing concept of PolicyVault; existing index page touches it but doesn't give it its own home |
| §4 SDK | `sdk/exports-reference.mdx` | One-screen list of every public export (`mountTrustGate`, `gatePayment`, `settle`, `dispute`, `composeAtomicSettleTx`, `AtomicityEnforced`, `assertAtomicityEnforced`, `derivePolicyPda`, `DEFAULT_DEVNET_PROGRAM_IDS`, error classes) | Returning developer needs a one-stop list; current docs split this across 4 pages |
| §5 MCP server | `mcp/index.mdx` | Section landing: what the server is, how to install in Claude Desktop / Cursor, hosted vs stdio, `npx @agenttrust-sdk/mcp` | Brand-new section. Zero docs coverage today; package is `@agenttrust-sdk/mcp@0.2.6` with 18 tools |
| §5 MCP server | `mcp/install.mdx` | Detailed install: Claude Desktop config, Cursor config, hosted endpoint config, env vars, write-tool keypair setup | Needs its own page — the README covers this, docs cross-link |
| §5 MCP server | `mcp/tools.mdx` | All 18 tools: 10 read / 5 write / 3 discovery, with input/output schema + sample call | Tool inventory readers can search |
| §5 MCP server | `mcp/resources.mdx` | 4 resource URIs (devnet/programs JSON, docs corpus mirror, pay-sh-demo files, attestor-demo files), path-traversal-safe semantics | LLM clients enumerate resources; docs explain what's there |
| §5 MCP server | `mcp/prompts.mdx` | 3 guided prompts: `agenttrust_audit_payment`, `agenttrust_setup_agent`, `agenttrust_explain_failure` | Prompt-aware MCP clients use these |
| §5 MCP server | `mcp/hosted-endpoint.mdx` | The HTTP transport at `mcp.agenttrust.tech`, session semantics, healthz schema, retry/idempotency, why singleton | A reader who already has an MCP HTTP-capable client wants this without reading the README |
| §6 Integration guides | `integration-guides/dexter-adapter.mdx` | Status: in-flight stub. Worked example for proving adapter portability. Pseudocode for the 5 methods | Currently the docs say "in flight" but never explain what the worked example will look like |
| §7 Verification | `verification/index.mdx` | Section landing — links to live-evidence + each per-claim page | First page below the section header |
| §7 Verification | `verification/live-evidence.mdx` | **First entry under §7.** Single consolidated page: 6 Kani proofs + 635 sub-checks, the 4-sig chained-validation trace, the Pay.sh atomic-settlement trace, the FeedbackEmissionLog PDA, the 10 capability namespaces, the daily devnet-smoke workflow, every claim with an Explorer URL | The "verifiable today" page the README implies but the docs site lacks |
| §7 Verification | `verification/kani-proofs.mdx` | Per-harness deep-dive: file path, sub-check count, time, what it proves, what it doesn't | Move-and-rewrite from `reference/formal-verification.mdx` |
| §7 Verification | `verification/devnet-smoke.mdx` | The Pay.sh + AgentTrust atomic-settlement trace, with reproduction command | Pulled out of the README into a docs page |
| §7 Verification | `verification/chained-validation.mdx` | The 4-sig RequireValidation → respond → Allow trace, with reproduction command | Mirrors `examples/attestor-demo/README.md` |
| §7 Verification | `verification/atomic-tx-invariant.mdx` | The Token-2022 + TransferHook footgun proof, three layers (compile + runtime + composer + localnet) | Move-and-rewrite from `sdk/atomic-tx-invariant.mdx` |
| §7 Verification | `verification/adversarial-harness.mdx` | The 14 hostile-scenario assertions in `tests/adversarial.spec.ts` | Currently zero docs coverage |
| §8 Reference | `reference/deny-reason-codes.mdx` | All 15 DenyReason codes, their meaning, the per-policy origin | Returning developer surfacing a `reasonCode: 6` → wants to know it's `CounterpartyTierBelowMin` |
| §8 Reference | `reference/capability-namespaces.mdx` | Auto-generated table from `examples/attestor-demo/devnet-namespaces.json` (script in `docs-site/scripts/build-namespaces-table.mjs` runs at lint time) | The seeded list lookup, kept in sync with the JSON authoritatively |

**Total new pages:** 17.

## Pages retired or merged

None retired outright. Three moves (rewrite-on-move):

| Old path | New path | Reason |
|----------|----------|--------|
| `getting-started/architecture-overview.mdx` | `architecture.mdx` | Architecture is a top-level concern, not a sub-step of getting started |
| `sdk/atomic-tx-invariant.mdx` | `verification/atomic-tx-invariant.mdx` | The invariant is a verification claim with multi-layer proofs; SDK page cross-links to it |
| `reference/formal-verification.mdx` | `verification/kani-proofs.mdx` | Kani is verification, not constants reference |

## Proposed top-level `meta.json`

```json
{
  "title": "AgentTrust",
  "pages": [
    "index",
    "getting-started",
    "architecture",
    "programs",
    "sdk",
    "mcp",
    "integration-guides",
    "verification",
    "reference"
  ]
}
```

Per-section metas (full ordering shown):

`getting-started/meta.json`:
```json
{ "title": "Get started", "pages": ["quickstart"], "defaultOpen": true }
```
*(Architecture moves out — `getting-started` is just `quickstart` now. The index.mdx serves as the on-ramp paragraph.)*

`programs/meta.json`:
```json
{ "title": "Programs", "pages": ["policy-vault", "trustgate", "validation-registry"], "defaultOpen": true }
```

`programs/policy-vault/meta.json`:
```json
{
  "title": "PolicyVault",
  "pages": ["index", "composer", "kill-switch-policy", "spending-policy", "velocity-policy", "counterparty-tier-policy", "require-validation-policy"],
  "defaultOpen": true
}
```

`sdk/meta.json`:
```json
{ "title": "SDK", "pages": ["index", "gate-payment", "mount-trustgate", "exports-reference"], "defaultOpen": true }
```

`mcp/meta.json` (new):
```json
{
  "title": "MCP server",
  "pages": ["index", "install", "tools", "resources", "prompts", "hosted-endpoint"],
  "defaultOpen": true
}
```

`integration-guides/meta.json`:
```json
{
  "title": "Integration guides",
  "pages": ["pay-sh-adapter", "dexter-adapter", "x402-facilitator", "facilitator-adapters", "capability-namespaces", "custom-attestor"],
  "defaultOpen": true
}
```

`verification/meta.json` (new):
```json
{
  "title": "Verification",
  "pages": ["index", "live-evidence", "kani-proofs", "devnet-smoke", "chained-validation", "atomic-tx-invariant", "adversarial-harness"],
  "defaultOpen": true
}
```

`reference/meta.json`:
```json
{
  "title": "Reference",
  "pages": [
    "devnet-program-ids",
    "mainnet-program-ids",
    "byte-offset-reference",
    "discriminator-constants",
    "deny-reason-codes",
    "capability-namespaces",
    "quantu-agent-registry",
    "changelog"
  ],
  "defaultOpen": false
}
```

## Cross-cutting craft items

### Aesthetic gaps vs Monad reference

- Inline code pills currently use the Fumadocs default; Monad treats them with `font-weight: 600`, `padding: 2px 8px`, `border-radius: 6px`, and a 50% opacity gray-100 background. Will mirror that exactly.
- TOC right-rail currently lacks the `border-left: 1px solid var(--border)` + `padding-left` accent; Monad uses a hairline accent bar that becomes electric purple on the active heading. Will extend.
- Sidebar links should be 14px / 20px line-height / 12px radius / 6px vertical padding; current site is close but not pinned. Will extend `--fd-` tokens.
- Code-block headers / language labels currently absent; Monad shows the language pill in the top-right corner with a copy button next to it. Will add via Fumadocs `<CodeBlock>` slot or a wrapper.
- Callouts / admonitions (info / warn / tip / caution) need icon + title row + tinted surface + thin border. Currently Fumadocs default; will style via `[data-callout]` selectors.
- Anchor links on headings (hover-revealed `#` icon, click-to-copy URL). Currently absent.
- 404 page is the Next.js default. Will write a custom 404 that suggests top-3 most-visited (homepage, quickstart, live-evidence) and matches the docs aesthetic.
- DocsFooter component exists at `docs-site/components/docs/DocsFooter.tsx` but isn't shown to be wired into every page consistently — will audit + re-wire.

### Code-sample audit

Every `\`\`\`{ts,bash,sh,json}` fenced block on every page checked for:

- Correct package name: `@agenttrust-sdk/trustgate@0.2.0`, `@agenttrust-sdk/mcp@0.2.6`. Zero references to the rejected `@agenttrust/mcp` scope.
- Correct hosted URL: `*.agenttrust.tech`, never `*.fly.dev` or `localhost:3402` in published docs.
- Correct devnet program IDs: PolicyVault `8Y6f…QTR`, TrustGate `HF8z…ih2N`, ValidationRegistry `Cx4R…Khtv`.
- Every Explorer URL resolves (HEAD 200).

The lint-time script `docs-site/scripts/audit-code-samples.mjs` enforces these; chunk-end sweeps re-run it.

### Search + cross-linking

- Fumadocs built-in search will be enabled site-wide (currently configured per page; one global config touches every section).
- Internal cross-links: every program page links to its SDK counterpart (`programs/policy-vault/spending-policy` ↔ `sdk/gate-payment`); every verification page back-links to the relevant program/SDK page; every integration guide cross-links to the byte-offset reference where it cites a parser.
- External cross-links surface npm + GitHub + Solana Explorer for every load-bearing claim.

### AI assistant widget (Ask AI)

- `docs-site/.env.local` has an `OPENAI_API_KEY` set (verified 2026-05-08). Phase P (`docs/proofs/phase-p-llm-routing.md`) reported a 429 quota-exceeded against this key on 2026-05-08; the widget itself ships and will be probed during chunk sweeps. If still 429, the report flags it as operator-fix territory (key rotation / quota increase) — UX of "widget loads, query returns a clear quota-exceeded message" is acceptable for hackathon submission as long as the failure mode is explicit, not silent.
- Widget files: `docs-site/components/ask-ai/{AskAIWidget.tsx, AskButton.tsx, ChatPanel.tsx, MessageList.tsx, SuggestionChip.tsx, AssistantSparkleIcon.tsx, events.ts, AskAI.module.css}`.

### Auto-generation discipline

Two tables are not hand-edited; they're built at lint time from authoritative sources:

| Output page | Source of truth | Build script |
|-------------|-----------------|--------------|
| `reference/capability-namespaces.mdx` | `examples/attestor-demo/devnet-namespaces.json` | `docs-site/scripts/build-namespaces-table.mjs` |
| `reference/changelog.mdx` | `mcp/CHANGELOG.md` + `trustgate/sdk/CHANGELOG.md` | `docs-site/scripts/build-changelog.mjs` |

Both scripts run as `prebuild` in `docs-site/package.json` so a stale source aborts the build instead of shipping drift.

## Iterate-until-green test loop (per chunk)

Every chunk (a section group, a meta restructure, a token tweak — chunks bounded at 90 minutes) ends with:

1. `pnpm --filter ./docs-site lint` (clean)
2. `pnpm --filter ./docs-site build` (clean)
3. Background `PORT=3001 pnpm --filter ./docs-site dev`
4. Headless Playwright sweep at 1440×900 (`chromium.launch({ headless: true })`):
   - every page in the new IA renders 200
   - every internal link resolves
   - every external link 2xx (Explorer, npm, GitHub, Fly endpoints)
   - every code block diffed against expected (package version / URL / hex)
   - zero console errors per page
   - typography, spacing, sidebar, TOC, callout, code-block, table — all primitives
5. Tablet (1024×768) + mobile (390×844) sweep — sidebar collapse, TOC drawer, hairlines, hover treatments
6. Dark-mode sweep — legibility, inline-code contrast WCAG AA, sidebar active state
7. AI widget probe — 3 sample queries, grounded-in-corpus check
8. Fix every red. Re-run from step 1. No chunk merges to branch until green.

Sweep harness lives at `docs-site/scripts/headless-sweep.mjs` (Playwright via npx — no new runtime deps in `docs-site/package.json`; the sweep installs Playwright on demand into `node_modules/.cache`).

## Execution order (chunks)

Chunk size is judgment-call but each chunk ends with a green sweep. Rough order:

1. **C1 — Foundation.** Branch, plan doc, npm package check (done); create new IA scaffolding (meta.json + empty-but-buildable MDX placeholders for new pages); build script for namespaces + changelog auto-gen; sweep.
2. **C2 — §1 Get started.** Rewrite `index.mdx` + `quickstart.mdx`. Drop localhost references. Sweep.
3. **C3 — §2 Architecture.** Single architecture page from old `getting-started/architecture-overview.mdx`. Refresh Kani 5→6, atomic-tx 3-layer story. Sweep.
4. **C4 — §3 Programs (policy-vault).** index + composer + 5 policy pages. Each with PDA seeds, byte offsets, instructions, deny-reason codes. Sweep.
5. **C5 — §3 Programs (trustgate + validation-registry).** Rewrite both to reference grade. Sweep.
6. **C6 — §4 SDK.** index + gatePayment + mountTrustGate + exports-reference. Sweep.
7. **C7 — §5 MCP server.** All 6 pages. Sweep.
8. **C8 — §6 Integration guides.** Pay.sh / Dexter (in-flight) / x402-facilitator (light) / facilitator-adapters (rewrite, drop broken scope) / capability-namespaces / custom-attestor. Sweep.
9. **C9 — §7 Verification.** index + live-evidence (FIRST) + 5 per-claim pages. Sweep.
10. **C10 — §8 Reference.** Light-edit existing 4 pages + new deny-reason-codes + auto-gen capability-namespaces + auto-gen changelog + rewrite discriminator-constants + rewrite quantu-agent-registry. Sweep.
11. **C11 — Polish.** global.css refinements (callout variants, hover, focus rings, anchor links, code-block treatments, sidebar scroll shadows, TOC active marker), 404 page, DocsFooter audit, search config. Sweep.
12. **C12 — Final headless sweep at all 3 breakpoints + dark mode + AI widget probe.** Lighthouse mobile + desktop. Banned-vocab grep across `docs-site/content/docs/**/*.mdx`.
13. **C13 — Final report + PR.** `docs/proofs/phase-r-docs-final.md`, open PR `docs/r-presentable-v1` → `main` with the report + preview deploy URL.

## Voice + scope discipline (active throughout)

- Founder-engineer voice. No "Welcome to AgentTrust!" hero copy.
- Banned vocabulary discipline per `CLAUDE.md`. Component names allowed in technical pages (we're inside docs); banned in pitch-shaped overview copy. Never "infrastructure", "primitive", "platform", "soulbound", "programmable", "dual-score", "sybil-resistant" in homepage / overview pages. Never name SAEP.
- Every claim cites a file path, tx signature, deployed program ID, or runnable command. No prose-only claims.
- All hosted URLs `*.agenttrust.tech`, never `*.fly.dev` or `localhost:3402`.
- No emojis. No Claude attribution. No `Co-Authored-By:` trailer. Terse imperative commits.
- Headless-only Playwright. No visible browser.

## Out of scope (won't touch)

- `web/` (website agent's branch `ui/r-presentable-v1`)
- `trustgate/`, `programs/`, `mcp/src/`, `examples/` source code — only cross-link
- `mcp/CHANGELOG.md` and `trustgate/sdk/CHANGELOG.md` — these are upstream sources of truth; the docs site builds against them
- CI workflows, runtime deps, framework choice, default Fumadocs theme structure
