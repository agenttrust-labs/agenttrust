/**
 * Quantu — agent-registry-8004 + atom-engine — PDA derivation + the
 * canonical bundle of accounts trustgate's emit_feedback CPI threads
 * through `remaining_accounts`.
 *
 * Default IDs match the addresses in
 * `programs/trustgate/src/constants.rs` (devnet target). Mainnet
 * deployments override via `MAINNET_QUANTU_IDS`. Anchor's local
 * validator clones the mainnet pubkeys per Anchor.toml
 * `[test.validator.clone]` — when running `anchor test`, pass
 * `MAINNET_QUANTU_IDS` so derived PDAs resolve against the cloned
 * accounts.
 *
 * Seed prefixes match the on-chain Rust constants in
 * `programs/trustgate/src/ext/agent_registry.rs`:
 *
 *   agent_account     [b"agent", asset]                  agent_registry
 *   atom_config       [b"atom_config"]                   atom_engine
 *   atom_stats        [b"atom_stats", asset]             atom_engine
 *   registry_authority [b"atom_cpi_authority"]            agent_registry
 */

import { PublicKey } from "@solana/web3.js";

export interface QuantuProgramIds {
  readonly agentRegistry: PublicKey;
  readonly atomEngine:    PublicKey;
}

/** Devnet IDs — match programs/trustgate/src/constants.rs. */
export const DEFAULT_DEVNET_QUANTU_IDS: QuantuProgramIds = {
  agentRegistry: new PublicKey("8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C"),
  atomEngine:    new PublicKey("AToMufS4QD6hEXvcvBDg9m1AHeCLpmZQsyfYa5h9MwAF"),
};

/** Mainnet IDs — per CLAUDE.md and Anchor.toml [test.validator.clone]. */
export const MAINNET_QUANTU_IDS: QuantuProgramIds = {
  agentRegistry: new PublicKey("8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ"),
  atomEngine:    new PublicKey("AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb"),
};

/** MPL Core program — Quantu's register_with_options CPIs into mpl_core::create_v1. */
export const MPL_CORE_PROGRAM_ID = new PublicKey("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d");

/** Devnet base collection — the MPL Core collection Quantu mints agent assets into. */
export const BASE_COLLECTION_DEVNET = new PublicKey("6CTyGPcn8dMwKEqgtvx2XCpkGUd7uqCVK6937RSM5bhA");

const AGENT_PREFIX           = Buffer.from("agent");
const ATOM_CONFIG_PREFIX     = Buffer.from("atom_config");
const ATOM_STATS_PREFIX      = Buffer.from("atom_stats");
const ATOM_CPI_AUTHORITY     = Buffer.from("atom_cpi_authority");
const ROOT_CONFIG_PREFIX     = Buffer.from("root_config");
const REGISTRY_CONFIG_PREFIX = Buffer.from("registry_config");

export function deriveAgentAccountPda(
  programs: QuantuProgramIds,
  asset:    PublicKey,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [AGENT_PREFIX, asset.toBuffer()],
    programs.agentRegistry,
  )[0];
}

export function deriveAtomConfigPda(programs: QuantuProgramIds): PublicKey {
  return PublicKey.findProgramAddressSync(
    [ATOM_CONFIG_PREFIX],
    programs.atomEngine,
  )[0];
}

export function deriveAtomStatsPda(
  programs: QuantuProgramIds,
  asset:    PublicKey,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [ATOM_STATS_PREFIX, asset.toBuffer()],
    programs.atomEngine,
  )[0];
}

export function deriveAtomRegistryAuthorityPda(programs: QuantuProgramIds): PublicKey {
  return PublicKey.findProgramAddressSync(
    [ATOM_CPI_AUTHORITY],
    programs.agentRegistry,
  )[0];
}

/** Quantu `RootConfig` PDA. */
export function deriveRootConfigPda(programs: QuantuProgramIds): PublicKey {
  return PublicKey.findProgramAddressSync(
    [ROOT_CONFIG_PREFIX],
    programs.agentRegistry,
  )[0];
}

