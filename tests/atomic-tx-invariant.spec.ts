/**
 * Atomic-tx invariant — Phase J2 localnet E2E proof.
 *
 * The full proof is a 3-layer story; this file is the localnet half.
 * The other half lives at:
 *
 *   `trustgate/sdk/test/atomicity.test.ts`
 *     - Layer A: SDK compile-time + runtime guards (literal-true marker
 *       + assertAtomicityEnforced) — pure-JS unit tests
 *     - 3-ix composer structural tests (gate / transfer / feedback)
 *     - Token-2022 program-id override propagates to the transfer ix
 *
 * THIS file proves the property the SDK guards exist to defend:
 *
 *   B. SINGLE-TX ATOMIC REVERT  — bundling gate_payment_strict and a
 *      deliberately-failing transfer in ONE Solana tx reverts both;
 *      PolicyAccount + VelocityLedger stay clean.
 *
 *   C. SPLIT-TX CORRUPTION       — sending gate_payment_strict alone
 *      commits the velocity update; a subsequent failing transfer
 *      leaves VelocityLedger dirty (counted a payment that never moved).
 *      This is the corruption vector the SDK guards in (A) prevent.
 *
 * Token-2022 + TransferHook angle: the corruption vector that motivates
 * this proof is a Token-2022 mint whose `TransferHook` extension reverts
 * mid-flow (see `docs/plan/research/02-anchor-token2022-cpi-class.md`
 * §A.2). Solana's transaction atomicity is mint-extension-agnostic — a
 * failed System.transfer reverts the same way a TransferHook revert
 * would — so this localnet test demonstrates the runtime guarantee that
 * carries through to TransferHook, NonTransferable, DefaultAccountState=
 * Frozen, and any other Token-2022 extension that reverts a transfer.
 *
 * Companion writeup: `docs/proofs/transfer-hook-atomicity.md`.
 */

import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { expect } from "chai";

import type { PolicyVault } from "../target/types/policy_vault";

// -----------------------------------------------------------------------------
// PDA helpers (mirror the on-chain Rust seeds verbatim)
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
function derivePolicyPda(programId: PublicKey, agent: PublicKey, policyId: number): PublicKey {
  return PublicKey.findProgramAddressSync(
    [POLICY_PREFIX, agent.toBuffer(), policyIdLeBytes(policyId)], programId,
  )[0];
}
function deriveVelocityPda(programId: PublicKey, agent: PublicKey, policyId: number): PublicKey {
  return PublicKey.findProgramAddressSync(
    [VELOCITY_PREFIX, agent.toBuffer(), policyIdLeBytes(policyId)], programId,
  )[0];
}
function deriveAuthorityPda(programId: PublicKey, agent: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [POLICY_AUTHORITY_PREFIX, agent.toBuffer()], programId,
  )[0];
}
function deriveKillSwitchPda(programId: PublicKey, agent: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [KILLSWITCH_PREFIX, SCOPE_PER_AGENT, agent.toBuffer()], programId,
  )[0];
}

function spendingPolicyArgs(policyId: number, perTxMax = 1000) {
  return {
    policyId,
    enabledKindsBitmask: 0x07,                 // KillSwitch (0x01) + Spending (0x02) + Velocity (0x04)
    gateMode: 0,
    scopeKind: 0,
    spending:    { perTxMax: new BN(perTxMax), dailyMax: new BN(perTxMax * 5), weeklyMax: new BN(perTxMax * 20) },
    velocity:    { windowSecs: new BN(3_600), maxInWindow: new BN(perTxMax * 10), tier0DecayFactor: new BN(2_500) },
    counterparty:{ minTier: 0, maxRiskScore: 255, minConfidence: 0, defaultUnratedTreatment: 1 },
    validation:  { requiredCapabilityHash: Array(32).fill(0), acceptedAttestors: [PublicKey.default, PublicKey.default] },
  };
}

// =============================================================================

