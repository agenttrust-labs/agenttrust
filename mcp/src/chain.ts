/**
 * Thin façade over `@agenttrust-sdk/trustgate`. The MCP server's tools
 * call into this module — never directly into Anchor or @solana/web3.js
 * primitives — so the SDK stays the single source of truth for PDA
 * derivation, IDL loading, and gate-payment simulation.
 *
 * If a helper is missing here, add it to the SDK and re-export. Don't
 * fork chain logic.
 */

import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

import {
  GateDecision,
  ProgramIds,
  derivePolicyPda,
  deriveVelocityPda,
  deriveKillSwitchPda,
  deriveFeedbackLogPda,
  deriveTrustGateAuthorityPda,
  deriveAgentAccountPda,
  deriveAtomConfigPda,
  deriveAtomStatsPda,
  deriveAtomRegistryAuthorityPda,
  deriveRootConfigPda,
  deriveRegistryConfigPda,
  deriveQuantuFeedbackAccounts,
  deriveQuantuRegisterAccounts,
  MPL_CORE_PROGRAM_ID,
  BASE_COLLECTION_DEVNET,
  loadPolicyVault,
  loadTrustGate,
  loadValidationRegistry,
  simulateGatePayment,
  fetchValidationAttestation,
  fetchValidationRequest,
  fetchAttestorProfile,
  fetchCapabilityNamespace,
  computeCapabilityHash,
  computeNamespaceHash,
  deriveAttestorProfilePda,
  deriveCapabilityNamespacePda,
  deriveValidationAttestationPda,
  deriveValidationRequestPda,
  buildRegisterAttestorIx,
  buildRegisterNamespaceIx,
  buildRegisterAgentViaCpiIx,
  buildRequestValidationIx,
  buildRespondToValidationIx,
  buildRevokeValidationIx,
  QuantuProgramIds,
} from "@agenttrust-sdk/trustgate";

import { AgentTrustConfig, isMainnetUndeployedSentinel } from "./config";

// ---------------------------------------------------------------------------
// Re-exports — every SDK helper the tools/* files need flows through here.
// ---------------------------------------------------------------------------

export {
  // PDA derivers
  derivePolicyPda,
  deriveVelocityPda,
  deriveKillSwitchPda,
  deriveFeedbackLogPda,
  deriveTrustGateAuthorityPda,
  deriveAgentAccountPda,
  deriveAtomConfigPda,
  deriveAtomStatsPda,
  deriveAtomRegistryAuthorityPda,
  deriveRootConfigPda,
  deriveRegistryConfigPda,
  deriveQuantuFeedbackAccounts,
  deriveQuantuRegisterAccounts,
  deriveAttestorProfilePda,
  deriveCapabilityNamespacePda,
  deriveValidationAttestationPda,
  deriveValidationRequestPda,

  // Quantu constants
  MPL_CORE_PROGRAM_ID,
  BASE_COLLECTION_DEVNET,

  // Capability hash helpers
  computeCapabilityHash,
  computeNamespaceHash,

  // ValidationRegistry fetchers
  fetchValidationAttestation,
  fetchValidationRequest,
  fetchAttestorProfile,
  fetchCapabilityNamespace,

  // ValidationRegistry instruction builders
  buildRegisterAttestorIx,
  buildRegisterNamespaceIx,
  buildRequestValidationIx,
  buildRespondToValidationIx,
  buildRevokeValidationIx,

  // TrustGate instruction builders
  buildRegisterAgentViaCpiIx,

  // gate_payment simulation
  simulateGatePayment,

  // Types
  GateDecision,
  ProgramIds,
  QuantuProgramIds,
};

// ---------------------------------------------------------------------------
// Provider construction
// ---------------------------------------------------------------------------

/**
 * Build an Anchor provider tied to `cfg.rpcUrl`. If a signer is configured
 * the provider's wallet is the real signer; otherwise a throwaway keypair
 * is used (sufficient for read-only simulation + RPC reads).
 */
export function makeProvider(cfg: AgentTrustConfig): AnchorProvider {
  const conn   = new Connection(cfg.rpcUrl, "confirmed");
  const wallet = new Wallet(cfg.signer ?? Keypair.generate());
  return new AnchorProvider(conn, wallet, { commitment: "confirmed" });
}

/**
 * Lazily-instantiated program clients. `loadPolicyVault` etc. each fetch
 * the IDL on first call; subsequent calls reuse the cached `Program`.
 */
export class ChainClient {
  readonly cfg:      AgentTrustConfig;
  readonly provider: AnchorProvider;