/** Quantu `RegistryConfig` PDA — scoped to a specific MPL Core base_collection. */
export function deriveRegistryConfigPda(
  programs:       QuantuProgramIds,
  baseCollection: PublicKey,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [REGISTRY_CONFIG_PREFIX, baseCollection.toBuffer()],
    programs.agentRegistry,
  )[0];
}

/**
 * Bundle of Quantu accounts the emit_feedback CPI threads through
 * `remaining_accounts`, in the order documented at
 * `programs/trustgate/src/ext/agent_registry.rs` (GiveFeedback).
 *
 * ATOM fields are present iff the agent's `atom_enabled` flag is set —
 * caller gates this via the `atomEnabled` arg of `deriveQuantuFeedbackAccounts`.
 */
export interface QuantuFeedbackAccounts {
  readonly agentAccount:       PublicKey;
  readonly asset:              PublicKey;
  readonly collection:         PublicKey;
  readonly atomConfig?:        PublicKey;
  readonly atomStats?:         PublicKey;
  readonly atomEngineProgram?: PublicKey;
  readonly registryAuthority?: PublicKey;
}

export interface QuantuFeedbackAccountsArgs {
  readonly programs:    QuantuProgramIds;
  readonly asset:       PublicKey;
  readonly collection:  PublicKey;
  /** When true, populates the optional ATOM accounts (4-tuple all-or-nothing). */
  readonly atomEnabled: boolean;
}

export function deriveQuantuFeedbackAccounts(
  args: QuantuFeedbackAccountsArgs,
): QuantuFeedbackAccounts {
  const agentAccount = deriveAgentAccountPda(args.programs, args.asset);
  if (!args.atomEnabled) {
    return { agentAccount, asset: args.asset, collection: args.collection };
  }
  return {
    agentAccount,
    asset:             args.asset,
    collection:        args.collection,
    atomConfig:        deriveAtomConfigPda(args.programs),
    atomStats:         deriveAtomStatsPda(args.programs, args.asset),
    atomEngineProgram: args.programs.atomEngine,
    registryAuthority: deriveAtomRegistryAuthorityPda(args.programs),
  };
}

/**
 * The 8 accounts the on-chain `register_agent_via_cpi` instruction expects
 * via `remaining_accounts`, in the documented positional order. Caller
 * passes the result as the `.remainingAccounts([...])` arg on the Anchor
 * method builder.
 *
 * Account ordering (matches
 * `programs/trustgate/src/instructions/register_agent_via_cpi.rs:35-44`):
 *
 *   [0] root_config         — `[b"root_config"]`              (registry)
 *   [1] registry_config     — `[b"registry_config", base]`    (registry)
 *   [2] agent_account       — `[b"agent", asset]`             (registry, mut)
 *   [3] base_collection     — Quantu's MPL Core collection    (shared, mut)
 *   [4] mpl_core_program    — MPL Core executable             (registry)
 *   [5] atom_config         — `[b"atom_config"]`              (atom-engine)
 *   [6] atom_stats          — `[b"atom_stats", asset]`        (atom-engine, mut)
 *   [7] atom_engine_program — atom-engine executable          (atom-engine)
 */
export interface QuantuRegisterAccounts {
  readonly rootConfig:        PublicKey;
  readonly registryConfig:    PublicKey;
  readonly agentAccount:      PublicKey;
  readonly baseCollection:    PublicKey;
  readonly mplCoreProgram:    PublicKey;
  readonly atomConfig:        PublicKey;
  readonly atomStats:         PublicKey;
  readonly atomEngineProgram: PublicKey;
}

export function deriveQuantuRegisterAccounts(args: {
  programs:       QuantuProgramIds;
  asset:          PublicKey;
  baseCollection: PublicKey;
}): QuantuRegisterAccounts {
  return {
    rootConfig:        deriveRootConfigPda(args.programs),
    registryConfig:    deriveRegistryConfigPda(args.programs, args.baseCollection),
    agentAccount:      deriveAgentAccountPda(args.programs, args.asset),
    baseCollection:    args.baseCollection,
    mplCoreProgram:    MPL_CORE_PROGRAM_ID,
    atomConfig:        deriveAtomConfigPda(args.programs),
    atomStats:         deriveAtomStatsPda(args.programs, args.asset),
    atomEngineProgram: args.programs.atomEngine,
  };
}
