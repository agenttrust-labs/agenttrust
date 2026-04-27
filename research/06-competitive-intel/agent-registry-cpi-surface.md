# Solana Agent Registry — CPI Surface Study

**Purpose:** Phase 1 of the Day-4 reframe attempt. The Q1 finding (Solana Agent Registry / 8004-Solana ships AgentTrust components 1+2 with Foundation endorsement) forced the question: *can a reframed AgentTrust consume Agent Registry's identity + reputation primitives via on-chain integration, and ship policy + mediation as the differentiated layer on top?* That requires a precise inventory of what the Registry exposes to downstream Solana programs. This file is that inventory.

**Scope:** Strictly factual technical reference. No competitive judgment — that lives in `agenttrust-reframe-decision.md`.

**Sources studied:**
- Cloned source: `github.com/QuantuLabs/8004-solana@main` (Anchor 0.31.1, MIT, 275 commits) — read in full: `lib.rs`, `identity/{state,instructions,contexts,events}.rs`, `reputation/{state,instructions,contexts,events,seal,chain}.rs`, `core_asset.rs`, `error.rs`, `constants.rs`
- README + DEPLOYMENT + CHANGELOG + docs/SEAL.md
- Mainnet program ID `8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ` confirmed; ATOM Engine `AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb`
- AGENTS.md (their dev guidelines) confirms 4-repo product surface: `8004-solana`, `8004-atom`, `8004-solana-indexer`, `agent0-ts-solana`
- Solana Foundation `solana.com/agent-registry` page + Quantu Labs site

Last verified: 2026-04-27

---

## 1 — Account structures (on-chain state per agent)

The 8004-Solana program uses **single-collection architecture** as of v0.6.0. Three categories of public PDAs are readable from any downstream Solana program.

### 1a — `RootConfig` — global registry config

Seeds: `["root_config"]` (singleton)
Owner: `agent-registry-8004` program

Fields:
| Field | Type | Purpose |
|-------|------|---------|
| `base_collection` | Pubkey | Metaplex Core collection address all agents belong to |
| `authority` | Pubkey | Protocol authority (registry init / upgrade) |
| `bump` | u8 | PDA bump seed |

Downstream consumers rarely need this; mostly relevant for indexing.

### 1b — `RegistryConfig` — per-collection config

Seeds: `["registry_config", collection.key()]`
One per collection (currently base collection only — extension collections planned in separate repo per AGENTS.md).

Fields: collection address + authority + bump. Same as RootConfig but per-collection scoped.

### 1c — `AgentAccount` — **the canonical per-agent on-chain identity record**

**This is the primary read target for any downstream policy program.**

Seeds: `["agent", asset.key()]` where `asset` = Metaplex Core NFT mint pubkey.
Owner: `agent-registry-8004` program.
Size: 313 bytes (v0.3.0 onward).

Fixed-offset fields (predictable for `memcmp` filtering):

| Offset | Field | Type | Notes |
|--------|-------|------|-------|
| 8 | `collection` | Pubkey | Collection this agent belongs to (filterable) |
| 40 | `creator` | Pubkey | Immutable creator snapshot at registration time |
| 72 | `owner` | Pubkey | Cached from Core asset (may be stale after external transfer) |
| 104 | `asset` | Pubkey | Metaplex Core NFT mint pubkey (canonical agent ID) |
| 136 | `bump` | u8 | PDA bump |
| 137 | `atom_enabled` | bool | **One-way flag — once true, agent's ATOM stats can be initialized** |
| 138 | `agent_wallet` | Option\<Pubkey\> | Agent's operational wallet (set via Ed25519 sig + 5-min deadline) |
| ... | `feedback_digest` | [u8; 32] | Rolling keccak hash chain of all feedback events |
| ... | `feedback_count` | u64 | Total feedback events seen |
| ... | `response_digest` | [u8; 32] | Rolling hash chain of response events |
| ... | `response_count` | u64 | |
| ... | `revoke_digest` | [u8; 32] | Rolling hash chain of revoke events |
| ... | `revoke_count` | u64 | |
| ... | `parent_asset` | Option\<Pubkey\> | Optional parent link (first-write-wins when locked) |
| ... | `parent_locked` | bool | |
| ... | `col_locked` | bool | Collection pointer lock |

