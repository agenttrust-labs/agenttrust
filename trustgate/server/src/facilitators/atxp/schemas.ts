/**
 * Zod schemas for atxp_ai — JWT-bound x402 facilitator.
 *
 * atxp differs from Pay.sh / Dexter in that the payment proof is a
 * signed JWT (RS256 by default) rather than a partially-signed Solana
 * transaction. The JWT carries the same load-bearing claims AgentTrust
 * needs (payer, amount, mint, recipient, expiresAt, paymentIdHash) plus
 * an `iss` (issuer) field that must match the configured atxp signer.
 *
 * The facilitator-API request shape is the same x402 v2 envelope as
 * Pay.sh: `{ paymentRequirements, paymentPayload? }`. The Atxp adapter's
 * extra block adds `extra.atxp.jwksUri` (per-tenant JWKS endpoint hint)
 * and the proof extends `paymentPayload` with a `token` field.
 */

import { z } from "zod";

import { AmountString, PubkeyString } from "../pay-sh";

const JwksUri = z.string().url().max(256);

export const AtxpExtraSchema = z.object({
  /** JWKS endpoint URL — atxp's parseRequest fetches this to resolve
   *  the signing key. The adapter caches the JWKS per `jwksUri` for
   *  `deps.jwksTtlMs` (default 10 min). */
  jwksUri: JwksUri,
  /** Optional `kid` header for multi-key tenants. When set, the
   *  adapter selects the JWK matching this kid; when absent, the JWKS
   *  must contain exactly one signing key. */
  kid:     z.string().min(1).max(64).optional(),
}).strict();

/** AgentTrust hints — same shape as Pay.sh (B5 SERVICE-signed envelope). */
export const AtxpAgentTrustExtraSchema = z.object({
  payerAgentAsset: PubkeyString,
  payeeAgentAsset: PubkeyString,
  payeeRecipient:  PubkeyString,
  policyId:        z.number().int().min(0).max(0xFFFF_FFFF),
  expectedNetwork: z.string().optional(),
  issuedAt:        z.number().int().nonnegative(),
  serviceSignature: z.string().regex(/^[0-9a-fA-F]{128}$/),
}).strict();

export const AtxpRequirementsExtraSchema = z.object({
  feePayer:    PubkeyString.optional(),
  memo:        z.string().min(1).max(256),
  agentTrust:  AtxpAgentTrustExtraSchema,
  atxp:        AtxpExtraSchema,
}).passthrough();

export const AtxpPaymentRequirementsSchema = z.object({
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
  extra:             AtxpRequirementsExtraSchema,
}).strict();

/** Atxp's PaymentPayload carries BOTH a `transaction` field (the on-chain
 *  Solana tx the wallet signed for settlement) AND a `token` (the JWT
 *  proving the wallet's atxp identity). Solana-side AgentTrust still uses
 *  the transaction for `validateOnChainTx`; the JWT is verified at
 *  parseRequest time as a separate authenticity layer. */
export const AtxpPaymentPayloadInnerSchema = z.object({
  transaction: z.string().min(1),
  token:       z.string().min(1),
}).passthrough();

export const AtxpPaymentPayloadSchema = z.object({
  x402Version: z.number().int().optional(),
  scheme:      z.string().optional(),
  network:     z.string().optional(),
  payload:     AtxpPaymentPayloadInnerSchema,
}).passthrough();

export const AtxpFacilitatorBodySchema = z.object({
  paymentRequirements: AtxpPaymentRequirementsSchema,
  paymentPayload:      AtxpPaymentPayloadSchema.optional(),
}).strict();

export type AtxpPaymentRequirements = z.infer<typeof AtxpPaymentRequirementsSchema>;
export type AtxpPaymentPayload      = z.infer<typeof AtxpPaymentPayloadSchema>;
export type AtxpFacilitatorBody     = z.infer<typeof AtxpFacilitatorBodySchema>;
export type AtxpAgentTrustExtra     = z.infer<typeof AtxpAgentTrustExtraSchema>;
export type AtxpExtra               = z.infer<typeof AtxpExtraSchema>;
