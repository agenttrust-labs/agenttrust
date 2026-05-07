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
| MCP HTTP endpoint | https://mcp.agenttrust.tech (CNAME → `agenttrust-mcp.fly.dev`, Let's Encrypt cert issued) | Fly.io: `agenttrust-mcp` (sin region, shared-cpu-1x@256mb, 2 machines for HA) |
| Facilitator service | https://api.agenttrust.tech (CNAME → `agenttrust-api.fly.dev`, Let's Encrypt cert issued) | Fly.io: `agenttrust-api` (sin region, shared-cpu-1x@256mb, dedicated facilitator pubkey `7Pf3...ntyZ` funded with 0.5 SOL devnet) |
| Demo endpoint | https://demo.agenttrust.tech (CNAME → `agenttrust-demo.fly.dev`, Let's Encrypt cert issued) | Fly.io: `agenttrust-demo` (sin region, shared-cpu-1x@256mb, dedicated demo facilitator pubkey `CRXr...G2xj` funded with 0.5 SOL devnet, real-chain mode via createRealDemoApp) |
| Anchor programs (devnet) | n/a (on-chain) | `policy_vault` `8Y6f...QTR`, `trustgate` `HF8z...rih2N`, `validation_registry` `Cx4R...Khtv` — all IDLs published on devnet |
| SDK on npm | https://www.npmjs.com/package/@agenttrust-sdk/trustgate | published `0.1.0` (homepage field stale pre-rebrand; republish as 0.1.1 will fix) |
| Live devnet smoke traces | `docs/proofs/smoke-2026-05-06.md`, `docs/proofs/phase-f-verification-report.md` | real on-chain `emit_feedback` tx + `FeedbackEmissionLog` PDA + ValidationRegistry attestor lifecycle |
| 5 Kani proofs | `docs/proofs/README.md` | 377 sub-checks, 0 failures |
| Capability namespaces (devnet) | `examples/attestor-demo/devnet-namespaces.json` (10 PDAs + tx sigs) | seeded canonical v1 namespace set; rerun `pnpm --filter ./examples/attestor-demo run seed:namespaces` is idempotent |

### Live capability namespaces (validation_registry, devnet)

10 canonical v1 namespaces seeded via `examples/attestor-demo/scripts/seed-namespaces.ts` and captured in `examples/attestor-demo/devnet-namespaces.json` (network: solana-devnet, program `Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv`):

| name | PDA |
|---|---|
| `kyc.tier-1.v1` | [`4ryEbb5iSiXHN2bJ59s9Pjdi2xxRkty1WohaRTqUt8wW`](https://explorer.solana.com/address/4ryEbb5iSiXHN2bJ59s9Pjdi2xxRkty1WohaRTqUt8wW?cluster=devnet) |
| `kyc.tier-2.v1` | [`HdAABUX5ojFZXocxSbTwvdNLXHGLaHnqCrKSKpeKXGCv`](https://explorer.solana.com/address/HdAABUX5ojFZXocxSbTwvdNLXHGLaHnqCrKSKpeKXGCv?cluster=devnet) |
| `kyc.tier-3.v1` | [`6gjTXCJE4qWybYGjTAg5ckYWBgBtt4ebvr39uU5YK5xL`](https://explorer.solana.com/address/6gjTXCJE4qWybYGjTAg5ckYWBgBtt4ebvr39uU5YK5xL?cluster=devnet) |
| `audit.smart-contract.v1` | [`HygALr1ZSqrYZTLBQUQ97vMSzAiuZRpKYovRhfyGtKkF`](https://explorer.solana.com/address/HygALr1ZSqrYZTLBQUQ97vMSzAiuZRpKYovRhfyGtKkF?cluster=devnet) |
| `audit.attestor-firm.v1` | [`A5rrMRYxezaNUnSgqyyNjJUqHf4TH7GKNsvUifWjUESi`](https://explorer.solana.com/address/A5rrMRYxezaNUnSgqyyNjJUqHf4TH7GKNsvUifWjUESi?cluster=devnet) |
| `model-card.v1` | [`DZ7eneZtKsN39q771ruHvBXoTUDRzxKqDipTLbeRGa4o`](https://explorer.solana.com/address/DZ7eneZtKsN39q771ruHvBXoTUDRzxKqDipTLbeRGa4o?cluster=devnet) |
| `jurisdiction.v1` | [`Cd4sp8isN3CF8KiRchDNoMhsVERSpswEnufvBR21Jrnu`](https://explorer.solana.com/address/Cd4sp8isN3CF8KiRchDNoMhsVERSpswEnufvBR21Jrnu?cluster=devnet) |
| `compliance.payments.v1` | [`Cn54CpSdfrME7epZ2VTSwhuTbcwH3ZttpcwjZADc5yrZ`](https://explorer.solana.com/address/Cn54CpSdfrME7epZ2VTSwhuTbcwH3ZttpcwjZADc5yrZ?cluster=devnet) |
| `agent-source.v1` | [`DqSwaqENQhjPUajxfmzsjTcfTcnNXtNN22f3kYyAHvSJ`](https://explorer.solana.com/address/DqSwaqENQhjPUajxfmzsjTcfTcnNXtNN22f3kYyAHvSJ?cluster=devnet) |
| `usdc-payment-policy.v1` | [`34gonn86FjxzXZMGd43RSvQVyH1r6PrGV9xnHXjjkEwR`](https://explorer.solana.com/address/34gonn86FjxzXZMGd43RSvQVyH1r6PrGV9xnHXjjkEwR?cluster=devnet) |

Names are bounded by `MAX_NAME_LEN=32` in `programs/validation-registry/src/instructions/register_namespace.rs`; the playbook-level descriptive labels in `docs/plan/research/06-validation-registry-class.md` §C.2 (e.g., `kyc.tier-1.v1.identity-verified`) decompose to these on-chain category names plus the JSON description field. PDA seeds: `[b"namespace", capability_hash]` where `capability_hash = SHA256(name)`.

## Roadmap (not yet deployed — Phase H)

| surface | planned URL | what it is |
|---|---|---|
| MCP npm package | https://www.npmjs.com/package/@agenttrust-sdk/mcp | scoped public npm package — `npx @agenttrust-sdk/mcp` for stdio installs (Claude Desktop / Cursor). Tarball verified via dry-run; awaits operator publish. |
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
   - **Quickstart command**: `npx @agenttrust-sdk/mcp` once the package publishes
   - **Status badge**: footer/header pill linking to status page
   - **Code samples**: swap localhost references for hosted URLs

## Cross-tool durability

This file is the durable source of truth across Claude / Codex / any future
agent. CLAUDE.md is gitignored per repo discipline; this doc is tracked under
`docs/proofs/` (whitelisted in `.gitignore`). Any agent hitting this repo
fresh should read this file before touching UI surfaces.
