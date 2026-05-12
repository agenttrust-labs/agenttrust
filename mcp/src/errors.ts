/**
 * Structured error envelopes for MCP `tools/call` responses (F-013).
 *
 * Before this module, every thrown handler error was flattened to
 * `{ isError: true, content: [{type:"text",text:"tool error: <msg>"}] }`
 * — opaque to LLM agents and useless for automated recovery.
 *
 * Now `classifyError()` inspects the thrown value and produces a
 * `ToolError` with:
 *   - `errorCode`: one of a fixed enum so callers can branch on it.
 *   - `message`:   short human description (truncated original).
 *   - `hint`:      single sentence of remediation guidance.
 *   - `cause`:     truncated original message (<=500 chars) for debugging.
 *
 * `renderToolError()` serialises that envelope into the MCP
 * `CallToolResult` shape. The envelope is JSON-encoded into
 * `content[0].text` (so transports that only surface text still get a
 * parseable payload), AND mirrored into `structuredContent` (the MCP
 * spec field for machine-readable tool output, supported by the
 * `@modelcontextprotocol/sdk` schema we already depend on).
 *
 * Tool handlers do NOT need to change. They still:
 *   - `throw new Error("...")` for ad-hoc failures
 *   - `throw new ZodError(...)` (implicitly, via `schema.parse()`)
 *   - throw `AnchorError` / `SendTransactionError` (via `.rpc()` calls)
 * The classifier sniffs the thrown value (name, message prefix,
 * `instanceof` where the constructor is in scope) and maps it.
 *
 * Note for future contributors: callers reading `content[0].text` as a
 * string will see a JSON object now, not a plain sentence. This is
 * intentional — `isError: true` is preserved so existing transports
 * still treat it as a failure. If you add a new tool that throws a
 * specific subclass, extend `classifyError()` here rather than
 * pattern-matching in `server.ts`.
 */

import { ZodError } from "zod";

/** Stable enum of error categories surfaced to MCP clients. */
export type ToolErrorCode =
  | "auth_required"
  | "config_error"
  | "input_invalid"
  | "rpc_failure"
  | "chain_error"
  | "not_found"
  | "internal";

export interface ToolError {
  errorCode: ToolErrorCode;
  message:   string;
  hint?:     string;
  cause?:    string;
}

/** Cap raw error messages at this many characters to keep payloads sane. */
const MAX_CAUSE_LEN = 500;

/** Truncate with a tail marker so it's obvious what got cut. */
function clamp(s: string, max = MAX_CAUSE_LEN): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 16) + "... [truncated]";
}

/**
 * Extract a `message` string from an unknown thrown value. JS code can
 * `throw "string"`, `throw {message}`, `throw new Error()`, or `throw 42`,
 * and the classifier needs a string in every case.
 */
function readMessage(err: unknown): string {
  if (err == null) return "(unknown error)";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && "message" in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === "string") return m;
  }
  try { return JSON.stringify(err); } catch { return String(err); }
}

/** Return the constructor name when present — useful for cross-version detection. */
function readName(err: unknown): string {
  if (err == null) return "";
  if (err instanceof Error) return err.name || err.constructor?.name || "";
  if (typeof err === "object" && err.constructor) return err.constructor.name;
  return "";
}

/**
 * Inspect a `ZodError`'s first issue and render it as a one-line hint.
 * Keeps the LLM's recovery prompt short; full `issues` array goes into
 * `cause` so a debugging agent can still drill in.
 */
function formatZodHint(zErr: ZodError): string {
  const first = zErr.issues[0];
  if (!first) return "Fix the input shape and retry.";
  const path = first.path.length > 0 ? first.path.join(".") : "(root)";
  return `Fix field "${path}": ${first.message}`;
}

/**
 * Anchor errors expose structured `error.errorMessage` plus on-chain
 * `logs`. We surface the human message as the hint and put a few key
 * log lines in the cause to help LLMs trace the constraint failure.
 */
function formatAnchorHint(err: unknown): string | undefined {
  const e = err as { error?: { errorMessage?: string; errorCode?: { code?: string } } };
  const msg  = e.error?.errorMessage;
  const code = e.error?.errorCode?.code;
  if (msg && code) return `On-chain ${code}: ${msg}.`;
  if (msg) return `On-chain error: ${msg}.`;
  return undefined;
}

/**
 * Heuristic name/message matchers. Anchor + web3.js may be present in
 * multiple versions in a pnpm workspace (we saw two `@coral-xyz/anchor`
 * trees), so we cannot rely on a single `instanceof`. String checks on
 * `err.name` are the cross-version-safe path.
 */
