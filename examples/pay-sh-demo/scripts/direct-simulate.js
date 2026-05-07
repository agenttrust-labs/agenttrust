const fs = require("fs");
const { AnchorProvider, BN, Program, Wallet } = require("@coral-xyz/anchor");
const { Connection, Keypair, PublicKey, SystemProgram } = require("@solana/web3.js");

const REPO = "/Users/mohit/superdev/frontier_solana_hackathon";
const idl = JSON.parse(fs.readFileSync(`${REPO}/target/idl/policy_vault.json`, "utf8"));
const secret = JSON.parse(fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`, "utf8"));
const payer = Keypair.fromSecretKey(Uint8Array.from(secret));
const programId = new PublicKey("8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR");
const conn = new Connection("https://api.devnet.solana.com", "confirmed");
const provider = new AnchorProvider(conn, new Wallet(payer), { commitment: "confirmed" });
const program = new Program(idl, provider);

const TIER3 = new PublicKey("5PfaofvEUf3adtJwMho7zzbfvgxwxbvp2V5moqhtLK8y");
const USDC = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

const POLICY_PREFIX = Buffer.from("policy");
const VELOCITY_PREFIX = Buffer.from("velocity");
const KILLSWITCH_PREFIX = Buffer.from("killswitch");
const SCOPE_PER_AGENT = Buffer.from([2]);
const idLE = (id) => { const b = Buffer.alloc(4); b.writeUInt32LE(id, 0); return b; };
const polPda = PublicKey.findProgramAddressSync([POLICY_PREFIX, TIER3.toBuffer(), idLE(1)], programId)[0];
const velPda = PublicKey.findProgramAddressSync([VELOCITY_PREFIX, TIER3.toBuffer(), idLE(1)], programId)[0];
const ksPda = PublicKey.findProgramAddressSync([KILLSWITCH_PREFIX, SCOPE_PER_AGENT, TIER3.toBuffer()], programId)[0];

console.log("policyAccount:", polPda.toBase58());
console.log("velocityLedger:", velPda.toBase58());
console.log("killSwitchState:", ksPda.toBase58());

(async () => {
  try {
    const result = await program.methods
      .gatePayment(TIER3, TIER3, new BN(1000), USDC, 1)
      .accounts({
        caller: payer.publicKey,
        policyAccount: polPda,
        velocityLedger: velPda,
        killSwitchState: ksPda,
        payerAtomStats: null,
        payeeAtomStats: null,
        validationAttestation: null,
      })
      .simulate();
    console.log("Simulation succeeded!");
    console.log("Logs:", result.raw?.slice(0, 5));
    console.log("Return:", result.events);
  } catch (e) {
    console.log("FAIL:", e.message);
    if (e.simulationResponse?.logs) console.log("LOGS:", e.simulationResponse.logs.slice(0, 10));
  }
})();
