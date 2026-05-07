/**
 * Schema + byte-decode tests for `agenttrust_get_quantu_reputation`.
 *
 * Phase Q1: the previous decoder used fabricated offsets and returned
 * junk values for real on-chain accounts. These tests pin the canonical
 * offsets from `programs/policy-vault/src/ext/atom_engine.rs` so any
 * future drift fails loud rather than silently emits "tier: 164".
 */

import { expect } from "chai";
import { Keypair } from "@solana/web3.js";

import {
  ATOM_STATS_CONFIDENCE_OFFSET,
  ATOM_STATS_RISK_SCORE_OFFSET,
  ATOM_STATS_SCHEMA_VERSION_EXPECTED,
  ATOM_STATS_SCHEMA_VERSION_OFFSET,
  ATOM_STATS_SIZE,
  ATOM_STATS_TIER_CONFIRMED_OFFSET,
  ATOM_STATS_TIER_IMMEDIATE_OFFSET,
  ATOM_TIER_MAX,
  decodeAtomStatsBytes,
  getQuantuReputationTool,
} from "../../../src/tools/read/get-quantu-reputation";

describe("agenttrust_get_quantu_reputation (schema)", () => {
  it("accepts valid pubkey", () => {
    const r = getQuantuReputationTool.inputSchema.safeParse({
      agent_asset: Keypair.generate().publicKey.toBase58(),
    });
    expect(r.success).to.equal(true);
  });

  it("rejects malformed pubkey", () => {
    const r = getQuantuReputationTool.inputSchema.safeParse({ agent_asset: "x" });
    expect(r.success).to.equal(false);
  });
});

// Canonical offsets, copied verbatim from
// programs/policy-vault/src/ext/atom_engine.rs:21-27. Hardcoded here to
// catch any drift in the MCP tool's offset constants vs the on-chain
// parser without a Rust ↔ TS dep.
const CANONICAL = {
  size:           561,
  riskScore:      549,
  tierImmediate:  551,
  tierConfirmed:  555,
  confidence:     557,
  schemaVersion:  560,
  expectedSchemaVersion: 1,
  tierMax:        4,
};

describe("agenttrust_get_quantu_reputation (canonical offsets)", () => {
  it("MCP offset constants match programs/policy-vault/src/ext/atom_engine.rs", () => {
    expect(ATOM_STATS_SIZE,                    "size").to.equal(CANONICAL.size);
    expect(ATOM_STATS_RISK_SCORE_OFFSET,       "risk_score").to.equal(CANONICAL.riskScore);
    expect(ATOM_STATS_TIER_IMMEDIATE_OFFSET,   "tier_immediate").to.equal(CANONICAL.tierImmediate);
    expect(ATOM_STATS_TIER_CONFIRMED_OFFSET,   "tier_confirmed").to.equal(CANONICAL.tierConfirmed);
    expect(ATOM_STATS_CONFIDENCE_OFFSET,       "confidence").to.equal(CANONICAL.confidence);
    expect(ATOM_STATS_SCHEMA_VERSION_OFFSET,   "schema_version").to.equal(CANONICAL.schemaVersion);
    expect(ATOM_STATS_SCHEMA_VERSION_EXPECTED, "expected schema_version").to.equal(CANONICAL.expectedSchemaVersion);
    expect(ATOM_TIER_MAX,                      "tier max").to.equal(CANONICAL.tierMax);
  });
});

function synth(opts: {
  tierImmediate?: number;
  tierConfirmed?: number;
  riskScore?:     number;
  confidence?:    number;
  schemaVersion?: number;
  size?:          number;
} = {}): Buffer {
  const buf = Buffer.alloc(opts.size ?? ATOM_STATS_SIZE);
  buf.writeUInt8(opts.riskScore     ?? 0, ATOM_STATS_RISK_SCORE_OFFSET);
  buf.writeUInt8(opts.tierImmediate ?? 0, ATOM_STATS_TIER_IMMEDIATE_OFFSET);
  buf.writeUInt8(opts.tierConfirmed ?? 0, ATOM_STATS_TIER_CONFIRMED_OFFSET);
  buf.writeUInt16LE(opts.confidence ?? 0, ATOM_STATS_CONFIDENCE_OFFSET);
  buf.writeUInt8(opts.schemaVersion ?? ATOM_STATS_SCHEMA_VERSION_EXPECTED, ATOM_STATS_SCHEMA_VERSION_OFFSET);
  return buf;
}

describe("decodeAtomStatsBytes (Phase Q1 fix)", () => {
  it("decodes a freshly-initialised AtomStats (all zero) cleanly", () => {
    const r = decodeAtomStatsBytes(synth({}));
    expect(r).to.deep.equal({
      tierImmediate: 0, tierConfirmed: 0, riskScore: 0, confidence: 0, schemaVersion: 1,
    });
  });

  it("decodes a populated AtomStats", () => {
    const r = decodeAtomStatsBytes(synth({
      tierImmediate: 3, tierConfirmed: 2, riskScore: 17, confidence: 8200,
    }));
    expect(r).to.deep.equal({
      tierImmediate: 3, tierConfirmed: 2, riskScore: 17, confidence: 8200, schemaVersion: 1,
    });
  });

  it("rejects undersized account data", () => {
    const r = decodeAtomStatsBytes(Buffer.alloc(560));
    expect("error" in r && /size 560/.test((r as { error: string }).error)).to.equal(true);
  });

  it("rejects oversized account data", () => {
    const r = decodeAtomStatsBytes(Buffer.alloc(562));
    expect("error" in r && /size 562/.test((r as { error: string }).error)).to.equal(true);
  });

  it("rejects mismatched schema version (canary)", () => {
    const r = decodeAtomStatsBytes(synth({ schemaVersion: 2 }));
    expect("error" in r && /schema_version 2/.test((r as { error: string }).error)).to.equal(true);
  });

  it("rejects tier_immediate > ATOM_TIER_MAX (4)", () => {
    const r = decodeAtomStatsBytes(synth({ tierImmediate: 9 }));
    expect("error" in r && /tier_immediate 9/.test((r as { error: string }).error)).to.equal(true);
  });

  it("rejects tier_confirmed > ATOM_TIER_MAX (4)", () => {
    const r = decodeAtomStatsBytes(synth({ tierConfirmed: 12 }));
    expect("error" in r && /tier_confirmed 12/.test((r as { error: string }).error)).to.equal(true);
  });

  it("accepts the boundary value tier == ATOM_TIER_MAX", () => {
    const r = decodeAtomStatsBytes(synth({ tierImmediate: 4, tierConfirmed: 4 }));
    expect(r).to.have.property("tierImmediate", 4);
    expect(r).to.have.property("tierConfirmed", 4);
  });

  it("u16 LE confidence reads bytes 557..559 in correct order (regression)", () => {
    // confidence = 0x1234 → bytes 557 = 0x34, 558 = 0x12 (little endian)
    const buf = synth({});
    buf.writeUInt8(0x34, 557);
    buf.writeUInt8(0x12, 558);
    const r = decodeAtomStatsBytes(buf);
    expect((r as { confidence: number }).confidence).to.equal(0x1234);
  });
});
