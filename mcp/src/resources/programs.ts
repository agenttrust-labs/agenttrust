/**
 * `agenttrust://devnet/programs` — JSON resource enumerating every
 * deployed program ID + the URL clients can use to fetch the IDL.
 *
 * Anchor publishes IDLs per-program-per-network; the canonical fetch
 * is `Program.fetchIdl(programId, provider)`. We surface the program
 * IDs + a deep-link to Solana Explorer's "Anchor IDL" view as the
 * easiest external pointer.
 */

import { AgentTrustConfig, explorerUrl } from "../config";
import type { ResourceContent, ResourceDescriptor } from "./docs";

export const PROGRAMS_RESOURCE_URI = "agenttrust://devnet/programs";

export function describeProgramsResource(): ResourceDescriptor {
  return {
    uri:         PROGRAMS_RESOURCE_URI,
    name:        "Deployed program IDs",
    description: "JSON manifest of AgentTrust + Quantu program IDs and Explorer URLs for the active cluster.",
    mimeType:    "application/json",
  };
}

export function readProgramsResource(cfg: AgentTrustConfig): ResourceContent {
  const payload = {
    network:                cfg.network,
    rpcUrl:                 cfg.rpcUrl,
    explorerCluster:        cfg.explorerCluster,
    programs: {
      policyVault: {
        programId:   cfg.programs.policyVault.toBase58(),
        explorerUrl: explorerUrl(cfg, "address", cfg.programs.policyVault.toBase58()),
      },
      trustgate: {
        programId:   cfg.programs.trustgate.toBase58(),
        explorerUrl: explorerUrl(cfg, "address", cfg.programs.trustgate.toBase58()),
      },
      validationRegistry: {
        programId:   cfg.validationRegistryId.toBase58(),
        explorerUrl: explorerUrl(cfg, "address", cfg.validationRegistryId.toBase58()),
      },
    },
    quantu: {
      agentRegistry: {
        programId:   cfg.quantu.agentRegistry.toBase58(),
        explorerUrl: explorerUrl(cfg, "address", cfg.quantu.agentRegistry.toBase58()),
      },
      atomEngine: {
        programId:   cfg.quantu.atomEngine.toBase58(),
        explorerUrl: explorerUrl(cfg, "address", cfg.quantu.atomEngine.toBase58()),
      },
    },
    notes:
      "All three Anchor IDLs are published on devnet (verify with " +
      "`anchor idl fetch <programId> --provider.cluster devnet`; latest " +
      "evidence in docs/proofs/idl-on-chain.json). The MCP server bundles " +
      "snapshots under mcp/src/idl/ as a defensive fallback (saves an RPC " +
      "round-trip on cold start; lets the server boot in offline harnesses). " +
      "SDK consumers can reach the IDLs the same two ways via " +
      "loadPolicyVault / loadTrustGate / loadValidationRegistry — pass an " +
      "`idl` arg to use the bundled snapshot, omit it to fetch from chain.",
  };
  return {
    uri:      PROGRAMS_RESOURCE_URI,
    mimeType: "application/json",
    text:     JSON.stringify(payload, null, 2),
  };
}
