/**
 * Seed the canonical v1 capability namespaces on devnet (Phase J1).
 *
 * The research playbook (docs/plan/research/06-validation-registry-class.md
 * §C.2) lists 10 v1 seeded namespaces. The published full names there
 * (e.g., "kyc.tier-1.v1.identity-verified") exceed the on-chain 32-char
 * MAX_NAME_LEN constant in
 * `programs/validation-registry/src/instructions/register_namespace.rs`,
 * so the canonical v1 set on chain uses the broader category labels —
 * each comfortably under the limit:
 *
 *   1. kyc.tier-1.v1
 *   2. kyc.tier-2.v1
 *   3. kyc.tier-3.v1
 *   4. audit.smart-contract.v1
 *   5. audit.attestor-firm.v1
 *   6. model-card.v1
 *   7. jurisdiction.v1
 *   8. compliance.payments.v1
 *   9. agent-source.v1
 *  10. usdc-payment-policy.v1   (already registered Phase D — kept here
 *                                so devnet-namespaces.json captures the
 *                                full v1 set, not just the new ones)
 *
 * Idempotent: checks fetchCapabilityNamespace before each registration;
 * already-registered namespaces are recorded as `skipped: true`. Reruns
 * never double-register.
 *
 * Cost: each namespace PDA is ~73 bytes + ~36 bytes overhead = ~0.0014
 * SOL rent. 9 fresh registrations = ~0.013 SOL; well under the brief's
 * 0.05 SOL budget.
 *
 * Captures every PDA + signature into examples/attestor-demo/
 * devnet-namespaces.json — the JSON the public docs cite.
 */

import {
  AnchorProvider,
  Idl,
  Program,
  Wallet,
} from "@coral-xyz/anchor";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import {
  VALIDATION_REGISTRY_DEVNET_ID,
  buildRegisterNamespaceIx,
  computeCapabilityHash,
  deriveCapabilityNamespacePda,
  fetchCapabilityNamespace,
  loadValidationRegistry,
} from "@agenttrust-sdk/trustgate";

// ---------------------------------------------------------------------------

const RPC_URL = process.env.RPC_URL ?? "https://api.devnet.solana.com";
const KEYPAIR = process.env.KEYPAIR ?? path.join(os.homedir(), ".config/solana/id.json");
const OUTPUT  = path.resolve(__dirname, "..", "devnet-namespaces.json");

interface CanonicalNamespace {
  readonly name:        string;
  readonly description: string;
  readonly schemaUri:   string;
  readonly version:     string;
}

const CANONICAL: ReadonlyArray<CanonicalNamespace> = [
  {
    name:        "kyc.tier-1.v1",
    description: "Identity-verified individual (basic KYC).",
    schemaUri:   "https://agenttrust.tech/schemas/kyc.tier-1.v1.json",
    version:     "v1",
  },
  {
    name:        "kyc.tier-2.v1",
    description: "Identity + address verified.",
    schemaUri:   "https://agenttrust.tech/schemas/kyc.tier-2.v1.json",
    version:     "v1",
  },
  {
    name:        "kyc.tier-3.v1",
    description: "Enhanced due diligence (regulated counterparties).",
    schemaUri:   "https://agenttrust.tech/schemas/kyc.tier-3.v1.json",
    version:     "v1",
  },
  {
    name:        "audit.smart-contract.v1",
    description: "Audit attestation against a deployed program.",
    schemaUri:   "https://agenttrust.tech/schemas/audit.smart-contract.v1.json",
    version:     "v1",
  },
  {
    name:        "audit.attestor-firm.v1",
    description: "Per-firm audit identity (Halborn / OtterSec / etc.).",
    schemaUri:   "https://agenttrust.tech/schemas/audit.attestor-firm.v1.json",
    version:     "v1",
  },
  {
    name:        "model-card.v1",
    description: "LLM model-version provenance attestation.",
    schemaUri:   "https://agenttrust.tech/schemas/model-card.v1.json",
    version:     "v1",
  },
  {
    name:        "jurisdiction.v1",
    description: "Regulatory-jurisdiction stamp (EU MiCA, US, etc.).",
    schemaUri:   "https://agenttrust.tech/schemas/jurisdiction.v1.json",
    version:     "v1",
  },
  {
    name:        "compliance.payments.v1",
    description: "Payment-network compliance attestation (Mastercard FACT-aligned, etc.).",
    schemaUri:   "https://agenttrust.tech/schemas/compliance.payments.v1.json",
    version:     "v1",
  },
  {
    name:        "agent-source.v1",
    description: "Provenance: which dev shop authored the agent.",
    schemaUri:   "https://agenttrust.tech/schemas/agent-source.v1.json",
    version:     "v1",
  },
  {
    name:        "usdc-payment-policy.v1",
    description: "USDC payment policy capability — Phase D attestor demo.",
    schemaUri:   "https://agenttrust.demo/schemas/usdc-payment-policy.json",
    version:     "v1",
  },
];

