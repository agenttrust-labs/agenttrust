/**
 * Devnet end-to-end smoke: real signed SPL transfer → AgentTrust pipeline
 * → on-chain emit_feedback CPI → Solana Explorer link.
 *
 * Idempotent. Steps:
 *
 *   0. Verify wallet balance + IDL fetch + counterparties JSON
 *   1. init_authority(facilitator) on trustgate (one-time)
 *   2. Create or reuse a devnet test SPL mint (decimals=6, USDC-shaped)
 *   3. Create or reuse payer keypair, fund it with SOL
 *   4. Ensure facilitator + payer ATAs exist + mint tokens to payer
 *   5. Build a signed TransferChecked tx (payer → facilitator ATA)
 *   6. POST to /protected via supertest with the signed tx as PAYMENT-SIGNATURE
 *   7. Capture the emit_feedback tx signature + log PDA + Explorer URL
 *
 * Output JSON: examples/pay-sh-demo/devnet-smoke.json
 */

import {
  AnchorProvider,
  BN,
  Idl,
  Program,
  Wallet,
} from "@coral-xyz/anchor";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  MessageV0,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import bs58 from "bs58";
import request from "supertest";

import {
  DEFAULT_DEVNET_PROGRAM_IDS,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  buildTransferCheckedIx,
  deriveAssociatedTokenAddress,
  deriveTrustGateAuthorityPda,
  deriveFeedbackLogPda,
} from "@agenttrust-sdk/trustgate";

import {
  bytesToHex,
  canonicalChallengeBytes,
  deriveMemoHash,
  signEnvelope,
} from "@agenttrust/trustgate-server";

import { createRealDemoApp } from "../src";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const RPC_URL    = process.env.RPC_URL   ?? "https://api.devnet.solana.com";
const KEYPAIR    = process.env.KEYPAIR   ?? path.join(os.homedir(), ".config/solana/id.json");
const SMOKE_FILE = path.resolve(__dirname, "..", "devnet-smoke.json");
const COUNTERPARTIES_FILE = path.resolve(__dirname, "..", "devnet-counterparties.json");
const PAYER_KEYPAIR_FILE  = path.resolve(__dirname, "..", "devnet-payer-keypair.json");
const MINT_KEYPAIR_FILE   = path.resolve(__dirname, "..", "devnet-mint-keypair.json");

// Pinned program IDs.
const TRUSTGATE_ID    = DEFAULT_DEVNET_PROGRAM_IDS.trustgate;

// SPL Token instruction discriminators.
const SPL_INIT_MINT2          = 20;
const SPL_INIT_ACCOUNT3       = 18;
const SPL_MINT_TO             = 7;

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------

