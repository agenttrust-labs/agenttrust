/**
 * Pre-warm 3 Quantu agents on Solana devnet for the AgentTrust demo.
 *
 * Adapted from `docs/plan/research/07-demo-scenarios-prewarm-class.md` §B.2
 * (the mainnet pre-warm script) for devnet:
 *
 *   - mainnet program IDs (8oo4dC… / AToMw…) → devnet IDs from
 *     `programs/trustgate/src/constants.rs` (8oo4J9… / AToMu…)
 *   - 5 agents → 3 agents (the demo's tier-0/1/3 counterparty set)
 *   - single owner (facilitator) — each agent's `agent_account` PDA is
 *     keyed by its asset, so distinct assets = distinct PDAs
 *
 * Two transactions per agent:
 *
 *   1. agent_registry_8004::register_with_options(uri, atom_enabled=true)
 *   2. atom_engine::initialize_stats()
 *
 * Cost: ~0.011 SOL × 3 = ~0.033 SOL on devnet.
 *
 * Idempotent — re-running skips agents already present in the output JSON.
 *
 * Output: `examples/pay-sh-demo/devnet-counterparties.json` — the demo
 * loads this at boot to populate its counterparty table.
 *
 * Note on tiers: Quantu's tier promotion requires accumulated feedback over
 * time (the playbook's `feedback-cron.ts`). Pre-warm sets up the agent
 * accounts; on-chain `tier_immediate` starts at 0 for all 3 agents. The
 * demo's static tier table (in `src/policy.ts:DEMO_POLICY_MIN_TIER`) is
 * the policy-gate truth for /verify; on-chain emit_feedback uses the real
 * agent PDAs from this script regardless of tier.
 */

import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// ---------------------------------------------------------------------------
// Pinned devnet program IDs (matching programs/trustgate/src/constants.rs)
// ---------------------------------------------------------------------------

const QUANTU_AGENT_REGISTRY_ID = new PublicKey("8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C");
const QUANTU_ATOM_ENGINE_ID    = new PublicKey("AToMufS4QD6hEXvcvBDg9m1AHeCLpmZQsyfYa5h9MwAF");
const MPL_CORE_PROGRAM_ID      = new PublicKey("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d");

// Anchor sighashes — sha256("global:<ix>")[..8].
// Verified against the on-chain devnet program (the playbook's pre-baked
// values are stale; the give_feedback discriminator at
// `programs/trustgate/src/constants.rs:GIVE_FEEDBACK_DISCRIMINATOR`
// matches sha256, confirming the standard Anchor convention).
const REGISTER_WITH_OPTIONS_DISCRIMINATOR = Buffer.from([177, 175, 96, 41, 59, 166, 13, 6]);
const INITIALIZE_STATS_DISCRIMINATOR      = Buffer.from([144, 201, 117, 76, 127, 118, 176, 16]);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const RPC_URL    = process.env.RPC_URL    ?? "https://api.devnet.solana.com";
const KEYPAIR    = process.env.KEYPAIR    ?? path.join(os.homedir(), ".config/solana/id.json");
const STATE_FILE = process.env.STATE_FILE ?? path.resolve(__dirname, "..", "devnet-counterparties.json");

interface AgentSpec {
  readonly id:          number;
  readonly label:       string;
  readonly uri:         string;
  readonly demoTier:    number;
}

const DEMO_AGENTS: ReadonlyArray<AgentSpec> = [
  { id: 1, label: "tier-0 untrusted",  uri: "https://agenttrust.demo/devnet/1.json", demoTier: 0 },
  { id: 2, label: "tier-1 low-trust",  uri: "https://agenttrust.demo/devnet/2.json", demoTier: 1 },
  { id: 3, label: "tier-3 trusted",    uri: "https://agenttrust.demo/devnet/3.json", demoTier: 3 },
];

// ---------------------------------------------------------------------------
// PDA helpers
// ---------------------------------------------------------------------------

function deriveRootConfigPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("root_config")],
    QUANTU_AGENT_REGISTRY_ID,
  )[0];
}

function deriveAtomConfigPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("atom_config")],
    QUANTU_ATOM_ENGINE_ID,
  )[0];
}

function deriveRegistryConfigPda(baseCollection: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("registry_config"), baseCollection.toBuffer()],
    QUANTU_AGENT_REGISTRY_ID,
  )[0];
}

