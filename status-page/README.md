# `agenttrust-status` — public status page

Single-page Next.js app that polls every AgentTrust hosted surface
and renders a green/red status table. **Live at
[`status.agenttrust.tech`](https://status.agenttrust.tech)**.

## Surfaces probed

| id | URL | health endpoint |
| --- | --- | --- |
| landing | https://www.agenttrust.tech | `GET /` |
| docs | https://docs.agenttrust.tech | `GET /` |
| mcp | https://mcp.agenttrust.tech | `GET /healthz` |
| api | https://api.agenttrust.tech | `GET /healthz` |
| demo | https://demo.agenttrust.tech | `GET /health` |
| sdk-npm | https://registry.npmjs.org/@agenttrust-sdk/trustgate | `GET /` (registry metadata) |
| mcp-npm | https://registry.npmjs.org/@agenttrust-sdk/mcp | `GET /` (registry metadata) |

Add a new surface in `lib/surfaces.ts`.

## Local dev

```bash
pnpm install
pnpm --filter ./status-page dev
# open http://localhost:3500
```

## Production deploy (operator)

```bash
cd status-page
vercel --prod
# then add status.agenttrust.tech as a custom domain in the Vercel
# dashboard and CNAME the registrar at it.
```

The page is fully server-rendered with `revalidate = 30`. No KV, no
cron — every visit re-probes the surfaces (cached at the edge for
30s). A lightweight client component reloads the page every 30s so
the table stays current without a manual refresh.
