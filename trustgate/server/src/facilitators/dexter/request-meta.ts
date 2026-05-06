/**
 * Internal carrier for Dexter-only fields that ride in
 * `VerifyContext.rawRequestMeta`.
 */

import { PublicKey } from "@solana/web3.js";

import { VerifyContext } from "../types";
import { DexterFacilitatorBody } from "./schemas";

const META_KEY = "dexter";

export interface DexterRawMeta {
  readonly expectedRecipient:   PublicKey;
  readonly network:             string;
  readonly dexterPolicyVersion: number;
  readonly settlementRoute?:    string;
  readonly body:                DexterFacilitatorBody;
}

export function attachMeta(
  ctx:  Omit<VerifyContext, "rawRequestMeta">,
  meta: DexterRawMeta,
): VerifyContext {
  return {
    ...ctx,
    rawRequestMeta: Object.freeze({ [META_KEY]: meta }),
  };
}

export function readMeta(ctx: VerifyContext): DexterRawMeta | null {
  const v = (ctx.rawRequestMeta as Record<string, unknown>)[META_KEY];
  if (!v || typeof v !== "object") return null;
  return v as DexterRawMeta;
}