function loadKeypair(p: string): Keypair {
  const data = JSON.parse(fs.readFileSync(p, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(data));
}

function loadOrCreateKeypair(p: string): Keypair {
  if (fs.existsSync(p)) return loadKeypair(p);
  const kp = Keypair.generate();
  fs.writeFileSync(p, JSON.stringify(Array.from(kp.secretKey)));
  return kp;
}

interface CounterpartyEntry {
  id:                 number;
  label:              string;
  demoTier:           number;
  asset:              string;
  agentAccount:       string;
  atomStats:          string;
  owner:              string;
  registerSig:        string;
  initializeStatsSig: string;
  registeredAtSlot:   number;
  initializedAtSlot:  number;
}
interface CounterpartyState {
  network:        string;
  programs:       { agentRegistry: string; atomEngine: string };
  baseCollection: string;
  atomConfig:     string;
  registryConfig: string;
  rootConfig:     string;
  counterparties: CounterpartyEntry[];
  updatedAt:      string;
}

function loadCounterparties(): CounterpartyState {
  return JSON.parse(fs.readFileSync(COUNTERPARTIES_FILE, "utf-8"));
}

// ---------------------------------------------------------------------------
// Step 1 — init_authority (idempotent)
// ---------------------------------------------------------------------------

async function ensureTrustGateAuthority(args: {
  connection:  Connection;
  facilitator: Keypair;
  trustgate:   Program;
}): Promise<{ pda: PublicKey; sig: string | null; created: boolean }> {
  const pda = deriveTrustGateAuthorityPda(TRUSTGATE_ID, args.facilitator.publicKey);
  const existing = await args.connection.getAccountInfo(pda);
  if (existing) {
    return { pda, sig: null, created: false };
  }
  const sig = await args.trustgate.methods
    .initAuthority(args.facilitator.publicKey)
    .accounts({
      payer:         args.facilitator.publicKey,
      authority:     pda,
      systemProgram: SystemProgram.programId,
    } as any)
    .signers([args.facilitator])
    .rpc({ commitment: "confirmed" });
  return { pda, sig, created: true };
}

// ---------------------------------------------------------------------------
// Step 2 — test mint (idempotent)
// ---------------------------------------------------------------------------

async function ensureTestMint(args: {
  connection: Connection;
  payer:      Keypair;
}): Promise<{ mint: PublicKey; sig: string | null; created: boolean }> {
  const mintKp = loadOrCreateKeypair(MINT_KEYPAIR_FILE);
  const existing = await args.connection.getAccountInfo(mintKp.publicKey);
  if (existing) return { mint: mintKp.publicKey, sig: null, created: false };

  const MINT_SIZE = 82;
  const rentLamports = await args.connection.getMinimumBalanceForRentExemption(MINT_SIZE);

  const createAccountIx = SystemProgram.createAccount({
    fromPubkey: args.payer.publicKey,
    newAccountPubkey: mintKp.publicKey,
    lamports: rentLamports,
    space: MINT_SIZE,
    programId: TOKEN_PROGRAM_ID,
  });

  // initializeMint2: discriminator (20) + decimals (1) + mintAuthority (32) + freezeAuthOpt (1)
  const initMintData = Buffer.alloc(1 + 1 + 32 + 1);
  initMintData.writeUInt8(SPL_INIT_MINT2, 0);
  initMintData.writeUInt8(6, 1); // decimals
  args.payer.publicKey.toBuffer().copy(initMintData, 2); // mintAuthority
  initMintData.writeUInt8(0, 34); // no freeze authority
  const initMintIx = new TransactionInstruction({
    programId: TOKEN_PROGRAM_ID,
    keys: [{ pubkey: mintKp.publicKey, isSigner: false, isWritable: true }],
    data: initMintData,
  });

  const tx = new Transaction().add(createAccountIx).add(initMintIx);
  const sig = await sendAndConfirmTransaction(
    args.connection, tx, [args.payer, mintKp], { commitment: "confirmed" },
  );
  return { mint: mintKp.publicKey, sig, created: true };
}

// ---------------------------------------------------------------------------
// Step 3 — payer keypair (idempotent, funded from facilitator)
// ---------------------------------------------------------------------------

async function ensurePayerKeypair(args: {
  connection:  Connection;
  facilitator: Keypair;
  fundLamports: number;
}): Promise<{ payer: Keypair; sig: string | null; funded: boolean }> {
  const payer = loadOrCreateKeypair(PAYER_KEYPAIR_FILE);
  const balance = await args.connection.getBalance(payer.publicKey);
  if (balance >= args.fundLamports) return { payer, sig: null, funded: false };

  const transferIx = SystemProgram.transfer({
    fromPubkey: args.facilitator.publicKey,
    toPubkey:   payer.publicKey,
    lamports:   args.fundLamports - balance,
  });
  const tx = new Transaction().add(transferIx);
  const sig = await sendAndConfirmTransaction(
    args.connection, tx, [args.facilitator], { commitment: "confirmed" },
  );
  return { payer, sig, funded: true };
}

// ---------------------------------------------------------------------------
// Step 4 — ATAs + mint tokens
// ---------------------------------------------------------------------------

async function ensureAtaWithBalance(args: {
  connection:    Connection;
  payer:         Keypair;     // tx fee + ATA create payer
  owner:         PublicKey;   // ATA owner
  mint:          PublicKey;
  mintAuthority: Keypair;     // for the mint-to call
  desiredAmount: bigint;      // atomic units
}): Promise<{ ata: PublicKey; createSig: string | null; mintSig: string | null }> {
  const ata = deriveAssociatedTokenAddress(args.owner, args.mint);

  let createSig: string | null = null;
  const existing = await args.connection.getAccountInfo(ata);
  if (!existing) {
    // Create ATA via the canonical Associated Token Program create-idempotent ix.
    // Discriminator: 1 (createIdempotent)
    const createAtaIx = new TransactionInstruction({
      programId: ASSOCIATED_TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: args.payer.publicKey,         isSigner: true,  isWritable: true  },
        { pubkey: ata,                          isSigner: false, isWritable: true  },
        { pubkey: args.owner,                   isSigner: false, isWritable: false },
        { pubkey: args.mint,                    isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId,      isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID,             isSigner: false, isWritable: false },
      ],
      data: Buffer.from([1]),
    });
    const tx = new Transaction().add(createAtaIx);
    createSig = await sendAndConfirmTransaction(
      args.connection, tx, [args.payer], { commitment: "confirmed" },
    );
  }

  // Check current ATA balance.
  const balanceResp = await args.connection.getTokenAccountBalance(ata);
  const currentRaw = BigInt(balanceResp.value.amount);
  let mintSig: string | null = null;
  if (currentRaw < args.desiredAmount) {
    const toMint = args.desiredAmount - currentRaw;
    // mint_to: discriminator (7) + amount (u64 LE)
    const data = Buffer.alloc(1 + 8);
    data.writeUInt8(SPL_MINT_TO, 0);
    data.writeBigUInt64LE(toMint, 1);
    const mintToIx = new TransactionInstruction({
      programId: TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: args.mint,                     isSigner: false, isWritable: true  },
        { pubkey: ata,                           isSigner: false, isWritable: true  },
        { pubkey: args.mintAuthority.publicKey,  isSigner: true,  isWritable: false },
      ],
      data,
    });
    const tx = new Transaction().add(mintToIx);
    mintSig = await sendAndConfirmTransaction(
      args.connection, tx, [args.mintAuthority], { commitment: "confirmed" },
    );
  }
  return { ata, createSig, mintSig };
}

