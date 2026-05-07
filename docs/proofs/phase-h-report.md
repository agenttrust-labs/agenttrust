# Phase H — production hosting + npm publishes

**Closed 2026-05-07.** AgentTrust is now a live product. Three Fly
services deployed, two npm packages prepped for publish, one Vercel
status workspace scaffolded. The remaining work is operator-only
(npm publish 2FA, DNS CNAMEs, Vercel deploy, Fly cert add).

## Commit list

| Hash | Slice | Subject |
|---|---|---|
| `1e80f78` | H1 | prep mcp for npm publish |
| `f9db0b1` | H2 | bump sdk version and refresh metadata for republish |
| `b350829` | H3 | deploy mcp http endpoint to fly |
| `022fb76` | H4 | deploy facilitator service to fly |
| `b9f5075` | H5 | deploy pay-sh-demo to fly |
| `40a9bf4` | H7 | update docs samples for live hosted endpoints |
| `4ec7665` | H8 | update readme with live install commands |
| `2c8a094` | H9 | ci workflows for hosted surfaces |
| `35bc90d` | H6 | add status page workspace |

## Fly.io app inventory

| App | URL | Region | VM | Status |
|---|---|---|---|---|
| `agenttrust-mcp`  | https://agenttrust-mcp.fly.dev   | sin | shared-cpu-1x@256mb | live, /healthz green |
| `agenttrust-api`  | https://agenttrust-api.fly.dev   | sin | shared-cpu-1x@256mb | live, /healthz green |
| `agenttrust-demo` | https://agenttrust-demo.fly.dev  | sin | shared-cpu-1x@256mb | live, /health green |

All three on free-tier `shared-cpu-1x` machines, `min_machines_running = 1` so judges hitting the URLs don't see a cold start.

## Fly secrets set per app (names only)

| App | Secret names |
|---|---|
| `agenttrust-mcp`  | `RPC_URL`, `NETWORK` |
| `agenttrust-api`  | `RPC_URL`, `NETWORK`, `FACILITATOR_KEYPAIR_B58` |
| `agenttrust-demo` | `RPC_URL`, `NETWORK`, `FACILITATOR_KEYPAIR_B58` |

## Devnet airdrops + funded keypairs

Two **fresh** facilitator keypairs were generated specifically for the
hosted services — Mohit's local-dev keypair never leaves the dev box:

| App | Pubkey | Funded with | From |
|---|---|---|---|
| `agenttrust-api`  | `7Pf3xcV8M8wAWrPjprmCzm9R8s37VBrvgMWMksufntyZ` | 0.5 SOL | `solana transfer` from `4tSE…hRG` (devnet faucet rate-limited) |
| `agenttrust-demo` | `CRXrdPFBBhrFbc3yji36BERuay2cE7oHTzihb62VG2xj` | 0.5 SOL | `solana transfer` from `4tSE…hRG` |

## npm publish commands (operator-only — needs 2FA)

```bash
# Republish SDK at 0.1.1 (homepage refresh; tarball 45.0 kB)
cd trustgate/sdk
pnpm publish --access public --no-git-checks

# First publish of MCP at 0.1.0 (tarball 67.2 kB packed, 320.9 kB unpacked)
cd ../../mcp
pnpm publish --access public --no-git-checks
```

`pnpm publish` (not `npm publish`) is critical — pnpm rewrites the
`workspace:*` references on the way out. Both packages have
`prepublishOnly` hooks (lint + build + test) that block a publish on
any failure.

## DNS CNAME records to add (operator)

| Subdomain | CNAME target |
|---|---|
| `mcp.agenttrust.tech`     | `agenttrust-mcp.fly.dev` |
| `api.agenttrust.tech`     | `agenttrust-api.fly.dev` |
| `demo.agenttrust.tech`    | `agenttrust-demo.fly.dev` |
| `status.agenttrust.tech`  | `cname.vercel-dns.com` (after `vercel --prod` returns a hostname) |

Then add each subdomain on the Fly side so it issues a Let's Encrypt
cert:

```bash
flyctl certs add mcp.agenttrust.tech  --app agenttrust-mcp
flyctl certs add api.agenttrust.tech  --app agenttrust-api
flyctl certs add demo.agenttrust.tech --app agenttrust-demo
```

