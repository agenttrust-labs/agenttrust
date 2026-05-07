# syntax=docker/dockerfile:1.7

# AgentTrust facilitator service image — hosts /verify, /settle,
# /receipt, /dispute, /healthz against the deployed devnet programs.
#
# Bake the pre-warmed counterparty map into the image so the hosted
# Quantu resolver can serve the demo's 3 agents without an external
# config volume. Production integrators that want their own resolver
# fork the package and overlay their counterparties.json.

# ---------------------------------------------------------------------------
# Stage 1 — build SDK + server
# ---------------------------------------------------------------------------
FROM node:20-alpine AS build

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY trustgate/sdk/package.json    ./trustgate/sdk/
COPY trustgate/server/package.json ./trustgate/server/

RUN pnpm install --frozen-lockfile --filter ./trustgate/sdk... --filter ./trustgate/server...

COPY trustgate/sdk    ./trustgate/sdk
COPY trustgate/server ./trustgate/server

RUN pnpm --filter ./trustgate/sdk    run build \
 && pnpm --filter ./trustgate/server run build

# ---------------------------------------------------------------------------
# Stage 2 — runtime
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runtime

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY trustgate/sdk/package.json    ./trustgate/sdk/
COPY trustgate/server/package.json ./trustgate/server/

RUN pnpm install --frozen-lockfile --prod --filter ./trustgate/sdk... --filter ./trustgate/server...

COPY --from=build /app/trustgate/sdk/dist    ./trustgate/sdk/dist
COPY --from=build /app/trustgate/server/dist ./trustgate/server/dist

# Bundle the pre-warmed counterparty map. The production resolver
# walks the dist/../counterparties.json path first.
COPY examples/pay-sh-demo/devnet-counterparties.json ./trustgate/server/counterparties.json

ENV NODE_ENV=production \
    PORT=8080

EXPOSE 8080

USER node

CMD ["node", "trustgate/server/dist/production.js"]
