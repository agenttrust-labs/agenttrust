/**
 * Demo policy gate. Implements the `decide` function used by the
 * payment middleware in lieu of an on-chain `gate_payment` simulation.
 *
 * Three counterparties at tiers 0 / 1 / 3 give us the three branches the
 * brief's smoke test exercises:
 *
 *   - tier 0  → Deny (CounterpartyTierBelowMin)
 *   - tier 1  → Deny (CounterpartyTierBelowMin)
 *   - tier 3  → Allow
 *
 * Real production wires `decide` to `simulateGatePayment` (chain.ts).
 * Demo / CI use this stub so the flow runs without devnet or Anchor RPC.
 */

import { GateDecision, VerifyContext } from "@agenttrust/trustgate-server";
import { PublicKey } from "@solana/web3.js";

export const DEMO_POLICY_MIN_TIER = 2;

export interface CounterpartyEntry {
  readonly tier:  number;
  readonly label: string;
}

export type CounterpartyTable = ReadonlyMap<string, CounterpartyEntry>;

const REASON_COUNTERPARTY_TIER_BELOW_MIN = {
  code: 6,
  name: "CounterpartyTierBelowMin",
} as const;

/**
 * Build a `decide` function that resolves payerAgent → tier from a static
 * map, compares against `minTier`, and returns Allow / Deny accordingly.
 *
 * Unknown payers map to "tier 0" (treated as Deny when minTier > 0). This
 * matches the on-chain `default_unrated_treatment = UNRATED_DENY` behavior
 * for the demo policy. Switch to an alternative resolver to change this.
 */
export function makeTierDecide(
  table:   CounterpartyTable,
  minTier: number,
): (ctx: VerifyContext) => Promise<GateDecision> {
  return async (ctx) => {
    const payerB58 = ctx.payerAgent.toBase58();
    const entry    = table.get(payerB58);
    const tier     = entry?.tier ?? 0;

    if (tier >= minTier) {
      return { kind: "Allow" };
    }
    return {
      kind:       "Deny",
      reasonCode: REASON_COUNTERPARTY_TIER_BELOW_MIN.code,
      reasonName: REASON_COUNTERPARTY_TIER_BELOW_MIN.name,
    };
  };
}

export function lookupCounterparty(
  table: CounterpartyTable,
  pubkey: PublicKey,
): CounterpartyEntry | undefined {
  return table.get(pubkey.toBase58());
}
