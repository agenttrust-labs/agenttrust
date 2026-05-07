#!/usr/bin/env node
/**
 * One-shot: init PolicyAuthority + KillSwitchState + PolicyAccount + VelocityLedger
 * for the 3 demo counterparty agents on devnet, so MCP `agenttrust_simulate_payment`
 * returns real Allow/Deny decisions instead of `AccountNotFound`.
 *
 * Policy: CounterpartyTier minTier=2 + permissive Spending limits (10 USDC perTx).
 * Idempotent: skips any PDA that already exists.
 */
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

const POLICY_PREFIX = Buffer.from("policy");
const VELOCITY_PREFIX = Buffer.from("velocity");
const POLICY_AUTHORITY_PREFIX = Buffer.from("policy_authority");
const KILLSWITCH_PREFIX = Buffer.from("killswitch");
const SCOPE_PER_AGENT = Buffer.from([2]);

const idLE = (id) => { const b = Buffer.alloc(4); b.writeUInt32LE(id, 0); return b; };
const authPda = (agent) => PublicKey.findProgramAddressSync([POLICY_AUTHORITY_PREFIX, agent.toBuffer()], programId)[0];
const ksPda = (agent) => PublicKey.findProgramAddressSync([KILLSWITCH_PREFIX, SCOPE_PER_AGENT, agent.toBuffer()], programId)[0];
const polPda = (agent, id) => PublicKey.findProgramAddressSync([POLICY_PREFIX, agent.toBuffer(), idLE(id)], programId)[0];
const velPda = (agent, id) => PublicKey.findProgramAddressSync([VELOCITY_PREFIX, agent.toBuffer(), idLE(id)], programId)[0];

const policyArgs = (policyId) => ({
  policyId,
  enabledKindsBitmask: 0x0A, // Spending (0x02) + CounterpartyTier (0x08)
  gateMode: 0,
  scopeKind: 0,
  spending: { perTxMax: new BN(10_000_000), dailyMax: new BN(100_000_000), weeklyMax: new BN(1_000_000_000) },
  velocity: { windowSecs: new BN(3_600), maxInWindow: new BN(1_000_000_000), tier0DecayFactor: new BN(2_500) },
  counterparty: { minTier: 2, maxRiskScore: 255, minConfidence: 0, defaultUnratedTreatment: 1 },
  validation: { requiredCapabilityHash: Array(32).fill(0), acceptedAttestors: [PublicKey.default, PublicKey.default] },
});

const agents = [
  ["tier-3", new PublicKey("5PfaofvEUf3adtJwMho7zzbfvgxwxbvp2V5moqhtLK8y")],
  ["tier-1", new PublicKey("9894Sh7F79yDzTi4Pvfm5Jy5VmLpx2XkyhS14BFwpyrd")],
  ["tier-0", new PublicKey("C9pYqwnCVpwg7MwEbQa4XcmVVYsUcPwqHMYs999KB3dR")],
];

(async () => {
  console.log(`payer: ${payer.publicKey.toBase58()}`);
  console.log(`balance: ${(await conn.getBalance(payer.publicKey)) / 1e9} SOL\n`);

  const out = { capturedAt: new Date().toISOString(), policyId: 1, minTier: 2, agents: [] };

  for (const [label, agent] of agents) {
    console.log(`=== ${label} ${agent.toBase58()} ===`);
    const a = authPda(agent), k = ksPda(agent), p = polPda(agent, 1), v = velPda(agent, 1);
    const r = { label, agent: agent.toBase58(), policyAccount: p.toBase58(), velocityLedger: v.toBase58(), policyAuthority: a.toBase58(), killSwitchState: k.toBase58(), txs: {} };

    if (!(await conn.getAccountInfo(a))) {
      const sig = await program.methods.initAuthority(agent, [payer.publicKey], 1).accountsStrict({
        payer: payer.publicKey, policyAuthority: a, systemProgram: SystemProgram.programId,
      }).rpc();
      console.log(`  initAuthority   : ${sig}`); r.txs.initAuthority = sig;
    } else { console.log(`  initAuthority   : [exists]`); }

    if (!(await conn.getAccountInfo(k))) {
      const sig = await program.methods.initKillswitch(agent).accountsStrict({
        payer: payer.publicKey, killSwitchState: k, systemProgram: SystemProgram.programId,
      }).rpc();
      console.log(`  initKillswitch  : ${sig}`); r.txs.initKillswitch = sig;
    } else { console.log(`  initKillswitch  : [exists]`); }

    if (!(await conn.getAccountInfo(p))) {
      const sig = await program.methods.initPolicy(agent, policyArgs(1)).accountsStrict({
        payer: payer.publicKey, policyAuthority: a, policyAccount: p, velocityLedger: v, systemProgram: SystemProgram.programId,
      }).rpc();
      console.log(`  initPolicy      : ${sig}`); r.txs.initPolicy = sig;
    } else { console.log(`  initPolicy      : [exists]`); }

    out.agents.push(r);
  }

  fs.writeFileSync(`${REPO}/examples/pay-sh-demo/devnet-demo-policies.json`, JSON.stringify(out, null, 2));
  console.log(`\nfinal balance: ${(await conn.getBalance(payer.publicKey)) / 1e9} SOL`);
  console.log(`captured: examples/pay-sh-demo/devnet-demo-policies.json`);
})().catch(e => { console.error("FAIL:", e.message); console.error(e); process.exit(1); });
