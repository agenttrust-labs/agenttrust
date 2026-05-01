/**
 * PolicyVault — `init_policy` integration tests.
 *
 * Runs against `anchor test`'s embedded `solana-test-validator`.
 * Validates the on-chain handler end-to-end: PDA derivation, args
 * serialisation, range guards, reinit protection.
 *
 * Phase 1 scope: init_policy only. Composer + 4 other policies in Phase 2-4.
 */

import * as anchor from "@coral-xyz/anchor";
import { BN, Program, AnchorError } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const POLICY_PREFIX = Buffer.from("policy");
const VELOCITY_PREFIX = Buffer.from("velocity");

function policyIdLeBytes(policyId: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(policyId, 0);
  return buf;
}

function derivePolicyPda(
  programId: PublicKey,
  agentAsset: PublicKey,
  policyId: number,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POLICY_PREFIX, agentAsset.toBuffer(), policyIdLeBytes(policyId)],
    programId,
  );
}

function deriveVelocityPda(
  programId: PublicKey,
  agentAsset: PublicKey,
  policyId: number,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VELOCITY_PREFIX, agentAsset.toBuffer(), policyIdLeBytes(policyId)],
    programId,
  );
}

// Default valid args. Tests override specific fields to drive each path.
function defaultArgs(policyId: number) {
  return {
    policyId,
    enabledKindsBitmask: 0x02, // Spending only
    gateMode: 0,               // Immediate
    scopeKind: 0,              // Global
    spending: {
      perTxMax: new BN(100),
      dailyMax: new BN(500),
      weeklyMax: new BN(2_000),
    },
    velocity: {
      windowSecs: new BN(3_600),
      maxInWindow: new BN(1_000),
      tier0DecayFactor: new BN(2_500),
    },
    counterparty: {
      minTier: 0,
      maxRiskScore: 255,
      minConfidence: 0,
      defaultUnratedTreatment: 1, // Allow
    },
    validation: {
      requiredCapabilityHash: Array(32).fill(0),
      acceptedAttestors: [PublicKey.default, PublicKey.default],
    },
  };
}

// -----------------------------------------------------------------------------
// Suite
// -----------------------------------------------------------------------------

