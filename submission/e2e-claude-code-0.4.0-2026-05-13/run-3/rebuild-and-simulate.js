// Rebuild the exact register_agent_via_cpi tx the MCP would send, simulate via raw RPC
// with sigVerify:false, capture the full untruncated logs to error-full-logs.txt.
const fs = require("fs");
const bs58 = require("bs58");
const { Connection, Keypair, Transaction, ComputeBudgetProgram, PublicKey } = require("@solana/web3.js");
const path = require("path");

const PKG = "/Users/mohit/.npm/_npx/141d9fb91f36d472/node_modules/@agenttrust-sdk/trustgate";
const chain = require(path.join(PKG, "dist/chain.js"));
const types = require(path.join(PKG, "dist/types.js"));
const quantu = require(path.join(PKG, "dist/quantu.js"));
const registerAgent = require(path.join(PKG, "dist/register-agent.js"));
const anchor = require("/Users/mohit/.npm/_npx/141d9fb91f36d472/node_modules/@coral-xyz/anchor");
const Wallet = anchor.Wallet;

(async () => {
  const KEYPAIR_B58 = fs.readFileSync("test-wallet.b58", "utf8").trim();
  const secret = bs58.default ? bs58.default.decode(KEYPAIR_B58) : bs58.decode(KEYPAIR_B58);
  const kp = Keypair.fromSecretKey(Uint8Array.from(secret));
  const conn = new Connection("https://api.devnet.solana.com", "confirmed");
  const provider = new anchor.AnchorProvider(conn, new Wallet(kp), { commitment: "confirmed" });

  const programs = types.DEFAULT_DEVNET_PROGRAM_IDS;
  const quantuPrograms = quantu.DEFAULT_DEVNET_QUANTU_IDS;
  const baseCollection = new PublicKey("6CTyGPcn8dMwKEqgtvx2XCpkGUd7uqCVK6937RSM5bhA");

  const trustgateIdl = require("/Users/mohit/.npm/_npx/141d9fb91f36d472/node_modules/@agenttrust-sdk/mcp/dist/idl/trustgate.json");
  const ix = await registerAgent.buildRegisterAgentViaCpiIx({
    provider,
    trustgateId: programs.trustGate || programs.trustgate,
    quantuPrograms,
    baseCollection,
    payer: kp.publicKey,
    asset: kp.publicKey,
    metadataUri: "https://agenttrust.tech/metadata/test.json",
    idl: trustgateIdl,
  });

  console.log("=== built ix ===");
  console.log("programId:", ix.programId.toBase58());
  console.log("keys count:", ix.keys.length);
  for (let i = 0; i < ix.keys.length; i++) {
    const k = ix.keys[i];
    console.log(`  [${i}] ${k.pubkey.toBase58()} writable=${k.isWritable} signer=${k.isSigner}`);
  }

  const tx = new Transaction();
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }));
  tx.add(ix);
  const { blockhash } = await conn.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = kp.publicKey;

  // Need both payer + asset signatures since asset == payer here.
  tx.partialSign(kp);

  const rawB64 = tx.serialize({ requireAllSignatures: false }).toString("base64");
  console.log("\n=== raw tx b64 len:", rawB64.length, "===");

  const sim = await conn.simulateTransaction(tx, [kp], false);
  console.log("\n=== simulateTransaction result ===");
  console.log(JSON.stringify(sim.value, null, 2));
  fs.writeFileSync("error-full-logs.txt", JSON.stringify(sim.value, null, 2));
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
