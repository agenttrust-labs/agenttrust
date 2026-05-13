#!/usr/bin/env node
/**
 * AgentTrust 0.4.0 Gate E2E driver — run-6
 * (against @agenttrust-sdk/mcp@0.4.4 with init_killswitch self-heal added
 *  on top of the run-5 register_agent_via_cpi + init_authority self-heals.)
 *
 * Spawns `npx -y @agenttrust-sdk/mcp@0.4.4` in stdio mode with a fresh
 * test wallet's KEYPAIR_B58 and exercises:
 *   1) initialize (handshake)
 *   2) tools/list
 *   3) tools/call agenttrust_init_policy (fresh-wallet self-bootstrap)
 *   4) idempotency: second init_policy with policy_id=2
 *   5) demo_state pull to discover counterparty + mint
 *   6) simulate-payment against the freshly-registered agent
 *
 * Captures every JSON-RPC request/response and stderr to artifact files.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');

const HERE = __dirname;
const KEYPAIR_B58 = fs.readFileSync(path.join(HERE, 'test-wallet.b58'), 'utf8').trim();
const TEST_PUBKEY = fs.readFileSync(path.join(HERE, 'test-wallet.pubkey.txt'), 'utf8').trim().split('=')[1];

if (!KEYPAIR_B58 || KEYPAIR_B58.length < 80) {
  console.error('[gate] missing or invalid test-wallet.b58');
  process.exit(2);
}
if (!TEST_PUBKEY || TEST_PUBKEY.length < 32) {
  console.error('[gate] missing or invalid test pubkey');
  process.exit(2);
}

console.error('[gate] TEST_PUBKEY=' + TEST_PUBKEY);
console.error('[gate] spawning npx -y @agenttrust-sdk/mcp@0.4.4 ...');

const requestsLog = fs.createWriteStream(path.join(HERE, 'jsonrpc-requests.jsonl'));
const responsesLog = fs.createWriteStream(path.join(HERE, 'jsonrpc-responses.jsonl'));
const stderrLog = fs.createWriteStream(path.join(HERE, 'mcp-stderr.log'));

const child = spawn('npx', ['-y', '@agenttrust-sdk/mcp@0.4.4'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    KEYPAIR_B58,
    RPC_URL: 'https://api.devnet.solana.com',
    NETWORK: 'solana-devnet',
  },
});

const pending = new Map(); // id -> { resolve, reject, method }
let nextId = 1;

const rl = readline.createInterface({ input: child.stdout });
rl.on('line', (line) => {
  if (!line.trim()) return;
  responsesLog.write(line + '\n');
  let msg;
  try {
    msg = JSON.parse(line);
  } catch (err) {
    console.error('[gate] non-JSON stdout line:', line);
    return;
  }
  if (msg && Object.prototype.hasOwnProperty.call(msg, 'id') && pending.has(msg.id)) {
    const slot = pending.get(msg.id);
    pending.delete(msg.id);
    slot.resolve(msg);
  } else {
    console.error('[gate] unsolicited message:', JSON.stringify(msg).slice(0, 200));
  }
});

child.stderr.on('data', (chunk) => {
  process.stderr.write('[mcp-stderr] ' + chunk.toString());
  stderrLog.write(chunk);
});

child.on('exit', (code, signal) => {
  console.error('[gate] mcp child exited code=' + code + ' signal=' + signal);
});

function send(method, params, isNotification = false) {
  const msg = { jsonrpc: '2.0', method };
  if (params !== undefined) msg.params = params;
  if (!isNotification) {
    msg.id = nextId++;
  }
  const line = JSON.stringify(msg);
  requestsLog.write(line + '\n');
  child.stdin.write(line + '\n');
  if (isNotification) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(msg.id);
      reject(new Error('timeout waiting for response to ' + method + ' id=' + msg.id));
    }, 180_000);
    pending.set(msg.id, {
      method,
      resolve: (r) => { clearTimeout(timeout); resolve(r); },
      reject: (e) => { clearTimeout(timeout); reject(e); },
    });
  });
}

function extractParsed(callRes) {
  let parsed = null;
  let textContent = null;
  if (callRes.result && Array.isArray(callRes.result.content)) {
    const textBlock = callRes.result.content.find((c) => c.type === 'text');
    if (textBlock && typeof textBlock.text === 'string') {
      textContent = textBlock.text;
      try {
        parsed = JSON.parse(textBlock.text);
      } catch (err) {
        parsed = { __unparsed: textBlock.text };
      }
    }
  }
  // Prefer structuredContent when present (richer object), fall back to parsed text.
  if (callRes.result && callRes.result.structuredContent && typeof callRes.result.structuredContent === 'object') {
    parsed = callRes.result.structuredContent;
  }
  return { parsed, textContent };
}

(async () => {
  // Step 1: initialize handshake
  console.error('[gate] -> initialize');
  const initRes = await send('initialize', {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'gate-e2e', version: '0.4.1' },
  });
  console.error('[gate] <- initialize: protocolVersion=' + (initRes.result && initRes.result.protocolVersion));

  await send('notifications/initialized', {}, true);

  // Step 2: tools/list
  console.error('[gate] -> tools/list');
  const listRes = await send('tools/list', {});
  const tools = (listRes.result && listRes.result.tools) || [];
  console.error('[gate] <- tools/list count=' + tools.length);
  const toolNames = tools.map((t) => t.name).sort();
  fs.writeFileSync(path.join(HERE, 'tools-list.json'), JSON.stringify({ count: tools.length, names: toolNames }, null, 2));

  // Step 3: tools/call agenttrust_init_policy (self-register)
  const initPolicyArgs = {
    // 0.4.4: omit agent_asset; init_policy generates a fresh ephemeral
    // asset Keypair internally and returns the new pubkey via the
    // agentAsset output field.
    policy_id: 1,
    enabled_kinds_bitmask: 2, // Spending only
    spending: { per_tx_max: '1000000' },
  };
  console.error('[gate] -> tools/call agenttrust_init_policy args=' + JSON.stringify(initPolicyArgs));
  const callRes = await send('tools/call', {
    name: 'agenttrust_init_policy',
    arguments: initPolicyArgs,
  });

  fs.writeFileSync(path.join(HERE, 'init-policy-raw.json'), JSON.stringify(callRes, null, 2));
  const { parsed, textContent } = extractParsed(callRes);

  const gateResults = {
    isError: !!(callRes.result && callRes.result.isError),
    rawText: textContent,
    parsed,
    txSignature: parsed && (parsed.txSignature || parsed.signature || parsed.tx || null),
    agentAsset: parsed && (parsed.agentAsset || parsed.agent_asset || null),
    selfHealed: parsed && (parsed.selfHealed ?? parsed.self_healed ?? null),
    healedSteps: parsed && (parsed.healedSteps || parsed.healed_steps || null),
    policyPda: parsed && (parsed.policyPda || parsed.policyAccount || parsed.policy_account || null),
    velocityPda: parsed && (parsed.velocityPda || parsed.velocityAccount || parsed.velocity_account || null),
    initRes: { protocolVersion: initRes.result && initRes.result.protocolVersion },
    toolCount: tools.length,
  };
  fs.writeFileSync(path.join(HERE, 'gate-results.json'), JSON.stringify(gateResults, null, 2));

  console.error('[gate] init_policy result:');
  console.error(JSON.stringify(gateResults, null, 2));

  // Step 4: idempotency — call init_policy again with policy_id=2
  // Pass the same agent_asset from step 3 so we exercise the
  // "agent_account already exists, skip register_agent_via_cpi prepend" path.
  const reusedAgentAsset = (gateResults.parsed && gateResults.parsed.agentAsset) || null;
  const initPolicyArgs2 = {
    agent_asset: reusedAgentAsset,
    policy_id: 2,
    enabled_kinds_bitmask: 2,
    spending: { per_tx_max: '500000' },
  };
  console.error('[gate] -> tools/call agenttrust_init_policy (idempotency, policy_id=2)');
  const callRes2 = await send('tools/call', {
    name: 'agenttrust_init_policy',
    arguments: initPolicyArgs2,
  });
  fs.writeFileSync(path.join(HERE, 'init-policy-raw-2.json'), JSON.stringify(callRes2, null, 2));
  const { parsed: parsed2, textContent: textContent2 } = extractParsed(callRes2);

  const gateResults2 = {
    isError: !!(callRes2.result && callRes2.result.isError),
    rawText: textContent2,
    parsed: parsed2,
    txSignature: parsed2 && (parsed2.txSignature || parsed2.signature || null),
    selfHealed: parsed2 && (parsed2.selfHealed ?? parsed2.self_healed ?? null),
    healedSteps: parsed2 && (parsed2.healedSteps || parsed2.healed_steps || null),
    policyPda: parsed2 && (parsed2.policyPda || parsed2.policyAccount || null),
  };
  fs.writeFileSync(path.join(HERE, 'gate-results-idempotency.json'), JSON.stringify(gateResults2, null, 2));

  console.error('[gate] idempotency result:');
  console.error(JSON.stringify(gateResults2, null, 2));

  // Step 4.5: pull demo_state to discover counterparty + mint
  console.error('[gate] -> tools/call agenttrust_demo_state');
  let demoState = null;
  try {
    const demoRes = await send('tools/call', {
      name: 'agenttrust_demo_state',
      arguments: {},
    });
    fs.writeFileSync(path.join(HERE, 'demo-state-raw.json'), JSON.stringify(demoRes, null, 2));
    const { parsed: parsedDemo } = extractParsed(demoRes);
    demoState = parsedDemo;
    fs.writeFileSync(path.join(HERE, 'demo-state.json'), JSON.stringify(parsedDemo, null, 2));
  } catch (err) {
    console.error('[gate] demo_state failed (non-fatal):', err.message);
  }

  // Step 5: simulate-payment
  // Per task: payee=BTcgiDauqVHoGMiXujytE5wycfncDEmNnXJiUZ4s4oWL (tier-1 from demo_state).
  // If demo_state.counterparties[].asset shows a different canonical mint, use that.
  const payee = 'BTcgiDauqVHoGMiXujytE5wycfncDEmNnXJiUZ4s4oWL';
  const mint = (demoState && (demoState.mint || demoState.usdcMint || demoState.usdc_mint ||
                              (demoState.demo && (demoState.demo.mint || demoState.demo.usdcMint))))
    || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

  const payerAgent = (gateResults.parsed && gateResults.parsed.agentAsset) || TEST_PUBKEY;
  const simulateArgs = {
    caller: TEST_PUBKEY,
    payer_agent: payerAgent,
    payee_agent: payee,
    amount: '5000000', // 5 USDC at 6 decimals
    mint,
    policy_id: 1,
  };
  console.error('[gate] -> tools/call agenttrust_simulate_payment args=' + JSON.stringify(simulateArgs));
  let simulatePayload = null;
  try {
    const simRes = await send('tools/call', {
      name: 'agenttrust_simulate_payment',
      arguments: simulateArgs,
    });
    fs.writeFileSync(path.join(HERE, 'simulate-payment-raw.json'), JSON.stringify(simRes, null, 2));
    const { parsed: parsedSim, textContent: textContentSim } = extractParsed(simRes);
    simulatePayload = {
      isError: !!(simRes.result && simRes.result.isError),
      rawText: textContentSim,
      parsed: parsedSim,
      kind: parsedSim && (parsedSim.kind || parsedSim.decision || null),
      reasonName: parsedSim && (parsedSim.reasonName || parsedSim.reason_name || parsedSim.reason || null),
    };
  } catch (err) {
    simulatePayload = { error: err.message };
  }
  fs.writeFileSync(path.join(HERE, 'simulate-payment.json'), JSON.stringify(simulatePayload, null, 2));
  console.error('[gate] simulate result:');
  console.error(JSON.stringify(simulatePayload, null, 2));

  // Done — close gracefully
  child.stdin.end();
  setTimeout(() => {
    try { child.kill('SIGTERM'); } catch {}
    requestsLog.end();
    responsesLog.end();
    stderrLog.end();
    process.exit(0);
  }, 800);
})().catch((err) => {
  console.error('[gate] FATAL:', err && err.stack || err);
  try { child.kill('SIGTERM'); } catch {}
  setTimeout(() => process.exit(1), 500);
});