Variable-length fields (last):
- `agent_uri` — String, max 250 bytes (IPFS / Arweave / HTTP, points to A2A agent card / capability declaration)
- `nft_name` — String, max 32 bytes
- `col` — String, max 128 bytes (canonical collection pointer, format `c1:<cid_norm>`)

**Read pattern for downstream programs:**
- Pass `AgentAccount` PDA as an `Account<'info, AgentAccount>` (if depending on `agent_registry_8004` crate as a dep) OR as `UncheckedAccount` and deserialize manually using the published IDL (`idl/` folder in repo).
- The 8-byte Anchor discriminator + offsets above are stable per the v0.6.0 layout. Field-ordering optimization landed in v0.2.1 specifically to enable downstream `memcmp` filtering.

### 1d — `MetadataEntryPda` — agent-attached arbitrary metadata

Seeds: `["agent_meta", asset.key(), key_hash[0..16]]` where `key_hash = SHA256(key)[0..16]`.
Owner: `agent-registry-8004` program.

Fields:
- `asset`, `immutable` (bool — locks entry forever), `bump`
- `metadata_key` (String, ≤32 bytes)
- `metadata_value` (Vec\<u8\>, ≤250 bytes — arbitrary binary)

**Reserved key** `agentWallet` is blocked — must use the `set_agent_wallet` instruction (which performs Ed25519 signature verification with 5-minute deadline window).

**Use for downstream consumers:** can store agent-specific policy hints, capability descriptors, jurisdictional attestations, etc. Immutable mode allows certified static metadata (e.g., "this agent is owned by Acme Inc., notarized 2026-Q1").

### 1e — `AtomStats` — **the trust-score state, lives in the separate ATOM Engine program**

Seeds: `["atom_stats", asset.key()]`
**Owner: `atom_engine` program** (`AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb` mainnet)
Size: 460 bytes per agent (~$0.82 rent at ~150 SOL/USD).

Fields (per CHANGELOG v0.4.0):

| Field | Type | Purpose |
|-------|------|---------|
| `collection` | Pubkey | Collection filter |
| `asset` | Pubkey | Agent identifier |
| `feedback_count` | u32 | Total feedbacks |
| `quality_score` | i32 | Weighted score (EMA — Exponential Moving Average) |
| `hll_packed` | [u8; 128] | HyperLogLog 256 registers, 4-bit packed — sybil resistance via unique-client estimation |
| `hll_salt` | u64 | Per-agent salt — prevents HLL grinding attacks |
| `recent_callers` | [u64; 24] | Ring buffer of 24 56-bit fingerprints — burst detection |
| `eviction_cursor` | u8 | Round-robin cursor for ring-buffer eviction |
| `trust_tier` | u8 (0–4) | **Cached output. The headline reputation primitive. Tiers: Unknown → … → Legendary** |
| `confidence` | u16 | Cached output |
| `risk_score` | u8 | Cached output |
| `diversity_ratio` | u8 | Cached output |
| `tier_candidate` | u8 | Tier vesting (8-epoch ~20-day delay) |
| `tier_candidate_epoch` | u32 | |
| `tier_confirmed` | bool | |

**Read pattern for downstream programs (POLICY GATING):**

To gate a transaction on "ATOM tier ≥ 3", a downstream Solana program would:

