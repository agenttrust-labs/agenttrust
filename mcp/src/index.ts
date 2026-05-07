#!/usr/bin/env node
/**
 * AgentTrust MCP server entry point. Selects transport from env:
 *   - stdio (default; used by Claude Desktop, Cursor, generic MCP clients)
 *   - http  (used for hosted deployments — Vercel, Fly, etc.)
 *
 * To use as an installed binary the package.json `bin` field exposes
 * `agenttrust-mcp` → this file.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadConfig } from "./config";
import { createMcpServer } from "./server";

const HELP_TEXT = `agenttrust-mcp — Model Context Protocol server for AgentTrust

USAGE
  agenttrust-mcp                       Start in stdio mode (Claude Desktop / Cursor)
  MCP_TRANSPORT=http agenttrust-mcp    Start in HTTP mode on \$MCP_HTTP_PORT (default 8080)

INSTALL — Claude Desktop
  Add to ~/Library/Application Support/Claude/claude_desktop_config.json:
    "mcpServers": {
      "agenttrust": {
        "command": "npx",
        "args":    ["-y", "@agenttrust-sdk/mcp"],
        "env":     { "RPC_URL": "https://api.devnet.solana.com",
                     "NETWORK": "solana-devnet" }
      }
    }

INSTALL — Cursor
  Same shape in ~/.cursor/mcp.json.

ENVIRONMENT
  RPC_URL                  Solana RPC endpoint (default: devnet)
  NETWORK                  solana-devnet | solana-mainnet
  KEYPAIR_B58              Base58 64-byte secret. Required for write tools.
  MCP_TRANSPORT            stdio (default) | http
  MCP_HTTP_PORT            8080 (default; Fly.io also injects PORT)

DOCS
  Tools / resources / prompts: https://agenttrust-labs.github.io/agenttrust/mcp
  Repo: https://github.com/agenttrust-labs/agenttrust
`;

async function main() {
  // --help / -h: print install instructions and exit. Some launchers
  // (npx, package managers) probe entry points with --help before
  // wiring up stdio transports.
  if (process.argv.slice(2).some((arg) => arg === "--help" || arg === "-h")) {
    process.stdout.write(HELP_TEXT);
    return;
  }
  // --version / -v: print package version and exit.
  if (process.argv.slice(2).some((arg) => arg === "--version" || arg === "-v")) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const pkg = require("../package.json");
    process.stdout.write(`${pkg.name} ${pkg.version}\n`);
    return;
  }

  const cfg = loadConfig();
  const server = createMcpServer(cfg);

  if (cfg.transport === "http") {
    // Lazy-import the streamable-HTTP transport so the stdio path
    // doesn't pay the cost of pulling Node's http module on cold start.
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { StreamableHTTPServerTransport } = require(
      "@modelcontextprotocol/sdk/server/streamableHttp.js",
    );
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const http = require("http");
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const pkg = require("../package.json");
    const startedAt = Date.now();

    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => Math.random().toString(36).slice(2) });
    await server.connect(transport);
    const httpServer = http.createServer((req: import("http").IncomingMessage, res: import("http").ServerResponse) => {
      // /healthz: lightweight Fly.io / status-page probe. NOT part
      // of MCP protocol — handled before the transport sees it.
      // Returns the same JSON shape as the facilitator + demo
      // surfaces so the status-page poller can treat them
      // uniformly (ok, network, version, uptimeSeconds).
      const path = (req.url ?? "").split("?")[0];
      if (req.method === "GET" && (path === "/healthz" || path === "/")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          ok:             true,
          service:        "agenttrust-mcp",
          version:        pkg.version,
          network:        cfg.network,
          rpcUrl:         cfg.rpcUrl,
          uptimeSeconds:  Math.round((Date.now() - startedAt) / 1000),
          // Tools count is the load-bearing surface signal — if
          // an upstream regression dropped a tool, the status
          // page would show the count drop.
          // The actual count lives in tools/list; we publish a
          // pinned expected count here so monitors can alert on
          // mismatch without parsing JSON-RPC.
          toolCount:      18,
        }) + "\n");
        return;
      }
      transport.handleRequest(req, res).catch((err: Error) => {
        // eslint-disable-next-line no-console
        console.error("transport error:", err);
        res.writeHead(500).end();
      });
    });
    httpServer.listen(cfg.httpPort, () => {
      // eslint-disable-next-line no-console
      console.error(`AgentTrust MCP server listening on http://0.0.0.0:${cfg.httpPort}`);
    });
    return;
  }

  // stdio (default)
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Stay alive — stdio's stdin close terminates us cleanly via the SDK.
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("fatal:", err);
  process.exit(1);
});
