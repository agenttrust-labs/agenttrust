# AgentTrust demo video script — 0.4.x recording cut

**Status:** canonical. This script is the directive — not a checklist, not a transcript.
**Target package:** `@agenttrust-sdk/mcp@latest` (0.4.5+).
**Surfaces:** local install (full 21-tool surface, write tools sign with your keypair).
**Cluster:** Solana devnet, except Beat G which boots against mainnet.
**Runtime estimate:** ~6 minutes of footage at recording pace; faster on cuts.

---

## Pre-flight

Before the recorder hits play, confirm:

- A fresh Solana keypair is generated and funded (~0.2 SOL on devnet is plenty). Path: any keypair `solana-keygen` will pick up — the MCP layered resolver finds it via `KEYPAIR_B58` → `KEYPAIR_PATH` → `~/.config/solana/id.json` → `SOLANA_KEYPAIR_PATH`.
- Claude Code (or Claude Desktop) is configured with the AgentTrust MCP server. Same `mcp-config.json` shape used in `submission/e2e-demo-flow-2026-05-14/local-install/mcp-config.json`.
- Terminal panel visible alongside the chat — most beats reference an Explorer URL or PDA the viewer should see resolve on devnet.
- A second config (`mcp-config-mainnet.json`) is on hand for Beat G — `NETWORK=solana-mainnet`, `RPC_URL=https://api.mainnet-beta.solana.com`.

Open with the host saying: "AgentTrust ships 21 MCP tools that turn a Claude Code session into a fully signed, on-chain agent-payment cockpit. Let's bootstrap a brand-new agent and walk the full surface."

---

## Beat A — `tools/list` + version (21 tools)

**What this beat proves:** the local-install MCP boots, reports the expected package version, and surfaces all 21 tools in the right shape.

**Prompt to type into Claude Code (literal):**

> Call the MCP server and list every tool you have access to. Then call agenttrust_demo_state and tell me what server version and tool count you see.

**Expected output (structured):**

```json
{
  "serverInfo": { "name": "agenttrust", "version": "0.4.5" },
  "toolCount": 21,
  "categories": {
    "read": 10,
    "write": 8,
    "discovery": 3
  }
}
```

The model should name the 10 read tools, 8 write tools, and 3 discovery tools without prompting.

**Screenshot cue:** capture the tools list as Claude renders it inline.

**Narration (one sentence):** "Twenty-one tools wired into Claude in one config block — ten read, eight write, three discovery — signed against your own keypair."

---

## Beat B — `init_policy` self-heal (HEADLINE)

**What this beat proves:** a single `init_policy` call against a fresh wallet, with `agent_asset` omitted, generates an ephemeral MPL Core asset, self-heals four AgentTrust + Quantu PDAs, and lands `PolicyAccount` + `VelocityLedger` — all in one atomic devnet tx with `healedSteps = ["register_agent_via_cpi", "init_authority", "init_killswitch"]`.

**Prompt to type into Claude Code (literal):**

> Use agenttrust_init_policy to bootstrap a brand-new agent for me. Omit agent_asset so the tool generates a fresh identity. Set policy_id to 1, enable Spending only (bitmask 2), and cap per-transaction spend at 1 USDC. Show me the agentAsset, the policyPda, and the healedSteps array.

**Expected output (structured):**

```json
{
  "txSignature": "2fmKhYuM…2UV",
  "explorerTxUrl": "https://explorer.solana.com/tx/2fmKhYuM…2UV?cluster=devnet",
  "agentAsset": "2v7Bu6yhw7mkXtdjLXoVfBNz3CDs8n79aRD9gzumvF97",
  "agentAssetExplorer": "https://explorer.solana.com/address/2v7Bu6yhw7mkXtdjLXoVfBNz3CDs8n79aRD9gzumvF97?cluster=devnet",
  "policyPda": "<policy PDA>",
  "policyExplorer": "https://explorer.solana.com/address/<policy PDA>?cluster=devnet",
  "velocityPda": "<velocity PDA>",
  "effectiveSpending": { "perTxMax": "1000000", "dailyMax": "1000000", "weeklyMax": "1000000" },
  "selfHealed": true,
  "healedSteps": ["register_agent_via_cpi", "init_authority", "init_killswitch"]
}
```

