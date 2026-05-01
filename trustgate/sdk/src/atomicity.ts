/**
 * Atomic-tx invariant enforcement.
 *
 * Per `docs/plan/research/02-anchor-token2022-cpi-class.md §A.2`: the
 * `gate_payment + transfer + emit_feedback` triple MUST execute as ONE
 * Solana transaction. Splitting it across two transactions opens a real
 * footgun on Token-2022 mints with `TransferHook` extensions:
 *
 *   1. Tx1 commits `gate_payment` Allow → VelocityLedger.cumulative += amount
 *   2. Tx2 sends transfer → TransferHook reverts (e.g., compliance check fails)
 *   3. VelocityLedger is now corrupted: counted a payment that never happened
 *
 * The SDK enforces this invariant at TWO layers:
 *   - **Compile-time literal type guard.** The `AtomicityEnforced` marker is
 *     `{ atomicityEnforced: true }` — a literal `true`, not `boolean`. TS
 *     rejects any caller that passes `false` or omits the field. `as any`
 *     escape-hatches are caught at runtime (next).
 *   - **Runtime throw.** Every entry point validates `atomicityEnforced ===
 *     true` and throws `AtomicityNotEnforced` otherwise. Stops `as any`
 *     casts cold.
 *
 * Both layers are required: skipping either one re-opens the corruption
 * vector. This is the load-bearing safety property of the SDK.
 */

/**
 * Marker type. Callers MUST pass `{ atomicityEnforced: true }` (literal
 * true, no booleans). Removing this field or passing `false` is a TS
 * compile error.
 */
export interface AtomicityEnforced {
  readonly atomicityEnforced: true;
}

export class AtomicityNotEnforcedError extends Error {
  constructor(siteName: string) {
    super(
      `[${siteName}] atomicityEnforced=true is required to call this function. ` +
      `Splitting gate_payment + transfer + emit_feedback across multiple ` +
      `transactions silently corrupts VelocityLedger when Token-2022 ` +
      `TransferHook reverts. See docs/plan/research/02-anchor-token2022-cpi-class.md §A.2`,
    );
    this.name = "AtomicityNotEnforcedError";
  }
}

/**
 * Runtime check. Call at the top of every settle/dispute/atomic entrypoint.
 * Catches `as any` casts that bypass the literal-type guard.
 */
export function assertAtomicityEnforced(
  cfg: { atomicityEnforced?: unknown },
  siteName: string,
): void {
  if ((cfg as any).atomicityEnforced !== true) {
    throw new AtomicityNotEnforcedError(siteName);
  }
}
