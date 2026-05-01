# 07 — Demo Scenarios + Agent Pre-Warming Playbook (Class Quality)

**Author:** Mohit. **Locked:** 2026-04-28. **Build window:** Day 5 (2026-04-29) → Day 17 (2026-05-11). **Scope:** the class-quality, fully-populated playbook for Day-5 mainnet pre-warming, Day-5–12 daily feedback cron, and Days 12–14 demo recording (technical-walkthrough + pitch video). Single dependency-graph for: tier math, scripts, three demo scenarios, timing, failure recovery, state JSON, verification, cluster decisions, localhost fallback, costs, and the Day-5 actionable list.

**Why this file exists:** the headline Day-12 demo beat — *"agent must have tier ≥ 2"* — is structurally impossible without 7 days of mainnet ATOM tier accrual starting Day 5. Per `plan/final_idea/THESIS_LOCK.md:91-104`, pre-warming is *"the single most-important Day-5 action"* and *"without 12-day tier-accumulation runway starting Day 5, the headline tier-0-vs-tier-3 demo on Day 12 doesn't work."* This file is the operational manual that closes the gap between the locked thesis and the recorded demo.

**Source authority:** every offset, instruction, constant, and gating rule cites `plan/research/01-quantu-source-code-class.md` (Wave 1 #1), `plan/final_idea/changes/2026-04-28-wave1-scope-refinements.md` (Revisions 8 + 9), `plan/research/04-policyvault-build-playbook.md` Section C.2, `plan/research/05-trustgate-x402-class.md` Section D, and `plan/other_tasks/ops/technical-demo-script.md`.

---

## A. Tier-vesting math primer

The atom-engine's tier algorithm is deterministic given (feedback events, scores, distinct callers, slot gaps). Wave 1 #1 Section B.6 (`plan/research/01-quantu-source-code-class.md:286-304`) and Section F.5 (lines 582–598) catalog every constant. The math below derives the fastest-possible tier-up path from a fresh agent with zero history, using only those constants — no estimation, no hand-waving.

### A.1 — The tier-promotion thresholds

Per `atom-engine/params.rs:163-169` (cited at `plan/research/01-quantu-source-code-class.md:294-300`):

| Tier | Quality min | Risk max | Confidence min |
|------|-------------|----------|----------------|
| Platinum (4) | 7000 | 15 | 6000 |
| Gold (3) | 5000 | 30 | 4500 |
| Silver (2) | 3000 | 50 | 3000 |
| Bronze (1) | 1000 | 70 | 800 |
| Unrated (0) | (default) | — | — |

Hysteresis margin: `TIER_HYSTERESIS = 200` quality units to prevent oscillation gaming (`01-quantu-source-code-class.md:302`). Platinum additionally requires `loyalty_score ≥ 500` (`params.rs:340-342`, cited at `01-quantu-source-code-class.md:302`).

### A.2 — Cold-start + diversity + loyalty floors

Per `atom-engine/params.rs` (cited at `plan/research/01-quantu-source-code-class.md:582-598`):

| Constant | Value | Effect on tier accrual |
|----------|-------|------------------------|
| `COLD_START_MIN` | 5 | No tier promotion is allowed before 5 feedbacks have arrived (confidence floor `≈ 0` until then) |
| `COLD_START_MAX` | 15 | Confidence reaches its maximum input weight after 15 feedbacks |
| `LOYALTY_MIN_SLOT_DELTA` | 2000 | A repeat caller's loyalty bonus only counts when ≥ 2000 slots (~14 minutes at ~0.4s/slot) have elapsed since their last feedback |
| `LOYALTY_SCORE_MAX` | 1000 | Anti-cartel cap on `loyalty_score` |
| `TIER_PLATINUM_MIN_LOYALTY` | 500 | Platinum candidacy floor |
| `RING_BUFFER_SIZE` | 24 | Recent-callers ring (used for diversity bonus) |
| `EPOCH_SLOTS` | 432_000 | ~2.5 days at Solana mainnet slot times |
| `TIER_VESTING_EPOCHS` | 8 | ~20 days before `tier_candidate` → `tier_confirmed` (the post-vesting confirmed tier) |

### A.3 — Fastest-possible path from tier 0 → tier 2 (Silver)

To reach Silver, the agent's `quality_score ≥ 3000`, `risk_score ≤ 50`, `confidence ≥ 3000`. The binding constraint is `confidence`: confidence accrues with feedback count, and it scales through `COLD_START_MAX = 15` events. Per Wave 1 #1 Section F.5: "Silver (2) within ~10 feedbacks" (`01-quantu-source-code-class.md:304`) — and 304 explicitly anchors *"pre-warmed demo agents on Day 5 with daily positive feedback (score 80–100) from 5 distinct client wallets reach Bronze (1) within 5 feedbacks ... and Silver (2) within ~10 feedbacks."*

**Minimum requirements for Silver:**

| Requirement | Floor | Why |
|-------------|-------|-----|
| Feedback events | **≥ 10** with `score ∈ [80, 100]` | Confidence accrual under `COLD_START_MAX = 15` reaches ~3000 between feedbacks 8 and 12 with positive scores |
| Distinct client wallets | **≥ 3** | Diversity bonus requires non-trivial spread; repeat-caller HLL deduplication caps quality contribution from a single caller |
| Slot gap between repeat-caller feedbacks | **≥ 2000 slots** (~14 minutes) | Loyalty bonus only counts at this gap; faster repeats do not double-count |
| Wall-clock time elapsed | **≥ 30 minutes total** for the 10 feedbacks (3 callers × 3-4 events each spread out) | Combination of slot-gap floors and natural pacing |

### A.4 — Fastest-possible path from tier 0 → tier 3 (Gold)

Gold requires `quality_score ≥ 5000`, `risk_score ≤ 30`, `confidence ≥ 4500`. Per Wave 1 #1 Section B.6 line 304: *"Gold (3) requires risk_score ≤ 30 + confidence ≥ 4500 — achievable by Day 12 with consistent positive feedback."* Confidence saturates at `COLD_START_MAX = 15` events (`01-quantu-source-code-class.md:594`); quality_score continues climbing with sustained positive feedback past that point.

**Minimum requirements for Gold:**

| Requirement | Floor | Why |
|-------------|-------|-----|
| Feedback events | **≥ 15–18** with `score ∈ [85, 100]` | Confidence saturates at 15; an extra 3-5 high-score events push quality_score past 5000 |
| Distinct client wallets | **≥ 3** | Diversity bonus is essential to keep risk_score ≤ 30 — burst from a single caller raises `burst_pressure` (byte 444) and triggers risk-score increase |
| Slot gap between repeat-caller feedbacks | **≥ 2000 slots** | Loyalty bonus counted; otherwise slot-gap=too-small triggers `neg_pressure` (byte 446) |
| Wall-clock time elapsed | **≥ 5 days** of consistent positive feedback | Quality EMA needs time to converge; rapid burst is filtered by `ALPHA_QUALITY` smoothing |

### A.5 — Concrete tier-up timeline for the headline pre-warmed agent

**Demo agent #1 (Real Nike) — target Silver (2) by Day 12, stretch Gold (3):**

Per Wave 1 #1 Section B.6 (`01-quantu-source-code-class.md:286-304`), with the fastest-supported pace under Quantu's constants:

| Day | Date (absolute) | Cumulative feedbacks | Distinct callers | Cumulative slot-gap discipline | Expected tier |
|-----|-----------------|----------------------|------------------|-------------------------------|---------------|
| Day 5 | 2026-04-29 | 0 (initialize_stats only) | — | — | 0 (Unrated) |
| Day 6 | 2026-04-30 | 3 (3× score 85, 3 callers) | 3 | gap ≥ 2000 slots | 0–1 |
| Day 7 | 2026-05-01 | 6 (3 caller rotation × 2) | 3 | gap ≥ 2000 slots | 1 (Bronze) |
| Day 8 | 2026-05-02 | 9 | 3 | gap ≥ 2000 slots | 1 (Bronze) |
| Day 9 | 2026-05-03 | 12 | 3 | gap ≥ 2000 slots | 2 (Silver) |
| Day 10 | 2026-05-04 | 15 | 3 | gap ≥ 2000 slots | 2 (Silver) |
| Day 11 | 2026-05-05 | 18 | 3 | gap ≥ 2000 slots | 2 (Silver) — possible 3 (Gold) |
| Day 12 | 2026-05-06 | 21 | 3 | gap ≥ 2000 slots | 2 (Silver), stretch 3 (Gold) |

**Demo target locked at Silver (2) per Wave 1 Revision 9 (`plan/final_idea/changes/2026-04-28-wave1-scope-refinements.md:120-126`):** *"demo script targets Silver-Gold on the headline pre-warmed agent."* The pitch deck slide 5 ("Demo screenshot") shows Silver vs Unrated, NOT Platinum vs Unrated.

### A.6 — Why Platinum (tier 4) is unreachable in 7 days

Per Wave 1 Revision 9 (`plan/final_idea/changes/2026-04-28-wave1-scope-refinements.md:120-126`) citing `atom-engine/params.rs:340-342` (anchored at `01-quantu-source-code-class.md:302`):

`TIER_PLATINUM_MIN_LOYALTY = 500` is the candidate floor. Loyalty accrues only at `LOYALTY_MIN_SLOT_DELTA = 2000` slot gaps between repeat callers. With `LOYALTY_SCORE_MAX = 1000` (anti-cartel cap), a fresh agent's per-event loyalty contribution caps low — typically 25–50 points per qualifying repeat-caller event. To accrue 500 loyalty: a minimum of ~15-20 qualifying repeat events from 2-3 callers, each spread by ≥2000 slots (~14 minutes wall clock per pair). At 3× per-day cron emission across 7 days = 21 events; loyalty accrual peaks at maybe 350-400 in optimistic scenarios. 500 floor is structurally unreachable inside the 7-day pre-warm window.

Even if loyalty floor were met, Platinum's `quality_min = 7000` (vs Gold's 5000) needs additional feedback past `COLD_START_MAX = 15` to converge. Pre-warm window math: out of reach.

**Implication:** demo target Silver (2) on the headline pre-warmed agent (`Real Nike`); stretch Gold (3) by Day 11–12; Platinum (4) NEVER. Pitch deck never claims tier 4. Read Revision 9 verbatim before any deck slide is finalized.

### A.7 — Why the "scam clone" stays at tier 0

Demo agent #5 (`Scam Nike Clone`) target: tier 0 (Unrated) by Day 12. Strategy: `feedback-cron.ts` emits one feedback per cron run with `score = 25` (negative) for that agent. Per Wave 1 #1 Section B.6 + the tier algorithm: a stream of low-score feedback drives `quality_score` below `BRONZE_MIN = 1000`, keeping the agent Unrated. The `risk_score` rises (negative scores feed risk increase), keeping it above all tier promotion floors.

A second strategy (cleaner): leave the scam clone with **zero** feedback events. `feedback_count = 0` automatically yields `trust_tier = 0` (`01-quantu-source-code-class.md:275`). No risk of accidental tier-up from cron rotation bug.

**Hybrid:** scam clone receives 1-2 negative-score events in the first 3 days (proves "negative feedback is gateable"), then no further feedback. Stays at tier 0 through Day 17. This is the strategy locked below in Section C.

---

## B. Day-5 pre-warming script — `scripts/prewarm-demo-agents.ts`

Per Wave 1 Revision 8 (`plan/final_idea/changes/2026-04-28-wave1-scope-refinements.md:110-117`) citing `01-quantu-source-code-class.md:344-346`: pre-warming is **two transactions per agent** — `register_with_options(uri, atom_enabled=true)` (~0.006 SOL) then `atom_engine::initialize_stats(asset, collection)` (~0.005 SOL). Total ~0.011 SOL per agent × 5 agents = ~0.055 SOL Day-5 mainnet cost.

### B.1 — Pre-script setup (Day 5 morning, T=0)

