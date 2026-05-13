import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

import { emitFeedbackTool } from "../../../src/tools/write/emit-feedback";
import { CounterpartyNotRegisteredError, classifyError } from "../../../src/errors";
import { buildTestConfig } from "../../helpers";

describe("agenttrust_emit_feedback (schema)", () => {
  const validInput = () => ({
    payment_id_hash_hex: "a".repeat(64),
    payee_asset:         Keypair.generate().publicKey.toBase58(),
    base_collection:     Keypair.generate().publicKey.toBase58(),
    score:               80,
  });

  it("accepts minimal valid input", () => {
    const r = emitFeedbackTool.inputSchema.safeParse(validInput());
    expect(r.success).to.equal(true);
  });

  it("rejects score > 100", () => {
    const r = emitFeedbackTool.inputSchema.safeParse({ ...validInput(), score: 150 });
    expect(r.success).to.equal(false);
  });

  it("rejects tag1 longer than 32 chars", () => {
    const r = emitFeedbackTool.inputSchema.safeParse({
      ...validInput(),
      tag1: "a".repeat(33),
    });
    expect(r.success).to.equal(false);
  });

  it("rejects feedback_uri longer than 256 chars", () => {
    const r = emitFeedbackTool.inputSchema.safeParse({
      ...validInput(),
      feedback_uri: "x".repeat(257),
    });
    expect(r.success).to.equal(false);
  });
});

/**
 * Defends against the gate E2E Regression 2 — the published 0.3.3
 * handler call to `trustgate.methods.emitFeedback(...)` exploded into
 * 40+ args because the on-chain Rust signature was updated to add
 * `value: u64, value_decimals: u8` between `score` and `tag1` but the
 * bundled IDL at `mcp/src/idl/trustgate.json` was not regenerated. Anchor
 * 0.31's `splitArgsAndCtx` compares args.length to `idlIx.args.length`
 * and rejects the call.
 *
 * The fix updates the IDL to 10 args and keeps the handler call as
 * `Array.from(paymentIdHash)` (a single first positional arg). This test
 * mocks the Anchor `program.methods.emitFeedback(...)` chain and asserts
 * the handler:
 *   1. Passes exactly 10 positional args (matching the on-chain Rust
 *      signature, NOT the stale 8-arg IDL).
 *   2. Passes `payment_id_hash` as a single array of length 32 (NOT 32
 *      separate u8 args spread into the call).
 *   3. Threads the canonical remaining_accounts in the right order.
 */
