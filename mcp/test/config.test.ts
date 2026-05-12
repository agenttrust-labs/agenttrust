/**
 * Defends against the gate E2E Beat G — `loadConfig` on mainnet without
 * explicit AgentTrust program IDs used to hard-throw at boot, which
 * prevented Quantu-only reads (`get_quantu_reputation`, agent_account
 * lookups) from working on mainnet at all. The fix downgrades the boot
 * throw to a stderr warn, fills the AT program IDs with a sentinel
 * pubkey (System Program), and surfaces a structured `config_error`
 * envelope from any AT-touching tool at call time.
 */

import { expect } from "chai";

import {
  loadConfig,
  isMainnetUndeployedSentinel,
  MAINNET_UNDEPLOYED_SENTINEL,
} from "../src/config";

/**
 * Temporarily set `process.env[key] = value` (or delete it when value is
 * undefined) for the duration of `fn`, restoring the prior value after.
 *
 * Used so the config tests can flip NETWORK between solana-mainnet and
 * solana-devnet without polluting the rest of the suite.
 */
async function withEnv(
  overrides: Record<string, string | undefined>,
  fn: () => void | Promise<void>,
): Promise<void> {
  const prior: Record<string, string | undefined> = {};
  for (const key of Object.keys(overrides)) {
    prior[key] = process.env[key];
    if (overrides[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = overrides[key]!;
    }
  }
  // Also wipe the AT program ID overrides so the mainnet guard fires.
  prior.POLICY_VAULT_PROGRAM_ID         = process.env.POLICY_VAULT_PROGRAM_ID;
  prior.TRUSTGATE_PROGRAM_ID            = process.env.TRUSTGATE_PROGRAM_ID;
  prior.VALIDATION_REGISTRY_PROGRAM_ID  = process.env.VALIDATION_REGISTRY_PROGRAM_ID;
  if (overrides.POLICY_VAULT_PROGRAM_ID         === undefined) delete process.env.POLICY_VAULT_PROGRAM_ID;
  if (overrides.TRUSTGATE_PROGRAM_ID            === undefined) delete process.env.TRUSTGATE_PROGRAM_ID;
  if (overrides.VALIDATION_REGISTRY_PROGRAM_ID  === undefined) delete process.env.VALIDATION_REGISTRY_PROGRAM_ID;
  try {
    await fn();
  } finally {
    for (const key of Object.keys(prior)) {
      const value = prior[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

describe("loadConfig", () => {
  it("does NOT throw when NETWORK=solana-mainnet and no AgentTrust program IDs are set", async () => {
    let cfg: ReturnType<typeof loadConfig> | undefined;
    let threw: unknown;
    await withEnv(
      {
        NETWORK:                        "solana-mainnet",
        POLICY_VAULT_PROGRAM_ID:        undefined,
        TRUSTGATE_PROGRAM_ID:           undefined,
        VALIDATION_REGISTRY_PROGRAM_ID: undefined,
      },
      () => {
        try {
          cfg = loadConfig();
        } catch (err) {
          threw = err;
        }
      },
    );
    expect(threw, "loadConfig did not throw on mainnet without overrides").to.equal(undefined);
    expect(cfg, "config was returned").to.exist;
    expect(cfg!.network, "network is solana-mainnet").to.equal("solana-mainnet");
  });

  it("returns a sentinel pubkey for the three AgentTrust program IDs on mainnet", async () => {
    await withEnv(
      {
        NETWORK:                        "solana-mainnet",
        POLICY_VAULT_PROGRAM_ID:        undefined,
        TRUSTGATE_PROGRAM_ID:           undefined,
        VALIDATION_REGISTRY_PROGRAM_ID: undefined,
      },
      () => {
        const cfg = loadConfig();
        expect(
          isMainnetUndeployedSentinel(cfg.programs.policyVault),
          "policyVault is the sentinel",
        ).to.equal(true);
        expect(
          isMainnetUndeployedSentinel(cfg.programs.trustGate),
          "trustGate is the sentinel",
        ).to.equal(true);
        expect(
          isMainnetUndeployedSentinel(cfg.programs.validationRegistry),
          "validationRegistry is the sentinel",
        ).to.equal(true);
        expect(cfg.programs.policyVault.toBase58()).to.equal(
          MAINNET_UNDEPLOYED_SENTINEL.toBase58(),
        );
      },
    );
  });

  it("still surfaces real Quantu mainnet program IDs (Quantu reads should work)", async () => {
    await withEnv(
      {
        NETWORK:                        "solana-mainnet",
        POLICY_VAULT_PROGRAM_ID:        undefined,
        TRUSTGATE_PROGRAM_ID:           undefined,
        VALIDATION_REGISTRY_PROGRAM_ID: undefined,
      },
      () => {
        const cfg = loadConfig();
        // Quantu IDs are the SDK-bundled `MAINNET_QUANTU_IDS` — non-sentinel,
        // real pubkeys.
        expect(
          isMainnetUndeployedSentinel(cfg.quantu.agentRegistry),
          "quantu.agentRegistry is NOT the sentinel",
        ).to.equal(false);
      },
    );
  });

  it("respects explicit POLICY_VAULT_PROGRAM_ID override on mainnet (skips sentinel branch)", async () => {
    // Use a recognisable but valid pubkey.
    const override = "8Y6fGeNEHgmWmbt8JsRcF72jxbeBfJhomMjG6SuoJQTR";
    await withEnv(
      {
        NETWORK:                        "solana-mainnet",
        POLICY_VAULT_PROGRAM_ID:        override,
        TRUSTGATE_PROGRAM_ID:           undefined,
        VALIDATION_REGISTRY_PROGRAM_ID: undefined,
      },
      () => {
        const cfg = loadConfig();
        expect(cfg.programs.policyVault.toBase58()).to.equal(override);
      },
    );
  });

  it("on devnet (default), AT program IDs are NEVER the sentinel", async () => {
    await withEnv(
      {
        NETWORK:                        undefined,
        POLICY_VAULT_PROGRAM_ID:        undefined,
        TRUSTGATE_PROGRAM_ID:           undefined,
        VALIDATION_REGISTRY_PROGRAM_ID: undefined,
      },
      () => {
        const cfg = loadConfig();
        expect(cfg.network).to.equal("solana-devnet");
        expect(isMainnetUndeployedSentinel(cfg.programs.policyVault)).to.equal(false);
        expect(isMainnetUndeployedSentinel(cfg.programs.trustGate)).to.equal(false);
        expect(isMainnetUndeployedSentinel(cfg.programs.validationRegistry)).to.equal(false);
      },
    );
  });
});
