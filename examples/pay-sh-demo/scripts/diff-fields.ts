import { Connection, PublicKey } from "@solana/web3.js";

const DEV = "https://api.devnet.solana.com";
const MAIN = "https://api.mainnet-beta.solana.com";

// Devnet stuck
const OURS = "DcqfJGjKfub8PvKKmQxVz6FTe1QBhbvZzksmhPmhKu2u";
// Mainnet top 3 busiest
const THEIRS = [
  "4WoczuQn2sBXvQdj1gtK7Y1h5JkFdfkW1N8RWjHRYJDL", // fb=78
  "Gto8RnnYTkKZ2H6na1tmyCEBpSAPSdLDxuX6EDot6j6Y", // fb=24
  "2mHsTbfu2G6x3NtdijZtagC5B7iBNoVMAT44ncwUy7R2", // fb=12
];

function decode(d: Buffer, label: string) {
  return {
    label,
    len: d.length,
    discriminator: d.subarray(0, 8).toString("hex"),
    // hash material
    b8_15_root: d.subarray(8, 16).toString("hex"),
    b16_23: d.subarray(16, 24).toString("hex"),
    b24_31: d.subarray(24, 32).toString("hex"),
    b32_39: d.subarray(32, 40).toString("hex"),
    b40_71_client_root: d.subarray(40, 72).toString("hex"),
    created_at: d.readBigUInt64LE(72).toString(),
    updated_at: d.readBigUInt64LE(80).toString(),
    age_slots: (d.readBigUInt64LE(80) - d.readBigUInt64LE(72)).toString(),
    feedback_count: d.readBigUInt64LE(88).toString(),
    pos_sum: d.readUInt16LE(96),
    neg_sum: d.readUInt16LE(98),
    b100_101: d.readUInt16LE(100),
    b102_103: d.readUInt16LE(102),
    score_a_u16: d.readUInt16LE(104),
    score_b_u16: d.readUInt16LE(106),
    score_c_u16: d.readUInt16LE(108),
    score_d_u16: d.readUInt16LE(110),
    recent4: d.subarray(112, 116).toString("hex"),
    hll_nonzero_count: (() => {
      let c = 0;
      for (let i = 116; i < 244; i++) if (d[i] !== 0) c++;
      return c;
    })(),
    b244_247: d.subarray(244, 248).toString("hex"),
    client_hash_last: d.subarray(248, 256).toString("hex"),
    latest_slot: d.readBigUInt64LE(256).toString(),
    hll_changed_at: d.readBigUInt64LE(264).toString(),
    b272_439_nonzero: (() => {
      let c = 0;
      for (let i = 272; i < 440; i++) if (d[i] !== 0) c++;
      return c;
    })(),
    b440_447: d.subarray(440, 448).toString("hex"),
    b448_455_epoch: d.subarray(448, 456).toString("hex"),
    b456_463_tier_cand: d.subarray(456, 464).toString("hex"),
    b464_535_event_window: d.subarray(464, 536).toString("hex"),
    b536_543: d.subarray(536, 544).toString("hex"),
    b544_546: d.subarray(544, 547).toString("hex"),
    quality_b547_u16: d.readUInt16LE(547),
    risk_b549: d[549],
    b550: d[550],
    tier_imm_b551: d[551],
    b552: d[552],
    b553: d[553],
    b554: d[554],
    tier_conf_b555: d[555],
    b556: d[556],
    confidence_b557_u16: d.readUInt16LE(557),
    b559: d[559],
    schema_b560: d[560],
  };
}

async function main() {
  const cd = new Connection(DEV, "confirmed");
  const cm = new Connection(MAIN, "confirmed");
  const ours = await cd.getAccountInfo(new PublicKey(OURS), "confirmed");
  const decodes: any[] = [];
  decodes.push(decode(ours!.data, "OURS_DEVNET"));
  for (const t of THEIRS) {
    const inf = await cm.getAccountInfo(new PublicKey(t), "confirmed");
    if (inf) decodes.push(decode(inf.data, `MAIN_${t.slice(0, 8)}`));
  }

  // Side-by-side table per field
  const fields = Object.keys(decodes[0]).filter((k) => k !== "label");
  console.log("field | " + decodes.map((d) => d.label).join(" | "));
  console.log("----- | " + decodes.map(() => "---").join(" | "));
  for (const f of fields) {
    console.log(`${f} | ${decodes.map((d) => String((d as any)[f])).join(" | ")}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