function isAnchorError(err: unknown, name: string, message: string): boolean {
  if (name === "AnchorError") return true;
  // AnchorError.toString() includes "AnchorError caused by account..."
  if (message.startsWith("AnchorError")) return true;
  // AnchorError exposes structured `error.errorCode.code` even when the
  // surface message doesn't look Anchor-y (e.g. when a tool catches and
  // rethrows). Sniff the shape directly.
  if (typeof err === "object" && err !== null) {
    const e = err as { error?: { errorCode?: { code?: unknown } } };
    if (typeof e.error?.errorCode?.code === "string") return true;
  }
  // SendTransactionError wraps AnchorError for .rpc() calls
  if (/Error Code:\s*\w+\.\s*Error Number:\s*\d+/i.test(message)) return true;
  // CPI-deep failures bubble up `custom program error: 0x...`
  if (/custom program error:\s*0x[0-9a-f]+/i.test(message)) return true;
  // Raw Solana `InstructionError` payload — surfaces when a simulation /
  // send hits a program error before Anchor decodes it. Two shapes:
  //   - JSON string in message: 'simulation failed: {"InstructionError":[0,{"Custom":3012}]}'
  //   - Plain text: 'transaction simulation failed: ... InstructionError ... Custom: 3012'
  if (/InstructionError/.test(message)) return true;
  if (/"Custom":\s*\d+/.test(message)) return true;
  if (/\bCustom:\s*\d+\b/.test(message)) return true;
  return false;
}

/**
 * Extract a `Custom <n>` Anchor error number from an `InstructionError`
 * payload. Used to build a richer hint in the `chain_error` envelope.
 *
 * Matches both JSON ({"Custom":3012}) and text (`Custom: 3012`) shapes.
 * Returns undefined if no recognisable code is present.
 */
function extractCustomErrorCode(message: string): number | undefined {
  const jsonMatch = /"Custom":\s*(\d+)/.exec(message);
  if (jsonMatch) return Number.parseInt(jsonMatch[1], 10);
  const textMatch = /\bCustom:\s*(\d+)\b/.exec(message);
  if (textMatch) return Number.parseInt(textMatch[1], 10);
  return undefined;
}

/**
 * Map known Anchor error numbers to a short human label so the
 * `chain_error` hint reads "Custom 3012 (AccountNotInitialized)" rather
 * than just "Custom 3012". Only the codes we see in practice — the
 * Anchor docs list the full table; we name the ones the gate E2E hits.
 */
const ANCHOR_ERROR_CODES: Record<number, string> = {
  3012: "AccountNotInitialized",
  3007: "InstructionFallbackNotFound",
  6000: "(program-defined; see the program's `error.rs`)",
};

function formatInstructionErrorHint(message: string): string {
  const code = extractCustomErrorCode(message);
  if (code === undefined) {
    return "On-chain program returned an InstructionError; inspect the cause for the failing instruction index and check the transaction logs on the explorer.";
  }
  const label = ANCHOR_ERROR_CODES[code];
  const suffix = label ? ` (${label})` : "";
  return `On-chain program returned Custom ${code}${suffix}. Inspect the transaction logs on the explorer; the failing constraint or seed mismatch is named in the program's error.rs.`;
}

function isConfigError(err: unknown, name: string): boolean {
  if (name === "ConfigError") return true;
  if (typeof err === "object" && err !== null && "name" in err) {
    return (err as { name?: unknown }).name === "ConfigError";
  }
  return false;
}

function isRpcFailure(name: string, message: string): boolean {
  if (name === "SolanaJSONRPCError") return true;
  if (/^failed to get/i.test(message)) return true;
  if (/\b429\b/.test(message)) return true;
  if (/\btimed out\b/i.test(message)) return true;
  if (/\bECONNREFUSED\b/.test(message)) return true;
  if (/\bENOTFOUND\b/.test(message)) return true;
  if (/fetch failed/i.test(message)) return true;
  return false;
}

function isNotFound(message: string): boolean {
  if (/not initialised|not initialized/i.test(message)) return true;
  if (/AccountNotFound/i.test(message)) return true;
  if (/IDL not found|idl account does not exist/i.test(message)) return true;
  if (/Account does not exist/i.test(message)) return true;
  return false;
}

/**
 * Tag a `requireSigner()` failure as `auth_required`. The thrown message
 * is hardcoded in `ChainClient.requireSigner()` — we match on a stable
 * substring so the classifier doesn't break if the surrounding sentence
 * is reworded.
 *
 * TODO (F-014): once `requireSigner(toolName)` exists, the hint can name
 * the specific tool that needed auth instead of a generic blurb.
 */
function isAuthRequired(message: string): boolean {
  return /requires a signer/i.test(message);
}

