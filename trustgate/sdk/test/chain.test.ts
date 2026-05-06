/**
 * Tests for the SPL TransferChecked parser inside `validateOnChainTx`.
 *
 * Hand-crafted VersionedTransaction fixtures (no devnet, no validator).
 * Confirms each rejection branch + the happy-path field extraction.
 */

import { expect } from "chai";
import {
  Connection,
  Keypair,
  MessageV0,
  PublicKey,
  TransactionInstruction,
  VersionedTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";

import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  buildTransferCheckedIx,
} from "../src/spl";
import { makeValidateOnChainTx, OnChainTxValidation } from "../src/onchain-validator";

// ---------------------------------------------------------------------------
// Fake Connection — captures the requested signature and returns a
// configurable status. Avoids a real RPC server.
// ---------------------------------------------------------------------------
class FakeConnection {
  public lastSig: string | null = null;
  public statusValue: any = {
    err:                null,
    slot:               42,
    confirmationStatus: "confirmed",
  };
  getSignatureStatus = async (sig: string): Promise<{ value: any }> => {
    this.lastSig = sig;
    return { value: this.statusValue };
  };
}

function buildSignedTx(args: {
  payer:     Keypair;
  source:    PublicKey;
  mint:      PublicKey;
  dest:      PublicKey;
  amount:    bigint;
  decimals:  number;
  tokenProgram?: PublicKey;
}): VersionedTransaction {
  const transferIx = buildTransferCheckedIx({
    source:        args.source,
    mint:          args.mint,
    destination:   args.dest,
    authority:     args.payer.publicKey,
    amount:        args.amount,
    decimals:      args.decimals,
    tokenProgram:  args.tokenProgram ?? TOKEN_PROGRAM_ID,
  });
  return buildSignedTxFromIx(args.payer, transferIx);
}

function buildSignedTxFromIx(payer: Keypair, ix: TransactionInstruction): VersionedTransaction {
  const message = MessageV0.compile({
    payerKey:        payer.publicKey,
    instructions:    [ix],
    recentBlockhash: "11111111111111111111111111111111",
  });
  const tx = new VersionedTransaction(message);
  tx.sign([payer]);
  return tx;
}

function txToBase64(tx: VersionedTransaction): string {
  return Buffer.from(tx.serialize()).toString("base64");
}