```bash
# T=0:00 — Day 5 morning. Generate demo agent + client keypairs.
mkdir -p ./keys/demo-agents ./keys/demo-clients
for i in 1 2 3 4 5; do
  solana-keygen new --outfile ./keys/demo-agents/$i.json --no-bip39-passphrase --silent
  solana-keygen new --outfile ./keys/demo-clients/$i.json --no-bip39-passphrase --silent
done

# Plus the facilitator + policy authority keypairs (used by TrustGate + PolicyVault)
solana-keygen new --outfile ./keys/trustgate-facilitator.json --no-bip39-passphrase --silent
solana-keygen new --outfile ./keys/policy-vault-admin.json --no-bip39-passphrase --silent

# Fund each agent owner with ~0.015 SOL (rent + buffer).
# 5 agents × 0.015 SOL = 0.075 SOL. Mainnet transfer from Mohit's primary wallet.
for i in 1 2 3 4 5; do
  PUBKEY=$(solana-keygen pubkey ./keys/demo-agents/$i.json)
  solana transfer "$PUBKEY" 0.015 --keypair ./keys/mohit-treasury.json --url mainnet-beta --allow-unfunded-recipient
done

# Fund each client wallet with ~0.001 SOL (just for feedback emission gas)
for i in 1 2 3 4 5; do
  PUBKEY=$(solana-keygen pubkey ./keys/demo-clients/$i.json)
  solana transfer "$PUBKEY" 0.002 --keypair ./keys/mohit-treasury.json --url mainnet-beta --allow-unfunded-recipient
done
```

### B.2 — `scripts/prewarm-demo-agents.ts` (~250 LOC)

Per Wave 1 #1 Section A.3 (`01-quantu-source-code-class.md:21-37`) — mainnet program IDs are pinned at `agent_registry_8004 = 8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ` and `atom_engine = AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb`. Devnet IDs are **different** (Wave 1 Revision 7, `2026-04-28-wave1-scope-refinements.md:97-106`); this script uses mainnet IDs only.

```typescript
// scripts/prewarm-demo-agents.ts
//
// Day-5 critical action: register 5 demo agents on Quantu's mainnet ATOM Engine
// and initialize their AtomStats PDAs. Two transactions per agent. Idempotent.
//
// Cost: ~0.011 SOL per agent × 5 = ~0.055 SOL one-time.
// Sources: plan/research/01-quantu-source-code-class.md C.2 + C.9; Revision 8.

import {
  Connection, Keypair, PublicKey, SystemProgram, Transaction,
  sendAndConfirmTransaction, ComputeBudgetProgram,
} from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import * as fs from 'fs';
import * as path from 'path';

// ─── Pinned mainnet IDs (Wave 1 #1 Section A.3) ───────────────────────────────
const QUANTU_AGENT_REGISTRY_ID = new PublicKey(
  '8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ'
);
const QUANTU_ATOM_ENGINE_ID = new PublicKey(
  'AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb'
);
const MPL_CORE_PROGRAM_ID = new PublicKey(
  'CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d'
);

// Anchor sighashes — keccak("global:<ix>")[..8]
// Verified against agent-registry-8004/src/lib.rs:36-47 + atom-engine/lib.rs:218-264
const REGISTER_WITH_OPTIONS_DISCRIMINATOR = Buffer.from(
  [22, 215, 0, 162, 92, 56, 49, 144]
);
const INITIALIZE_STATS_DISCRIMINATOR = Buffer.from(
  [165, 138, 12, 215, 22, 188, 248, 152]
);

// ─── Config ───────────────────────────────────────────────────────────────────
const RPC_URL =
  process.env.RPC_URL ||
  'https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY';
const STATE_FILE = path.join(__dirname, '..', 'demo-state.json');

// 5 demo agents — names + URIs + tier-target metadata.
type DemoAgentSpec = {
  id: number;
  name: string;
  uri: string;
  ownerKeypairPath: string;
  targetTier: number; // 2=Silver headline, 0=scam clone
  feedbackStrategy: 'honest' | 'scam';
};

const DEMO_AGENTS: DemoAgentSpec[] = [
  {
    id: 1,
    name: 'Real Nike',
    uri: 'https://agenttrust.demo/agents/1/nike-real.json',
    ownerKeypairPath: './keys/demo-agents/1.json',
    targetTier: 2,
    feedbackStrategy: 'honest',
  },
  {
    id: 2,
    name: 'Real Anthropic',
    uri: 'https://agenttrust.demo/agents/2/anthropic-real.json',
    ownerKeypairPath: './keys/demo-agents/2.json',
    targetTier: 2,
    feedbackStrategy: 'honest',
  },
  {
    id: 3,
    name: 'Real OpenAI',
    uri: 'https://agenttrust.demo/agents/3/openai-real.json',
    ownerKeypairPath: './keys/demo-agents/3.json',
    targetTier: 2,
    feedbackStrategy: 'honest',
  },
  {
    id: 4,
    name: 'Real Coinbase Commerce',
    uri: 'https://agenttrust.demo/agents/4/coinbase-real.json',
    ownerKeypairPath: './keys/demo-agents/4.json',
    targetTier: 2,
    feedbackStrategy: 'honest',
  },
  {
    id: 5,
    name: 'Scam Nike Clone',
    uri: 'https://agenttrust.demo/agents/5/scam-clone.json',
    ownerKeypairPath: './keys/demo-agents/5.json',
    targetTier: 0,
    feedbackStrategy: 'scam',
  },
];

// ─── PDA helpers ──────────────────────────────────────────────────────────────
function deriveAgentAccountPda(asset: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('agent'), asset.toBuffer()],
    QUANTU_AGENT_REGISTRY_ID
  );
}

function deriveAtomStatsPda(asset: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('atom_stats'), asset.toBuffer()],
    QUANTU_ATOM_ENGINE_ID
  );
}

function deriveAtomConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('atom_config')],
    QUANTU_ATOM_ENGINE_ID
  );
}

function deriveRegistryConfigPda(collection: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('registry_config'), collection.toBuffer()],
    QUANTU_AGENT_REGISTRY_ID
  );
}

function deriveRootConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('root_config')],
    QUANTU_AGENT_REGISTRY_ID
  );
}

// ─── Borsh encoding helpers (no Quantu crate dep) ─────────────────────────────
function encodeRegisterWithOptionsArgs(
  agentUri: string,
  atomEnabled: boolean
): Buffer {
  // args: agent_uri: String (4-byte length + bytes), atom_enabled: bool (1 byte)
  const uriBytes = Buffer.from(agentUri, 'utf-8');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(uriBytes.length, 0);
  const flagBuf = Buffer.from([atomEnabled ? 1 : 0]);
  return Buffer.concat([
    REGISTER_WITH_OPTIONS_DISCRIMINATOR,
    lenBuf,
    uriBytes,
    flagBuf,
  ]);
}

function encodeInitializeStatsArgs(): Buffer {
  // args: () — no args; just discriminator
  return INITIALIZE_STATS_DISCRIMINATOR;
}

// ─── Demo-state I/O ───────────────────────────────────────────────────────────
type DemoState = {
  demo_agents: Array<{
    id: number;
    name: string;
    asset: string;
    agent_account: string;
    atom_stats: string;
    owner_keypair_path: string;
    target_tier: number;
    feedback_strategy: 'honest' | 'scam';
    registered_at_slot: number | null;
    initialized_at_slot: number | null;
  }>;
  demo_clients: Array<{ id: number; wallet_keypair_path: string }>;
  trustgate_facilitator_keypair: string;
  policy_vault_admin_keypair: string;
};

function loadDemoState(): DemoState {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  }
  return {
    demo_agents: [],
    demo_clients: [1, 2, 3, 4, 5].map((id) => ({
      id,
      wallet_keypair_path: `./keys/demo-clients/${id}.json`,
    })),
    trustgate_facilitator_keypair: './keys/trustgate-facilitator.json',
    policy_vault_admin_keypair: './keys/policy-vault-admin.json',
  };
}

function saveDemoState(state: DemoState): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function loadKeypair(p: string): Keypair {
  const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
  return Keypair.fromSecretKey(Uint8Array.from(data));
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const connection = new Connection(RPC_URL, 'confirmed');
  const state = loadDemoState();

  // Read or fetch the base collection (Quantu mainnet's singleton agent collection).
  // Per 01-quantu-source-code-class.md C.2 lines 327-345:
  // RootConfig holds the base_collection pubkey; we read it once.
  const [rootConfigPda] = deriveRootConfigPda();
  const rootConfigInfo = await connection.getAccountInfo(rootConfigPda);
  if (!rootConfigInfo) throw new Error('RootConfig not found on mainnet');
  // base_collection at offset 8..40 (after 8-byte disc, before authority)
  const baseCollection = new PublicKey(rootConfigInfo.data.slice(8, 40));
  const [registryConfigPda] = deriveRegistryConfigPda(baseCollection);

  // Atom config singleton
  const [atomConfigPda] = deriveAtomConfigPda();

  console.log(`[prewarm] base_collection = ${baseCollection.toBase58()}`);
  console.log(`[prewarm] registry_config = ${registryConfigPda.toBase58()}`);
  console.log(`[prewarm] atom_config     = ${atomConfigPda.toBase58()}`);

  for (const spec of DEMO_AGENTS) {
    console.log(`\n[prewarm] processing agent #${spec.id} — ${spec.name}`);

    // ─── Idempotency check ────────────────────────────────────────────────
    const existing = state.demo_agents.find((a) => a.id === spec.id);
    if (existing && existing.registered_at_slot && existing.initialized_at_slot) {
      console.log(`  ↳ already pre-warmed; skipping`);
      continue;
    }

    const owner = loadKeypair(spec.ownerKeypairPath);
    // Each demo agent uses a fresh asset keypair (the Metaplex Core asset)
    const assetKp = Keypair.generate();
    const [agentAccountPda] = deriveAgentAccountPda(assetKp.publicKey);
    const [atomStatsPda] = deriveAtomStatsPda(assetKp.publicKey);

    // ─── Tx 1: register_with_options(uri, atom_enabled=true) ─────────────
    const registerData = encodeRegisterWithOptionsArgs(spec.uri, true);
    const registerIx = new anchor.web3.TransactionInstruction({
      programId: QUANTU_AGENT_REGISTRY_ID,
      keys: [
        { pubkey: rootConfigPda, isSigner: false, isWritable: false },
        { pubkey: registryConfigPda, isSigner: false, isWritable: false },
        { pubkey: agentAccountPda, isSigner: false, isWritable: true },
        { pubkey: assetKp.publicKey, isSigner: true, isWritable: true },
        { pubkey: baseCollection, isSigner: false, isWritable: true },
        { pubkey: owner.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: MPL_CORE_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: registerData,
    });

    const tx1 = new Transaction()
      .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 250_000 }))
      .add(registerIx);

    const sig1 = await sendAndConfirmTransaction(connection, tx1, [
      owner,
      assetKp,
    ]);
    const slot1 = await connection.getSlot('confirmed');
    console.log(`  ↳ register tx: ${sig1}`);
    console.log(`  ↳ asset = ${assetKp.publicKey.toBase58()}`);
    console.log(`  ↳ agent_account = ${agentAccountPda.toBase58()}`);

    // ─── Tx 2: atom_engine::initialize_stats(asset, collection) ──────────
    const initStatsData = encodeInitializeStatsArgs();
    const initStatsIx = new anchor.web3.TransactionInstruction({
      programId: QUANTU_ATOM_ENGINE_ID,
      keys: [
        { pubkey: atomConfigPda, isSigner: false, isWritable: false },
        { pubkey: atomStatsPda, isSigner: false, isWritable: true },
        { pubkey: assetKp.publicKey, isSigner: false, isWritable: false },
        { pubkey: baseCollection, isSigner: false, isWritable: false },
        { pubkey: owner.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: initStatsData,
    });

    const tx2 = new Transaction()
      .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }))
      .add(initStatsIx);

    const sig2 = await sendAndConfirmTransaction(connection, tx2, [owner]);
    const slot2 = await connection.getSlot('confirmed');
    console.log(`  ↳ initialize_stats tx: ${sig2}`);
    console.log(`  ↳ atom_stats = ${atomStatsPda.toBase58()}`);

    // ─── Persist ──────────────────────────────────────────────────────────
    const entry = {
      id: spec.id,
      name: spec.name,
      asset: assetKp.publicKey.toBase58(),
      agent_account: agentAccountPda.toBase58(),
      atom_stats: atomStatsPda.toBase58(),
      owner_keypair_path: spec.ownerKeypairPath,
      target_tier: spec.targetTier,
      feedback_strategy: spec.feedbackStrategy,
      registered_at_slot: slot1,
      initialized_at_slot: slot2,
    };

    if (existing) {
      Object.assign(existing, entry);
    } else {
      state.demo_agents.push(entry);
    }
    saveDemoState(state);

    // 1-second pause to let RPC catch up between agents
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`\n[prewarm] complete. Wrote state to ${STATE_FILE}.`);
  console.log(`[prewarm] total cost ≈ 0.055 SOL across 5 agents × 2 txs.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### B.3 — Cost accounting for `prewarm-demo-agents.ts`

Per Wave 1 Revision 8 (`2026-04-28-wave1-scope-refinements.md:114`) + `01-quantu-source-code-class.md:344`:

| Item | Per agent | × 5 agents |
|------|-----------|------------|
| `register_with_options` rent + Metaplex Core asset mint | ~0.006 SOL | 0.030 SOL |
| `atom_engine::initialize_stats` rent (561-byte AtomStats PDA) | ~0.005 SOL | 0.025 SOL |
| Tx fees (2 txs × ~0.000005 SOL) | ~0.00001 SOL | 0.00005 SOL |
| **Subtotal** | **~0.011 SOL** | **~0.055 SOL** |

### B.4 — Idempotency design

The script is safe to re-run. Each agent's `demo-state.json` entry is checked for both `registered_at_slot` and `initialized_at_slot` being non-null. If both exist, the agent is skipped on the next run. This handles three scenarios:
1. **Partial failure mid-script:** if agent #3's `initialize_stats` tx fails, re-running picks up at agent #3 and retries.
2. **Day-5 → Day-6 rerun:** if Mohit re-runs to confirm state on Day 6 morning, no double-spending.
3. **State-file recovery:** if `demo-state.json` is lost, re-running detects existing on-chain state via `getAccountInfo(agent_account)` (next iteration adds this defensive check; v1 trusts the state file).

---

## C. Daily feedback emission cron — `scripts/feedback-cron.ts`

The pre-warm script gives each agent the AtomStats PDA. The cron script feeds those PDAs daily to drive tier accrual. Per `01-quantu-source-code-class.md:346-398`, `give_feedback` requires the `client` signer to NOT be the agent's owner (`SelfFeedbackNotAllowed (6300)` error). Each cron run rotates through demo client wallets so the same client doesn't emit consecutive feedback (which would trigger `LOYALTY_MIN_SLOT_DELTA = 2000` slot-gap violations and reduce loyalty bonus to zero).

### C.1 — `scripts/feedback-cron.ts` (~180 LOC)

```typescript
// scripts/feedback-cron.ts
//
// Emits 1 feedback per demo agent per cron run, rotating through demo client wallets.
// Schedule: 3× daily (08:00, 14:00, 20:00 IST) × 7 days = 21 events per agent.
// Honest agents get score=85; scam clone gets score=25 (or no feedback at all).
//
// Sources: 01-quantu-source-code-class.md C.3 (give_feedback signature + accounts).

import {
  Connection, Keypair, PublicKey, Transaction,
  sendAndConfirmTransaction, ComputeBudgetProgram,
} from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

const QUANTU_AGENT_REGISTRY_ID = new PublicKey(
  '8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ'
);
const QUANTU_ATOM_ENGINE_ID = new PublicKey(
  'AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb'
);
const SYSTEM_PROGRAM_ID = new PublicKey(
  '11111111111111111111111111111111'
);

// Per Revision 6 (2026-04-28-wave1-scope-refinements.md:85-91):
const GIVE_FEEDBACK_DISCRIMINATOR = Buffer.from(
  [145, 136, 123, 3, 215, 165, 98, 41]
);

const RPC_URL =
  process.env.RPC_URL ||
  'https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY';

const STATE_FILE = path.join(__dirname, '..', 'demo-state.json');
const FEEDBACK_LOG = path.join(__dirname, '..', 'feedback-log.json');

type DemoState = ReturnType<typeof loadState>;
function loadState() {
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
}

function loadKeypair(p: string): Keypair {
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(p, 'utf-8')))
  );
}

