/**
 * Zod schemas for MCPay — multi-chain x402 + MPP facilitator.
 *
 * MCPay supports both Solana and EVM rails. AgentTrust v1 only gates
 * Solana payments; the adapter rejects non-Solana chains at parseRequest
 * via the strict `mcpayChain` literal union. When extending v1.1 to
 * cover EVM chains, the validateOnChainTx + emit_feedback factories
 * need EVM equivalents — for v1 those code paths simply return null.
 *
 * Wire format mirrors x402 v2 with an `extra.mcpay` block carrying the
 * chain identifier + protocol selector (x402 vs mpp inside MCPay's own
 * dispatcher).
 */

import { z } from "zod";

import { AmountString, PubkeyString } from "../pay-sh";

const McPayChain = z.enum(["solana-devnet", "solana-mainnet"]);
const McPayProtocol = z.enum(["x402", "mpp"]);

export const McPayExtraSchema = z.object({
  /** Chain identifier — gated to Solana flavours for v1. */
  mcpayChain:    McPayChain,
  /** Inner protocol — MCPay dispatches between x402 and MPP. AgentTrust
   *  treats both identically (both end in an SPL transferChecked we
   *  validate via the standard on-chain parser). */
  mcpayProtocol: McPayProtocol,
}).strict();

export const McPayAgentTrustExtraSchema = z.object({
  payerAgentAsset: PubkeyString,
  payeeAgentAsset: PubkeyString,
  payeeRecipient:  PubkeyString,
  policyId:        z.number().int().min(0).max(0xFFFF_FFFF),
  expectedNetwork: z.string().optional(),
  issuedAt:        z.number().int().nonnegative(),
  serviceSignature: z.string().regex(/^[0-9a-fA-F]{128}$/),
}).strict();

export const McPayRequirementsExtraSchema = z.object({
  feePayer:    PubkeyString.optional(),
  memo:        z.string().min(1).max(256),
  agentTrust:  McPayAgentTrustExtraSchema,
  mcpay:       McPayExtraSchema,
}).passthrough();

export const McPayPaymentRequirementsSchema = z.object({
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
  extra:             McPayRequirementsExtraSchema,
}).strict();

export const McPayPaymentPayloadInnerSchema = z.object({
  transaction: z.string().min(1),
}).passthrough();

export const McPayPaymentPayloadSchema = z.object({
  x402Version: z.number().int().optional(),
  scheme:      z.string().optional(),
  network:     z.string().optional(),
  payload:     McPayPaymentPayloadInnerSchema,
}).passthrough();

export const McPayFacilitatorBodySchema = z.object({
  paymentRequirements: McPayPaymentRequirementsSchema,
  paymentPayload:      McPayPaymentPayloadSchema.optional(),
}).strict();

export type McPayPaymentRequirements = z.infer<typeof McPayPaymentRequirementsSchema>;
export type McPayPaymentPayload      = z.infer<typeof McPayPaymentPayloadSchema>;
export type McPayFacilitatorBody     = z.infer<typeof McPayFacilitatorBodySchema>;
export type McPayAgentTrustExtra     = z.infer<typeof McPayAgentTrustExtraSchema>;
export type McPayExtra               = z.infer<typeof McPayExtraSchema>;
