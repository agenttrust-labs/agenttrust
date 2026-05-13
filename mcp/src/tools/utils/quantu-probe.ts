/**
 * Pre-flight probe for Quantu account presence on-chain.
 *
 * When a tool's chain call (e.g. `simulate_payment`'s `simulateGatePayment`
 * or `emit_feedback`'s `emitFeedback` RPC) fails with a generic
 * `AccountNotInitialized` Custom 3012 (or the equivalent
 * `SendTransactionError` text shape), the handler runs this probe to
 * confirm WHICH counterparty's Quantu PDA was missing. The probe is a
 * single `getAccountInfo` against the derived `agent_account` PDA — no
 * write, no signer, no fee.
 *
 * If the probe says missing, the caller throws a typed
 * `CounterpartyNotRegisteredError` which the classifier renders as the
 * `counterparty_not_registered` envelope (with `details.counterparty_pubkey`
 * and `details.missing_account_kind`). If the probe says present, the
 * caller rethrows the original chain error so the generic classifier
 * surfaces it as `chain_error`.
 *
 * Read-only — never throws on a successful RPC, returns `false` on a
 * confirmed-missing account. RPC failures during the probe (e.g.
 * network blip) propagate so the classifier can still report them as
 * `rpc_failure` rather than swallowing them.
 */

import { PublicKey } from "@solana/web3.js";

import type { ChainClient } from "../../chain";
import { deriveAgentAccountPda } from "../../chain";

/**
 * Returns true iff the Quantu `agent_account` PDA for `agentAsset`
 * exists on-chain under the configured Quantu agent_registry program.
 *
 * Does NOT verify the owner program or decode the data — `exists` here
 * means "the runtime returned a non-null account info", which is all
 * the caller needs to decide between `counterparty_not_registered`
 * (no account) and the generic `chain_error` fall-through.
 */
export async function quantuAgentAccountExists(
  chain:      ChainClient,
  agentAsset: PublicKey,
): Promise<boolean> {
  const pda = deriveAgentAccountPda(chain.cfg.quantu, agentAsset);
  const info = await chain.connection.getAccountInfo(pda, "confirmed");
  return info !== null;
}
