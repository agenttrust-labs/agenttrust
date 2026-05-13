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
import { classifyError, renderToolError } from "./errors";
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
  "Write tools require a signer (KEYPAIR_B58 / KEYPAIR_PATH / Solana CLI " +
  "default ~/.config/solana/id.json; full chain documented in the MCP " +
  "README). Resources expose the AgentTrust docs corpus, deployed program " +
  "manifest, and example demo source. Prompts ship three guided workflows: " +
  "audit_payment, setup_agent, explain_failure.";

/**
 * Recursively rewrite JSON-Schema draft-04 boolean `exclusiveMinimum` /
 * `exclusiveMaximum` to the draft 2020-12 numeric form expected by the
 * Anthropic API.
 *
 * Input (draft-04, what `zod-to-json-schema`'s `openApi3` target emits
 * for `z.number().positive()` / `.gt(N)` / `.negative()` / `.lt(N)`):
 *
 *   { type: "integer", exclusiveMinimum: true,  minimum: 0 }
 *   { type: "integer", exclusiveMaximum: true,  maximum: 100 }
 *
 * Output (draft 2020-12, what Anthropic /v1/messages accepts):
 *
 *   { type: "integer", exclusiveMinimum: 0 }
 *   { type: "integer", exclusiveMaximum: 100 }
 *
 * The `exclusiveMinimum: false` no-op form is also stripped (it means
 * "the regular `minimum` is inclusive" in draft-04 and is meaningless in
 * 2020-12).
 *
 * Walks `properties`, `items`, `oneOf` / `anyOf` / `allOf`, `definitions`,
 * `$defs`, and nested objects so the rewrite catches every schema node
 * regardless of how the tool author composed the Zod expression.
 *
 * Exported for tests in `test/json-schema-output.test.ts`.
 */
export function rewriteExclusiveBoundsToDraft2020(node: unknown): Record<string, unknown> {
  if (!isPlainObject(node)) return node as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    out[key] = rewriteValue(value);
  }
  // Fold draft-04 boolean exclusiveMinimum/Maximum into numeric form.
  if (out.exclusiveMinimum === true && typeof out.minimum === "number") {
    out.exclusiveMinimum = out.minimum;
    delete out.minimum;
  } else if (out.exclusiveMinimum === false) {
    delete out.exclusiveMinimum;
  }
  if (out.exclusiveMaximum === true && typeof out.maximum === "number") {
    out.exclusiveMaximum = out.maximum;
    delete out.maximum;
  } else if (out.exclusiveMaximum === false) {
    delete out.exclusiveMaximum;
  }
  return out;
}

function rewriteValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(rewriteValue);
  if (isPlainObject(value)) return rewriteExclusiveBoundsToDraft2020(value);
  return value;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

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
  // `zodToJsonSchema(..., { target: "openApi3" })` emits the draft-04 boolean
  // form of `exclusiveMinimum` / `exclusiveMaximum` (`{ exclusiveMinimum: true,
  // minimum: 0 }`) when a Zod field uses `.positive()` / `.gt(N)` / `.negative()`.
  // The Anthropic /v1/messages tool-input-schema validator enforces JSON Schema
  // draft 2020-12 where these fields must be numbers, not booleans, and rejects
  // the entire tool array with HTTP 400 otherwise (see the gate E2E report at
  // submission/e2e-claude-code-2026-05-13/README.md, Regression 1). The
  // canonical Zod patterns we use now (`.min(1)` for slot ints) sidestep this,
  // but this post-processor is defence-in-depth so a future `.positive()` in
  // any tool's input schema cannot regress the Anthropic tool-validation path
  // unnoticed.
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: ALL_TOOLS.map((t) => ({
      name:        t.name,
      description: t.description,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inputSchema: rewriteExclusiveBoundsToDraft2020(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        zodToJsonSchema(t.inputSchema as any, { target: "openApi3" }) as Record<string, unknown>,
      ),
    })),
  }));

  // ---- tools/call ---------------------------------------------------------
  // Every failure path here goes through `classifyError → renderToolError`
  // so MCP clients see a uniform `{ errorCode, message, hint, cause }`
  // envelope (F-013). The classifier handles plain `Error`, `ZodError`,
  // `AnchorError`, `SendTransactionError`, and unknown throws.
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const toolName = req.params.name;
    const tool = ALL_TOOLS.find((t) => t.name === toolName);
    if (!tool) {
      return renderToolError({
        errorCode: "not_found",
        message:   `Unknown tool: ${toolName}.`,
        hint:      "Call `tools/list` to discover the available tool names.",
      });
    }
    let parsed: unknown;
    try {
      parsed = tool.inputSchema.parse(req.params.arguments ?? {});
    } catch (err) {
      return renderToolError(classifyError(err, toolName, chain.cfg.transport));
    }
    try {
      const result = await tool.handler(parsed, { chain });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      return renderToolError(classifyError(err, toolName, chain.cfg.transport));
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
