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

async function main() {
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
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => Math.random().toString(36).slice(2) });
    await server.connect(transport);
    const httpServer = http.createServer((req: import("http").IncomingMessage, res: import("http").ServerResponse) => {
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
