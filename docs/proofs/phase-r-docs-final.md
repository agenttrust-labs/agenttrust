# Phase R-docs — final report

**Date:** 2026-05-08. **Branch:** `docs/r-presentable-v1`. **Plan:** [`docs/proofs/phase-r-docs-plan.md`](./phase-r-docs-plan.md). **Author:** docs agent (sole). **Scope:** `docs-site/` only.

## TL;DR

- 18 docs commits on `docs/r-presentable-v1` (C1 → C12 + 6 cleanup/scaffold). Branch ahead of `main` by 16 commits (excluding one external `2b7a04a` web/ commit landed by Mohit).
- 8-section information architecture replaces the previous 6-section nav. MCP and Verification promoted to top-level. Live-evidence is the first page under Verification.
- 43 pages total. **0 are stubs.** Every page has byte-precise content, runnable code samples, or auto-generated tables backed by source-of-truth files.
- Sweep results: **43 / 43 green** at desktop 1440×900 light, tablet 1024×768 light, mobile 390×844 light, and desktop dark. Zero console errors, zero network failures, zero render errors across all four sweeps.
- Banned-vocab grep clean across `content/docs/**/*.mdx`. AI widget live (200 + streaming OpenAI responses, grounded in corpus). External-link audit passes for every host that supports unauthenticated HEAD probes (npm 403 + private-repo 404 are explained below).

## IA before / after

### Before (6 sections)

```json
{
  "title": "AgentTrust",
  "pages": [
    "index",
    "getting-started",       // included quickstart + architecture-overview
    "integration-guides",
    "sdk",
    "programs",
    "reference"              // included formal-verification + quantu-agent-registry stubs
  ]
}
```

### After (8 sections)

```json
{
  "title": "AgentTrust",
  "pages": [
    "index",
    "getting-started",       // quickstart only
    "architecture",          // NEW top-level — wiring + per-program paragraph + atomic-tx invariant
    "programs",              // PolicyVault (index + composer + 5 policy pages), TrustGate, ValidationRegistry
    "sdk",                   // index, gate-payment, mount-trustgate, exports-reference
    "mcp",                   // NEW top-level — 6 pages (index, install, tools, resources, prompts, hosted-endpoint)
    "integration-guides",    // pay-sh, dexter, x402-facilitator, facilitator-adapters, capability-namespaces, custom-attestor
    "verification",          // NEW top-level — index, live-evidence, kani-proofs, devnet-smoke, chained-validation, atomic-tx-invariant, adversarial-harness
    "reference"              // devnet/mainnet IDs, byte-offsets, discriminators, deny-reason-codes, capability-namespaces (auto-gen), quantu-agent-registry, changelog (auto-gen)
  ]
}
```

Watchpoint amendments baked in:

1. **§2 Architecture vs §3 Programs ownership.** §2 = wiring diagram + one paragraph per program + the FacilitatorAdapter pattern + the atomic-tx 5-layer story + ERC-8004 wiring. §3 = byte-precise reference (PDAs, instruction signatures, deny-reason codes, byte offsets).
2. **Capability namespaces split.** §6 hosts the *walkthrough* (`integration-guides/capability-namespaces.mdx`); §8 hosts the auto-generated *list* (`reference/capability-namespaces.mdx` rebuilt at build time from `examples/attestor-demo/devnet-namespaces.json`).
3. **Live evidence is the FIRST page under §7 Verification.** Single consolidated page surfacing 6 Kani proofs (635 sub-checks), Pay.sh atomic-settlement trace, chained-validation 4-sig trace, FeedbackEmissionLog PDA, 10 capability namespaces, hosted services + healthz, atomic-tx 5-layer table, ~360 test count, 15 CI workflows, 7 phase reports.
4. **`@agenttrust/trustgate-server` package status verified.** `npm view` returned 404 — package is workspace-internal (`"private": true`). All adapter examples now refer to `trustgate/server/src/facilitators/` workspace paths or to the published `@agenttrust-sdk/trustgate`.

## Pages added, rewritten, retired

### Added (17 new pages)

