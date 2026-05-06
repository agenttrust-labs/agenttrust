/**
 * Zod schemas for Cascade Dexter — Cascade's x402 facilitator.
 *
 * Wire format mirrors x402 v2 (`{paymentRequirements, paymentPayload}` body
 * shape on /verify and /settle) with a Dexter-specific `extra.dexter` block
 * carrying Cascade's policy version and facilitator routing hints.
 *
 * Dexter and Pay.sh share the same x402 root schema; differentiation lives
 * in the `extra` block so future facilitators can extend without forking
 * the AgentTrust-aware fields.
 */

import { z } from "zod";

import { AmountString, PubkeyString } from "../pay-sh";

const DexterPolicyVersion = z.number().int().min(1).max(255);

/** Cascade-specific policy / settlement metadata. */
export const DexterExtraSchema = z.object({
  dexterPolicyVersion: DexterPolicyVersion,
  /** Optional Cascade settlement-route hint. Free-form string ≤64 chars. */
  settlementRoute:     z.string().max(64).optional(),
}).strict();

/** AgentTrust-specific extras the SERVICE attaches when emitting the 402.
 *  Same shape as pay-sh's AgentTrustExtraSchema — kept local rather than
 *  imported so future divergence (e.g., Dexter-specific signing domains)
 *  doesn't ripple back into pay-sh. */
export const DexterAgentTrustExtraSchema = z.object({
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

export const DexterRequirementsExtraSchema = z.object({
  feePayer:    PubkeyString.optional(),
  memo:        z.string().min(1).max(256),
  agentTrust:  DexterAgentTrustExtraSchema,
  dexter:      DexterExtraSchema,
}).passthrough();

export const DexterPaymentRequirementsSchema = z.object({
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
  extra:             DexterRequirementsExtraSchema,
}).strict();

export const DexterPaymentPayloadInnerSchema = z.object({
  transaction: z.string().min(1),
}).passthrough();

export const DexterPaymentPayloadSchema = z.object({
  x402Version: z.number().int().optional(),
  scheme:      z.string().optional(),
  network:     z.string().optional(),
  payload:     DexterPaymentPayloadInnerSchema,
}).passthrough();

export const DexterFacilitatorBodySchema = z.object({
  paymentRequirements: DexterPaymentRequirementsSchema,
  paymentPayload:      DexterPaymentPayloadSchema.optional(),
}).strict();

export type DexterPaymentRequirements = z.infer<typeof DexterPaymentRequirementsSchema>;
export type DexterPaymentPayload      = z.infer<typeof DexterPaymentPayloadSchema>;
export type DexterFacilitatorBody     = z.infer<typeof DexterFacilitatorBodySchema>;
export type DexterAgentTrustExtra     = z.infer<typeof DexterAgentTrustExtraSchema>;
export type DexterExtra               = z.infer<typeof DexterExtraSchema>;
