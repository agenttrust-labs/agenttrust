# Hosted surfaces + UI integration policy

Source of truth for the URL inventory of AgentTrust and the rules any agent
must follow when touching `web/` or `docs-site/` (or any other surface that
references those URLs).

Read this file before proposing UI work. Update it when a Roadmap surface
ships.

## Live (deployed)

| surface | URL | backing project |
|---|---|---|
| Landing | https://www.agenttrust.tech | Vercel: `agenttrust-web` |
| Docs | https://docs.agenttrust.tech | Vercel: `agenttrust-docs-site` |
| MCP HTTP endpoint | https://agenttrust-mcp.fly.dev (DNS alias `mcp.agenttrust.tech` pending) | Fly.io: `agenttrust-mcp` (sin region, shared-cpu-1x@256mb, min 1 machine) |
| Facilitator service | https://agenttrust-api.fly.dev (DNS alias `api.agenttrust.tech` pending) | Fly.io: `agenttrust-api` (sin region, shared-cpu-1x@256mb, min 1 machine, dedicated facilitator pubkey `7Pf3...ntyZ` funded with 0.5 SOL devnet) |
| Demo endpoint | https://agenttrust-demo.fly.dev (DNS alias `demo.agenttrust.tech` pending) | Fly.io: `agenttrust-demo` (sin region, shared-cpu-1x@256mb, min 1 machine, dedicated demo facilitator pubkey `CRXr...G2xj` funded with 0.5 SOL devnet, real-chain mode via createRealDemoApp) |
| Anchor programs (devnet) | n/a (on-chain) | `policy_vault` `8Y6f...QTR`, `trustgate` `HF8z...rih2N`, `validation_registry` `Cx4R...Khtv` — all IDLs published on devnet |
| SDK on npm | https://www.npmjs.com/package/@agenttrust-sdk/trustgate | published `0.1.0` (homepage field stale pre-rebrand; republish as 0.1.1 will fix) |
| Live devnet smoke traces | `docs/proofs/smoke-2026-05-06.md`, `docs/proofs/phase-f-verification-report.md` | real on-chain `emit_feedback` tx + `FeedbackEmissionLog` PDA + ValidationRegistry attestor lifecycle |
| 5 Kani proofs | `docs/proofs/README.md` | 377 sub-checks, 0 failures |

## Roadmap (not yet deployed — Phase H)

| surface | planned URL | what it is |
|---|---|---|
| MCP npm package | https://www.npmjs.com/package/@agenttrust/mcp | scoped public npm package — `npx @agenttrust/mcp` for stdio installs (Claude Desktop / Cursor). Tarball verified via dry-run; awaits operator publish. |
| Status page | https://status.agenttrust.tech | Next.js workspace at `status-page/` — server-rendered + client-refreshed every 30s, polls 6 surfaces. Builds clean locally; awaits operator `vercel --prod` from `status-page/`. |

When a Roadmap surface goes live, move it to the Live table + open a UI integration pass that surfaces it (hero CTA / Try-it button / integrations grid / status badge / quickstart command updates).

## Rules for any agent touching `web/` or `docs-site/`

1. **Audit current live state before proposing UI work.** `curl -sI` each Live URL above. Check Roadmap URLs too — if one resolves now, that unlocks UI integration opportunities. Never link to a URL that 404s.

2. **Every CTA must hit a working live surface.** No static placeholder content. No "coming soon" badges that never update. If a surface isn't deployed, mark as "Roadmap" with the eta from this doc — don't fake it.

3. **Every code sample in docs must run as-is against the LIVE hosted endpoint.** No `localhost:3402` references in published docs. If a sample needs a hosted URL that isn't deployed yet, gate the sample behind a "Roadmap" tag.

4. **Aesthetic locked**: Fraunces (editorial) + Geist (UI), cream/ink palette, electric purple `#6F4CFF` accent. Match Monad-level craft. Reference `docs-site/references/monad-docs/` (`NOTES.md` + `computed-style-notes.json` + 7 PNGs).

5. **Don't redesign components from scratch when extending CSS / theme tokens does the job.** Extension > rewrite.

6. **Branch + checks discipline**: never commit to or push to `main`. Create a feature branch (e.g., `ui/<short-task>`), commit periodically, run all relevant checks locally (`pnpm --filter ./web build`, `pnpm --filter ./docs-site build`, lint), open a PR when done, merge only after every CI workflow goes green. Direct pushes to `main` are a bug, not a shortcut.

7. **Commit hygiene**: terse imperative messages. No emojis. No Claude attribution. No `Co-Authored-By:` trailer.

8. **Content vs UI scope**: if a flaw needs a content/copy change to look right, flag it — don't rewrite copy yourself unless the task is explicitly content.

9. **When you spot a Roadmap surface gone live**, propose a discrete follow-up PR that integrates it across the UI (don't bundle into an unrelated PR). Examples of integration shapes:
   - **Hero CTA**: "Try the SDK" / "Connect via MCP" / "Hit the live demo" buttons
   - **Integrations grid**: tile per facilitator + per surface, status indicator (live / roadmap)
   - **Quickstart command**: `npx @agenttrust/mcp` once the package publishes
   - **Status badge**: footer/header pill linking to status page
   - **Code samples**: swap localhost references for hosted URLs

## Cross-tool durability

This file is the durable source of truth across Claude / Codex / any future
agent. CLAUDE.md is gitignored per repo discipline; this doc is tracked under
`docs/proofs/` (whitelisted in `.gitignore`). Any agent hitting this repo
fresh should read this file before touching UI surfaces.