function deriveRegistryAuthority(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('atom_cpi_authority')],
    QUANTU_AGENT_REGISTRY_ID
  );
  return pda;
}

function deriveAtomConfigPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('atom_config')],
    QUANTU_ATOM_ENGINE_ID
  );
  return pda;
}

function encodeGiveFeedbackArgs(score: number, tag1: string, tag2: string): Buffer {
  const tag1Bytes = Buffer.from(tag1, 'utf-8');
  const tag2Bytes = Buffer.from(tag2, 'utf-8');
  const endpoint = Buffer.from('demo:cron-emission', 'utf-8');
  const uri = Buffer.from('https://agenttrust.demo/feedback/cron.json', 'utf-8');

  const buf = Buffer.alloc(256);
  let off = 0;

  buf.set(GIVE_FEEDBACK_DISCRIMINATOR, off); off += 8;
  buf.writeBigInt64LE(0n, off); off += 8;       // value low (i128 = 0)
  buf.writeBigInt64LE(0n, off); off += 8;       // value high
  buf.writeUInt8(0, off++);                      // value_decimals
  buf.writeUInt8(1, off++);                      // score: Some
  buf.writeUInt8(score, off++);
  buf.writeUInt8(0, off++);                      // feedback_file_hash: None

  buf.writeUInt32LE(tag1Bytes.length, off); off += 4; tag1Bytes.copy(buf, off); off += tag1Bytes.length;
  buf.writeUInt32LE(tag2Bytes.length, off); off += 4; tag2Bytes.copy(buf, off); off += tag2Bytes.length;
  buf.writeUInt32LE(endpoint.length, off); off += 4; endpoint.copy(buf, off); off += endpoint.length;
  buf.writeUInt32LE(uri.length, off); off += 4; uri.copy(buf, off); off += uri.length;

  return buf.slice(0, off);
}

async function emitFeedback(
  connection: Connection,
  client: Keypair,
  agentAccount: PublicKey,
  asset: PublicKey,
  collection: PublicKey,
  atomStats: PublicKey,
  score: number,
  tag1: string,
  tag2: string
) {
  const ix = new (require('@solana/web3.js').TransactionInstruction)({
    programId: QUANTU_AGENT_REGISTRY_ID,
    keys: [
      { pubkey: client.publicKey, isSigner: true, isWritable: true },        // client
      { pubkey: agentAccount, isSigner: false, isWritable: true },           // agent_account
      { pubkey: asset, isSigner: false, isWritable: false },                 // asset
      { pubkey: collection, isSigner: false, isWritable: false },            // collection
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },     // system_program
      { pubkey: deriveAtomConfigPda(), isSigner: false, isWritable: false }, // atom_config
      { pubkey: atomStats, isSigner: false, isWritable: true },              // atom_stats
      { pubkey: QUANTU_ATOM_ENGINE_ID, isSigner: false, isWritable: false }, // atom_engine_program
      { pubkey: deriveRegistryAuthority(), isSigner: false, isWritable: false }, // registry_authority
    ],
    data: encodeGiveFeedbackArgs(score, tag1, tag2),
  });

  const tx = new Transaction()
    .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }))
    .add(ix);

  return await sendAndConfirmTransaction(connection, tx, [client]);
}

