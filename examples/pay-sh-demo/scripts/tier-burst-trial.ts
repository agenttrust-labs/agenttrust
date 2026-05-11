/**
 * Tier-burst trial — multi-facilitator burst to bump on-chain tier_immediate
 * for a demo counterparty by emitting positive feedback events.
 *
 * Strategy:
 *   - N facilitator keypairs (each becomes a distinct Quantu-visible client)
 *   - Each facilitator:
 *       1. funded from operator (0.03 SOL)
 *       2. calls TrustGate.init_authority (creates TrustGateAuthority PDA)
 *       3. calls TrustGate.emit_feedback (score=100, targeting payee)
 *   - Verify byte 551 (tier_immediate) of payee atom_stats before/after
 *
 * Trial mode (default): 5 facilitators targeting tier-1 counterparty
 *   - aiming for Bronze (tier 1) per Quantu COLD_START_MIN=5 + diversity bonus
 *
 * Usage:
 *   pnpm tsx scripts/tier-burst-trial.ts                # 5 facilitators, tier-1 target
 *   N=10 TARGET_ID=3 pnpm tsx scripts/tier-burst-trial.ts # 10 facilitators, tier-3 target
 */

import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// ---------------------------------------------------------------------------
// Program IDs + discriminators
// ---------------------------------------------------------------------------

const TRUSTGATE_ID             = new PublicKey("HF8zHfoyA7b5mhLViopTnRMprc6ZT5KActHTdkFrih2N");
const AGENT_REGISTRY_ID        = new PublicKey("8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C");
const ATOM_ENGINE_ID           = new PublicKey("AToMufS4QD6hEXvcvBDg9m1AHeCLpmZQsyfYa5h9MwAF");

// TrustGate Anchor discriminators (sha256("global:<name>")[..8], pulled from IDL)
const INIT_AUTHORITY_DISC       = Buffer.from([136, 150, 94, 172, 74, 199, 236, 85]);
const EMIT_FEEDBACK_DISC        = Buffer.from([166, 211, 231, 168, 16, 205, 170, 77]);

// ---------------------------------------------------------------------------
// Config (env overrides)
// ---------------------------------------------------------------------------

const RPC_URL    = process.env.RPC_URL    ?? "https://api.devnet.solana.com";
const KEYPAIR    = process.env.KEYPAIR    ?? path.join(os.homedir(), ".config/solana/id.json");
const STATE_FILE = path.resolve(__dirname, "..", "devnet-counterparties.json");
const N          = parseInt(process.env.N ?? "5", 10);
const TARGET_ID  = parseInt(process.env.TARGET_ID ?? "2", 10); // 1=tier-0, 2=tier-1, 3=tier-3
const FUND_LAMPORTS = 0.03 * LAMPORTS_PER_SOL;
const SCORE      = 100;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CounterpartyEntry {
  id: number;
  label: string;
  demoTier: number;
  asset: string;
  agentAccount: string;
  atomStats: string;
  owner: string;
}

interface DevnetState {
  network: "solana-devnet";
  programs: { agentRegistry: string; atomEngine: string };
  baseCollection: string;
  rootConfig: string;
  atomConfig: string;
  registryConfig: string;
  counterparties: CounterpartyEntry[];
}

// ---------------------------------------------------------------------------
// PDA helpers
// ---------------------------------------------------------------------------

function deriveTrustGateAuthority(facilitator: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("trustgate_auth"), facilitator.toBuffer()],
    TRUSTGATE_ID,
  );
}

function deriveFeedbackEmissionLog(paymentIdHash: Buffer): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("feedback_log"), paymentIdHash],
    TRUSTGATE_ID,
  );
}

function deriveAtomCpiAuthority(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("atom_cpi_authority")],
    AGENT_REGISTRY_ID,
  )[0];
}

// ---------------------------------------------------------------------------
// Borsh encoders (manual — match Rust definition byte-for-byte)
// ---------------------------------------------------------------------------

function encString(s: string): Buffer {
  const bytes = Buffer.from(s, "utf-8");
  const len = Buffer.alloc(4);
  len.writeUInt32LE(bytes.length, 0);
  return Buffer.concat([len, bytes]);
}

function encodeInitAuthorityArgs(facilitator: PublicKey): Buffer {
  return Buffer.concat([INIT_AUTHORITY_DISC, facilitator.toBuffer()]);
}

function encodeU64LE(n: bigint): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(n, 0);
  return b;
}

