import { Connection, PublicKey } from "@solana/web3.js";

const ATOM_ENGINE = new PublicKey("AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb");
const URL = "https://api.mainnet-beta.solana.com";

async function main() {
  const c = new Connection(URL, "confirmed");
  const all: any = await c.getProgramAccounts(ATOM_ENGINE, {
    commitment: "confirmed",
    encoding: "base64",
    filters: [{ dataSize: 151 }],
  } as any);
  for (const row of all) {
    const d: Buffer = row.account.data;
    console.log(`--- ${row.pubkey.toBase58()}  (${d.length} bytes) ---`);
    console.log(`disc: ${d.subarray(0, 8).toString("hex")}`);
    for (let off = 0; off < d.length; off += 8) {
      const s = d.subarray(off, Math.min(off + 8, d.length));
      console.log(`  +${off.toString().padStart(3)}: ${s.toString("hex").padEnd(16)}  [${Array.from(s).join(",")}]`);
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
