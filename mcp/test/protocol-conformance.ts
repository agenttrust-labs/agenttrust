/**
 * MCP stdio protocol conformance — runnable Node script (NOT a
 * Mocha test). Boots `dist/index.js` as a subprocess and drives
 * the JSON-RPC handshake by hand: no SDK Client, no in-memory
 * transport. This is the closest possible reproduction of how
 * Claude Desktop / Cursor / a generic MCP client would talk to us.
 *
 * The companion test in `integration.test.ts` exercises the same
 * surface via the SDK's in-memory transport — that catches handler
 * bugs but skips over the stdio framing layer (newline-delimited
 * JSON-RPC). Phase G2.10 elevates the framing-layer check to its
 * own pre-merge gate.
 *
 * Usage:
 *   pnpm --filter ./mcp run build
 *   pnpm --filter ./mcp exec ts-node test/protocol-conformance.ts
 *
 * Exit code: 0 on success, 1 on any assertion failure.
 */

import { spawn, ChildProcess } from "child_process";
import * as path from "path";

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id?:     number | string | null;
  result?: unknown;
  error?:  { code: number; message: string; data?: unknown };
}

const DIST_ENTRY = path.resolve(__dirname, "..", "dist", "index.js");

let nextId = 1;
function newId(): number { return nextId++; }

class StdioClient {
  private proc:    ChildProcess;
  private buffer:  string = "";
  private pending: Map<number | string, (msg: JsonRpcResponse) => void> = new Map();

  constructor() {
    this.proc = spawn("node", [DIST_ENTRY], {
      env: {
        ...process.env,
        // Use a throwaway RPC URL — no read tools that hit chain
        // are exercised here. The conformance check is wire-shape only.
        RPC_URL: "https://api.devnet.solana.com",
        NETWORK: "solana-devnet",
      },
      stdio: ["pipe", "pipe", "inherit"],
    });
    this.proc.stdout!.setEncoding("utf-8");
    this.proc.stdout!.on("data", (chunk: string) => this.onChunk(chunk));
    this.proc.on("exit", (code) => {
      if (code !== null && code !== 0) {
        // eslint-disable-next-line no-console
        console.error(`MCP server exited with code ${code}`);
      }
    });
  }

  private onChunk(chunk: string) {
    this.buffer += chunk;
    let nl: number;
    while ((nl = this.buffer.indexOf("\n")) !== -1) {
      const line = this.buffer.slice(0, nl);
      this.buffer = this.buffer.slice(nl + 1);
      if (!line.trim()) continue;
      let msg: JsonRpcResponse;
      try {
        msg = JSON.parse(line) as JsonRpcResponse;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Non-JSON line on stdout:", JSON.stringify(line));
        continue;
      }
      const id = msg.id;
      if (id === undefined || id === null) continue; // notification
      const cb = this.pending.get(id);
      if (cb) {
        this.pending.delete(id);
        cb(msg);
      }
    }
  }

  send(method: string, params: unknown, id?: number | string): Promise<JsonRpcResponse> {
    const realId = id ?? newId();
    const payload = JSON.stringify({ jsonrpc: "2.0", id: realId, method, params });
    return new Promise((resolve, reject) => {
      this.pending.set(realId, resolve);
      const timer = setTimeout(() => {
        this.pending.delete(realId);
        reject(new Error(`timeout waiting for ${method} response`));
      }, 8000);
      const write = this.proc.stdin!.write(payload + "\n");
      if (!write) reject(new Error(`stdin backpressure on ${method}`));
      // resolve clears the timer through Promise.race? Just clear it
      // when the response lands.
      const original = this.pending.get(realId)!;
      this.pending.set(realId, (msg) => {
        clearTimeout(timer);
        original(msg);
      });
    });
  }

  notify(method: string, params: unknown) {
    const payload = JSON.stringify({ jsonrpc: "2.0", method, params });
    this.proc.stdin!.write(payload + "\n");
  }

