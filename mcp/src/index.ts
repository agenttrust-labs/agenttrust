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
  MCP_TRANSPORT=http agenttrust-mcp    Start in HTTP mode on $MCP_HTTP_PORT (default 8765)

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
  KEYPAIR_B58              Base58 64-byte secret. One way to supply a signer.
  KEYPAIR_PATH             Path to a Solana CLI keypair JSON. Alt signer source.
                           (~/.config/solana/id.json is picked up automatically.)
  MCP_TRANSPORT            stdio (default) | http
  MCP_HTTP_PORT            8765 (default; Fly.io also injects PORT)
  MCP_HTTP_HOST            127.0.0.1 (default). Set 0.0.0.0 for hosted deploys.

DOCS
  Tools / resources / prompts: https://docs.agenttrust.tech/mcp
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
    const crypto = require("crypto");
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const pkg = require("../package.json");
    const startedAt = Date.now();

    // Phase N3 fix: one transport + one Server per Mcp-Session-Id.
    // Singleton transport (pre-N3) errored "Server already initialized"
    // on the second client and leaked per-session state across
    // concurrent clients. Each session now isolates its own server +
    // transport pair; cleaned up on session close or 30-min idle.
    interface Session {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      readonly server: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      readonly transport: any;
      lastTouched: number;
    }
    const sessions = new Map<string, Session>();
    const IDLE_MS  = 30 * 60 * 1_000;

    setInterval(() => {
      const now = Date.now();
      for (const [sid, s] of sessions) {
        if (now - s.lastTouched > IDLE_MS) {
          try { s.transport.close?.(); } catch { /* ignore */ }
          sessions.delete(sid);
        }
      }
    }, 5 * 60 * 1_000).unref();

    async function makeSession(): Promise<Session> {
      const sessionServer = createMcpServer(cfg);
      const sessionTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator:   () => crypto.randomUUID(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onsessioninitialized: (sid: string) => {
          sessions.set(sid, { server: sessionServer, transport: sessionTransport, lastTouched: Date.now() });
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onsessionclosed: (sid: string) => { sessions.delete(sid); },
      });
      await sessionServer.connect(sessionTransport);
      return { server: sessionServer, transport: sessionTransport, lastTouched: Date.now() };
    }

    const httpServer = http.createServer(async (req: import("http").IncomingMessage, res: import("http").ServerResponse) => {
      // /healthz: lightweight Fly.io / status-page probe. NOT part
      // of MCP protocol — handled before the transport sees it.
      const url = (req.url ?? "").split("?")[0];
      if (req.method === "GET" && (url === "/healthz" || url === "/")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          ok:             true,
          service:        "agenttrust-mcp",
          version:        pkg.version,
          network:        cfg.network,
          rpcUrl:         cfg.rpcUrl,
          uptimeSeconds:  Math.round((Date.now() - startedAt) / 1000),
          activeSessions: sessions.size,
          // Tools count is the load-bearing surface signal — if
          // an upstream regression dropped a tool, the status page
          // would show the count drop. Pinned expected so monitors
          // can alert on mismatch without parsing JSON-RPC.
          toolCount:      18,
        }) + "\n");
        return;
      }

      // Resolve session: existing mcp-session-id wins; otherwise mint
      // a new one (the SDK will only accept the request if it's an
      // initialize call when no session exists).
      const sid = req.headers["mcp-session-id"];
      const sessionId = Array.isArray(sid) ? sid[0] : sid;
      let session: Session | undefined;
      if (sessionId && sessions.has(sessionId)) {
        session = sessions.get(sessionId);
        if (session) session.lastTouched = Date.now();
      } else {
        // No / unknown session id — start a fresh server+transport pair.
        // The transport's onsessioninitialized hook puts it into
        // `sessions` once the SDK assigns a session id. Pre-init
        // requests (initialize itself) reach handleRequest and the
        // transport routes them.
        try {
          session = await makeSession();
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("session create failed:", err);
          res.writeHead(500).end();
          return;
        }
      }

      try {
        await session!.transport.handleRequest(req, res);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("transport error:", err);
        if (!res.headersSent) res.writeHead(500).end();
      }
    });
    httpServer.listen(cfg.httpPort, cfg.httpHost, () => {
      // Banner prints http://localhost so a developer can click the link
      // even when bound to 127.0.0.1 or 0.0.0.0. The actual bind address
      // (cfg.httpHost) is appended for machine logs / ops debugging.
      // eslint-disable-next-line no-console
      console.error(
        `AgentTrust MCP server listening on http://localhost:${cfg.httpPort} ` +
        `(bind ${cfg.httpHost}:${cfg.httpPort})`,
      );
    });
    return;
  }

  // stdio (default) — single transport, single server.
  const server = createMcpServer(cfg);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Stay alive — stdio's stdin close terminates us cleanly via the SDK.
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("fatal:", err);
  process.exit(1);
});
