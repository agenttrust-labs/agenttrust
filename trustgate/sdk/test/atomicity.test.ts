/**
 * Tests for the atomicity invariant — both layers (literal-type guard +
 * runtime throw) — plus the compose path that builds the 3-ix atomic tx.
 */

import { expect } from "chai";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

import {
  AtomicityEnforced,
  AtomicityNotEnforcedError,
  assertAtomicityEnforced,
  composeAtomicSettleTx,
  deriveStandardAta,
} from "../src/atomicity";
import {
  derivePolicyPda,
  deriveVelocityPda,
  deriveKillSwitchPda,
  deriveFeedbackLogPda,
  deriveTrustGateAuthorityPda,
} from "../src/chain";
import { DEFAULT_DEVNET_PROGRAM_IDS } from "../src/types";
import {
  TOKEN_PROGRAM_ID,
  buildTransferCheckedIx,
  deriveAssociatedTokenAddress,
} from "../src/spl";

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

// ---------------------------------------------------------------------------
// SPL helper tests — pure-fn, no chain calls.
// ---------------------------------------------------------------------------

describe("buildTransferCheckedIx", () => {
  const source = Keypair.generate().publicKey;
  const mint   = Keypair.generate().publicKey;
  const dest   = Keypair.generate().publicKey;
  const auth   = Keypair.generate().publicKey;

  it("builds an SPL TransferChecked instruction with the correct discriminator + data", () => {
    const ix = buildTransferCheckedIx({
      source, mint, destination: dest, authority: auth,
      amount: 1_000_000n, decimals: 6, tokenProgram: TOKEN_PROGRAM_ID,
    });
    expect(ix.programId.equals(TOKEN_PROGRAM_ID)).to.equal(true);
    expect(ix.keys).to.have.lengthOf(4);
    expect(ix.keys[0].pubkey.equals(source)).to.equal(true);
    expect(ix.keys[0].isWritable).to.equal(true);
    expect(ix.keys[3].pubkey.equals(auth)).to.equal(true);
    expect(ix.keys[3].isSigner).to.equal(true);
    expect(ix.data[0]).to.equal(12);          // SPL TransferChecked discriminator
    expect(ix.data.readBigUInt64LE(1)).to.equal(1_000_000n);
    expect(ix.data[9]).to.equal(6);           // decimals
  });
});

describe("deriveAssociatedTokenAddress", () => {
  it("produces a deterministic ATA for owner + mint", () => {
    const owner = new PublicKey("11111111111111111111111111111111");
    const mint  = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
    const ata   = deriveAssociatedTokenAddress(owner, mint);
    // Same inputs → same address. We don't pin the address itself (the SPL
    // ATA derivation is canonical and well-tested upstream); we just pin
    // determinism.
    expect(ata.toBase58()).to.equal(deriveAssociatedTokenAddress(owner, mint).toBase58());
  });
});

// ---------------------------------------------------------------------------
// composeAtomicSettleTx — the 3-instruction atomic settle composer
// ---------------------------------------------------------------------------

interface FakeMethodsBuilder {
  accounts(): FakeMethodsBuilder;
  remainingAccounts(): FakeMethodsBuilder;
  instruction(): Promise<{
    programId: PublicKey;
    keys:      Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }>;
    data:      Buffer;
  }>;
}

/** Fake Anchor `Program` whose `methods.<name>(...)` returns a chainable
 *  builder that produces a deterministic instruction stub. Keeps the
 *  composer test fully off-chain. */
function fakeProgram(programId: PublicKey, ixTag: string): any {
  const builder: any = {
    accounts: () => builder,
    remainingAccounts: () => builder,
    instruction: async () => ({
      programId,
      keys: [],
      data: Buffer.from(ixTag, "utf-8"),
    }),
  };
  return {
    programId,
    methods: new Proxy({}, {
      get: () => (..._args: any[]) => builder,
    }),
  };
}