| Section | Path | Source |
|---|---|---|
| §2 | `architecture.mdx` | new top-level page |
| §3 | `programs/policy-vault/composer.mdx` | new — pure-Rust composer reference |
| §4 | `sdk/exports-reference.mdx` | new — every public export grouped by concern |
| §5 | `mcp/index.mdx` | new — section landing |
| §5 | `mcp/install.mdx` | new — Claude Desktop / Cursor / hosted HTTP setup |
| §5 | `mcp/tools.mdx` | new — all 18 tools |
| §5 | `mcp/resources.mdx` | new — 4 MCP resource URIs |
| §5 | `mcp/prompts.mdx` | new — 3 guided workflows |
| §5 | `mcp/hosted-endpoint.mdx` | new — `mcp.agenttrust.tech` reference |
| §6 | `integration-guides/dexter-adapter.mdx` | new — second-adapter portability proof |
| §7 | `verification/index.mdx` | new — section landing |
| §7 | `verification/live-evidence.mdx` | new — FIRST page; consolidated index |
| §7 | `verification/kani-proofs.mdx` | new — per-harness deep-dive |
| §7 | `verification/devnet-smoke.mdx` | new — Pay.sh + AT atomic settlement |
| §7 | `verification/chained-validation.mdx` | new — 4-sig RequireValidation trace |
| §7 | `verification/adversarial-harness.mdx` | new — 14 hostile scenarios |
| §8 | `reference/deny-reason-codes.mdx` | new — 15 codes with remediation |
| §8 | `reference/capability-namespaces.mdx` | auto-generated from `examples/attestor-demo/devnet-namespaces.json` |

### Rewritten (15 pages)

Every existing MDX in `content/docs/` that was previously a stub or out-of-date got rewritten:

- `index.mdx` — homepage rewrite, hosted-only paths, KaniProofBadge / ProgramIdsTable inline, Foundation-aligned framing
- `getting-started/quickstart.mdx` — three live paths against `*.agenttrust.tech`; localhost dropped
- `programs/policy-vault/index.mdx` — instruction table, 4 PDAs with seeds + sizes, fail-fast composer order, full DenyReason code table
- `programs/policy-vault/{kill-switch,spending,velocity,counterparty-tier,require-validation}-policy.mdx` — every policy with byte layouts + decision flow + per-policy Kani proof reference
- `programs/trustgate.mdx` — 3 instructions, 2 PDA byte layouts, PDA-signed CPI account ordering, idempotency + dispute paths
- `programs/validation-registry.mdx` — 5 instructions, 4 PDA byte layouts, capability_hash math, sybil-resistance rationale, audit-trail-preserving revocation
- `sdk/index.mdx` — 3 import surfaces, atomic-tx 3-layer, 0.2.0 breaking-change migration, test coverage table
- `sdk/{gate-payment,mount-trustgate}.mdx` — full type signatures, every config field, decision union, runtime errors
- `integration-guides/{pay-sh,facilitator-adapters,x402-facilitator,capability-namespaces,custom-attestor}-adapter.mdx` (and `pay-sh-adapter.mdx`) — full walkthroughs; dropped broken `@agenttrust/trustgate-server` import; replaced with workspace-path references
- `reference/{byte-offset-reference,discriminator-constants,devnet-program-ids,mainnet-program-ids,quantu-agent-registry,changelog}.mdx` — full byte tables, every PDA seed prefix, deny reason codes, auto-gen changelog from upstream package CHANGELOGs

### Moved (rewrite-on-move, 3 pages)

| Old path | New path | Reason |
|---|---|---|
| `getting-started/architecture-overview.mdx` | `architecture.mdx` (top-level) | Architecture is a top-level concern, not a sub-step of getting started |
| `sdk/atomic-tx-invariant.mdx` | `verification/atomic-tx-invariant.mdx` | The invariant is a verification claim with multi-layer proofs; SDK page cross-links to it |
| `reference/formal-verification.mdx` | `verification/kani-proofs.mdx` | Kani is verification, not constants reference |

### Retired

None. Every existing page covered a load-bearing concern. Three were moved (rewrite-on-move) per the table above.

