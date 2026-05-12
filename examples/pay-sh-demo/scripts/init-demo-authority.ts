/**
 * One-shot: initialize PolicyVault PolicyAuthority for the demo agent.
 *
 * Run once before recording the demo:
 *   pnpm exec ts-node examples/pay-sh-demo/scripts/init-demo-authority.ts
 *
 * Idempotent — checks if PDA exists before submitting.
 */
import { AnchorProvider, Program, Wallet, type Idl } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const POLICY_VAULT_ID = new PublicKey("8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR");
const AGENT_ASSET     = new PublicKey("5n3PqYDYGJcPEjTbhASmMU915k8pqaffYwgRwu2Uf7ms");
const RPC_URL         = process.env.RPC_URL ?? "https://api.devnet.solana.com";
const KEYPAIR_PATH    = process.env.KEYPAIR ?? path.join(os.homedir(), ".config/solana/id.json");

function loadKeypair(p: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf-8"))));
}

function deriveAuthorityPda(agent: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("policy_authority"), agent.toBuffer()],
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
  const me     = wallet.publicKey;

  console.log(`[init-auth] operator: ${me.toBase58()}`);
  console.log(`[init-auth] agent:    ${AGENT_ASSET.toBase58()}`);

  const [authPda]    = deriveAuthorityPda(AGENT_ASSET);
  const [killPda]    = deriveKillSwitchPda(AGENT_ASSET);
  console.log(`[init-auth] PolicyAuthority PDA: ${authPda.toBase58()}`);
  console.log(`[init-auth] KillSwitchState PDA: ${killPda.toBase58()}`);

  const provider = new AnchorProvider(conn, wallet, { commitment: "confirmed" });
  const idlPath  = path.resolve(__dirname, "..", "..", "..", "target", "idl", "policy_vault.json");
  const idl: Idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const program  = new Program(idl, provider);

  const existingAuth = await conn.getAccountInfo(authPda);
  if (!existingAuth) {
    const sig = await program.methods
      .initAuthority(AGENT_ASSET, [me], 1)
      .accountsStrict({
        payer:          me,
        policyAuthority: authPda,
        systemProgram:   SystemProgram.programId,
      })
      .rpc({ commitment: "confirmed" });
    console.log(`[init-auth] ✓ PolicyAuthority initialized · tx: ${sig}`);
  } else {
    console.log(`[init-auth] PolicyAuthority already exists — skipping.`);
  }

  const existingKill = await conn.getAccountInfo(killPda);
  if (!existingKill) {
    const sig = await program.methods
      .initKillswitch(AGENT_ASSET)
      .accountsStrict({
        payer:           me,
        killSwitchState: killPda,
        systemProgram:   SystemProgram.programId,
      })
      .rpc({ commitment: "confirmed" });
    console.log(`[init-auth] ✓ KillSwitchState initialized · tx: ${sig}`);
  } else {
    console.log(`[init-auth] KillSwitchState already exists — skipping.`);
  }

  console.log(`[init-auth] done.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