describe("composeAtomicSettleTx", () => {
  const programIds = DEFAULT_DEVNET_PROGRAM_IDS;
  const facilitator = Keypair.generate().publicKey;
  const payer       = Keypair.generate().publicKey;
  const payerAgentAsset = Keypair.generate().publicKey;
  const payeeAgentAsset = Keypair.generate().publicKey;
  const mint    = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  const payerTokenAccount = Keypair.generate().publicKey;
  const payeeTokenAccount = Keypair.generate().publicKey;
  const paymentIdHash = new Uint8Array(32).fill(0xCD);

  const quantuAccounts = {
    payeeAgentAccount: Keypair.generate().publicKey,
    payeeAsset:        Keypair.generate().publicKey,
    payeeCollection:   Keypair.generate().publicKey,
  };

  const baseArgs = {
    atomicityEnforced: true as const,
    programIds,
    policyVault: fakeProgram(programIds.policyVault, "gate"),
    trustgate:   fakeProgram(programIds.trustgate,   "feedback"),
    facilitator,
    payer,
    payerAgentAsset,
    payeeAgentAsset,
    payerTokenAccount,
    payeeTokenAccount,
    amount:       1_000n,
    mint,
    mintDecimals: 6,
    policyId:     1,
    paymentIdHash,
    score:        100,
    tag1:         "trustgate",
    tag2:         "policy=1",
    endpoint:     "/protected",
    feedbackUri:  "",
    quantuAccounts,
  };

  it("throws AtomicityNotEnforcedError without atomicityEnforced", async () => {
    let thrown: Error | null = null;
    try {
      await composeAtomicSettleTx({ ...baseArgs, atomicityEnforced: false } as any);
    } catch (e) { thrown = e as Error; }
    expect(thrown).to.be.instanceOf(AtomicityNotEnforcedError);
  });

  it("composes a 3-instruction tx (gate + transfer + feedback)", async () => {
    const composed = await composeAtomicSettleTx(baseArgs);
    expect(composed.instructions).to.have.lengthOf(3);
    expect(composed.instructions[0].programId.equals(programIds.policyVault)).to.equal(true);
    expect(composed.instructions[1].programId.equals(TOKEN_PROGRAM_ID)).to.equal(true);
    expect(composed.instructions[2].programId.equals(programIds.trustgate)).to.equal(true);
  });

  it("derives the canonical PDAs for policy / velocity / killswitch / feedback log / authority", async () => {
    const composed = await composeAtomicSettleTx(baseArgs);
    expect(composed.accounts.policyAccount.equals(
      derivePolicyPda(programIds.policyVault, payerAgentAsset, 1),
    )).to.equal(true);
    expect(composed.accounts.velocityLedger.equals(
      deriveVelocityPda(programIds.policyVault, payerAgentAsset, 1),
    )).to.equal(true);
    expect(composed.accounts.killSwitchState.equals(
      deriveKillSwitchPda(programIds.policyVault, payerAgentAsset),
    )).to.equal(true);
    expect(composed.accounts.feedbackEmissionLog.equals(
      deriveFeedbackLogPda(programIds.trustgate, Buffer.from(paymentIdHash)),
    )).to.equal(true);
    expect(composed.accounts.trustGateAuthority.equals(
      deriveTrustGateAuthorityPda(programIds.trustgate, facilitator),
    )).to.equal(true);
  });

  it("the SPL transfer ix encodes the requested amount + decimals", async () => {
    const composed = await composeAtomicSettleTx(baseArgs);
    const transferIx = composed.instructions[1];
    expect(transferIx.data[0]).to.equal(12);
    expect(transferIx.data.readBigUInt64LE(1)).to.equal(1_000n);
    expect(transferIx.data[9]).to.equal(6);
  });

  it("Token-2022 program override propagates to the transfer ix", async () => {
    const tokenProgram = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
    const composed = await composeAtomicSettleTx({ ...baseArgs, tokenProgram });
    expect(composed.instructions[1].programId.equals(tokenProgram)).to.equal(true);
  });

  it("deriveStandardAta yields a deterministic ATA from owner + mint", () => {
    const owner = Keypair.generate().publicKey;
    const ata1 = deriveStandardAta(owner, mint);
    const ata2 = deriveStandardAta(owner, mint);
    expect(ata1.toBase58()).to.equal(ata2.toBase58());
  });
});

// SystemProgram unused but keeps the import warning quiet for diff hygiene.
void SystemProgram;