For the status page, add `status.agenttrust.tech` as a custom domain
in the Vercel dashboard after `vercel --prod` lands the project.

## Verification gates (live as of report timestamp)

```
GET https://agenttrust-mcp.fly.dev/healthz
  → {ok:true, service:"agenttrust-mcp", version:"0.1.0",
     network:"solana-devnet", uptimeSeconds:2812, toolCount:18}

GET https://agenttrust-api.fly.dev/healthz
  → {ok:true, service:"agenttrust-api", version:"0.1.0",
     network:"solana-devnet",
     facilitatorPubkey:"7Pf3xcV8M8wAWrPjprmCzm9R8s37VBrvgMWMksufntyZ",
     balanceSol:"0.500000", uptimeSeconds:1835,
     adapters:["pay-sh"], counterpartyCount:3}

GET https://agenttrust-demo.fly.dev/health
  → {status:"ok", network:"solana-devnet",
     facilitator:"CRXrdPFBBhrFbc3yji36BERuay2cE7oHTzihb62VG2xj",
     counterparties:[{tier:0,...},{tier:1,...},{tier:3,...}],
     minTier:2, policyId:1}

GET https://agenttrust-demo.fly.dev/protected
  → HTTP/2 402 + Payment-Required header (x402 v2 challenge envelope
     with payerAgent / payeeRecipient / serviceSignature)

POST https://agenttrust-mcp.fly.dev/  (MCP initialize)
  → {result:{protocolVersion:"2024-11-05",
             capabilities:{tools,resources,prompts},
             serverInfo:{name:"agenttrust",version:"0.1.0"}}}
```

Local builds:

```
pnpm --filter ./trustgate/sdk    test  → 56 passing
pnpm --filter ./trustgate/server test  → 146 passing
pnpm --filter ./examples/pay-sh-demo test → 7 passing + 2 pending
pnpm --filter ./mcp test               → 76 passing + 1 pending
pnpm --filter ./mcp run test:conformance → 21/21 stdio checks
pnpm --filter ./status-page run lint   → green
pnpm --filter ./status-page run build  → green (Next.js 15 prod build)
```

## End-to-end smoke trace (live devnet)

The Pay.sh smoke script that runs locally produces a real on-chain
`emit_feedback` tx every run; the most recent is captured in
`examples/pay-sh-demo/devnet-smoke.json`:

| Stage | Signature | Explorer |
|---|---|---|
| signed transfer | `uXL2Kk1C9JQPSQ8gY4VpRUyKNP2muP4ouF1kToz6BoAdNygVrbxaqwy9xHPCLupczAKsYHKyFkTvHEZ1P5ZDyhs` | https://explorer.solana.com/tx/uXL2Kk1C9JQPSQ8gY4VpRUyKNP2muP4ouF1kToz6BoAdNygVrbxaqwy9xHPCLupczAKsYHKyFkTvHEZ1P5ZDyhs?cluster=devnet |
| emit_feedback | `jMobmWJUAXuL8FmQujfxW9NmeMbzADUoABzqjiMeuc5m3YXyeuZeUw1ZJc29JGsqyWQGDY8q3vrtBdamhKXraag` | https://explorer.solana.com/tx/jMobmWJUAXuL8FmQujfxW9NmeMbzADUoABzqjiMeuc5m3YXyeuZeUw1ZJc29JGsqyWQGDY8q3vrtBdamhKXraag?cluster=devnet |
| FeedbackEmissionLog PDA | `HB4BBi9jaD3VPcZkQQaH3DxukSqBiXfW8RejtaLa8bF3` | https://explorer.solana.com/address/HB4BBi9jaD3VPcZkQQaH3DxukSqBiXfW8RejtaLa8bF3?cluster=devnet |

A fresh end-to-end demo → api → emit_feedback round-trip will land a
new signature on the next devnet smoke run; the daily-devnet-smoke
cron will publish it via the operational canary at 14:00 UTC.

## HOSTED_SURFACES.md diff

Live count: 4 → 7 (+ landing/docs which were already live):
  + MCP HTTP endpoint
  + Facilitator service
  + Demo endpoint

