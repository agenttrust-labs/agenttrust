/**
 * Tests for the atomicity invariant — both layers (literal-type guard +
 * runtime throw).
 */

import { expect } from "chai";

import {
  AtomicityEnforced,
  AtomicityNotEnforcedError,
  assertAtomicityEnforced,
} from "../src/atomicity";

describe("AtomicityEnforced literal-type guard", () => {
  it("compile-time: type accepts only literal `true`", () => {
    // These compile (intentionally — they're the happy path).
    const ok: AtomicityEnforced = { atomicityEnforced: true };
    expect(ok.atomicityEnforced).to.equal(true);

    // The following lines are intentionally COMMENTED OUT — uncommenting
    // them must produce a TypeScript compile error. Verifying compile-time
    // failure programmatically requires a separate type-check harness;
    // this test documents the invariant for human reviewers.
    //
    //   const bad1: AtomicityEnforced = { atomicityEnforced: false };
    //   //  Type 'false' is not assignable to type 'true'.
    //   const bad2: AtomicityEnforced = { atomicityEnforced: true as boolean };
    //   //  Type 'boolean' is not assignable to type 'true'.
    //   const bad3: AtomicityEnforced = {};
    //   //  Property 'atomicityEnforced' is missing.
  });
});

describe("assertAtomicityEnforced runtime check", () => {
  it("passes when atomicityEnforced === true", () => {
    expect(() => assertAtomicityEnforced(
      { atomicityEnforced: true },
      "test-site",
    )).to.not.throw();
  });

  it("throws AtomicityNotEnforcedError when atomicityEnforced === false", () => {
    expect(() => assertAtomicityEnforced(
      { atomicityEnforced: false } as any,
      "test-site",
    )).to.throw(AtomicityNotEnforcedError, /atomicityEnforced=true is required/);
  });

  it("throws when atomicityEnforced is missing", () => {
    expect(() => assertAtomicityEnforced(
      {} as any,
      "test-site",
    )).to.throw(AtomicityNotEnforcedError);
  });

  it("throws when atomicityEnforced is null/undefined", () => {
    expect(() => assertAtomicityEnforced(
      { atomicityEnforced: null } as any,
      "test-site",
    )).to.throw(AtomicityNotEnforcedError);
    expect(() => assertAtomicityEnforced(
      { atomicityEnforced: undefined } as any,
      "test-site",
    )).to.throw(AtomicityNotEnforcedError);
  });

  it("throws when atomicityEnforced is a truthy non-boolean (e.g., 1, 'yes')", () => {
    expect(() => assertAtomicityEnforced(
      { atomicityEnforced: 1 } as any,
      "test-site",
    )).to.throw(AtomicityNotEnforcedError);
    expect(() => assertAtomicityEnforced(
      { atomicityEnforced: "yes" } as any,
      "test-site",
    )).to.throw(AtomicityNotEnforcedError);
  });

  it("error message includes the site name + reference doc", () => {
    try {
      assertAtomicityEnforced({} as any, "mountTrustGate");
      expect.fail("expected throw");
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).to.include("mountTrustGate");
      expect(msg).to.include("docs/plan/research/02-anchor-token2022-cpi-class.md");
    }
  });
});