function deriveAgentAccountPda(asset: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), asset.toBuffer()],
    QUANTU_AGENT_REGISTRY_ID,
  )[0];
}

function deriveAtomStatsPda(asset: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("atom_stats"), asset.toBuffer()],
    QUANTU_ATOM_ENGINE_ID,
  )[0];
}

// ---------------------------------------------------------------------------
// Borsh encoders
// ---------------------------------------------------------------------------

function encodeRegisterWithOptionsArgs(uri: string, atomEnabled: boolean): Buffer {
  const uriBytes = Buffer.from(uri, "utf-8");
  const lenBuf   = Buffer.alloc(4);
  lenBuf.writeUInt32LE(uriBytes.length, 0);
  const flagBuf  = Buffer.from([atomEnabled ? 1 : 0]);
  return Buffer.concat([REGISTER_WITH_OPTIONS_DISCRIMINATOR, lenBuf, uriBytes, flagBuf]);
}

function encodeInitializeStatsArgs(): Buffer {
  return Buffer.from(INITIALIZE_STATS_DISCRIMINATOR);
}

// ---------------------------------------------------------------------------
// State I/O
// ---------------------------------------------------------------------------

interface CounterpartyEntry {
  readonly id:                  number;
  readonly label:               string;
  readonly demoTier:            number;
  readonly asset:               string;
  readonly agentAccount:        string;
  readonly atomStats:           string;
  readonly owner:               string;
  readonly registerSig:         string;
  readonly initializeStatsSig:  string;
  readonly registeredAtSlot:    number;
  readonly initializedAtSlot:   number;
}

interface DevnetState {
  readonly network:        "solana-devnet";
  readonly programs: {
    readonly agentRegistry: string;
    readonly atomEngine:    string;
  };
  readonly baseCollection: string;
  readonly rootConfig:     string;
  readonly atomConfig:     string;
  readonly registryConfig: string;
  readonly counterparties: CounterpartyEntry[];
  readonly updatedAt:      string;
}

