// Check on-chain presence for the 5 expected PDAs after the failed run.
const path = require("path");
const ROOT = "/Users/mohit/.npm/_npx/f108becd1ea1eabf/node_modules";
const { Connection, PublicKey } = require(path.join(ROOT, "@solana/web3.js"));
const fs = require("fs");

const wallet = new PublicKey("GCoJB3pVSeSwrky3FkHQcXxEj61XyeBWxpFWYtXTFp5o");
const trustgateProgram = new PublicKey("HF8zHfoyA7b5mhLViopTnRMprc6ZT5KActHTdkFrih2N");
const policyVaultProgram = new PublicKey("HF8zHfoyA7b5mhLViopTnRMprc6ZT5KActHTdkFrih2N"); // policy vault lives in trustgate program
const agentRegistry = new PublicKey("8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C");

function pda(seeds, programId) {
  return PublicKey.findProgramAddressSync(seeds, programId)[0];
}

(async () => {
  const conn = new Connection("https://api.devnet.solana.com", "confirmed");

  const trustgateAuthority = pda([Buffer.from("trustgate_authority")], trustgateProgram);
  const policyAuthority = pda([Buffer.from("policy_authority"), wallet.toBuffer()], policyVaultProgram);
  const agentAccount = pda([Buffer.from("agent"), wallet.toBuffer()], agentRegistry);
  const atomStats = pda([Buffer.from("atom_stats"), wallet.toBuffer()], agentRegistry);
  const policyAccount = pda([Buffer.from("policy"), wallet.toBuffer(), Buffer.from([1, 0, 0, 0, 0, 0, 0, 0])], policyVaultProgram);

  const list = [
    { name: "trustgate_authority", pda: trustgateAuthority },
    { name: "policy_authority", pda: policyAuthority },
    { name: "agent_account", pda: agentAccount },
    { name: "atom_stats", pda: atomStats },
    { name: "policy_account[1]", pda: policyAccount },
  ];

  const results = {};
  for (const r of list) {
    const info = await conn.getAccountInfo(r.pda, "confirmed");
    results[r.name] = {
      pda: r.pda.toBase58(),
      exists: !!info,
      owner: info ? info.owner.toBase58() : null,
      lamports: info ? info.lamports : null,
      dataLen: info ? info.data.length : null,
    };
    console.log(`${r.name}: ${r.pda.toBase58()} exists=${!!info}` + (info ? ` owner=${info.owner.toBase58()} lamports=${info.lamports}` : ""));
  }
  fs.writeFileSync("pdas.json", JSON.stringify(results, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
