/**
 * `agenttrust_simulate_payment` — read-only `gate_payment` simulation.
 *
 * Calls the on-chain `gate_payment` instruction in simulate mode and
 * decodes the GateDecision return value. The same call path the
 * Express service's POST /verify route uses for the actual challenge.
 */

import { BN } from "@coral-xyz/anchor";
import { z } from "zod";

import { simulateGatePayment } from "../../chain";
import { PubkeySchema, parsePubkey, bytesToHex } from "../common";
import type { Tool, ToolContext } from "../types";

const InputSchema = z.object({
  payer_agent: PubkeySchema.describe("Payer Quantu agent asset"),
  payee_agent: PubkeySchema.describe("Payee Quantu agent asset"),
  amount:      z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)])
                  .describe("Amount in mint base units (u64 as number or decimal string)"),
  mint:        PubkeySchema.describe("SPL or Token-2022 mint pubkey"),
  policy_id:   z.number().int().min(0).max(0xffffffff).describe("Policy ID to evaluate"),
  caller:      PubkeySchema.optional()
                  .describe("Signer pubkey threading the call (defaults to KEYPAIR_B58 signer if set, else throwaway)"),
});
type Input = z.infer<typeof InputSchema>;

type DecisionOutput =
  | { kind: "Allow" }
  | { kind: "Deny"; reasonCode: number; reasonName: string }
  | { kind: "RequireValidation"; capabilityHashHex: string };

export const simulatePaymentTool: Tool<Input, DecisionOutput> = {
  name:        "agenttrust_simulate_payment",
  description:
    "Simulate a payer→payee payment against the PolicyVault. Returns the " +
    "decoded GateDecision: Allow, Deny with stable reasonCode 1..15, or " +
    "RequireValidation with the 32-byte capability hash. No tx is submitted.",
  inputSchema: InputSchema,

  async handler(input: Input, ctx: ToolContext): Promise<DecisionOutput> {
    const policyVault = await ctx.chain.policyVault();
    const callerPubkey = input.caller
      ? parsePubkey(input.caller, "caller")
      : (ctx.chain.signerPubkey() ?? policyVault.provider.publicKey ?? parsePubkey(input.payer_agent, "payer_agent"));

    const decision = await simulateGatePayment({
      policyVault,
      programIds:      ctx.chain.cfg.programs,
      caller:          callerPubkey,
      payerAgentAsset: parsePubkey(input.payer_agent, "payer_agent"),
      payeeAgentAsset: parsePubkey(input.payee_agent, "payee_agent"),
      amount:          new BN(input.amount.toString()),
      mint:            parsePubkey(input.mint, "mint"),
      policyId:        input.policy_id,
    });

    if (decision.kind === "Allow") return { kind: "Allow" };
    if (decision.kind === "Deny") {
      return { kind: "Deny", reasonCode: decision.reasonCode, reasonName: decision.reasonName };
    }
    return { kind: "RequireValidation", capabilityHashHex: bytesToHex(decision.capabilityHash) };
  },
};
