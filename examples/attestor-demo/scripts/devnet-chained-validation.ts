/**
 * Chained RequireValidation devnet trace — Phase J3.
 *
 * Captures the full ERC-8004 third-leg chain on devnet in ONE run:
 *
 *   1. gate_payment with KIND_VALIDATION enabled and no attestation
 *      → returns RequireValidation in return data (sig captured).
 *   2. request_validation by a fresh requester keypair (sig 2).
 *   3. respond_to_validation by the registered attestor (sig 3).
 *   4. gate_payment again, this time passing the new ValidationAttestation
 *      PDA → returns Allow (sig 4).
 *
 * Capability namespace reused from J1's seed of 10 canonical names —
 * `kyc.tier-1.v1` lives at PDA 4ryEbb5iSiXHN2bJ59s9Pjdi2xxRkty1WohaRTqUt8wW
 * (see examples/attestor-demo/devnet-namespaces.json). The attestor
 * identity reused from `examples/attestor-demo/attestor-keypair.json`,
 * which was registered in Phase D and is referenced from
 * `devnet-attestor-trace.json`.
 *
 * Policy setup is one-time bootstrap (init_authority + init_killswitch +
 * init_policy with KIND_KILLSWITCH + KIND_VALIDATION enabled). On rerun
 * the script reuses the existing PolicyAccount and only emits the four
 * chained sigs, keeping the trace JSON deterministic across runs.
 *
 * Output: `examples/attestor-demo/devnet-chained-validation.json`
 */

import {
  AnchorProvider,
  BN,
  Idl,
  Program,
  Wallet,
} from "@coral-xyz/anchor";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import {
  DEFAULT_DEVNET_PROGRAM_IDS,
  VALIDATION_REGISTRY_DEVNET_ID,
  buildRegisterAttestorIx,
  buildRequestValidationIx,
  buildRespondToValidationIx,
  computeCapabilityHash,
  deriveAttestorProfilePda,
  deriveCapabilityNamespacePda,
  deriveKillSwitchPda,
  derivePolicyPda,
  deriveValidationAttestationPda,
  deriveValidationRequestPda,
  deriveVelocityPda,
  fetchAttestorProfile,
  fetchCapabilityNamespace,
  loadPolicyVault,
  loadValidationRegistry,
} from "@agenttrust-sdk/trustgate";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const RPC_URL  = process.env.RPC_URL  ?? "https://api.devnet.solana.com";
const KEYPAIR  = process.env.KEYPAIR  ?? path.join(os.homedir(), ".config/solana/id.json");
const OUTPUT   = path.resolve(__dirname, "..", "devnet-chained-validation.json");

const ATTESTOR_KEYPAIR_FILE = path.resolve(__dirname, "..", "attestor-keypair.json");
const POLICY_AGENT_FILE     = path.resolve(__dirname, "..", "devnet-chained-policy-agent.json");
const PAYEE_FILE            = path.resolve(__dirname, "..", "devnet-chained-payee.json");

const POLICY_VAULT_ID = DEFAULT_DEVNET_PROGRAM_IDS.policyVault;
const POLICY_ID       = 7_777;                        // arbitrary — script-owned
const CAPABILITY_NAME = "kyc.tier-1.v1";              // from J1 seed

// PolicyAuthority seed prefix (not exported from SDK; mirror the on-chain const).
const POLICY_AUTHORITY_PREFIX = Buffer.from("policy_authority");
function deriveAuthorityPda(policyVaultId: PublicKey, agent: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [POLICY_AUTHORITY_PREFIX, agent.toBuffer()],
    policyVaultId,
  )[0];
}

// ---------------------------------------------------------------------------

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

// gate_payment GateDecision is encoded in return data; see SDK
// parseGateDecision. For the trace we only need to record the decision
// kind alongside the sig — full decoding lives in the SDK.
function decodeGateDecisionKind(returnDataB64: string | undefined | null): string {
  if (!returnDataB64) return "UNKNOWN";
  const buf = Buffer.from(returnDataB64, "base64");
  if (buf.length === 0) return "UNKNOWN";
  switch (buf[0]) {
    case 0:  return "Allow";
    case 1:  return "Deny";
    case 2:  return "RequireValidation";
    default: return `Unknown(${buf[0]})`;
  }
}

// ---------------------------------------------------------------------------
// Bootstrap helpers — idempotent
// ---------------------------------------------------------------------------

