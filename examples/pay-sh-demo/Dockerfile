# syntax=docker/dockerfile:1.7

# AgentTrust Pay.sh demo image — boots createRealDemoApp against
# devnet, processes /protected requests, settles payments via the
# bundled PaySh adapter + Quantu resolver.

# ---------------------------------------------------------------------------
# Stage 1 — build SDK + server + demo
# ---------------------------------------------------------------------------
FROM node:20-alpine AS build

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY trustgate/sdk/package.json         ./trustgate/sdk/
COPY trustgate/server/package.json      ./trustgate/server/
COPY examples/pay-sh-demo/package.json  ./examples/pay-sh-demo/

RUN pnpm install --frozen-lockfile \
    --filter ./trustgate/sdk... \
    --filter ./trustgate/server... \
    --filter ./examples/pay-sh-demo...

COPY trustgate/sdk            ./trustgate/sdk
COPY trustgate/server         ./trustgate/server
COPY examples/pay-sh-demo     ./examples/pay-sh-demo
# IDL bundle — anchor 0.31 cannot deserialise the on-chain IDL
# deployed by anchor CLI 1.0; the demo loads the build-time IDL
# snapshot via ./dist/idl/trustgate.json relative to its dist dir.
COPY mcp/src/idl              ./examples/pay-sh-demo/src/idl

RUN pnpm --filter ./trustgate/sdk    run build \
 && pnpm --filter ./trustgate/server run build \
 && pnpm --filter ./examples/pay-sh-demo run build \
 && cp -r ./examples/pay-sh-demo/src/idl ./examples/pay-sh-demo/dist/src/idl

# ---------------------------------------------------------------------------
# Stage 2 — runtime
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runtime

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY trustgate/sdk/package.json         ./trustgate/sdk/
COPY trustgate/server/package.json      ./trustgate/server/
COPY examples/pay-sh-demo/package.json  ./examples/pay-sh-demo/

RUN pnpm install --frozen-lockfile --prod \
    --filter ./trustgate/sdk... \
    --filter ./trustgate/server... \
    --filter ./examples/pay-sh-demo...

COPY --from=build /app/trustgate/sdk/dist        ./trustgate/sdk/dist
COPY --from=build /app/trustgate/server/dist     ./trustgate/server/dist
COPY --from=build /app/examples/pay-sh-demo/dist ./examples/pay-sh-demo/dist
# Counterparty map sits next to dist/ so the boot's resolveQuantu
# path-walk hits it first.
COPY examples/pay-sh-demo/devnet-counterparties.json ./examples/pay-sh-demo/devnet-counterparties.json

ENV NODE_ENV=production \
    PORT=8080

EXPOSE 8080

USER node

CMD ["node", "examples/pay-sh-demo/dist/src/index.js"]
