/**
 * MCP tool descriptor shared across read/write/discovery folders.
 *
 * Each tool exports a single `Tool<T>` whose `inputSchema` is a Zod
 * schema (used for runtime validation) and whose `handler` produces a
 * structured JSON payload. The MCP server adapter turns the payload
 * into a `text` content block — clients can re-parse the JSON if they
 * want structured access.
 */

import type { z } from "zod";

import type { ChainClient } from "../chain";

export interface ToolContext {
  readonly chain: ChainClient;
}

/**
 * `z.ZodType<TInput, z.ZodTypeDef, any>` — the third generic parameter
 * (Input) intentionally widens to `any` so schemas with `.default()`
 * fields (whose pre-parse Input differs from post-parse Output) satisfy
 * the constraint without a per-tool cast.
 */
export interface Tool<TInput, TOutput> {
  readonly name:         string;
  readonly description:  string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly inputSchema:  z.ZodType<TInput, z.ZodTypeDef, any>;
  readonly handler:      (input: TInput, ctx: ToolContext) => Promise<TOutput>;
}

/**
 * Helper type that lets call-sites stay generic without leaking Zod
 * specifics.
 */
export type AnyTool = Tool<unknown, unknown>;