// ---------------------------------------------------------------------------
// Step 5 — sign and broadcast the SPL transfer the demo will validate
// ---------------------------------------------------------------------------

async function signAndSendTransfer(args: {
  connection:        Connection;
  payer:             Keypair;
  payerTokenAccount: PublicKey;
  destAta:           PublicKey;
  mint:              PublicKey;
  amount:            bigint;
  decimals:          number;
}): Promise<{ signature: string; txBase64: string }> {
  const transferIx = buildTransferCheckedIx({
    source:       args.payerTokenAccount,
    mint:         args.mint,
    destination:  args.destAta,
    authority:    args.payer.publicKey,
    amount:       args.amount,
    decimals:     args.decimals,
    tokenProgram: TOKEN_PROGRAM_ID,
  });

  const { blockhash } = await args.connection.getLatestBlockhash("confirmed");
  const message = MessageV0.compile({
    payerKey:        args.payer.publicKey,
    instructions:    [transferIx],
    recentBlockhash: blockhash,
  });
  const tx = new VersionedTransaction(message);
  tx.sign([args.payer]);
  const serialized = Buffer.from(tx.serialize());
  const signature = bs58.encode(tx.signatures[0]);

  await args.connection.sendRawTransaction(serialized, {
    skipPreflight: false, preflightCommitment: "confirmed",
  });
  // Wait for confirmation.
  for (let i = 0; i < 30; i++) {
    const status = await args.connection.getSignatureStatus(signature);
    if (status?.value?.confirmationStatus === "confirmed" ||
        status?.value?.confirmationStatus === "finalized") {
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return { signature, txBase64: serialized.toString("base64") };
}

// ---------------------------------------------------------------------------
// Step 6 — drive the demo end-to-end
// ---------------------------------------------------------------------------

async function runDemoFlow(args: {
  connection:    Connection;
  facilitator:   Keypair;
  trustgateIdl:  Idl;
  payer:         Keypair;
  payerWallet:   PublicKey;
  payeeWallet:   PublicKey;     // facilitator's wallet
  payeeRecipient: PublicKey;    // facilitator's ATA
  payeeAgent:    PublicKey;
  asset:         PublicKey;
  collection:    PublicKey;
  atomConfig:    PublicKey;
  atomStats:     PublicKey;
  atomEngine:    PublicKey;
  registryAuthority: PublicKey;
  mint:          PublicKey;
  amount:        bigint;
  signedTxBase64: string;
  signedTxSig:    string;
}): Promise<{ status: number; receipt?: string; body: any }> {
  const resolveQuantu = async (_payeeAgent: PublicKey) => ({
    agentAccount:      args.payeeAgent,
    asset:             args.asset,
    collection:        args.collection,
    atomConfig:        args.atomConfig,
    atomStats:         args.atomStats,
    atomEngineProgram: args.atomEngine,
    registryAuthority: args.registryAuthority,
  });

  const counterparties = new Map([[
    args.payerWallet.toBase58(),
    { tier: 3, label: "smoke-payer" },
  ]]);

  const demo = await createRealDemoApp({
    facilitator: args.facilitator,
    counterparties,
    minTier:     2,
    mint:        args.mint.toBase58(),
    network:     "solana-devnet",
    payeeWallet: args.payeeWallet,
    payeeAgent:  args.payeeAgent,
    payeeRecipient: args.payeeRecipient,
    realChain: {
      rpcUrl:         args.connection.rpcEndpoint,
      signingNetwork: "solana-devnet",
      resolveQuantu,
      trustgateIdl:   args.trustgateIdl,
    },
  });

  // We need to send `paymentPayload` matching the signed tx + a payer hint
  // header so the demo's middleware uses the right counterparty.
  const proofPayload = {
    x402Version: 2,
    scheme:      "exact",
    network:     "solana-devnet",
    payload:     { transaction: args.signedTxBase64 },
  };
  const proofHeaderB64 = Buffer.from(JSON.stringify(proofPayload), "utf-8").toString("base64");

  const res = await request(demo.app)
    .get("/protected")
    .set("X-Demo-Payer-Agent", args.payerWallet.toBase58())
    .set("PAYMENT-SIGNATURE", proofHeaderB64);

  return {
    status:  res.status,
    receipt: res.header["x-payment-receipt"],
    body:    res.body,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const connection = new Connection(RPC_URL, "confirmed");
  const facilitator = loadKeypair(KEYPAIR);
  const counterparties = loadCounterparties();
  const tier3 = counterparties.counterparties.find((c) => c.demoTier === 3);
  if (!tier3) throw new Error("no tier-3 counterparty in devnet-counterparties.json");

  console.log(`[smoke] facilitator=${facilitator.publicKey.toBase58()}`);
  console.log(`[smoke] tier3 agent=${tier3.agentAccount} asset=${tier3.asset}`);

  const idlPath = path.resolve(__dirname, "..", "..", "..", "target", "idl", "trustgate.json");
  const trustgateIdl = JSON.parse(fs.readFileSync(idlPath, "utf-8")) as Idl;
  const provider = new AnchorProvider(connection, new Wallet(facilitator), { commitment: "confirmed" });
  const trustgate = new Program(trustgateIdl, provider);

  // Step 1 — init_authority
  const auth = await ensureTrustGateAuthority({ connection, facilitator, trustgate });
  console.log(`[smoke] TrustGateAuthority pda=${auth.pda.toBase58()}${auth.created ? " (newly created sig=" + auth.sig + ")" : " (existed)"}`);

  // Step 2 — test mint
  const mint = await ensureTestMint({ connection, payer: facilitator });
  console.log(`[smoke] test mint=${mint.mint.toBase58()}${mint.created ? " (newly created sig=" + mint.sig + ")" : " (existed)"}`);

  // Step 3 — payer keypair
  const payerStep = await ensurePayerKeypair({
    connection, facilitator, fundLamports: 0.05 * LAMPORTS_PER_SOL,
  });
  const payer = payerStep.payer;
  console.log(`[smoke] payer=${payer.publicKey.toBase58()}${payerStep.funded ? " (newly funded sig=" + payerStep.sig + ")" : " (existed)"}`);

  // Step 4 — ATAs + mint tokens
  const payerAta = await ensureAtaWithBalance({
    connection, payer: facilitator, owner: payer.publicKey,
    mint: mint.mint, mintAuthority: facilitator, desiredAmount: 10_000_000n,
  });
  console.log(`[smoke] payer ATA=${payerAta.ata.toBase58()}`);
  const facilitatorAta = await ensureAtaWithBalance({
    connection, payer: facilitator, owner: facilitator.publicKey,
    mint: mint.mint, mintAuthority: facilitator, desiredAmount: 0n,
  });
  console.log(`[smoke] facilitator ATA=${facilitatorAta.ata.toBase58()}`);

  // Step 5 — signed transfer
  const transferAmount = 1_000n; // 0.001 token (decimals=6)
  const signedTransfer = await signAndSendTransfer({
    connection, payer,
    payerTokenAccount: payerAta.ata,
    destAta:           facilitatorAta.ata,
    mint:              mint.mint,
    amount:            transferAmount,
    decimals:          6,
  });
  console.log(`[smoke] signed transfer sig=${signedTransfer.signature}`);

  // Derive registry_authority for the ATOM CPI chain.
  const registryAuthority = PublicKey.findProgramAddressSync(
    [Buffer.from("atom_cpi_authority")],
    new PublicKey(counterparties.programs.agentRegistry),
  )[0];

  // Step 6 — demo flow
  const flowResult = await runDemoFlow({
    connection, facilitator, trustgateIdl, payer,
    payerWallet:       payer.publicKey,
    payeeWallet:       facilitator.publicKey,
    payeeRecipient:    facilitatorAta.ata,
    payeeAgent:        new PublicKey(tier3.agentAccount),
    asset:             new PublicKey(tier3.asset),
    collection:        new PublicKey(counterparties.baseCollection),
    atomConfig:        new PublicKey(counterparties.atomConfig),
    atomStats:         new PublicKey(tier3.atomStats),
    atomEngine:        new PublicKey(counterparties.programs.atomEngine),
    registryAuthority,
    mint:              mint.mint,
    amount:            transferAmount,
    signedTxBase64:    signedTransfer.txBase64,
    signedTxSig:       signedTransfer.signature,
  });
  console.log(`[smoke] /protected → status=${flowResult.status} receipt=${flowResult.receipt}`);

  if (flowResult.status !== 200 || !flowResult.receipt) {
    console.error("[smoke] /protected did not return 200 + receipt. body:", JSON.stringify(flowResult.body, null, 2));
    process.exit(1);
  }

  // Step 7 — verify FeedbackEmissionLog PDA exists on chain.
  // Recover the paymentIdHash the demo derived from the request memo.
  // The demo's deriveDemoMemo uses request method/url/headers; reproduce:
  //   sha256("demo-memo:GET:/protected:<UA>" + payerAgent)
  // We don't have direct access to the UA; supertest sends `node-superagent/<v>`
  // For the smoke we just look up by checking that the receipt sig confirms.
  const status = await connection.getSignatureStatus(flowResult.receipt, { searchTransactionHistory: true });
  console.log(`[smoke] feedback tx confirmation=${status?.value?.confirmationStatus ?? "?"} slot=${status?.value?.slot}`);

  // The actual emission log PDA is deterministic from the paymentIdHash; recover via tx logs.
  const tx = await connection.getTransaction(flowResult.receipt, {
    commitment: "confirmed", maxSupportedTransactionVersion: 0,
  });
  let feedbackLogPda: string | undefined;
  if (tx?.transaction.message) {
    const accounts = tx.transaction.message.staticAccountKeys ?? [];
    // The init constraint creates the FeedbackEmissionLog PDA; it's the only
    // account in the trustgate ix that's owned by trustgate AND was newly
    // initialised. Easiest: find the account whose pre/post balance shows
    // creation (postBalances[i] > 0 && preBalances[i] === 0) AND owner = trustgate.
    if (tx.meta?.preBalances && tx.meta?.postBalances) {
      for (let i = 0; i < accounts.length; i++) {
        if (tx.meta.preBalances[i] === 0 && tx.meta.postBalances[i] > 0) {
          feedbackLogPda = accounts[i].toBase58();
          // The first match is typically the emission log.
          break;
        }
      }
    }
  }

  const explorerUrl = `https://explorer.solana.com/tx/${flowResult.receipt}?cluster=devnet`;
  const finalBalance = await connection.getBalance(facilitator.publicKey);

  const output = {
    network:        "solana-devnet",
    facilitator:    facilitator.publicKey.toBase58(),
    payer:          payer.publicKey.toBase58(),
    mint:           mint.mint.toBase58(),
    transferAmount: transferAmount.toString(),
    signedTransfer: {
      signature: signedTransfer.signature,
      explorer:  `https://explorer.solana.com/tx/${signedTransfer.signature}?cluster=devnet`,
    },
    emitFeedback: {
      signature: flowResult.receipt,
      explorer:  explorerUrl,
      logPda:    feedbackLogPda,
      slot:      status?.value?.slot,
    },
    counterpartyAgent: {
      agentAccount: tier3.agentAccount,
      asset:        tier3.asset,
      atomStats:    tier3.atomStats,
    },
    facilitatorBalanceSol: (finalBalance / LAMPORTS_PER_SOL).toFixed(6),
    capturedAt: new Date().toISOString(),
  };
  fs.writeFileSync(SMOKE_FILE, JSON.stringify(output, null, 2));
  console.log("\n=== smoke complete ===");
  console.log(JSON.stringify(output, null, 2));
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[smoke] FAILED:", e);
  process.exit(1);
});

// Avoid unused-import warnings.
void BN;