**Screenshot cue:** open the `explorerTxUrl` in a second monitor and pause on the 7 program logs in order — `RegisterAgentViaCpi → RegisterWithOptions → CreateV2 → InitializeStats → InitAuthority → InitKillswitch → InitPolicy`. This is the single-bootstrap proof shot.

**Narration (one sentence):** "One prompt — and the runtime materialises a brand-new agent identity, registers it against Quantu, sets up the authority and kill-switch, and lands the first policy. All in one signed transaction. No bootstrap script."

---

## Beat C — `simulate_payment` Deny then Allow

**What this beat proves:** the policy created in Beat B actually fires under load, returns a typed `GateDecision`, and flips from `Deny` to `Allow` when the simulated amount drops below the per-tx cap.

**Prompt 1 (Deny):**

> Use agenttrust_simulate_payment to simulate a 5 USDC payment from the agent we just bootstrapped to the tier-0 demo counterparty from agenttrust_demo_state. Policy 1. What does the gate decide?

**Expected output 1:**

```json
{
  "kind": "Deny",
  "reasonCode": 2,
  "reasonName": "SpendingPerTxExceeded"
}
```

**Prompt 2 (Allow flip):**

> Now drop the amount to 0.5 USDC against the same counterparty and policy 1. Run the gate again.

**Expected output 2:**

```json
{
  "kind": "Allow"
}
```

**Screenshot cue:** show both decisions side-by-side in the chat scrollback. The flip is the visual.

**Narration (one sentence):** "The gate's a real on-chain decision — five USDC denies on the per-tx cap, half a USDC flips to Allow. Same call path the facilitator hits in `/verify`."

---

## Beat D — `register_namespace` + `register_attestor` + `request_validation`

**What this beat proves:** the ValidationRegistry write surface — three new write tools introduced in 0.4.x — lands a real capability namespace, attestor profile, and validation request in three signed devnet txs.

**Prompt to type into Claude Code (literal):**

> Use agenttrust_register_namespace to register a new capability namespace called "kyc/level1" — make me the issuer. Then use agenttrust_register_attestor to register me as the attestor for that namespace, with an endpoint URL "https://attestor.example/kyc". Then call agenttrust_request_validation to request a kyc/level1 attestation on the agent we bootstrapped in Beat B. Use a 30-day deadline. Show me each tx signature and the resulting PDAs.

**Expected outputs (three structured envelopes in sequence):**

1. `register_namespace` returns `namespacePda`, `namespaceHashHex`, `txSignature`.
2. `register_attestor` returns `attestorProfilePda`, `txSignature`.
3. `request_validation` returns `validationRequestPda`, `capabilityHashHex`, `txSignature`.

**Screenshot cue:** open all three Explorer txs in tabs; pause briefly on each to show the program signature on `Cx4RFa6ysw3qXYhugPkF8pFSWBkmKq59h2dWgF2tKhtv` (the ValidationRegistry program ID).

**DX note for the recorder:** register the full slash-path `kyc/level1` as the namespace, not the parent `kyc`. Each full capability name SHA-256-hashes to its own namespace; registering `kyc` does not cover `kyc/level1`. If the recording hits an AnchorError 3012 because someone registered just `kyc`, recover by re-running `register_namespace` against `kyc/level1` directly.

**Narration (one sentence):** "Three calls — namespace, attestor, request — and we've stood up the third ERC-8004 leg from scratch. ValidationRegistry productised."

---

## Beat E — `respond_to_validation`

**What this beat proves:** the attestor (us, from Beat D) actually signs the attestation and PolicyVault's `RequireValidation` path now has a real `ValidationAttestation` PDA to read against.

**Prompt to type into Claude Code (literal):**

> Use agenttrust_respond_to_validation to attest yes against the validation request from Beat D. Give the attestation a one-year expiry. Show me the ValidationAttestation PDA and its tx signature.

**Expected output:**

