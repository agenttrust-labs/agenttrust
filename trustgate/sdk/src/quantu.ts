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

const AGENT_PREFIX        = Buffer.from("agent");
const ATOM_CONFIG_PREFIX  = Buffer.from("atom_config");
const ATOM_STATS_PREFIX   = Buffer.from("atom_stats");
const ATOM_CPI_AUTHORITY  = Buffer.from("atom_cpi_authority");

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
