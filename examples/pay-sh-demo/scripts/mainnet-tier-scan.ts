/**
 * Mainnet AtomStats tier-0 scan.
 *
 * Scans every account owned by Quantu's atom-engine on Solana mainnet, counts
 * how many AtomStats (561-byte) accounts have `tier_immediate` (byte 551) > 0,
 * and persists the result to `docs/proofs/mainnet-quantu-tier0-scan.json` so
 * the demo's "all Quantu users on mainnet are at tier zero" claim is backed by
 * a committed artifact.
 */
import { Connection, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

const ATOM_ENGINE_MAINNET = new PublicKey("AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb");
const RPC_URL = process.env.MAINNET_RPC ?? "https://api.mainnet-beta.solana.com";
const OUT_PATH = path.resolve(__dirname, "..", "..", "..", "docs", "proofs", "mainnet-quantu-tier0-scan.json");

async function main() {
  const c = new Connection(RPC_URL, "confirmed");

  console.log(`[scan] RPC: ${RPC_URL}`);
  console.log(`[scan] program: ${ATOM_ENGINE_MAINNET.toBase58()}`);
  console.log(`[scan] fetching all program accounts (561-byte filter)…`);

  const accounts = await c.getProgramAccounts(ATOM_ENGINE_MAINNET, {
    commitment: "confirmed",
    filters: [{ dataSize: 561 }],
  });

  console.log(`[scan] found ${accounts.length} AtomStats accounts`);

  let tierZero = 0;
  let tierNonZero = 0;
  const nonZeroExamples: Array<{ pubkey: string; tier_immediate: number; tier_confirmed: number; feedback_count: number; quality_score: number }> = [];
  const sample: Array<{ pubkey: string; tier_immediate: number; tier_confirmed: number; feedback_count: number; quality_score: number }> = [];

  for (const { pubkey, account } of accounts) {
    const d = account.data;
    if (d.length < 561) continue;
    const tier_immediate = d[551];
    const tier_confirmed = d[555];
    const feedback_count = Number(d.readBigUInt64LE(88));
    const quality_score = d.readUInt16LE(547);
    const row = {
      pubkey: pubkey.toBase58(),
      tier_immediate,
      tier_confirmed,
      feedback_count,
      quality_score,
    };
    if (tier_immediate > 0) {
      tierNonZero++;
      nonZeroExamples.push(row);
    } else {
      tierZero++;
    }
    if (sample.length < 10) sample.push(row);
  }

  const summary = {
    captured_at: new Date().toISOString(),
    rpc_url: RPC_URL,
    program_id: ATOM_ENGINE_MAINNET.toBase58(),
    total_atomstats_accounts: accounts.length,
    tier_immediate_zero_count: tierZero,
    tier_immediate_nonzero_count: tierNonZero,
    nonzero_examples: nonZeroExamples,
    sample_first_10: sample,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(summary, null, 2) + "\n", "utf-8");
  console.log(`\n[scan] total:               ${accounts.length}`);
  console.log(`[scan] tier_immediate = 0:    ${tierZero}`);
  console.log(`[scan] tier_immediate > 0:    ${tierNonZero}`);
  if (tierNonZero > 0) {
    console.log(`[scan] non-zero examples:`);
    for (const e of nonZeroExamples) console.log(`         ${e.pubkey} tier=${e.tier_immediate} (confirmed=${e.tier_confirmed})`);
  }
  console.log(`\n[scan] persisted → ${OUT_PATH}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
