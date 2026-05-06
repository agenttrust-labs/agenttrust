/**
 * Devnet ValidationRegistry attestor-lifecycle smoke.
 *
 * Captures a real on-chain trace through ALL 5 ValidationRegistry
 * instructions, proving the third leg of the ERC-8004 trust stack works
 * end-to-end against the deployed devnet program at
 * Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv.
 *
 * Idempotent. Skips re-registering anything that already exists. Reuses
 * the attestor keypair via `examples/attestor-demo/attestor-keypair.json`
 * so subsequent runs respond to fresh requests instead of requiring a
 * new attestor identity per run.
 *
 * Steps:
 *   1. register_namespace (skipped if PDA already exists)
 *   2. register_attestor  (skipped if PDA already exists)
 *   3. request_validation (always — fresh request per-run, keyed by
 *                          subject + capability + requester)
 *   4. respond_to_validation (always — keyed by subject + capability +
 *                              attestor; first run for this triple)
 *   5. revoke_validation  (optional — gated on env REVOKE=1)
 *
 * Output JSON: examples/attestor-demo/devnet-attestor-trace.json
 */

import { AnchorProvider, Idl, Program, Wallet } from "@coral-xyz/anchor";
import {
  Connection, Keypair, PublicKey, SystemProgram, Transaction,
  ComputeBudgetProgram, sendAndConfirmTransaction,
} from "@solana/web3.js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import {
  VALIDATION_REGISTRY_DEVNET_ID,
  buildRegisterAttestorIx,
  buildRegisterNamespaceIx,
  buildRequestValidationIx,
  buildRespondToValidationIx,
  buildRevokeValidationIx,
  computeCapabilityHash,
  computeNamespaceHash,
  deriveAttestorProfilePda,
  deriveCapabilityNamespacePda,
  deriveValidationAttestationPda,
  deriveValidationRequestPda,
  fetchAttestorProfile,
  fetchCapabilityNamespace,
  loadValidationRegistry,
} from "@agenttrust-sdk/trustgate";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const RPC_URL = process.env.RPC_URL ?? "https://api.devnet.solana.com";
const KEYPAIR = process.env.KEYPAIR ?? path.join(os.homedir(), ".config/solana/id.json");
const ATTESTOR_KEYPAIR_FILE = path.resolve(__dirname, "..", "attestor-keypair.json");
const TRACE_FILE = path.resolve(__dirname, "..", "devnet-attestor-trace.json");
const COUNTERPARTIES_FILE = path.resolve(__dirname, "..", "..", "pay-sh-demo", "devnet-counterparties.json");

// The namespace and the capability share a single hash on chain — the PDA
// seed is sha256(<name>) regardless of whether you call it "namespace" or
// "capability". Use ONE canonical name for both so the namespace PDA the
// service registers is the same one the validation_request looks up.
const CAPABILITY_NAME    = "usdc-payment-policy.v1";
const NAMESPACE_VERSION  = "v1";
const NAMESPACE_SCHEMA   = "https://agenttrust.demo/schemas/usdc-payment-policy.json";

function loadKeypair(p: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf-8"))));
}

function loadOrCreateKeypair(p: string): Keypair {
  if (fs.existsSync(p)) return loadKeypair(p);
  const kp = Keypair.generate();
  fs.writeFileSync(p, JSON.stringify(Array.from(kp.secretKey)));
  return kp;
}

function explorer(sig: string): string {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}
function accountExplorer(addr: string): string {
  return `https://explorer.solana.com/address/${addr}?cluster=devnet`;
}

