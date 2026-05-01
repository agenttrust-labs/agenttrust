# AgentTrust — Solana Frontier 2026 Submission

Solo build by Mohit. Thesis locked 2026-04-28; build phase 2026-04-29 → 2026-05-11. Three Anchor programs that complete the third leg of Solana's ERC-8004 trust stack.

## Locked artifacts (read these first; never re-litigate)

- `plan/final_idea/THESIS_LOCK.md` — the founder-voice thesis lock (Variant B pitch, judge-engagement targets, risk register)
- `plan/final_idea/v1_scope.md` — frozen Option 1 scope (PolicyVault + TrustGate + ValidationRegistry)
- `plan/final_idea/PITCH_FRAMES_LOCKED.md` — authoritative pitch variants A/B/C/D (treasury-bot/clone-of-real-protocol scenario)
- `plan/final_idea/changes/` — date-stamped scope refinements; latest first

## Component build playbooks (in `plan/research/`)

- `01-quantu-source-code-class.md` — byte-precise Quantu PDA layouts + CPI integration cookbook
- `02-anchor-token2022-cpi-class.md` — Anchor 1.0+ patterns + Token-2022 + cross-program PDA reads + CU envelopes
- `03-erc8004-validation-registry-archaeology.md` — ERC-8004 spec + archived ValidationRegistry reconstruction
- `04-policyvault-build-playbook.md` — 5 policy kinds + Kani harness + day-by-day implementation order
- `05-trustgate-x402-class.md` — x402 spec + facilitator playbook + drop-in TS module
- `06-validation-registry-class.md` — sybil-resistance v1 + 4 PDAs + 6 instructions
- `07-demo-scenarios-prewarm-class.md` — 3 demo scenarios + pre-warm script + tier-vesting math
- `08-facilitator-outreach-class.md` — per-facilitator x-recon dossiers + DM cadence
- `09-grants-class.md` — ranked grant pipeline
- `10-production-amplification-class.md` — pitch video / deck / Twitter strategy
- `00-synthesis.md` — GO verdict + Day-5 master action plan

## Available toolchain (verified 2026-04-29)

**Solana / Anchor / Rust:**
- `solana` 3.1.14 (Agave client), default cluster: devnet
- `anchor` 1.0.1 (via avm)
- `cargo-kani` 0.67.0 (formal verification — for the 5 PolicyVault invariants)
- `cargo` 1.95.0 (Rust)

**Mainnet program IDs (Quantu, MIT-licensed primitives we read):**
- agent-registry-8004: `8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ`
- atom-engine: `AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb`

**Claude Code MCPs (3 useful, all connected):** playwright, memory, sequential-thinking
- `memory` is the high-value one: knowledge graph that persists PDA byte offsets, mainnet IDs, and decisions across sessions
- `sequential-thinking` for complex multi-step reasoning (gate_payment composer logic, Kani invariant design)
- `playwright` for browser automation when needed (Twitter posting, facilitator dashboard testing)

**Codex MCPs (3 same, configured in `~/.codex/config.toml`):** playwright, memory, sequential_thinking

**GitHub workflow:** use `gh` CLI directly (already installed v2.91.0, authenticated as `mohit-scaler`). NOT a GitHub MCP — `gh` covers all PR/issue/release/search use cases more cleanly. If you create the AgentTrust repo under a different account (e.g., `mohit-1710`), run `gh auth switch` or `gh auth login` for that account.

**Skills (33 in `~/.claude/skills/` and `~/.codex/skills/`):** apply-grant, brand-design, build-data-pipeline, build-defi-protocol, build-mobile, build-with-claude, colosseum-copilot, competitive-landscape, create-pitch-deck, cso, data, debug-program, defillama-research, deploy-to-mainnet, design-taste, find-next-crypto-idea, frontend-design-guidelines, launch-token, learn, marketing-video, navigate-skills, number-formatting, page-load-animations, product-review, review-and-iterate, roast-my-product, scaffold-project, solana-beginner, submit-to-hackathon, validate-idea, video-craft, virtual-solana-incubator. Routing logic in `~/.claude/skills/SKILL_ROUTER.md`.

**Native tools (not MCPs):**
- Claude Code: `WebFetch` (LLM-summarized URL fetch), `WebSearch`, `Read`/`Write`/`Edit`, `Bash`, `Grep`, `Glob`
- Codex: equivalent native tools including web browsing in latest versions

## Banned vocabulary (in pitch surfaces)

`soulbound`, `primitive`, `infrastructure`, `platform`, `Token-2022`, `programmable`, `dual-score`, `sybil-resistant`, `PolicyVault`/`TrustGate`/`ValidationRegistry` (component names — banned in pitch openers, OK in technical sections). NEVER name SAEP. Foundation-alignment language carries the differentiation.

Exception: Q&A sections, technical docs, and architecture docs allow technical vocabulary including these terms.

## Discipline files (read before starting any new work)

- `plan/other_tasks/grants/GRANT_APPLICATION_DISCIPLINE.md` — 11 rules for grant applications, lessons from Superteam Earn
- Memory file: `~/.claude/projects/-Users-mohit-superdev-frontier-solana-hackathon/memory/MEMORY.md` (auto-loaded)

## Day-by-day build calendar (mapped to Frontier 2026)

| Day | Date | Primary deliverable |
|-----|------|---------------------|
| 5 | Apr 29 | Anchor scaffold, PolicyAccount schema, 3 facilitator DMs sent, 5 demo agents pre-warmed on Quantu mainnet |
| 6 | Apr 30 | PolicyVault Spending policy kind + tests |
| 7 | May 1 | PolicyVault CounterpartyTier (THE wedge) + devnet integration test |
| 8 | May 2 | PolicyVault Velocity + KillSwitch |
| 9 | May 3 | PolicyVault gate_payment composer + first Kani proof |
| 10 | May 4 | TrustGate Anchor program + TS service POST /verify |
| 11 | May 5 | TrustGate POST /settle + emit_feedback CPI + end-to-end test |
| 12 | May 6 | Demo dry-run #1 + ValidationRegistry stub PDA |
| 13 | May 7 | Pitch video script lock + tech demo recording |
| 14 | May 8 | Pitch video recording (friend directs) |
| 15 | May 9 | README + COMPLETING-THE-TRUST-STACK.md narrative + grant deliverables submitted |
| 16 | May 10 | Final integration test + mainnet deployment |
| 17 | May 11 | Frontier submission upload |

## Current submission status (post-2026-04-29 grant submission)

**APPROVED 2026-04-29:** Superteam Earn Agentic Engineering ($200 USDG) — same-day approval. Tranche 1 payment processes Monday 2026-05-04 noon UTC; subsequent tranches unlock on shipped-progress updates per milestones doc. Submission package at `/Users/mohit/agenttrust-grant/` (Drive). First external validator on AgentTrust — citable in Frontier README, pitch deck, and downstream grant applications.

Pending grants (per `plan/other_tasks/grants/`):
- Solana Foundation India ($10K) — file Day 6
- Helius Pro + Mert deck-review pipeline — sign up Day 5
- Solana Foundation Direct ($10K-$50K) — file Day 18 post-Frontier
- Frontier Public Goods + Standout — submit Day 16
- Colosseum Accelerator — auto-triggered by Frontier prize win
- a16z CSX (Fall 2026), CDP Builder Grants (Q3 2026) — watch