async function ensureAttestorRegistered(
  validationProgram: Program,
  facilitator: Keypair,
  attestor: Keypair,
  connection: Connection,
): Promise<{ pda: PublicKey; signature?: string; skipped: boolean }> {
  const pda = deriveAttestorProfilePda(VALIDATION_REGISTRY_DEVNET_ID, attestor.publicKey);
  const existing = await fetchAttestorProfile(validationProgram, attestor.publicKey);
  if (existing.data) {
    return { pda, skipped: true };
  }

  const ix = await buildRegisterAttestorIx({
    program: validationProgram, attestor: attestor.publicKey,
    displayNameUri: "https://agenttrust.demo/attestors/devnet-smoke.json",
  });
  const tx = new Transaction()
    .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }))
    .add(ix);
  // attestor pays its own profile rent — fund first if needed.
  const balance = await connection.getBalance(attestor.publicKey);
  if (balance < 0.02 * 1e9) {
    const fundIx = SystemProgram.transfer({
      fromPubkey: facilitator.publicKey, toPubkey: attestor.publicKey, lamports: 0.05 * 1e9,
    });
    await sendAndConfirmTransaction(connection, new Transaction().add(fundIx), [facilitator]);
  }
  const sig = await sendAndConfirmTransaction(connection, tx, [attestor], { commitment: "confirmed" });
  return { pda, signature: sig, skipped: false };
}