  private _policyVault?:        Program;
  private _trustgate?:          Program;
  private _validationRegistry?: Program;

  constructor(cfg: AgentTrustConfig) {
    this.cfg      = cfg;
    this.provider = makeProvider(cfg);
  }

  get connection(): Connection {
    return this.provider.connection;
  }

  /** Public key of the configured signer, or null if no signer is set. */
  signerPubkey(): PublicKey | null {
    return this.cfg.signer ? this.cfg.signer.publicKey : null;
  }

  requireSigner(): Keypair {
    if (!this.cfg.signer) {
      throw new Error(
        "This tool requires a signer. Set one of: KEYPAIR_B58 (base58 of a " +
        "64-byte secret key), KEYPAIR_PATH (absolute path to a Solana CLI " +
        "keypair JSON), or run `solana-keygen new` so ~/.config/solana/id.json " +
        "exists. Then restart the MCP server.",
      );
    }
    return this.cfg.signer;
  }

  async policyVault(): Promise<Program> {
    guardATProgramId("policy_vault", "POLICY_VAULT_PROGRAM_ID", this.cfg.programs.policyVault);
    if (!this._policyVault) {
      this._policyVault = await loadPolicyVault(
        this.provider, this.cfg.programs.policyVault, BUNDLED_IDLS.policyVault,
      );
    }
    return this._policyVault;
  }

  async trustgate(): Promise<Program> {
    guardATProgramId("trustgate", "TRUSTGATE_PROGRAM_ID", this.cfg.programs.trustGate);
    if (!this._trustgate) {
      this._trustgate = await loadTrustGate(
        this.provider, this.cfg.programs.trustGate, BUNDLED_IDLS.trustgate,
      );
    }
    return this._trustgate;
  }

  async validationRegistry(): Promise<Program> {
    guardATProgramId(
      "validation_registry", "VALIDATION_REGISTRY_PROGRAM_ID", this.cfg.programs.validationRegistry,
    );
    if (!this._validationRegistry) {
      this._validationRegistry = await loadValidationRegistry(
        this.provider, this.cfg.programs.validationRegistry, BUNDLED_IDLS.validationRegistry,
      );
    }
    return this._validationRegistry;
  }
}

/**
 * If `pubkey` is the mainnet-undeployed sentinel (System Program), throw
 * a structured `config_error` so the MCP `tools/call` envelope surfaces
 * a clean remediation instead of an opaque "account does not exist"
 * Anchor failure that the classifier might miscategorise.
 *
 * The thrown `Error` carries `name = "ConfigError"` so
 * `errors.ts:classifyError` can route it to `errorCode: "config_error"`
 * without ad-hoc string matching.
 */
function guardATProgramId(programLabel: string, envVar: string, pubkey: PublicKey): void {
  if (!isMainnetUndeployedSentinel(pubkey)) return;
  const err = new Error(
    `AgentTrust ${programLabel} program is not deployed on mainnet yet. ` +
    `Set ${envVar} to an explicit base58 program ID, or use NETWORK=solana-devnet ` +
    `where AgentTrust programs are already deployed. Quantu reads ` +
    `(get_quantu_reputation, agent_account lookups) are unaffected and work on ` +
    `mainnet without any AgentTrust program ID override.`,
  );
  err.name = "ConfigError";
  throw err;
}

// ---------------------------------------------------------------------------
// Bundled IDLs — defensive fallback. All three IDLs ARE published on
// devnet (verified via `anchor idl fetch <programId> --provider.cluster
// devnet`; see docs/proofs/idl-on-chain.json for the latest evidence
// snapshot), but bundling them statically:
//   • saves an RPC round-trip on every cold start
//   • keeps the MCP server bootable in offline / air-gapped harnesses
//   • survives the rare window after a fresh redeploy when `anchor idl
//     upgrade` hasn't yet been run
// The JSON files are committed under src/idl/ as snapshots of target/idl
// at the time of the latest deploy. The build step copies them into
// dist/idl/ so the runtime require() resolves post-install.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const policyVaultIdl = require("./idl/policy_vault.json");
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const trustgateIdl = require("./idl/trustgate.json");
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const validationRegistryIdl = require("./idl/validation_registry.json");

const BUNDLED_IDLS = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  policyVault:        policyVaultIdl as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trustgate:          trustgateIdl as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validationRegistry: validationRegistryIdl as any,
};

// ---------------------------------------------------------------------------
// Re-export AnchorProvider/BN for tool implementations.
// ---------------------------------------------------------------------------
export { AnchorProvider, BN, Program, anchor };
