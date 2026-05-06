/**
 * Cross-tool helpers: pubkey parsing, BN serialization, hex conversion.
 *
 * Tools serialise PublicKey → base58 string and BN/bigint → string in
 * tool replies, since most MCP clients render JSON via `JSON.stringify`
 * which would crash on a BigInt or yield `[object Object]` on a PublicKey.
 */

import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

export const PubkeySchema = z.string().refine(
  (s) => {
    try { new PublicKey(s); return true; } catch { return false; }
  },
  { message: "must be a base58-encoded Solana public key" },
);

export function parsePubkey(s: string, field: string): PublicKey {
  try {
    return new PublicKey(s);
  } catch (err) {
    throw new Error(`${field}: ${(err as Error).message}`);
  }
}

export function bytesToHex(bytes: Uint8Array | Buffer | number[]): string {
  const b = Buffer.from(bytes as ArrayLike<number>);
  return b.toString("hex");
}

export function hexToBytes(s: string): Uint8Array {
  const clean = s.startsWith("0x") ? s.slice(2) : s;
  if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2 !== 0) {
    throw new Error(`invalid hex string: ${s}`);
  }
  return new Uint8Array(Buffer.from(clean, "hex"));
}

export const HexHashSchema = z.string().refine(
  (s) => {
    const clean = s.startsWith("0x") ? s.slice(2) : s;
    return /^[0-9a-fA-F]{64}$/.test(clean);
  },
  { message: "must be a 32-byte hex string (64 hex chars, optional 0x prefix)" },
);

/** Convert any `BN`-like or bigint into a decimal string. */
export function toDecString(v: unknown): string {
  if (v == null) return "0";
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "number") return v.toString();
  if (typeof v === "string") return v;
  // @coral-xyz/anchor BN
  if (typeof (v as { toString: (radix?: number) => string }).toString === "function") {
    return (v as { toString: (radix?: number) => string }).toString(10);
  }
  return String(v);
}

/** Convert a decoded Anchor account's potential `Pubkey` field to base58. */
export function pubkeyOrNull(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof PublicKey) return v.toBase58();
  if (typeof (v as { toBase58?: () => string }).toBase58 === "function") {
    return (v as { toBase58: () => string }).toBase58();
  }
  return null;
}