describe("makeValidateOnChainTx — TransferChecked parser", () => {
  const payer = Keypair.generate();
  const source = Keypair.generate().publicKey;
  const mint   = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  const dest   = Keypair.generate().publicKey;

  it("happy path returns confirmed=true with all fields", async () => {
    const tx = buildSignedTx({ payer, source, mint, dest, amount: 1_000_000n, decimals: 6 });
    const conn = new FakeConnection();
    const validate = makeValidateOnChainTx({ connection: conn as unknown as Connection });
    const r = await validate(txToBase64(tx));
    expect(r.confirmed).to.equal(true);
    expect(r.transferredAmount).to.equal(1_000_000n);
    expect(r.transferredMint!.equals(mint)).to.equal(true);
    expect(r.transferRecipient!.equals(dest)).to.equal(true);
    expect(r.payer!.equals(payer.publicKey)).to.equal(true);
    expect(r.signature).to.be.a("string");
    expect(r.slot).to.equal(42);
    expect(conn.lastSig).to.equal(r.signature);
  });

  it("malformed base64 → confirmed:false, malformed_payload", async () => {
    const validate = makeValidateOnChainTx({ connection: new FakeConnection() as any });
    // Buffer.from is permissive — to actually trigger malformed_payload we
    // need the deserialize stage to fail. Pass valid-base64 but garbage bytes.
    const garbage = Buffer.from("aaaa", "base64").toString("base64");
    const r = await validate(garbage);
    expect(r.confirmed).to.equal(false);
    expect(r.errorReason).to.equal("malformed_payload");
  });

  it("tx with no transferChecked → unsupported_scheme", async () => {
    // Build a tx that contains a non-token instruction.
    const memoIx = new TransactionInstruction({
      programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
      keys:      [],
      data:      Buffer.from("hello", "utf-8"),
    });
    const tx = buildSignedTxFromIx(payer, memoIx);
    const validate = makeValidateOnChainTx({ connection: new FakeConnection() as any });
    const r = await validate(txToBase64(tx));
    expect(r.confirmed).to.equal(false);
    expect(r.errorReason).to.equal("unsupported_scheme");
  });

  it("tx not on chain → invalid_signature, but transfer fields populated", async () => {
    const tx = buildSignedTx({ payer, source, mint, dest, amount: 5n, decimals: 6 });
    const conn = new FakeConnection();
    conn.statusValue = null;
    const validate = makeValidateOnChainTx({ connection: conn as unknown as Connection });
    const r = await validate(txToBase64(tx));
    expect(r.confirmed).to.equal(false);
    expect(r.errorReason).to.equal("invalid_signature");
    // Even on rejection, fields are populated for downstream observability.
    expect(r.transferredAmount).to.equal(5n);
    expect(r.transferRecipient!.equals(dest)).to.equal(true);
  });

  it("tx on chain but errored → settlement_failed", async () => {
    const tx = buildSignedTx({ payer, source, mint, dest, amount: 1n, decimals: 6 });
    const conn = new FakeConnection();
    conn.statusValue = { err: { InstructionError: [0, "Custom"] }, slot: 9, confirmationStatus: "confirmed" };
    const validate = makeValidateOnChainTx({ connection: conn as unknown as Connection });
    const r = await validate(txToBase64(tx));
    expect(r.confirmed).to.equal(false);
    expect(r.errorReason).to.equal("settlement_failed");
    expect(r.errorDetail).to.contain("InstructionError");
  });

  it("tx pending (status not confirmed/finalized) → invalid_signature", async () => {
    const tx = buildSignedTx({ payer, source, mint, dest, amount: 1n, decimals: 6 });
    const conn = new FakeConnection();
    conn.statusValue = { err: null, slot: 9, confirmationStatus: "processed" };
    const validate = makeValidateOnChainTx({ connection: conn as unknown as Connection });
    const r = await validate(txToBase64(tx));
    expect(r.confirmed).to.equal(false);
    expect(r.errorReason).to.equal("invalid_signature");
    expect(r.errorDetail).to.contain("processed");
  });

  it("Token-2022 program is accepted by default", async () => {
    const tx = buildSignedTx({
      payer, source, mint, dest, amount: 99n, decimals: 6,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    });
    const conn = new FakeConnection();
    const validate = makeValidateOnChainTx({ connection: conn as unknown as Connection });
    const r = await validate(txToBase64(tx));
    expect(r.confirmed).to.equal(true);
  });

  it("RPC throw → confirmed:false, settlement_failed", async () => {
    const tx = buildSignedTx({ payer, source, mint, dest, amount: 1n, decimals: 6 });
    const conn = new FakeConnection();
    conn.getSignatureStatus = (async () => { throw new Error("connection refused"); }) as any;
    const validate = makeValidateOnChainTx({ connection: conn as unknown as Connection });
    const r = await validate(txToBase64(tx));
    expect(r.confirmed).to.equal(false);
    expect(r.errorReason).to.equal("settlement_failed");
  });

  it("base58 signature is canonical", async () => {
    const tx = buildSignedTx({ payer, source, mint, dest, amount: 7n, decimals: 6 });
    const conn = new FakeConnection();
    const validate = makeValidateOnChainTx({ connection: conn as unknown as Connection });
    const r = await validate(txToBase64(tx));
    expect(r.signature).to.equal(bs58.encode(tx.signatures[0]));
  });
});

// Helper expectation for type-narrowed access
function _typecheck(_v: OnChainTxValidation): void { /* no-op */ }
void _typecheck;