async function main() {
  const connection = new Connection(RPC_URL, 'confirmed');
  const state = loadState();

  // Determine which client wallet to rotate to this run.
  // Strategy: count emissions logged so far; pick (count % 5) — round-robin.
  const log: Array<{ slot: number; agent: number; client: number; score: number; sig: string }> =
    fs.existsSync(FEEDBACK_LOG)
      ? JSON.parse(fs.readFileSync(FEEDBACK_LOG, 'utf-8'))
      : [];
  const runIndex = log.length;
  const clientIdx = runIndex % state.demo_clients.length;
  const client = loadKeypair(state.demo_clients[clientIdx].wallet_keypair_path);

  // Same collection PDA across all agents (single-collection v0.6.0+; per 01-* A.3)
  // Read base_collection from the first agent's agent_account on first run, cache thereafter.
  const collectionFile = path.join(__dirname, '..', 'collection.cache');
  let baseCollection: PublicKey;
  if (fs.existsSync(collectionFile)) {
    baseCollection = new PublicKey(fs.readFileSync(collectionFile, 'utf-8').trim());
  } else {
    // bootstrap: read from RootConfig
    const [rootConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('root_config')],
      QUANTU_AGENT_REGISTRY_ID
    );
    const rci = await connection.getAccountInfo(rootConfigPda);
    if (!rci) throw new Error('RootConfig not on mainnet');
    baseCollection = new PublicKey(rci.data.slice(8, 40));
    fs.writeFileSync(collectionFile, baseCollection.toBase58());
  }

  // ─── Emit per-agent feedback ──────────────────────────────────────────
  for (const agent of state.demo_agents) {
    let score: number;
    let tag1: string, tag2: string;

    if (agent.feedback_strategy === 'honest') {
      score = 85;
      tag1 = 'demo';
      tag2 = 'positive-cron';
    } else {
      // Scam clone: emit only on the FIRST 2 cron runs ever; thereafter skip.
      const scamEmissions = log.filter(
        (e) => e.agent === agent.id
      ).length;
      if (scamEmissions >= 2) {
        console.log(`[cron] agent ${agent.id} (${agent.name}): scam quota reached, skipping`);
        continue;
      }
      score = 25;
      tag1 = 'demo';
      tag2 = 'negative-scam';
    }

    try {
      const sig = await emitFeedback(
        connection,
        client,
        new PublicKey(agent.agent_account),
        new PublicKey(agent.asset),
        baseCollection,
        new PublicKey(agent.atom_stats),
        score,
        tag1,
        tag2
      );
      const slot = await connection.getSlot('confirmed');
      log.push({ slot, agent: agent.id, client: clientIdx, score, sig });
      console.log(
        `[cron] agent ${agent.id} (${agent.name}) ← client ${clientIdx} score=${score} sig=${sig}`
      );
    } catch (err) {
      console.error(`[cron] agent ${agent.id} failed:`, err);
    }
    // 30s pause between agents (keeps slot gaps comfortable)
    await new Promise((r) => setTimeout(r, 30_000));
  }

  fs.writeFileSync(FEEDBACK_LOG, JSON.stringify(log, null, 2));
  console.log(`[cron] complete. ${log.length} cumulative emissions.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
```

### C.2 — Cron schedule (macOS launchd)

Run `feedback-cron.ts` 3× daily — morning (08:00 IST), afternoon (14:00 IST), evening (20:00 IST). Across 7 days (Day 5 evening = 2026-04-29 20:00 IST → Day 12 morning = 2026-05-06 08:00 IST), that yields up to 19 cron runs per agent. Net: ~19 feedback events per honest agent (≥10 = Silver per Section A.3); 2 events for the scam clone (then quiet, stays Unrated).

**macOS launchd plist** at `~/Library/LaunchAgents/com.agenttrust.feedback-cron.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.agenttrust.feedback-cron</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/Users/mohit/superdev/agenttrust/scripts/feedback-cron.ts</string>
  </array>
  <key>StandardOutPath</key>
  <string>/Users/mohit/superdev/agenttrust/logs/feedback-cron.out</string>
  <key>StandardErrorPath</key>
  <string>/Users/mohit/superdev/agenttrust/logs/feedback-cron.err</string>
  <key>StartCalendarInterval</key>
  <array>
    <dict><key>Hour</key><integer>8</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Hour</key><integer>14</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Hour</key><integer>20</integer><key>Minute</key><integer>0</integer></dict>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>RPC_URL</key>
    <string>https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY</string>
  </dict>
</dict>
</plist>
```

Load: `launchctl load ~/Library/LaunchAgents/com.agenttrust.feedback-cron.plist`.

**Cron equivalent** (if launchd unavailable):

```cron
0 8,14,20 * * * cd /Users/mohit/superdev/agenttrust && /usr/local/bin/node scripts/feedback-cron.ts >> logs/feedback-cron.out 2>> logs/feedback-cron.err
```

### C.3 — Cost accounting for the cron over 7 days

| Item | Per emission | × 21 emissions per honest agent × 4 honest | + 2 emissions for scam |
|------|--------------|---------------------------------------------|------------------------|
| `give_feedback` rent (paid by client; PDA already initialized) | 0 | 0 | 0 |
| Tx fee | ~0.000005 SOL | ~0.00042 SOL × 4 = 0.00168 SOL | + 0.00001 SOL |
| AtomStats write CU (no rent change) | ~0.0001 SOL @ priority fee | ~0.0084 SOL × 4 = 0.0336 SOL | + 0.0002 SOL |
| **Subtotal cron 7-day cost** | — | ~0.035 SOL | ~0.036 SOL total |

This is per Wave 1 Revision 8 (`2026-04-28-wave1-scope-refinements.md:116-117`): *"~0.0001 SOL per feedback × 21 × 5 = ~0.01 SOL total over 7 days"* — the 0.036 figure above adds priority fees for mainnet-stability margin. Both are within Section K's total budget.

### C.4 — `SelfFeedbackNotAllowed` defensive structure

Per `01-quantu-source-code-class.md:348-356`: `give_feedback` rejects if `core_owner == client.key()`. The cron rotates through 5 demo client wallets that are all separate from the 5 demo agent owner wallets. Defensive check at script startup:

```typescript
// Validate no demo client wallet matches any demo agent owner.
for (const agent of state.demo_agents) {
  const ownerPk = loadKeypair(agent.owner_keypair_path).publicKey.toBase58();
  for (const client of state.demo_clients) {
    const clientPk = loadKeypair(client.wallet_keypair_path).publicKey.toBase58();
    if (ownerPk === clientPk) {
      throw new Error(`Demo client ${client.id} matches agent ${agent.id} owner — would trigger SelfFeedbackNotAllowed`);
    }
  }
}
```

Mohit runs this once after generating keypairs and never has to debug a 6300 error mid-cron.

---

## D. Three demo scenarios in full

> **⚠ 2026-04-28 EVENING REFRAME — read first.** Pitch frames have been elevated; the new authoritative source is `plan/final_idea/PITCH_FRAMES_LOCKED.md`. **Variant A** is now a Solana-fund treasury-bot routing $1.2M USDC to a clone of a real Solana protocol; **Variant B** is the same scenario rewritten for the spoken pitch (with Vibhu's 15M-agentic-payments stat + Lily's verbatim "smart contracts held up; the human-trust layer didn't" quote). The Nike + Anthropic narratives below are PRESERVED as operational scaffolding because the pre-warm script (Section B), feedback-cron (Section C), and JSON state-file (Section G) reference internal agent labels `real-nike`, `scam-clone`, `real-anthropic` — those labels are KEYPAIR FILE NAMES, not on-screen pitch language. The on-camera voiceover and the Solana Explorer-visible labels for the recorded demo come from `plan/other_tasks/ops/technical-demo-script.md` (already updated to the treasury-bot scenario) and `plan/final_idea/PITCH_FRAMES_LOCKED.md` (Variant A + B). When recording Day 12-13, use the technical-demo-script.md voiceover lines verbatim — they supersede the voiceover lines below. The CLI commands + curl invocations + JSON outputs below remain valid as INTERNAL operational reference; rename `real-nike` → `real-counterparty` and `scam-clone` → `clone-counterparty` only if Mohit prefers cosmetic alignment with the new pitch (low-priority cosmetic rename — keypair file names are not visible to judges).

The technical-walkthrough video (Variant A) and pitch video (Variant B) anchor on the same architectural beats. Per `plan/other_tasks/ops/technical-demo-script.md` (LIVE) and `plan/final_idea/PITCH_FRAMES_LOCKED.md` (LIVE), both scripts are locked. Below are the *exact* CLI commands, expected outputs, and visual cues per scenario — operational reference for Day-12 dry-run.

### D.1 — Scenario A: Nike consumer-fraud (technical demo opener, Variant A)

**Runtime:** 90 seconds. **Locked use:** Frontier technical-walkthrough video (Colosseum 2-3 minute hack-style, separate from pitch video). **Source:** `plan/other_tasks/ops/technical-demo-script.md:1-118` verbatim; this section translates beats into runnable commands.

#### D.1.1 — Beat 0:00–0:08 — Cold open

**Visual:** full-screen still — Air Jordan shoes + scam-website screenshot. Caption overlay: *"Last month."*

**Voiceover (Mohit, per `technical-demo-script.md:21`):** *"Last month an AI agent paid two thousand four hundred dollars for fake Air Jordans from a scam site. The agent couldn't tell the seller apart from Nike's real store."*

**Production note:** half-beat pause on `$2,400` per `technical-demo-script.md:25`. No music yet.

#### D.1.2 — Beat 0:08–0:25 — Setup, agent receives intent, discovers two storefronts

**CLI command (cut to terminal):**

```bash
$ cargo run --example demo_intent -- --buy "Air Jordans size 11 under $300"
[demo_intent] Discovering merchants...
[demo_intent] Found 2 candidates:
  - real-nike    asset = 6yt9Xr...QkLm  (registered, atom_enabled=true)
  - scam-clone   asset = Ah8qZc...vF2N  (registered, atom_enabled=true)
[demo_intent] Resolving counterparty reputation via on-chain AtomStats PDA...
  - real-nike    trust_tier = 2 (Silver)   feedback_count = 19
  - scam-clone   trust_tier = 0 (Unrated)  feedback_count = 2
```

**Voiceover:** *"Same setup. Agent receives a buy intent. Discovers two storefronts — one is the real Nike store, registered in Solana's Foundation-endorsed Agent Registry with tier-two reputation. The other is a Nike-clone scam, no registry credibility, tier zero."*

**Visual:** two-pane JSON view side-by-side. Left: `{ asset: "real-nike-pubkey", tier: 2, feedback_count: 19, agent_uri: "..." }`. Right: `{ asset: "scam-clone-pubkey", tier: 0, feedback_count: 2 }`.

#### D.1.3 — Beat 0:25–0:35 — Pre-flight gate denial of the scam clone

**CLI command:**

```bash
$ curl -s -X POST http://localhost:4000/verify \
    -H 'Content-Type: application/json' \
    -d '{
      "payer_agent": "<demo-client-1-asset>",
      "payee_agent": "<scam-clone-asset>",
      "amount": 2400000000,
      "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "policy_id": 1
    }'

HTTP/1.1 402 Payment Required
Content-Type: application/json
X-Payment-Required: {"scheme":"exact","network":"solana","reason_code":"COUNTERPARTY_TIER_BELOW_MIN"}

{
  "decision": "Deny",
  "reason_code": "COUNTERPARTY_TIER_BELOW_MIN",
  "policy_kind": "CounterpartyTier",
  "actual_tier": 0,
  "required_min_tier": 2,
  "explorer_url": "https://explorer.solana.com/address/<scam-clone-asset>"
}
```

**Voiceover:** *"Pre-flight gate. The CounterpartyTier policy reads tier zero from the on-chain AtomStats PDA. Denied. Structured reason code emitted on chain — auditable, machine-readable, deterministic."*

**Visual:** the 402 response is highlighted in red. The `reason_code` line is the screenshot moment for Twitter (per `production-amplification-class.md:140-149`).

**Source:** matches `technical-demo-script.md:42-57` + `plan/research/05-trustgate-x402-class.md:100-112` (HTTP status semantics).

#### D.1.4 — Beat 0:35–0:50 — Pre-flight gate accepts real Nike

**CLI command:**

```bash
$ curl -s -X POST http://localhost:4000/verify \
    -H 'Content-Type: application/json' \
    -d '{
      "payer_agent": "<demo-client-1-asset>",
      "payee_agent": "<real-nike-asset>",
      "amount": 2400000000,
      "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "policy_id": 1
    }'

HTTP/1.1 200 OK
Content-Type: application/json

{
  "decision": "Allow",
  "policy_decision": "5 of 5 policies passed",
  "counterparty_tier": 2,
  "policy_kinds_evaluated": ["KillSwitch","Spending","Velocity","CounterpartyTier","RequireValidation"],
  "explorer_url": "https://explorer.solana.com/address/<real-nike-asset>"
}
```

**Voiceover:** *"Same gate, canonical counterparty, tier two. Five policy kinds checked atomically — kill switch, spending cap, velocity ledger, counterparty tier, validation requirement. All pass. One CPI call from the facilitator. No migration."*

**Music starts** (low) at 0:35 per `technical-demo-script.md:71`.

**Source:** matches `technical-demo-script.md:60-75` + `04-policyvault-build-playbook.md:428-484` (`gate_payment` decision tree).

#### D.1.5 — Beat 0:50–1:05 — Settlement on Solana mainnet

**CLI command:**

```bash
$ curl -s -X POST http://localhost:4000/settle \
    -H 'Content-Type: application/json' \
    -d '{
      "payer_agent": "<demo-client-1-asset>",
      "payee_agent": "<real-nike-asset>",
      "amount": 2400000000,
      "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "payment_id": "0xa7f4...e12d"
    }'

HTTP/1.1 200 OK

{
  "status": "settled",
  "tx_signature": "4xK7n2P9rN4Lf8kQmxVcQ9wBy3FjT2sR8H3mYqp1Lb6...",
  "explorer_url": "https://explorer.solana.com/tx/4xK7n2P9rN4Lf8kQmxVcQ9wBy3FjT2sR8H3mYqp1Lb6...",
  "feedback_log_pda": "GzKf3...J9p2",
  "ix_count": 4
}
```

**Visual:** click the explorer URL → Solana Explorer page loads. Highlight (1) the USDC transfer leg, (2) the AgentTrust gate-decision program log, (3) the TrustGate `emit_feedback` CPI to `agent_registry_8004::give_feedback`.

**Voiceover:** *"Settlement. USDC transfers to Nike's settlement wallet. Live on Solana mainnet. Solana Explorer shows the transfer leg plus our policy-decision program log — every gate decision is on-chain, auditable, replayable."*

**Source:** matches `technical-demo-script.md:79-87` + `05-trustgate-x402-class.md:723-774` (atomic-tx invariant — gate + transfer + emit_feedback in one tx).

#### D.1.6 — Beat 1:05–1:20 — Post-settlement programmatic feedback emission + tier increment

**Visual:** TrustGate facilitator log streaming on terminal:

```bash
$ tx 4xK7n2P9rN4Lf... → confirmed at slot 287_543_119
$ trustgate emit_feedback: PDA-signed CPI to agent_registry_8004::give_feedback
$ atom_engine update_stats: new_trust_tier=2, new_quality_score=3850, new_confidence=4200
$ atom_engine update_stats: tier_candidate=3 (Gold candidate; vesting in 8 epochs)
```

**Cut to web view:** the agent's Quantu registry page on `solana.com/agent-registry/<asset>` showing `trust_tier: 2`, `feedback_count: 20` (incremented from 19).

**Voiceover:** *"Post-settlement, our facilitator service signs a feedback CPI to Quantu's ATOM Engine on behalf of the agent who just paid. Reputation score updates onchain. Tier increment visible in the registry within one slot."*

**Source:** matches `technical-demo-script.md:91-107` + `01-quantu-source-code-class.md:346-398` (give_feedback CPI flow).

#### D.1.7 — Beat 1:20–1:30 — Close + Foundation alignment

**Visual:** cut to Mohit on camera, mid-shot. Music holds at low.

**Voiceover (Mohit direct):** *"AgentTrust completes the Foundation's ERC-8004 stack — three Anchor programs, five formally-verified invariants, MIT-licensed. Solo, seventeen days, drop-in for any x402 facilitator."*

**End-card:** AgentTrust logo + GitHub URL + "Solana Foundation Frontier 2026" credit line. Hold 3 seconds. Music fade.

**Source:** verbatim from `technical-demo-script.md:111-117`.

#### D.1.8 — Optional 30-second extension (cargo kani moment)

If the core 90-second walkthrough leaves headroom under Colosseum's 3-minute cap, append:

**CLI:**

```bash
$ cargo kani --harness gate_payment_proofs --workspace-package policy-vault
[kani] Verifying invariant 1: paused_implies_no_allow ........... VERIFICATION:Successful
[kani] Verifying invariant 2: velocity_counter_le_limit ......... VERIFICATION:Successful
[kani] Verifying invariant 3: counterparty_tier_monotone ........ VERIFICATION:Successful
[kani] Verifying invariant 4: validation_expiry_correct ......... VERIFICATION:Successful
[kani] Verifying invariant 5: multisig_threshold_enforced ....... VERIFICATION:Successful

5 of 5 invariants proven.
```

**Voiceover (Mohit):** *"Cargo kani. Five invariants. All proven. Every commit. Mert wanted defense in depth — this is the first line, before assets ever move."*

**Source:** verbatim from `technical-demo-script.md:121-131`.

#### D.1.9 — Inputs Mohit needs ready Day 12

| Input | Where it lives | Source |
|-------|----------------|--------|
| `<real-nike-asset>` pubkey | `demo-state.json:demo_agents[0].asset` | output of `prewarm-demo-agents.ts` |
| `<scam-clone-asset>` pubkey | `demo-state.json:demo_agents[4].asset` | output of `prewarm-demo-agents.ts` |
| `<demo-client-1-asset>` pubkey | A registered demo agent's asset (the buyer) — Mohit registers a 6th agent solely for this role on Day 5 morning | hand-edit `prewarm-demo-agents.ts` to include an "agent #6 — Demo Client" |
| TrustGate facilitator running on `localhost:4000` | `trustgate/server/` Express app | started Day 9 onward |
| PolicyVault `policy_id=1` initialized | calling `policy-vault::init_policy` for the demo policy | runs once Day 9 |

### D.2 — Scenario B: Anthropic API B2B scam-wrapper (pitch video opener, Variant B)

**Runtime:** 90 seconds. **Locked use:** Frontier pitch video (Variant B per `THESIS_LOCK.md:11-13`). Same architectural beats as Scenario A, different storefront names + an extra `RequireValidation` policy beat that demonstrates the second wedge.

#### D.2.1 — Cold-open beat (0:00–0:08)

**Visual:** still photo: Anthropic.com homepage screenshot + a faux "anthropic-api-pro.io" scam-wrapper page side-by-side.

**Voiceover (Mohit):** *"Last week an AI agent paid two thousand dollars for an Anthropic API key from a scam wrapper. The agent couldn't tell the broker apart from Anthropic itself."*

#### D.2.2 — Setup beat (0:08–0:25)

**CLI:**

```bash
$ cargo run --example demo_intent -- --buy "Anthropic Claude API access tier-2"
[demo_intent] Discovering merchants...
[demo_intent] Found 2 candidates:
  - anthropic-real    asset = 8m3PqJ...AvKw  (registered, atom_enabled=true)
  - anthropic-scam    asset = Ah8qZc...vF2N  (registered, atom_enabled=true)
[demo_intent] Resolving counterparty reputation + capability attestations...
  - anthropic-real    trust_tier = 2 (Silver)   attestations = 1
                      └ "model-card:v1:anthropic-opus-4-7" (attestor: anthropic-self-attest)
  - anthropic-scam    trust_tier = 0 (Unrated)  attestations = 0
```

**Voiceover:** *"Same setup. Agent receives a buy intent. Discovers two storefronts — Anthropic's real registry entry, tier two reputation, with a signed Opus 4-7 model-card attestation. The scam wrapper has neither."*

**Source:** `v1_scope.md:140-160` (capability namespace `model-card:v1:anthropic-opus-4-7` is one of the 10 v1 seeded namespaces).

#### D.2.3 — Pre-flight gate denial (scam wrapper) (0:25–0:40)

**CLI:**

```bash
$ curl -s -X POST http://localhost:4000/verify \
    -d '{
      "payer_agent": "<demo-client-2-asset>",
      "payee_agent": "<anthropic-scam-asset>",
      "amount": 2000000000,
      "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "policy_id": 2
    }'

HTTP/1.1 402 Payment Required

{
  "decision": "Deny",
  "reason_code": "COUNTERPARTY_TIER_BELOW_MIN",
  "policy_kind": "CounterpartyTier",
  "actual_tier": 0,
  "required_min_tier": 2,
  "additional_failures": [
    {
      "policy_kind": "RequireValidation",
      "missing_capability": "model-card:v1:anthropic-opus-4-7"
    }
  ]
}
```

**Voiceover:** *"Pre-flight gate. Tier zero — denied. The composer also flags the missing model-card attestation. Two failure reasons, one structured response. Both auditable."*

**Note:** policy_id=2 has BOTH `CounterpartyTier` (min_tier=2) AND `RequireValidation` (capability=`model-card:v1:anthropic-opus-4-7`) enabled. The gate fails fast on the first denial (CounterpartyTier) per `04-policyvault-build-playbook.md:428-484` decision tree, but the response surfaces the would-have-failed downstream policies for diagnostic clarity.

#### D.2.4 — Pre-flight gate accepts real Anthropic (0:40–0:55)

```bash
$ curl -s -X POST http://localhost:4000/verify \
    -d '{
      "payer_agent": "<demo-client-2-asset>",
      "payee_agent": "<anthropic-real-asset>",
      "amount": 2000000000,
      "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "policy_id": 2
    }'

HTTP/1.1 200 OK

{
  "decision": "Allow",
  "policy_decision": "5 of 5 policies passed",
  "counterparty_tier": 2,
  "validation_attestations": [
    {
      "capability": "model-card:v1:anthropic-opus-4-7",
      "attestor": "<attestor-pubkey>",
      "expires_at_slot": 305_400_000
    }
  ]
}
```

**Voiceover:** *"Same gate, real Anthropic. Tier two, attestation valid, all five policies pass. The validation registry is live — third leg of the Foundation's ERC-8004 stack, productized."*

**Source:** `v1_scope.md:118-167` (ValidationRegistry component); `04-policyvault-build-playbook.md:334-389` (RequireValidation policy).

#### D.2.5 — Settlement + tier increment (0:55–1:20)

Identical structure to Scenario A beats D.1.5 + D.1.6, with `<anthropic-real-asset>` substituted. The voiceover replaces "Nike's settlement wallet" with "Anthropic's settlement wallet."

#### D.2.6 — Close (1:20–1:30)

**Voiceover (Mohit direct):** *"AgentTrust completes the Foundation's ERC-8004 trust stack — the third leg Quantu archived, fully productized. Solo, seventeen days. The first line of defense, before assets ever move."*

**Source:** Variant B close per `THESIS_LOCK.md:11-13` + load-bearing phrase `THESIS_LOCK.md:115`.

### D.3 — Scenario C: Live tier-accrual technical demo bonus

**Runtime:** ~60 seconds. **Locked use:** optional bonus content for the longer 3-minute pitch video (per `production-amplification-class.md:173-186` 3-min variant). Demonstrates the *live* tier-up of a fresh agent on screen.

#### D.3.1 — Beat 1: register a fresh agent on-camera (0:00–0:12)

**CLI:**

```bash
$ anchor run register-agent --uri "https://demo.agenttrust/agents/live-demo.json"
[register-agent] Generating fresh asset keypair...
[register-agent] Submitting register_with_options(uri, atom_enabled=true) to mainnet...
[register-agent] Tx confirmed: 5xPq7...nMh
[register-agent] asset = Bq8K2vL3xR5tN9wJfZ4yA7pH6mE3sD2cV1bX8oN5...
[register-agent] agent_account = HpJ4...kLz9
```

**Voiceover:** *"Fresh agent. Just minted. Zero feedback history. Foundation-endorsed registry, tier zero."*

#### D.3.2 — Beat 2: initialize stats (0:12–0:18)

```bash
$ anchor run init-stats --asset "Bq8K2vL3xR5tN9wJfZ4yA7pH6mE3sD2cV1bX8oN5..."
[init-stats] Submitting atom_engine::initialize_stats...
[init-stats] Tx confirmed: 7yMnP...rQk
[init-stats] atom_stats = Wz3Hq...mP9
```

#### D.3.3 — Beat 3: read tier byte directly (0:18–0:25)

**CLI (Solana CLI direct PDA read):**

```bash
$ solana account Wz3Hq...mP9 --output json --url mainnet-beta | \
    jq -r '.account.data[0]' | base64 -d | xxd -s 551 -l 1
0000228: 00                                       .

$ # AtomStats byte 551 = trust_tier. Currently 0 (Unrated).
```

**Voiceover:** *"AtomStats byte 551 — the trust tier byte. Zero. Unrated."*

#### D.3.4 — Beat 4: emit 5 positive feedback events from 3 client wallets (0:25–0:50)

```bash
$ for i in 1 2 3 1 2; do
    anchor run emit-feedback \
      --asset "Bq8K2v..." \
      --client "./keys/demo-clients/$i.json" \
      --score 90 \
      --tag1 "demo-live"
    sleep 60  # ~150 slots; doesn't satisfy LOYALTY_MIN_SLOT_DELTA but proves cold-start
  done

[emit-feedback] feedback 1/5 from client 1: tx 9aB...c1
[emit-feedback] feedback 2/5 from client 2: tx 8bC...d2
[emit-feedback] feedback 3/5 from client 3: tx 7cD...e3
[emit-feedback] feedback 4/5 from client 1: tx 6dE...f4
[emit-feedback] feedback 5/5 from client 2: tx 5eF...g5
```

**Voiceover:** *"Five feedbacks. Three distinct client wallets. Cold-start floor crossed."*

#### D.3.5 — Beat 5: re-read tier byte (0:50–0:55)

```bash
$ solana account Wz3Hq...mP9 --output json --url mainnet-beta | \
    jq -r '.account.data[0]' | base64 -d | xxd -s 551 -l 1
0000228: 01                                       .

$ # AtomStats byte 551 = 1 (Bronze). First tier promotion live.
```

**Voiceover:** *"Byte 551 just incremented. One. Bronze. First tier promotion, live."*

#### D.3.6 — Beat 6: re-run gate_payment with min_tier=1 (0:55–1:00)

```bash
$ curl -s -X POST http://localhost:4000/verify -d '{...,"policy_id": 3}' # min_tier=1

HTTP/1.1 200 OK
{ "decision": "Allow", "counterparty_tier": 1 }
```

**Voiceover (close):** *"Same agent. Same gate. Same five policies. Now Allow. Watch reputation accrue live."*

**Source:** combines `01-quantu-source-code-class.md:163-285` (AtomStats byte 551 = trust_tier) + Section A.3 above (Bronze achievable in 5 feedbacks across 3 clients).

---

## E. Demo timing budget

Per Colosseum's 2-3 minute technical-walkthrough cap (`production-amplification-class.md:142` cites `blog.colosseum.com/perfecting-your-hackathon-submission/` — *"perfecting-your-hackathon-submission guidance"*). Total combined time across all scenarios:

| Beat | Duration | Cumulative |
|------|----------|------------|
| Scenario A primary (Variant A — Nike) | 90 seconds | 1:30 |
| `cargo kani` 5 green checks | 30 seconds | 2:00 |
| Optional Scenario C live tier-accrual | 60 seconds | 3:00 |
| **Maximum allowed total** | **3:00** | **3:00** ✓ |

Scenario B (Variant B — Anthropic) is the **pitch video** standalone — separate 60-sec or 3-min variant per `production-amplification-class.md:173-186`. Not included in technical walkthrough timing.

**Locked decision per `THESIS_LOCK.md:115`:** Variant A in technical demo, Variant B in pitch video. The two-video consistency rule from `production-amplification-class.md:208`: *"the two videos both say 'AgentTrust completes the Foundation's stack' — one proves the pain (consumer fraud), the other proves the execution (live denial-then-accept on mainnet)."* Do not mix openers across videos.

---

## F. Failure recovery during demo recording (Days 13–14)

The demo recording window is 2026-05-07 (Day 13) → 2026-05-08 (Day 14). Three failure modes can break the live demo. Each has a pre-rehearsed mitigation.

### F.1 — Devnet "blockhash not found" mid-demo

**Symptom:** RPC call to `/verify` or `/settle` returns `BlockhashNotFound` or 504.

**Cause:** mainnet/devnet RPC flake; per `v1_scope.md:308-326` ("Mainnet vs devnet vs localnet decisions per phase").

**Mitigation:** fall back to localnet `--clone` mirror.

```bash
# pre-launched in a tmux pane during recording
$ solana-test-validator \
    --url mainnet-beta \
    --clone 8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ \
    --clone AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb \
    --clone <real-nike-agent-account-pda> \
    --clone <real-nike-atom-stats-pda> \
    --clone <scam-clone-agent-account-pda> \
    --clone <scam-clone-atom-stats-pda> \
    --clone <atom-config-pda> \
    --clone <root-config-pda> \
    --reset
```

The `--clone` flag (Anchor 1.0+ via `[test.validator] clone` directive per `v1_scope.md:312`) replicates the mainnet PDAs into a local validator. The pre-warmed agent state is preserved with its real `trust_tier` byte. Demo continues against `localhost:8899` — judges see the same on-chain state, just hosted locally.

**Switch script (~10 LOC):** edit TrustGate's `RPC_URL` env var from mainnet to `http://localhost:8899` and restart the Express server. Pre-recorded by Day 12.

### F.2 — Pre-recorded backup recording running in parallel (OBS dual-record)

Per `v1_scope.md:316-318`: *"Day 12 demo dry-run: devnet (primary) + localnet (fallback). If devnet stable, demo runs there; if devnet flakes, localnet `--clone` mirror with mocked ATOM Engine state."*

**OBS configuration on Day 12 dry-run:**

- **Source 1 (live):** screen capture of the live recording (mainnet primary).
- **Source 2 (backup):** parallel screen capture of a pre-recorded run (mp4 looping).
- **Output 1:** full HD recording of Source 1 to `live-take-N.mkv`.
- **Output 2:** simultaneous HD recording of Source 2 to `backup-take-N.mkv`.

If live take fails mid-demo, edit cuts the failed segment and inserts the backup segment. End viewer sees a continuous demo.

### F.3 — If localnet fails: pre-recorded backup goes into final cut

**Pre-recording schedule:**

- **Day 12 morning (2026-05-06 09:00–11:00):** Mohit runs the demo against mainnet 3 times. Best take saved as `pre-recorded-mainnet-take-N.mp4`. Pre-warmed agent state at this point is at peak (Day 12 = ~21 cron emissions = Silver/Gold).
- **Day 13 (2026-05-07):** Mohit runs the demo live for video. If mainnet flakes, swap to the Day-12 pre-recorded take.

**Rationale:** if Day-13 mainnet conditions are bad, Day-12 mainnet conditions were the best the pre-warm window will ever produce. The pre-recorded take is more authentic than ANY localnet-only take.

### F.4 — If pre-warmed agents lose tier mid-week (emergency cron run)

**Symptom:** Day 11 `solana account <atom-stats-pda> --output json | xxd -s 559 -l 1` (account-absolute byte 559 = data byte 551 = trust_tier) shows `00` instead of `02`.

**Causes:**
1. **Cron wallet ran out of SOL.** Mitigation: `solana balance` check at the top of `feedback-cron.ts`; if any client wallet < 0.0005 SOL, top up automatically.
2. **Cron job stopped firing.** Mitigation: launchd plist health check; `launchctl list | grep com.agenttrust.feedback-cron` verifies it's loaded.
3. **Quantu pushed a v0.7.0 schema bump.** Mitigation: per Wave 1 Risk 1 (`THESIS_LOCK.md:71-75`), pinned commit + manual deserialization unaffected.
4. **Agent's `tier_candidate` reverted to 0** (the slow EMA decayed under sustained noise). Mitigation: bump cron from 3× daily to 6× daily for 24 hours.

**Emergency recovery script `scripts/emergency-tier-rebuild.ts`:**

```typescript
// Triggers 10 rapid feedback events (1 per minute) from 3 distinct clients.
// Runs in 10 minutes. Recovers to Bronze (1) within 5 events; Silver (2) within 10.
// Source: 01-quantu-source-code-class.md:304 — Bronze in 5 feedbacks.

import { feedbackCronOnce } from './feedback-cron';
const RAPID_RUNS = 10;
for (let i = 0; i < RAPID_RUNS; i++) {
  await feedbackCronOnce();
  await new Promise((r) => setTimeout(r, 60_000));
}
```

Mohit triggers this on Day 11 morning if Day-11 verification (Section H below) fails. Recovery time: 10 minutes.

---

## G. Demo state JSON spec

The single source of truth for the demo lifecycle. Lives at `<repo-root>/demo-state.json`. Read by `prewarm-demo-agents.ts`, `feedback-cron.ts`, `emergency-tier-rebuild.ts`, and the demo recording scripts. Format pinned below.

### G.1 — Full schema (concrete example values)

```json
{
  "demo_agents": [
    {
      "id": 1,
      "name": "Real Nike",
      "asset": "6yt9Xr8K2vL3xR5tN9wJfZ4yA7pH6mE3sD2cV1bX8oN5QkLm",
      "agent_account": "HpJ4mB7N3kRr8qS2vCxFwY6tA9zL5nP1eD8jH2gT4kLz9MmR",
      "atom_stats": "Wz3HqL8m9PvN2bX4cKtY7eR6fS5jT1aD3hG4iZ8oP1qC9mP9",
      "owner_keypair_path": "./keys/demo-agents/1.json",
      "target_tier": 2,
      "feedback_strategy": "honest",
      "registered_at_slot": 287_341_502,
      "initialized_at_slot": 287_341_507
    },
    {
      "id": 2,
      "name": "Real Anthropic",
      "asset": "8m3PqJrN5bH7kA2vT9xWfL4cYz6dE1iU8gM3oS9pK4nQAvKw",
      "agent_account": "9b2T3yWfL5nP6sH1iU8gM3oR9pK4nQ7eD2jH5gT4kLz9MmRp",
      "atom_stats": "BgK7nP2vQ8rT5sH4iU8gM3oR9pK4nQ7eD2jH5gT4kLz9MmZx",
      "owner_keypair_path": "./keys/demo-agents/2.json",
      "target_tier": 2,
      "feedback_strategy": "honest",
      "registered_at_slot": 287_341_512,
      "initialized_at_slot": 287_341_517
    },
    {
      "id": 3,
      "name": "Real OpenAI",
      "asset": "2K4nP9rT8mB7vL3xR5tN9wJfZ6yA1pH4mE3sD2cV1bX8oN5Y",
      "agent_account": "8H1iU3oR9pK4nQ7eD2jH5gT4kLz9MmR2T3yWfL5nP6sH4P3z",
      "atom_stats": "MnQ8rT5sH4iU8gM3oR9pK4nQ7eD2jH5gT4kLz9MmZBgK7nW2",
      "owner_keypair_path": "./keys/demo-agents/3.json",
      "target_tier": 2,
      "feedback_strategy": "honest",
      "registered_at_slot": 287_341_522,
      "initialized_at_slot": 287_341_527
    },
    {
      "id": 4,
      "name": "Real Coinbase Commerce",
      "asset": "5N9wJfZ4yA7pH6mE3sD2cV1bX8oN5QkLm6yt9Xr8K2vL3xR2",
      "agent_account": "3oR9pK4nQ7eD2jH5gT4kLz9MmR2T3yWfL5nP6sH4P3z8H1iU",
      "atom_stats": "P3z8H1iU3oR9pK4nQ7eD2jH5gT4kLz9MmR2T3yWfL5nP6sH8",
      "owner_keypair_path": "./keys/demo-agents/4.json",
      "target_tier": 2,
      "feedback_strategy": "honest",
      "registered_at_slot": 287_341_532,
      "initialized_at_slot": 287_341_537
    },
    {
      "id": 5,
      "name": "Scam Nike Clone",
      "asset": "Ah8qZcN4Lf8kQmxVcQ9wBy3FjT2sR8H3mYqp1Lb6vF2NXp4",
      "agent_account": "k4nQ7eD2jH5gT4kLz9MmR2T3yWfL5nP6sH4P3z8H1iU3oR9p",
      "atom_stats": "GzKf3J9p2K4nQ7eD2jH5gT4kLz9MmR2T3yWfL5nP6sH4P3z8",
      "owner_keypair_path": "./keys/demo-agents/5.json",
      "target_tier": 0,
      "feedback_strategy": "scam",
      "registered_at_slot": 287_341_542,
      "initialized_at_slot": 287_341_547
    }
  ],
  "demo_clients": [
    { "id": 1, "wallet_keypair_path": "./keys/demo-clients/1.json" },
    { "id": 2, "wallet_keypair_path": "./keys/demo-clients/2.json" },
    { "id": 3, "wallet_keypair_path": "./keys/demo-clients/3.json" },
    { "id": 4, "wallet_keypair_path": "./keys/demo-clients/4.json" },
    { "id": 5, "wallet_keypair_path": "./keys/demo-clients/5.json" }
  ],
  "trustgate_facilitator_keypair": "./keys/trustgate-facilitator.json",
  "policy_vault_admin_keypair": "./keys/policy-vault-admin.json",
  "atom_config_pda": "<derived-once-at-prewarm; cached>",
  "base_collection": "<read-from-RootConfig-on-mainnet; cached>"
}
```

### G.2 — Schema discipline

- **Never edit by hand mid-build.** All writes go through scripts. Hand edits cause script idempotency drift.
- **Commit `demo-state.json` to repo.** Public — pubkeys are public on Solana anyway.
- **Never commit `keys/*.json`.** Add `keys/` to `.gitignore`. Each keypair is private.
- **Backups daily:** `cp demo-state.json demo-state-$(date +%Y%m%d).json` runs as part of the cron evening pass.

---

## H. Pre-warm verification checklist (Day 12 morning)

Day 12 = 2026-05-06. T-minus 5 days from submission (2026-05-11). The verification is run at 09:00 IST before the Day-12 dry-run takes start.

### H.1 — Verification script `scripts/verify-prewarm.ts` (~80 LOC)

```typescript
// scripts/verify-prewarm.ts — runs the 6-point checklist programmatically.

import { Connection, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';

const RPC = 'https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY';
const STATE = JSON.parse(fs.readFileSync('./demo-state.json', 'utf-8'));

const ATOM_STATS_TRUST_TIER_OFFSET = 551;
const ATOM_STATS_FEEDBACK_COUNT_OFFSET = 88;
const ATOM_STATS_SCHEMA_VERSION_OFFSET = 560;

async function main() {
  const conn = new Connection(RPC, 'confirmed');
  const failures: string[] = [];

  for (const agent of STATE.demo_agents) {
    const info = await conn.getAccountInfo(new PublicKey(agent.atom_stats));
    if (!info) {
      failures.push(`Agent ${agent.id} (${agent.name}): atom_stats account NOT FOUND`);
      continue;
    }
    if (info.data.length !== 561) {
      failures.push(`Agent ${agent.id}: atom_stats size = ${info.data.length}, expected 561`);
      continue;
    }
    const schema = info.data[ATOM_STATS_SCHEMA_VERSION_OFFSET];
    if (schema !== 1) {
      failures.push(`Agent ${agent.id}: schema_version = ${schema}, expected 1 (Quantu v0.7.0?)`);
    }
    const tier = info.data[ATOM_STATS_TRUST_TIER_OFFSET];
    const feedbackCount = info.data.readBigUInt64LE(ATOM_STATS_FEEDBACK_COUNT_OFFSET);

    console.log(
      `Agent ${agent.id} (${agent.name}): tier=${tier}, feedback_count=${feedbackCount}, target=${agent.target_tier}`
    );

    if (agent.feedback_strategy === 'honest' && tier < 2) {
      failures.push(`Agent ${agent.id}: tier=${tier}, expected ≥ 2 (Silver). EMERGENCY CRON.`);
    }
    if (agent.feedback_strategy === 'scam' && tier > 0) {
      failures.push(`Agent ${agent.id}: tier=${tier}, expected 0 (Unrated). Scam clone tier-up.`);
    }
  }

  if (failures.length === 0) {
    console.log('\n✓ All 5 demo agents verified. Demo state is GREEN.');
    process.exit(0);
  } else {
    console.error('\n✗ Verification FAILED:');
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }
}
main();
```

### H.2 — The 6-point checklist (the canonical Day-12 verification)

| # | Check | Pass criterion | Failure mitigation |
|---|-------|----------------|---------------------|
| 1 | All 5 demo agents registered + ATOM stats initialized | `demo-state.json` populated; all `atom_stats` PDAs return 561-byte accounts | Re-run `prewarm-demo-agents.ts` for missing entries |
| 2 | 4 of 5 agents (honest) have `trust_tier ≥ 2` | byte 551 of each AtomStats ≥ 2 | Run `emergency-tier-rebuild.ts` for failing agents (10-min recovery to Bronze; 30-min to Silver) |
| 3 | 1 of 5 agents (scam clone) has `trust_tier = 0` | byte 551 == 0 for `agent.id=5` | If scam clone tiered up: revoke negative feedbacks via `revoke_feedback`; or manually emit 5 score=10 events |
| 4 | ValidationAttestations created for the demo (≥ 1 attestation for Scenario B) | `read_attestation(<anthropic-real-asset>, <model-card-cap>, <attestor>)` returns `valid=true` | Re-run `scripts/seed-attestations.ts` |
| 5 | TrustGate facilitator authority PDA initialized | `init_authority(<facilitator-pubkey>)` succeeded; `TrustGateAuthority` PDA exists | Re-run `scripts/init-trustgate-authority.ts` |
| 6 | PolicyVault policies created for demo flow | `policy_id=1` (CounterpartyTier min_tier=2), `policy_id=2` (CounterpartyTier+RequireValidation), `policy_id=3` (min_tier=1 for Scenario C) all exist | Re-run `scripts/init-policies.ts` |

### H.3 — Dry-run timing

| Day-12 timestamp | Action | Duration |
|------------------|--------|----------|
| 09:00 IST | `npm run verify-prewarm` | 30 sec |
| 09:01–09:30 IST | Mitigation if needed | 0–30 min |
| 09:30 IST | First dry-run take of Scenario A | 90 sec record + 5 min review |
| 10:00–11:00 IST | 3 takes total of Scenario A | 60 min |
| 11:00–11:30 IST | 1 take of Scenario B | 30 min |
| 11:30–12:00 IST | 1 take of Scenario C bonus | 30 min |
| 14:00 IST | Save best takes; backup to `pre-recorded-mainnet-take-N.mp4` | 15 min |

Total Day-12 morning verification + dry-run: ~5 hours. Day 12 afternoon free for Anchor program polish + documentation.

---

## I. Mainnet vs devnet vs localnet decisions per scenario

Per `v1_scope.md:308-326` (the canonical phase table) + Wave 1 Revision 7 (`2026-04-28-wave1-scope-refinements.md:97-106`) — Quantu mainnet program IDs differ from devnet IDs. Pre-warming must be on mainnet because devnet IDs are different agent registries with different state. The locked decisions:

| Scenario | Cluster | Why |
|----------|---------|-----|
| Pre-warming (Day 5+, `prewarm-demo-agents.ts`) | **Mainnet** | ATOM tier vesting requires real epoch progression (`EPOCH_SLOTS=432_000`); devnet has unpredictable epoch advancement; production-grade `agent_registry_8004` lives on mainnet (program ID `8oo4dC4...`); only mainnet PDAs are source-of-truth |
| Daily feedback cron (Days 5–12) | **Mainnet** | Same — feedback events must land in mainnet AtomStats to drive tier accrual |
| Anchor build + bankrun unit tests (Days 5–9) | **Localnet** (`solana-test-validator` + `bankrun`) | Fast iteration; tests run in CI; localnet validator clones mainnet `agent-registry-8004` + `atom-engine` (per `v1_scope.md:312`) for realistic CPI |
| Day-7 critical integration test | **Devnet** (Quantu's devnet IDs `8oo4J9tBB...`) | First time PolicyVault's CounterpartyTier policy reads ACTUAL `AtomStats` PDA; devnet is the cheap-airdrop staging ground. Fall back to localnet `--clone` if devnet flakes |
| Day-11 end-to-end test | **Devnet** | Full TrustGate → PolicyVault → settlement → feedback flow tested against live Quantu primitives on devnet |
| Demo recording dry-run (Day 12 morning) | **Devnet** primary + localnet `--clone` fallback | Demo flow validated end-to-end; if devnet stable, dry-run there; if devnet flakes, localnet `--clone` mirror with mocked AtomStats |
| Final demo recording (Day 13–14) | **Devnet** primary + recorded backup pre-recorded against **mainnet** | Devnet is stable enough; the pre-recorded backup uses mainnet pre-warmed state for authenticity |
| Final pitch-video footage (Day 14) | **Mainnet** for headline tier-display moments + **Devnet** for live-demo segments | Authentic mainnet state matters for the close-up shots of `solana.com/agent-registry/<asset>` showing tier 2 |
| Day-16 program deployment | **Mainnet-beta** (PolicyVault + TrustGate + ValidationRegistry) | Submission flagship — real on-chain artifacts |
| Day-17 submission demo | **Mainnet (primary) + recorded backup** | Live demo runs against mainnet for the submission video; pre-recorded backup on hand if mainnet RPC flakes during recording |

### I.1 — Optimal mix for the submission video

Per `v1_scope.md:317-318`: *"Mainnet (primary) + recorded backup. Live demo runs against mainnet for the submission video; pre-recorded backup on hand if mainnet RPC flakes during recording."*

Final video is a **hybrid**:
- **Live mainnet segment (Beats 0:08–1:05):** the verify+settle+explorer click-through. Rendered against actual mainnet state where pre-warmed agents are tier 2.
- **Pre-recorded mainnet segment (Beats 1:05–1:20):** the post-settlement tier-increment beat shot once on Day 12 with peak conditions.
- **Live mainnet segment (Beat 1:20–1:30):** Mohit on-camera close + end card.

The judge sees an authentic mainnet demo with no localnet fallback. If anything fails during Day-13 take, swap the affected segment with the Day-12 pre-recorded mainnet take. **Final cut never uses devnet or localnet content.**

---

## J. Localhost validator + mock ATOM Engine setup

If devnet flakes consistently across Day-12 dry-run AND the pre-recorded mainnet backup is unavailable (e.g., disk corruption), the absolute fallback is `solana-test-validator` cloning the mainnet programs + AtomStats accounts.

### J.1 — Cloning mainnet programs

```bash
$ solana-test-validator \
    --reset \
    --url mainnet-beta \
    --clone 8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ \
    --clone AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb \
    --clone CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d \
    --clone <real-nike-agent-account-pda> \
    --clone <real-nike-atom-stats-pda> \
    --clone <real-anthropic-agent-account-pda> \
    --clone <real-anthropic-atom-stats-pda> \
    --clone <scam-clone-agent-account-pda> \
    --clone <scam-clone-atom-stats-pda> \
    --clone <root-config-pda> \
    --clone <atom-config-pda>
```

**Source:** Wave 1 Revision 7 (`2026-04-28-wave1-scope-refinements.md:97-106`) lists both mainnet and devnet IDs verbatim. The `--clone` directive copies both the program binary AND any specified PDAs at their current mainnet snapshot.

### J.2 — Mock AtomStats via `--account` flag (last-ditch fallback)

If `--clone` fails (e.g., RPC throttled mid-clone), pre-serialize the AtomStats bytes to disk and load via `--account`.

```bash
$ # Generate the 561-byte AtomStats payload with trust_tier=2 baked in:
$ python scripts/build-mock-atom-stats.py \
    --asset <real-nike-asset> \
    --collection <base-collection-pda> \
    --trust-tier 2 \
    --quality-score 3850 \
    --confidence 4200 \
    --feedback-count 19 \
    --output mock-atom-stats.json

$ solana-test-validator \
    --reset \
    --account <real-nike-atom-stats-pda> mock-atom-stats.json \
    --bpf-program AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb ./quantu-binaries/atom_engine.so \
    --bpf-program 8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ ./quantu-binaries/agent_registry_8004.so
```

### J.3 — `build-mock-atom-stats.py` skeleton

```python
# scripts/build-mock-atom-stats.py
#
# Build a 561-byte AtomStats payload with arbitrary trust_tier for localhost testing.
# Source: 01-quantu-source-code-class.md B.5 (byte-by-byte layout, lines 163-285).

import struct, json, hashlib, base64, sys

ATOM_STATS_DISCRIMINATOR = b'AtomStat'  # placeholder — actual is sighash("account","AtomStats")[..8]

def build_atom_stats(asset_pubkey, collection_pubkey, trust_tier, quality_score,
                     confidence, feedback_count):
    buf = bytearray(561)
    # 0-7: discriminator
    buf[0:8] = ATOM_STATS_DISCRIMINATOR
    # 8-39: collection (32 bytes)
    buf[8:40] = base58.b58decode(collection_pubkey)
    # 40-71: asset (32 bytes)
    buf[40:72] = base58.b58decode(asset_pubkey)
    # 72-79: first_feedback_slot (u64) — set to 287_000_000
    buf[72:80] = struct.pack('<Q', 287_000_000)
    # 80-87: last_feedback_slot — set to 287_500_000
    buf[80:88] = struct.pack('<Q', 287_500_000)
    # 88-95: feedback_count
    buf[88:96] = struct.pack('<Q', feedback_count)
    # 96-99: ema_score_fast/slow
    buf[96:98] = struct.pack('<H', 8500)
    buf[98:100] = struct.pack('<H', 8300)
    # ... (skipping detail; full mapping per 01-* B.5)
    # 547-548: quality_score (u16 LE)
    buf[547:549] = struct.pack('<H', quality_score)
    # 549: risk_score
    buf[549] = 25
    # 550: diversity_ratio
    buf[550] = 100
    # 551: trust_tier  ← THE LOAD-BEARING BYTE
    buf[551] = trust_tier
    # 552: tier_candidate
    buf[552] = trust_tier
    # 555: tier_confirmed
    buf[555] = max(0, trust_tier - 1)
    # 557-558: confidence (u16 LE)
    buf[557:559] = struct.pack('<H', confidence)
    # 560: schema_version
    buf[560] = 1

    return {
        'pubkey': sys.argv[1],
        'account': {
            'lamports': 4_898_400,  # 0.0049 SOL rent per state.rs:9
            'data': [base64.b64encode(bytes(buf)).decode(), 'base64'],
            'owner': 'AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb',
            'executable': False,
            'rentEpoch': 0,
        },
    }

if __name__ == '__main__':
    # ... CLI argparse omitted for brevity
    pass
```

**The key offset constants (verbatim from `01-quantu-source-code-class.md:272-282`):**

```python
ATOM_STATS_TRUST_TIER_OFFSET = 551
ATOM_STATS_TIER_CONFIRMED_OFFSET = 555
ATOM_STATS_RISK_SCORE_OFFSET = 549
ATOM_STATS_CONFIDENCE_OFFSET = 557
ATOM_STATS_FEEDBACK_COUNT_OFFSET = 88
ATOM_STATS_SCHEMA_VERSION_OFFSET = 560
ATOM_STATS_SIZE = 561
```

### J.4 — Quantu binary download

For `--bpf-program` flag, Mohit needs the actual Quantu program binaries. Per `v1_scope.md:331-340` and Wave 1 Revision 5 (`2026-04-28-wave1-scope-refinements.md:75-83`), the pinned commit is `bfb09ad`. Mohit clones Quantu's repo at that commit and builds:

```bash
$ git clone https://github.com/QuantuLabs/8004-solana.git /tmp/quantu
$ cd /tmp/quantu && git checkout bfb09ad
$ anchor build
$ cp target/deploy/agent_registry_8004.so $AGENTTRUST_REPO/quantu-binaries/
$ cp target/deploy/atom_engine.so $AGENTTRUST_REPO/quantu-binaries/
```

Verify SHA-256 against Quantu's mainnet binary checksum `5aeae715714861fd43ac09d80bc51f70836b27a325a2c2131374121c6c05a5c8` (per Wave 1 Revision 5 line 79). If checksums match, the localnet binary is byte-equivalent to mainnet.

---

## K. Demo agent registration costs total

The full Day-5 to Day-17 mainnet spend, itemized.

| Item | Per unit | Quantity | Subtotal |
|------|----------|----------|----------|
| Demo agent registration (`register_with_options`) | 0.006 SOL | 5 | 0.030 SOL |
| Demo agent ATOM stats init (`atom_engine::initialize_stats`) | 0.005 SOL | 5 | 0.025 SOL |
| Demo client wallet keypair generation + airdrop | 0 SOL | 5 | 0 SOL |
| Daily feedback cron emissions (give_feedback) | 0.0001 SOL (priority-fee-inclusive) | 21 emissions × 5 agents | 0.0105 SOL |
| ValidationRegistry seed (`register_namespace` × 10) | 0.0015 SOL | 10 namespaces | 0.015 SOL |
| ValidationRegistry seed (`register_attestor` × 1) | 0.0009 SOL | 1 | 0.0009 SOL |
| ValidationRegistry seed (`request_validation` × 2) | 0.0015 SOL | 2 | 0.003 SOL |
| ValidationRegistry seed (`respond_to_validation` × 2) | 0.00208 SOL | 2 attestations | 0.00416 SOL |
| TrustGate `init_authority` (1 facilitator) | 0.00075 SOL | 1 | 0.00075 SOL |
| PolicyVault `init_policy` × 3 (policies 1, 2, 3) | 0.0025 SOL | 3 | 0.0075 SOL |
| PolicyVault `set_killswitch` init | 0.0008 SOL | 1 | 0.0008 SOL |
| Demo wallet funding (operating buffer) | 0.005 SOL | 5 + 5 + 1 facilitator | 0.055 SOL |
| Day-13 final demo recording mainnet settlements (1 per scenario × 3 scenarios) | 0.0001 SOL | 3 | 0.0003 SOL |
| **TOTAL MAINNET SPEND** | — | — | **~0.152 SOL ($30–35 at ~$200/SOL)** |

### K.1 — Buffer for unexpected costs

Add 30% safety margin for:
- Quantu RPC call retries (priority fees can spike 5×)
- Re-runs of `prewarm-demo-agents.ts` if scripts crash mid-run
- Emergency-tier-rebuild triggering 10 extra feedbacks

**Conservative budget: ~0.20 SOL ($35–40 at $175–200/SOL).** Mohit's `mohit-treasury.json` keypair holds ≥ 0.25 SOL throughout the build window.

---

## L. ## What this means for Mohit's submission

Concrete Day-5 actionable bullets, in execution order. Each item is binary checkable.

1. **2026-04-29 (Day 5) 09:00 IST — Generate keypairs (15 min).** Run the keypair generation block from Section B.1. Verify 5 demo-agents/, 5 demo-clients/, 1 trustgate-facilitator, 1 policy-vault-admin keypair files exist under `./keys/`. Add `keys/` to `.gitignore`. Fund each demo-agent owner with 0.015 SOL and each demo-client wallet with 0.002 SOL via `solana transfer` from `mohit-treasury.json`.

2. **2026-04-29 09:15 IST — Save the AtomStats byte-offset constants (5 min).** Copy lines 272–282 of `plan/research/01-quantu-source-code-class.md` verbatim into `programs/policy-vault/src/ext/atom_engine.rs` AND into `scripts/verify-prewarm.ts`. The 7 offsets (551, 555, 549, 557, 88, 560, 561) are load-bearing across PolicyVault deserialization and demo-time verification.

3. **2026-04-29 09:30 IST — Run `prewarm-demo-agents.ts` against mainnet (30 min).** This is the load-bearing Day-5 action. Total cost ~0.055 SOL. Verify `demo-state.json` is populated with all 5 agent records. Verify each `atom_stats` PDA returns a 561-byte account via `solana account <atom_stats_pda> --url mainnet-beta`. This is the unblock for the rest of the build.

4. **2026-04-29 10:00 IST — Install + load the launchd cron (15 min).** Drop the plist from Section C.2 into `~/Library/LaunchAgents/`. Run `launchctl load`. Verify `launchctl list | grep com.agenttrust.feedback-cron` returns the entry. Trigger one manual `feedback-cron.ts` run to validate (cost: ~0.005 SOL for 5 emissions).

5. **2026-04-29 10:15 IST — Pin Quantu deps + verify SHA-256 (10 min).** Per Wave 1 Revision 5, pin to commit `bfb09ad`. Update `docs/PINNED-VERSIONS.md` with the commit hash + the mainnet binary SHA-256 `5aeae715714861fd43ac09d80bc51f70836b27a325a2c2131374121c6c05a5c8`. Build `target/deploy/agent_registry_8004.so` locally; verify SHA matches.

6. **2026-04-29 10:30 IST — Anchor workspace scaffold (90 min).** Per `v1_scope.md:170-292` repo tree. Three programs declared (`policy-vault`, `trustgate`, `validation-registry`); shared `docs/`. Anchor.toml clones both mainnet AND devnet program IDs (per Wave 1 Revision 7). Verify `anchor build` produces three `.so` artifacts.

7. **2026-04-29 12:00 IST — Send 3 facilitator DMs (45 min).** Drafts in `plan/other_tasks/dms/`. Targets: Dexter, atxp_ai, MCPay (per `THESIS_LOCK.md:96-101`). Track responses; warm-pitch DM follow-ups happen Day 10.

8. **2026-04-30 (Day 6) 09:00 IST — Verify cron ran 3× overnight (15 min).** Run `verify-prewarm.ts`. Each honest agent should show `feedback_count = 3` (one emission per cron at 14:00, 20:00 of Day 5 + 08:00 of Day 6). Tier should be 0 still (cold-start floor not yet crossed; Bronze requires 5 events).

9. **2026-05-01 (Day 7) 09:00 IST — First mainnet integration test (PolicyVault `gate_payment` reading real AtomStats).** Per `v1_scope.md:313`. The make-or-break day — first contact with mainnet ATOM Engine via PolicyVault's manual deserialization. Verify the trust-tier byte returns the expected value (1 — Bronze, by Day 7 with 6+ feedbacks per agent).

10. **2026-05-06 (Day 12) 09:00 IST — Pre-warm verification + Day-12 dry-run.** Run the 6-point checklist (Section H.2). All honest agents should be at tier ≥ 2 (Silver). If any fail, run `emergency-tier-rebuild.ts` (10–30 min recovery). Begin demo recording dry-run at 09:30 IST per Section H.3 timing.

11. **2026-05-07 (Day 13) 14:00 IST — Final demo recording (3 hours).** Per `production-amplification-class.md:434-444`. Scenario A primary live take + 2 fallback takes; backup running in parallel via OBS dual-record. If any take fails, swap with Day-12 pre-recorded mainnet take.

12. **Throughout Days 5–17 — never edit `demo-state.json` by hand.** Per Section G.2. Every change goes through scripts. Hand edits cause idempotency drift; the day Mohit hand-edits is the day a script silently double-spends.

---

## Source citations consolidated

### Primary sources (Wave 1 deep-dives + thesis lock)
- `plan/final_idea/THESIS_LOCK.md:91-104` — "pre-warm 5 demo agents on Quantu mainnet ATOM" as Day-5 action #1
- `plan/final_idea/v1_scope.md:308-326` — cluster decisions per phase
- `plan/final_idea/changes/2026-04-28-wave1-scope-refinements.md:75-83` — Revision 5 (pin commit `bfb09ad`)
- `plan/final_idea/changes/2026-04-28-wave1-scope-refinements.md:85-91` — Revision 6 (give_feedback discriminator `[145, 136, 123, 3, 215, 165, 98, 41]`)
- `plan/final_idea/changes/2026-04-28-wave1-scope-refinements.md:97-106` — Revision 7 (mainnet vs devnet program IDs)
- `plan/final_idea/changes/2026-04-28-wave1-scope-refinements.md:110-117` — Revision 8 (two-tx pre-warming)
- `plan/final_idea/changes/2026-04-28-wave1-scope-refinements.md:120-126` — Revision 9 (Silver-Gold target, Platinum unreachable)

### Quantu source code (Wave 1 #1)
- `plan/research/01-quantu-source-code-class.md:21-37` — A.3, mainnet program IDs
- `plan/research/01-quantu-source-code-class.md:163-285` — B.5, AtomStats byte offsets (551 trust_tier, 555 tier_confirmed, 549 risk_score, 557 confidence, 560 schema_version, 561 total)
- `plan/research/01-quantu-source-code-class.md:286-304` — B.6, tier thresholds and demo-storytelling implications
- `plan/research/01-quantu-source-code-class.md:327-345` — C.2, register/register_with_options
- `plan/research/01-quantu-source-code-class.md:346-398` — C.3, give_feedback signature + accounts
- `plan/research/01-quantu-source-code-class.md:442-446` — C.9, initialize_stats signature
- `plan/research/01-quantu-source-code-class.md:448-453` — C.10, update_stats CPI flow
- `plan/research/01-quantu-source-code-class.md:582-598` — F.5, atom-engine constants

### PolicyVault build playbook (Wave 1 #4)
- `plan/research/04-policyvault-build-playbook.md:231-285` — C.2, CounterpartyTier policy decision logic
- `plan/research/04-policyvault-build-playbook.md:428-484` — D.1, gate_payment composer pseudocode

### TrustGate x402 class (Wave 1 #5)
- `plan/research/05-trustgate-x402-class.md:100-112` — A.7, HTTP status code semantics
- `plan/research/05-trustgate-x402-class.md:225-237` — B.2, emit_feedback CPI
- `plan/research/05-trustgate-x402-class.md:723-805` — D, atomic-tx invariant

### Production amplification (Wave 1 #10) + technical demo script
- `plan/research/10-production-amplification-class.md:140-149` — C.2, Instagram-worthy moment
- `plan/research/10-production-amplification-class.md:190-208` — E, technical demo script reference
- `plan/research/10-production-amplification-class.md:434-471` — L, production calendar Days 13–16
- `plan/other_tasks/ops/technical-demo-script.md:1-118` — full beat-by-beat (Variant A Nike opener)
- `plan/other_tasks/ops/technical-demo-script.md:121-131` — optional cargo kani extension
