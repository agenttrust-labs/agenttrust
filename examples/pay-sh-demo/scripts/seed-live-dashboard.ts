/**
 * Pre-seed live.agenttrust.tech with real on-chain gate_payment decisions.
 *
 * Use this before recording: simulate-payment (MCP read tool) is read-only
 * and doesn't emit events. Real gate_payment is the on-chain instruction
 * that emits PolicyAllowed / PolicyDenied for the dashboard to render.
 *
 * Runs against the existing devnet policy_id=2 on agent 5n3PqYDY…
 *
 *   pnpm exec ts-node examples/pay-sh-demo/scripts/seed-live-dashboard.ts
 */
import { AnchorProvider, BN, Program, Wallet, type Idl } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const POLICY_VAULT_ID = new PublicKey("8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR");
const AGENT_ASSET     = new PublicKey("5n3PqYDYGJcPEjTbhASmMU915k8pqaffYwgRwu2Uf7ms");
const PAYEE           = new PublicKey("BTcgiDauqVHoGMiXujytE5wycfncDEmNnXJiUZ4s4oWL");
const POLICY_ID       = parseInt(process.env.POLICY_ID ?? "2", 10);
const RPC_URL         = process.env.RPC_URL ?? "https://api.devnet.solana.com";
const KEYPAIR_PATH    = process.env.KEYPAIR ?? path.join(os.homedir(), ".config/solana/id.json");

function loadKeypair(p: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf-8"))));
}

function policyIdLeBytes(id: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(id, 0);
  return buf;
}

function derivePolicyPda(agent: PublicKey, id: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("policy"), agent.toBuffer(), policyIdLeBytes(id)],
    POLICY_VAULT_ID,
  );
}

function deriveVelocityPda(agent: PublicKey, id: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("velocity"), agent.toBuffer(), policyIdLeBytes(id)],
    POLICY_VAULT_ID,
  );
}

function deriveKillSwitchPda(agent: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("killswitch"), Buffer.from([2]), agent.toBuffer()],
    POLICY_VAULT_ID,
  );
}

async function main() {
  const conn   = new Connection(RPC_URL, "confirmed");
  const wallet = new Wallet(loadKeypair(KEYPAIR_PATH));
  const provider = new AnchorProvider(conn, wallet, { commitment: "confirmed" });
  const idlPath = path.resolve(__dirname, "..", "..", "..", "target", "idl", "policy_vault.json");
  const idl: Idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const program = new Program(idl, provider);

  const [policyPda] = derivePolicyPda(AGENT_ASSET, POLICY_ID);
  const [ledgerPda] = deriveVelocityPda(AGENT_ASSET, POLICY_ID);
  const [ksPda]     = deriveKillSwitchPda(AGENT_ASSET);

  console.log(`[seed] policy_id:        ${POLICY_ID}`);
  console.log(`[seed] policy PDA:       ${policyPda.toBase58()}`);
  console.log(`[seed] velocity ledger:  ${ledgerPda.toBase58()}`);
  console.log(`[seed] killswitch PDA:   ${ksPda.toBase58()}`);
  console.log(`[seed] caller:           ${wallet.publicKey.toBase58()}`);
  console.log(`[seed] payee:            ${PAYEE.toBase58()}`);

  // Mix of ALLOW (small amounts) + DENY (big amount over weekly cap).
  // Non-strict gate_payment doesn't revert on DENY — it emits PolicyDenied and returns.
  const calls: Array<{ label: string; amount: number }> = [
    { label: "ALLOW $5K",    amount:           5_000_000_000 },
    { label: "ALLOW $12K",   amount:          12_000_000_000 },
    { label: "ALLOW $250",   amount:             250_000_000 },
    { label: "DENY $1.2M",   amount:       1_200_000_000_000 },
    { label: "ALLOW $4K",    amount:           4_000_000_000 },
  ];

  for (const c of calls) {
    try {
      const sig = await program.methods
        .gatePayment(AGENT_ASSET, PAYEE, new BN(c.amount), PublicKey.default, POLICY_ID)
        .accountsStrict({
          caller:                wallet.publicKey,
          policyAccount:         policyPda,
          velocityLedger:        ledgerPda,
          killSwitchState:       ksPda,
          payerAtomStats:        null as unknown as PublicKey,
          payeeAtomStats:        null as unknown as PublicKey,
          validationAttestation: null as unknown as PublicKey,
        })
        .rpc({ commitment: "confirmed" });
      console.log(`[seed] ${c.label.padEnd(14)} · tx: ${sig.slice(0, 16)}…`);
    } catch (e: any) {
      console.log(`[seed] ${c.label.padEnd(14)} · ✗ ${(e.message ?? String(e)).split("\n")[0]}`);
    }
  }

  console.log(`[seed] done. Check https://live.agenttrust.tech — rows should appear within ~5s.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
