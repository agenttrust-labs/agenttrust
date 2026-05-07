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
 * Two factories:
 *
 *   - `makeTierDecide(table, minTier)` — static lookup against an in-
 *     memory table. Used by the mock-chain demo + CI tests.
 *   - `makeLiveTierDecide({ connection, resolveAtomStats, minTier, ... })` —
 *     Phase J4. Reads the live `tier_immediate` byte off Quantu's
 *     `AtomStats` PDA on every gate, with a 60s in-process cache so RPC
 *     load stays bounded under burst traffic. Falls back to the static
 *     `fallbackTable` if the on-chain read fails / account not found.
 *     Wired into `createRealDemoApp` (real-chain demo path).
 */

import { Connection, PublicKey } from "@solana/web3.js";

import { GateDecision, VerifyContext } from "@agenttrust/trustgate-server";

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

// ===========================================================================
// Phase J4 — live-tier sync against Quantu AtomStats
// ===========================================================================

// Pinned to the same commit `programs/policy-vault/src/ext/atom_engine.rs`
// reads on chain. Schema-version canary + tier-range checks prevent silent
// drift if Quantu re-shapes the account.
export const ATOM_STATS_SIZE                  = 561;
export const ATOM_STATS_TRUST_TIER_OFFSET     = 551;
export const ATOM_STATS_SCHEMA_VERSION_OFFSET = 560;
export const ATOM_STATS_SCHEMA_VERSION_EXPECTED = 1;
export const ATOM_TIER_MAX                    = 4;

/** Default cache TTL — 60 seconds matches the brief and matches the
 *  facilitator's typical inter-payment interval; long enough to amortise
 *  RPC reads across a burst, short enough that a tier upgrade lands
 *  before it stales. */
export const DEFAULT_LIVE_TIER_TTL_MS = 60_000;

export interface CachedTier {
  readonly tier:        number;
  readonly source:      "atom-stats" | "fallback-table" | "unrated";
  readonly fetchedAtMs: number;
}

export interface LiveTierCache {
  get(payerB58: string): CachedTier | undefined;
  set(payerB58: string, entry: CachedTier): void;
  clear(): void;
  size(): number;
}

/** Default in-process Map-backed cache. Drop-in replaceable via the
 *  `cache` arg of `makeLiveTierDecide` for distributed setups. */
export function makeInProcessLiveTierCache(): LiveTierCache {
  const m = new Map<string, CachedTier>();
  return {
    get:   (k) => m.get(k),
    set:   (k, v) => { m.set(k, v); },
    clear: () => { m.clear(); },
    size:  () => m.size,
  };
}

export interface MakeLiveTierDecideArgs {
  readonly connection:       Connection;
  /** Map a payer agent_account pubkey to its `atom_stats` PDA. Returning
   *  `null` short-circuits to the fallback table. The demo wires this to
   *  the bundled `devnet-counterparties.json` lookup; real facilitators
   *  derive via `deriveAtomStatsPda` from the SDK. */
  readonly resolveAtomStats: (payerAgent: PublicKey) => PublicKey | null;
  readonly atomEngineId:     PublicKey;
  readonly minTier:          number;
  readonly ttlMs?:           number;
  readonly fallbackTable?:   CounterpartyTable;
  readonly cache?:           LiveTierCache;
  /** Lets tests pin the clock without monkey-patching `Date.now`. */
  readonly nowMs?:           () => number;
}

/**
 * Live-tier `decide` factory.
 *
 *   1. Resolve the payer's atom_stats PDA. If the resolver returns null,
 *      the fallback static table (if any) is consulted; otherwise tier 0.
 *   2. If the cache has a non-expired entry, return it.
 *   3. Else `getAccountInfo(atom_stats)`, validate owner + size + schema
 *      version, then read `tier_immediate` at byte 551.
 *   4. On any failure (account missing, owner mismatch, schema drift),
 *      consult the fallback table; if that's also empty, treat as tier 0.
 *   5. Cache the result with `expiresAt = now + ttlMs`.
 *
 * Returns Allow when tier >= minTier; otherwise Deny with reasonCode
 * `CounterpartyTierBelowMin = 6` (matches the chain enum).
 */