```json
{
  "txSignature": "Lv3WSu5…pir",
  "explorerTxUrl": "https://explorer.solana.com/tx/Lv3WSu5…pir?cluster=devnet",
  "attestationPda": "5R1Wo9VqyDDKLPTsGVQisM66nsPL7majjxiLwbqA1hbP",
  "verdict": "yes",
  "expiresAtSlot": "<unix slot one year from now>"
}
```

**Screenshot cue:** open the `attestationPda` in the Solana Explorer, show the 290 bytes of state owned by the ValidationRegistry program.

**Narration (one sentence):** "The attestor signs — and the ValidationAttestation PDA is what PolicyVault's `RequireValidation` policy reads to flip a Deny back to Allow."

---

## Beat F — `emit_feedback` (post-0.4.5 fix)

**What this beat proves:** `emit_feedback` lands a TrustGate → AgentRegistry PDA-signed CPI, writes a `FeedbackEmissionLog` PDA, and updates Quantu's `AtomStats`. This was the headline regression from the 2026-05-14 gate (B-001 — the MCP tool was missing the AgentRegistry program from `remainingAccounts`); the 0.4.5 fix appends it unconditionally.

**Prompt to type into Claude Code (literal):**

> Use agenttrust_emit_feedback to write a positive feedback log against the tier-3 demo counterparty from agenttrust_demo_state, on behalf of our facilitator. Score 80, tag1 "demo", endpoint "demo.agenttrust.tech", feedback_uri "https://demo.agenttrust.tech/feedback/sample". Use any 32-byte hex string as the payment_id_hash. Show me the FeedbackEmissionLog PDA and its on-chain owner.

**Expected output (structured):**

```json
{
  "txSignature": "<finalized tx>",
  "explorerTxUrl": "https://explorer.solana.com/tx/<sig>?cluster=devnet",
  "feedbackLogPda": "<FeedbackEmissionLog PDA>",
  "feedbackLogExplorer": "https://explorer.solana.com/address/<PDA>?cluster=devnet",
  "score": 80,
  "tag1": "demo"
}
```

The tx should finalize cleanly — no `Unknown program 8oo4J9tB…` log, which is the smoking gun of the pre-0.4.5 chain bug.

**Screenshot cue:** open the `feedbackLogExplorer` to show the PDA is owned by the TrustGate program (`HF8zHfoyA7b5mhLViopTnRMprc6ZT5KActHTdkFrih2N`). Then open the Quantu `atom_stats` PDA of the tier-3 counterparty in a second tab and show the new feedback was applied.

**Narration (one sentence):** "Feedback writes a TrustGate-owned log and CPIs into Quantu's `give_feedback` — closes the loop on every settled payment."

---

## Beat G — `get_quantu_reputation` on mainnet

