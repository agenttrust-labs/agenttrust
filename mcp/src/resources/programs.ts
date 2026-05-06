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
      "Anchor IDLs are fetched at runtime via Program.fetchIdl. The MCP server " +
      "does this transparently; consumers running the SDK directly use " +
      "loadPolicyVault / loadTrustGate / loadValidationRegistry.",
  };
  return {
    uri:      PROGRAMS_RESOURCE_URI,
    mimeType: "application/json",
    text:     JSON.stringify(payload, null, 2),
  };
}