export function makeLiveTierDecide(
  args: MakeLiveTierDecideArgs,
): (ctx: VerifyContext) => Promise<GateDecision> {
  const ttlMs   = args.ttlMs ?? DEFAULT_LIVE_TIER_TTL_MS;
  const cache   = args.cache ?? makeInProcessLiveTierCache();
  const nowMs   = args.nowMs ?? (() => Date.now());

  return async (ctx) => {
    const tier = await resolveLiveTier({
      connection:        args.connection,
      atomEngineId:      args.atomEngineId,
      resolveAtomStats:  args.resolveAtomStats,
      fallbackTable:     args.fallbackTable,
      cache,
      ttlMs,
      nowMs,
      payerAgent:        ctx.payerAgent,
    });

    if (tier >= args.minTier) {
      return { kind: "Allow" };
    }
    return {
      kind:       "Deny",
      reasonCode: REASON_COUNTERPARTY_TIER_BELOW_MIN.code,
      reasonName: REASON_COUNTERPARTY_TIER_BELOW_MIN.name,
    };
  };
}

interface ResolveLiveTierArgs {
  connection:       Connection;
  atomEngineId:     PublicKey;
  resolveAtomStats: (payerAgent: PublicKey) => PublicKey | null;
  fallbackTable?:   CounterpartyTable;
  cache:            LiveTierCache;
  ttlMs:            number;
  nowMs:            () => number;
  payerAgent:       PublicKey;
}

async function resolveLiveTier(a: ResolveLiveTierArgs): Promise<number> {
  const payerB58 = a.payerAgent.toBase58();

  const cached = a.cache.get(payerB58);
  if (cached && a.nowMs() - cached.fetchedAtMs < a.ttlMs) {
    return cached.tier;
  }

  const atomStats = a.resolveAtomStats(a.payerAgent);
  if (atomStats) {
    try {
      const info = await a.connection.getAccountInfo(atomStats, "confirmed");
      const tier = info ? readTierImmediateFromAtomStats(info, a.atomEngineId) : null;
      if (tier !== null) {
        a.cache.set(payerB58, { tier, source: "atom-stats", fetchedAtMs: a.nowMs() });
        return tier;
      }
    } catch (_) {
      // Network errors fall through to fallback; we don't want a transient
      // RPC blip to flip every payer to Deny.
    }
  }

  const fb = a.fallbackTable?.get(payerB58)?.tier ?? 0;
  a.cache.set(payerB58, {
    tier:        fb,
    source:      a.fallbackTable?.has(payerB58) ? "fallback-table" : "unrated",
    fetchedAtMs: a.nowMs(),
  });
  return fb;
}

/**
 * Decode `tier_immediate` from an AtomStats account. Returns `null` when
 * the account is uninitialised, has the wrong owner, or has drifted schema.
 *
 * Mirrors `programs/policy-vault/src/ext/atom_engine.rs::parse_atom_stats_bytes`
 * verbatim (size + schema version + tier-range checks). Importantly the
 * v1 demo reads `tier_immediate` (byte 551) — `tier_confirmed` (byte 555)
 * is the post-vesting production value tracked separately.
 */
export function readTierImmediateFromAtomStats(
  info:         { data: Buffer | Uint8Array; owner: PublicKey },
  atomEngineId: PublicKey,
): number | null {
  if (!info.owner.equals(atomEngineId)) return null;

  const data = info.data instanceof Buffer ? info.data : Buffer.from(info.data);
  if (data.length < ATOM_STATS_SIZE)             return null;
  if (data[ATOM_STATS_SCHEMA_VERSION_OFFSET] !== ATOM_STATS_SCHEMA_VERSION_EXPECTED) return null;

  const tier = data[ATOM_STATS_TRUST_TIER_OFFSET];
  if (tier > ATOM_TIER_MAX) return null;
  return tier;
}
