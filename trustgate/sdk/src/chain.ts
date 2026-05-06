/**
 * PDA derivation + Anchor program loaders. Mirrors the server's chain.ts
 * but exported as a public SDK surface so consumers can derive their own
 * PDAs without re-implementing the seed conventions.
 */

import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

import { GateDecision, ProgramIds } from "./types";
import { denyReasonName } from "./x402";

// ---------------------------------------------------------------------------
// Seed prefixes (must match the on-chain Rust constants)
// ---------------------------------------------------------------------------
const POLICY_PREFIX        = Buffer.from("policy");
const VELOCITY_PREFIX      = Buffer.from("velocity");
const KILLSWITCH_PREFIX    = Buffer.from("killswitch");
const SCOPE_PER_AGENT      = Buffer.from([2]);
const FEEDBACK_LOG_PREFIX  = Buffer.from("feedback_log");
const TRUSTGATE_AUTH_PREFIX = Buffer.from("trustgate_auth");

function policyIdLeBytes(policyId: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(policyId, 0);
  return buf;
}

export function derivePolicyPda(
  policyVaultId: PublicKey,
  agent:         PublicKey,
  policyId:      number,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [POLICY_PREFIX, agent.toBuffer(), policyIdLeBytes(policyId)],
    policyVaultId,
  )[0];
}

export function deriveVelocityPda(
  policyVaultId: PublicKey,
  agent:         PublicKey,
  policyId:      number,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [VELOCITY_PREFIX, agent.toBuffer(), policyIdLeBytes(policyId)],
    policyVaultId,
  )[0];
}

export function deriveKillSwitchPda(
  policyVaultId: PublicKey,
  agent:         PublicKey,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [KILLSWITCH_PREFIX, SCOPE_PER_AGENT, agent.toBuffer()],
    policyVaultId,
  )[0];
}

export function deriveFeedbackLogPda(
  trustgateId:   PublicKey,
  paymentIdHash: Buffer,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [FEEDBACK_LOG_PREFIX, paymentIdHash],
    trustgateId,
  )[0];
}

export function deriveTrustGateAuthorityPda(
  trustgateId: PublicKey,
  facilitator: PublicKey,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [TRUSTGATE_AUTH_PREFIX, facilitator.toBuffer()],
    trustgateId,
  )[0];
}

// ---------------------------------------------------------------------------
// Provider + program loaders
// ---------------------------------------------------------------------------

export interface ProviderConfig {
  rpcUrl: string;
  wallet: Keypair;
}

export function makeProvider(cfg: ProviderConfig): AnchorProvider {
  const conn   = new Connection(cfg.rpcUrl, "confirmed");
  const wallet = new anchor.Wallet(cfg.wallet);
  return new AnchorProvider(conn, wallet, { commitment: "confirmed" });
}

/**
 * Load the policy_vault Anchor `Program`. By default fetches the IDL from
 * chain (the canonical, single-source-of-truth path). Pass an explicit
 * `idl` to skip the on-chain fetch — useful as a defensive fallback for
 * clients that bundle a known-good IDL snapshot, or to avoid an extra RPC
 * hop in latency-sensitive paths.
 *
 * Re-verify the IDL is on chain with:
 *   anchor idl fetch <programId> --provider.cluster devnet
 */
export async function loadPolicyVault(
  provider:  AnchorProvider,
  programId: PublicKey,
  idl?:      import("@coral-xyz/anchor").Idl,
): Promise<Program> {
  if (idl) return new Program(idl, provider);
  const fetched = await Program.fetchIdl(programId, provider);
  if (!fetched) throw new Error(`policy_vault IDL not on-chain at ${programId.toBase58()}`);
  return new Program(fetched, provider);
}

/** See `loadPolicyVault` for the IDL-fetch / fallback contract. */
export async function loadTrustGate(
  provider:  AnchorProvider,
  programId: PublicKey,
  idl?:      import("@coral-xyz/anchor").Idl,
): Promise<Program> {
  if (idl) return new Program(idl, provider);
  const fetched = await Program.fetchIdl(programId, provider);
  if (!fetched) throw new Error(`trustgate IDL not on-chain at ${programId.toBase58()}`);
  return new Program(fetched, provider);
}

// ---------------------------------------------------------------------------
// gate_payment simulation (read-only, for /verify)
// ---------------------------------------------------------------------------

export interface SimulateGatePaymentInput {
  policyVault:     Program;
  programIds:      ProgramIds;
  caller:          PublicKey;
  payerAgentAsset: PublicKey;
  payeeAgentAsset: PublicKey;
  amount:          BN;
  mint:            PublicKey;
  policyId:        number;
}

export async function simulateGatePayment(
  input: SimulateGatePaymentInput,
): Promise<GateDecision> {
  const {
    policyVault, programIds, caller, payerAgentAsset, payeeAgentAsset,
    amount, mint, policyId,
  } = input;

  // Build the gate_payment instruction. We thread it into a
  // VersionedTransaction so connection.simulateTransaction takes the
  // versioned-tx happy path (no need to manage feePayer/blockhash on a
  // legacy Transaction across @solana/web3.js >=1.95).
  const ix = await policyVault.methods
    .gatePayment(payerAgentAsset, payeeAgentAsset, amount, mint, policyId)
    .accounts({
      caller,
      policyAccount:         derivePolicyPda(programIds.policyVault, payerAgentAsset, policyId),
      velocityLedger:        deriveVelocityPda(programIds.policyVault, payerAgentAsset, policyId),
      killSwitchState:       deriveKillSwitchPda(programIds.policyVault, payerAgentAsset),
      payerAtomStats:        null,
      payeeAtomStats:        null,
      validationAttestation: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    .instruction();

  const conn  = policyVault.provider.connection;
  const blockhash = (await conn.getLatestBlockhash("confirmed")).blockhash;
  const { TransactionMessage, VersionedTransaction } = await import("@solana/web3.js");
  const message = new TransactionMessage({
    payerKey:        caller,
    recentBlockhash: blockhash,
    instructions:    [ix],
  }).compileToV0Message();
  const tx = new VersionedTransaction(message);

  const sim = await conn.simulateTransaction(tx, {
    sigVerify:              false,
    replaceRecentBlockhash: true,
  });
  if (sim.value.err) {
    throw new Error(`simulation failed: ${JSON.stringify(sim.value.err)}`);
  }
  const returnData = sim.value.returnData;
  if (!returnData || !returnData.data || !returnData.data[0]) {
    throw new Error("simulation produced no return_data");
  }
  return parseGateDecision(Buffer.from(returnData.data[0], "base64"));
}

/**
 * GateDecision Borsh parser. Wire format (matches Rust enum's variant order):
 *   variant 0: Allow                      (no payload)
 *   variant 1: Deny(DenyReason)           (1-byte: variant index 0..14 → code 1..15)
 *   variant 2: RequireValidation([u8;32])
 */
export function parseGateDecision(buf: Buffer): GateDecision {
  if (buf.length === 0) throw new Error("empty GateDecision return data");
  const variant = buf[0];

  if (variant === 0) return { kind: "Allow" };

  if (variant === 1) {
    if (buf.length < 2) throw new Error("Deny return data too short");
    const reasonCode = buf[1] + 1;
    return {
      kind:       "Deny",
      reasonCode,
      reasonName: denyReasonName(reasonCode),
    };
  }

  if (variant === 2) {
    if (buf.length < 33) throw new Error("RequireValidation return data too short");
    return {
      kind:           "RequireValidation",
      capabilityHash: new Uint8Array(buf.subarray(1, 33)),
    };
  }

  throw new Error(`unknown GateDecision variant: ${variant}`);
}
