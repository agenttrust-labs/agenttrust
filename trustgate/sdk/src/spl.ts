/**
 * SPL Token + Associated Token Account helpers, implemented from the
 * canonical instruction layouts so we don't need `@solana/spl-token` (its
 * transitive deps require TS 5+ which conflicts with our 4.9 baseline).
 *
 * References:
 *   - solana-program/token: github.com/solana-program/token
 *   - SPL TransferChecked: discriminator 12, payload {amount: u64, decimals: u8}
 *   - Associated Token Program: deterministic PDA derivation
 *
 * Token-2022 callers pass the Token-2022 program id via `tokenProgram`. ATA
 * derivation uses the same Associated Token Program ID for both — the
 * tokenProgram is one of the seeds, not the deriver.
 */

import { PublicKey, TransactionInstruction } from "@solana/web3.js";

export const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

const SPL_INSTRUCTION_TRANSFER_CHECKED = 12;

export interface BuildTransferCheckedArgs {
  readonly source:       PublicKey;
  readonly mint:         PublicKey;
  readonly destination:  PublicKey;
  readonly authority:    PublicKey;
  readonly amount:       bigint;
  readonly decimals:     number;
  readonly tokenProgram: PublicKey;
}

export function buildTransferCheckedIx(
  args: BuildTransferCheckedArgs,
): TransactionInstruction {
  const data = Buffer.alloc(1 + 8 + 1);
  data.writeUInt8(SPL_INSTRUCTION_TRANSFER_CHECKED, 0);
  data.writeBigUInt64LE(args.amount, 1);
  data.writeUInt8(args.decimals, 9);
  return new TransactionInstruction({
    programId: args.tokenProgram,
    keys: [
      { pubkey: args.source,      isSigner: false, isWritable: true  },
      { pubkey: args.mint,        isSigner: false, isWritable: false },
      { pubkey: args.destination, isSigner: false, isWritable: true  },
      { pubkey: args.authority,   isSigner: true,  isWritable: false },
    ],
    data,
  });
}

/**
 * Derive the canonical Associated Token Account address.
 * Seeds: `[owner, tokenProgram, mint]`.
 */
export function deriveAssociatedTokenAddress(
  owner:        PublicKey,
  mint:         PublicKey,
  tokenProgram: PublicKey = TOKEN_PROGRAM_ID,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), tokenProgram.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
}
