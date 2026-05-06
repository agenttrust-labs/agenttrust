import { PublicKey } from "@solana/web3.js";

import { VerifyContext } from "../types";
import { McPayFacilitatorBody } from "./schemas";

const META_KEY = "mcpay";

export interface McPayRawMeta {
  readonly expectedRecipient: PublicKey;
  readonly network:           string;
  readonly mcpayChain:        "solana-devnet" | "solana-mainnet";
  readonly mcpayProtocol:     "x402" | "mpp";
  readonly body:              McPayFacilitatorBody;
}

export function attachMeta(
  ctx:  Omit<VerifyContext, "rawRequestMeta">,
  meta: McPayRawMeta,
): VerifyContext {
  return {
    ...ctx,
    rawRequestMeta: Object.freeze({ [META_KEY]: meta }),
  };
}

export function readMeta(ctx: VerifyContext): McPayRawMeta | null {
  const v = (ctx.rawRequestMeta as Record<string, unknown>)[META_KEY];
  if (!v || typeof v !== "object") return null;
  return v as McPayRawMeta;
}
