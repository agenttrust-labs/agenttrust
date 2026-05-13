#!/usr/bin/env node
/**
 * Re-execute the gate_payment simulation directly so we can capture the
 * full simulate-transaction logs (not just the Custom 3012 error).
 */
const { Connection, PublicKey, TransactionMessage, VersionedTransaction, Keypair } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

const RPC = 'https://api.devnet.solana.com';
const PROG_POLICY_VAULT = new PublicKey('8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR');
const PROG_ATOM_ENGINE = new PublicKey('AToMufS4QD6hEXvcvBDg9m1AHeCLpmZQsyfYa5h9MwAF');

const CALLER = new PublicKey('GCoJB3pVSeSwrky3FkHQcXxEj61XyeBWxpFWYtXTFp5o');
const PAYER_AGENT = new PublicKey('Hy4E7VRyP8DyThY3NB3Sxak7KvsG4fv3B1CMvVqi3vUx');
const PAYEE_AGENT = new PublicKey('BTcgiDauqVHoGMiXujytE5wycfncDEmNnXJiUZ4s4oWL');
const MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const POLICY_ID = 1;
const AMOUNT = 5_000_000n;

function u32Le(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n, 0);
  return b;
}

function pda(seeds, pid) {
  return PublicKey.findProgramAddressSync(seeds, pid)[0];
}

const policyPda = pda([Buffer.from('policy'), PAYER_AGENT.toBuffer(), u32Le(POLICY_ID)], PROG_POLICY_VAULT);
const velocityPda = pda([Buffer.from('velocity'), PAYER_AGENT.toBuffer(), u32Le(POLICY_ID)], PROG_POLICY_VAULT);
const killSwitchPda = pda([Buffer.from('killswitch'), Buffer.from([2]), PAYER_AGENT.toBuffer()], PROG_POLICY_VAULT);

console.error('Accounts:');
console.error({ policyPda: policyPda.toBase58(), velocityPda: velocityPda.toBase58(), killSwitchPda: killSwitchPda.toBase58() });

(async () => {
  // Try loading the program via anchor with the embedded IDL.
  const anchor = require('@coral-xyz/anchor');
  const idlPath = '/Users/mohit/.npm/_npx/1761cd715757dc92/node_modules/@agenttrust-sdk/mcp/dist/idl/policy_vault.json';
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));

  const conn = new Connection(RPC, 'confirmed');
  // Dummy wallet — sigVerify=false in simulate, doesn't matter
  const wallet = {
    publicKey: CALLER,
    signTransaction: async (t) => t,
    signAllTransactions: async (ts) => ts,
  };
  const provider = new anchor.AnchorProvider(conn, wallet, { commitment: 'confirmed' });
  const program = new anchor.Program(idl, provider);

  // Confirm gate_payment ix exists in the IDL
  const gateIx = idl.instructions.find((i) => i.name === 'gatePayment' || i.name === 'gate_payment');
  console.error('gate_payment IDL ix name=', gateIx && gateIx.name, 'accounts.length=', gateIx && gateIx.accounts.length);
  console.error('accounts:', gateIx && gateIx.accounts.map((a) => a.name));

  const ix = await program.methods
    .gatePayment(PAYER_AGENT, PAYEE_AGENT, new anchor.BN(AMOUNT.toString()), MINT, POLICY_ID)
    .accounts({
      caller: CALLER,
      policyAccount: policyPda,
      velocityLedger: velocityPda,
      killSwitchState: killSwitchPda,
      payerAtomStats: null,
      payeeAtomStats: null,
      validationAttestation: null,
    })
    .instruction();

  const blockhash = (await conn.getLatestBlockhash('confirmed')).blockhash;
  const msg = new TransactionMessage({
    payerKey: CALLER,
    recentBlockhash: blockhash,
    instructions: [ix],
  }).compileToV0Message();
  const tx = new VersionedTransaction(msg);

  const sim = await conn.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true });
  fs.writeFileSync(
    path.join(__dirname, 'raw-simulate.json'),
    JSON.stringify({ err: sim.value.err, logs: sim.value.logs, returnData: sim.value.returnData }, null, 2)
  );
  console.error('\nSimulate result:');
  console.error('  err:', JSON.stringify(sim.value.err));
  console.error('  logs:');
  (sim.value.logs || []).forEach((l) => console.error('    ', l));
})().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});
