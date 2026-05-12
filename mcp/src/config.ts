/**
 * Env parsing for the AgentTrust MCP server.
 *
 * Read tools work without any env. Write tools require a signer
 * keypair, resolved through a four-step fallback chain (see `readSigner`):
 *   1. `KEYPAIR_B58`            — base58 of the 64-byte secret key
 *   2. `KEYPAIR_PATH`           — JSON-array secret-key file (Solana CLI native)
 *   3. `~/.config/solana/id.json` — Solana CLI's default keypair location
 *   4. `SOLANA_KEYPAIR_PATH`    — alt name some tooling sets
 *
 * The HTTP transport requires `MCP_HTTP_PORT` (else stdio is the default).
 *
 * Defaults are biased toward the local-developer / Claude Desktop case:
 * devnet RPC, devnet program IDs, no signer required.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

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
  /** Optional signer keypair. Resolved via the layered fallback chain
   *  documented on `readSigner`. Write tools require this. */
  readonly signer?:                Keypair;
  /** Transport selection. */
  readonly transport:              "stdio" | "http";
  /** HTTP transport port (only used when transport === "http"). */
  readonly httpPort:               number;
  /** HTTP transport bind host (only used when transport === "http").
   *  Defaults to 127.0.0.1 so a laptop developer doesn't expose the
   *  server on the LAN. Production-style deploys (Fly, Vercel) set
   *  `MCP_HTTP_HOST=0.0.0.0` explicitly. */
  readonly httpHost:               string;
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

/**
 * Decode a JSON-array secret-key file (Solana CLI's native format) into
 * a Keypair. Exported for direct testing.
 *
 * Throws with a clear, source-named error when the file is unreadable,
 * not valid JSON, not an array of numbers, or the wrong byte length.
 */