  close() {
    this.proc.stdin!.end();
    this.proc.kill();
  }
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

let failures = 0;
function check(label: string, ok: boolean, detail?: unknown) {
  if (ok) {
    // eslint-disable-next-line no-console
    console.log(`  ✓ ${label}`);
  } else {
    // eslint-disable-next-line no-console
    console.error(`  ✗ ${label}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`);
    failures++;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const client = new StdioClient();
  try {
    // 1. initialize round-trip
    const init = await client.send("initialize", {
      protocolVersion: "2024-11-05",
      capabilities:    {},
      clientInfo:      { name: "agenttrust-conformance", version: "0.0.0" },
    });
    check("initialize returns capabilities", !!init.result, init);
    client.notify("notifications/initialized", {});

    // 2. tools/list returns expected count + names
    const tools = await client.send("tools/list", {});
    const toolList = (tools.result as { tools?: Array<{ name: string }> })?.tools ?? [];
    check("tools/list returns 21 tools", toolList.length === 21, toolList.length);
    const expectedTools = [
      "agenttrust_get_policy",
      "agenttrust_simulate_payment",
      "agenttrust_explain_decision",
      "agenttrust_init_authority",
      "agenttrust_init_policy",
      "agenttrust_demo_state",
      "agenttrust_list_facilitators",
      "agenttrust_docs",
      "agenttrust_register_namespace",
      "agenttrust_register_attestor",
    ];
    for (const name of expectedTools) {
      check(`tools/list contains '${name}'`, toolList.some((t) => t.name === name));
    }

    // 3. resources/list returns programs manifest + docs corpus
    const resources = await client.send("resources/list", {});
    const resList = (resources.result as { resources?: Array<{ uri: string }> })?.resources ?? [];
    const programsResource = resList.some((r) => r.uri === "agenttrust://devnet/programs");
    check("resources/list includes agenttrust://devnet/programs", programsResource);
    const docsCount = resList.filter((r) => r.uri.startsWith("agenttrust://docs/")).length;
    check("resources/list includes >10 docs entries", docsCount > 10, docsCount);

    // 4. resources/read for the programs manifest
    const readPrograms = await client.send("resources/read", { uri: "agenttrust://devnet/programs" });
    const contents = (readPrograms.result as { contents?: Array<{ text: string }> })?.contents ?? [];
    check("resources/read returns one content", contents.length === 1);
    if (contents[0]?.text) {
      try {
        const parsed = JSON.parse(contents[0].text);
        check("programs manifest is JSON with 'network' field", parsed.network === "solana-devnet", parsed.network);
      } catch (e) {
        check("programs manifest parses as JSON", false, e);
      }
    }

    // 5. prompts/list returns 3 expected prompts
    const prompts = await client.send("prompts/list", {});
    const promptList = (prompts.result as { prompts?: Array<{ name: string }> })?.prompts ?? [];
    for (const name of ["agenttrust_audit_payment", "agenttrust_setup_agent", "agenttrust_explain_failure"]) {
      check(`prompts/list contains '${name}'`, promptList.some((p) => p.name === name));
    }

    // 6. prompts/get on audit_payment
    const promptGet = await client.send("prompts/get", {
      name:      "agenttrust_audit_payment",
      arguments: {
        payer_agent: "11111111111111111111111111111111",
        payee_agent: "11111111111111111111111111111111",
        amount:      "1000",
        mint:        "11111111111111111111111111111111",
        policy_id:   "1",
      },
    });
    const messages = (promptGet.result as { messages?: Array<{ role: string }> })?.messages ?? [];
    check("prompts/get returns >=1 user message", messages.length >= 1 && messages[0].role === "user");

    // 7. Invalid method returns proper JSON-RPC error envelope
    const bogus = await client.send("does_not_exist/foo", {});
    check("invalid method returns JSON-RPC error envelope", !!bogus.error, bogus);
    if (bogus.error) {
      // Method-not-found = -32601 per JSON-RPC spec.
      check("invalid-method error.code === -32601", bogus.error.code === -32601, bogus.error.code);
    }

    // 8. Path-traversal URI on resources/read returns null content
    const traversal = await client.send("resources/read", {
      uri: "agenttrust://docs/../../../etc/passwd",
    });
    // SDK may return either an error or a "Resource not found" result
    // depending on internal validation order. Accept either.
    const traversalRejected = !!traversal.error
      || !(traversal.result as { contents?: unknown[] })?.contents?.length;
    check("path traversal URI rejected (error OR empty contents)", traversalRejected, traversal);

    // 9. Discovery tool — explain_decision is deterministic + offline.
    const explain = await client.send("tools/call", {
      name:      "agenttrust_explain_decision",
      arguments: { reason_code: 6 },
    });
    const callContents = (explain.result as { content?: Array<{ text: string }> })?.content ?? [];
    if (callContents[0]?.text) {
      try {
        const parsed = JSON.parse(callContents[0].text);
        check("explain_decision(6) → CounterpartyTierBelowMin",
          parsed.reasonName === "CounterpartyTierBelowMin", parsed);
      } catch (e) {
        check("explain_decision content parses as JSON", false, e);
      }
    } else {
      check("explain_decision returns content", false, explain);
    }
  } finally {
    client.close();
  }

  if (failures > 0) {
    // eslint-disable-next-line no-console
    console.error(`\n${failures} conformance check(s) failed.`);
    process.exit(1);
  } else {
    // eslint-disable-next-line no-console
    console.log("\nAll MCP stdio conformance checks passed.");
    process.exit(0);
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("fatal:", e);
  process.exit(1);
});