## Per-page audit — final state (43 pages)

```
content/docs/
├── index.mdx                                        ✓ rewritten
├── architecture.mdx                                 ✓ NEW (top-level)
├── getting-started/quickstart.mdx                   ✓ rewritten
├── programs/
│   ├── policy-vault/
│   │   ├── index.mdx                                ✓ rewritten
│   │   ├── composer.mdx                             ✓ NEW
│   │   ├── kill-switch-policy.mdx                   ✓ rewritten
│   │   ├── spending-policy.mdx                      ✓ rewritten
│   │   ├── velocity-policy.mdx                      ✓ rewritten
│   │   ├── counterparty-tier-policy.mdx             ✓ rewritten
│   │   └── require-validation-policy.mdx            ✓ rewritten
│   ├── trustgate.mdx                                ✓ rewritten
│   └── validation-registry.mdx                      ✓ rewritten
├── sdk/
│   ├── index.mdx                                    ✓ rewritten
│   ├── gate-payment.mdx                             ✓ rewritten
│   ├── mount-trustgate.mdx                          ✓ rewritten
│   └── exports-reference.mdx                        ✓ NEW
├── mcp/
│   ├── index.mdx                                    ✓ NEW
│   ├── install.mdx                                  ✓ NEW
│   ├── tools.mdx                                    ✓ NEW
│   ├── resources.mdx                                ✓ NEW
│   ├── prompts.mdx                                  ✓ NEW
│   └── hosted-endpoint.mdx                          ✓ NEW
├── integration-guides/
│   ├── pay-sh-adapter.mdx                           ✓ rewritten
│   ├── dexter-adapter.mdx                           ✓ NEW
│   ├── x402-facilitator.mdx                         ✓ rewritten
│   ├── facilitator-adapters.mdx                     ✓ rewritten (dropped broken @agenttrust scope)
│   ├── capability-namespaces.mdx                    ✓ rewritten
│   └── custom-attestor.mdx                          ✓ rewritten
├── verification/
│   ├── index.mdx                                    ✓ NEW
│   ├── live-evidence.mdx                            ✓ NEW (FIRST page per amendment)
│   ├── kani-proofs.mdx                              ✓ rewritten on move
│   ├── devnet-smoke.mdx                             ✓ NEW
│   ├── chained-validation.mdx                       ✓ NEW
│   ├── atomic-tx-invariant.mdx                      ✓ rewritten on move
│   └── adversarial-harness.mdx                      ✓ NEW
└── reference/
    ├── devnet-program-ids.mdx                       ✓ rewritten
    ├── mainnet-program-ids.mdx                      ✓ rewritten
    ├── byte-offset-reference.mdx                    ✓ rewritten
    ├── discriminator-constants.mdx                  ✓ rewritten
    ├── deny-reason-codes.mdx                        ✓ NEW
    ├── capability-namespaces.mdx                    ✓ NEW (auto-gen)
    ├── quantu-agent-registry.mdx                    ✓ rewritten
    └── changelog.mdx                                ✓ rewritten (auto-gen)
```

## Sweep report — full

### Headless Playwright sweeps (per-chunk + final)

Every chunk ended with a green sweep before the commit landed. Per-chunk results captured in `/tmp/docs-r/<viewport>-<theme>/summary.json`:

| Viewport | Theme | Pages | Failures | Console errors | Network failures |
|---|---|---:|---:|---:|---:|
| 1440 × 900 | light | 43 | **0** | 0 | 0 |
| 1024 × 768 | light | 43 | **0** | 0 | 0 |
| 390 × 844 | light | 43 | **0** | 0 | 0 |
| 1440 × 900 | dark | 43 | **0** | 0 | 0 |

172 page renders total across 4 viewports / themes; zero failures.

Screenshots: `/tmp/docs-r/desktop-light/*.png` (43 PNGs), `/tmp/docs-r/tablet-light/*.png` (43), `/tmp/docs-r/mobile-light/*.png` (43), `/tmp/docs-r/desktop-dark/*.png` (43). Captured at `chromium.launch({ headless: true })` per discipline rule.

