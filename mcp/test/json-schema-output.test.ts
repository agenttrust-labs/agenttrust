/**
 * Defends against the gate E2E Regression 1
 * (submission/e2e-claude-code-2026-05-13/README.md).
 *
 * `zod-to-json-schema(..., { target: "openApi3" })` emits the draft-04
 * boolean form of `exclusiveMinimum` / `exclusiveMaximum` (`{ "type":
 * "integer", "exclusiveMinimum": true, "minimum": 0 }`) when a Zod field
 * uses `.positive()` / `.gt(N)` / `.negative()` / `.lt(N)`. The Anthropic
 * `/v1/messages` tool-input-schema validator enforces JSON Schema draft
 * 2020-12, where these fields must be numbers, and rejects the entire
 * tool array with HTTP 400 on the boolean form.
 *
 * This test asserts:
 *   1. Every tool input schema, after the `server.ts:rewriteExclusive
 *      BoundsToDraft2020` post-processor runs, is free of the boolean
 *      form anywhere in its nested object tree.
 *   2. The two regressed tool input schemas
 *      (`agenttrust_request_validation.deadline_slot` and
 *      `agenttrust_respond_to_validation.expires_at_slot`) have the
 *      slot-int field in the expected `{ "type": "integer", "minimum":
 *      1 }` shape with no exclusive bounds at all.
 *   3. The post-processor handles draft-04's `false` form (`{
 *      "exclusiveMinimum": false, "minimum": 0 }`) by stripping the
 *      meaningless boolean.
 */

import { expect } from "chai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import { rewriteExclusiveBoundsToDraft2020 } from "../src/server";
import { ALL_TOOLS } from "../src/tools";

/**
 * Walk every nested object / array node in `obj` and yield each `{key,
 * value}` pair. Used to assert "no boolean exclusiveMinimum anywhere in
 * the tree".
 */
function* walk(obj: unknown): Generator<{ path: string; key: string; value: unknown }> {
  const stack: Array<{ node: unknown; path: string }> = [{ node: obj, path: "$" }];
  while (stack.length > 0) {
    const { node, path } = stack.pop()!;
    if (Array.isArray(node)) {
      node.forEach((child, i) => stack.push({ node: child, path: `${path}[${i}]` }));
      continue;
    }
    if (typeof node !== "object" || node === null) continue;
    for (const [k, v] of Object.entries(node)) {
      yield { path: `${path}.${k}`, key: k, value: v };
      stack.push({ node: v, path: `${path}.${k}` });
    }
  }
}

