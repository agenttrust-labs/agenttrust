import { Connection, PublicKey } from "@solana/web3.js";
import * as fs from "fs";

const ATOM_ENGINE = new PublicKey("AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb");
const URL = process.env.MAINNET_RPC ?? "https://api.mainnet-beta.solana.com";

async function main() {
  const c = new Connection(URL, "confirmed");

  // 1) Full size distribution across all accounts owned by atom-engine (no dataSize filter).
  //    Pull only 1 byte to keep response small; we group by dataLength reported by RPC.
  console.error("Pulling ALL accounts owned by atom-engine (dataSlice 0,0 to learn dataLength)...");
  const all: any = await c.getProgramAccounts(ATOM_ENGINE, {
    commitment: "confirmed",
    encoding: "base64",
    dataSlice: { offset: 0, length: 0 },
  } as any);
  console.error(`atom-engine owns ${all.length} accounts total on mainnet`);

  // dataLength sourced from getAccountInfo response is not available with dataSlice 0,0
  // (data buffer is empty but real length is hidden by RPC). Re-query each unique account
  // via getMultipleAccounts WITHOUT dataSlice in batches of 100, just to learn sizes.
  const pubkeys = all.map((r: any) => r.pubkey);
  const sizeBuckets = new Map<number, string[]>();
  const batch = 100;
  for (let i = 0; i < pubkeys.length; i += batch) {
    const slice = pubkeys.slice(i, i + batch);
    const infos = await c.getMultipleAccountsInfo(slice, "confirmed");
    for (let j = 0; j < infos.length; j++) {
      const inf = infos[j];
      if (!inf) continue;
      const len = inf.data.length;
      if (!sizeBuckets.has(len)) sizeBuckets.set(len, []);
      sizeBuckets.get(len)!.push(slice[j].toBase58());
    }
    console.error(`  ${Math.min(i + batch, pubkeys.length)}/${pubkeys.length}`);
  }
  console.log("\n=== Account size distribution (atom-engine, mainnet) ===");
  for (const [len, list] of Array.from(sizeBuckets.entries()).sort((a, b) => a[0] - b[0])) {
    console.log(`  ${len} bytes: ${list.length} accounts`);
  }

  // 2) For 561-byte accounts (AtomStats), fetch the WHOLE thing for each and bucket by tier_immediate (b551),
  //    tier_confirmed (b555), and the other "stuck zero" bytes we care about.
  const atomStats = sizeBuckets.get(561) ?? [];
  console.error(`\nFull-fetching all ${atomStats.length} AtomStats accounts...`);
  const fullRows: Array<{
    pubkey: string;
    tier_imm: number;
    tier_conf: number;
    fb_count: number;
    quality: number;
    risk: number;
    confidence: number;
    schema: number;
    b440_447: string;
    b448_455: string;
    b456_463: string;
    b540_546: string;
    b549: number;
    b550: number;
    b552: number;
    b553: number;
    b554: number;
    b556: number;
    b559: number;
    created_at: bigint;
    updated_at: bigint;
    age_slots: bigint;
    nonzero_after_440: number;
  }> = [];

  for (let i = 0; i < atomStats.length; i += batch) {
    const slice = atomStats.slice(i, i + batch).map((p) => new PublicKey(p));
    const infos = await c.getMultipleAccountsInfo(slice, "confirmed");
    for (let j = 0; j < infos.length; j++) {
      const inf = infos[j];
      if (!inf) continue;
      const d = inf.data;
      if (d.length !== 561) continue;
      const r = {
        pubkey: slice[j].toBase58(),
        tier_imm: d[551],
        tier_conf: d[555],
        fb_count: Number(d.readBigUInt64LE(88)),
        quality: d.readUInt16LE(547),
        risk: d[549],
        confidence: d.readUInt16LE(557),
        schema: d[560],
        b440_447: d.subarray(440, 448).toString("hex"),
        b448_455: d.subarray(448, 456).toString("hex"),
        b456_463: d.subarray(456, 464).toString("hex"),
        b540_546: d.subarray(540, 547).toString("hex"),
        b549: d[549],
        b550: d[550],
        b552: d[552],
        b553: d[553],
        b554: d[554],
        b556: d[556],
        b559: d[559],
        created_at: d.readBigUInt64LE(72),
        updated_at: d.readBigUInt64LE(80),
        age_slots: d.readBigUInt64LE(80) - d.readBigUInt64LE(72),
        nonzero_after_440: 0,
      };
      let nz = 0;
      for (let k = 440; k < 561; k++) if (d[k] !== 0) nz++;
      r.nonzero_after_440 = nz;
      fullRows.push(r);
    }
    console.error(`  full ${Math.min(i + batch, atomStats.length)}/${atomStats.length}`);
  }

  // Sort by feedback_count desc to see the busiest accounts first
  fullRows.sort((a, b) => (b.fb_count - a.fb_count));

  console.log("\n=== Top 20 AtomStats by feedback_count ===");
  console.log("idx | pubkey | fb | quality | risk | conf | tier_imm | tier_conf | age_slots | nz_b440+");
  for (let i = 0; i < Math.min(20, fullRows.length); i++) {
    const r = fullRows[i];
    console.log(
      `${i.toString().padStart(2)} | ${r.pubkey} | ${r.fb_count.toString().padStart(5)} | ${r.quality.toString().padStart(5)} | ${r.risk.toString().padStart(3)} | ${r.confidence.toString().padStart(5)} | ${r.tier_imm} | ${r.tier_conf} | ${r.age_slots.toString().padStart(10)} | ${r.nonzero_after_440}`
    );
  }

  const promoted = fullRows.filter((r) => r.tier_imm > 0 || r.tier_conf > 0);
  console.log(`\n=== Promoted accounts (tier_imm > 0 OR tier_conf > 0): ${promoted.length} ===`);
  for (const r of promoted) {
    console.log(r);
  }

  // Even if no promoted, dump full hex of top-3 busiest 561-byte accounts so we can hand-diff.
  console.log("\n=== Top 3 busiest 561-byte accounts (full hex) ===");
  for (let i = 0; i < Math.min(3, fullRows.length); i++) {
    const inf = await c.getAccountInfo(new PublicKey(fullRows[i].pubkey), "confirmed");
    if (!inf) continue;
    console.log(`\n--- #${i} ${fullRows[i].pubkey}  fb=${fullRows[i].fb_count}  quality=${fullRows[i].quality}  conf=${fullRows[i].confidence} ---`);
    const d = inf.data;
    console.log(`disc:    ${d.subarray(0, 8).toString("hex")}`);
    for (let off = 8; off < d.length; off += 8) {
      const slice = d.subarray(off, Math.min(off + 8, d.length));
      if (!Array.from(slice).every((b: any) => b === 0)) {
        console.log(`  +${off.toString().padStart(4)}: ${slice.toString("hex").padEnd(16)}  [${Array.from(slice).join(",")}]`);
      }
    }
  }

  fs.writeFileSync("/tmp/mainnet-atomstats-summary.json", JSON.stringify(fullRows, null, 2));
  console.error(`\nWrote ${fullRows.length} rows to /tmp/mainnet-atomstats-summary.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