**What this beat proves:** the MCP server boots cleanly against `NETWORK=solana-mainnet` and Quantu reads work against mainnet without requiring the AgentTrust program IDs (which aren't deployed there yet). The 0.3.x boot-blocker is closed.

**Pre-step (off-camera or quick cut):** swap the MCP config to the mainnet variant. `mcp-config-mainnet.json` differs only in `NETWORK` and `RPC_URL`.

**Prompt to type into Claude Code (literal):**

> You're now on mainnet. Use agenttrust_get_quantu_reputation to look up the agent_account for pubkey BTcgiDauqVHoGMiXujytE5wycfncDEmNnXJiUZ4s4oWL. Tell me whether it exists and what tier it reports.

**Expected output (structured):**

```json
{
  "pda": "E6aheSdS51YJQUCXre4CagHevV444iJdNS7J4L9kjH61",
  "explorerUrl": "https://explorer.solana.com/address/E6aheSdS51YJQUCXre4CagHevV444iJdNS7J4L9kjH61",
  "exists": false,
  "ownerProgram": null,
  "ownerExpected": "AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb",
  "ownerMatches": false,
  "rawByteLen": 0
}
```

A clean structured envelope. The boot also emits a `WARN` to stderr explaining which tools work on mainnet (Quantu reads) and which don't (AgentTrust writes). Capture that WARN if you can.

**Screenshot cue:** the Explorer URL resolves on mainnet (note the lack of `?cluster=devnet`).

**Narration (one sentence):** "Quantu reads run cleanly against mainnet — the same MCP server, same prompt shape, just a different RPC."

---

## Beat H — counterparty-not-registered envelope

**What this beat proves:** when the policy under test enables `KIND_CounterpartyTier` (bitmask 8), `simulate_payment` against a fake counterparty short-circuits with a structured `counterparty_not_registered` envelope — specific errorCode, named pubkey, structured details, actionable hint — and the LLM produces clean recovery prose against it.

**Pre-step:** the policy from Beat B was Spending-only (bitmask 2), so `gate_payment` never looks up the payee's `agent_account` and the envelope wouldn't fire. Before Beat H, upgrade the policy. Since v1 policies are immutable post-init, create a new policy under the same agent:

**Prompt 1 (upgrade — type into Claude Code, literal):**

> Use agenttrust_init_policy to create policy 2 for the agent we bootstrapped in Beat B. Enable Spending AND CounterpartyTier (bitmask 2 + 8 = 10). Per-tx cap 1 USDC. Minimum counterparty tier 1. Show me the new policyPda.

**Expected output 1:** standard `init_policy` envelope, `healedSteps: []` (the agent is already bootstrapped), `policyPda` is policy 2's PDA.

**Prompt 2 (the envelope fire — type into Claude Code, literal):**

> Now use agenttrust_simulate_payment to simulate a 0.1 USDC payment from our agent to the pubkey AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA, against policy 2. What does the gate say?

**Expected output 2 (structured envelope):**

```json
{
  "errorCode": "counterparty_not_registered",
  "message": "Counterparty AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA is not registered in the Quantu agent registry.",
  "hint": "Ask the counterparty to register via TrustGate (any tool that calls `init_policy` will do so as part of its bootstrap), or pick a counterparty from `agenttrust_demo_state.counterparties` for testing.",
  "cause": "simulation failed: \"AccountNotFound\"",
  "details": {
    "counterparty_pubkey": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "missing_account_kind": "quantu_agent_account"
  }
}
```

The LLM should then explain in plain language that the payee has no Quantu agent_account and recommend either picking a counterparty from `agenttrust_demo_state.counterparties` or having the counterparty bootstrap via `init_policy`.

**Screenshot cue:** capture the entire structured envelope side-by-side with the LLM's recovery prose. This is the "well-formed error envelope" proof shot.

**Narration (one sentence):** "Pay an unregistered counterparty under a CounterpartyTier policy — and the runtime returns a typed envelope: the offending pubkey, the missing account kind, the recovery hint. The LLM reads it and explains exactly what to do next."

---

## Wrap

Host's close (recorder reads to camera): "Twenty-one tools, eight signed write paths, two read-only surfaces. One bootstrap call generates an agent identity, registers it with Quantu, configures policy, and lands feedback — all under one keypair, all on-chain, all in one Claude Code session. AgentTrust completes the ERC-8004 trust stack on Solana."

End card: links to `docs.agenttrust.tech`, `github.com/agenttrust-labs/agenttrust`, `npm i @agenttrust-sdk/trustgate`.

---

## Recording checklist (for the operator, not for camera)

- [ ] Wallet funded with ≥0.2 SOL on devnet before Beat A.
- [ ] Wallet funded with ≥0.0 SOL on mainnet for Beat G (the read is free; no signed tx).
- [ ] `mcp-config.json` (devnet) and `mcp-config-mainnet.json` both validated against `npx -y @agenttrust-sdk/mcp@latest` before the take.
- [ ] Explorer tab pre-opened to `https://explorer.solana.com/` so Beat B's tx URL renders fast.
- [ ] Quantu `atom_stats` PDA for the tier-3 demo counterparty (`4z9RiK6B49QZbmqPM9yNZWgfxYD3tvQ3NETU6X89f5mv`) bookmarked for Beat F's before/after shot.
- [ ] Audio levels checked — narration is one-sentence-per-beat, not an essay.
- [ ] Each beat captured as a separate take if needed; the final cut should run continuously without jump-cuts mid-tool-call.