describe("JSON Schema output (Anthropic API draft 2020-12 compliance)", () => {
  it("no tool input schema contains boolean exclusiveMinimum/Maximum after the post-processor", () => {
    for (const tool of ALL_TOOLS) {
      const rawSchema = zodToJsonSchema(
        tool.inputSchema as z.ZodTypeAny,
        { target: "openApi3" },
      );
      const fixed = rewriteExclusiveBoundsToDraft2020(rawSchema as Record<string, unknown>);
      for (const node of walk(fixed)) {
        if (node.key === "exclusiveMinimum" || node.key === "exclusiveMaximum") {
          expect(typeof node.value, `${tool.name} @ ${node.path}`).to.equal("number");
        }
      }
    }
  });

  it("request_validation.deadline_slot has draft 2020-12 shape (minimum: 1)", () => {
    const tool = ALL_TOOLS.find((t) => t.name === "agenttrust_request_validation");
    expect(tool, "request_validation tool present").to.exist;
    const rawSchema = zodToJsonSchema(
      tool!.inputSchema as z.ZodTypeAny,
      { target: "openApi3" },
    ) as Record<string, unknown>;
    const fixed = rewriteExclusiveBoundsToDraft2020(rawSchema);
    const props = (fixed.properties as Record<string, unknown>) ?? {};
    const slotSchema = props["deadline_slot"] as Record<string, unknown>;
    expect(slotSchema, "deadline_slot present").to.exist;
    // The union resolves to `anyOf: [{int}, {string}]`; assert the int
    // branch has the expected shape.
    const intBranch = (slotSchema.anyOf as Array<Record<string, unknown>>)
      .find((branch) => branch.type === "integer");
    expect(intBranch, "deadline_slot integer branch present").to.exist;
    expect(intBranch!.minimum, "deadline_slot.minimum").to.equal(1);
    expect(intBranch!.exclusiveMinimum, "deadline_slot.exclusiveMinimum").to.equal(undefined);
  });

  it("respond_to_validation.expires_at_slot has draft 2020-12 shape (minimum: 1)", () => {
    const tool = ALL_TOOLS.find((t) => t.name === "agenttrust_respond_to_validation");
    expect(tool, "respond_to_validation tool present").to.exist;
    const rawSchema = zodToJsonSchema(
      tool!.inputSchema as z.ZodTypeAny,
      { target: "openApi3" },
    ) as Record<string, unknown>;
    const fixed = rewriteExclusiveBoundsToDraft2020(rawSchema);
    const props = (fixed.properties as Record<string, unknown>) ?? {};
    const slotSchema = props["expires_at_slot"] as Record<string, unknown>;
    expect(slotSchema, "expires_at_slot present").to.exist;
    const intBranch = (slotSchema.anyOf as Array<Record<string, unknown>>)
      .find((branch) => branch.type === "integer");
    expect(intBranch, "expires_at_slot integer branch present").to.exist;
    expect(intBranch!.minimum, "expires_at_slot.minimum").to.equal(1);
    expect(intBranch!.exclusiveMinimum, "expires_at_slot.exclusiveMinimum").to.equal(undefined);
  });

  it("rewriteExclusiveBoundsToDraft2020 folds boolean exclusiveMinimum: true into numeric form", () => {
    const input = {
      type: "integer",
      exclusiveMinimum: true,
      minimum: 0,
    };
    const output = rewriteExclusiveBoundsToDraft2020(input);
    expect(output).to.deep.equal({ type: "integer", exclusiveMinimum: 0 });
  });

  it("rewriteExclusiveBoundsToDraft2020 strips exclusiveMinimum: false (draft-04 no-op)", () => {
    const input = {
      type: "integer",
      exclusiveMinimum: false,
      minimum: 0,
    };
    const output = rewriteExclusiveBoundsToDraft2020(input);
    expect(output).to.deep.equal({ type: "integer", minimum: 0 });
  });

  it("rewriteExclusiveBoundsToDraft2020 folds nested boolean exclusiveMaximum: true into numeric form", () => {
    const input = {
      type: "object",
      properties: {
        score: { type: "integer", exclusiveMaximum: true, maximum: 100 },
      },
    };
    const output = rewriteExclusiveBoundsToDraft2020(input);
    expect(output.properties).to.deep.equal({
      score: { type: "integer", exclusiveMaximum: 100 },
    });
  });

  it("rewriteExclusiveBoundsToDraft2020 walks anyOf / oneOf / allOf / items", () => {
    const input = {
      anyOf: [
        { type: "integer", exclusiveMinimum: true, minimum: 0 },
        { type: "string" },
      ],
      items: { type: "integer", exclusiveMinimum: true, minimum: 0 },
      oneOf: [{ type: "integer", exclusiveMinimum: true, minimum: 5 }],
      allOf: [{ type: "integer", exclusiveMinimum: true, minimum: 10 }],
    };
    const output = rewriteExclusiveBoundsToDraft2020(input);
    expect((output.anyOf as Array<Record<string, unknown>>)[0])
      .to.deep.equal({ type: "integer", exclusiveMinimum: 0 });
    expect(output.items).to.deep.equal({ type: "integer", exclusiveMinimum: 0 });
    expect((output.oneOf as Array<Record<string, unknown>>)[0])
      .to.deep.equal({ type: "integer", exclusiveMinimum: 5 });
    expect((output.allOf as Array<Record<string, unknown>>)[0])
      .to.deep.equal({ type: "integer", exclusiveMinimum: 10 });
  });
});
