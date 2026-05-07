/**
 * Phase J4 — makeLiveTierDecide unit tests.
 *
 * Covers:
 *   1. Happy path: live atom_stats hit on first call, served from cache
 *      on subsequent calls within ttlMs.
 *   2. Cache expiry: after ttlMs elapses, the resolver re-fetches.
 *   3. Fallback table: when getAccountInfo returns null, the static
 *      counterparty table supplies the tier.
 *   4. Schema-version drift: AtomStats account with the wrong schema
 *      version is treated as un-readable; the fallback is consulted.
 *   5. RPC failure: when getAccountInfo throws, the cache + fallback
 *      cushion the gate (no transient outage flips every payer to Deny).
 *   6. min-tier comparison: tier >= minTier → Allow; below → Deny with
 *      reasonCode = 6 (CounterpartyTierBelowMin).
 *   7. Pure-fn parser: readTierImmediateFromAtomStats handles owner
 *      mismatch, undersized buffer, schema version mismatch, and
 *      tier-out-of-range.
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { expect } from "chai";

import {
  ATOM_STATS_SCHEMA_VERSION_EXPECTED,
  ATOM_STATS_SCHEMA_VERSION_OFFSET,
  ATOM_STATS_SIZE,
  ATOM_STATS_TRUST_TIER_OFFSET,
  CounterpartyTable,
  makeLiveTierDecide,
  makeInProcessLiveTierCache,
  readTierImmediateFromAtomStats,
} from "../src/policy";

// ----------------------------------------------------------------------------
// Synthetic AtomStats account builder
// ----------------------------------------------------------------------------

const ATOM_ENGINE_ID = new PublicKey("AToMufS4QD6hEXvcvBDg9m1AHeCLpmZQsyfYa5h9MwAF");

function makeAtomStatsAccount(opts: {
  tier?:           number;
  schemaVersion?:  number;
  owner?:          PublicKey;
  size?:           number;
}): { data: Buffer; owner: PublicKey } {
  const buf = Buffer.alloc(opts.size ?? ATOM_STATS_SIZE);
  buf[ATOM_STATS_TRUST_TIER_OFFSET]     = opts.tier          ?? 3;
  buf[ATOM_STATS_SCHEMA_VERSION_OFFSET] = opts.schemaVersion ?? ATOM_STATS_SCHEMA_VERSION_EXPECTED;
  return { data: buf, owner: opts.owner ?? ATOM_ENGINE_ID };
}

// ----------------------------------------------------------------------------
// Connection stub — records calls so we can assert cache behaviour
// ----------------------------------------------------------------------------

interface StubConnection {
  callCount: number;
  responses: Array<{ data: Buffer; owner: PublicKey } | null | Error>;
  asConnection(): Connection;
}

function stubConnection(responses: Array<{ data: Buffer; owner: PublicKey } | null | Error>): StubConnection {
  let i = 0;
  let callCount = 0;
  const fakeConn = {
    getAccountInfo: async (_pubkey: PublicKey, _commitment?: string) => {
      callCount++;
      const r = responses[Math.min(i++, responses.length - 1)];
      if (r instanceof Error) throw r;
      return r;
    },
  };
  return {
    get callCount() { return callCount; },
    responses,
    asConnection: () => fakeConn as unknown as Connection,
  };
}

// ----------------------------------------------------------------------------
// Test bodies
// ----------------------------------------------------------------------------

describe("makeLiveTierDecide (Phase J4)", () => {
  const payer    = new PublicKey("11111111111111111111111111111111");
  const atomPda  = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
  const ctx      = { payerAgent: payer } as any;

  it("happy path — first call reads atom_stats, second call hits cache within ttl", async () => {
    const conn = stubConnection([makeAtomStatsAccount({ tier: 3 })]);
    let now = 0;
    const decide = makeLiveTierDecide({
      connection:        conn.asConnection(),
      resolveAtomStats:  () => atomPda,
      atomEngineId:      ATOM_ENGINE_ID,
      minTier:           2,
      ttlMs:             60_000,
      nowMs:             () => now,
    });

    const a = await decide(ctx);
    const b = await decide(ctx);
    expect(a.kind).to.equal("Allow");
    expect(b.kind).to.equal("Allow");
    expect(conn.callCount).to.equal(1); // 2nd call served from cache
  });

  it("cache expires after ttlMs — 2nd call within ttl serves cache, 3rd call after refetches", async () => {
    const conn = stubConnection([
      makeAtomStatsAccount({ tier: 3 }),
      makeAtomStatsAccount({ tier: 1 }),
    ]);
    let now = 0;
    const decide = makeLiveTierDecide({
      connection:        conn.asConnection(),
      resolveAtomStats:  () => atomPda,
      atomEngineId:      ATOM_ENGINE_ID,
      minTier:           2,
      ttlMs:             60_000,
      nowMs:             () => now,
    });

    expect((await decide(ctx)).kind).to.equal("Allow");                 // tier 3
    now = 30_000;
    expect((await decide(ctx)).kind).to.equal("Allow");                 // cached
    now = 60_001;
    expect((await decide(ctx)).kind).to.equal("Deny");                  // tier 1 (refetch)
    expect(conn.callCount).to.equal(2);
  });

  it("falls back to the static counterparty table when atom_stats is uninitialised", async () => {
    const conn = stubConnection([null]);
    const fallback: CounterpartyTable = new Map([
      [payer.toBase58(), { tier: 3, label: "static-trusted" }],
    ]);
    const decide = makeLiveTierDecide({
      connection:        conn.asConnection(),
      resolveAtomStats:  () => atomPda,
      atomEngineId:      ATOM_ENGINE_ID,
      minTier:           2,
      fallbackTable:     fallback,
    });

    expect((await decide(ctx)).kind).to.equal("Allow");
    expect(conn.callCount).to.equal(1);
  });

  it("treats schema-version drift as un-readable; consults fallback table", async () => {
    const conn = stubConnection([makeAtomStatsAccount({ tier: 3, schemaVersion: 99 })]);
    const fallback: CounterpartyTable = new Map([
      [payer.toBase58(), { tier: 1, label: "static-low-trust" }],
    ]);
    const decide = makeLiveTierDecide({
      connection:        conn.asConnection(),
      resolveAtomStats:  () => atomPda,
      atomEngineId:      ATOM_ENGINE_ID,
      minTier:           2,
      fallbackTable:     fallback,
    });

    const r = await decide(ctx);
    expect(r.kind).to.equal("Deny");
    if (r.kind === "Deny") expect(r.reasonCode).to.equal(6);
  });

  it("RPC failure cushioned by fallback table — no transient outage flips every payer to Deny", async () => {
    const conn = stubConnection([new Error("RPC down")]);
    const fallback: CounterpartyTable = new Map([
      [payer.toBase58(), { tier: 3, label: "trusted" }],
    ]);
    const decide = makeLiveTierDecide({
      connection:        conn.asConnection(),
      resolveAtomStats:  () => atomPda,
      atomEngineId:      ATOM_ENGINE_ID,
      minTier:           2,
      fallbackTable:     fallback,
    });

    expect((await decide(ctx)).kind).to.equal("Allow");
  });

  it("Deny when tier < minTier; reasonCode 6 = CounterpartyTierBelowMin", async () => {
    const conn = stubConnection([makeAtomStatsAccount({ tier: 1 })]);
    const decide = makeLiveTierDecide({
      connection:        conn.asConnection(),
      resolveAtomStats:  () => atomPda,
      atomEngineId:      ATOM_ENGINE_ID,
      minTier:           2,
    });
    const r = await decide(ctx);
    expect(r.kind).to.equal("Deny");
    if (r.kind === "Deny") {
      expect(r.reasonCode).to.equal(6);
      expect(r.reasonName).to.equal("CounterpartyTierBelowMin");
    }
  });

  it("unknown payer with no fallback resolves to tier 0 (Deny when minTier > 0)", async () => {
    const conn = stubConnection([null]);
    const decide = makeLiveTierDecide({
      connection:        conn.asConnection(),
      resolveAtomStats:  () => null,                    // resolver short-circuits
      atomEngineId:      ATOM_ENGINE_ID,
      minTier:           2,
    });
    const r = await decide(ctx);
    expect(r.kind).to.equal("Deny");
    if (r.kind === "Deny") expect(r.reasonCode).to.equal(6);
    expect(conn.callCount).to.equal(0);                  // resolver returned null → no RPC
  });

  it("custom cache passes through — clear() invalidates", async () => {
    const conn = stubConnection([
      makeAtomStatsAccount({ tier: 3 }),
      makeAtomStatsAccount({ tier: 1 }),
    ]);
    const cache = makeInProcessLiveTierCache();
    const decide = makeLiveTierDecide({
      connection:        conn.asConnection(),
      resolveAtomStats:  () => atomPda,
      atomEngineId:      ATOM_ENGINE_ID,
      minTier:           2,
      cache,
    });

    expect((await decide(ctx)).kind).to.equal("Allow");
    expect(cache.size()).to.equal(1);
    cache.clear();
    expect(cache.size()).to.equal(0);
    expect((await decide(ctx)).kind).to.equal("Deny");   // refetched, tier 1
    expect(conn.callCount).to.equal(2);
  });
});

describe("readTierImmediateFromAtomStats — parser invariants", () => {
  const otherOwner = new PublicKey("11111111111111111111111111111111");

  it("returns the tier byte for a well-formed account", () => {
    const acct = makeAtomStatsAccount({ tier: 4 });
    expect(readTierImmediateFromAtomStats(acct, ATOM_ENGINE_ID)).to.equal(4);
  });

  it("returns null when owner mismatches the atom-engine id", () => {
    const acct = makeAtomStatsAccount({ tier: 3, owner: otherOwner });
    expect(readTierImmediateFromAtomStats(acct, ATOM_ENGINE_ID)).to.equal(null);
  });

  it("returns null when the account is undersized", () => {
    const acct = makeAtomStatsAccount({ tier: 3, size: ATOM_STATS_SIZE - 1 });
    expect(readTierImmediateFromAtomStats(acct, ATOM_ENGINE_ID)).to.equal(null);
  });

  it("returns null when schema version != 1", () => {
    const acct = makeAtomStatsAccount({ tier: 3, schemaVersion: 2 });
    expect(readTierImmediateFromAtomStats(acct, ATOM_ENGINE_ID)).to.equal(null);
  });

  it("returns null when tier_immediate exceeds ATOM_TIER_MAX (4)", () => {
    const acct = makeAtomStatsAccount({ tier: 9 });
    expect(readTierImmediateFromAtomStats(acct, ATOM_ENGINE_ID)).to.equal(null);
  });
});
