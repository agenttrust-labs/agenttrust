/**
 * PolicyVault — Anchor TS integration tests.
 *
 * Phase 3 surface:
 * - `init_authority` (multisig: 1..=7 members, 1..=member_count threshold, no dups)
 * - `init_killswitch` (PerAgent KillSwitchState PDA, paused=false default)
 * - `set_killswitch` (multisig-gated pause/unpause)
 * - `init_policy` (now auth-gated: payer must be in PolicyAuthority.members)
 *
 * Runs against `anchor test`'s provider cluster. Cleanly factored helpers
 * keep each test self-contained on a fresh agent_asset so PDA collisions
 * across cases are impossible.
 */

import * as anchor from "@coral-xyz/anchor";
import { BN, Program, AnchorError } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
import type { PolicyVault } from "../target/types/policy_vault";

// -----------------------------------------------------------------------------
// PDA derivation helpers
// -----------------------------------------------------------------------------

const POLICY_PREFIX           = Buffer.from("policy");
const VELOCITY_PREFIX         = Buffer.from("velocity");
const POLICY_AUTHORITY_PREFIX = Buffer.from("policy_authority");
const KILLSWITCH_PREFIX       = Buffer.from("killswitch");
const SCOPE_PER_AGENT         = Buffer.from([2]);

function policyIdLeBytes(policyId: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(policyId, 0);
  return buf;
}

function derivePolicyPda(programId: PublicKey, agent: PublicKey, policyId: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POLICY_PREFIX, agent.toBuffer(), policyIdLeBytes(policyId)],
    programId,
  );
}

function deriveVelocityPda(programId: PublicKey, agent: PublicKey, policyId: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VELOCITY_PREFIX, agent.toBuffer(), policyIdLeBytes(policyId)],
    programId,
  );
}

function deriveAuthorityPda(programId: PublicKey, agent: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POLICY_AUTHORITY_PREFIX, agent.toBuffer()],
    programId,
  );
}

function deriveKillSwitchPda(programId: PublicKey, agent: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [KILLSWITCH_PREFIX, SCOPE_PER_AGENT, agent.toBuffer()],
    programId,
  );
}

// -----------------------------------------------------------------------------
// InitPolicy default args (overridable per test)
// -----------------------------------------------------------------------------

function defaultArgs(policyId: number) {
  return {
    policyId,
    enabledKindsBitmask: 0x02, // Spending only
    gateMode: 0,
    scopeKind: 0,
    spending:    { perTxMax: new BN(100), dailyMax: new BN(500), weeklyMax: new BN(2_000) },
    velocity:    { windowSecs: new BN(3_600), maxInWindow: new BN(1_000), tier0DecayFactor: new BN(2_500) },
    counterparty:{ minTier: 0, maxRiskScore: 255, minConfidence: 0, defaultUnratedTreatment: 1 },
    validation:  { requiredCapabilityHash: Array(32).fill(0), acceptedAttestors: [PublicKey.default, PublicKey.default] },
  };
}

// =============================================================================

