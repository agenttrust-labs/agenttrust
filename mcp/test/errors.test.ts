/**
 * Unit tests for `classifyError()` in src/errors.ts.
 *
 * Defends against the gate E2E Polish item 1 — Solana
 * `InstructionError` payloads (e.g. an `AccountNotInitialized` Custom
 * 3012 from a simulate_payment against an unseeded PDA) used to land in
 * `errorCode: "internal"`. They now classify as `chain_error` with a
 * hint that names the Anchor error number.
 *
 * Also covers the new `config_error` code surfaced by `chain.ts:guardAT
 * ProgramId` when an AT-touching tool runs on mainnet without explicit
 * program IDs (Beat G Polish item 2).
 *
 * See submission/e2e-claude-code-2026-05-13/README.md for the full gate
 * narrative.
 */

import { expect } from "chai";
import { ZodError } from "zod";

import { classifyError } from "../src/errors";

describe("classifyError", () => {
  describe("InstructionError -> chain_error", () => {
    it("classifies an Error with the simulation/InstructionError JSON shape as chain_error", () => {
      const err = new Error(
        'simulation failed: {"InstructionError":[0,{"Custom":3012}]}',
      );
      const result = classifyError(err);
      expect(result.errorCode, "errorCode").to.equal("chain_error");
      expect(result.hint, "hint mentions Custom 3012").to.match(/Custom 3012/);
      expect(result.hint, "hint mentions AccountNotInitialized").to.match(/AccountNotInitialized/);
    });

    it("classifies a plain-text Custom NNN message as chain_error", () => {
      const err = new Error(
        "Transaction simulation failed: Error processing Instruction 0: " +
        "custom program error: 0xbc4",
      );
      const result = classifyError(err);
      expect(result.errorCode).to.equal("chain_error");
    });

    it("classifies a text-shaped InstructionError without Custom code as chain_error", () => {
      const err = new Error(
        "RPC response error: {\"InstructionError\":[1,\"AccountAlreadyInitialized\"]}",
      );
      const result = classifyError(err);
      expect(result.errorCode).to.equal("chain_error");
    });

    it("classifies an Anchor-style error with structured errorCode as chain_error", () => {
      // AnchorError exposes `error.errorCode.code` even when the
      // surface message doesn't read like an Anchor message. The
      // classifier sniffs the shape.
      const err = Object.assign(new Error("constraint failed"), {
        name:  "AnchorError",
        error: {
          errorCode:    { code: "ConstraintHasOne", number: 2001 },
          errorMessage: "A has_one constraint was violated",
        },
      });
      const result = classifyError(err);
      expect(result.errorCode).to.equal("chain_error");
      expect(result.hint).to.match(/ConstraintHasOne/);
    });

    it("classifies an unwrapped object with .error.errorCode.code as chain_error", () => {
      // Some SDK wrappers rethrow with a vanilla Error name but the
      // Anchor-shaped `.error` payload still attached. Cover that path
      // explicitly so the classifier doesn't fall through to internal.
      const err = Object.assign(new Error("rpc failed"), {
        error: {
          errorCode:    { code: "ConstraintSeeds", number: 2006 },
          errorMessage: "A seeds constraint was violated",
        },
      });
      const result = classifyError(err);
      expect(result.errorCode).to.equal("chain_error");
    });
  });

  describe("config_error", () => {
    it("classifies a ConfigError-named throw as config_error", () => {
      const err = new Error(
        "AgentTrust policy_vault program is not deployed on mainnet yet. " +
        "Set POLICY_VAULT_PROGRAM_ID to an explicit base58 program ID.",
      );
      err.name = "ConfigError";
      const result = classifyError(err, "agenttrust_get_policy");
      expect(result.errorCode).to.equal("config_error");
      // Hint surfaces the original guard message verbatim so the LLM has
      // the remediation hand-off in one read.
      expect(result.hint).to.match(/POLICY_VAULT_PROGRAM_ID/);
    });
  });

  describe("auth_required", () => {
    it("classifies a 'requires a signer' throw as auth_required", () => {
      const err = new Error(
        "This tool requires a signer. Set one of: KEYPAIR_B58 ...",
      );
      const result = classifyError(err, "agenttrust_emit_feedback");
      expect(result.errorCode).to.equal("auth_required");
      expect(result.message).to.match(/agenttrust_emit_feedback/);
    });
  });

  describe("input_invalid (ZodError)", () => {
    it("classifies a ZodError as input_invalid", () => {
      // Build a real ZodError by failing a schema parse.
      const { z } = require("zod");
      const schema = z.object({ score: z.number().int() });
      const parse = schema.safeParse({ score: "nope" });
      expect(parse.success).to.equal(false);
      const zErr = (parse as { error: ZodError }).error;
      const result = classifyError(zErr);
      expect(result.errorCode).to.equal("input_invalid");
      expect(result.hint).to.match(/score/);
    });
  });

  describe("internal (fallback)", () => {
    it("classifies a plain unrelated error as internal", () => {
      const err = new Error("something went sideways");
      const result = classifyError(err);
      expect(result.errorCode).to.equal("internal");
    });

    it("classifies a non-Error throw as internal", () => {
      const result = classifyError("just a string");
      expect(result.errorCode).to.equal("internal");
    });
  });
});
