/**
 * TrustGate — Anchor TS integration tests.
 *
 * Phase 6 surface: `init_authority` only. The CPI paths (`emit_feedback`,
 * `dispute_payment`) require a real `agent_registry_8004` setup with
 * registered agents — those are exercised end-to-end in Phase 9 E2E
 * tests. This file pins the per-facilitator authority lifecycle.
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

const TRUSTGATE_AUTHORITY_PREFIX = Buffer.from("trustgate_auth");

function deriveAuthorityPda(
  programId:   PublicKey,
  facilitator: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [TRUSTGATE_AUTHORITY_PREFIX, facilitator.toBuffer()],
    programId,
  );
}

describe("trustgate", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Trustgate as Program<any>;
  const wallet  = provider.wallet.publicKey;

  const freshFacilitator = () => Keypair.generate().publicKey;

  describe("init_authority", () => {
    it("creates a TrustGateAuthority PDA with correct fields", async () => {
      const facilitator = freshFacilitator();
      const [pda] = deriveAuthorityPda(program.programId, facilitator);

      await program.methods
        .initAuthority(facilitator)
        .accounts({
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
        .accounts({ payer: wallet, authority: pda, systemProgram: SystemProgram.programId })
        .rpc();

      try {
        await program.methods
          .initAuthority(facilitator)
          .accounts({ payer: wallet, authority: pda, systemProgram: SystemProgram.programId })
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
        .accounts({ payer: wallet, authority: pda1, systemProgram: SystemProgram.programId })
        .rpc();
      await program.methods.initAuthority(f2)
        .accounts({ payer: wallet, authority: pda2, systemProgram: SystemProgram.programId })
        .rpc();

      const a1 = await program.account.trustGateAuthority.fetch(pda1);
      const a2 = await program.account.trustGateAuthority.fetch(pda2);
      expect(a1.facilitator.toBase58()).to.equal(f1.toBase58());
      expect(a2.facilitator.toBase58()).to.equal(f2.toBase58());
    });
  });
});
