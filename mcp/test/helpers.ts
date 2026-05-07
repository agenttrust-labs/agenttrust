/**
 * Test helpers — fake ChainClient that no-ops every chain call,
 * deterministic config builder, and a tiny pubkey factory.
 */

import { Keypair, PublicKey } from "@solana/web3.js";

import {
  DEFAULT_DEVNET_PROGRAM_IDS,
  DEFAULT_DEVNET_QUANTU_IDS,
} from "@agenttrust-sdk/trustgate";

import type { AgentTrustConfig } from "../src/config";

export function buildTestConfig(over: Partial<AgentTrustConfig> = {}): AgentTrustConfig {
  return {
    network:              "solana-devnet",
    rpcUrl:               "http://localhost:0",          // unreachable; tests must not actually call
    explorerCluster:      "devnet",
    programs:             DEFAULT_DEVNET_PROGRAM_IDS,
    quantu:               DEFAULT_DEVNET_QUANTU_IDS,
    transport:            "stdio",
    httpPort:             8765,
    ...over,
  };
}

let counter = 0;
export function fakePubkey(): PublicKey {
  // Deterministic but valid 32-byte Ed25519-curve key from the counter.
  const buf = Buffer.alloc(32);
  counter += 1;
  buf.writeUInt32LE(counter, 0);
  // Generate a valid pubkey from a keypair seeded by counter to be safe.
  const kp = Keypair.generate();
  return kp.publicKey;
}
