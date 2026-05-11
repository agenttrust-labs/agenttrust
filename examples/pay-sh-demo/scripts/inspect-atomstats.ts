import { Connection, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

const c = new Connection(process.env.RPC_URL ?? "https://api.devnet.solana.com", "confirmed");
const state = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, "..", "devnet-counterparties.json"), "utf-8",
));

async function main() {
  for (const cp of state.counterparties) {
    const pk = new PublicKey(cp.atomStats);
    const info = await c.getAccountInfo(pk);
    if (!info) { console.log(`#${cp.id} not found`); continue; }
    const d = info.data;
    console.log(`\n--- #${cp.id} ${cp.label}  (${d.length} bytes)  ${cp.atomStats} ---`);
    console.log(`disc:    ${Buffer.from(d.subarray(0,8)).toString('hex')}`);
    for (let off = 8; off < d.length; off += 8) {
      const slice = Buffer.from(d.subarray(off, Math.min(off+8, d.length)));
      if (!Array.from(slice).every((b: any) => b === 0)) {
        console.log(`  +${off.toString().padStart(4)}: ${slice.toString('hex').padEnd(16)}  [${Array.from(slice).join(',')}]`);
      }
    }
  }
}
main().catch(e => { console.error(e); process.exit(1); });
