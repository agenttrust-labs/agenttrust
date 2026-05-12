import { Connection, PublicKey } from "@solana/web3.js";

const ATOM_ENGINE = new PublicKey("AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb");

// Try a list of RPC endpoints; first one that works wins.
const RPCS = [
  process.env.MAINNET_RPC,
  "https://api.mainnet-beta.solana.com",
  "https://solana-rpc.publicnode.com",
  "https://solana.drpc.org",
  "https://rpc.ankr.com/solana",
  "https://endpoints.omniatech.io/v1/sol/mainnet/public",
].filter(Boolean) as string[];

async function tryRpc(url: string): Promise<Connection | null> {
  try {
    const c = new Connection(url, { commitment: "confirmed" });
    const slot = await c.getSlot();
    console.error(`[ok] ${url}  slot=${slot}`);
    return c;
  } catch (e: any) {
    console.error(`[fail] ${url}  ${e?.message ?? e}`);
    return null;
  }
}

async function main() {
  let conn: Connection | null = null;
  for (const url of RPCS) {
    conn = await tryRpc(url);
    if (conn) break;
  }
  if (!conn) {
    console.error("ALL RPCS FAILED");
    process.exit(2);
  }

  // Cheap scan: pull just byte 551 (tier_immediate) for every 561-byte account owned by atom-engine.
  console.error("Scanning getProgramAccounts with dataSlice {offset:551,length:1}, dataSize:561 ...");
  const t0 = Date.now();
  let scanRes: any;
  try {
    scanRes = await conn.getProgramAccounts(ATOM_ENGINE, {
      commitment: "confirmed",
      encoding: "base64",
      filters: [{ dataSize: 561 }],
      dataSlice: { offset: 551, length: 1 },
    } as any);
  } catch (e: any) {
    console.error(`gPA failed: ${e?.message ?? e}`);
    // Try without dataSize filter (some RPCs disable filters)
    try {
      console.error("Retry without filters...");
      scanRes = await conn.getProgramAccounts(ATOM_ENGINE, {
        commitment: "confirmed",
        encoding: "base64",
        dataSlice: { offset: 551, length: 1 },
      } as any);
    } catch (e2: any) {
      console.error(`gPA retry failed: ${e2?.message ?? e2}`);
      process.exit(3);
    }
  }
  console.error(`gPA returned ${scanRes.length} accounts in ${Date.now() - t0}ms`);

  // Bucket by tier_immediate byte
  const buckets = new Map<number, string[]>();
  for (const row of scanRes) {
    const data: Buffer = row.account.data as Buffer;
    if (!data || data.length === 0) continue;
    const tier = data[0];
    if (!buckets.has(tier)) buckets.set(tier, []);
    buckets.get(tier)!.push(row.pubkey.toBase58());
  }
  console.log("\n=== tier_immediate distribution (mainnet, atom-engine, 561-byte accounts) ===");
  const sortedKeys = Array.from(buckets.keys()).sort((a, b) => a - b);
  for (const k of sortedKeys) {
    console.log(`  tier=${k}: ${buckets.get(k)!.length} accounts`);
  }

  // Print up to 10 promoted account pubkeys per non-zero tier
  for (const k of sortedKeys) {
    if (k === 0) continue;
    console.log(`\n--- tier=${k} samples ---`);
    for (const pk of buckets.get(k)!.slice(0, 10)) console.log(`  ${pk}`);
  }

  // Save full list of non-zero-tier pubkeys for full-fetch in next step
  const promoted: { pubkey: string; tier: number }[] = [];
  for (const k of sortedKeys) {
    if (k === 0) continue;
    for (const pk of buckets.get(k)!) promoted.push({ pubkey: pk, tier: k });
  }
  require("fs").writeFileSync("/tmp/promoted-atomstats.json", JSON.stringify(promoted, null, 2));
  console.error(`\nWrote ${promoted.length} promoted pubkeys to /tmp/promoted-atomstats.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
