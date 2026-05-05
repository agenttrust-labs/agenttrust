/**
 * Small utility helpers shared across the Pay.sh adapter modules.
 * No chain calls, no I/O — pure functions.
 */

import { createHash } from "crypto";

const HEX64_RE = /^[0-9a-fA-F]{64}$/;

/**
 * Convert an x402 `extra.memo` into the 32-byte `payment_id_hash` that seeds
 * the on-chain `FeedbackEmissionLog` PDA. Two paths:
 *
 *   - 64-char hex → decode directly (preferred — caller owns the bytes)
 *   - any other string → SHA-256 of UTF-8 bytes (deterministic fallback)
 *
 * Anything in between (e.g., a 62-char hex) falls into the SHA-256 path —
 * it is treated as opaque, not as a malformed hex.
 */
export function deriveMemoHash(memo: string): Uint8Array {
  if (HEX64_RE.test(memo)) {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(memo.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }
  return new Uint8Array(createHash("sha256").update(memo, "utf8").digest());
}

export function bytesToHex(bytes: ReadonlyArray<number> | Uint8Array): string {
  const out: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    out.push((bytes[i] as number).toString(16).padStart(2, "0"));
  }
  return out.join("");
}

export function bytesEqual(
  a: Uint8Array | undefined,
  b: Uint8Array | undefined,
): boolean {
  if (!a || !b) return a === b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Map a raw chain / RPC error message to a safe diagnostic for callers.
 * Strips RPC URLs, account addresses, and Anchor stack traces — those go to
 * the server log, never the client response.
 */
export function sanitizeDetail(raw: string): string {
  if (raw.length === 0) return "unspecified";
  const lower = raw.toLowerCase();
  if (lower.includes("blockhash"))         return "blockhash invalid or expired";
  if (lower.includes("insufficient"))      return "insufficient funds";
  if (lower.includes("simulation failed")) return "transaction simulation failed";
  if (lower.includes("not confirmed"))     return "transaction not confirmed";
  if (lower.includes("account in use"))    return "idempotency_replay";
  return "see server logs";
}

/** Case-insensitive equality on slugged network identifiers ("solana-devnet"). */
export function sameNetwork(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
