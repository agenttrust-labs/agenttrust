import { Connection, PublicKey } from "@solana/web3.js";

const DEV = "https://api.devnet.solana.com";
const TARGET = "DcqfJGjKfub8PvKKmQxVz6FTe1QBhbvZzksmhPmhKu2u";

async function main() {
  const c = new Connection(DEV, "confirmed");
  const inf = await c.getAccountInfo(new PublicKey(TARGET), "confirmed");
  if (!inf) { console.error("not found"); process.exit(1); }
  const d = inf.data;
  console.log(`Owner: ${inf.owner.toBase58()}`);
  console.log(`Length: ${d.length}`);
  console.log(`disc:    ${d.subarray(0, 8).toString("hex")}`);
  for (let off = 8; off < d.length; off += 8) {
    const slice = d.subarray(off, Math.min(off + 8, d.length));
    if (!Array.from(slice).every((b: any) => b === 0)) {
      console.log(`  +${off.toString().padStart(4)}: ${slice.toString("hex").padEnd(16)}  [${Array.from(slice).join(",")}]`);
    }
  }
  console.log(`\n--- key fields ---`);
  console.log(`created_at (b72,u64LE): ${d.readBigUInt64LE(72)}`);
  console.log(`updated_at (b80,u64LE): ${d.readBigUInt64LE(80)}`);
  console.log(`feedback_count (b88,u64LE): ${d.readBigUInt64LE(88)}`);
  console.log(`pos_sum (b96,u16LE): ${d.readUInt16LE(96)}, neg_sum (b98,u16LE): ${d.readUInt16LE(98)}`);
  console.log(`b104-111 scores: ${d.subarray(104, 112).toString("hex")}`);
  console.log(`b112-115 recent4: ${d.subarray(112, 116).toString("hex")}`);
  console.log(`b440-447: ${d.subarray(440, 448).toString("hex")}`);
  console.log(`b448-455: ${d.subarray(448, 456).toString("hex")}`);
  console.log(`b456-463: ${d.subarray(456, 464).toString("hex")}`);
  console.log(`b540-546: ${d.subarray(540, 547).toString("hex")}`);
  console.log(`b547-548 quality_score (u16LE): ${d.readUInt16LE(547)}`);
  console.log(`b549 risk: ${d[549]}, b550: ${d[550]}, b551 tier_imm: ${d[551]}`);
  console.log(`b552-554: ${d.subarray(552, 555).toString("hex")}, b555 tier_conf: ${d[555]}`);
  console.log(`b556: ${d[556]}, b557-558 confidence (u16LE): ${d.readUInt16LE(557)}`);
  console.log(`b559: ${d[559]}, b560 schema: ${d[560]}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