/**
 * Classify an unknown thrown value into a structured `ToolError`.
 *
 * @param err      The thrown value from a tool handler (or Zod parse).
 * @param toolName Optional — the MCP tool that was being invoked. When
 *                 supplied, surfaces in the `auth_required` hint so the
 *                 LLM agent knows which call to retry.
 */
export function classifyError(err: unknown, toolName?: string): ToolError {
  const message = readMessage(err);
  const name    = readName(err);
  const cause   = clamp(message);

  // 1. Auth — caught first because the message is hardcoded and stable.
  if (isAuthRequired(message)) {
    const which = toolName ? ` (needed by \`${toolName}\`)` : "";
    return {
      errorCode: "auth_required",
      message:   `Signer required${which}.`,
      hint:
        "Set KEYPAIR_B58 (base58-encoded 64-byte secret), KEYPAIR_PATH, " +
        "or `solana config get` to point at a funded keypair, then restart the MCP server.",
      cause,
    };
  }

  // 2. Config errors — thrown from `chain.ts:guardATProgramId` when an
  //    AT-touching tool runs on mainnet without explicit program IDs.
  //    Caught before the Anchor branch so the "ConfigError" name is
  //    picked up before the message hits any Anchor heuristics.
  if (isConfigError(err, name)) {
    return {
      errorCode: "config_error",
      message:   "MCP server is misconfigured for this tool.",
      hint:      message,
      cause,
    };
  }

  // 3. Zod schema validation — `instanceof ZodError` works because the
  //    server passes the parse error through directly (no wrapping).
  if (err instanceof ZodError) {
    return {
      errorCode: "input_invalid",
      message:   "Input validation failed.",
      hint:      formatZodHint(err),
      cause:     clamp(JSON.stringify(err.issues)),
    };
  }

  // 4. Anchor / on-chain program errors. Includes raw Solana
  //    `InstructionError` payloads (e.g. simulation hits an
  //    `AccountNotInitialized` Custom 3012 on an unseeded PDA) so the
  //    classifier lands them in `chain_error` rather than `internal`.
  //    See the gate E2E Beat C polish item in
  //    submission/e2e-claude-code-2026-05-13/README.md.
  if (isAnchorError(err, name, message)) {
    const anchorHint = formatAnchorHint(err);
    const fallbackHint = /InstructionError/.test(message) || /\bCustom\b/.test(message)
      ? formatInstructionErrorHint(message)
      : "Inspect the transaction logs on the explorer; the failing constraint or " +
        "custom error code is included in the cause.";
    return {
      errorCode: "chain_error",
      message:   "On-chain transaction failed.",
      hint:      anchorHint ?? fallbackHint,
      cause,
    };
  }

  // 4. RPC / connectivity issues.
  if (isRpcFailure(name, message)) {
    return {
      errorCode: "rpc_failure",
      message:   "RPC call failed.",
      hint:
        "Check `RPC_URL` env, switch to a dedicated RPC provider (e.g., Helius/Triton), " +
        "or retry after a short backoff.",
      cause,
    };
  }

  // 5. Account / IDL / facilitator not found.
  if (isNotFound(message)) {
    return {
      errorCode: "not_found",
      message:   "Required account or IDL was not found on-chain.",
      hint:
        "Run the matching init/register tool before this one, or verify you are " +
        "pointed at the correct cluster (devnet vs mainnet).",
      cause,
    };
  }

  // 6. Fallback.
  return {
    errorCode: "internal",
    message:   "Tool handler threw an unexpected error.",
    hint:      "See `cause` for the original message and check the MCP server stderr for stack trace.",
    cause,
  };
}

/**
 * Build the MCP `CallToolResult` envelope for a classified error.
 *
 * Returns the canonical shape:
 *   {
 *     isError: true,
 *     content: [{ type: "text", text: "<json string>" }],
 *     structuredContent: <ToolError as object>
 *   }
 *
 * The JSON-in-text duplication is intentional: MCP clients that only
 * surface text content (current Claude Desktop fallback path) still get
 * a parseable payload, while spec-compliant clients pick up the
 * structured field directly.
 *
 * The return type is `unknown` so callers don't need to import the SDK's
 * private `CallToolResult` zod type — the server handler returns
 * `Promise<{ ... }>` and TS infers the shape at the call site.
 */
export function renderToolError(toolError: ToolError): {
  isError: true;
  content: Array<{ type: "text"; text: string }>;
  structuredContent: Record<string, unknown>;
} {
  // Preserve original key order in the JSON for human-readability.
  const ordered: Record<string, unknown> = {
    errorCode: toolError.errorCode,
    message:   toolError.message,
  };
  if (toolError.hint  !== undefined) ordered.hint  = toolError.hint;
  if (toolError.cause !== undefined) ordered.cause = toolError.cause;

  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify(ordered, null, 2) }],
    structuredContent: ordered,
  };
}
