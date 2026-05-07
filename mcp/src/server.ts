/**
 * MCP server registration. Wires every tool / resource / prompt onto a
 * single `Server` instance and returns it so transports can connect.
 *
 * Tool dispatch flow:
 *   1. tools/list → ALL_TOOLS metadata
 *   2. tools/call → look up by name, parse input via Zod, run handler,
 *      wrap output as a single text content block (JSON-encoded).
 *
 * Resources are split into two URI schemes:
 *   - agenttrust://docs/<rel-path>     → MDX content
 *   - agenttrust://devnet/programs     → JSON program manifest
 *   - agenttrust://examples/<demo>/... → demo source files
 *
 * Prompts surface the three guided workflows from prompts/ALL_PROMPTS.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";

import { ChainClient } from "./chain";
import type { AgentTrustConfig } from "./config";
import { ALL_PROMPTS } from "./prompts";
import {
  describeProgramsResource,
  PROGRAMS_RESOURCE_URI,
  readProgramsResource,
} from "./resources/programs";
import {
  listDocsResources,
  listExampleResources,
  readDocsResource,
  readExampleResource,
} from "./resources/docs";
import { ALL_TOOLS } from "./tools";

// Read SERVER_VERSION from package.json so MCP clients see the same
// version that npm reports. Hardcoding drifted in 0.2.x (Phase M E2E
// found serverInfo.version=0.1.0 while package.json was 0.2.1).
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const PKG_VERSION = (require("../package.json") as { version: string }).version;
const SERVER_NAME    = "agenttrust";
const SERVER_VERSION = PKG_VERSION;

const SERVER_INSTRUCTIONS =
  "AgentTrust MCP server. Read tools work without auth (devnet by default). " +
  "Write tools require KEYPAIR_B58 in env. Resources expose the AgentTrust " +
  "docs corpus, deployed program manifest, and example demo source. Prompts " +
  "ship three guided workflows: audit_payment, setup_agent, explain_failure.";

export function createMcpServer(cfg: AgentTrustConfig): Server {
  const chain  = new ChainClient(cfg);
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: { tools: {}, resources: {}, prompts: {} },
      instructions: SERVER_INSTRUCTIONS,
    },
  );

  // ---- tools/list ---------------------------------------------------------
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: ALL_TOOLS.map((t) => ({
      name:        t.name,
      description: t.description,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inputSchema: zodToJsonSchema(t.inputSchema as any, { target: "openApi3" }) as Record<string, unknown>,
    })),
  }));

  // ---- tools/call ---------------------------------------------------------
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = ALL_TOOLS.find((t) => t.name === req.params.name);
    if (!tool) {
      return {
        isError: true,
        content: [{ type: "text", text: `unknown tool: ${req.params.name}` }],
      };
    }
    let parsed: unknown;
    try {
      parsed = tool.inputSchema.parse(req.params.arguments ?? {});
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `input validation failed: ${(err as Error).message}` }],
      };
    }
    try {
      const result = await tool.handler(parsed, { chain });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `tool error: ${(err as Error).message}` }],
      };
    }
  });

  // ---- resources/list ----------------------------------------------------
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      describeProgramsResource(),
      ...listDocsResources(),
      ...listExampleResources(),
    ],
  }));

  // ---- resources/read ----------------------------------------------------
  server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
    const uri = req.params.uri;
    if (uri === PROGRAMS_RESOURCE_URI) {
      const r = readProgramsResource(cfg);
      return { contents: [r] };
    }
    const docs = readDocsResource(uri);
    if (docs) return { contents: [docs] };
    const ex = readExampleResource(uri);
    if (ex) return { contents: [ex] };
    throw new Error(`unknown resource URI: ${uri}`);
  });

  // ---- prompts/list ------------------------------------------------------
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: ALL_PROMPTS.map((p) => ({
      name:        p.name,
      description: p.description,
      arguments:   p.arguments.map((a) => ({
        name:        a.name,
        description: a.description,
        required:    a.required,
      })),
    })),
  }));

  // ---- prompts/get -------------------------------------------------------
  server.setRequestHandler(GetPromptRequestSchema, async (req) => {
    const prompt = ALL_PROMPTS.find((p) => p.name === req.params.name);
    if (!prompt) throw new Error(`unknown prompt: ${req.params.name}`);
    const argMap = (req.params.arguments ?? {}) as Record<string, string>;
    // Required-arg guard so prompt build() can stay declarative.
    for (const a of prompt.arguments) {
      if (a.required && !argMap[a.name]) {
        throw new Error(`prompt ${prompt.name} missing required argument: ${a.name}`);
      }
    }
    const messages = prompt.build(argMap);
    return {
      description: prompt.description,
      messages,
    };
  });

  return server;
}
