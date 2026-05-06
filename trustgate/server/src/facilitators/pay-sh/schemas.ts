/**
 * Zod schemas for the Pay.sh / x402-facilitator wire format.
 *
 * Strict-mode at every layer — unknown fields fail loud rather than ride
 * through silently. AgentTrust catches schema drift early instead of letting
 * a typo (`payTos` instead of `payTo`) collapse into a malformed gate input.
 *
 * Reference: `docs/plan/research/05-trustgate-x402-class.md` §A.4–A.5 +
 * coinbase/x402 specs/schemes/exact/scheme_exact_svm.md.
 */

import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

export const PubkeyString = z.string().refine(
  (v) => {
    try { new PublicKey(v); return true; } catch { return false; }
  },
  { message: "must be a base58 Solana pubkey" },
);

/** Atomic-units amount: positive integer string with no leading zeros. */
export const AmountString = z.string().regex(
  /^(0|[1-9][0-9]*)$/,
  "amount must be a non-negative integer string with no leading zeros",
);

/** AgentTrust-specific extras the SERVICE attaches when emitting the 402.
 *
 *  - `payerAgentAsset` / `payeeAgentAsset`: Quantu agent_account PDAs that
 *    `gate_payment` reads to look up tier / spending state.
 *  - `payeeRecipient`: the SPL-transfer destination (an ATA, or a wallet
 *    pubkey if the SERVICE delegates ATA derivation to the client). This is
 *    cross-checked against the on-chain tx's actual recipient at proof time
 *    to defeat self-pay attacks.
 *  - `policyId`: u32 PolicyVault seed.
 *  - `expectedNetwork`: optional override of `paymentRequirements.network` —
 *    rare; only set when the SERVICE wants stricter network gating.
 *  - `issuedAt`: unix ms timestamp at challenge emission (B5).
 *  - `serviceSignature`: 64-byte hex ed25519 signature of the canonical
 *    challenge envelope (B5). Verified at parseRequest against the
 *    facilitator pubkey; binds the requirements to the SERVICE that
 *    issued them, defeating fabricated-requirements race attacks.
 */
export const AgentTrustExtraSchema = z.object({
  payerAgentAsset: PubkeyString,
  payeeAgentAsset: PubkeyString,
  payeeRecipient:  PubkeyString,
  policyId:        z.number().int().min(0).max(0xFFFF_FFFF),
  expectedNetwork: z.string().optional(),
  issuedAt:        z.number().int().nonnegative(),
  serviceSignature: z.string().regex(
    /^[0-9a-fA-F]{128}$/,
    "serviceSignature must be a 64-byte ed25519 sig as 128-char hex",
  ),
}).strict();

/** `extra` block of x402 PaymentRequirements. Strict on AgentTrust fields,
 * passthrough on framework-specific fields like `feePayer` so the adapter
 * doesn't need to track every x402 extension.
 *
 * `memo` is REQUIRED — it carries the 32-byte payment_id that seeds the
 * `FeedbackEmissionLog` PDA. Without it the on-chain log would key on the
 * all-zeros bucket (single-settlement-ever footgun) AND adapter-level
 * replay defense would be silently bypassed. AgentTrust-aware SERVICEs
 * must include it; Pay.sh-naive ones are rejected at parseRequest. */
export const PaymentRequirementsExtraSchema = z.object({
  feePayer:    PubkeyString.optional(),
  memo:        z.string().min(1).max(256),
  agentTrust:  AgentTrustExtraSchema,
}).passthrough();

export const PaymentRequirementsSchema = z.object({
  scheme:            z.string(),
  network:           z.string(),
  maxAmountRequired: AmountString.optional(),
  amount:            AmountString.optional(),
  asset:             PubkeyString,
  payTo:             PubkeyString,
  resource:          z.string().optional(),
  description:       z.string().optional(),
  mimeType:          z.string().optional(),
  maxTimeoutSeconds: z.number().int().positive().max(86_400).optional(),
  extra:             PaymentRequirementsExtraSchema,
}).strict();

export const PaymentPayloadInnerSchema = z.object({
  transaction: z.string().min(1),
}).passthrough();

export const PaymentPayloadSchema = z.object({
  x402Version: z.number().int().optional(),
  scheme:      z.string().optional(),
  network:     z.string().optional(),
  payload:     PaymentPayloadInnerSchema,
}).passthrough();

/** Full `POST /verify` and `POST /settle` body shape. */
export const FacilitatorBodySchema = z.object({
  paymentRequirements: PaymentRequirementsSchema,
  paymentPayload:      PaymentPayloadSchema.optional(),
}).strict();

export type PaymentRequirements = z.infer<typeof PaymentRequirementsSchema>;
export type PaymentPayload      = z.infer<typeof PaymentPayloadSchema>;
export type FacilitatorBody     = z.infer<typeof FacilitatorBodySchema>;
export type AgentTrustExtra     = z.infer<typeof AgentTrustExtraSchema>;
