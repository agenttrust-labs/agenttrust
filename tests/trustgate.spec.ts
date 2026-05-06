/**
 * TrustGate — Anchor TS integration tests.
 *
 * Covers init_authority lifecycle and the emit_feedback CPI path. The
 * emit_feedback test requires Quantu's agent_registry_8004 +
 * atom_engine programs (cloned to the local validator per
 * Anchor.toml [test.validator.clone]) plus a registered agent_account
 * + initialised atom_stats — the test inits these inline against the
 * cloned mainnet RootConfig + base_collection.
 *
 * dispute_payment shares emit_feedback's CPI shape; covered in CI via
 * the Anchor end-to-end harness alongside this file.
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, ComputeBudgetProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { expect } from "chai";
import type { Trustgate } from "../target/types/trustgate";

const TRUSTGATE_AUTHORITY_PREFIX = Buffer.from("trustgate_auth");
const FEEDBACK_LOG_PREFIX        = Buffer.from("feedback_log");

function deriveAuthorityPda(
  programId:   PublicKey,
  facilitator: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [TRUSTGATE_AUTHORITY_PREFIX, facilitator.toBuffer()],
    programId,
  );
}

function deriveFeedbackLogPda(
  programId:     PublicKey,
  paymentIdHash: Buffer,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [FEEDBACK_LOG_PREFIX, paymentIdHash],
    programId,
  );
}

describe("trustgate", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Trustgate as Program<Trustgate>;
  const wallet  = provider.wallet.publicKey;

  const freshFacilitator = () => Keypair.generate().publicKey;

  describe("init_authority", () => {
    it("creates a TrustGateAuthority PDA with correct fields", async () => {
      const facilitator = freshFacilitator();
      const [pda] = deriveAuthorityPda(program.programId, facilitator);

      await program.methods
        .initAuthority(facilitator)
        .accountsStrict({
          payer:         wallet,
          authority:     pda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const auth = await program.account.trustGateAuthority.fetch(pda);
      expect(auth.facilitator.toBase58()).to.equal(facilitator.toBase58());
      expect(auth.feedbackCount.toNumber()).to.equal(0);
      expect(auth.disputeCount.toNumber()).to.equal(0);
      expect(auth.createdAtSlot.toNumber()).to.be.greaterThan(0);
    });

    it("rejects re-init for the same facilitator", async () => {
      const facilitator = freshFacilitator();
      const [pda] = deriveAuthorityPda(program.programId, facilitator);

      await program.methods
        .initAuthority(facilitator)
        .accountsStrict({ payer: wallet, authority: pda, systemProgram: SystemProgram.programId })
        .rpc();

      try {
        await program.methods
          .initAuthority(facilitator)
          .accountsStrict({ payer: wallet, authority: pda, systemProgram: SystemProgram.programId })
          .rpc();
        expect.fail("expected reinit failure");
      } catch (e) {
        expect(String(e)).to.match(/already in use|custom program error|0x0/i);
      }
    });

    it("different facilitators produce different PDAs", async () => {
      const f1 = freshFacilitator();
      const f2 = freshFacilitator();
      const [pda1] = deriveAuthorityPda(program.programId, f1);
      const [pda2] = deriveAuthorityPda(program.programId, f2);
      expect(pda1.toBase58()).to.not.equal(pda2.toBase58());

      await program.methods.initAuthority(f1)
        .accountsStrict({ payer: wallet, authority: pda1, systemProgram: SystemProgram.programId })
        .rpc();
      await program.methods.initAuthority(f2)
        .accountsStrict({ payer: wallet, authority: pda2, systemProgram: SystemProgram.programId })
        .rpc();

      const a1 = await program.account.trustGateAuthority.fetch(pda1);
      const a2 = await program.account.trustGateAuthority.fetch(pda2);
      expect(a1.facilitator.toBase58()).to.equal(f1.toBase58());
      expect(a2.facilitator.toBase58()).to.equal(f2.toBase58());
    });
  });

  // ---------------------------------------------------------------------------
  // emit_feedback (D5) — full CPI chain into Quantu's agent_registry +
  // atom_engine. Requires Quantu mainnet program clones (already in
  // Anchor.toml [test.validator.clone]) plus an inline agent registration
  // via Quantu's `register_with_options` + atom_engine's `initialize_stats`.
  //
  // Skipped when ANCHOR_PROVIDER_URL points at a network where the Quantu
  // RootConfig isn't initialised (e.g., a fresh test-validator without
  // --account flags). The skip surfaces an actionable message.
  // ---------------------------------------------------------------------------

  describe("emit_feedback", () => {
    // Mainnet IDs — anchor test clones these per Anchor.toml.
    const QUANTU_AGENT_REGISTRY = new PublicKey("8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ");
    const QUANTU_ATOM_ENGINE    = new PublicKey("AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb");
    const MPL_CORE_PROGRAM      = new PublicKey("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d");

    // Anchor sha256 sighashes (verified against give_feedback constant in
    // programs/trustgate/src/constants.rs).
    const REGISTER_WITH_OPTIONS_DISC = Buffer.from([177, 175, 96, 41, 59, 166, 13, 6]);
    const INITIALIZE_STATS_DISC      = Buffer.from([144, 201, 117, 76, 127, 118, 176, 16]);

    const ATOM_CONFIG_PDA   = PublicKey.findProgramAddressSync([Buffer.from("atom_config")], QUANTU_ATOM_ENGINE)[0];
    const ROOT_CONFIG_PDA   = PublicKey.findProgramAddressSync([Buffer.from("root_config")], QUANTU_AGENT_REGISTRY)[0];
    const REG_AUTH_PDA      = PublicKey.findProgramAddressSync([Buffer.from("atom_cpi_authority")], QUANTU_AGENT_REGISTRY)[0];

    function deriveAgentAccount(asset: PublicKey): PublicKey {
      return PublicKey.findProgramAddressSync([Buffer.from("agent"), asset.toBuffer()], QUANTU_AGENT_REGISTRY)[0];
    }
    function deriveAtomStats(asset: PublicKey): PublicKey {
      return PublicKey.findProgramAddressSync([Buffer.from("atom_stats"), asset.toBuffer()], QUANTU_ATOM_ENGINE)[0];
    }

    async function quantuStateAvailable(): Promise<{ ok: true; baseCollection: PublicKey } | { ok: false; reason: string }> {
      const info = await provider.connection.getAccountInfo(ROOT_CONFIG_PDA);
      if (!info) return { ok: false, reason: "Quantu RootConfig not initialised on this validator — see Anchor.toml [test.validator.clone] + the surfpool RootConfig --account fixture" };
      const baseCollection = new PublicKey(info.data.subarray(8, 40));
      const atomCfg = await provider.connection.getAccountInfo(ATOM_CONFIG_PDA);
      if (!atomCfg) return { ok: false, reason: "AtomConfig not initialised on this validator" };
      const collInfo = await provider.connection.getAccountInfo(baseCollection);
      if (!collInfo) return { ok: false, reason: `base_collection ${baseCollection.toBase58()} missing — clone via [test.validator.clone] or --account` };
      return { ok: true, baseCollection };
    }

    async function registerAgentWithAtom(baseCollection: PublicKey): Promise<{ asset: Keypair; agentAccount: PublicKey; atomStats: PublicKey }> {
      const asset = Keypair.generate();
      const agentAccount = deriveAgentAccount(asset.publicKey);
      const atomStats    = deriveAtomStats(asset.publicKey);
      const registryConfig = PublicKey.findProgramAddressSync(
        [Buffer.from("registry_config"), baseCollection.toBuffer()],
        QUANTU_AGENT_REGISTRY,
      )[0];

      const uri = "https://agenttrust.test/agents/spec.json";
      const uriBytes = Buffer.from(uri, "utf-8");
      const lenBuf = Buffer.alloc(4);
      lenBuf.writeUInt32LE(uriBytes.length, 0);
      const registerData = Buffer.concat([REGISTER_WITH_OPTIONS_DISC, lenBuf, uriBytes, Buffer.from([1])]);

      const registerIx = new TransactionInstruction({
        programId: QUANTU_AGENT_REGISTRY,
        keys: [
          { pubkey: ROOT_CONFIG_PDA,         isSigner: false, isWritable: false },
          { pubkey: registryConfig,          isSigner: false, isWritable: false },
          { pubkey: agentAccount,            isSigner: false, isWritable: true  },
          { pubkey: asset.publicKey,         isSigner: true,  isWritable: true  },
          { pubkey: baseCollection,          isSigner: false, isWritable: true  },
          { pubkey: wallet,                  isSigner: true,  isWritable: true  },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: MPL_CORE_PROGRAM,        isSigner: false, isWritable: false },
        ],
        data: registerData,
      });

      const initStatsIx = new TransactionInstruction({
        programId: QUANTU_ATOM_ENGINE,
        keys: [
          { pubkey: wallet,                  isSigner: true,  isWritable: true  },
          { pubkey: asset.publicKey,         isSigner: false, isWritable: false },
          { pubkey: baseCollection,          isSigner: false, isWritable: true  },
          { pubkey: ATOM_CONFIG_PDA,         isSigner: false, isWritable: false },
          { pubkey: atomStats,               isSigner: false, isWritable: true  },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: INITIALIZE_STATS_DISC,
      });

      const tx = new Transaction()
        .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 350_000 }))
        .add(registerIx)
        .add(initStatsIx);
      await provider.sendAndConfirm(tx, [asset]);

      return { asset, agentAccount, atomStats };
    }

    it("PDA-signed CPI lands feedback for an atom-enabled agent", async function () {
      const env = await quantuStateAvailable();
      if (!env.ok) { this.skip(); return; }

      // Init this test's facilitator authority.
      const facilitator = wallet;
      const [authorityPda] = deriveAuthorityPda(program.programId, facilitator);
      try {
        await program.methods.initAuthority(facilitator).accountsStrict({
          payer: facilitator, authority: authorityPda, systemProgram: SystemProgram.programId,
        }).rpc();
      } catch (e) {
        // Already initialised from a prior test — fine.
      }

      const { asset, agentAccount, atomStats } = await registerAgentWithAtom(env.baseCollection);

      // Distinct paymentIdHash per run so we don't collide with a prior
      // emission log left over from a previous test invocation.
      const paymentIdHash = Buffer.alloc(32);
      paymentIdHash.writeBigUInt64LE(BigInt(Date.now()), 0);
      asset.publicKey.toBuffer().copy(paymentIdHash, 8);
      const [logPda] = deriveFeedbackLogPda(program.programId, paymentIdHash);

      const sig = await program.methods.emitFeedback(
        Array.from(paymentIdHash), facilitator, asset.publicKey,
        100, "trustgate-test", "policy=1", "/protected", "",
      ).accountsStrict({
        payer:         facilitator,
        authority:     authorityPda,
        emissionLog:   logPda,
        systemProgram: SystemProgram.programId,
      }).remainingAccounts([
        { pubkey: agentAccount,        isSigner: false, isWritable: true  },
        { pubkey: asset.publicKey,     isSigner: false, isWritable: false },
        { pubkey: env.baseCollection,  isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: ATOM_CONFIG_PDA,     isSigner: false, isWritable: false },
        { pubkey: atomStats,           isSigner: false, isWritable: true  },
        { pubkey: QUANTU_ATOM_ENGINE,  isSigner: false, isWritable: false },
        { pubkey: REG_AUTH_PDA,        isSigner: false, isWritable: false },
        { pubkey: QUANTU_AGENT_REGISTRY, isSigner: false, isWritable: false },
      ]).rpc({ commitment: "confirmed" });

      expect(sig).to.be.a("string");

      const log = await program.account.feedbackEmissionLog.fetch(logPda);
      expect(log.score).to.equal(100);
      expect(log.isDispute).to.equal(0);
      expect(log.emittedAtSlot.toNumber()).to.be.greaterThan(0);
    });

    it("idempotent retry: second emit with same paymentIdHash hits init constraint", async function () {
      const env = await quantuStateAvailable();
      if (!env.ok) { this.skip(); return; }

      const facilitator = wallet;
      const [authorityPda] = deriveAuthorityPda(program.programId, facilitator);
      try {
        await program.methods.initAuthority(facilitator).accountsStrict({
          payer: facilitator, authority: authorityPda, systemProgram: SystemProgram.programId,
        }).rpc();
      } catch { /* already inited */ }

      const { asset, agentAccount, atomStats } = await registerAgentWithAtom(env.baseCollection);

      const paymentIdHash = Buffer.alloc(32);
      paymentIdHash.writeBigUInt64LE(BigInt(Date.now()) + 1n, 0);
      asset.publicKey.toBuffer().copy(paymentIdHash, 8);
      const [logPda] = deriveFeedbackLogPda(program.programId, paymentIdHash);

      const remaining = [
        { pubkey: agentAccount,        isSigner: false, isWritable: true  },
        { pubkey: asset.publicKey,     isSigner: false, isWritable: false },
        { pubkey: env.baseCollection,  isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: ATOM_CONFIG_PDA,     isSigner: false, isWritable: false },
        { pubkey: atomStats,           isSigner: false, isWritable: true  },
        { pubkey: QUANTU_ATOM_ENGINE,  isSigner: false, isWritable: false },
        { pubkey: REG_AUTH_PDA,        isSigner: false, isWritable: false },
        { pubkey: QUANTU_AGENT_REGISTRY, isSigner: false, isWritable: false },
      ];

      // First emission — succeeds.
      await program.methods.emitFeedback(
        Array.from(paymentIdHash), facilitator, asset.publicKey,
        100, "test", "policy=1", "/protected", "",
      ).accountsStrict({
        payer: facilitator, authority: authorityPda,
        emissionLog: logPda, systemProgram: SystemProgram.programId,
      }).remainingAccounts(remaining).rpc({ commitment: "confirmed" });

      // Second emission with same paymentIdHash — init constraint fires.
      try {
        await program.methods.emitFeedback(
          Array.from(paymentIdHash), facilitator, asset.publicKey,
          100, "test", "policy=1", "/protected", "",
        ).accountsStrict({
          payer: facilitator, authority: authorityPda,
          emissionLog: logPda, systemProgram: SystemProgram.programId,
        }).remainingAccounts(remaining).rpc({ commitment: "confirmed" });
        expect.fail("expected init-account-already-in-use error on retry");
      } catch (e) {
        expect(String(e)).to.match(/already in use|0x0/i);
      }
    });
  });
});