describe("policy-vault", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PolicyVault as Program<PolicyVault>;
  const wallet  = provider.wallet.publicKey;

  const freshAgent = () => Keypair.generate().publicKey;

  // Helpers that wrap the 3 init flows for a given agent.
  async function initAuthorityFor(
    agent: PublicKey,
    members: PublicKey[] = [wallet],
    threshold: number = 1,
  ): Promise<PublicKey> {
    const [pda] = deriveAuthorityPda(program.programId, agent);
    await program.methods
      .initAuthority(agent, members, threshold)
      .accountsStrict({
        payer: wallet,
        policyAuthority: pda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    return pda;
  }

  async function initKillSwitchFor(agent: PublicKey): Promise<PublicKey> {
    const [pda] = deriveKillSwitchPda(program.programId, agent);
    await program.methods
      .initKillswitch(agent)
      .accountsStrict({
        payer: wallet,
        killSwitchState: pda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    return pda;
  }

  async function initPolicyFor(agent: PublicKey, args: ReturnType<typeof defaultArgs>) {
    const [authPda]   = deriveAuthorityPda(program.programId, agent);
    const [policyPda] = derivePolicyPda(program.programId, agent, args.policyId);
    const [ledgerPda] = deriveVelocityPda(program.programId, agent, args.policyId);
    return program.methods
      .initPolicy(agent, args)
      .accountsStrict({
        payer: wallet,
        policyAuthority: authPda,
        policyAccount: policyPda,
        velocityLedger: ledgerPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  // ---------------------------------------------------------------------------
  // init_authority
  // ---------------------------------------------------------------------------

  describe("init_authority", () => {
    it("creates a 1-of-1 authority and stores members[]", async () => {
      const agent = freshAgent();
      const pda   = await initAuthorityFor(agent, [wallet], 1);
      const auth  = await program.account.policyAuthority.fetch(pda);
      expect(auth.payerAgentAsset.toBase58()).to.equal(agent.toBase58());
      expect(auth.threshold).to.equal(1);
      expect(auth.memberCount).to.equal(1);
      expect(auth.members[0].toBase58()).to.equal(wallet.toBase58());
    });

    it("rejects threshold > member_count", async () => {
      const agent = freshAgent();
      try {
        await initAuthorityFor(agent, [wallet], 5);
        expect.fail("expected ThresholdExceedsMembers");
      } catch (e) {
        expect((e as AnchorError).error.errorCode.code).to.equal("ThresholdExceedsMembers");
      }
    });

    it("rejects duplicate members", async () => {
      const agent  = freshAgent();
      const second = Keypair.generate().publicKey;
      try {
        await initAuthorityFor(agent, [wallet, wallet, second], 2);
        expect.fail("expected DuplicateAuthorityMember");
      } catch (e) {
        expect((e as AnchorError).error.errorCode.code).to.equal("DuplicateAuthorityMember");
      }
    });

    it("rejects payer not included in members", async () => {
      const agent     = freshAgent();
      const outsider1 = Keypair.generate().publicKey;
      const outsider2 = Keypair.generate().publicKey;
      try {
        await initAuthorityFor(agent, [outsider1, outsider2], 1);
        expect.fail("expected MemberNotInAuthority");
      } catch (e) {
        expect((e as AnchorError).error.errorCode.code).to.equal("MemberNotInAuthority");
      }
    });

    it("rejects member_count of zero", async () => {
      const agent = freshAgent();
      try {
        await initAuthorityFor(agent, [], 1);
        expect.fail("expected MemberCountOutOfRange");
      } catch (e) {
        expect((e as AnchorError).error.errorCode.code).to.equal("MemberCountOutOfRange");
      }
    });
  });

  // ---------------------------------------------------------------------------
  // init_killswitch
  // ---------------------------------------------------------------------------

  describe("init_killswitch", () => {
    it("creates KillSwitchState with paused=false and PerAgent scope", async () => {
      const agent = freshAgent();
      await initAuthorityFor(agent);
      const pda = await initKillSwitchFor(agent);
      const ks  = await program.account.killSwitchState.fetch(pda);
      expect(ks.paused).to.equal(false);
      expect(ks.scopeKind).to.equal(2); // SCOPE_PER_AGENT
      expect(ks.pausedAtSlot.toNumber()).to.equal(0);
      expect(ks.unpausedAtSlot.toNumber()).to.equal(0);
    });
  });

  // ---------------------------------------------------------------------------
  // set_killswitch
  // ---------------------------------------------------------------------------

  describe("set_killswitch", () => {
    it("1-of-1 multisig can pause and unpause", async () => {
      const agent     = freshAgent();
      const [authPda] = deriveAuthorityPda(program.programId, agent);
      await initAuthorityFor(agent, [wallet], 1);
      const ksPda = await initKillSwitchFor(agent);

      // pause
      await program.methods
        .setKillswitch(agent, true)
        .accountsStrict({ signer: wallet, policyAuthority: authPda, killSwitchState: ksPda })
        .rpc();
      let ks = await program.account.killSwitchState.fetch(ksPda);
      expect(ks.paused).to.equal(true);
      expect(ks.pausedAtSlot.toNumber()).to.be.greaterThan(0);
      expect(ks.pausedBy.toBase58()).to.equal(wallet.toBase58());

      // unpause
      await program.methods
        .setKillswitch(agent, false)
        .accountsStrict({ signer: wallet, policyAuthority: authPda, killSwitchState: ksPda })
        .rpc();
      ks = await program.account.killSwitchState.fetch(ksPda);
      expect(ks.paused).to.equal(false);
      expect(ks.unpausedAtSlot.toNumber()).to.be.greaterThan(0);
    });

    it("fails when distinct signers are below threshold", async () => {
      const agent     = freshAgent();
      const second    = Keypair.generate().publicKey;
      const [authPda] = deriveAuthorityPda(program.programId, agent);
      await initAuthorityFor(agent, [wallet, second], 2);
      const ksPda = await initKillSwitchFor(agent);

      try {
        // Lead signer alone = 1 distinct member; threshold = 2.
        await program.methods
          .setKillswitch(agent, true)
          .accountsStrict({ signer: wallet, policyAuthority: authPda, killSwitchState: ksPda })
          .rpc();
        expect.fail("expected MultisigThresholdNotMet");
      } catch (e) {
        expect((e as AnchorError).error.errorCode.code).to.equal("MultisigThresholdNotMet");
      }
    });

    it("fails when lead signer is not in members (MemberNotInAuthority)", async () => {
      const agent     = freshAgent();
      const stranger  = Keypair.generate();
      const [authPda] = deriveAuthorityPda(program.programId, agent);

      // Fund the stranger so they can pay tx fees.
      const airdropSig = await provider.connection.requestAirdrop(stranger.publicKey, 1_000_000_000);
      await provider.connection.confirmTransaction(airdropSig, "confirmed");

      // Authority has wallet only — stranger is NOT a member.
      await initAuthorityFor(agent, [wallet], 1);
      const ksPda = await initKillSwitchFor(agent);

      try {
        await program.methods
          .setKillswitch(agent, true)
          .accountsStrict({
            signer: stranger.publicKey,
            policyAuthority: authPda,
            killSwitchState: ksPda,
          })
          .signers([stranger])
          .rpc();
        expect.fail("expected MemberNotInAuthority for non-member lead signer");
      } catch (e) {
        expect((e as AnchorError).error.errorCode.code).to.equal("MemberNotInAuthority");
      }
    });
  });

  // ---------------------------------------------------------------------------
  // init_policy (auth-gated as of Phase 3)
  // ---------------------------------------------------------------------------

  describe("init_policy", () => {
    it("creates PolicyAccount + VelocityLedger with the configured fields", async () => {
      const agent = freshAgent();
      await initAuthorityFor(agent);
      const args = defaultArgs(1);
      await initPolicyFor(agent, args);

      const [policyPda] = derivePolicyPda(program.programId, agent, args.policyId);
      const policy = await program.account.policyAccount.fetch(policyPda);
      expect(policy.payerAgentAsset.toBase58()).to.equal(agent.toBase58());
      expect(policy.policyId).to.equal(args.policyId);
      expect(policy.enabledKindsBitmask).to.equal(args.enabledKindsBitmask);
      expect(policy.gateMode).to.equal(args.gateMode);
      expect(policy.scopeKind).to.equal(args.scopeKind);
      expect(policy.spendingPerTxMax.toNumber()).to.equal(100);
      expect(policy.spendingDailyMax.toNumber()).to.equal(500);
      expect(policy.spendingWeeklyMax.toNumber()).to.equal(2_000);
      expect(policy.minCounterpartyTier).to.equal(0);
      expect(policy.maxRiskScore).to.equal(255);
      expect(policy.minConfidence).to.equal(0);
      expect(policy.defaultUnratedTreatment).to.equal(1);

      const [ledgerPda] = deriveVelocityPda(program.programId, agent, args.policyId);
      const ledger = await program.account.velocityLedger.fetch(ledgerPda);
      expect(ledger.cumulativeAmount.toNumber()).to.equal(0);
      expect(ledger.windowStartSlot.toNumber()).to.equal(0);
    });

    it("rejects invalid gate_mode (>1)", async () => {
      const agent = freshAgent();
      await initAuthorityFor(agent);
      const args = { ...defaultArgs(2), gateMode: 9 };
      try {
        await initPolicyFor(agent, args);
        expect.fail("expected InvalidGateMode");
      } catch (e) {
        expect((e as AnchorError).error.errorCode.code).to.equal("InvalidGateMode");
      }
    });

    it("rejects invalid scope_kind (>2)", async () => {
      const agent = freshAgent();
      await initAuthorityFor(agent);
      const args = { ...defaultArgs(3), scopeKind: 9 };
      try {
        await initPolicyFor(agent, args);
        expect.fail("expected InvalidScopeKind");
      } catch (e) {
        expect((e as AnchorError).error.errorCode.code).to.equal("InvalidScopeKind");
      }
    });

    it("rejects enabled_kinds_bitmask with bits outside KIND_*", async () => {
      const agent = freshAgent();
      await initAuthorityFor(agent);
      const args = { ...defaultArgs(4), enabledKindsBitmask: 0xFF };
      try {
        await initPolicyFor(agent, args);
        expect.fail("expected InvalidEnabledKinds");
      } catch (e) {
        expect((e as AnchorError).error.errorCode.code).to.equal("InvalidEnabledKinds");
      }
    });

    it("rejects counterparty.min_tier > 4", async () => {
      const agent = freshAgent();
      await initAuthorityFor(agent);
      const args = defaultArgs(5);
      args.counterparty.minTier = 9;
      try {
        await initPolicyFor(agent, args);
        expect.fail("expected InvalidCounterpartyTier");
      } catch (e) {
        expect((e as AnchorError).error.errorCode.code).to.equal("InvalidCounterpartyTier");
      }
    });

    it("rejects counterparty.min_confidence > 10000", async () => {
      const agent = freshAgent();
      await initAuthorityFor(agent);
      const args = defaultArgs(6);
      args.counterparty.minConfidence = 50_000;
      try {
        await initPolicyFor(agent, args);
        expect.fail("expected InvalidConfidence");
      } catch (e) {
        expect((e as AnchorError).error.errorCode.code).to.equal("InvalidConfidence");
      }
    });

    it("rejects counterparty.default_unrated_treatment outside {0,1,2}", async () => {
      const agent = freshAgent();
      await initAuthorityFor(agent);
      const args = defaultArgs(7);
      args.counterparty.defaultUnratedTreatment = 9;
      try {
        await initPolicyFor(agent, args);
        expect.fail("expected InvalidUnratedTreatment");
      } catch (e) {
        expect((e as AnchorError).error.errorCode.code).to.equal("InvalidUnratedTreatment");
      }
    });

    it("rejects re-init with the same (agent, policy_id) seeds", async () => {
      const agent = freshAgent();
      await initAuthorityFor(agent);
      const args = defaultArgs(8);
      await initPolicyFor(agent, args);
      try {
        await initPolicyFor(agent, args);
        expect.fail("expected reinit failure");
      } catch (e) {
        expect(String(e)).to.match(/already in use|custom program error|0x0/i);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // gate_payment (Phase 4)
  // ---------------------------------------------------------------------------

  describe("gate_payment", () => {
    // Spending + KillSwitch enabled (0x01 | 0x02 = 0x03). Avoids needing
    // foreign atom-engine accounts for tier reads in Phase 4 tests.
    const BITMASK_SPENDING_PLUS_KILLSWITCH = 0x03;
    const BITMASK_VELOCITY_ONLY            = 0x04;
    const BITMASK_SPENDING_PLUS_VELOCITY   = 0x06;

    /// Setup helper — init_authority + init_killswitch + init_policy with the
    /// given bitmask. Returns the PDAs the test will need.
    async function setupAgentWithPolicy(
      bitmask: number,
      policyId: number,
      perTxMax: number = 100,
    ) {
      const agent = freshAgent();
      const [authPda] = deriveAuthorityPda(program.programId, agent);
      const [ksPda]   = deriveKillSwitchPda(program.programId, agent);
      const [policyPda] = derivePolicyPda(program.programId, agent, policyId);
      const [ledgerPda] = deriveVelocityPda(program.programId, agent, policyId);

      await initAuthorityFor(agent);
      await initKillSwitchFor(agent);

      const args = { ...defaultArgs(policyId), enabledKindsBitmask: bitmask };
      args.spending.perTxMax = new BN(perTxMax);
      args.spending.dailyMax = new BN(perTxMax * 5);
      args.spending.weeklyMax = new BN(perTxMax * 20);
      args.velocity.maxInWindow = new BN(perTxMax * 10);
      await initPolicyFor(agent, args);

      return { agent, authPda, ksPda, policyPda, ledgerPda };
    }

    async function callGatePayment(
      env: Awaited<ReturnType<typeof setupAgentWithPolicy>>,
      payee: PublicKey,
      amount: number,
      policyId: number,
    ) {
      return program.methods
        .gatePayment(env.agent, payee, new BN(amount), PublicKey.default, policyId)
        .accountsStrict({
          caller:          wallet,
          policyAccount:   env.policyPda,
          velocityLedger:  env.ledgerPda,
          killSwitchState: env.ksPda,
          payerAtomStats:        null,
          payeeAtomStats:        null,
          validationAttestation: null,
        })
        .rpc();
    }

    it("Allow updates spending_today_used + spending_today_anchor", async () => {
      const env = await setupAgentWithPolicy(BITMASK_SPENDING_PLUS_KILLSWITCH, 100);
      await callGatePayment(env, freshAgent(), 50, 100);

      const policy = await program.account.policyAccount.fetch(env.policyPda);
      expect(policy.spendingTodayUsed.toNumber()).to.equal(50);
      // anchor is day-index since epoch — must be > 0 in 2026.
      expect(policy.spendingTodayAnchor.toNumber()).to.be.greaterThan(20_000);
    });

    it("two consecutive Allow calls accumulate spending_today_used", async () => {
      const env = await setupAgentWithPolicy(BITMASK_SPENDING_PLUS_KILLSWITCH, 101);
      await callGatePayment(env, freshAgent(), 30, 101);
      await callGatePayment(env, freshAgent(), 25, 101);

      const policy = await program.account.policyAccount.fetch(env.policyPda);
      expect(policy.spendingTodayUsed.toNumber()).to.equal(55);
    });

    it("KillSwitch paused causes Deny — no state mutation", async () => {
      const env = await setupAgentWithPolicy(BITMASK_SPENDING_PLUS_KILLSWITCH, 102);

      // Pause the agent's KillSwitchState.
      await program.methods
        .setKillswitch(env.agent, true)
        .accountsStrict({ signer: wallet, policyAuthority: env.authPda, killSwitchState: env.ksPda })
        .rpc();

      // gate_payment now returns Deny — tx succeeds but spending counters DON'T move.
      await callGatePayment(env, freshAgent(), 50, 102);

      const policy = await program.account.policyAccount.fetch(env.policyPda);
      expect(policy.spendingTodayUsed.toNumber()).to.equal(0); // unchanged
    });

    it("Spending per-tx exceeded causes Deny — no state mutation", async () => {
      const env = await setupAgentWithPolicy(BITMASK_SPENDING_PLUS_KILLSWITCH, 103, /*perTxMax*/ 100);
      // amount > per_tx_max → Deny(SpendingPerTxExceeded)
      await callGatePayment(env, freshAgent(), 200, 103);

      const policy = await program.account.policyAccount.fetch(env.policyPda);
      expect(policy.spendingTodayUsed.toNumber()).to.equal(0);
    });

    it("Velocity Allow updates VelocityLedger.cumulative_amount", async () => {
      const env = await setupAgentWithPolicy(BITMASK_VELOCITY_ONLY, 104);
      await callGatePayment(env, freshAgent(), 70, 104);

      const ledger = await program.account.velocityLedger.fetch(env.ledgerPda);
      expect(ledger.cumulativeAmount.toNumber()).to.equal(70);
      expect(ledger.lastCommitSlot.toNumber()).to.be.greaterThan(0);
    });

    it("Spending + Velocity Allow updates BOTH counters atomically", async () => {
      const env = await setupAgentWithPolicy(BITMASK_SPENDING_PLUS_VELOCITY, 105);
      await callGatePayment(env, freshAgent(), 40, 105);

      const policy = await program.account.policyAccount.fetch(env.policyPda);
      const ledger = await program.account.velocityLedger.fetch(env.ledgerPda);
      expect(policy.spendingTodayUsed.toNumber()).to.equal(40);
      expect(ledger.cumulativeAmount.toNumber()).to.equal(40);
    });

    it("Velocity window exceeded causes Deny — cumulative does not advance", async () => {
      // VELOCITY_ONLY bitmask so Spending limits don't compete for the deny path.
      const policyId = 106;
      const agent = freshAgent();
      await initAuthorityFor(agent);
      await initKillSwitchFor(agent);

      const args = { ...defaultArgs(policyId), enabledKindsBitmask: BITMASK_VELOCITY_ONLY };
      args.velocity.maxInWindow = new BN(1000);
      await initPolicyFor(agent, args);

      const env = {
        agent,
        authPda:   deriveAuthorityPda(program.programId, agent)[0],
        ksPda:     deriveKillSwitchPda(program.programId, agent)[0],
        policyPda: derivePolicyPda(program.programId, agent, policyId)[0],
        ledgerPda: deriveVelocityPda(program.programId, agent, policyId)[0],
      };

      // 2 calls at 500 each = 1000 cumulative (right at the velocity cap).
      await callGatePayment(env, freshAgent(), 500, policyId);
      await callGatePayment(env, freshAgent(), 500, policyId);
      const ledgerMid = await program.account.velocityLedger.fetch(env.ledgerPda);
      expect(ledgerMid.cumulativeAmount.toNumber()).to.equal(1000);

      // 3rd call would push cumulative to 1500 > 1000 → Velocity denies.
      await callGatePayment(env, freshAgent(), 500, policyId);
      const ledgerAfter = await program.account.velocityLedger.fetch(env.ledgerPda);
      expect(ledgerAfter.cumulativeAmount.toNumber()).to.equal(1000);
    });
  });

  // ---------------------------------------------------------------------------
  // gate_payment_strict (D2) — Allow returns Ok, non-Allow reverts the tx.
  // Same accounts and args as gate_payment; the difference is the
  // caller-visible result. Used by SDK's composeAtomicSettleTx so a Deny
  // on the gate fails the entire atomic settle (gate + transfer + emit).
  // ---------------------------------------------------------------------------

  describe("gate_payment_strict", () => {
    const BITMASK_SPENDING_PLUS_KILLSWITCH = 0x03;

    async function setupForStrict(
      bitmask: number,
      policyId: number,
      perTxMax: number = 100,
    ) {
      const agent = freshAgent();
      const ksPda     = deriveKillSwitchPda(program.programId, agent)[0];
      const authPda   = deriveAuthorityPda(program.programId, agent)[0];
      const policyPda = derivePolicyPda(program.programId, agent, policyId)[0];
      const ledgerPda = deriveVelocityPda(program.programId, agent, policyId)[0];

      await initAuthorityFor(agent);
      await initKillSwitchFor(agent);

      const args = { ...defaultArgs(policyId), enabledKindsBitmask: bitmask };
      args.spending.perTxMax  = new BN(perTxMax);
      args.spending.dailyMax  = new BN(perTxMax * 5);
      args.spending.weeklyMax = new BN(perTxMax * 20);
      args.velocity.maxInWindow = new BN(perTxMax * 10);
      await initPolicyFor(agent, args);

      return { agent, authPda, ksPda, policyPda, ledgerPda };
    }

    async function callStrict(
      env:      Awaited<ReturnType<typeof setupForStrict>>,
      payee:    PublicKey,
      amount:   number,
      policyId: number,
    ) {
      return program.methods
        .gatePaymentStrict(env.agent, payee, new BN(amount), PublicKey.default, policyId)
        .accountsStrict({
          caller:                wallet,
          policyAccount:         env.policyPda,
          velocityLedger:        env.ledgerPda,
          killSwitchState:       env.ksPda,
          payerAtomStats:        null,
          payeeAtomStats:        null,
          validationAttestation: null,
        })
        .rpc();
    }

    it("Allow path returns Ok + commits the same state mutations as gate_payment", async () => {
      const env = await setupForStrict(BITMASK_SPENDING_PLUS_KILLSWITCH, 200);
      await callStrict(env, freshAgent(), 50, 200);

      const policy = await program.account.policyAccount.fetch(env.policyPda);
      expect(policy.spendingTodayUsed.toNumber()).to.equal(50);
    });

    it("Deny on Spending per-tx limit reverts the tx with SpendingPerTxExceeded", async () => {
      const env = await setupForStrict(BITMASK_SPENDING_PLUS_KILLSWITCH, 201, /*perTxMax*/ 100);
      try {
        await callStrict(env, freshAgent(), 200, 201);
        expect.fail("expected gate_payment_strict to revert on per-tx exceed");
      } catch (e) {
        expect(String(e)).to.match(/SpendingPerTxExceeded|6001/);
      }
      const policy = await program.account.policyAccount.fetch(env.policyPda);
      expect(policy.spendingTodayUsed.toNumber()).to.equal(0); // unchanged
    });

    it("KillSwitch paused reverts the tx with KillSwitchEngaged", async () => {
      const env = await setupForStrict(BITMASK_SPENDING_PLUS_KILLSWITCH, 202);
      await program.methods
        .setKillswitch(env.agent, true)
        .accountsStrict({ signer: wallet, policyAuthority: env.authPda, killSwitchState: env.ksPda })
        .rpc();

      try {
        await callStrict(env, freshAgent(), 50, 202);
        expect.fail("expected gate_payment_strict to revert when paused");
      } catch (e) {
        expect(String(e)).to.match(/KillSwitchEngaged|6040/);
      }
    });

    it("Allow then Deny flips correctly — only the Allow leaks state", async () => {
      const env = await setupForStrict(BITMASK_SPENDING_PLUS_KILLSWITCH, 203, /*perTxMax*/ 100);
      await callStrict(env, freshAgent(), 80, 203); // Allow → spending = 80

      try {
        await callStrict(env, freshAgent(), 200, 203); // Deny → reverts
        expect.fail("expected revert");
      } catch (e) {
        expect(String(e)).to.match(/SpendingPerTxExceeded|6001/);
      }
      const policy = await program.account.policyAccount.fetch(env.policyPda);
      expect(policy.spendingTodayUsed.toNumber()).to.equal(80);
    });

    it("Daily cap exceeded reverts with SpendingDailyExceeded — counters frozen", async () => {
      // perTxMax=100, dailyMax=500. Five 100-unit calls fill the daily bucket
      // exactly; the sixth must revert without advancing the counter.
      const env = await setupForStrict(BITMASK_SPENDING_PLUS_KILLSWITCH, 210, /*perTxMax*/ 100);
      for (let i = 0; i < 5; i++) await callStrict(env, freshAgent(), 100, 210);
      const mid = await program.account.policyAccount.fetch(env.policyPda);
      expect(mid.spendingTodayUsed.toNumber()).to.equal(500);

      try {
        await callStrict(env, freshAgent(), 100, 210);
        expect.fail("expected gate_payment_strict to revert on daily exceed");
      } catch (e) {
        expect(String(e)).to.match(/SpendingDailyExceeded|6002/);
      }
      const after = await program.account.policyAccount.fetch(env.policyPda);
      expect(after.spendingTodayUsed.toNumber()).to.equal(500); // unchanged
    });

    it("Weekly cap exceeded reverts with SpendingWeeklyExceeded — counters frozen", async () => {
      // Use a tighter weekly cap so we don't have to roll the day forward.
      // perTxMax=100, dailyMax=500, weeklyMax=300 → second 200-unit call
      // pushes weekly to 400 > 300 cap.
      const policyId = 211;
      const agent = freshAgent();
      await initAuthorityFor(agent);
      await initKillSwitchFor(agent);
      const args = { ...defaultArgs(policyId), enabledKindsBitmask: BITMASK_SPENDING_PLUS_KILLSWITCH };
      args.spending.perTxMax  = new BN(200);
      args.spending.dailyMax  = new BN(500);
      args.spending.weeklyMax = new BN(300);
      await initPolicyFor(agent, args);

      const ksPda     = deriveKillSwitchPda(program.programId, agent)[0];
      const policyPda = derivePolicyPda(program.programId, agent, policyId)[0];
      const ledgerPda = deriveVelocityPda(program.programId, agent, policyId)[0];

      await program.methods
        .gatePaymentStrict(agent, freshAgent(), new BN(200), PublicKey.default, policyId)
        .accountsStrict({
          caller: wallet, policyAccount: policyPda, velocityLedger: ledgerPda,
          killSwitchState: ksPda, payerAtomStats: null, payeeAtomStats: null, validationAttestation: null,
        }).rpc();

      try {
        await program.methods
          .gatePaymentStrict(agent, freshAgent(), new BN(200), PublicKey.default, policyId)
          .accountsStrict({
            caller: wallet, policyAccount: policyPda, velocityLedger: ledgerPda,
            killSwitchState: ksPda, payerAtomStats: null, payeeAtomStats: null, validationAttestation: null,
          }).rpc();
        expect.fail("expected gate_payment_strict to revert on weekly exceed");
      } catch (e) {
        expect(String(e)).to.match(/SpendingWeeklyExceeded|6003/);
      }
      const after = await program.account.policyAccount.fetch(policyPda);
      expect(after.spendingTodayUsed.toNumber()).to.equal(200); // first call only
    });

    it("Velocity window cap exceeded reverts with VelocityWindowExceeded", async () => {
      const policyId = 212;
      const agent = freshAgent();
      await initAuthorityFor(agent);
      await initKillSwitchFor(agent);
      const args = { ...defaultArgs(policyId), enabledKindsBitmask: 0x04 /* velocity only */ };
      args.velocity.maxInWindow = new BN(500);
      await initPolicyFor(agent, args);

      const ksPda     = deriveKillSwitchPda(program.programId, agent)[0];
      const policyPda = derivePolicyPda(program.programId, agent, policyId)[0];
      const ledgerPda = deriveVelocityPda(program.programId, agent, policyId)[0];

      // 500 in one shot: at the cap (allowed).
      await program.methods
        .gatePaymentStrict(agent, freshAgent(), new BN(500), PublicKey.default, policyId)
        .accountsStrict({
          caller: wallet, policyAccount: policyPda, velocityLedger: ledgerPda,
          killSwitchState: ksPda, payerAtomStats: null, payeeAtomStats: null, validationAttestation: null,
        }).rpc();

      try {
        await program.methods
          .gatePaymentStrict(agent, freshAgent(), new BN(1), PublicKey.default, policyId)
          .accountsStrict({
            caller: wallet, policyAccount: policyPda, velocityLedger: ledgerPda,
            killSwitchState: ksPda, payerAtomStats: null, payeeAtomStats: null, validationAttestation: null,
          }).rpc();
        expect.fail("expected gate_payment_strict to revert on velocity exceed");
      } catch (e) {
        expect(String(e)).to.match(/VelocityWindowExceeded|6010/);
      }
      const ledger = await program.account.velocityLedger.fetch(ledgerPda);
      expect(ledger.cumulativeAmount.toNumber()).to.equal(500); // unchanged after revert
    });
  });

  // ---------------------------------------------------------------------------
  // Multisig coverage — extends set_killswitch with the N=N (unanimous) edge.
  // The 1-of-1 + threshold-not-met edges are above. N=N+1 is structurally
  // impossible at init_authority time and is covered by ThresholdExceedsMembers.
  // ---------------------------------------------------------------------------

  describe("multisig N=N (unanimous)", () => {
    it("3-of-3 set_killswitch requires all three distinct signers", async () => {
      const agent     = freshAgent();
      const a = Keypair.generate();
      const b = Keypair.generate();
      const [authPda] = deriveAuthorityPda(program.programId, agent);

      // Fund both extra signers so they can co-sign the tx.
      for (const k of [a, b]) {
        const sig = await provider.connection.requestAirdrop(k.publicKey, 1_000_000_000);
        await provider.connection.confirmTransaction(sig, "confirmed");
      }

      await program.methods
        .initAuthority(agent, [wallet, a.publicKey, b.publicKey], 3)
        .accountsStrict({ payer: wallet, policyAuthority: authPda, systemProgram: SystemProgram.programId })
        .rpc();

      const ksPda = await initKillSwitchFor(agent);

      // Lead signer alone with threshold=3 → MultisigThresholdNotMet.
      try {
        await program.methods
          .setKillswitch(agent, true)
          .accountsStrict({ signer: wallet, policyAuthority: authPda, killSwitchState: ksPda })
          .rpc();
        expect.fail("expected MultisigThresholdNotMet for lead-only at N=3");
      } catch (e) {
        expect((e as AnchorError).error.errorCode.code).to.equal("MultisigThresholdNotMet");
      }

      // Lead + a + b all signing → set_killswitch handler walks
      // `remaining_accounts` for additional `is_signer: true` members,
      // dedups against policy_authority.members, and requires
      // distinct_count >= threshold.
      const sig = await program.methods
        .setKillswitch(agent, true)
        .accountsStrict({ signer: wallet, policyAuthority: authPda, killSwitchState: ksPda })
        .remainingAccounts([
          { pubkey: a.publicKey, isSigner: true, isWritable: false },
          { pubkey: b.publicKey, isSigner: true, isWritable: false },
        ])
        .signers([a, b])
        .rpc();
      expect(sig).to.be.a("string");

      const ks = await program.account.killSwitchState.fetch(ksPda);
      expect(ks.paused).to.equal(true);
      expect(ks.pausedBy.toBase58()).to.equal(wallet.toBase58());
    });
  });

  // ---------------------------------------------------------------------------
  // Atomic-tx coverage — gate_payment_strict and set_killswitch in the same
  // transaction. Catches any state-mutation race between the gate's commit
  // path and a concurrent killswitch flip: the entire tx must commit-or-revert
  // as one, never half-way.
  // ---------------------------------------------------------------------------

  describe("gate_payment_strict + set_killswitch atomic", () => {
    const BITMASK_SPENDING_PLUS_KILLSWITCH = 0x03;

    it("gate runs before killswitch flip — both commit atomically", async () => {
      const policyId = 220;
      const agent = freshAgent();
      const [authPda] = deriveAuthorityPda(program.programId, agent);
      await initAuthorityFor(agent);
      await initKillSwitchFor(agent);
      const args = { ...defaultArgs(policyId), enabledKindsBitmask: BITMASK_SPENDING_PLUS_KILLSWITCH };
      args.spending.perTxMax = new BN(100);
      await initPolicyFor(agent, args);

      const ksPda     = deriveKillSwitchPda(program.programId, agent)[0];
      const policyPda = derivePolicyPda(program.programId, agent, policyId)[0];
      const ledgerPda = deriveVelocityPda(program.programId, agent, policyId)[0];

      const gateIx = await program.methods
        .gatePaymentStrict(agent, freshAgent(), new BN(50), PublicKey.default, policyId)
        .accountsStrict({
          caller: wallet, policyAccount: policyPda, velocityLedger: ledgerPda,
          killSwitchState: ksPda, payerAtomStats: null, payeeAtomStats: null, validationAttestation: null,
        }).instruction();

      const flipIx = await program.methods
        .setKillswitch(agent, true)
        .accountsStrict({ signer: wallet, policyAuthority: authPda, killSwitchState: ksPda })
        .instruction();

      // Same tx, gate then flip. Both must commit.
      const tx = new anchor.web3.Transaction().add(gateIx).add(flipIx);
      await provider.sendAndConfirm(tx);

      const policy = await program.account.policyAccount.fetch(policyPda);
      expect(policy.spendingTodayUsed.toNumber()).to.equal(50);
      const ks = await program.account.killSwitchState.fetch(ksPda);
      expect(ks.paused).to.equal(true);
    });

    it("killswitch flip before gate — gate reverts, flip rolled back", async () => {
      const policyId = 221;
      const agent = freshAgent();
      const [authPda] = deriveAuthorityPda(program.programId, agent);
      await initAuthorityFor(agent);
      await initKillSwitchFor(agent);
      const args = { ...defaultArgs(policyId), enabledKindsBitmask: BITMASK_SPENDING_PLUS_KILLSWITCH };
      args.spending.perTxMax = new BN(100);
      await initPolicyFor(agent, args);

      const ksPda     = deriveKillSwitchPda(program.programId, agent)[0];
      const policyPda = derivePolicyPda(program.programId, agent, policyId)[0];
      const ledgerPda = deriveVelocityPda(program.programId, agent, policyId)[0];

      const flipIx = await program.methods
        .setKillswitch(agent, true)
        .accountsStrict({ signer: wallet, policyAuthority: authPda, killSwitchState: ksPda })
        .instruction();

      const gateIx = await program.methods
        .gatePaymentStrict(agent, freshAgent(), new BN(50), PublicKey.default, policyId)
        .accountsStrict({
          caller: wallet, policyAccount: policyPda, velocityLedger: ledgerPda,
          killSwitchState: ksPda, payerAtomStats: null, payeeAtomStats: null, validationAttestation: null,
        }).instruction();

      // flip then gate. gate must see paused=true and revert; the flip
      // rolls back too because the whole tx fails.
      const tx = new anchor.web3.Transaction().add(flipIx).add(gateIx);
      try {
        await provider.sendAndConfirm(tx);
        expect.fail("expected tx to revert when gate fires after killswitch flip");
      } catch (e) {
        expect(String(e)).to.match(/KillSwitchEngaged|6040/);
      }

      // Both effects rolled back: killswitch still false, spending still 0.
      const ks = await program.account.killSwitchState.fetch(ksPda);
      expect(ks.paused).to.equal(false);
      const policy = await program.account.policyAccount.fetch(policyPda);
      expect(policy.spendingTodayUsed.toNumber()).to.equal(0);
    });
  });
});
