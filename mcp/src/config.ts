/**
 * Env parsing for the AgentTrust MCP server.
 *
 * Read tools work without any env. Write tools require `KEYPAIR_B58`.
 * The HTTP transport requires `MCP_HTTP_PORT` (else stdio is the default).
 *
 * Defaults are biased toward the local-developer / Claude Desktop case:
 * devnet RPC, devnet program IDs, no signer required.
 */

import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

import {
  DEFAULT_DEVNET_PROGRAM_IDS,
  DEFAULT_DEVNET_QUANTU_IDS,
  MAINNET_QUANTU_IDS,
  ProgramIds,
  QuantuProgramIds,
  VALIDATION_REGISTRY_DEVNET_ID,
} from "@agenttrust-sdk/trustgate";

export type Network = "solana-devnet" | "solana-mainnet";

export interface AgentTrustConfig {
  readonly network:                Network;
  readonly rpcUrl:                 string;
  readonly explorerCluster:        "devnet" | "mainnet";
  /** All three AgentTrust program IDs. SDK 0.2.0 made this object the
   *  single source of truth — `validationRegistry` is now part of the
   *  shape rather than a sibling field on AgentTrustConfig. */
  readonly programs:               ProgramIds;
  readonly quantu:                 QuantuProgramIds;
  /** Optional signer keypair. Loaded from KEYPAIR_B58. Write tools require this. */
  readonly signer?:                Keypair;
  /** Transport selection. */
  readonly transport:              "stdio" | "http";
  /** HTTP transport port (only used when transport === "http"). */
  readonly httpPort:               number;
  /** Optional default facilitator name to surface in tool replies. */
  readonly defaultFacilitator?:    string;
}

const DEVNET_RPC  = "https://api.devnet.solana.com";
const MAINNET_RPC = "https://api.mainnet-beta.solana.com";

function readNetwork(): Network {
  const raw = (process.env.NETWORK ?? "solana-devnet").trim().toLowerCase();
  if (raw === "solana-mainnet" || raw === "mainnet" || raw === "mainnet-beta") {
    return "solana-mainnet";
  }
  return "solana-devnet";
}

function readSigner(): Keypair | undefined {
  const raw = process.env.KEYPAIR_B58?.trim();
  if (!raw) return undefined;
  try {
    const bytes = bs58.decode(raw);
    return Keypair.fromSecretKey(bytes);
  } catch (err) {
    throw new Error(
      `KEYPAIR_B58 is set but failed to decode: ${(err as Error).message}. ` +
      `Expected base58-encoded 64-byte secret key.`,
    );
  }
}

function readTransport(): { transport: "stdio" | "http"; httpPort: number } {
  const raw = (process.env.MCP_TRANSPORT ?? "stdio").trim().toLowerCase();
  const port = Number.parseInt(process.env.MCP_HTTP_PORT ?? "8765", 10);
  if (raw === "http" || raw === "sse") return { transport: "http", httpPort: port };
  return { transport: "stdio", httpPort: port };
}

export function loadConfig(): AgentTrustConfig {
  const network = readNetwork();
  const rpcUrl  = (process.env.RPC_URL ?? (network === "solana-mainnet" ? MAINNET_RPC : DEVNET_RPC)).trim();
  const { transport, httpPort } = readTransport();

  // Devnet ships fully-deployed AgentTrust + Quantu. Mainnet ships
  // Quantu only (per CLAUDE.md). When mainnet is selected the AgentTrust
  // program IDs default to devnet placeholders — overridable via env once
  // mainnet deployment lands.
  const programs: ProgramIds = {
    policyVault:        parsePubkeyEnv("POLICY_VAULT_PROGRAM_ID",         DEFAULT_DEVNET_PROGRAM_IDS.policyVault),
    trustGate:          parsePubkeyEnv("TRUSTGATE_PROGRAM_ID",            DEFAULT_DEVNET_PROGRAM_IDS.trustGate),
    validationRegistry: parsePubkeyEnv("VALIDATION_REGISTRY_PROGRAM_ID",  VALIDATION_REGISTRY_DEVNET_ID),
  };
  const quantu: QuantuProgramIds = network === "solana-mainnet"
    ? MAINNET_QUANTU_IDS
    : DEFAULT_DEVNET_QUANTU_IDS;

  return {
    network,
    rpcUrl,
    explorerCluster:      network === "solana-mainnet" ? "mainnet" : "devnet",
    programs,
    quantu,
    signer:               readSigner(),
    transport,
    httpPort,
    defaultFacilitator:   process.env.MCP_DEFAULT_FACILITATOR?.trim() || undefined,
  };
}

function parsePubkeyEnv(name: string, fallback: PublicKey): PublicKey {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  try {
    return new PublicKey(raw);
  } catch (err) {
    throw new Error(`${name} is not a valid base58 pubkey: ${(err as Error).message}`);
  }
}

/**
 * Build a Solana Explorer URL for a tx signature or account, scoped to
 * the active cluster. Devnet uses `?cluster=devnet`, mainnet has no
 * suffix.
 */
export function explorerUrl(
  cfg: AgentTrustConfig,
  kind: "tx" | "address",
  value: string,
): string {
  const path = kind === "tx" ? `tx/${value}` : `address/${value}`;
  const suffix = cfg.explorerCluster === "devnet" ? "?cluster=devnet" : "";
  return `https://explorer.solana.com/${path}${suffix}`;
}
