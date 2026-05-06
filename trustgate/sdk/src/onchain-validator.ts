/**
 * `validateOnChainTx` production implementation.
 *
 * Pure parser + RPC-confirmed-status check. Decodes a base64-encoded
 * `VersionedTransaction`, locates the SPL `transferChecked` instruction,
 * extracts {amount, decimals, mint, destination, authority}, and confirms
 * the tx is on chain via `connection.getSignatureStatus`.
 *
 * Returns the same `OnChainTxValidation` shape both adapters
 * (Pay.sh + Dexter) consume from their `deps.validateOnChainTx`.
 *
 * Pure-function design: every failure mode returns a structured
 * `OnChainTxValidation` with `confirmed: false` + `errorReason` +
 * `errorDetail`. Never throws on bad input — adapters expect the
 * function to never throw on malformed payloads (only on RPC outage,
 * which `try/catch` translates).
 *
 * SPL transfer reference:
 *   - https://github.com/solana-program/token
 *   - TransferChecked discriminator: 12
 *   - Layout: u8 disc | u64 amount LE | u8 decimals
 *   - Accounts: [source, mint, destination, authority]
 */

import { Connection, MessageCompiledInstruction, PublicKey, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";

import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "./spl";

const SPL_TRANSFER_CHECKED_DISCRIMINATOR = 12;

export type OnChainTxRejection =
  | "malformed_payload"
  | "invalid_signature"
  | "expired_payment"
  | "unsupported_scheme"
  | "settlement_failed"
  | "insufficient_funds"
  | "mismatched_payment_context";

export interface OnChainTxValidation {
  readonly confirmed:         boolean;
  readonly payer?:             PublicKey;
  readonly signature?:         string;     // base58
  readonly slot?:              number;
  readonly transferredAmount?: bigint;
  readonly transferredMint?:   PublicKey;
  readonly transferRecipient?: PublicKey;
  readonly errorReason?:       OnChainTxRejection;
  readonly errorDetail?:       string;
}

export interface MakeValidateOnChainTxOptions {
  readonly connection: Connection;
  /** Optional override of the SPL token program id — defaults to legacy
   *  Tokenkeg…; pass Token-2022 program id when validating a 2022 mint. */
  readonly acceptTokenPrograms?: ReadonlyArray<PublicKey>;
}

export type ValidateOnChainTxFn = (txBase64: string) => Promise<OnChainTxValidation>;

/**
 * Build a `validateOnChainTx` function bound to a specific `Connection`
 * and the set of acceptable SPL token program ids.
 */
export function makeValidateOnChainTx(opts: MakeValidateOnChainTxOptions): ValidateOnChainTxFn {
  const tokenPrograms = opts.acceptTokenPrograms ?? [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID];
  const conn = opts.connection;

  return async (txBase64: string): Promise<OnChainTxValidation> => {
    const decoded = decodeBase64(txBase64);
    if (!decoded.ok) return decoded.rejection;

    const tx = decodeTx(decoded.bytes);
    if (!tx.ok) return tx.rejection;

    const sig = extractSignature(tx.tx);
    if (!sig.ok) return sig.rejection;

    const transfer = locateTransferChecked(tx.tx, tokenPrograms);
    if (!transfer.ok) return transfer.rejection;

    let confirmation: { ok: true; slot: number } | { ok: false; rejection: OnChainTxValidation };
    try {
      confirmation = await confirmSignature(conn, sig.signature);
    } catch (e) {
      return {
        confirmed:  false,
        signature:  sig.signature,
        payer:      transfer.payer,
        transferredAmount: transfer.amount,
        transferredMint:   transfer.mint,
        transferRecipient: transfer.destination,
        errorReason: "settlement_failed",
        errorDetail: e instanceof Error ? e.message : "RPC threw",
      };
    }

    if (!confirmation.ok) {
      return {
        ...confirmation.rejection,
        signature:  sig.signature,
        payer:      transfer.payer,
        transferredAmount: transfer.amount,
        transferredMint:   transfer.mint,
        transferRecipient: transfer.destination,
      };
    }

    return {
      confirmed:         true,
      payer:             transfer.payer,
      signature:         sig.signature,
      slot:              confirmation.slot,
      transferredAmount: transfer.amount,
      transferredMint:   transfer.mint,
      transferRecipient: transfer.destination,
    };
  };
}

// ---------------------------------------------------------------------------
// Stage helpers — pure, no I/O except confirmSignature.
// ---------------------------------------------------------------------------

interface DecodedBase64 {
  ok: true;
  bytes: Uint8Array;
}
interface RejectedValidation {
  ok: false;
  rejection: OnChainTxValidation;
}

function reject(reason: OnChainTxRejection, detail: string): RejectedValidation {
  return { ok: false, rejection: { confirmed: false, errorReason: reason, errorDetail: detail } };
}

function decodeBase64(s: string): DecodedBase64 | RejectedValidation {
  try {
    return { ok: true, bytes: Buffer.from(s, "base64") };
  } catch (e) {
    return reject("malformed_payload", e instanceof Error ? e.message : "base64 decode failed");
  }
}

function decodeTx(bytes: Uint8Array): { ok: true; tx: VersionedTransaction } | RejectedValidation {
  try {
    return { ok: true, tx: VersionedTransaction.deserialize(bytes) };
  } catch (e) {
    return reject("malformed_payload", e instanceof Error ? e.message : "tx deserialize failed");
  }
}

function extractSignature(tx: VersionedTransaction): { ok: true; signature: string } | RejectedValidation {
  const sig = tx.signatures[0];
  if (!sig || sig.length !== 64) {
    return reject("invalid_signature", "tx missing fee-payer signature");
  }
  // Treat all-zero as unsigned.
  let allZero = true;
  for (const b of sig) if (b !== 0) { allZero = false; break; }
  if (allZero) return reject("invalid_signature", "tx fee-payer signature is all zeros");
  return { ok: true, signature: bs58.encode(sig) };
}

interface TransferFields {
  ok: true;
  amount:      bigint;
  decimals:    number;
  mint:        PublicKey;
  destination: PublicKey;
  payer:       PublicKey;
}

function locateTransferChecked(
  tx: VersionedTransaction,
  tokenPrograms: ReadonlyArray<PublicKey>,
): TransferFields | RejectedValidation {
  const message = tx.message;
  const accounts = message.staticAccountKeys;
  if (accounts.length === 0) {
    return reject("malformed_payload", "tx message has no static account keys");
  }

  const tokenProgramSet = new Set(tokenPrograms.map((p) => p.toBase58()));

  for (const ix of message.compiledInstructions) {
    const programIdx = ix.programIdIndex;
    const programId = accounts[programIdx];
    if (!programId) continue;
    if (!tokenProgramSet.has(programId.toBase58())) continue;
    if (ix.data.length < 10) continue;
    if (ix.data[0] !== SPL_TRANSFER_CHECKED_DISCRIMINATOR) continue;
    return parseTransferIx(ix, accounts);
  }
  return reject("unsupported_scheme", "no SPL TransferChecked instruction in tx");
}

function parseTransferIx(
  ix: MessageCompiledInstruction,
  accounts: ReadonlyArray<PublicKey>,
): TransferFields | RejectedValidation {
  const indexes = ix.accountKeyIndexes;
  if (indexes.length < 4) {
    return reject("malformed_payload", "TransferChecked needs 4 accounts");
  }
  const data = Buffer.from(ix.data);
  let amount: bigint;
  let decimals: number;
  try {
    amount   = data.readBigUInt64LE(1);
    decimals = data.readUInt8(9);
  } catch (e) {
    return reject("malformed_payload", e instanceof Error ? e.message : "ix data parse failed");
  }
  const mint        = accounts[indexes[1]];
  const destination = accounts[indexes[2]];
  const payer       = accounts[indexes[3]];
  if (!mint || !destination || !payer) {
    return reject("malformed_payload", "TransferChecked references missing account index");
  }
  return { ok: true, amount, decimals, mint, destination, payer };
}

async function confirmSignature(
  conn: Connection,
  signature: string,
): Promise<{ ok: true; slot: number } | { ok: false; rejection: OnChainTxValidation }> {
  const status = await conn.getSignatureStatus(signature, { searchTransactionHistory: true });
  const value = status?.value;
  if (!value) {
    return { ok: false, rejection: {
      confirmed: false, errorReason: "invalid_signature", errorDetail: "tx not seen on chain",
    } };
  }
  if (value.err) {
    return { ok: false, rejection: {
      confirmed: false, errorReason: "settlement_failed",
      errorDetail: typeof value.err === "string" ? value.err : JSON.stringify(value.err),
    } };
  }
  if (value.confirmationStatus !== "confirmed" && value.confirmationStatus !== "finalized") {
    return { ok: false, rejection: {
      confirmed: false, errorReason: "invalid_signature",
      errorDetail: `tx not yet confirmed (status=${value.confirmationStatus ?? "unknown"})`,
    } };
  }
  return { ok: true, slot: value.slot ?? 0 };
}