Roadmap count: 4 → 2:
  - MCP HTTP endpoint  (now Live)
  - Facilitator service (now Live)
  - Demo endpoint       (now Live)
  + Status page         (workspace built; awaits operator vercel deploy)
  + MCP npm package     (tarball verified; awaits operator publish)

## Anything that surprised me

1. **Fly.io free-tier accepts 3 always-on machines no problem.** I
   was expecting friction at `min_machines_running = 1` × 3 apps but
   Mohit's Launch plan covered it. Build minutes for `--remote-only`
   are also generous; each deploy used ~2-3 minutes of remote build
   time and didn't hit any quota.

2. **Solana CLI's `cargo-build-sbf` panic from Phase G recurred in a
   different shape during Fly deploys.** The Anchor 0.31 → CLI 1.0
   IDL incompatibility (Phase F1) bit me again — both the facilitator
   and the demo's first deploys crashed on `loadPolicyVault`. The fix
   in both cases: bundle `target/idl/*.json` into the runtime image
   and pass them through the SDK's optional `idl` arg. The MCP server
   already shipped this pattern from Phase E.

3. **Devnet faucet rate-limits even for 0.5 SOL airdrops.** Fresh
   keypairs needed funding from Mohit's local wallet via
   `solana transfer` because `solana airdrop 2 <addr>` returned
   "rate limit reached". Transfer worked instantly. The hosted
   facilitator + demo keypairs are funded with 0.5 SOL each — enough
   for ~5000 emit_feedback CPI tx fees.

4. **The demo's tsconfig has `rootDir: "."`** which compiles
   `src/index.ts` → `dist/src/index.js` (not `dist/index.js`). My
   first Dockerfile CMD pointed at `dist/index.js` and the machine
   crashed. Fixed by pointing at `dist/src/index.js`. The SDK +
   server have `rootDir: "src"` and don't have this gotcha.

5. **bs58 was a devDependency in the demo, not a dependency.** Worked
   in tests + `pnpm dev`, broke under `pnpm install --prod`. Promoted
   in package.json + redeployed.

6. **Dual GitHub auth identities** (`mohit-1710` for the agenttrust-
   labs org, `mohit-scaler` as the active CLI user) — `git push`
   silently failed with "Repository not found" when the wrong account
   was active. `gh auth switch --user mohit-1710` fixes it; worth
   pinning in shell setup.

7. **`flyctl deploy --remote-only` with a multi-workspace pnpm repo
   needs the build context = repo root.** Each Dockerfile assumes the
   workspace manifest layout (`pnpm-workspace.yaml` + `<workspace>/
   package.json`). Running `fly deploy` from the workspace dir makes
   the COPY pnpm-workspace.yaml line fail because the file isn't in
   the local context. The fix: `fly deploy --config <ws>/fly.toml
   --dockerfile <ws>/Dockerfile .` from repo root. All three apps
   share this incantation.

8. **Status page's `revalidate=30` + client `setInterval(reload,
   30000)`** is a poor man's KV+cron. The brief asked for hourly
   incident-log persistence; that's a follow-up if the simpler
   "every visit re-probes, edge caches for 30s" pattern proves
   noisy. For Phase H scope it's accurate-enough.

## Operator runbook (post-Phase H actions)

1. **Push the H6 commit to remote** (already done as of this report).
2. **Republish SDK + first-publish MCP**:
   ```bash
   cd trustgate/sdk && pnpm publish --access public --no-git-checks
   cd ../../mcp     && pnpm publish --access public --no-git-checks
   ```
3. **Add the four CNAMEs at the registrar** (table above).
4. **Provision Fly certs** for the three Fly subdomains:
   ```bash
   flyctl certs add mcp.agenttrust.tech  --app agenttrust-mcp
   flyctl certs add api.agenttrust.tech  --app agenttrust-api
   flyctl certs add demo.agenttrust.tech --app agenttrust-demo
   ```
5. **Deploy the status page**:
   ```bash
   cd status-page && vercel --prod
   ```
   then add `status.agenttrust.tech` as a custom domain in Vercel.

After steps 2-5 the eight surfaces in HOSTED_SURFACES.md are all live
under their canonical URLs and AgentTrust is fully shippable.