describe("policy-vault :: init_policy", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PolicyVault as Program<any>;

  // Each test gets a fresh agent asset to avoid PDA collisions across cases.
  const freshAgent = () => Keypair.generate().publicKey;

  it("creates PolicyAccount + VelocityLedger with the configured fields", async () => {
    const agent = freshAgent();
    const args = defaultArgs(1);
    const [policyPda] = derivePolicyPda(program.programId, agent, args.policyId);
    const [ledgerPda] = deriveVelocityPda(program.programId, agent, args.policyId);

    await program.methods
      .initPolicy(agent, args)
      .accounts({
        payer: provider.wallet.publicKey,
        policyAccount: policyPda,
        velocityLedger: ledgerPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const policy = await program.account.policyAccount.fetch(policyPda);
    expect(policy.payerAgentAsset.toBase58()).to.equal(agent.toBase58());
    expect(policy.policyId).to.equal(args.policyId);
    expect(policy.enabledKindsBitmask).to.equal(args.enabledKindsBitmask);
    expect(policy.gateMode).to.equal(args.gateMode);
    expect(policy.scopeKind).to.equal(args.scopeKind);
    expect(policy.spendingPerTxMax.toNumber()).to.equal(100);
    expect(policy.spendingDailyMax.toNumber()).to.equal(500);
    expect(policy.spendingWeeklyMax.toNumber()).to.equal(2_000);
    expect(policy.spendingTodayUsed.toNumber()).to.equal(0);
    expect(policy.spendingWeekUsed.toNumber()).to.equal(0);
    expect(policy.spendingTodayAnchor.toNumber()).to.equal(0);
    expect(policy.spendingWeekAnchor.toNumber()).to.equal(0);
    expect(policy.minCounterpartyTier).to.equal(0);
    expect(policy.maxRiskScore).to.equal(255);
    expect(policy.minConfidence).to.equal(0);
    expect(policy.defaultUnratedTreatment).to.equal(1);

    const ledger = await program.account.velocityLedger.fetch(ledgerPda);
    expect(ledger.payerAgentAsset.toBase58()).to.equal(agent.toBase58());
    expect(ledger.policyId).to.equal(args.policyId);
    expect(ledger.cumulativeAmount.toNumber()).to.equal(0);
    expect(ledger.lastCommitSlot.toNumber()).to.equal(0);
    expect(ledger.windowStartSlot.toNumber()).to.equal(0);
  });

  it("rejects invalid gate_mode (>1)", async () => {
    const agent = freshAgent();
    const args = { ...defaultArgs(2), gateMode: 9 };
    const [policyPda] = derivePolicyPda(program.programId, agent, args.policyId);
    const [ledgerPda] = deriveVelocityPda(program.programId, agent, args.policyId);

    try {
      await program.methods
        .initPolicy(agent, args)
        .accounts({
          payer: provider.wallet.publicKey,
          policyAccount: policyPda,
          velocityLedger: ledgerPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail("expected InvalidGateMode but tx succeeded");
    } catch (e) {
      const err = e as AnchorError;
      expect(err.error.errorCode.code).to.equal("InvalidGateMode");
    }
  });

  it("rejects invalid scope_kind (>2)", async () => {
    const agent = freshAgent();
    const args = { ...defaultArgs(3), scopeKind: 9 };
    const [policyPda] = derivePolicyPda(program.programId, agent, args.policyId);
    const [ledgerPda] = deriveVelocityPda(program.programId, agent, args.policyId);

    try {
      await program.methods
        .initPolicy(agent, args)
        .accounts({
          payer: provider.wallet.publicKey,
          policyAccount: policyPda,
          velocityLedger: ledgerPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail("expected InvalidScopeKind but tx succeeded");
    } catch (e) {
      const err = e as AnchorError;
      expect(err.error.errorCode.code).to.equal("InvalidScopeKind");
    }
  });

  it("rejects enabled_kinds_bitmask with bits outside KIND_*", async () => {
    const agent = freshAgent();
    const args = { ...defaultArgs(4), enabledKindsBitmask: 0xFF };
    const [policyPda] = derivePolicyPda(program.programId, agent, args.policyId);
    const [ledgerPda] = deriveVelocityPda(program.programId, agent, args.policyId);

    try {
      await program.methods
        .initPolicy(agent, args)
        .accounts({
          payer: provider.wallet.publicKey,
          policyAccount: policyPda,
          velocityLedger: ledgerPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail("expected InvalidEnabledKinds but tx succeeded");
    } catch (e) {
      const err = e as AnchorError;
      expect(err.error.errorCode.code).to.equal("InvalidEnabledKinds");
    }
  });

  it("rejects counterparty.min_tier > 4", async () => {
    const agent = freshAgent();
    const args = defaultArgs(5);
    args.counterparty.minTier = 9;
    const [policyPda] = derivePolicyPda(program.programId, agent, args.policyId);
    const [ledgerPda] = deriveVelocityPda(program.programId, agent, args.policyId);

    try {
      await program.methods
        .initPolicy(agent, args)
        .accounts({
          payer: provider.wallet.publicKey,
          policyAccount: policyPda,
          velocityLedger: ledgerPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail("expected InvalidCounterpartyTier but tx succeeded");
    } catch (e) {
      const err = e as AnchorError;
      expect(err.error.errorCode.code).to.equal("InvalidCounterpartyTier");
    }
  });

  it("rejects counterparty.min_confidence > 10000", async () => {
    const agent = freshAgent();
    const args = defaultArgs(6);
    args.counterparty.minConfidence = 50_000;
    const [policyPda] = derivePolicyPda(program.programId, agent, args.policyId);
    const [ledgerPda] = deriveVelocityPda(program.programId, agent, args.policyId);

    try {
      await program.methods
        .initPolicy(agent, args)
        .accounts({
          payer: provider.wallet.publicKey,
          policyAccount: policyPda,
          velocityLedger: ledgerPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail("expected InvalidConfidence but tx succeeded");
    } catch (e) {
      const err = e as AnchorError;
      expect(err.error.errorCode.code).to.equal("InvalidConfidence");
    }
  });

  it("rejects counterparty.default_unrated_treatment outside {0,1,2}", async () => {
    const agent = freshAgent();
    const args = defaultArgs(7);
    args.counterparty.defaultUnratedTreatment = 9;
    const [policyPda] = derivePolicyPda(program.programId, agent, args.policyId);
    const [ledgerPda] = deriveVelocityPda(program.programId, agent, args.policyId);

    try {
      await program.methods
        .initPolicy(agent, args)
        .accounts({
          payer: provider.wallet.publicKey,
          policyAccount: policyPda,
          velocityLedger: ledgerPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail("expected InvalidUnratedTreatment but tx succeeded");
    } catch (e) {
      const err = e as AnchorError;
      expect(err.error.errorCode.code).to.equal("InvalidUnratedTreatment");
    }
  });

  it("rejects re-init with the same (agent, policy_id) seeds", async () => {
    const agent = freshAgent();
    const args = defaultArgs(8);
    const [policyPda] = derivePolicyPda(program.programId, agent, args.policyId);
    const [ledgerPda] = deriveVelocityPda(program.programId, agent, args.policyId);

    await program.methods
      .initPolicy(agent, args)
      .accounts({
        payer: provider.wallet.publicKey,
        policyAccount: policyPda,
        velocityLedger: ledgerPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    try {
      await program.methods
        .initPolicy(agent, args)
        .accounts({
          payer: provider.wallet.publicKey,
          policyAccount: policyPda,
          velocityLedger: ledgerPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail("expected reinit failure but tx succeeded");
    } catch (e) {
      // Anchor's `init` constraint surfaces this as a SystemProgram allocation
      // error (account already in use) — exact message varies by version, but
      // the call must NOT succeed.
      expect(String(e)).to.match(/already in use|custom program error|0x0/i);
    }
  });
});