export function readKeypairFile(filePath: string): Keypair {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    throw new Error(
      `keypair file at ${filePath} is unreadable: ${(err as Error).message}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `keypair file at ${filePath} is not valid JSON: ${(err as Error).message}`,
    );
  }

  if (!Array.isArray(parsed) || !parsed.every((n) => typeof n === "number")) {
    throw new Error(
      `keypair file at ${filePath} must be a JSON array of numbers (Solana CLI format)`,
    );
  }

  const bytes = Uint8Array.from(parsed as number[]);
  if (bytes.length !== 64) {
    throw new Error(
      `keypair file at ${filePath}: expected 64-byte secret key, got ${bytes.length} bytes`,
    );
  }

  try {
    return Keypair.fromSecretKey(bytes);
  } catch (err) {
    throw new Error(
      `keypair file at ${filePath} could not be loaded as a Solana keypair: ${(err as Error).message}`,
    );
  }
}

/**
 * Layered signer detection. Tries, in order:
 *   1. `KEYPAIR_B58`           (base58 of 64-byte secret key)
 *   2. `KEYPAIR_PATH`          (JSON-array secret-key file)
 *   3. `~/.config/solana/id.json` (Solana CLI's default keypair location)
 *   4. `SOLANA_KEYPAIR_PATH`   (alt name some tooling sets)
 *
 * Explicit env vars win over the well-known default. If an env var is
 * SET but unparseable, we throw a clear error naming the source. If
 * unset, we fall through silently. If none of the four is usable we
 * return undefined — the read-only mode for no-auth read tools.
 */
function readSigner(): Keypair | undefined {
  const b58 = process.env.KEYPAIR_B58?.trim();
  if (b58) {
    let bytes: Uint8Array;
    try {
      bytes = bs58.decode(b58);
    } catch (err) {
      throw new Error(
        `KEYPAIR_B58 is set but failed to decode as base58: ${(err as Error).message}. ` +
        `Expected base58-encoded 64-byte secret key.`,
      );
    }
    if (bytes.length !== 64) {
      throw new Error(
        `KEYPAIR_B58 decoded to ${bytes.length} bytes; expected 64-byte secret key. ` +
        `A 32-byte value is the public-key half only — Solana keypair files contain both halves.`,
      );
    }
    try {
      return Keypair.fromSecretKey(bytes);
    } catch (err) {
      throw new Error(
        `KEYPAIR_B58 decoded to 64 bytes but Solana rejected it: ${(err as Error).message}`,
      );
    }
  }

  const explicitPath = process.env.KEYPAIR_PATH?.trim();
  if (explicitPath) {
    try {
      return readKeypairFile(explicitPath);
    } catch (err) {
      throw new Error(
        `KEYPAIR_PATH points at ${explicitPath} but the file is unreadable: ${(err as Error).message}`,
      );
    }
  }

  const altPath = process.env.SOLANA_KEYPAIR_PATH?.trim();
  if (altPath) {
    try {
      return readKeypairFile(altPath);
    } catch (err) {
      throw new Error(
        `SOLANA_KEYPAIR_PATH points at ${altPath} but the file is unreadable: ${(err as Error).message}`,
      );
    }
  }

  const defaultPath = path.join(os.homedir(), ".config", "solana", "id.json");
  if (fs.existsSync(defaultPath)) {
    try {
      return readKeypairFile(defaultPath);
    } catch (err) {
      throw new Error(
        `Solana CLI default keypair at ${defaultPath} is unusable: ${(err as Error).message}`,
      );
    }
  }

  return undefined;
}

function readTransport(): { transport: "stdio" | "http"; httpPort: number; httpHost: string } {
  const raw = (process.env.MCP_TRANSPORT ?? "stdio").trim().toLowerCase();
  const port = Number.parseInt(process.env.MCP_HTTP_PORT ?? "8765", 10);
  // Default bind 127.0.0.1 — a local-laptop user starting `MCP_TRANSPORT=http`
  // should NOT expose the server on the LAN by accident. Hosted deploys
  // (Fly, Vercel) explicitly set MCP_HTTP_HOST=0.0.0.0.
  const host = (process.env.MCP_HTTP_HOST ?? "127.0.0.1").trim();
  if (raw === "http" || raw === "sse") return { transport: "http", httpPort: port, httpHost: host };
  return { transport: "stdio", httpPort: port, httpHost: host };
}

export function loadConfig(): AgentTrustConfig {
  const network = readNetwork();
  const rpcUrl  = (process.env.RPC_URL ?? (network === "solana-mainnet" ? MAINNET_RPC : DEVNET_RPC)).trim();
  try {
    // eslint-disable-next-line no-new
    new URL(rpcUrl);
  } catch (err) {
    throw new Error(
      `RPC_URL is not a valid URL: ${(err as Error).message}. Got: ${rpcUrl}`,
    );
  }
  const { transport, httpPort, httpHost } = readTransport();

  // AgentTrust programs ship on devnet. Quantu ships on both devnet and
  // mainnet. When mainnet is selected the AgentTrust program IDs must be
  // overridden via env — otherwise we'd silently point at devnet pubkeys
  // on a mainnet RPC (every read returns `exists: false`, every write
  // throws cryptic Anchor errors).
  const policyVaultEnv        = process.env.POLICY_VAULT_PROGRAM_ID?.trim();
  const trustGateEnv          = process.env.TRUSTGATE_PROGRAM_ID?.trim();
  const validationRegistryEnv = process.env.VALIDATION_REGISTRY_PROGRAM_ID?.trim();
  if (network === "solana-mainnet" && !policyVaultEnv && !trustGateEnv && !validationRegistryEnv) {
    throw new Error(
      "AgentTrust programs are not yet deployed on mainnet. " +
      "Set explicit POLICY_VAULT_PROGRAM_ID, TRUSTGATE_PROGRAM_ID, and " +
      "VALIDATION_REGISTRY_PROGRAM_ID env vars, or use NETWORK=solana-devnet (default).",
    );
  }

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
    httpHost,
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