function loadKeypair(p: string): Keypair {
  const data = JSON.parse(fs.readFileSync(p, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(data));
}

function loadState(): DevnetState | null {
  if (!fs.existsSync(STATE_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")) as DevnetState; }
  catch { return null; }
}

function saveState(state: DevnetState): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const connection = new Connection(RPC_URL, "confirmed");
  const owner      = loadKeypair(KEYPAIR);
  const ownerB58   = owner.publicKey.toBase58();

  console.log(`[prewarm-devnet] owner=${ownerB58}`);
  console.log(`[prewarm-devnet] rpc=${RPC_URL}`);
  console.log(`[prewarm-devnet] state=${STATE_FILE}`);

  const balance = await connection.getBalance(owner.publicKey);
  console.log(`[prewarm-devnet] balance=${(balance / 1e9).toFixed(4)} SOL`);
  if (balance < 0.05 * 1e9) {
    throw new Error("insufficient SOL — need at least 0.05 SOL for 3 agents × 2 txs");
  }

  // Read the base_collection from RootConfig.
  const rootConfigPda = deriveRootConfigPda();
  const rootConfigInfo = await connection.getAccountInfo(rootConfigPda);
  if (!rootConfigInfo) throw new Error(`RootConfig not found at ${rootConfigPda.toBase58()}`);
  const baseCollection  = new PublicKey(rootConfigInfo.data.subarray(8, 40));
  const registryConfig  = deriveRegistryConfigPda(baseCollection);
  const atomConfig      = deriveAtomConfigPda();

  console.log(`[prewarm-devnet] base_collection=${baseCollection.toBase58()}`);
  console.log(`[prewarm-devnet] registry_config=${registryConfig.toBase58()}`);
  console.log(`[prewarm-devnet] atom_config=${atomConfig.toBase58()}`);

  const existing = loadState();
  const counterparties: CounterpartyEntry[] = existing?.counterparties.slice() ?? [];

  for (const spec of DEMO_AGENTS) {
    const cached = counterparties.find((c) => c.id === spec.id);
    if (cached) {
      console.log(`\n[prewarm-devnet] agent #${spec.id} already registered — skipping (asset=${cached.asset})`);
      continue;
    }

    console.log(`\n[prewarm-devnet] registering agent #${spec.id} (${spec.label})`);

    const assetKp        = Keypair.generate();
    const agentAccountPda = deriveAgentAccountPda(assetKp.publicKey);
    const atomStatsPda    = deriveAtomStatsPda(assetKp.publicKey);

    // Tx 1 — register_with_options
    const registerIx = new TransactionInstruction({
      programId: QUANTU_AGENT_REGISTRY_ID,
      keys: [
        { pubkey: rootConfigPda,              isSigner: false, isWritable: false },
        { pubkey: registryConfig,             isSigner: false, isWritable: false },
        { pubkey: agentAccountPda,            isSigner: false, isWritable: true  },
        { pubkey: assetKp.publicKey,          isSigner: true,  isWritable: true  },
        { pubkey: baseCollection,             isSigner: false, isWritable: true  },
        { pubkey: owner.publicKey,            isSigner: true,  isWritable: true  },
        { pubkey: SystemProgram.programId,    isSigner: false, isWritable: false },
        { pubkey: MPL_CORE_PROGRAM_ID,        isSigner: false, isWritable: false },
      ],
      data: encodeRegisterWithOptionsArgs(spec.uri, true),
    });
    const tx1 = new Transaction()
      .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 250_000 }))
      .add(registerIx);
    const registerSig = await sendAndConfirmTransaction(
      connection, tx1, [owner, assetKp], { commitment: "confirmed" },
    );
    const registerSlot = (await connection.getSignatureStatus(registerSig))?.value?.slot ?? 0;
    console.log(`  ↳ register sig=${registerSig}`);
    console.log(`  ↳ asset=${assetKp.publicKey.toBase58()}`);
    console.log(`  ↳ agent_account=${agentAccountPda.toBase58()}`);

    // Tx 2 — initialize_stats. Account order verified against a live
    // devnet call (the playbook's order is stale):
    //   [0] owner (signer, writable)
    //   [1] asset
    //   [2] base_collection (writable)
    //   [3] atom_config
    //   [4] atom_stats (writable)
    //   [5] system_program
    const initializeStatsIx = new TransactionInstruction({
      programId: QUANTU_ATOM_ENGINE_ID,
      keys: [
        { pubkey: owner.publicKey,         isSigner: true,  isWritable: true  },
        { pubkey: assetKp.publicKey,       isSigner: false, isWritable: false },
        { pubkey: baseCollection,          isSigner: false, isWritable: true  },
        { pubkey: atomConfig,              isSigner: false, isWritable: false },
        { pubkey: atomStatsPda,            isSigner: false, isWritable: true  },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: encodeInitializeStatsArgs(),
    });
    const tx2 = new Transaction()
      .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }))
      .add(initializeStatsIx);
    const initStatsSig = await sendAndConfirmTransaction(
      connection, tx2, [owner], { commitment: "confirmed" },
    );
    const initStatsSlot = (await connection.getSignatureStatus(initStatsSig))?.value?.slot ?? 0;
    console.log(`  ↳ init_stats sig=${initStatsSig}`);
    console.log(`  ↳ atom_stats=${atomStatsPda.toBase58()}`);

    counterparties.push({
      id:                  spec.id,
      label:               spec.label,
      demoTier:            spec.demoTier,
      asset:               assetKp.publicKey.toBase58(),
      agentAccount:        agentAccountPda.toBase58(),
      atomStats:           atomStatsPda.toBase58(),
      owner:               ownerB58,
      registerSig,
      initializeStatsSig:  initStatsSig,
      registeredAtSlot:    registerSlot,
      initializedAtSlot:   initStatsSlot,
    });
    saveState({
      network:        "solana-devnet",
      programs: {
        agentRegistry: QUANTU_AGENT_REGISTRY_ID.toBase58(),
        atomEngine:    QUANTU_ATOM_ENGINE_ID.toBase58(),
      },
      baseCollection: baseCollection.toBase58(),
      rootConfig:     rootConfigPda.toBase58(),
      atomConfig:     atomConfig.toBase58(),
      registryConfig: registryConfig.toBase58(),
      counterparties,
      updatedAt:      new Date().toISOString(),
    });

    await new Promise((r) => setTimeout(r, 1000));
  }

  const finalBalance = await connection.getBalance(owner.publicKey);
  console.log(`\n[prewarm-devnet] complete.`);
  console.log(`[prewarm-devnet] cost=${((balance - finalBalance) / 1e9).toFixed(4)} SOL`);
  console.log(`[prewarm-devnet] state written to ${STATE_FILE}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[prewarm-devnet] FAILED:", err);
  process.exit(1);
});
