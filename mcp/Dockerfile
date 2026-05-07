# syntax=docker/dockerfile:1.7

# AgentTrust MCP HTTP transport image.
#
# Multistage build: stage 1 installs ALL workspace deps + builds the
# SDK + builds the MCP server. Stage 2 ships only the dist artefacts
# + production node_modules — final image is ~150 MB on alpine.

# ---------------------------------------------------------------------------
# Stage 1 — build
# ---------------------------------------------------------------------------
FROM node:20-alpine AS build

# pnpm via corepack (bundled with Node 20).
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# Copy the workspace manifests first so Docker can cache the install
# layer when only source files change.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY trustgate/sdk/package.json ./trustgate/sdk/
COPY mcp/package.json           ./mcp/

# Install everything the SDK + MCP need. --frozen-lockfile guarantees
# the resolved versions match committed pnpm-lock.yaml.
RUN pnpm install --frozen-lockfile --filter ./trustgate/sdk... --filter ./mcp...

# Copy source.
COPY trustgate/sdk ./trustgate/sdk
COPY mcp           ./mcp

# Build SDK first (MCP imports its dist), then build MCP. The MCP
# build step also copies src/idl/*.json into dist/idl/.
RUN pnpm --filter ./trustgate/sdk run build \
 && pnpm --filter ./mcp           run build

# ---------------------------------------------------------------------------
# Stage 2 — runtime
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runtime

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# Just the things node needs at runtime: workspace manifests + the
# two built packages' dist + their node_modules. pnpm uses
# --prod --frozen-lockfile so devDependencies (TS, mocha, ts-node)
# don't bloat the runtime image.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY trustgate/sdk/package.json ./trustgate/sdk/
COPY mcp/package.json           ./mcp/

# Reinstall production-only — much faster than a fresh resolve
# because the lockfile is fully resolved.
RUN pnpm install --frozen-lockfile --prod --filter ./trustgate/sdk... --filter ./mcp...

# Copy the built artefacts from the build stage.
COPY --from=build /app/trustgate/sdk/dist ./trustgate/sdk/dist
COPY --from=build /app/mcp/dist            ./mcp/dist

# Fly.io injects PORT (default 8080); MCP_TRANSPORT switches the
# server from stdio to HTTP. NETWORK + RPC_URL come from Fly secrets
# at deploy time so this image is reusable across mainnet later.
ENV NODE_ENV=production \
    MCP_TRANSPORT=http \
    MCP_HTTP_PORT=8080

EXPOSE 8080

# Run as the unprivileged `node` user that the base image ships with.
USER node

# `node mcp/dist/index.js` is what the package.json `bin` points at.
# A direct `node` invocation skips the corepack overhead at startup.
CMD ["node", "mcp/dist/index.js"]