describe("agenttrust_emit_feedback (handler argument marshalling)", () => {
  it("calls .methods.emitFeedback with exactly 10 args and payment_id_hash as a single 32-element array", async () => {
    const signer       = Keypair.generate();
    const payeeAsset   = Keypair.generate().publicKey;
    const baseColl     = Keypair.generate().publicKey;
    const cfg          = buildTestConfig({ signer });

    // Capture the args / accounts / remainingAccounts the handler passes.
    let capturedArgs: unknown[] | undefined;
    const fakeMethods = {
      emitFeedback: (...args: unknown[]) => {
        capturedArgs = args;
        return {
          accounts: (_: unknown) => ({
            remainingAccounts: (_remaining: unknown) => ({
              rpc: async () => "fake-signature",
            }),
          }),
        };
      },
    };
    const fakeTrustgate = { methods: fakeMethods } as unknown;

    // Minimal ChainClient stand-in: only the surfaces the handler reaches
    // for. Cast through `unknown` because we're stubbing private fields.
    const fakeChain = {
      cfg,
      requireSigner: () => signer,
      trustgate: async () => fakeTrustgate,
    };

    const out = await emitFeedbackTool.handler(
      {
        payment_id_hash_hex: "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20",
        payee_asset:         payeeAsset.toBase58(),
        base_collection:     baseColl.toBase58(),
        score:               80,
        value:               "1000000",
        value_decimals:      6,
        tag1:                "demo",
        tag2:                "",
        endpoint:            "",
        feedback_uri:        "",
        atom_enabled:        true,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { chain: fakeChain as any },
    );

    expect(out.txSignature, "tx signature surfaced").to.equal("fake-signature");
    expect(capturedArgs, "emitFeedback called").to.exist;
    expect(capturedArgs!.length, "10 positional args (matches on-chain Rust signature)").to.equal(10);

    const [
      paymentIdHashArg,
      facilitatorArg,
      payeeAssetArg,
      scoreArg,
      valueArg,
      valueDecimalsArg,
      tag1Arg,
      tag2Arg,
      endpointArg,
      feedbackUriArg,
    ] = capturedArgs!;

    expect(Array.isArray(paymentIdHashArg), "payment_id_hash is a single Array").to.equal(true);
    expect((paymentIdHashArg as number[]).length, "payment_id_hash has length 32").to.equal(32);
    expect((paymentIdHashArg as number[])[0], "first byte is 0x01 from the hex input").to.equal(1);
    expect((paymentIdHashArg as number[])[31], "last byte is 0x20 from the hex input").to.equal(0x20);

    expect((facilitatorArg as PublicKey).toBase58(), "facilitator pubkey").to.equal(signer.publicKey.toBase58());
    expect((payeeAssetArg as PublicKey).toBase58(), "payee_asset pubkey").to.equal(payeeAsset.toBase58());
    expect(scoreArg, "score").to.equal(80);
    expect((valueArg as BN).toString(), "value (BN) stringified").to.equal("1000000");
    expect(valueDecimalsArg, "value_decimals").to.equal(6);
    expect(tag1Arg, "tag1").to.equal("demo");
    expect(tag2Arg, "tag2").to.equal("");
    expect(endpointArg, "endpoint").to.equal("");
    expect(feedbackUriArg, "feedback_uri").to.equal("");
  });

  it("first arg is NOT a 33+ length array (would mean payment_id_hash got prepended)", async () => {
    // Sanity guard against accidental future regressions where a wrapper
    // concatenates instead of passing the array directly.
    const signer  = Keypair.generate();
    const cfg     = buildTestConfig({ signer });

    let capturedArgs: unknown[] | undefined;
    const fakeMethods = {
      emitFeedback: (...args: unknown[]) => {
        capturedArgs = args;
        return {
          accounts: () => ({
            remainingAccounts: () => ({ rpc: async () => "sig" }),
          }),
        };
      },
    };
    const fakeChain = {
      cfg,
      requireSigner: () => signer,
      trustgate: async () => ({ methods: fakeMethods }) as unknown,
    };

    await emitFeedbackTool.handler(
      {
        payment_id_hash_hex: "f".repeat(64),
        payee_asset:         Keypair.generate().publicKey.toBase58(),
        base_collection:     Keypair.generate().publicKey.toBase58(),
        score:               50,
        value:               "1",
        value_decimals:      0,
        tag1:                "",
        tag2:                "",
        endpoint:            "",
        feedback_uri:        "",
        atom_enabled:        false,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { chain: fakeChain as any },
    );

    const first = capturedArgs![0] as number[];
    expect(Array.isArray(first)).to.equal(true);
    expect(first.length, "payment_id_hash byte array is exactly 32 elements").to.equal(32);
  });
});

/**
 * Counterparty-probe handler tests. Defends against the 0.3.5 gate
 * rerun Beat F failure: when the payee's Quantu agent_account PDA isn't
 * seeded, the on-chain emit_feedback CPI fails with
 * `AccountNotInitialized` (Custom 3012) or the equivalent
 * SendTransactionError "An account required by the instruction is
 * missing" text shape. 0.4.0 wraps the .rpc() call, probes the
 * agent_account PDA on RPC, and throws a typed
 * `CounterpartyNotRegisteredError` when the probe says the account is
 * missing — the classifier then renders a `counterparty_not_registered`
 * envelope with `details.counterparty_pubkey`.
 */
describe("agenttrust_emit_feedback (counterparty probe)", () => {
  function buildFakeTrustgateThatThrows(chainErr: Error): unknown {
    return {
      methods: {
        emitFeedback: () => ({
          accounts: () => ({
            remainingAccounts: () => ({
              rpc: async () => { throw chainErr; },
            }),
          }),
        }),
      },
    };
  }

  function buildFakeChain(
    trustgate: unknown,
    signer: Keypair,
    getAccountInfoImpl: (pk: PublicKey) => Promise<unknown>,
  ) {
    const cfg = buildTestConfig({ signer });
    return {
      cfg,
      requireSigner: () => signer,
      trustgate:     async () => trustgate,
      connection:    { getAccountInfo: getAccountInfoImpl },
    };
  }

  function validInput(payeeAsset: PublicKey, baseColl: PublicKey) {
    return {
      payment_id_hash_hex: "a".repeat(64),
      payee_asset:         payeeAsset.toBase58(),
      base_collection:     baseColl.toBase58(),
      score:               80,
      value:               "1000000",
      value_decimals:      6,
      tag1:                "",
      tag2:                "",
      endpoint:            "",
      feedback_uri:        "",
      atom_enabled:        true,
    };
  }

  it("throws CounterpartyNotRegisteredError when the payee's agent_account is missing", async () => {
    const signer     = Keypair.generate();
    const payeeAsset = Keypair.generate().publicKey;
    const baseColl   = Keypair.generate().publicKey;

    // SendTransactionError text shape — the same surface the 0.3.5 gate
    // Beat F rerun captured when the payee wasn't Quantu-registered.
    const chainErr = Object.assign(
      new Error(
        "Simulation failed. \nMessage: Transaction simulation failed: " +
        "Error processing Instruction 0: An account required by the " +
        "instruction is missing. ",
      ),
      { name: "SendTransactionError" },
    );

    const fakeTrustgate = buildFakeTrustgateThatThrows(chainErr);
    const fakeChain = buildFakeChain(
      fakeTrustgate,
      signer,
      // Probe returns null → payee is not registered.
      async (_pk: PublicKey) => null,
    );

    let caught: unknown;
    try {
      await emitFeedbackTool.handler(
        validInput(payeeAsset, baseColl),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { chain: fakeChain as any },
      );
    } catch (err) {
      caught = err;
    }

    expect(caught, "handler threw").to.exist;
    expect(caught).to.be.instanceOf(CounterpartyNotRegisteredError);
    const err = caught as CounterpartyNotRegisteredError;
    expect(err.counterpartyPubkey).to.equal(payeeAsset.toBase58());
    expect(err.missingAccountKind).to.equal("quantu_agent_account");

    // Round-trip through the classifier.
    const envelope = classifyError(err);
    expect(envelope.errorCode).to.equal("counterparty_not_registered");
    expect(envelope.message).to.include(payeeAsset.toBase58());
    expect(envelope.hint).to.match(/init_policy/);
    expect(envelope.details!.counterparty_pubkey).to.equal(payeeAsset.toBase58());
    expect(envelope.details!.missing_account_kind).to.equal("quantu_agent_account");
  });

  it("rethrows the original chain error when the payee's agent_account exists", async () => {
    const signer     = Keypair.generate();
    const payeeAsset = Keypair.generate().publicKey;
    const baseColl   = Keypair.generate().publicKey;

    const chainErr = new Error(
      'simulation failed: {"InstructionError":[0,{"Custom":6000}]}',
    );

    const fakeTrustgate = buildFakeTrustgateThatThrows(chainErr);
    const fakeChain = buildFakeChain(
      fakeTrustgate,
      signer,
      // Probe returns a non-null account → payee IS registered; the
      // failure is some other chain error. Classifier should land it as
      // `chain_error`, NOT `counterparty_not_registered`.
      async (_pk: PublicKey) => ({
        data:       Buffer.alloc(64),
        executable: false,
        lamports:   1_000_000,
        owner:      Keypair.generate().publicKey,
        rentEpoch:  0,
      }),
    );

    let caught: unknown;
    try {
      await emitFeedbackTool.handler(
        validInput(payeeAsset, baseColl),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { chain: fakeChain as any },
      );
    } catch (err) {
      caught = err;
    }

    expect(caught, "handler threw").to.exist;
    expect(caught).to.not.be.instanceOf(CounterpartyNotRegisteredError);

    // Generic classifier path should land it in `chain_error`.
    const envelope = classifyError(caught);
    expect(envelope.errorCode).to.equal("chain_error");
  });
});
