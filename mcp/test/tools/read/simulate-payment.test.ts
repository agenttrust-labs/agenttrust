import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";

import { simulatePaymentTool } from "../../../src/tools/read/simulate-payment";
import { CounterpartyNotRegisteredError, classifyError } from "../../../src/errors";
import { buildTestConfig } from "../../helpers";

describe("agenttrust_simulate_payment (schema)", () => {
  const validInput = () => ({
    payer_agent: Keypair.generate().publicKey.toBase58(),
    payee_agent: Keypair.generate().publicKey.toBase58(),
    amount:      1000,
    mint:        Keypair.generate().publicKey.toBase58(),
    policy_id:   1,
  });

  it("accepts a valid input", () => {
    const r = simulatePaymentTool.inputSchema.safeParse(validInput());
    expect(r.success).to.equal(true);
  });

  it("accepts string amount", () => {
    const inp = { ...validInput(), amount: "1000000000000" };
    const r = simulatePaymentTool.inputSchema.safeParse(inp);
    expect(r.success).to.equal(true);
  });

  it("rejects negative amount", () => {
    const inp = { ...validInput(), amount: -1 };
    const r = simulatePaymentTool.inputSchema.safeParse(inp);
    expect(r.success).to.equal(false);
  });
});

/**
 * Counterparty-probe handler tests. Defends against the 0.3.5 gate
 * rerun Beat C failure: when the PAYEE's Quantu agent_account PDA isn't
 * seeded, the on-chain simulation returns `AccountNotInitialized`
 * (Custom 3012) and the handler used to bubble a generic `chain_error`.
 * 0.4.0 wraps the chain call, probes the agent_account PDA on RPC, and
 * throws a typed `CounterpartyNotRegisteredError` when the probe says
 * the account is missing — the classifier then renders a
 * `counterparty_not_registered` envelope with `details.counterparty_pubkey`.
 */
describe("agenttrust_simulate_payment (counterparty probe)", () => {
  // Build a stubbed policy_vault Program whose `.methods.gatePayment(...)`
  // call chain ends in a simulateTransaction error. The full call chain
  // mimics what `simulateGatePayment` calls into:
  //   program.methods.gatePayment(...).accounts({...}).instruction()
  //   program.provider.connection.getLatestBlockhash(...)
  //   program.provider.connection.simulateTransaction(tx, {...})
  function buildFakePolicyVault(opts: {
    simErr: unknown;
  }): unknown {
    const fakeIx = {
      programId: Keypair.generate().publicKey,
      keys:      [{ pubkey: Keypair.generate().publicKey, isSigner: false, isWritable: false }],
      data:      Buffer.alloc(0),
    };
    const fakeMethods = {
      gatePayment: () => ({
        accounts: () => ({
          instruction: async () => fakeIx,
        }),
      }),
    };
    const fakeProviderConnection = {
      getLatestBlockhash: async () => ({
        blockhash:           "FakeBlockhashAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        lastValidBlockHeight: 1,
      }),
      simulateTransaction: async () => ({
        context: { slot: 1 },
        value:   { err: opts.simErr, logs: [], unitsConsumed: 0, returnData: null },
      }),
    };
    return {
      methods:  fakeMethods,
      provider: { connection: fakeProviderConnection },
    };
  }

  // Stub ctx.chain.connection.getAccountInfo to return either null or a
  // non-null `AccountInfo` shape. Real accounts return an object with
  // `data`, `owner`, `lamports`, etc. — the probe only checks for non-null.
  function buildFakeChainWith(
    policyVault: unknown,
    getAccountInfoImpl: (pk: PublicKey) => Promise<unknown>,
  ) {
    const cfg = buildTestConfig();
    return {
      cfg,
      signerPubkey: () => null,
      policyVault: async () => policyVault,
      connection:  { getAccountInfo: getAccountInfoImpl },
    };
  }

  function validInput() {
    return {
      payer_agent: Keypair.generate().publicKey.toBase58(),
      payee_agent: Keypair.generate().publicKey.toBase58(),
      amount:      "1000",
      mint:        Keypair.generate().publicKey.toBase58(),
      policy_id:   1,
    };
  }

  it("throws CounterpartyNotRegisteredError when the payee's agent_account is missing", async () => {
    const fakePolicyVault = buildFakePolicyVault({
      simErr: { InstructionError: [0, { Custom: 3012 }] },
    });
    const fakeChain = buildFakeChainWith(
      fakePolicyVault,
      // Probe returns null → counterparty is not registered.
      async (_pk: PublicKey) => null,
    );

    const input = simulatePaymentTool.inputSchema.parse(validInput());

    let caught: unknown;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await simulatePaymentTool.handler(input, { chain: fakeChain as any });
    } catch (err) {
      caught = err;
    }

    expect(caught, "handler threw").to.exist;
    expect(caught).to.be.instanceOf(CounterpartyNotRegisteredError);
    const err = caught as CounterpartyNotRegisteredError;
    expect(err.counterpartyPubkey).to.equal(input.payee_agent);
    expect(err.missingAccountKind).to.equal("quantu_agent_account");

    // The classifier should round-trip this to the right envelope.
    const envelope = classifyError(err);
    expect(envelope.errorCode).to.equal("counterparty_not_registered");
    expect(envelope.message).to.match(/Quantu agent registry/);
    expect(envelope.message).to.include(input.payee_agent);
    expect(envelope.details!.counterparty_pubkey).to.equal(input.payee_agent);
    expect(envelope.details!.missing_account_kind).to.equal("quantu_agent_account");
  });

  it("rethrows the original chain error when both agent_accounts exist", async () => {
    const fakePolicyVault = buildFakePolicyVault({
      simErr: { InstructionError: [0, { Custom: 6000 }] },
    });
    const fakeChain = buildFakeChainWith(
      fakePolicyVault,
      // Probe returns a non-null account → counterparties ARE registered;
      // the failure is some OTHER chain error. The classifier should
      // surface it as `chain_error`, NOT `counterparty_not_registered`.
      async (_pk: PublicKey) => ({
        data:       Buffer.alloc(64),
        executable: false,
        lamports:   1_000_000,
        owner:      Keypair.generate().publicKey,
        rentEpoch:  0,
      }),
    );

    const input = simulatePaymentTool.inputSchema.parse(validInput());

    let caught: unknown;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await simulatePaymentTool.handler(input, { chain: fakeChain as any });
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
