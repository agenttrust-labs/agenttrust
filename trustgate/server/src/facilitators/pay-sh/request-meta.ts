/**
 * Internal carrier for adapter-only fields that ride in `VerifyContext.rawRequestMeta`.
 *
 * The `FacilitatorAdapter` interface keeps `rawRequestMeta: Record<string, unknown>`
 * generic so routes treat it as opaque. This module owns the typed view that
 * the Pay.sh adapter writes at parseRequest and reads back at validate /
 * settle / feedback time.
 *
 * Storing data here (instead of extending `VerifyContext`) keeps the
 * cross-adapter interface narrow.
 */

import { PublicKey } from "@solana/web3.js";

import { VerifyContext } from "../types";
import { FacilitatorBody } from "./schemas";

const META_KEY = "pay-sh";

export interface PayShRawMeta {
  /** SPL transfer destination — cross-checked against the on-chain tx. */
  readonly expectedRecipient: PublicKey;
  /** Pinned network slug ("solana-devnet" / "solana-mainnet" / "localnet"). */
  readonly network:           string;
  /** Original parsed body — kept for /settle echo + /receipt audit. */
  readonly body:              FacilitatorBody;
}

export function attachMeta(
  ctx:  Omit<VerifyContext, "rawRequestMeta">,
  meta: PayShRawMeta,
): VerifyContext {
  return {
    ...ctx,
    rawRequestMeta: Object.freeze({ [META_KEY]: meta }),
  };
}

export function readMeta(ctx: VerifyContext): PayShRawMeta | null {
  const v = (ctx.rawRequestMeta as Record<string, unknown>)[META_KEY];
  if (!v || typeof v !== "object") return null;
  return v as PayShRawMeta;
}
