/**
 * MCP protocol conformance — boot the AgentTrust server with the
 * in-memory transport pair, drive it via a Client, and assert that
 * every advertised capability honours its contract.
 *
 * This exercises one tool from each category (read/write/discovery),
 * resources/list + resources/read for the programs manifest, and
 * prompts/list + prompts/get for the audit_payment prompt.
 *
 * No RPC round-trip — the chain layer is exercised separately by the
 * tools/* schema tests + (when INTEGRATION=1) the devnet smoke step.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { expect } from "chai";

import { buildTestConfig } from "./helpers";
import { createMcpServer } from "../src/server";

describe("MCP protocol conformance", () => {
  it("connects, lists tools, calls a discovery tool, lists resources, lists prompts", async () => {
    const cfg = buildTestConfig();
    const server = createMcpServer(cfg);
    const [a, b] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "agenttrust-test-client", version: "0.0.0" });

    await Promise.all([server.connect(b), client.connect(a)]);

    try {
      // tools/list
      const tools = await client.listTools();
      const toolNames = tools.tools.map((t) => t.name);
      expect(toolNames).to.include.members([
        "agenttrust_get_policy",
        "agenttrust_simulate_payment",
        "agenttrust_explain_decision",
        "agenttrust_init_policy",
        "agenttrust_demo_state",
        "agenttrust_list_facilitators",
        "agenttrust_docs",
      ]);
      expect(toolNames.length).to.equal(18);

      // tools/call → discovery (no chain)
      const callRes = await client.callTool({
        name:      "agenttrust_explain_decision",
        arguments: { reason_code: 6 },
      });
      // CallToolResult shape: { content: [{type:"text",text}], isError?: boolean }
      const content = callRes.content as Array<{ type: string; text: string }>;
      expect(content[0].type).to.equal("text");
      const parsed = JSON.parse(content[0].text);
      expect(parsed.reasonName).to.equal("CounterpartyTierBelowMin");

      // tools/call → read tool with no chain access (list_facilitators is static)
      const fac = await client.callTool({ name: "agenttrust_list_facilitators", arguments: {} });
      const facContent = fac.content as Array<{ type: string; text: string }>;
      const facParsed = JSON.parse(facContent[0].text);
      expect(facParsed.count).to.equal(4);

      // tools/call → demo_state (reads file from disk, no chain)
      const demo = await client.callTool({ name: "agenttrust_demo_state", arguments: {} });
      const demoContent = demo.content as Array<{ type: string; text: string }>;
      const demoParsed = JSON.parse(demoContent[0].text);
      expect(demoParsed.available).to.equal(true);
      expect(demoParsed.counterparties).to.have.length(3);

      // resources/list
      const resources = await client.listResources();
      const resUris = resources.resources.map((r) => r.uri);
      expect(resUris).to.include("agenttrust://devnet/programs");
      const docsCount = resUris.filter((u) => u.startsWith("agenttrust://docs/")).length;
      expect(docsCount).to.be.greaterThan(10);

      // resources/read (programs manifest)
      const read = await client.readResource({ uri: "agenttrust://devnet/programs" });
      expect(read.contents).to.have.length(1);
      const programsContent = read.contents[0] as { text: string };
      const programsManifest = JSON.parse(programsContent.text);
      expect(programsManifest.network).to.equal("solana-devnet");

      // prompts/list
      const prompts = await client.listPrompts();
      const promptNames = prompts.prompts.map((p) => p.name);
      expect(promptNames).to.include("agenttrust_audit_payment");
      expect(promptNames).to.include("agenttrust_setup_agent");
      expect(promptNames).to.include("agenttrust_explain_failure");

      // prompts/get → audit_payment
      const promptGet = await client.getPrompt({
        name:      "agenttrust_audit_payment",
        arguments: {
          payer_agent: "11111111111111111111111111111111",
          payee_agent: "11111111111111111111111111111111",
          amount:      "1000",
          mint:        "11111111111111111111111111111111",
          policy_id:   "1",
        },
      });
      expect(promptGet.messages.length).to.equal(1);
      expect(promptGet.messages[0].role).to.equal("user");

      // tools/call invalid input is reported via isError, not a thrown JSON-RPC error.
      const bad = await client.callTool({
        name:      "agenttrust_get_policy",
        arguments: { agent_asset: "garbage", policy_id: 1 },
      });
      expect((bad as { isError?: boolean }).isError).to.equal(true);
    } finally {
      await client.close();
      await server.close();
    }
  });
});

describe("MCP devnet round-trip (INTEGRATION=1 only)", function () {
  // Gated suite: hits real devnet RPC via the live config.
  before(function () {
    if (process.env.INTEGRATION !== "1") this.skip();
  });

  it("get_quantu_reputation returns a real account for the tier-3 pre-warm", async () => {
    const { loadConfig } = await import("../src/config");
    const cfg = loadConfig();
    const server = createMcpServer(cfg);
    const [a, b] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "agenttrust-int-client", version: "0.0.0" });
    await Promise.all([server.connect(b), client.connect(a)]);
    try {
      const demo = await client.callTool({ name: "agenttrust_demo_state", arguments: {} });
      const demoContent = (demo.content as Array<{ text: string }>)[0].text;
      const demoParsed  = JSON.parse(demoContent);
      const tier3 = demoParsed.counterparties.find((c: { demoTier: number }) => c.demoTier === 3);
      expect(tier3, "tier-3 pre-warm missing from demo state").to.exist;

      const rep = await client.callTool({
        name:      "agenttrust_get_quantu_reputation",
        arguments: { agent_asset: tier3.asset },
      });
      const repContent = (rep.content as Array<{ text: string }>)[0].text;
      const repParsed  = JSON.parse(repContent);
      expect(repParsed.exists).to.equal(true);
      expect(repParsed.ownerMatches).to.equal(true);
      // Tier may be 0..3 depending on whether the pre-warm seeded feedback;
      // existence + correct ownership is the load-bearing assertion here.
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("get_validation_attestation returns the live D1 attestation PDA", async () => {
    // The D1 attestor demo (examples/attestor-demo) writes a real
    // ValidationAttestation against the tier-3 counterparty under the
    // "usdc-payment-policy.v1" capability. This live-RPC test asserts
    // the MCP read tool sees that attestation.
    const { loadConfig } = await import("../src/config");
    const cfg = loadConfig();
    const server = createMcpServer(cfg);
    const [a, b] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "agenttrust-int-client", version: "0.0.0" });
    await Promise.all([server.connect(b), client.connect(a)]);
    try {
      const fs = await import("fs");
      const path = await import("path");
      const tracePath = path.resolve(__dirname, "../../examples/attestor-demo/devnet-attestor-trace.json");
      const trace = JSON.parse(fs.readFileSync(tracePath, "utf-8")) as {
        subjectAsset: string; capabilityName: string;
      };
      const { createHash } = await import("crypto");
      const capHashHex = createHash("sha256").update(trace.capabilityName).digest("hex");

      const res = await client.callTool({
        name:      "agenttrust_get_validation_attestation",
        arguments: { subject_asset: trace.subjectAsset, capability_hash: capHashHex },
      });
      const content = (res.content as Array<{ text: string }>)[0].text;
      const parsed  = JSON.parse(content);
      expect(parsed.attestations.length, "expected at least one attestation").to.be.greaterThan(0);
      const att = parsed.attestations[0];
      expect(att.revoked).to.equal(false);
      expect(att.attestor).to.be.a("string");
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("get_feedback_log returns the live D5 emission log", async () => {
    // The Pay.sh devnet smoke writes a FeedbackEmissionLog at
    // HB4BBi9jaD3VPcZkQQaH3DxukSqBiXfW8RejtaLa8bF3 (recorded in
    // examples/pay-sh-demo/devnet-smoke.json). The MCP read tool
    // must surface it when fetched by paymentIdHash. We don't have
    // the original payment_id_hash recorded in the smoke proof (the
    // PDA is the canonical reference), so this test asserts via the
    // PDA-known address that the underlying account is reachable.
    // For per-paymentIdHash lookup the unit tests cover the schema +
    // PDA-derivation contract; this devnet check is targeted at the
    // RPC round-trip path.
    const { loadConfig } = await import("../src/config");
    const { Connection, PublicKey } = await import("@solana/web3.js");
    const cfg = loadConfig();
    const conn = new Connection(cfg.rpcUrl, "confirmed");
    const fs = await import("fs");
    const path = await import("path");
    const smokePath = path.resolve(__dirname, "../../examples/pay-sh-demo/devnet-smoke.json");
    if (!fs.existsSync(smokePath)) this.skip();
    const smoke = JSON.parse(fs.readFileSync(smokePath, "utf-8")) as {
      emitFeedback: { logPda: string };
    };
    const info = await conn.getAccountInfo(new PublicKey(smoke.emitFeedback.logPda));
    expect(info, "FeedbackEmissionLog PDA missing on devnet").to.not.equal(null);
    expect(info!.owner.toBase58()).to.equal(cfg.programs.trustGate.toBase58());
  });
});