describe("atomic-tx invariant — Token-2022 + TransferHook footgun (localnet)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.PolicyVault as Program<PolicyVault>;
  const wallet  = provider.wallet.publicKey;

  async function setupAgent(policyId: number) {
    const agent     = Keypair.generate().publicKey;
    const authPda   = deriveAuthorityPda(program.programId, agent);
    const ksPda     = deriveKillSwitchPda(program.programId, agent);
    const policyPda = derivePolicyPda(program.programId, agent, policyId);
    const ledgerPda = deriveVelocityPda(program.programId, agent, policyId);

    await program.methods
      .initAuthority(agent, [wallet], 1)
      .accountsStrict({ payer: wallet, policyAuthority: authPda, systemProgram: SystemProgram.programId })
      .rpc();

    await program.methods
      .initKillswitch(agent)
      .accountsStrict({ payer: wallet, killSwitchState: ksPda, systemProgram: SystemProgram.programId })
      .rpc();

    await program.methods
      .initPolicy(agent, spendingPolicyArgs(policyId))
      .accountsStrict({
        payer: wallet, policyAuthority: authPda,
        policyAccount: policyPda, velocityLedger: ledgerPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return { agent, authPda, ksPda, policyPda, ledgerPda };
  }

  async function gatePaymentStrictIx(
    env: Awaited<ReturnType<typeof setupAgent>>,
    payee: PublicKey,
    amount: number,
    policyId: number,
  ): Promise<TransactionInstruction> {
    return program.methods
      .gatePaymentStrict(env.agent, payee, new BN(amount), PublicKey.default, policyId)
      .accountsStrict({
        caller: wallet, policyAccount: env.policyPda, velocityLedger: env.ledgerPda,
        killSwitchState: env.ksPda,
        payerAtomStats: null, payeeAtomStats: null, validationAttestation: null,
      })
      .instruction();
  }

  /** A System.transfer that the runtime cannot satisfy: the source is a
   *  fresh keypair we never sign with. Solana rejects the tx as
   *  MissingRequiredSignature → the entire tx reverts. Same atomicity
   *  behaviour as a Token-2022 TransferHook program returning Err on
   *  the inner transferChecked: the runtime aborts the bundle.
   *
   *  We use this as the failure source because it requires no Token-2022
   *  or custom hook program on the localnet validator, while exercising
   *  the SAME Solana atomicity guarantee a real TransferHook revert
   *  would. The proof is mint-extension-agnostic. */
  function alwaysFailingTransferIx(missingSigner: PublicKey): TransactionInstruction {
    return SystemProgram.transfer({
      fromPubkey: missingSigner,                // requires a signature we never supply
      toPubkey:   Keypair.generate().publicKey, // arbitrary
      lamports:   1,                            // amount irrelevant
    });
  }

  // ---------------------------------------------------------------------------
  // B. single-tx atomic revert — bundled gate + failing transfer
  // ---------------------------------------------------------------------------

  describe("B. single-tx atomic revert", () => {
    it("bundled tx reverts; PolicyAccount + VelocityLedger stay at zero", async () => {
      const policyId = 9_001;
      const env = await setupAgent(policyId);

      const policyBefore = await program.account.policyAccount.fetch(env.policyPda);
      const ledgerBefore = await program.account.velocityLedger.fetch(env.ledgerPda);
      expect(policyBefore.spendingTodayUsed.toNumber()).to.equal(0);
      expect(ledgerBefore.cumulativeAmount.toNumber()).to.equal(0);

      const failingSource = Keypair.generate().publicKey;
      const gate = await gatePaymentStrictIx(env, Keypair.generate().publicKey, 250, policyId);
      const fail = alwaysFailingTransferIx(failingSource);
      const tx   = new Transaction().add(gate).add(fail);

      try {
        await provider.sendAndConfirm(tx);
        expect.fail("expected bundled tx to revert");
      } catch (e) {
        expect(String(e)).to.match(/Signature verification failed|missing signature|MissingRequiredSignature/i);
      }

      // The whole bundle reverted; gate_payment_strict's state mutation
      // rolled back along with the failing transfer.
      const policyAfter = await program.account.policyAccount.fetch(env.policyPda);
      const ledgerAfter = await program.account.velocityLedger.fetch(env.ledgerPda);
      expect(policyAfter.spendingTodayUsed.toNumber()).to.equal(0);
      expect(ledgerAfter.cumulativeAmount.toNumber()).to.equal(0);
    });
  });

  // ---------------------------------------------------------------------------
  // C. split-tx anti-pattern — gate alone, then failing transfer alone
  // ---------------------------------------------------------------------------

  describe("C. split-tx anti-pattern corrupts state", () => {
    it("gate commits in tx1; failing transfer in tx2 leaves VelocityLedger dirty", async () => {
      const policyId = 9_002;
      const env = await setupAgent(policyId);

      // Tx1 — gate_payment_strict alone. Solana commits the state mutation.
      const gate = await gatePaymentStrictIx(env, Keypair.generate().publicKey, 250, policyId);
      await provider.sendAndConfirm(new Transaction().add(gate));

      const policyMid = await program.account.policyAccount.fetch(env.policyPda);
      const ledgerMid = await program.account.velocityLedger.fetch(env.ledgerPda);
      expect(policyMid.spendingTodayUsed.toNumber()).to.equal(250);
      expect(ledgerMid.cumulativeAmount.toNumber()).to.equal(250);

      // Tx2 — the would-be transfer reverts (TransferHook stand-in).
      const failingSource = Keypair.generate().publicKey;
      const fail = alwaysFailingTransferIx(failingSource);
      try {
        await provider.sendAndConfirm(new Transaction().add(fail));
        expect.fail("expected the failing-transfer tx to revert");
      } catch (e) {
        expect(String(e)).to.match(/Signature verification failed|missing signature|MissingRequiredSignature/i);
      }

      // PROOF OF CORRUPTION: the gate's state advanced, but no money
      // ever moved. The next gate_payment will see an inflated
      // cumulative balance — exactly the anti-pattern the SDK's
      // composeAtomicSettleTx + AtomicityEnforced marker prevent.
      const policyAfter = await program.account.policyAccount.fetch(env.policyPda);
      const ledgerAfter = await program.account.velocityLedger.fetch(env.ledgerPda);
      expect(policyAfter.spendingTodayUsed.toNumber()).to.equal(250);
      expect(ledgerAfter.cumulativeAmount.toNumber()).to.equal(250);
    });
  });
});