interface NamespaceRecord {
  name:        string;
  description: string;
  pda:         string;
  capabilityHash: string;
  signature?:  string;
  signatureExplorer?: string;
  pdaExplorer: string;
  status:      "newly-registered" | "already-registered";
}

function loadKeypair(p: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf-8"))));
}

function explorer(sig: string): string {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}
function accountExplorer(addr: string): string {
  return `https://explorer.solana.com/address/${addr}?cluster=devnet`;
}

async function main(): Promise<void> {
  const connection  = new Connection(RPC_URL, "confirmed");
  const facilitator = loadKeypair(KEYPAIR);

  // eslint-disable-next-line no-console
  console.log(`[seed-namespaces] facilitator=${facilitator.publicKey.toBase58()}`);
  // eslint-disable-next-line no-console
  console.log(`[seed-namespaces] rpc=${RPC_URL}`);

  // Load IDL — Phase F1 finding: anchor 0.31's fetchIdl can't
  // deserialise the on-chain IDL deployed by anchor CLI 1.0+, so we
  // pass the bundled snapshot from target/idl/ explicitly.
  const provider = new AnchorProvider(connection, new Wallet(facilitator), { commitment: "confirmed" });
  let program: Program;
  try {
    program = await loadValidationRegistry(provider, VALIDATION_REGISTRY_DEVNET_ID);
  } catch (_) {
    const idlPath = path.resolve(__dirname, "..", "..", "..", "target", "idl", "validation_registry.json");
    const idl     = JSON.parse(fs.readFileSync(idlPath, "utf-8")) as Idl;
    program       = await loadValidationRegistry(provider, VALIDATION_REGISTRY_DEVNET_ID, idl);
  }

  const records: NamespaceRecord[] = [];

  for (const ns of CANONICAL) {
    const capabilityHash = computeCapabilityHash(ns.name);
    const pda = deriveCapabilityNamespacePda(VALIDATION_REGISTRY_DEVNET_ID, capabilityHash);
    const existing = await fetchCapabilityNamespace(program, capabilityHash);

    if (existing.data) {
      // eslint-disable-next-line no-console
      console.log(`[seed-namespaces] ${ns.name.padEnd(28)} already-registered  ${pda.toBase58()}`);
      records.push({
        name:           ns.name,
        description:    ns.description,
        pda:            pda.toBase58(),
        capabilityHash: Buffer.from(capabilityHash).toString("hex"),
        pdaExplorer:    accountExplorer(pda.toBase58()),
        status:         "already-registered",
      });
      continue;
    }

    const ix = await buildRegisterNamespaceIx({
      program,
      creator:       facilitator.publicKey,
      namespaceHash: capabilityHash,
      name:          ns.name,
      version:       ns.version,
      schemaUri:     ns.schemaUri,
    });
    const tx = new Transaction()
      .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }))
      .add(ix);

    const sig = await sendAndConfirmTransaction(connection, tx, [facilitator], { commitment: "confirmed" });
    // eslint-disable-next-line no-console
    console.log(`[seed-namespaces] ${ns.name.padEnd(28)} REGISTERED          ${pda.toBase58()} sig=${sig}`);

    records.push({
      name:              ns.name,
      description:       ns.description,
      pda:               pda.toBase58(),
      capabilityHash:    Buffer.from(capabilityHash).toString("hex"),
      signature:         sig,
      signatureExplorer: explorer(sig),
      pdaExplorer:       accountExplorer(pda.toBase58()),
      status:            "newly-registered",
    });
  }

  const summary = {
    network:        "solana-devnet",
    program:        VALIDATION_REGISTRY_DEVNET_ID.toBase58(),
    facilitator:    facilitator.publicKey.toBase58(),
    capturedAt:     new Date().toISOString(),
    namespaceCount: records.length,
    namespaces:     records,
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(summary, null, 2));
  // eslint-disable-next-line no-console
  console.log(`\n[seed-namespaces] wrote ${OUTPUT}`);
  // eslint-disable-next-line no-console
  console.log(`[seed-namespaces] ${records.length} canonical namespaces tracked` +
              ` (${records.filter((r) => r.status === "newly-registered").length} new this run)`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[seed-namespaces] FAILED:", err);
  process.exit(1);
});
