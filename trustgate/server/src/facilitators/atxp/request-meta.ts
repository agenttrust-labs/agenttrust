/**
 * Internal carrier for atxp-only fields that ride in
 * `VerifyContext.rawRequestMeta`.
 */

import { PublicKey } from "@solana/web3.js";

import { VerifyContext } from "../types";
import { AtxpFacilitatorBody } from "./schemas";

const META_KEY = "atxp";

export interface AtxpRawMeta {
  readonly expectedRecipient: PublicKey;
  readonly network:           string;
  readonly jwksUri:           string;
  readonly kid?:              string;
  readonly verifiedJwtIss:    string; // iss claim of the JWT, post-verify
  readonly body:              AtxpFacilitatorBody;
}

export function attachMeta(
  ctx:  Omit<VerifyContext, "rawRequestMeta">,
  meta: AtxpRawMeta,
): VerifyContext {
  return {
    ...ctx,
    rawRequestMeta: Object.freeze({ [META_KEY]: meta }),
  };
}

export function readMeta(ctx: VerifyContext): AtxpRawMeta | null {
  const v = (ctx.rawRequestMeta as Record<string, unknown>)[META_KEY];
  if (!v || typeof v !== "object") return null;
  return v as AtxpRawMeta;
}