function encodeEmitFeedbackArgs(
  paymentIdHash: Buffer,
  facilitator: PublicKey,
  payeeAsset: PublicKey,
  score: number,
  value: bigint,
  valueDecimals: number,
  tag1: string,
  tag2: string,
  endpoint: string,
  feedbackUri: string,
): Buffer {
  if (paymentIdHash.length !== 32) throw new Error("payment_id_hash must be 32 bytes");
  // Borsh field order MUST match the Rust handler signature exactly. The
  // `value` + `value_decimals` slots sit between `score` and `tag1` — they
  // were added when we discovered that hardcoding value=0 blocks Quantu's
  // `quality_score` from accruing, which in turn pins `tier_immediate` at
  // 0 forever. Demo emissions have no real payment behind them; we
  // represent each as a $1-equivalent test event (1_000_000 base units @
  // 6 decimals = $1 USDC) so quality_score accrues properly. Production
  // callers should pass the actual payment amount from the gated payment
  // context.
  return Buffer.concat([
    EMIT_FEEDBACK_DISC,
    paymentIdHash,
    facilitator.toBuffer(),
    payeeAsset.toBuffer(),
    Buffer.from([score]),
    encodeU64LE(value),
    Buffer.from([valueDecimals]),
    encString(tag1),
    encString(tag2),
    encString(endpoint),
    encString(feedbackUri),
  ]);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadKeypair(p: string): Keypair {
  const data = JSON.parse(fs.readFileSync(p, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(data));
}

function loadState(): DevnetState {
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")) as DevnetState;
}

async function getTierImmediate(connection: Connection, atomStatsPk: PublicKey): Promise<number | null> {
  const info = await connection.getAccountInfo(atomStatsPk, "confirmed");
  if (!info) return null;
  if (info.data.length < 552) return null;
  return info.data[551]; // tier_immediate at byte 551 per playbook
}

async function fundFacilitator(
  connection: Connection,
  funder: Keypair,
  to: PublicKey,
  lamports: number,
): Promise<string> {
  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: funder.publicKey, toPubkey: to, lamports }),
  );
  return sendAndConfirmTransaction(connection, tx, [funder], { commitment: "confirmed" });
}

async function initAuthority(
  connection: Connection,
  facilitator: Keypair,
): Promise<{ sig: string; authority: PublicKey }> {
  const [authority] = deriveTrustGateAuthority(facilitator.publicKey);
  const ix = new TransactionInstruction({
    programId: TRUSTGATE_ID,
    keys: [
      { pubkey: facilitator.publicKey,   isSigner: true,  isWritable: true  },
      { pubkey: authority,               isSigner: false, isWritable: true  },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: encodeInitAuthorityArgs(facilitator.publicKey),
  });
  const tx = new Transaction()
    .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 150_000 }))
    .add(ix);
  const sig = await sendAndConfirmTransaction(connection, tx, [facilitator], { commitment: "confirmed" });
  return { sig, authority };
}

