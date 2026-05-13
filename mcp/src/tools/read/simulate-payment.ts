/**
 * `agenttrust_simulate_payment` — read-only `gate_payment` simulation.
 *
 * Calls the on-chain `gate_payment` instruction in simulate mode and
 * decodes the GateDecision return value. The same call path the
 * Express service's POST /verify route uses for the actual challenge.
 */

import { BN } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { z } from "zod";

import { simulateGatePayment } from "../../chain";
import { CounterpartyNotRegisteredError } from "../../errors";
import { PubkeySchema, parsePubkey, bytesToHex } from "../common";
import type { Tool, ToolContext } from "../types";
import { quantuAgentAccountExists } from "../utils/quantu-probe";

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
    // F-024: the SDK's simulateGatePayment threads the gate_payment ix
    // through `simulateTransaction({ replaceRecentBlockhash: true,
    // sigVerify: false })` — the RPC fills in a fresh blockhash and the
    // signature check is skipped, so the fee-payer doesn't need to be
    // funded for simulation to succeed. We pick the caller in priority
    // order:
    //   1. explicit input.caller arg (lets the user pin a known funded
    //      pubkey when they're auditing a specific deployment)
    //   2. configured KEYPAIR_B58 signer pubkey (matches their identity)
    //   3. an ephemeral throwaway pubkey — safe because sigVerify=false
    //      means the fee-payer never has to sign and is never debited.
    const callerPubkey = input.caller
      ? parsePubkey(input.caller, "caller")
      : (ctx.chain.signerPubkey() ?? Keypair.generate().publicKey);

    const payerAgentAsset = parsePubkey(input.payer_agent, "payer_agent");
    const payeeAgentAsset = parsePubkey(input.payee_agent, "payee_agent");

    // F-013-COUNTERPARTY: wrap the chain call so a downstream
    // `AccountNotInitialized` (Custom 3012) or equivalent missing-account
    // failure can be re-attributed to a specific counterparty. The probe
    // is cheap (single getAccountInfo against the Quantu agent_account
    // PDA) and only fires AFTER the chain call has already failed, so the
    // happy path is unchanged. If the payee's account is missing we throw
    // a `counterparty_not_registered` envelope; if the payer's is missing
    // (less common — the agent itself usually has init_policy bootstrap)
    // we name the payer. Otherwise we rethrow and let the generic
    // classifier produce a `chain_error` envelope.
    let decision;
    try {
      decision = await simulateGatePayment({
        policyVault,
        programIds:      ctx.chain.cfg.programs,
        caller:          callerPubkey,
        payerAgentAsset,
        payeeAgentAsset,
        amount:          new BN(input.amount.toString()),
        mint:            parsePubkey(input.mint, "mint"),
        policyId:        input.policy_id,
      });
    } catch (chainErr) {
      await maybeThrowCounterpartyNotRegistered(ctx, chainErr, payeeAgentAsset, payerAgentAsset);
      throw chainErr;
    }

    if (decision.kind === "Allow") return { kind: "Allow" };
    if (decision.kind === "Deny") {
      return { kind: "Deny", reasonCode: decision.reasonCode, reasonName: decision.reasonName };
    }
    return { kind: "RequireValidation", capabilityHashHex: bytesToHex(decision.capabilityHash) };
  },
};

/**
 * Probe both counterparties after a chain failure. If the payee's Quantu
 * `agent_account` PDA is missing, throw a typed
 * `CounterpartyNotRegisteredError` naming the payee. Else check the
 * payer — same shape, less common. Else return so the caller rethrows
 * the original chain error.
 *
 * Probe order: payee first because the 0.3.5 gate rerun showed the
 * counterparty (payee) is the high-frequency offender — the agent itself
 * (payer) typically self-heals via `init_policy`.
 */
async function maybeThrowCounterpartyNotRegistered(
  ctx:     ToolContext,
  chainErr: unknown,
  payee:   PublicKey,
  payer:   PublicKey,
): Promise<void> {
  const causeMsg =
    chainErr instanceof Error ? chainErr.message :
    typeof chainErr === "string" ? chainErr :
    undefined;

  const payeeExists = await quantuAgentAccountExists(ctx.chain, payee);
  if (!payeeExists) {
    throw new CounterpartyNotRegisteredError({
      counterpartyPubkey: payee.toBase58(),
      missingAccountKind: "quantu_agent_account",
      cause:              causeMsg,
    });
  }
  const payerExists = await quantuAgentAccountExists(ctx.chain, payer);
  if (!payerExists) {
    throw new CounterpartyNotRegisteredError({
      counterpartyPubkey: payer.toBase58(),
      missingAccountKind: "quantu_agent_account",
      cause:              causeMsg,
    });
  }
}