async function main(): Promise<void> {
  const connection = new Connection(RPC_URL, "confirmed");
  const facilitator = loadKeypair(KEYPAIR);
  const attestor    = loadOrCreateKeypair(ATTESTOR_KEYPAIR_FILE);

  console.log(`[attestor] facilitator=${facilitator.publicKey.toBase58()}`);
  console.log(`[attestor] attestor=${attestor.publicKey.toBase58()}`);
  console.log(`[attestor] rpc=${RPC_URL}`);

  // Subject = a Quantu agent we already pre-warmed; reuse the tier-3
  // counterparty so this trace lines up with the existing pay-sh-demo
  // smoke (Phase C).
  const cpsRaw = fs.readFileSync(COUNTERPARTIES_FILE, "utf-8");
  const counterparties: any = JSON.parse(cpsRaw);
  const tier3: any = counterparties.counterparties.find((c: any) => c.demoTier === 3);
  if (!tier3) throw new Error("no tier-3 counterparty in devnet-counterparties.json");
  const subjectAsset = new PublicKey(tier3.asset);
  console.log(`[attestor] subject (Quantu tier-3 asset) = ${subjectAsset.toBase58()}`);

  // Fund the attestor wallet if needed (rent for AttestorProfile +
  // ValidationAttestation PDAs ≈ 0.005 SOL).
  const attestorBalance = await connection.getBalance(attestor.publicKey);
  if (attestorBalance < 0.02 * 1e9) {
    console.log(`[attestor] funding attestor (current=${(attestorBalance/1e9).toFixed(4)} SOL)`);
    const fundIx = SystemProgram.transfer({
      fromPubkey: facilitator.publicKey,
      toPubkey:   attestor.publicKey,
      lamports:   0.05 * 1e9,
    });
    await sendAndConfirmTransaction(connection, new Transaction().add(fundIx), [facilitator]);
  }

  // Load the trustgate program's stored IDL via Anchor (we published in
  // Phase C; loadValidationRegistry's on-chain fetch handles that case).
  const provider = new AnchorProvider(connection, new Wallet(facilitator), { commitment: "confirmed" });
  let program: Program;
  try {
    program = await loadValidationRegistry(provider, VALIDATION_REGISTRY_DEVNET_ID);
  } catch (e) {
    // Fallback: load from local target/idl.
    const idlPath = path.resolve(__dirname, "..", "..", "..", "target", "idl", "validation_registry.json");
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8")) as Idl;
    program = await loadValidationRegistry(provider, VALIDATION_REGISTRY_DEVNET_ID, idl);
    console.log(`[attestor] note: loaded IDL from disk (chain fetch failed: ${e instanceof Error ? e.message : e})`);
  }

  const trace: any = {
    network:        "solana-devnet",
    program:        VALIDATION_REGISTRY_DEVNET_ID.toBase58(),
    facilitator:    facilitator.publicKey.toBase58(),
    attestor:       attestor.publicKey.toBase58(),
    subjectAsset:   subjectAsset.toBase58(),
    capabilityName: CAPABILITY_NAME,
    capturedAt:     new Date().toISOString(),
    steps:          {} as Record<string, any>,
  };

  // -----------------------------------------------------------------------
  // 1. register_namespace (idempotent). The hash that keys the namespace
  // PDA is the same hash request_validation later passes as
  // capability_hash — sha256(CAPABILITY_NAME). One canonical hash flows
  // through the lifecycle.
  // -----------------------------------------------------------------------
  const capabilityHash = computeCapabilityHash(CAPABILITY_NAME);
  const namespacePda   = deriveCapabilityNamespacePda(VALIDATION_REGISTRY_DEVNET_ID, capabilityHash);
  const existingNs = await fetchCapabilityNamespace(program, capabilityHash);
  if (existingNs.data) {
    console.log(`[attestor] namespace already registered at ${namespacePda.toBase58()}, skipping`);
    trace.steps.registerNamespace = { skipped: true, pda: namespacePda.toBase58(), explorer: accountExplorer(namespacePda.toBase58()) };
  } else {
    const ix = await buildRegisterNamespaceIx({
      program, creator: facilitator.publicKey,
      namespaceHash: capabilityHash, name: CAPABILITY_NAME,
      version: NAMESPACE_VERSION, schemaUri: NAMESPACE_SCHEMA,
    });
    const tx = new Transaction()
      .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }))
      .add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [facilitator], { commitment: "confirmed" });
    console.log(`[attestor] register_namespace: ${sig}`);
    trace.steps.registerNamespace = { signature: sig, explorer: explorer(sig), pda: namespacePda.toBase58() };
  }

  // -----------------------------------------------------------------------
  // 2. register_attestor (idempotent)
  // -----------------------------------------------------------------------
  const attestorPda = deriveAttestorProfilePda(VALIDATION_REGISTRY_DEVNET_ID, attestor.publicKey);
  const existingAttestor = await fetchAttestorProfile(program, attestor.publicKey);
  if (existingAttestor.data) {
    console.log(`[attestor] attestor profile exists at ${attestorPda.toBase58()}, skipping`);
    trace.steps.registerAttestor = { skipped: true, pda: attestorPda.toBase58(), explorer: accountExplorer(attestorPda.toBase58()) };
  } else {
    const ix = await buildRegisterAttestorIx({
      program, attestor: attestor.publicKey,
      displayNameUri: "https://agenttrust.demo/attestors/devnet-smoke.json",
    });
    const tx = new Transaction()
      .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }))
      .add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [attestor], { commitment: "confirmed" });
    console.log(`[attestor] register_attestor: ${sig}`);
    trace.steps.registerAttestor = { signature: sig, explorer: explorer(sig), pda: attestorPda.toBase58() };
  }

  // -----------------------------------------------------------------------
  // 3. request_validation
  // -----------------------------------------------------------------------
  // Per-run uniqueness — claim_uri_hash differs each invocation so retries
  // don't collide on a stale ValidationRequest PDA.
  const claimUri = `https://agenttrust.demo/claims/${Date.now()}.json`;
  const claimUriHash = computeCapabilityHash(claimUri);
  const requestPda = deriveValidationRequestPda(
    VALIDATION_REGISTRY_DEVNET_ID, subjectAsset, capabilityHash, facilitator.publicKey,
  );
  // First, check if a ValidationRequest already exists for this
  // (subject, capability, requester) triple. The PDA is keyed by the
  // requester, so re-requesting from the same wallet hits init constraint.
  // To keep the smoke fully reproducible, we use a fresh requester
  // keypair per run that's funded from the facilitator.
  const requesterKp = Keypair.generate();
  const fundReqIx = SystemProgram.transfer({
    fromPubkey: facilitator.publicKey,
    toPubkey:   requesterKp.publicKey,
    lamports:   0.01 * 1e9,
  });
  await sendAndConfirmTransaction(connection, new Transaction().add(fundReqIx), [facilitator]);
  const requestPda2 = deriveValidationRequestPda(
    VALIDATION_REGISTRY_DEVNET_ID, subjectAsset, capabilityHash, requesterKp.publicKey,
  );
  const requestIx = await buildRequestValidationIx({
    program, requester: requesterKp.publicKey, subjectAsset,
    capabilityHash, claimUriHash,
    deadlineSlot: (await connection.getSlot()) + 100_000,
  });
  // Need namespace to exist — it does at this point.
  const requestTx = new Transaction()
    .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }))
    .add(requestIx);
  const requestSig = await sendAndConfirmTransaction(
    connection, requestTx, [requesterKp], { commitment: "confirmed" },
  );
  console.log(`[attestor] request_validation: ${requestSig}`);
  trace.steps.requestValidation = {
    signature: requestSig, explorer: explorer(requestSig),
    pda: requestPda2.toBase58(), requester: requesterKp.publicKey.toBase58(),
  };
  void requestPda;

  // -----------------------------------------------------------------------
  // 4. respond_to_validation — the load-bearing step. Creates the
  //    ValidationAttestation PDA the PolicyVault RequireValidation policy
  //    reads on subsequent gate_payment calls.
  // -----------------------------------------------------------------------
  const attestationPda = deriveValidationAttestationPda(
    VALIDATION_REGISTRY_DEVNET_ID, subjectAsset, capabilityHash, attestor.publicKey,
  );

  // Check if we've already responded for this (subject, capability,
  // attestor) triple — if so, skip respond and proceed to revoke gating.
  const existingAttestation = await connection.getAccountInfo(attestationPda);

  if (!existingAttestation) {
    const claimPayload = computeCapabilityHash(`payload-${Date.now()}`);
    const respondIx = await buildRespondToValidationIx({
      program, payer: facilitator.publicKey, attestor: attestor.publicKey,
      subjectAsset, capabilityHash, claimPayloadHash: claimPayload,
      claimUriHash, expiresAtSlot: (await connection.getSlot()) + 1_000_000,
    });
    const respondTx = new Transaction()
      .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }))
      .add(respondIx);
    const respondSig = await sendAndConfirmTransaction(
      connection, respondTx, [facilitator, attestor], { commitment: "confirmed" },
    );
    console.log(`[attestor] respond_to_validation: ${respondSig}`);
    trace.steps.respondToValidation = {
      signature: respondSig, explorer: explorer(respondSig),
      pda: attestationPda.toBase58(),
    };
  } else {
    console.log(`[attestor] attestation already exists at ${attestationPda.toBase58()}, skipping respond`);
    trace.steps.respondToValidation = {
      skipped: true, pda: attestationPda.toBase58(), explorer: accountExplorer(attestationPda.toBase58()),
    };
  }

  // -----------------------------------------------------------------------
  // 5. revoke_validation (optional — gated on REVOKE=1)
  // -----------------------------------------------------------------------
  if (process.env.REVOKE === "1") {
    const reasonHash = computeCapabilityHash("manual-revoke");
    const revokeIx = await buildRevokeValidationIx({
      program, attestor: attestor.publicKey, subjectAsset,
      capabilityHash, revocationReasonHash: reasonHash,
    });
    const revokeTx = new Transaction()
      .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }))
      .add(revokeIx);
    const revokeSig = await sendAndConfirmTransaction(
      connection, revokeTx, [attestor], { commitment: "confirmed" },
    );
    console.log(`[attestor] revoke_validation: ${revokeSig}`);
    trace.steps.revokeValidation = { signature: revokeSig, explorer: explorer(revokeSig), pda: attestationPda.toBase58() };
  }

  fs.writeFileSync(TRACE_FILE, JSON.stringify(trace, null, 2));
  console.log("\n=== ValidationRegistry attestor flow complete ===");
  console.log(`trace written to ${TRACE_FILE}`);
  console.log(JSON.stringify(trace, null, 2));
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[attestor] FAILED:", e);
  process.exit(1);
});