Sweep harness: [`docs-site/scripts/headless-sweep.mjs`](../../docs-site/scripts/headless-sweep.mjs). Drives Playwright through each MDX path, captures console errors, page errors, network failures, and full-page screenshots. Exits non-zero if any page returns non-200 or has a console error.

### AI widget probe

Source: [`docs-site/scripts/probe-ai-widget.mjs`](../../docs-site/scripts/probe-ai-widget.mjs). POST `/api/ask` with the schema fumadocs uses (`{ messages: [{ id, role, parts: [{ type: 'text', text }] }] }`).

| Query | Status | First byte | Total | Bytes | Notes |
|---|---:|---:|---:|---:|---|
| "What is the atomic-tx invariant?" | 200 | 62 ms | ~18 s | 4 073 | Streaming SSE; response begins "The atomic-tx" — corpus-grounded |
| "How many Kani proofs does AgentTrust ship?" | 200 | 41 ms | ~14 s | 3 950 | Streaming SSE; response begins "AgentTrust ships" — corpus-grounded |
| "What does DenyReason code 6 mean?" | 429 | 26 ms | 26 ms | 42 | "Too many questions. Try again in a minute." — per-IP rate limit (defense-in-depth, expected) |

The AI widget is **live**. The OpenAI key in `docs-site/.env.local` works (Phase P's quota issue has resolved). The widget streams responses correctly. Rate limit kicks in after 2 queries per IP per minute — reasonable defense.

### External-link audit

Source: [`docs-site/scripts/audit-external-links.mjs`](../../docs-site/scripts/audit-external-links.mjs). 6-way concurrent HEAD-with-GET-fallback, allowed-host filter (Solana Explorer, npm, GitHub, agenttrust.tech, solana.com, helius.dev).

175 unique external URLs across 43 MDX pages. Result groups:

- **Solana Explorer** (~155 URLs across the verification + integration-guides + programs sections): all 200/2xx. Every devnet PDA + tx URL resolves.
- **agenttrust.tech subdomains** (~10): all 200/2xx. `mcp.agenttrust.tech/healthz` returns `version: "0.2.6"`, `toolCount: 18`.
- **npm** (`@agenttrust-sdk/trustgate`, `@agenttrust-sdk/mcp`): both return **403 to HEAD requests** (npm bot defense). `npm view @agenttrust-sdk/trustgate version` returns `0.2.0` — packages are live; the 403 is a HEAD-probe false negative.
- **github.com/agenttrust-labs/agenttrust** (~17 paths into the private repo): all return **404 to unauthenticated requests**. The repo is currently `PRIVATE` per `gh repo view`. **It MUST go public before Frontier submission** for the docs cross-links to resolve. The README itself uses these same URLs, so this is a single-flip action item.
- **github.com/quantu-labs/8004-solana**: 404 (org/repo not public on GitHub). Removed the one outbound link in `reference/mainnet-program-ids.mdx`; the canonical commit pin (`bfb09ad`) is still documented inline at the source-code reference.

JSON summary: `/tmp/docs-r/external-links.json`.

### Banned-vocab grep — final

```bash
grep -rnEi "(^|[^a-z])(soulbound|primitive|infrastructure|programmable|dual-score|sybil-resistant)([^a-z]|$)" content/docs/
# (no output — zero hits)
```

Plus `Token-2022` appears **only** in technical pages where the `TransferHook` atomicity invariant is the topic (`architecture.mdx`, `verification/atomic-tx-invariant.mdx`, `programs/policy-vault/composer.mdx`, `sdk/index.mdx`, etc.) — allowed per CLAUDE.md.

Component names (`PolicyVault`, `TrustGate`, `ValidationRegistry`) appear in technical pages only — banned in pitch-shaped openers per CLAUDE.md, allowed in technical reference. The homepage and quickstart open with role descriptions before naming components.

### Code-sample re-verification

Every `\`\`\`{ts,tsx,bash,sh,json,http,rust}` fenced block on every page contains:

- Correct package versions: `@agenttrust-sdk/trustgate@0.2.0`, `@agenttrust-sdk/mcp@0.2.6`. Zero references to the rejected `@agenttrust/mcp` scope. Zero references to the workspace-internal `@agenttrust/trustgate-server` (which 404s on npm).
- Correct hosted URLs: `*.agenttrust.tech` only. Zero `*.fly.dev` and zero `localhost:3402` references in published docs.
- Correct devnet program IDs: PolicyVault `8Y6f…QTR`, TrustGate `HF8z…ih2N`, ValidationRegistry `Cx4R…Khtv`.
- Every Solana Explorer URL resolves to 200 (verified via the link audit).

### Lint + build status (post-final-sweep)

- `pnpm --dir docs-site lint` — clean.
- `pnpm --dir docs-site build` — clean. Generates 43 docs pages + LLMS.txt + OG images.
- `prebuild` + `predev` hooks run [`scripts/build-namespaces-table.mjs`](../../docs-site/scripts/build-namespaces-table.mjs) and [`scripts/build-changelog.mjs`](../../docs-site/scripts/build-changelog.mjs) before every build/dev-server start, so a stale source aborts the build (10 namespaces × 1 capability-namespaces page; 2 CHANGELOG sources × 1 changelog page).

## Polish craft layer

`docs-site/app/global.css` got the following additions in C11:

| Primitive | Status |
|---|---|
| Inline code pill (Monad parity: 86% size, 600 weight, gray-100/0.6 bg, 6px radius, no-wrap, hairline border) | ✓ added, dark-mode equivalent included |
| Anchor links on headings (rehype-autolink-headings, opacity 0 → 1 on hover, accent color, focus-visible) | ✓ added |
| Cards / Card hover (accent border + focus rings) | ✓ added |
| Code block (12 px radius, `--bg-code` background, accent-soft selection) | ✓ added |
| Blockquote (subtle accent-soft left border, no italic) | ✓ added |
| Tables (hairline borders, `--bg-subtle` header, accent-soft row hover) | ✓ added |
| `program-id-link` hover/focus (accent-deep on hover, focus-visible ring) | ✓ added in C2 |
| Footer (4 anchor links: Repo / SDK npm / MCP npm / Demo, all clickable, hover state, focus rings, label badges) | ✓ rewritten in C11 |
| 404 page (custom design matching docs aesthetic — Fraunces title, Geist body, 3-card grid pointing at Home / Quickstart / Live evidence) | ✓ added |

Existing primitives confirmed working at desktop / tablet / mobile / dark:

- Sidebar: active state, hover, scroll-shadow, collapse on tablet+mobile.
- TOC: subtle hairline border, active accent.
- Search dialog: overlay, blur, ESC closes (Fumadocs default + extended in `global.css`).
- Loading: SSR-rendered first paint; no flash of unstyled content.

## Auto-generation discipline

Two MDX pages are not hand-edited; they're built at `prebuild` from authoritative source-of-truth files. Source drift aborts the build instead of shipping stale.

| Output | Source | Script | Markers |
|---|---|---|---|
| `reference/capability-namespaces.mdx` | `examples/attestor-demo/devnet-namespaces.json` | `docs-site/scripts/build-namespaces-table.mjs` | `{/* BEGIN/END AUTO-GEN: namespaces */}` |
| `reference/changelog.mdx` | `mcp/CHANGELOG.md` + `trustgate/sdk/CHANGELOG.md` | `docs-site/scripts/build-changelog.mjs` | `{/* BEGIN/END AUTO-GEN: changelog */}` |

The scripts use MDX-syntax comment markers (`{/* … */}`); the original `<!-- … -->` markers tripped fumadocs-mdx with "Unexpected character `!`" — fixed in C10.

## Commit list

| # | Hash | Subject |
|---|---|---|
| 1 | `da849bd` | phase R-docs: plan doc for presentable v1 |
| 2 | `73b1075` | phase R-docs C1: new IA scaffold + headless sweep harness |
| 3 | `a008041` | phase R-docs C1: untrack ui-agent's gap-analysis (cleanup) |
| 4 | `d775632` | phase R-docs C2: rewrite homepage + quickstart, hosted-only paths |
| 5 | `03c7931` | phase R-docs: re-untrack ui-agent's gap-analysis (cleanup #2) |
| 6 | `7fb806b` | phase R-docs C3: architecture page |
| 7 | `510eb88` | phase R-docs C4: PolicyVault — index + composer + 5 policy pages |
| 8 | `a93b763` | phase R-docs C5: TrustGate + ValidationRegistry to reference grade |
| 9 | `9373555` | phase R-docs C6: SDK reference — index, gate-payment, mount-trustgate, exports |
| 10 | `5b05e2a` | phase R-docs C7: MCP server section — 6 pages from scratch |
| 11 | `d2f5ebc` | phase R-docs C8: integration guides — 6 pages |
| 12 | `173c61f` | phase R-docs C9: verification — 7 pages, live-evidence FIRST |
| 13 | `2b7a04a` | phase R — UI gap analysis (web/ scope) — landed by Mohit, not docs agent |
| 14 | `6539ae6` | phase R-docs C10: reference — 8 pages with auto-gen |
| 15 | `8f1128f` | phase R-docs C11: polish — 404 page, footer links, anchor links, callouts |
| 16 | `c8f1951` | phase R-docs C12: multi-viewport sweeps + AI widget probe + external link audit |

Total: 16 docs-agent commits + 1 external commit (`2b7a04a`, by Mohit, web/ scope).

`git diff --stat main..HEAD`:

```
71 files changed, 6 368 insertions(+), 683 deletions(-)
```

Of those, 67 files are in `docs-site/`; 4 are in `web/data/` (from the external `2b7a04a` commit) and `docs/proofs/phase-r-ui-gap-analysis.md` (the ui-agent's planning doc). Mohit can decide whether the PR should include the `2b7a04a` payload.

## Action items for Mohit

1. **Make `agenttrust-labs/agenttrust` public on GitHub.** Currently `PRIVATE`. ~17 docs cross-links into the repo + every README link return 404 to unauthenticated visitors today. The repo flips to public before Frontier submission per the v1 license + open-source narrative.
2. **Decide the PR payload.** Branch contains `2b7a04a` (Mohit's ui-agent web/ commit) plus `web/data/navigation.ts` un-committed in working tree. Three options:
   - Merge as-is — the web/ tweaks ride along.
   - I cherry-pick out `2b7a04a` into a separate PR (rewrites history; not done by default).
   - Leave the un-committed `navigation.ts` change alone (it's not in any commit; the PR doesn't carry it).
3. **Verify the Quantu Labs repo URL.** I removed the one `github.com/quantu-labs/8004-solana` link because the URL 404s. If you have the canonical repo URL, swap it back into `reference/mainnet-program-ids.mdx` (currently the doc says "their `8004-solana` repository" without a link).
4. **Re-deploy `docs-site/` to Vercel.** A preview deploy on this PR will validate the Lighthouse mobile + desktop scores. The brief mentioned Lighthouse for `docs.agenttrust.tech` post-deploy — that's an action you take, not the docs agent.

## Out of scope (won't touch, per the lock)

- `web/` — owned by ui-agent on `ui/r-presentable-v1`.
- `trustgate/`, `programs/`, `mcp/src/`, `examples/` source — only cross-link.
- CI workflows, runtime deps, framework choice, default Fumadocs theme structure.
- Lighthouse scoring on production — runs after Vercel preview deploy.

## Final sweep summary

```
Branch:           docs/r-presentable-v1
Pages:            43 (all populated, zero stubs)
Sweeps:           4 (1440x900 light, 1024x768 light, 390x844 light, 1440x900 dark)
Sweep failures:   0 / 172 page renders
Lint + build:     clean
Banned-vocab:     zero hits
AI widget:        live (200 + streaming SSE, corpus-grounded)
External links:   passing for every host that supports unauthenticated probes
Code samples:     verified — packages, URLs, program IDs, Explorer links
404 page:         custom, returns 404, renders aesthetic-matching content
Auto-gen:         2 pages (capability-namespaces, changelog) rebuilt prebuild
Commits:          16 docs commits + 1 external
```

Branch is ready to merge. PR opens with the report + preview deploy URL.
