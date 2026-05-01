/**
 * Solana RPC + Anchor program clients.
 *
 * Loads the IDLs generated under `target/idl/` (one level up from this
 * package) so the server can talk to the deployed PolicyVault and TrustGate
 * programs directly. The `simulateGatePayment` helper wraps the read-only
 * gate_payment simulation used by the `/verify` endpoint.
 */

import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, BN, Program, web3 } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

import { GateDecision } from "./types";
import { denyReasonName } from "./x402";

// ---------------------------------------------------------------------------
// Pinned program IDs (devnet — must match Anchor.toml)
// ---------------------------------------------------------------------------
export const POLICY_VAULT_ID  = new PublicKey("8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR");
export const TRUSTGATE_ID     = new PublicKey("HF8zHfoyA7b5mhLViopTnRMprc6ZT5KActHTdkFrih2N");

// ---------------------------------------------------------------------------
// Provider factory — wraps the RPC + facilitator wallet in a single AnchorProvider
// ---------------------------------------------------------------------------
export interface ChainConfig {
  rpcUrl:             string; // e.g., https://api.devnet.solana.com
  facilitatorKeypair: Keypair;
}

export function makeProvider(cfg: ChainConfig): AnchorProvider {
  const conn = new Connection(cfg.rpcUrl, "confirmed");
  const wallet = new anchor.Wallet(cfg.facilitatorKeypair);
  return new AnchorProvider(conn, wallet, { commitment: "confirmed" });
}

// ---------------------------------------------------------------------------
// PDA derivation helpers — must match the on-chain seed prefixes.
// ---------------------------------------------------------------------------
const POLICY_PREFIX           = Buffer.from("policy");
const VELOCITY_PREFIX         = Buffer.from("velocity");
const KILLSWITCH_PREFIX       = Buffer.from("killswitch");
const SCOPE_PER_AGENT         = Buffer.from([2]);
const FEEDBACK_LOG_PREFIX     = Buffer.from("feedback_log");

function policyIdLeBytes(policyId: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(policyId, 0);
  return buf;
}

export function derivePolicyPda(agent: PublicKey, policyId: number): PublicKey {
  return PublicKey.findProgramAddressSync(
    [POLICY_PREFIX, agent.toBuffer(), policyIdLeBytes(policyId)],
    POLICY_VAULT_ID,
  )[0];
}

export function deriveVelocityPda(agent: PublicKey, policyId: number): PublicKey {
  return PublicKey.findProgramAddressSync(
    [VELOCITY_PREFIX, agent.toBuffer(), policyIdLeBytes(policyId)],
    POLICY_VAULT_ID,
  )[0];
}

export function deriveKillSwitchPda(agent: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [KILLSWITCH_PREFIX, SCOPE_PER_AGENT, agent.toBuffer()],
    POLICY_VAULT_ID,
  )[0];
}

export function deriveFeedbackLogPda(paymentIdHash: Buffer): PublicKey {
  return PublicKey.findProgramAddressSync(
    [FEEDBACK_LOG_PREFIX, paymentIdHash],
    TRUSTGATE_ID,
  )[0];
}

// ---------------------------------------------------------------------------
// Program loaders
// ---------------------------------------------------------------------------
export async function loadPolicyVault(
  provider: AnchorProvider,
): Promise<Program> {
  const idl = await Program.fetchIdl(POLICY_VAULT_ID, provider);
  if (!idl) throw new Error("policy_vault IDL not on-chain — deploy IDL first");
  return new Program(idl, provider);
}

export async function loadTrustGate(provider: AnchorProvider): Promise<Program> {
  const idl = await Program.fetchIdl(TRUSTGATE_ID, provider);
  if (!idl) throw new Error("trustgate IDL not on-chain — deploy IDL first");
  return new Program(idl, provider);
}

// ---------------------------------------------------------------------------
// gate_payment simulation (read-only — for /verify)
// ---------------------------------------------------------------------------

export interface SimulateGatePaymentInput {
  policyVault:      Program;
  caller:           PublicKey;
  payerAgentAsset:  PublicKey;
  payeeAgentAsset:  PublicKey;
  amount:           BN;
  mint:             PublicKey;
  policyId:         number;
}

export async function simulateGatePayment(
  input: SimulateGatePaymentInput,
): Promise<GateDecision> {
  const { policyVault, payerAgentAsset, payeeAgentAsset, amount, mint, policyId, caller } = input;

  const tx = await policyVault.methods
    .gatePayment(payerAgentAsset, payeeAgentAsset, amount, mint, policyId)
    .accounts({
      caller,
      policyAccount:         derivePolicyPda(payerAgentAsset, policyId),
      velocityLedger:        deriveVelocityPda(payerAgentAsset, policyId),
      killSwitchState:       deriveKillSwitchPda(payerAgentAsset),
      payerAtomStats:        null,
      payeeAtomStats:        null,
      validationAttestation: null,
    } as any)
    .transaction();

  const sim = await policyVault.provider.connection.simulateTransaction(tx, [], true);

  if (sim.value.err) {
    throw new Error(`simulation failed: ${JSON.stringify(sim.value.err)}`);
  }

  // Parse return data — Anchor's set_return_data syscall surface.
  const returnData = sim.value.returnData;
  if (!returnData || !returnData.data || !returnData.data[0]) {
    throw new Error("simulation produced no return_data");
  }

  // returnData.data is [base64-encoded-bytes, "base64"]
  const buf = Buffer.from(returnData.data[0], "base64");
  return parseGateDecision(buf);
}

// ---------------------------------------------------------------------------
// GateDecision Borsh parser — mirrors the Rust enum's wire format:
//   variant 0: Allow                     (no payload)
//   variant 1: Deny(DenyReason)          (1 byte: variant index of DenyReason)
//   variant 2: RequireValidation([u8;32])
// ---------------------------------------------------------------------------
function parseGateDecision(buf: Buffer): GateDecision {
  if (buf.length === 0) throw new Error("empty GateDecision return data");
  const variant = buf[0];

  if (variant === 0) {
    return { kind: "Allow" };
  }

  if (variant === 1) {
    if (buf.length < 2) throw new Error("Deny return data too short");
    const denyVariantIdx = buf[1]; // 0..14 (Borsh variant order)
    // DenyReason::code() maps variant index → stable code.
    // Order matches state/decision.rs: KillSwitchEngaged is variant 0 → code 1, etc.
    const reasonCode = denyVariantIdx + 1;
    return {
      kind:       "Deny",
      reasonCode,
      reasonName: denyReasonName(reasonCode),
    };
  }

  if (variant === 2) {
    if (buf.length < 33) throw new Error("RequireValidation return data too short");
    const capabilityHash = Array.from(buf.subarray(1, 33));
    return { kind: "RequireValidation", capabilityHash };
  }

  throw new Error(`unknown GateDecision variant: ${variant}`);
}