1. Pass `AtomStats` PDA as an `UncheckedAccount` (or typed if depending on `atom_engine` crate).
2. Verify `account.owner == atom_engine::ID` (security-critical).
3. Verify the PDA derivation matches `["atom_stats", asset.key()]`.
4. Deserialize manually using ATOM's IDL or by skipping the 8-byte discriminator + reading at known offsets.
5. Read `trust_tier`, `risk_score`, `diversity_ratio`, `confidence`.
6. Apply policy logic.

**No public read-CPI** is exposed by the ATOM Engine program. The only published CPIs are `update_stats` and `revoke_stats`, both authority-gated and called only by the Agent Registry program itself.

**Score update frequency:** ATOM stats update on every `give_feedback` call (CPI'd from Agent Registry). Tiers vest over 8 epochs (~20 days) before promotion takes effect — this is the "Tier Vesting" feature added in ATOM v0.2.0 "Fortress" specifically to mitigate flash-promotion attacks.

---

## 2 — Public instructions (the program's external API)

All instructions are publicly callable from any client. No CPI-only-internal instructions; the program is permissionlessly composable in principle, but several gates apply.

### 2a — Identity instructions

| Instruction | Signer | Effect |
|-------------|--------|--------|
| `initialize` | Authority only | One-time registry root config + base collection setup |
| `register(agent_uri)` | Anyone (paying ~0.006 SOL rent) | Creates `AgentAccount` + mints Metaplex Core NFT into base collection. ATOM enabled by default. |
| `register_with_options(agent_uri, atom_enabled)` | Anyone | Same as `register` but with explicit ATOM toggle |
| `enable_atom` | Owner | One-way enable of ATOM scoring for an existing agent |
| `set_metadata_pda(key_hash, key, value, immutable)` | Asset owner (verified via Metaplex Core) | Set arbitrary metadata. `immutable=true` locks it forever. |
| `delete_metadata_pda(key_hash)` | Asset owner | Delete (unless immutable) and recover rent |
| `set_agent_uri(new_uri)` | Asset owner | Updates agent_uri (capability declaration / A2A card pointer) |
| `sync_owner` | Anyone | Permissionless reconciliation of cached `owner` against live Metaplex Core state |
| `owner_of` | Anyone | Returns cached owner (may be stale) — **THIS IS A VIEW FUNCTION** |
| `core_owner_of` | Anyone | Returns authoritative live Metaplex Core owner — **VIEW FUNCTION** |
| `transfer_agent` | Owner | Transfers Core asset + auto-syncs owner |
| `set_agent_wallet(new_wallet, deadline)` | Owner + Ed25519 sig + ≤300s deadline | Sets agent's operational wallet |
| `set_collection_pointer(col)` / `_with_options(col, lock)` | First-writer | Canonical collection pointer (first-write-wins, optionally lock) |
| `set_parent_asset(parent_asset)` / `_with_options` | First-writer | Parent link (first-write-wins, optionally lock) |

### 2b — Reputation instructions

| Instruction | Signer | Gates |
|-------------|--------|-------|
| `give_feedback(value, value_decimals, score, feedback_file_hash, tag1, tag2, endpoint, feedback_uri)` | Any signer EXCEPT the agent's owner (anti-self-feedback `require!(core_owner != client.key())`) | If `atom_enabled` and `score.is_some()` and `atom_stats` initialized → CPI to `atom_engine::update_stats`. Score 0–100. ≤32-byte tags, ≤250-byte URI. |
| `revoke_feedback(feedback_index, seal_hash)` | Original feedback giver (implicit via seal_hash recompute requirement) | If ATOM initialized → CPI to `atom_engine::revoke_stats`. Recomputes original seal_hash to identify entry. |
| `append_response(client_address, feedback_index, response_uri, response_hash, seal_hash)` | **Permissionless** — any signer can append a response | The seal_hash binds response to original feedback. |

**Critical reputation note:** Feedback is **events-only**. The on-chain state stores ONLY the rolling hash chain (`feedback_digest`) + the count + the ATOM-derived metrics in `AtomStats`. To know what feedback *said*, downstream consumers must consume the `8004-solana-indexer` (Substreams + Supabase reference impl). The on-chain hash chain is verifiable but not browsable.

### 2c — There is NO `give_feedback`-from-program CPI

The agent registry's `give_feedback` requires a `client: Signer<'info>` and verifies `core_owner != client.key()`. A downstream Solana program calling `give_feedback` via CPI would have to provide a signer authority — possible via PDA-signed CPI, but the registry treats the PDA as the "client" identity. This means:

- A facilitator program CAN auto-emit feedback after each completed payment by using a program-owned signer PDA. The PDA becomes the "feedback author" — auditable on-chain.
- The hash-chain integrity is preserved.
- ATOM scoring updates on each programmatic feedback emission (assuming `atom_enabled`).

This is **load-bearing for AgentTrust-residual's x402 mediation component**: a payment facilitator can automatically rate counterparty agents based on payment success / dispute / settlement-time outcomes, programmatically.

---

## 3 — Events emitted (the canonical observation surface)

All state-changing instructions emit Anchor events. These are the canonical observation surface; downstream consumers should index events rather than poll PDAs for change-detection.

### 3a — Identity events

| Event | Fields (key) |
|-------|-------------|
| `RegistryInitialized` | `collection`, `authority` |
| `AgentRegistered` | `asset`, `collection`, `owner`, `atom_enabled`, `agent_uri` |
| `AtomEnabled` | `asset`, `enabled_by` |
| `MetadataSet` | `asset`, `immutable`, `key`, `value` |
| `MetadataDeleted` | `asset`, `key` |
| `UriUpdated` | `asset`, `updated_by`, `new_uri` |
| `AgentOwnerSynced` | `asset`, `old_owner`, `new_owner` |
| `WalletUpdated` | `asset`, `old_wallet`, `new_wallet`, `updated_by` |
| `WalletResetOnOwnerSync` | `asset`, `old_wallet`, `new_wallet`, `owner_after_sync` |
| `CollectionPointerSet` | `asset`, `set_by`, `col` |
| `ParentAssetSet` | `asset`, `parent_asset`, `parent_creator`, `set_by` |

### 3b — Reputation events

`NewFeedback` is the headline event for downstream consumers — it carries every metric derived from the feedback in one place:

| Field | Type |
|-------|------|
| `asset`, `client_address`, `feedback_index`, `slot` | Pubkey, Pubkey, u64, u64 |
| `value`, `value_decimals` | i128, u8 — raw metric (revenues, latency, yields, etc.) |
| `score` | Option\<u8\> — quality score 0–100 (drives ATOM) |
| `feedback_file_hash` | Option\<[u8; 32]\> — pointer to external file |
| `seal_hash` | [u8; 32] — on-chain-computed canonical hash (SEAL v1) |
| `atom_enabled` | bool |
| `new_trust_tier`, `new_quality_score`, `new_confidence`, `new_risk_score`, `new_diversity_ratio`, `is_unique_client` | Cached ATOM outputs at this slot |
| `new_feedback_digest`, `new_feedback_count` | Hash-chain state |
| `tag1`, `tag2`, `endpoint`, `feedback_uri` | Strings |

`FeedbackRevoked` mirrors the structure for revocations including ATOM impact metrics.

`ResponseAppended` records permissionless responses to feedback — useful for dispute-equivalents.

**Key implication for AgentTrust-residual:** A policy program that wants to react to reputation changes in near-real-time (e.g., trigger a kill-switch if `new_risk_score > threshold`) can subscribe to the indexer's event stream. For policy *gating* at transaction time, the program reads `AtomStats` PDA directly.

---

## 4 — SEAL v1 — what makes feedback tamper-evident

SEAL v1 (Solana Event Authenticity Layer, shipped 2026-01-30) computes `seal_hash` ON-CHAIN from feedback parameters using keccak256 over a canonical 36-byte fixed-prefix encoding + length-prefixed dynamic fields. Then a `leaf` binds the seal to context (asset, client, index, slot). Then a rolling `digest = keccak256(prev_digest || DOMAIN || leaf)` chains all events.

**Why this matters for AgentTrust-residual:**
- Any policy decision the system makes that cites a specific feedback entry can produce a verifiable proof: `(seal_hash, feedback_index, slot)` → re-computable from indexer event → matches on-chain digest.
- This means a regulated-enterprise integrator can audit-trace *why* an agent was kill-switched, all the way back to a specific feedback event, without trusting the indexer.
- AgentTrust-residual can ship policies that reference SEAL hashes as inputs ("if any feedback tagged `payment-fraud` exists in the last 100 events, deny the transfer") and produce verifiable audit trails for free.

---

## 5 — Integration story (per Quantu's published material)

### 5a — Active encouragement of downstream consumption

Strong YES. Every published artifact pushes toward downstream integration:

- **TypeScript SDK** (`agent0-ts-solana`) — full client library, npm-published.
- **Indexer reference impl** (`8004-solana-indexer`) — Substreams + Supabase, MIT.
- **Indexer enforces feedback integrity checks** — orphan revocation marking, seal_hash mismatch detection — meaning Quantu has thought through downstream-consumer needs.
- **Agent Studio** (`studio.qnt.sh`) — visual management interface.
- **MCP server integration** — agent-registry exposed as an MCP toolset for AI dev tools.
- **8004market.io marketplace** — third-party-integration showcase, currently 1,433 agents across 61 collections.
- **Foundation page (`solana.com/agent-registry`)** — official endorsement positions the registry as an open public-goods primitive intended to be consumed by ANY Solana program.

### 5b — License compatibility

**MIT.** Permissive — derivative works, commercial products, AGPL-incompatible-but-everything-else-compatible.

This is the same license posture as Solana Foundation's `solana-program/token-2022`. No friction for Mohit shipping a derivative work or a downstream consumer (e.g., a policy program that imports `agent_registry_8004` as a Cargo dependency to deserialize PDAs typed).

### 5c — Documented integration patterns

- README documents the program-IDs and PDA seeds enough for any downstream program to deserialize state.
- IDL files published in `idl/` for Anchor-aware tooling.
- AGENTS.md documents the 4-repo cross-validation pipeline (programs + indexer + SDK).
- No published example "downstream policy program" exists — this is open territory. Only the marketplace (`8004market.io`), the indexer (`8004-solana-indexer`), and the SDK (`agent0-ts-solana`) consume the registry today.

### 5d — Mainnet adoption signal

- **Mainnet program live** since at least 2026-03-04 (binary hash documented in README).
- **1,433 agents registered** (8004market.io public count at brief write-time).
- **PayAI listed as deployment supporter** in repo acknowledgements.
- **Foundation-endorsed** via solana.com/agent-registry page (which exists as of brief-write).
- **Cascade SATI Dashboard** integrated.

This is real but moderate. 1.4K agents is not "Privy-scale" but is well past "weekend-toy."

### 5e — What Quantu has explicitly NOT built (load-bearing for reframe)

- **Validation Registry archived for future upgrade.** v0.1.0 had it (multi-validator support). v0.5.0 removed it for simplification. The archived code lives in `src/_archive/validation/`. Per CHANGELOG: *"Validation module removed in v0.5.0 — planned for future upgrade."* This is **the ERC-8004 third leg that Quantu has not shipped on Solana**.
- **No policy-enforcement layer.** No kill-switch, no velocity cap, no allowlist, no jurisdictional gate, no transfer mediation. Pure read/write of identity + reputation primitives.
- **No payment integration.** No x402 facilitator, no transfer-hook companion, no payment-receipt-to-feedback automation.
- **No dispute resolution.** Responses can be appended permissionlessly but there is no on-chain arbitration or weighted-judgment surface.
- **No identity-aware policy DSL.** Downstream programs are expected to write their own logic.

---

## 6 — Summary table — what a downstream policy program can read / call

| Need | Source | Read pattern |
|------|--------|--------------|
| Agent identity (canonical, NFT-backed) | `AgentAccount` PDA at `["agent", asset]` | Direct deserialization (Anchor-typed if dep, manual if not) |
| Agent owner | `AgentAccount.owner` (cached) or call `core_owner_of` instruction | Direct read or VIEW instruction |
| Agent operational wallet | `AgentAccount.agent_wallet` | Direct read |
| Agent capability / A2A card | `AgentAccount.agent_uri` → fetch off-chain | URI fetch |
| Per-agent metadata | `MetadataEntryPda` at `["agent_meta", asset, key_hash[0..16]]` | Direct read (one PDA per key) |
| Trust tier (0–4) | `AtomStats.trust_tier` at `["atom_stats", asset]` in `atom_engine` program | Direct read with owner-program verification |
| Quality / risk / confidence / diversity scores | Same AtomStats PDA | Direct read |
| Feedback history | Indexer (events + Supabase REST) | Off-chain |
| Verifiable feedback proof | On-chain `feedback_digest` + indexer-served event | Hash-chain re-verification |
| Recent unique-feedback-givers fingerprint | `AtomStats.recent_callers` ring buffer | Direct read (24 entries) |

---

## 7 — Implications for AgentTrust reframe

This file is read-only on the technical surface. The reframe-design and decision live in their own files. But three load-bearing implications surface here:

1. **Reading identity + reputation as policy inputs is mechanically straightforward.** A new Anchor program can deserialize `AgentAccount` and `AtomStats` PDAs directly, gate transactions on `trust_tier`, `risk_score`, ownership, agent_uri attestations, and metadata. No CPI is required, just typed account passing.
2. **Auto-emitting feedback after a payment is also straightforward.** A facilitator program can call `give_feedback` via CPI using a program-owned signer PDA. This closes the loop: payment outcome → feedback → ATOM tier update → policy gate on next transaction.
3. **The Validation Registry niche is genuinely open.** Quantu has the architectural slot but archived their own code. A reframed AgentTrust could ship a Validation-Registry-equivalent layer (third-party validators issuing capability attestations) that integrates cleanly with the existing identity + reputation registries — and Foundation alignment is built-in because solana.com/agent-registry already references all three ERC-8004 registries as the trust stack.

These three implications feed Phase 2 (the reframed spec) and Phase 3 (the convergence/distinct decision).

---

## What this means for Mohit's submission

- **Mechanically, the integration is a 1-week design exercise, not a research problem.** Reading `AgentAccount` + `AtomStats` PDAs is a 50-line Anchor instruction; auto-feedback-emission via PDA-signed CPI is documented elsewhere in Solana program ecosystem (e.g., Squads, Jito); the SEAL v1 hash chain provides free auditability.
- **The integration story aligns cleanly with the Vibhu pressure-test outcome.** Foundation-endorsed Quantu primitive + Mohit's downstream policy + mediation = "the missing layer that completes the Foundation's trust stack." This is the strongest Foundation-aligned narrative AgentTrust-residual can stake.
- **MIT license + published IDL + indexer reference impl mean zero legal/architectural friction for a derivative or composing work.** Mohit can build on this without needing a partnership conversation Day-4.
- **The Validation Registry archival is the single most-leveraged finding here.** Quantu *built* it once, *removed* it for simplification, and *labeled it as planned for future upgrade*. A solo-shipped Validation Registry implementation in 17 days is technically credible (their archived code is reference material) and Foundation-narratively aligned (closes the ERC-8004 trinity). This is a separate path that Phase 2 should consider.
- **Day-5 reading order if Phase 3 returns DISTINCT:** Mohit reads this CPI-surface file BEFORE the reframed spec, because the spec's design decisions only make sense once the available primitives are clear.