async function ensurePolicyConfigured(
  policyProgram: Program,
  payer: Keypair,
  agent: PublicKey,
  capabilityHash: Uint8Array,
  attestorPubkey: PublicKey,
): Promise<{ policyPda: PublicKey; ledgerPda: PublicKey; killSwitchPda: PublicKey; authorityPda: PublicKey; setupSigs: string[] }> {
  const policyPda     = derivePolicyPda(POLICY_VAULT_ID, agent, POLICY_ID);
  const ledgerPda     = deriveVelocityPda(POLICY_VAULT_ID, agent, POLICY_ID);
  const killSwitchPda = deriveKillSwitchPda(POLICY_VAULT_ID, agent);
  const authorityPda  = deriveAuthorityPda(POLICY_VAULT_ID, agent);

  const setupSigs: string[] = [];

  // 1. PolicyAuthority
  const authInfo = await policyProgram.provider.connection.getAccountInfo(authorityPda);
  if (!authInfo) {
    const sig = await policyProgram.methods
      .initAuthority(agent, [payer.publicKey], 1)
      .accountsStrict({ payer: payer.publicKey, policyAuthority: authorityPda, systemProgram: SystemProgram.programId })
      .rpc();
    setupSigs.push(sig);
  }

  // 2. KillSwitchState
  const ksInfo = await policyProgram.provider.connection.getAccountInfo(killSwitchPda);
  if (!ksInfo) {
    const sig = await policyProgram.methods
      .initKillswitch(agent)
      .accountsStrict({ payer: payer.publicKey, killSwitchState: killSwitchPda, systemProgram: SystemProgram.programId })
      .rpc();
    setupSigs.push(sig);
  }

  // 3. PolicyAccount (KIND_KILLSWITCH = 0x01 + KIND_VALIDATION = 0x10 → 0x11)
  const policyInfo = await policyProgram.provider.connection.getAccountInfo(policyPda);
  if (!policyInfo) {
    const sig = await policyProgram.methods
      .initPolicy(agent, {
        policyId:            POLICY_ID,
        enabledKindsBitmask: 0x11,
        gateMode:            0,
        scopeKind:           0,
        spending:    { perTxMax: new BN(0), dailyMax: new BN(0), weeklyMax: new BN(0) },
        velocity:    { windowSecs: new BN(0), maxInWindow: new BN(0), tier0DecayFactor: new BN(0) },
        counterparty:{ minTier: 0, maxRiskScore: 255, minConfidence: 0, defaultUnratedTreatment: 1 },
        validation:  { requiredCapabilityHash: Array.from(capabilityHash), acceptedAttestors: [attestorPubkey, PublicKey.default] },
      })
      .accountsStrict({
        payer: payer.publicKey, policyAuthority: authorityPda,
        policyAccount: policyPda, velocityLedger: ledgerPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    setupSigs.push(sig);
  }

  return { policyPda, ledgerPda, killSwitchPda, authorityPda, setupSigs };
}

async function callGatePayment(
  policyProgram: Program,
  caller: Keypair,
  agent: PublicKey,
  payee: PublicKey,
  amount: bigint,
  policyPda: PublicKey,
  ledgerPda: PublicKey,
  killSwitchPda: PublicKey,
  validationAttestation: PublicKey | null,
): Promise<{ signature: string; decisionKind: string; returnDataB64: string | null }> {
  const tx = await policyProgram.methods
    .gatePayment(agent, payee, new BN(amount.toString()), PublicKey.default, POLICY_ID)
    .accountsStrict({
      caller: caller.publicKey,
      policyAccount:         policyPda,
      velocityLedger:        ledgerPda,
      killSwitchState:       killSwitchPda,
      payerAtomStats:        null,
      payeeAtomStats:        null,
      validationAttestation: validationAttestation,
    } as any)
    .transaction();

  const sig = await sendAndConfirmTransaction(
    policyProgram.provider.connection, tx, [caller], { commitment: "confirmed" },
  );

  // Pull the parsed tx so we can read the return data the program emitted.
  const parsed = await policyProgram.provider.connection.getTransaction(sig, {
    commitment: "confirmed", maxSupportedTransactionVersion: 0,
  });
  // returnData lives on ConfirmedTransactionMeta but @solana/web3.js's
  // older type defs don't expose it; cast through unknown to read it.
  const returnDataB64 =
    ((parsed?.meta as unknown as { returnData?: { data?: [string, string] } } | null | undefined)
      ?.returnData?.data?.[0]) ?? null;
  return { signature: sig, decisionKind: decodeGateDecisionKind(returnDataB64), returnDataB64 };
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const connection  = new Connection(RPC_URL, "confirmed");
  const facilitator = loadKeypair(KEYPAIR);
  const attestor    = loadOrCreateKeypair(ATTESTOR_KEYPAIR_FILE);
  const policyAgent = loadOrCreateKeypair(POLICY_AGENT_FILE);
  const payee       = loadOrCreateKeypair(PAYEE_FILE);

  // eslint-disable-next-line no-console
  console.log(`[chained] facilitator=${facilitator.publicKey.toBase58()}`);
  // eslint-disable-next-line no-console
  console.log(`[chained] attestor=${attestor.publicKey.toBase58()}`);
  // eslint-disable-next-line no-console
  console.log(`[chained] policyAgent=${policyAgent.publicKey.toBase58()}`);
  // eslint-disable-next-line no-console
  console.log(`[chained] payee=${payee.publicKey.toBase58()}`);

  const provider = new AnchorProvider(connection, new Wallet(facilitator), { commitment: "confirmed" });

  // Load both programs. anchor 0.31 vs CLI 1.0 IDL gap means we fall
  // back to bundled IDLs from target/idl when the chain fetch fails.
  const idlDir = path.resolve(__dirname, "..", "..", "..", "target", "idl");
  let validationProgram: Program;
  try {
    validationProgram = await loadValidationRegistry(provider, VALIDATION_REGISTRY_DEVNET_ID);
  } catch (_) {
    const idl = JSON.parse(fs.readFileSync(path.join(idlDir, "validation_registry.json"), "utf-8")) as Idl;
    validationProgram = await loadValidationRegistry(provider, VALIDATION_REGISTRY_DEVNET_ID, idl);
  }
  let policyProgram: Program;
  try {
    policyProgram = await loadPolicyVault(provider, POLICY_VAULT_ID);
  } catch (_) {
    const idl = JSON.parse(fs.readFileSync(path.join(idlDir, "policy_vault.json"), "utf-8")) as Idl;
    policyProgram = await loadPolicyVault(provider, POLICY_VAULT_ID, idl);
  }

  // Capability — must already be on-chain (J1 seeded all 10).
  const capabilityHash = computeCapabilityHash(CAPABILITY_NAME);
  const namespacePda   = deriveCapabilityNamespacePda(VALIDATION_REGISTRY_DEVNET_ID, capabilityHash);
  const namespaceCheck = await fetchCapabilityNamespace(validationProgram, capabilityHash);
  if (!namespaceCheck.data) {
    throw new Error(`namespace ${CAPABILITY_NAME} not on-chain — run pnpm --filter ./examples/attestor-demo run seed:namespaces first`);
  }
  // eslint-disable-next-line no-console
  console.log(`[chained] capability=${CAPABILITY_NAME} pda=${namespacePda.toBase58()}`);

  // -------- Bootstrap: attestor profile + PolicyAccount (idempotent) ---------
  const attestorReg = await ensureAttestorRegistered(validationProgram, facilitator, attestor, connection);
  if (attestorReg.signature) console.log(`[chained] attestor registered: ${attestorReg.signature}`);
  else                       console.log(`[chained] attestor profile reused at ${attestorReg.pda.toBase58()}`);

  const policy = await ensurePolicyConfigured(
    policyProgram, facilitator, policyAgent.publicKey, capabilityHash, attestor.publicKey,
  );
  if (policy.setupSigs.length) console.log(`[chained] policy setup sigs: ${policy.setupSigs.join(", ")}`);
  else                          console.log(`[chained] policy reused at ${policy.policyPda.toBase58()}`);

  // ============================ The 4-sig chain ============================

  const trace: any = {
    network:        "solana-devnet",
    capturedAt:     new Date().toISOString(),
    capability:     {
      name: CAPABILITY_NAME,
      hash: Buffer.from(capabilityHash).toString("hex"),
      pda:  namespacePda.toBase58(),
    },
    actors: {
      facilitator:   facilitator.publicKey.toBase58(),
      attestor:      attestor.publicKey.toBase58(),
      policyAgent:   policyAgent.publicKey.toBase58(),
      payee:         payee.publicKey.toBase58(),
    },
    policy: {
      pda:           policy.policyPda.toBase58(),
      pdaExplorer:   accountExplorer(policy.policyPda.toBase58()),
      enabledKinds:  "KIND_KILLSWITCH | KIND_VALIDATION",
      bitmask:       "0x11",
      requiredCapabilityHash: Buffer.from(capabilityHash).toString("hex"),
      acceptedAttestors:      [attestor.publicKey.toBase58(), PublicKey.default.toBase58()],
    },
    chain: {} as Record<string, unknown>,
  };

  // Choose a fresh requester so the ValidationRequest PDA seed (subject,
  // capability, requester) doesn't collide on rerun.
  const requesterKp = Keypair.generate();
  const fundReqIx = SystemProgram.transfer({
    fromPubkey: facilitator.publicKey, toPubkey: requesterKp.publicKey, lamports: 0.01 * 1e9,
  });
  await sendAndConfirmTransaction(connection, new Transaction().add(fundReqIx), [facilitator]);

  // Subject = the PAYEE. The validation policy in
  // programs/policy-vault/src/policies/require_validation.rs:75 checks
  // `attestation.subject_asset == payee_agent_asset` — the attestation
  // says "this payee holds capability X". The policy agent (payer) is
  // the entity whose policy enforces the requirement; the payee is who
  // the attestation is *about*.
  const subjectAsset = payee.publicKey;

  const requestPda = deriveValidationRequestPda(
    VALIDATION_REGISTRY_DEVNET_ID, subjectAsset, capabilityHash, requesterKp.publicKey,
  );
  const attestationPda = deriveValidationAttestationPda(
    VALIDATION_REGISTRY_DEVNET_ID, subjectAsset, capabilityHash, attestor.publicKey,
  );

  // ----- SIG 1 — gate_payment (no attestation) → RequireValidation -----
  // eslint-disable-next-line no-console
  console.log(`[chained] sig 1: gate_payment without attestation (expects RequireValidation)`);
  const sig1 = await callGatePayment(
    policyProgram, facilitator, policyAgent.publicKey, payee.publicKey,
    1n, policy.policyPda, policy.ledgerPda, policy.killSwitchPda,
    null,
  );
  trace.chain.gateBeforeAttestation = {
    signature:    sig1.signature,
    explorer:     explorer(sig1.signature),
    decisionKind: sig1.decisionKind,
    note:         "validation_attestation account not provided → policy KIND_VALIDATION returns RequireValidation in return data",
  };
  console.log(`[chained]   ${sig1.signature} → ${sig1.decisionKind}`);

  // ----- SIG 2 — request_validation -----
  // eslint-disable-next-line no-console
  console.log(`[chained] sig 2: request_validation (requester=${requesterKp.publicKey.toBase58().slice(0, 8)}…)`);
  const claimUriHash = computeCapabilityHash(`https://agenttrust.demo/claims/${Date.now()}.json`);
  const requestIx = await buildRequestValidationIx({
    program:        validationProgram,
    requester:      requesterKp.publicKey,
    subjectAsset,
    capabilityHash,
    claimUriHash,
    deadlineSlot:   (await connection.getSlot()) + 100_000,
  });
  const sig2 = await sendAndConfirmTransaction(
    connection,
    new Transaction()
      .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }))
      .add(requestIx),
    [requesterKp],
    { commitment: "confirmed" },
  );
  trace.chain.requestValidation = {
    signature: sig2,
    explorer:  explorer(sig2),
    pda:       requestPda.toBase58(),
    requester: requesterKp.publicKey.toBase58(),
  };
  console.log(`[chained]   ${sig2}`);

  // ----- SIG 3 — respond_to_validation -----
  console.log(`[chained] sig 3: respond_to_validation (attestor=${attestor.publicKey.toBase58().slice(0, 8)}…)`);
  // ValidationAttestation PDA is keyed by (subject, capability, attestor)
  // — no requester component — so a rerun with the same triple would
  // hit the init constraint. Use a fresh subject_asset (policyAgent
  // is fresh per-script-run via loadOrCreateKeypair on first run; on
  // rerun the existing attestation is reused and respond is skipped).
  const existingAttestation = await connection.getAccountInfo(attestationPda);
  let sig3: string;
  if (existingAttestation) {
    // eslint-disable-next-line no-console
    console.log(`[chained]   attestation already exists at ${attestationPda.toBase58()}, skipping respond (sig 3 = previous run)`);
    sig3 = "(reused — respond_to_validation already on chain)";
    trace.chain.respondToValidation = {
      skipped:   true,
      pda:       attestationPda.toBase58(),
      explorer:  accountExplorer(attestationPda.toBase58()),
      note:      "attestation account already on chain from a prior run",
    };
  } else {
    const claimPayloadHash = computeCapabilityHash(`payload-${Date.now()}`);
    const respondIx = await buildRespondToValidationIx({
      program:          validationProgram,
      payer:            facilitator.publicKey,
      attestor:         attestor.publicKey,
      subjectAsset,
      capabilityHash,
      claimPayloadHash,
      claimUriHash,
      expiresAtSlot:    (await connection.getSlot()) + 1_000_000,
    });
    sig3 = await sendAndConfirmTransaction(
      connection,
      new Transaction()
        .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }))
        .add(respondIx),
      [facilitator, attestor],
      { commitment: "confirmed" },
    );
    trace.chain.respondToValidation = {
      signature: sig3,
      explorer:  explorer(sig3),
      pda:       attestationPda.toBase58(),
    };
    console.log(`[chained]   ${sig3}`);
  }

  // ----- SIG 4 — gate_payment again (with attestation) → Allow -----
  console.log(`[chained] sig 4: gate_payment WITH attestation (expects Allow)`);
  const sig4 = await callGatePayment(
    policyProgram, facilitator, policyAgent.publicKey, payee.publicKey,
    1n, policy.policyPda, policy.ledgerPda, policy.killSwitchPda,
    attestationPda,
  );
  trace.chain.gateAfterAttestation = {
    signature:        sig4.signature,
    explorer:         explorer(sig4.signature),
    decisionKind:     sig4.decisionKind,
    validationAttestation: attestationPda.toBase58(),
    note:             "validation_attestation provided → policy KIND_VALIDATION verifies and returns Allow",
  };
  console.log(`[chained]   ${sig4.signature} → ${sig4.decisionKind}`);

  // -------------------------------------------------------------------------

  fs.writeFileSync(OUTPUT, JSON.stringify(trace, null, 2));
  // eslint-disable-next-line no-console
  console.log(`\n[chained] wrote ${OUTPUT}`);
  // eslint-disable-next-line no-console
  console.log(`[chained] chain summary:`);
  // eslint-disable-next-line no-console
  console.log(`           pre-attestation gate_payment   → ${trace.chain.gateBeforeAttestation.decisionKind}`);
  // eslint-disable-next-line no-console
  console.log(`           request + respond              → attestation PDA ${attestationPda.toBase58()}`);
  // eslint-disable-next-line no-console
  console.log(`           post-attestation gate_payment  → ${trace.chain.gateAfterAttestation.decisionKind}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[chained] FAILED:", err);
  process.exit(1);
});
