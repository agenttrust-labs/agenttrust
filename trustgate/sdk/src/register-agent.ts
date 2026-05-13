/**
 * `register_agent_via_cpi` instruction builder.
 *
 * TrustGate exposes Quantu's two-step onboarding pair (`register_with_options`
 * + `initialize_stats`) as a single PDA-signed CPI chain so the MCP / SDK
 * never has to learn Quantu's surface. This module is the off-chain wiring
 * that constructs the outer TrustGate instruction.
 *
 * Mirrors the shape of `buildRegisterAttestorIx` in `validation-registry.ts`:
 * takes a provider + typed args, returns a `TransactionInstruction` the
 * caller can compose into any Transaction (including the same atomic
 * transaction as `init_policy`).
 *
 * On-chain reference:
 *   programs/trustgate/src/instructions/register_agent_via_cpi.rs
 *
 * Account ordering for the 8 `remaining_accounts` is documented at lines
 * 35-44 of that file and re-derived here via `deriveQuantuRegisterAccounts`.
 */

import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";

import { deriveTrustGateAuthorityPda, loadTrustGate } from "./chain";
import {
  QuantuProgramIds,
  deriveQuantuRegisterAccounts,
} from "./quantu";

export interface BuildRegisterAgentViaCpiArgs {
  readonly provider:       AnchorProvider;
  readonly trustgateId:    PublicKey;
  readonly quantuPrograms: QuantuProgramIds;
  readonly baseCollection: PublicKey;
  readonly payer:          PublicKey;
  readonly asset:          PublicKey;
  readonly metadataUri:    string;
  /** Optional pre-loaded Program instance to avoid the IDL refetch. */
  readonly trustgate?:     Program;
  /** Optional bundled IDL to pass to loadTrustGate if `trustgate` not provided. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly idl?:           any;
}

export async function buildRegisterAgentViaCpiIx(
  args: BuildRegisterAgentViaCpiArgs,
): Promise<TransactionInstruction> {
  const program = args.trustgate
    ?? await loadTrustGate(args.provider, args.trustgateId, args.idl);

  const authority = deriveTrustGateAuthorityPda(args.trustgateId, args.payer);
  const remaining = deriveQuantuRegisterAccounts({
    programs:       args.quantuPrograms,
    asset:          args.asset,
    baseCollection: args.baseCollection,
  });

  // asset_seed is the 32-byte representation of the asset pubkey. The
  // on-chain handler asserts `asset.key().to_bytes() == asset_seed` so the
  // MCP can decode the AgentRegisteredViaCpi event without re-walking the
  // accounts.
  const assetSeedBytes = Array.from(args.asset.toBytes());

  return await program.methods
    .registerAgentViaCpi(assetSeedBytes, args.metadataUri)
    .accounts({
      payer:         args.payer,
      asset:         args.asset,
      authority,
      systemProgram: SystemProgram.programId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    .remainingAccounts([
      // Flags match programs/trustgate/src/instructions/register_agent_via_cpi.rs:35-44.
      // None of the 8 are signers — the outer asset/payer Anchor accounts
      // already carry the signer flag. Mut flags: [2] agent_account,
      // [3] base_collection, [6] atom_stats.
      { pubkey: remaining.rootConfig,        isWritable: false, isSigner: false },
      { pubkey: remaining.registryConfig,    isWritable: false, isSigner: false },
      { pubkey: remaining.agentAccount,      isWritable: true,  isSigner: false },
      { pubkey: remaining.baseCollection,    isWritable: true,  isSigner: false },
      { pubkey: remaining.mplCoreProgram,    isWritable: false, isSigner: false },
      { pubkey: remaining.atomConfig,        isWritable: false, isSigner: false },
      { pubkey: remaining.atomStats,         isWritable: true,  isSigner: false },
      { pubkey: remaining.atomEngineProgram, isWritable: false, isSigner: false },
      // The on-chain handler invokes agent_registry_8004 via invoke_signed.
      // Solana's runtime needs the target program's AccountInfo present in
      // the tx's account list to resolve that CPI. The on-chain
      // `unpack_cpi_accounts` uses `>= 8` so this 9th slot sits unread by
      // the handler but available for the loader. Mirrors the same trailing
      // append in `makeEmitFeedbackCpi` (src/emit-feedback.ts).
      { pubkey: args.quantuPrograms.agentRegistry, isWritable: false, isSigner: false },
    ])
    .instruction();
}