async function emitFeedback(
  connection: Connection,
  facilitator: Keypair,
  payee: CounterpartyEntry,
  baseCollection: PublicKey,
  atomConfig: PublicKey,
  atomCpiAuthority: PublicKey,
  score: number,
): Promise<string> {
  const paymentIdHash = crypto.randomBytes(32);
  const [authority]   = deriveTrustGateAuthority(facilitator.publicKey);
  const [emissionLog] = deriveFeedbackEmissionLog(paymentIdHash);
  const payeeAsset      = new PublicKey(payee.asset);
  const payeeAgent      = new PublicKey(payee.agentAccount);
  const payeeAtomStats  = new PublicKey(payee.atomStats);

  // Named accounts: payer, authority, emission_log, system_program
  // Remaining accounts (CPI to give_feedback):
  //   [agent_account, asset, collection, system_program, atom_config,
  //    atom_stats, atom_engine_program, registry_authority, agent_registry_id]
  const ix = new TransactionInstruction({
    programId: TRUSTGATE_ID,
    keys: [
      { pubkey: facilitator.publicKey,   isSigner: true,  isWritable: true  },
      { pubkey: authority,               isSigner: false, isWritable: true  },
      { pubkey: emissionLog,             isSigner: false, isWritable: true  },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      // remaining
      { pubkey: payeeAgent,              isSigner: false, isWritable: true  },
      { pubkey: payeeAsset,              isSigner: false, isWritable: false },
      { pubkey: baseCollection,          isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: atomConfig,              isSigner: false, isWritable: false },
      { pubkey: payeeAtomStats,          isSigner: false, isWritable: true  },
      { pubkey: ATOM_ENGINE_ID,          isSigner: false, isWritable: false },
      { pubkey: atomCpiAuthority,        isSigner: false, isWritable: false },
      { pubkey: AGENT_REGISTRY_ID,       isSigner: false, isWritable: false },
    ],
    data: encodeEmitFeedbackArgs(
      paymentIdHash,
      facilitator.publicKey,
      payeeAsset,
      score,
      // $1 USDC-equivalent test value. See encodeEmitFeedbackArgs comment.
      1_000_000n,
      6,
      "demo",
      "",
      "",
      "",
    ),
  });

  const tx = new Transaction()
    .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }))
    .add(ix);
  return sendAndConfirmTransaction(connection, tx, [facilitator], { commitment: "confirmed" });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const connection = new Connection(RPC_URL, "confirmed");
  const owner = loadKeypair(KEYPAIR);
  const state = loadState();

  const target = state.counterparties.find((c) => c.id === TARGET_ID);
  if (!target) throw new Error(`counterparty id=${TARGET_ID} not in ${STATE_FILE}`);

  const baseCollection   = new PublicKey(state.baseCollection);
  const atomConfig       = new PublicKey(state.atomConfig);
  const atomCpiAuthority = deriveAtomCpiAuthority();

  console.log(`[burst] target=#${target.id} (${target.label}) demoTier=${target.demoTier}`);
  console.log(`[burst] asset=${target.asset}`);
  console.log(`[burst] atom_stats=${target.atomStats}`);
  console.log(`[burst] N=${N} facilitators · score=${SCORE}`);

  const tierBefore = await getTierImmediate(connection, new PublicKey(target.atomStats));
  console.log(`\n[burst] tier_immediate BEFORE: ${tierBefore}`);

  const balance = await connection.getBalance(owner.publicKey);
  const need = (FUND_LAMPORTS + 5000) * N;
  if (balance < need) {
    throw new Error(`insufficient operator SOL: have=${balance / 1e9} need=${need / 1e9}`);
  }

  // ---- run burst ----
  const facilitators: Keypair[] = [];
  for (let i = 0; i < N; i++) facilitators.push(Keypair.generate());

  console.log(`\n[burst] funding ${N} facilitators @ ${FUND_LAMPORTS / 1e9} SOL each…`);
  for (let i = 0; i < N; i++) {
    const sig = await fundFacilitator(connection, owner, facilitators[i].publicKey, FUND_LAMPORTS);
    console.log(`  f${i}=${facilitators[i].publicKey.toBase58()} fund=${sig.slice(0, 12)}…`);
  }

  console.log(`\n[burst] init_authority + emit_feedback × ${N}…`);
  let success = 0;
  let fail = 0;
  for (let i = 0; i < N; i++) {
    const f = facilitators[i];
    try {
      const { sig: initSig } = await initAuthority(connection, f);
      const emitSig = await emitFeedback(
        connection, f, target, baseCollection, atomConfig, atomCpiAuthority, SCORE,
      );
      console.log(`  f${i} ✓ init=${initSig.slice(0, 10)}… emit=${emitSig.slice(0, 10)}…`);
      success++;
    } catch (e: any) {
      console.error(`  f${i} ✗ ${e.message?.split("\n")[0] ?? e}`);
      fail++;
    }
  }

  // ---- verify ----
  const tierAfter = await getTierImmediate(connection, new PublicKey(target.atomStats));
  console.log(`\n[burst] tier_immediate AFTER:  ${tierAfter}`);
  console.log(`[burst] success=${success}  fail=${fail}`);
  console.log(`[burst] delta=${tierBefore !== null && tierAfter !== null ? tierAfter - tierBefore : "n/a"}`);

  // Drain any leftover SOL from facilitators back to owner (cleanup)
  console.log(`\n[burst] draining facilitator residuals…`);
  for (let i = 0; i < N; i++) {
    const f = facilitators[i];
    try {
      const bal = await connection.getBalance(f.publicKey);
      if (bal > 5000) {
        const drainTx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: f.publicKey,
            toPubkey:   owner.publicKey,
            lamports:   bal - 5000,
          }),
        );
        await sendAndConfirmTransaction(connection, drainTx, [f], { commitment: "confirmed" });
      }
    } catch {/* ignore drain failures */}
  }
  console.log(`[burst] done.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
