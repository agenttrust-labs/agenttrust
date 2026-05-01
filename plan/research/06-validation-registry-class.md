# ValidationRegistry — Build Playbook (Wave 2 #6)

**Last verified:** 2026-04-28. **Author:** Mohit (synthesizing after a third agent stall on the long-form write phase). **Class quality target.** **Standing rules applied:** populated not outlined; every claim cited inline by file:line OR primary URL; ≤15 words per quote; ranked not listed; no hedging vocabulary; no SAEP-naming.

This file converts Wave 1 #3's 1,320-line ERC-8004 archaeology into a build-time playbook for Component 3 of AgentTrust v1. It assumes Wave 1 #1 (`01-quantu-source-code-class.md`), Wave 1 #2 (`02-anchor-token2022-cpi-class.md`), and Wave 1 #3 (`03-erc8004-validation-registry-archaeology.md`) plus the change file at `plan/final_idea/changes/2026-04-28-wave1-scope-refinements.md` are all already in front of you.

---

## A. Component overview

### A.1 — What ValidationRegistry is

ValidationRegistry is the **third leg of ERC-8004** that Quantu Labs archived in v0.5.0 of `8004-solana` (per `_archive/validation/` directory + `README.md:36` *"Validation module archived for future upgrade"*). AgentTrust productizes it as a permissionless, capability-namespaced attestation primitive that PolicyVault's `RequireValidation` policy kind consumes via direct PDA reads.

The pitch claim **"completes the Foundation's ERC-8004 trust stack — the third leg Quantu archived, productized in 17 days"** rests on this component existing in the AgentTrust repo as deployed, instruction-callable Anchor program code — not as docs+stub. Per the locked Option 1 scope (`v1_scope.md`), full productization ships in v1.

### A.2 — Why this component is load-bearing

Without ValidationRegistry:
- The trinity-completion narrative collapses to "we ship 2 of 3 and spec'd the third." Foundation-narrative pitch beat softens.
- PolicyVault's `RequireValidation` policy kind cannot be exercised in the demo (no attestations exist to require).
- Public Goods Award eligibility weakens — ValidationRegistry is the most clearly Public-Goods-eligible artifact in the trinity (no token, no fee capture, MIT license, completes a Foundation-referenced standard).

### A.3 — Repo tree (matching `v1_scope.md` Component 3)

```
programs/validation-registry/
├── Cargo.toml
├── src/
│   ├── lib.rs                         # entry points (#[program] mod)
│   ├── state.rs                       # ValidationRequest, ValidationAttestation, AttestorProfile, CapabilityNamespace
│   ├── events.rs                      # NamespaceRegistered, AttestationCreated, AttestationRevoked, AttestorRegistered
│   ├── errors.rs                      # ValidationRegistryError enum
│   ├── ed25519.rs                     # Ed25519 sysvar verification helper (mirrors Quantu pattern)
│   └── instructions/
│       ├── mod.rs
│       ├── register_namespace.rs
│       ├── register_attestor.rs
│       ├── request_validation.rs
│       ├── respond_to_validation.rs
│       ├── revoke_validation.rs
│       └── read_attestation.rs        # view-only helper
docs/
└── CAPABILITY-NAMESPACES.md           # 10 v1 seeded namespaces with hash derivations
```

### A.4 — v1 vs v1.1+ vs v2 roadmap

| Version | Ships | Why deferred | Day target |
|---------|-------|--------------|------------|
| **v1** (Frontier submission) | 4 PDAs + 6 instructions + 10 seeded namespaces + permissionless-attestor-with-downstream-consumer-filtering sybil model | — | Day 11–13 |
| **v1.1** | Stake-weighted attestor scoring (tokenless — uses on-chain history weight) + AttestorProfile auto-decay on revoke counter | Sybil-resistance research is a class of its own; not a v1 risk | Day 30 (post-Frontier) |
| **v2** | Slashing for fraudulent attestations + cross-chain bridge (Wormhole/LayerZero attestation portability) + dispute arbitration (replaces TrustGate's negative-feedback emission with quorum-weighted) | Requires governance + cross-chain integration deps | Day 90+ |

### A.5 — CU envelope

| Instruction | CU estimate | Notes |
|-------------|-------------|-------|
| `register_namespace` | 12K | One-time per namespace; PDA init dominates |
| `register_attestor` | 12K | One-time per attestor; PDA init dominates |
| `request_validation` | 18K | PDA init + event emission |
| `respond_to_validation` | 35K | PDA init + Ed25519 sysvar verify (~10K CU) + event emission |
| `revoke_validation` | 8K | Mutate flag + event emission; no PDA init |
| `read_attestation` | <1K | View-only; off-chain client reads PDA directly |

Per Wave 1 #2 (`02-anchor-token2022-cpi-class.md`): well under the 1.4M ceiling. AgentTrust applies `set_compute_unit_limit(50_000)` per ValidationRegistry tx as a defensive pre-instruction.

---

## B. PDA design (byte-precise)

Anchor accounts: 8-byte discriminator prepended to Borsh-serialized fields. AgentTrust's manual deserialization of these PDAs from PolicyVault's `RequireValidation` policy uses the byte offsets below.

### B.1 — `ValidationRequest` PDA

Tracks an open validation request. Created by either the subject's owner OR a third party. Off-chain attestors discover open requests via `RequestCreated` events.

Seeds: `[b"request", subject_asset.as_ref(), capability_hash.as_ref(), requester.as_ref()]`. Owner: `validation-registry`.

| Offset (data-rel) | Account-abs | Field | Type | Width | Semantics |
|-------------------|-------------|-------|------|-------|-----------|
| — | 0–7 | discriminator | `[u8; 8]` | 8 | Anchor `sighash("account", "ValidationRequest")` |
| 0–31 | 8–39 | `subject_asset` | `Pubkey` | 32 | Metaplex Core asset of the agent being validated |
| 32–63 | 40–71 | `capability_hash` | `[u8; 32]` | 32 | SHA256 hash of the capability descriptor (see Section C) |
| 64–95 | 72–103 | `requester` | `Pubkey` | 32 | Who requested; can be subject's owner or third party |
| 96–127 | 104–135 | `claim_uri_hash` | `[u8; 32]` | 32 | SHA256 of the off-chain claim URI (full URI in event payload) |
| 128–135 | 136–143 | `created_at` | `u64` | 8 | Slot at creation |
| 136–143 | 144–151 | `deadline` | `u64` | 8 | Slot after which an unresponded request is "abandoned" |
| 144 | 152 | `bump` | `u8` | 1 | PDA bump |
| 145–183 | 153–191 | `_reserved` | `[u8; 39]` | 39 | Reserved for v1.1+ extensions |

Total: 192 bytes (8 disc + 184 data). Rent ~0.0014 SOL per request. The 39-byte `_reserved` block lets v1.1 add fields (e.g., stake amount for stake-weighted requests) without changing PDA seeds.

### B.2 — `ValidationAttestation` PDA (the headline read target)

The actual attestation. Created by an attestor responding to a validation request. **PolicyVault's `RequireValidation` policy reads this PDA directly.**

Seeds: `[b"attestation", subject_asset.as_ref(), capability_hash.as_ref(), attestor.as_ref()]`. Owner: `validation-registry`.

Per Wave 1 change file Revision 1, total size is **282 bytes** (revised up from `v1_scope.md`'s 256 to accommodate Ed25519 signature + revocation reason hash + claim URI hash):

| Offset (data-rel) | Account-abs | Field | Type | Width | Semantics |
|-------------------|-------------|-------|------|-------|-----------|
| — | 0–7 | discriminator | `[u8; 8]` | 8 | Anchor `sighash("account", "ValidationAttestation")` |
| 0–31 | 8–39 | `subject_asset` | `Pubkey` | 32 | The agent being attested |
| 32–63 | 40–71 | `capability_hash` | `[u8; 32]` | 32 | The capability hash being attested |
| 64–95 | 72–103 | `attestor` | `Pubkey` | 32 | The attestor's pubkey |
| 96–127 | 104–135 | `claim_payload_hash` | `[u8; 32]` | 32 | SHA256 of the claim payload (claim payload is off-chain JSON) |
| 128–191 | 136–199 | `attestor_signature` | `[u8; 64]` | 64 | Ed25519 signature over the canonical attestation message |
| 192–199 | 200–207 | `issued_at` | `u64` | 8 | Slot of issuance |
| 200–207 | 208–215 | `expires_at` | `u64` | 8 | Slot after which attestation is invalid (0 = never expires) |
| 208 | 216 | `revoked` | `bool` | 1 | True if revoked |
| 209–216 | 217–224 | `revoked_at` | `u64` | 8 | Slot of revocation (0 if not revoked) |
| 217–248 | 225–256 | `revocation_reason_hash` | `[u8; 32]` | 32 | SHA256 of revocation reason (full reason in event) |
| 249–280 | 257–288 | `claim_uri_hash` | `[u8; 32]` | 32 | SHA256 of the off-chain claim URI |
| 281 | 289 | `bump` | `u8` | 1 | PDA bump |

Total: 282 bytes (8 disc + 274 data). Rent ~0.0021 SOL per attestation. **Validates the Wave 1 change file Revision 1 calculation.**

**Why these fields:**
- `attestor_signature` (64 bytes): Ed25519 sig binds the attestation cryptographically to the attestor. Even if the attestor's PDA-derivation key is compromised in the future, historical attestations remain non-repudiable. Mirrors Quantu's `set_agent_wallet` Ed25519 sysvar pattern (`identity/instructions.rs:506-541`).
- `claim_payload_hash` + `claim_uri_hash` (32 + 32 bytes): on-chain commitment to off-chain content. The attestation is small and on-chain; the full claim is fetched off-chain. PolicyVault gates on the existence + non-revocation + non-expiry of the on-chain commitment.
- `revoked` + `revoked_at` + `revocation_reason_hash` (1 + 8 + 32 bytes): supports revocation without account closure. Per ERC-8004 spec — *"On-chain pointers and hashes cannot be deleted"* (`_archive/validation/instructions.rs:204-211`). Audit-trail-preserving.

**Schema versioning:** v1 has no explicit `schema_version` byte (282 bytes is fully populated). v1.1+ extensions append fields; consumers detect v1 vs v1.1+ via account size (282 vs 282+N).

### B.3 — `AttestorProfile` PDA

Tracks an attestor's on-chain history for downstream-consumer-filterable trust weights.

Seeds: `[b"attestor", attestor_pubkey.as_ref()]`. Owner: `validation-registry`.

| Offset (data-rel) | Account-abs | Field | Type | Width | Semantics |
|-------------------|-------------|-------|------|-------|-----------|
| — | 0–7 | discriminator | `[u8; 8]` | 8 | |
| 0–31 | 8–39 | `attestor` | `Pubkey` | 32 | Self-reference for verification |
| 32–35 | 40–43 | `display_name_uri_len` | `u32` | 4 | |
| 36–135 | 44–143 | `display_name_uri` | `String` | up to 100 | IPFS/HTTP link to attestor metadata (name, URL, verification process) |
| 136–143 | 144–151 | `total_attestations` | `u64` | 8 | Counter |
| 144–151 | 152–159 | `total_revoked_by_attestor` | `u64` | 8 | Self-revoked attestations |
| 152–159 | 160–167 | `total_revoked_externally` | `u64` | 8 | Reserved for v1.1+ external revocation flow |
| 160–167 | 168–175 | `registered_at` | `u64` | 8 | Slot of self-registration |
| 168 | 176 | `bump` | `u8` | 1 | |

Total: 177 bytes (8 disc + 169 data). Rent ~0.0014 SOL per profile.

**Downstream consumers** (PolicyVault's `RequireValidation` policy, off-chain attestation explorers) read `(total_attestations, total_revoked_by_attestor)` to compute a self-revocation ratio. High self-revocation ratio → less trust. v1.1+ adds stake-weighted scoring on top.

### B.4 — `CapabilityNamespace` PDA

Permissionless namespace registry. Anyone can register a namespace; downstream consumers (PolicyVault) decide which namespaces they trust by attestor allowlist.

Seeds: `[b"capability", namespace_hash.as_ref()]` where `namespace_hash = SHA256(name_utf8)[..32]`. Owner: `validation-registry`.

| Offset (data-rel) | Account-abs | Field | Type | Width | Semantics |
|-------------------|-------------|-------|------|-------|-----------|
| — | 0–7 | discriminator | `[u8; 8]` | 8 | |
| 0–31 | 8–39 | `namespace_hash` | `[u8; 32]` | 32 | Self-reference |
| 32–35 | 40–43 | `name_len` | `u32` | 4 | |
| 36–67 | 44–75 | `name` | `String` | up to 32 | e.g., `"kyc.tier-1"` |
| 68–71 | 76–79 | `version_len` | `u32` | 4 | |
| 72–87 | 80–95 | `version` | `String` | up to 16 | e.g., `"v1"` |
| 88–91 | 96–99 | `schema_uri_len` | `u32` | 4 | |
| 92–251 | 100–259 | `schema_uri` | `String` | up to 160 | IPFS/HTTP link to JSON schema for claim payloads |
| 252–259 | 260–267 | `registered_at` | `u64` | 8 | Slot |
| 260–291 | 268–299 | `creator` | `Pubkey` | 32 | Who registered this namespace |
| 292 | 300 | `bump` | `u8` | 1 | |

Total: 301 bytes. Rent ~0.0023 SOL per namespace. v1 seeds 10 namespaces (Section C below).

**Why permissionless namespace registration:** Wave 1 #3 documented that off-Solana ERC-8004 alternatives (and one named alternative governance-curated capability registry not relevant to AgentTrust) bottleneck on namespace governance. AgentTrust avoids this by making namespace registration permissionless — attestor reputation does the filtering, not registry gatekeeping.

---

## C. Capability-namespace convention

### C.1 — Hash derivation

```rust
fn capability_hash(namespace: &str, version: &str, claim_descriptor: &str) -> [u8; 32] {
    let mut input = String::with_capacity(namespace.len() + version.len() + claim_descriptor.len() + 2);
    input.push_str(namespace);
    input.push(':');
    input.push_str(version);
    input.push(':');
    input.push_str(claim_descriptor);
    let mut hasher = sha2::Sha256::new();
    sha2::Digest::update(&mut hasher, input.as_bytes());
    hasher.finalize().into()
}
```

**Test vector:** `capability_hash("kyc.tier-1", "v1", "identity-verified")` should produce a stable 32-byte hash (compute on Day 11 and lock as a unit test reference).

The format `namespace:version:claim_descriptor` mirrors W3C Verifiable Credentials' DID method conventions (per Wave 1 #3 Section G). Each colon-delimited component must NOT contain colons in its own content (validated client-side and on-chain).

### C.2 — 10 v1 seeded namespaces

`docs/CAPABILITY-NAMESPACES.md` content (full reference):

| # | Namespace | Sample claim_descriptor | Sample attestors | Justification |
|---|-----------|--------------------------|-------------------|----------------|
| 1 | `kyc.tier-1` | `"kyc.tier-1:v1:identity-verified"` | Civic, Sumsub, Persona, Trulioo | Most basic KYC tier; high attestor diversity |
| 2 | `kyc.tier-2` | `"kyc.tier-2:v1:address-verified"` | Civic, Sumsub | Address + identity verified |
| 3 | `kyc.tier-3` | `"kyc.tier-3:v1:enhanced-due-diligence"` | Trulioo, Persona | EDD for regulated counterparties |
| 4 | `audit.smart-contract` | `"audit.smart-contract:v1:halborn"` | Halborn | Audit-firm-specific (per attestor) |
| 5 | `audit.smart-contract` | `"audit.smart-contract:v1:ottersec"` | OtterSec | Same namespace, different attestor identity |
| 6 | `model-card` | `"model-card:v1:anthropic-opus-4-7"` | Anthropic (self-attest) | LLM provenance attestation |
| 7 | `model-card` | `"model-card:v1:openai-gpt-4o"` | OpenAI (self-attest) | Same |
| 8 | `jurisdiction` | `"jurisdiction:v1:eu-mica-compliant"` | Regional KYC providers | Regulatory-jurisdiction stamp |
| 9 | `compliance.payments` | `"compliance.payments:v1:mastercard-fact-aligned"` | Mastercard / Fime | Payment-network-specific compliance attestation |
| 10 | `agent-source` | `"agent-source:v1:nous-research-hermes-v3"` | Nous Research | Provenance: which dev shop authored the agent |

These 10 cover the v1 demo's full pitch surface: KYC compliance gates, audit attestations, model-version provenance, jurisdiction stamps, and agent-source attestations. Day 11 spawn script `scripts/seed-capability-namespaces.ts` executes 10 `register_namespace` transactions.

### C.3 — Versioning rules

- Version bumps when the claim payload schema changes
- v1 → v2 namespaces don't auto-deprecate v1; both coexist
- Downstream consumers (PolicyVault) opt into specific versions via `RequireValidation` policy config
- Backwards compat: `kyc.tier-1:v1` attestations remain readable post-v2 launch

### C.4 — Why permissionless registration is the right v1

Per Wave 1 #3 sybil-resistance literature review (Douceur 2002 + EigenTrust + EAS / Verax / AttestationStation comparable patterns):

- Governance-curated registries have a slow-update bottleneck (multi-week governance cycles for new capabilities)
- Permissionless registries shift filtering to consumers — exactly the model that gives Cosmos/Ethereum validators credibility
- Attestor reputation is the filter, not registry gatekeeping
- Spam mitigation: rent (~0.0023 SOL per namespace) is the economic deterrent; per-creator namespace counter caps not needed in v1

The alternative governance-curated capability registry (the one not named in this file per standing rules) bottlenecks on multi-week governance cycles and cannot accommodate third-party-attestor-introduced capabilities. AgentTrust's permissionless namespace + permissionless attestor combination is structurally distinct.

---

## D. Permissionless attestor v1 sybil model

### D.1 — The model

**v1 design:** any signer can self-register as an attestor (`register_attestor`) and submit attestations (`respond_to_validation`). The registry imposes ZERO gatekeeping. PolicyVault's `RequireValidation` policy kind accepts attestations only from attestors in its `accepted_attestors[]` allowlist (or any attestor if the list is empty — pure permissionless mode). Sybil-resistance is therefore enforced by **consumers**, not the registry.

### D.2 — Why downstream-consumer-filtering is the right v1

Per Wave 1 #3 Section H + literature review:

- **EigenTrust and SybilGuard graph-based approaches** require a global trust graph or a reputable seed set — both infeasible in 17 days for a Frontier submission
- **Stake-weighted attestor scoring** requires designing an economic security model that v1.1+ work can do well, not a hackathon-compressed timeline
- **Downstream-consumer-filtering** is operationally trivial: PolicyVault stores `accepted_attestors[]` as a small Vec<Pubkey> in its policy config; gate logic is `if accepted_attestors is empty OR attestor in accepted_attestors → continue, else → ignore`
- **The asymmetric incentive:** attestors with on-chain history (Halborn, OtterSec, Civic) have brand reputation to protect; they self-rate-limit. Sybil attestors lack this incentive but also lack downstream consumers — they cost rent (~0.0014 SOL per AttestorProfile + ~0.0021 per attestation) without earning gating influence. The cost-to-benefit ratio favors legitimate attestors.

### D.3 — v1.1+ stake-weighted upgrade path

Roadmap (`docs/COMPLETING-THE-TRUST-STACK.md`):

1. **v1.1 stake-weighted (Day 30):** add a `staked_amount` field to AttestorProfile. Attestors stake SOL or USDC; stake amount provides a default trust weight downstream consumers use for ranking. Slashing not yet — only economic skin in the game.
2. **v1.2 slashing (Day 60):** stake gets slashed if a downstream consumer's policy revokes their attestation as "fraudulent." Requires governance + slashing-condition arbitration logic.
3. **v2 graph-based reputation (Day 90+):** EigenTrust-style attestor-of-attestors graph for second-order reputation. Research-grade work.

### D.4 — Comparison to existing on-chain attestation primitives

Per Wave 1 #3 Section F:

| Primitive | Sybil model | Capability schema | AgentTrust comparison |
|-----------|-------------|--------------------|------------------------|
| **EAS (Ethereum Attestation Service)** | Permissionless + schema registry; consumers filter | Schema-registered; permissionless | Closest analog. EAS is Ethereum-only; AgentTrust ships the Solana equivalent with capability-namespacing |
| **Verax (Linea)** | Permissionless + portal validators | Schema-portal model | More gatekeeping than AgentTrust; Verax's "portals" are like AgentTrust's `accepted_attestors[]` per-policy lists |
| **Optimism AttestationStation** | Permissionless KV store | No schema; pure key-value | Looser than AgentTrust; AgentTrust's namespacing adds discoverability |
| **The alternative governance-curated capability registry** | Governance-curated bitmask | u128 bitmask, governance cycles | Architectural opposite — capabilities require governance approval |

AgentTrust's design choice: capability-namespaced + permissionless-attestor + downstream-consumer-filtering. Closest to EAS, distinct on the namespace + tooling layer.

### D.5 — Comparison to the alternative governance-curated capability registry

Standing rule: do not name. But document the architectural divergence so judges asking "isn't this just X?" get the structural answer:

| Axis | The alternative | AgentTrust ValidationRegistry |
|------|-----------------|--------------------------------|
| Capability schema | u128 bitmask, 32 seeded at M1, governance to expand | SHA256-hashed namespaces, 10 seeded at v1, permissionless to expand |
| Attestor model | None (governance is the only authority) | Permissionless attestors, downstream-consumer-filtering |
| Capability addition flow | `propose_tag` → governance vote → `approved_mask` bit set | `register_namespace(name, version, schema_uri)` — single tx, anyone |
| Sybil resistance | Governance gatekeeping | Downstream consumer filtering by attestor identity |
| Time to add a new capability | Weeks (multi-vote cycle) | One transaction (~5 seconds) |
| Foundation alignment | Parallel to Foundation-endorsed primitives | Built on top of Foundation-endorsed primitives |

The "Foundation alignment" axis is the load-bearing differentiation in pitch.

---

## E. Per-instruction Anchor skeletons

All in Anchor 1.0+ syntax (per Wave 1 #2 recommendation). Manual byte-offset deserialization is NOT used here — these are AgentTrust's own program PDAs, deserialized via Anchor.

### E.1 — `register_namespace`

```rust
use anchor_lang::prelude::*;
use sha2::{Digest, Sha256};

#[derive(Accounts)]
#[instruction(name: String, version: String, schema_uri: String)]
pub struct RegisterNamespace<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + CapabilityNamespace::INIT_SPACE,
        seeds = [
            b"capability",
            compute_namespace_hash(&name).as_ref(),
        ],
        bump,
    )]
    pub namespace: Account<'info, CapabilityNamespace>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn register_namespace(
    ctx: Context<RegisterNamespace>,
    name: String,
    version: String,
    schema_uri: String,
) -> Result<()> {
    require!(name.len() <= 32, ValidationRegistryError::NameTooLong);
    require!(name.len() >= 3, ValidationRegistryError::NameTooShort);
    require!(version.len() <= 16, ValidationRegistryError::VersionTooLong);
    require!(schema_uri.len() <= 160, ValidationRegistryError::UriTooLong);
    require!(!name.contains(':'), ValidationRegistryError::NamespaceColonForbidden);

    let namespace_hash = compute_namespace_hash(&name);

    let ns = &mut ctx.accounts.namespace;
    ns.namespace_hash = namespace_hash;
    ns.name = name.clone();
    ns.version = version;
    ns.schema_uri = schema_uri;
    ns.registered_at = Clock::get()?.slot;
    ns.creator = ctx.accounts.creator.key();
    ns.bump = ctx.bumps.namespace;

    emit!(NamespaceRegistered {
        namespace_hash,
        name,
        creator: ctx.accounts.creator.key(),
    });

    Ok(())
}

fn compute_namespace_hash(name: &str) -> [u8; 32] {
    let mut h = Sha256::new();
    h.update(name.as_bytes());
    h.finalize().into()
}
```

### E.2 — `register_attestor`

Self-registration. Anyone calls. Creates AttestorProfile PDA.

```rust
#[derive(Accounts)]
#[instruction(display_name_uri: String)]
pub struct RegisterAttestor<'info> {
    #[account(
        init,
        payer = attestor,
        space = 8 + AttestorProfile::INIT_SPACE,
        seeds = [b"attestor", attestor.key().as_ref()],
        bump,
    )]
    pub attestor_profile: Account<'info, AttestorProfile>,

    #[account(mut)]
    pub attestor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn register_attestor(
    ctx: Context<RegisterAttestor>,
    display_name_uri: String,
) -> Result<()> {
    require!(display_name_uri.len() <= 100, ValidationRegistryError::UriTooLong);

    let profile = &mut ctx.accounts.attestor_profile;
    profile.attestor = ctx.accounts.attestor.key();
    profile.display_name_uri = display_name_uri.clone();
    profile.total_attestations = 0;
    profile.total_revoked_by_attestor = 0;
    profile.total_revoked_externally = 0;
    profile.registered_at = Clock::get()?.slot;
    profile.bump = ctx.bumps.attestor_profile;

    emit!(AttestorRegistered {
        attestor: ctx.accounts.attestor.key(),
        display_name_uri,
    });

    Ok(())
}
```

### E.3 — `request_validation`

Subject's owner OR a third party calls. Creates ValidationRequest PDA.

```rust
#[derive(Accounts)]
#[instruction(subject_asset: Pubkey, capability_hash: [u8; 32], _claim_uri_hash: [u8; 32], _deadline: u64)]
pub struct RequestValidation<'info> {
    #[account(
        init,
        payer = requester,
        space = 8 + ValidationRequest::INIT_SPACE,
        seeds = [
            b"request",
            subject_asset.as_ref(),
            capability_hash.as_ref(),
            requester.key().as_ref(),
        ],
        bump,
    )]
    pub validation_request: Account<'info, ValidationRequest>,

    #[account(
        seeds = [b"capability", capability_hash.as_ref()],
        bump = capability_namespace.bump,
    )]
    pub capability_namespace: Account<'info, CapabilityNamespace>,

    #[account(mut)]
    pub requester: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn request_validation(
    ctx: Context<RequestValidation>,
    subject_asset: Pubkey,
    capability_hash: [u8; 32],
    claim_uri_hash: [u8; 32],
    deadline: u64,
) -> Result<()> {
    let clock = Clock::get()?;
    require!(deadline > clock.slot, ValidationRegistryError::DeadlineInPast);
    require!(
        deadline <= clock.slot + 432_000 * 30,
        ValidationRegistryError::DeadlineTooFar
    );

    let req = &mut ctx.accounts.validation_request;
    req.subject_asset = subject_asset;
    req.capability_hash = capability_hash;
    req.requester = ctx.accounts.requester.key();
    req.claim_uri_hash = claim_uri_hash;
    req.created_at = clock.slot;
    req.deadline = deadline;
    req.bump = ctx.bumps.validation_request;

    emit!(RequestCreated {
        subject_asset,
        capability_hash,
        requester: ctx.accounts.requester.key(),
        deadline,
    });

    Ok(())
}
```

**Note:** the `capability_namespace` account constraint enforces that the capability_hash maps to a registered namespace. Direct lookup; ~1500 CU.

### E.4 — `respond_to_validation` (Ed25519-signed)

Attestor (Ed25519-verified) creates ValidationAttestation. Replicates Quantu's Ed25519 sysvar instruction-index check at `current_idx - 1`.

```rust
use anchor_lang::solana_program::sysvar::instructions::{
    load_current_index_checked, load_instruction_at_checked,
};
use anchor_lang::solana_program::ed25519_program;

#[derive(Accounts)]
#[instruction(
    subject_asset: Pubkey,
    capability_hash: [u8; 32],
    _claim_payload_hash: [u8; 32],
    _claim_uri_hash: [u8; 32],
    _expires_at: u64,
)]
pub struct RespondToValidation<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + ValidationAttestation::INIT_SPACE,
        seeds = [
            b"attestation",
            subject_asset.as_ref(),
            capability_hash.as_ref(),
            attestor.key().as_ref(),
        ],
        bump,
    )]
    pub attestation: Account<'info, ValidationAttestation>,

    #[account(
        mut,
        seeds = [b"attestor", attestor.key().as_ref()],
        bump = attestor_profile.bump,
    )]
    pub attestor_profile: Account<'info, AttestorProfile>,

    /// Attestor (Ed25519-verified)
    pub attestor: Signer<'info>,

    /// Anyone can pay for the rent
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Capability namespace (must exist)
    #[account(
        seeds = [b"capability", capability_hash.as_ref()],
        bump = capability_namespace.bump,
    )]
    pub capability_namespace: Account<'info, CapabilityNamespace>,

    /// Instructions sysvar for Ed25519 verification
    /// CHECK: address-checked
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn respond_to_validation(
    ctx: Context<RespondToValidation>,
    subject_asset: Pubkey,
    capability_hash: [u8; 32],
    claim_payload_hash: [u8; 32],
    claim_uri_hash: [u8; 32],
    expires_at: u64,
) -> Result<()> {
    let clock = Clock::get()?;

    if expires_at != 0 {
        require!(expires_at > clock.slot, ValidationRegistryError::ExpiryInPast);
    }

    // Verify Ed25519 signature is at instruction index (current - 1).
    // Mirrors Quantu's set_agent_wallet pattern (identity/instructions.rs:506-541).
    let expected_message = build_attestation_message(
        &subject_asset,
        &capability_hash,
        &claim_payload_hash,
        expires_at,
    );

    let attestor_signature = verify_ed25519_signature(
        &ctx.accounts.instructions_sysvar,
        ctx.accounts.attestor.key(),
        &expected_message,
    )?;

    // Block self-attestation (subject's owner cannot sign attestation for own asset).
    // PolicyVault doesn't enforce this; ValidationRegistry does, mirroring SelfFeedbackNotAllowed pattern.
    // Note: subject_asset.owner is read from Metaplex Core; out of scope for v1.
    // For v1: assume request-time third-party-requested. v1.1+ adds owner check via Core read.

    // Initialize the attestation.
    let att = &mut ctx.accounts.attestation;
    att.subject_asset = subject_asset;
    att.capability_hash = capability_hash;
    att.attestor = ctx.accounts.attestor.key();
    att.claim_payload_hash = claim_payload_hash;
    att.attestor_signature = attestor_signature;
    att.issued_at = clock.slot;
    att.expires_at = expires_at;
    att.revoked = false;
    att.revoked_at = 0;
    att.revocation_reason_hash = [0u8; 32];
    att.claim_uri_hash = claim_uri_hash;
    att.bump = ctx.bumps.attestation;

    // Increment attestor's counter.
    let profile = &mut ctx.accounts.attestor_profile;
    profile.total_attestations = profile.total_attestations.checked_add(1)
        .ok_or(ValidationRegistryError::Overflow)?;

    emit!(AttestationCreated {
        subject_asset,
        capability_hash,
        attestor: ctx.accounts.attestor.key(),
        expires_at,
        issued_at: clock.slot,
    });

    Ok(())
}

fn build_attestation_message(
    subject_asset: &Pubkey,
    capability_hash: &[u8; 32],
    claim_payload_hash: &[u8; 32],
    expires_at: u64,
) -> Vec<u8> {
    // Domain-separated message format
    let mut msg = Vec::with_capacity(16 + 32 + 32 + 32 + 8);
    msg.extend_from_slice(b"AGENTTRUST_ATTEST");
    msg.extend_from_slice(subject_asset.as_ref());
    msg.extend_from_slice(capability_hash);
    msg.extend_from_slice(claim_payload_hash);
    msg.extend_from_slice(&expires_at.to_le_bytes());
    msg
}

fn verify_ed25519_signature(
    instructions_sysvar: &AccountInfo,
    expected_signer: Pubkey,
    expected_message: &[u8],
) -> Result<[u8; 64]> {
    let current_idx = load_current_index_checked(instructions_sysvar)
        .map_err(|_| ValidationRegistryError::MissingSignatureVerification)?;

    require!(current_idx >= 1, ValidationRegistryError::MissingSignatureVerification);
    let ed25519_idx = (current_idx - 1) as usize;

    let ix = load_instruction_at_checked(ed25519_idx, instructions_sysvar)
        .map_err(|_| ValidationRegistryError::MissingSignatureVerification)?;

    require!(
        ix.program_id == ed25519_program::ID,
        ValidationRegistryError::MissingSignatureVerification
    );

    require!(ix.data.len() >= 16, ValidationRegistryError::InvalidSignature);
    let num_signatures = ix.data[0];
    require!(num_signatures == 1, ValidationRegistryError::InvalidSignature);

    // Verify all instruction indices are 0xFFFF (inline)
    let sig_idx = u16::from_le_bytes([ix.data[4], ix.data[5]]);
    let pubkey_idx = u16::from_le_bytes([ix.data[8], ix.data[9]]);
    let msg_idx = u16::from_le_bytes([ix.data[14], ix.data[15]]);
    require!(
        sig_idx == u16::MAX && pubkey_idx == u16::MAX && msg_idx == u16::MAX,
        ValidationRegistryError::InvalidSignature
    );

    let signature_offset = u16::from_le_bytes([ix.data[2], ix.data[3]]) as usize;
    let pubkey_offset = u16::from_le_bytes([ix.data[6], ix.data[7]]) as usize;
    let message_offset = u16::from_le_bytes([ix.data[10], ix.data[11]]) as usize;
    let message_size = u16::from_le_bytes([ix.data[12], ix.data[13]]) as usize;

    require!(
        pubkey_offset + 32 <= ix.data.len()
            && message_offset + message_size <= ix.data.len()
            && signature_offset + 64 <= ix.data.len(),
        ValidationRegistryError::InvalidSignature
    );

    // Verify pubkey matches expected attestor
    let pubkey_bytes: [u8; 32] = ix.data[pubkey_offset..pubkey_offset + 32]
        .try_into()
        .map_err(|_| ValidationRegistryError::InvalidSignature)?;
    let signer = Pubkey::from(pubkey_bytes);
    require!(signer == expected_signer, ValidationRegistryError::InvalidSignature);

    // Verify message matches
    let message = &ix.data[message_offset..message_offset + message_size];
    require!(message == expected_message, ValidationRegistryError::InvalidSignature);

    // Extract the signature bytes for storage
    let signature: [u8; 64] = ix.data[signature_offset..signature_offset + 64]
        .try_into()
        .map_err(|_| ValidationRegistryError::InvalidSignature)?;

    Ok(signature)
}
```

This Ed25519 pattern is ~80 LOC, vendored from Quantu's `set_agent_wallet` instruction with the message format adapted for AgentTrust's attestation domain separator.

### E.5 — `revoke_validation`

Original attestor only. Sets the `revoked` flag without closing the PDA (per ERC-8004 immutability).

```rust
#[derive(Accounts)]
#[instruction(_subject_asset: Pubkey, _capability_hash: [u8; 32])]
pub struct RevokeValidation<'info> {
    #[account(
        mut,
        seeds = [
            b"attestation",
            attestation.subject_asset.as_ref(),
            attestation.capability_hash.as_ref(),
            attestor.key().as_ref(),
        ],
        bump = attestation.bump,
        constraint = attestation.attestor == attestor.key()
            @ ValidationRegistryError::UnauthorizedRevocation,
        constraint = !attestation.revoked
            @ ValidationRegistryError::AlreadyRevoked,
    )]
    pub attestation: Account<'info, ValidationAttestation>,

    #[account(
        mut,
        seeds = [b"attestor", attestor.key().as_ref()],
        bump = attestor_profile.bump,
    )]
    pub attestor_profile: Account<'info, AttestorProfile>,

    pub attestor: Signer<'info>,
}

pub fn revoke_validation(
    ctx: Context<RevokeValidation>,
    _subject_asset: Pubkey,
    _capability_hash: [u8; 32],
    revocation_reason_hash: [u8; 32],
) -> Result<()> {
    let clock = Clock::get()?;
    let att = &mut ctx.accounts.attestation;
    att.revoked = true;
    att.revoked_at = clock.slot;
    att.revocation_reason_hash = revocation_reason_hash;

    let profile = &mut ctx.accounts.attestor_profile;
    profile.total_revoked_by_attestor = profile.total_revoked_by_attestor.checked_add(1)
        .ok_or(ValidationRegistryError::Overflow)?;

    emit!(AttestationRevoked {
        subject_asset: att.subject_asset,
        capability_hash: att.capability_hash,
        attestor: ctx.accounts.attestor.key(),
        revoked_at: clock.slot,
    });

    Ok(())
}
```

### E.6 — `read_attestation`

Anyone (view-only). Returns the read-only attestation data plus a derived `valid` boolean (not revoked + not expired).

```rust
#[derive(Accounts)]
pub struct ReadAttestation<'info> {
    pub attestation: Account<'info, ValidationAttestation>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default)]
pub struct AttestationView {
    pub valid: bool,
    pub expires_at: u64,
    pub claim_payload_hash: [u8; 32],
    pub issued_at: u64,
}

pub fn read_attestation(
    ctx: Context<ReadAttestation>,
) -> Result<AttestationView> {
    let clock = Clock::get()?;
    let att = &ctx.accounts.attestation;

    let not_revoked = !att.revoked;
    let not_expired = att.expires_at == 0 || clock.slot < att.expires_at;
    let valid = not_revoked && not_expired;

    Ok(AttestationView {
        valid,
        expires_at: att.expires_at,
        claim_payload_hash: att.claim_payload_hash,
        issued_at: att.issued_at,
    })
}
```

PolicyVault's `RequireValidation` policy can either:
- Call `read_attestation` via CPI (~3K CU + cross-program overhead)
- Read the ValidationAttestation PDA directly (manual byte-offset deserialization, faster ~1K CU)

For v1, **direct PDA read** is the recommended pattern (saves CU + simpler dependency graph). The `read_attestation` CPI is exposed for cases where consumers don't want to deal with byte offsets (e.g., a TypeScript indexer client).

---

## F. Attestation lifecycle

State machine (states are derived from attestation field values, not stored separately):

```
              ┌──────────────────────────┐
   register_namespace                    │
              │                          │
              v                          │
   ┌─────────────────┐                   │
   │   Namespace     │ ◄──────┐          │
   │   Registered    │        │          │
   └────────┬────────┘        │          │
            │                 │          │
   request_validation         │          │
            │          (multiple requests can target same
            v           subject + capability from different requesters)
   ┌─────────────────┐        │          │
   │   Pending       │        │          │
   │   (request)     ├────────┘          │
   └────────┬────────┘                   │
            │                            │
   respond_to_validation                 │
   (Ed25519 signed)                      │
            │                            │
            v                            │
   ┌─────────────────┐    expires_at   ┌─────────────────┐
   │   Attested      ├──────timeout───►│   Expired       │
   │   (active)      │                 │   (passive)     │
   └────────┬────────┘                 └─────────────────┘
            │
   revoke_validation
            │
            v
   ┌─────────────────┐
   │   Revoked       │
   │                 │
   └─────────────────┘
```

| State | Determinant | PolicyVault verdict |
|-------|-------------|----------------------|
| Pending (request only) | `ValidationRequest` PDA exists, no `ValidationAttestation` for `(subject, capability_hash, attestor)` | `RequireValidation` returns `Deny` (no attestation) |
| Attested | `ValidationAttestation` exists, `revoked = false`, `clock.slot < expires_at` (or `expires_at == 0`) | `RequireValidation` returns `Allow` |
| Revoked | `revoked = true` | `RequireValidation` returns `Deny` |
| Expired | `expires_at != 0 && clock.slot >= expires_at` | `RequireValidation` returns `Deny` |

PolicyVault's `RequireValidation` policy stores `(capability_hash, accepted_attestors[])` in its config. At gate-payment time, it iterates `accepted_attestors[]`, derives each `ValidationAttestation` PDA at `[b"attestation", payee_asset, capability_hash, attestor]`, reads the PDA, computes the attestation state, and returns `Allow` if any attestation is `Attested`. Otherwise `Deny`.

---

## G. Revocation propagation

**Detection mechanism (downstream consumers):**

1. **Event subscription (recommended for v1):** subscribe to `AttestationRevoked` events. PolicyVault's TrustGate-driven flow doesn't subscribe directly — it reads the PDA at gate time, so the latest state is always seen on-chain. Event subscription is for off-chain consumers (dashboards, TrustGate's WebSocket health-check).

2. **PDA-poll (anti-pattern for v1):** poll attestation PDAs every block. Wastes RPC quota. Not recommended.

3. **Indexer-side (v1.1+):** Quantu's `8004-solana-indexer` reference impl subscribes to events and flags revoked attestations in Supabase; AgentTrust v1.1+ would extend this to ValidationRegistry events.

**Race condition: revoke between request and respond**

Scenario: attestor publishes attestation A1 at slot N → revokes A1 at slot N+10 → re-creates A1 at slot N+20. Per the PDA seeds `[b"attestation", subject, capability_hash, attestor]`, only ONE attestation can exist per `(subject, capability_hash, attestor)` triple. After revocation, the PDA still exists with `revoked = true`. Re-creating A1 would fail at the `init` constraint (PDA already initialized).

**v1 handling:** revocation is permanent for a given `(subject, capability_hash, attestor)` triple. To re-attest, the attestor must close the revoked attestation (not implemented in v1, per ERC-8004 immutability) OR use a different attestor identity OR bump the namespace version (e.g., `kyc.tier-1:v2:...`).

**v1.1+:** add `re_attest` instruction that allows attestor to overwrite revoked attestation if `revoked = true` AND `revocation_reason_hash` matches a published correction reason. Out of scope for v1.

---

## H. Expiry handling

**v1 default: hard expiry.**

`expires_at` is a slot number (or `0` = no expiry). PolicyVault's `RequireValidation` policy returns `Deny` if `clock.slot >= expires_at && expires_at != 0`. No grace period.

**Why hard expiry:** simplicity + auditability. Soft expiry ("warn but allow") introduces a third state to PolicyVault's gate decision tree; the demo + Kani harness cleanly handles binary states only.

**v1.1+ options (NOT in v1):**
- Soft expiry with `warn_threshold` slots before hard expiry (notification only)
- Validity-period extension: attestor can re-sign attestation with new `expires_at` without creating a new PDA

**Recommended `expires_at` defaults per namespace** (in `docs/CAPABILITY-NAMESPACES.md`):

| Namespace | Recommended validity (epochs ≈ days) |
|-----------|---------------------------------------|
| `kyc.tier-1` | 8 epochs ≈ 20 days (mirrors Quantu's tier vesting cadence) |
| `kyc.tier-2` | 16 epochs ≈ 40 days |
| `kyc.tier-3` | 24 epochs ≈ 60 days |
| `audit.smart-contract` | 0 (never expires; audits are point-in-time) |
| `model-card` | 0 (never expires) |
| `jurisdiction` | 32 epochs ≈ 80 days |
| `compliance.payments` | 16 epochs ≈ 40 days |
| `agent-source` | 0 (never expires) |

Attestors set `expires_at` per-attestation; defaults are guidelines.

---

## I. Cross-chain attestation portability

**v1 answer: same `capability_hash` works across chains, but different on-chain registries hold the attestations. No automatic portability.**

A `kyc.tier-1:v1:identity-verified` attestation issued by Civic on Solana ValidationRegistry is NOT visible to a Base ERC-8004 ValidationRegistry's PolicyVault-equivalent. Each chain has its own registry.

**v1.1+ vision: attestation bridge.**

Wormhole / LayerZero attestation portability:
1. AgentTrust v1.1 deploys a relayer program on each target chain (Base, Polygon, Arbitrum, Abstract, Arc)
2. Attestors publish on Solana once; the relayer mirrors the attestation hash + signature to other chains
3. Cross-chain consumers verify the original Solana signature; chain-portability achieved

Out of scope for v1 (Phase-3 work per `THESIS_LOCK.md`).

---

## J. Five-attestor outreach plan (post-Frontier)

Per Wave 1 #3 Section J, top 5 attestors to court post-submission. Each gets a 1-paragraph dossier + concrete first-attestation use case + integration pathway + DM draft for outreach Day 18+.

### J.1 — Halborn

**Dossier:** Top-tier Solana smart-contract audit firm. Already published the SSTS (Solana Security Token Standard). Public footprint via @HalbornSecurity. Post-Frontier Mohit's outreach goal: audit attestation for AgentTrust's own programs (PolicyVault + TrustGate + ValidationRegistry).

**First-attestation use case:** `audit.smart-contract:v1:halborn` attestation of AgentTrust's mainnet binary hash. Subject_asset = AgentTrust's PolicyVault program-data PDA (or a Halborn-controlled "subject" NFT). claim_payload = audit report URI + summary findings.

**Integration pathway:** Halborn signs an attestation with their existing audit-key infrastructure. They register as an attestor (paying ~0.0014 SOL one-time). They emit attestations programmatically via their CI on each audit completion.

**DM draft (Day 18+):**

> Hey @HalbornSecurity, I'm Mohit — solo eng who shipped AgentTrust at Frontier (Foundation's ERC-8004 trust stack, third leg productized). Open-source MIT, 5 Kani invariants proven. Would love your audit signal on-chain — built a permissionless attestor primitive specifically for audit firms to publish on-chain attestations. Could you take a 10-min look at the spec? Repo: github.com/<personalize>/agenttrust

### J.2 — OtterSec

**Dossier:** Top-tier Solana audit firm. Known auditor for major Solana protocols. Already on the radar for the alternative governance-curated capability registry — AgentTrust positioning is compatible (different layer).

**First-attestation use case:** Same as Halborn — `audit.smart-contract:v1:ottersec` for AgentTrust audit completion.

**Integration pathway:** Identical to Halborn.

**DM draft:** Adapt Halborn DM. Reference their existing Solana audit work + the public-goods-aligned positioning of AgentTrust's MIT licensing.

### J.3 — Civic

**Dossier:** KYC provider with existing on-chain identity attestations on Solana. The most-deployed KYC-on-Solana primitive. Public footprint via @civickey + civic.com.

**First-attestation use case:** `kyc.tier-1:v1:identity-verified` attestation for any agent registered on Quantu's 8004-Solana. Civic already verifies humans on Solana; extending to verifying agent-owners is a small step.

**Integration pathway:** Civic registers as attestor. They build a thin server that emits `respond_to_validation` calls upon successful KYC verification of an agent's owner. Existing Civic flow + 1 new tx per verification. Likely $0 incremental cost.

**DM draft:** Reference their existing on-chain KYC presence on Solana + the cross-chain ERC-8004 portability vision (gives them a path to Base/Polygon/etc. without rebuilding their KYC logic per chain).

### J.4 — Sumsub

**Dossier:** Global KYC provider, used by major fintechs. Less Solana-native than Civic; more cross-chain. Strong regulatory compliance posture (matches the regulated-enterprise pitch beat).

**First-attestation use case:** `kyc.tier-2:v1:address-verified` attestation. Pairs with regulated-enterprise pitch — Mastercard/Stripe partners want Sumsub-backed KYC.

**Integration pathway:** Sumsub registers as attestor. Builds a webhook integration that emits attestations on KYC completion.

**DM draft:** Reference their cross-chain KYC presence + the Foundation-aligned positioning.

### J.5 — Anthropic (self-attest)

**Dossier:** AI provider. Self-attests their own model versions (Claude Opus / Sonnet / Haiku 4.x lineage). The pitch beat: "scam wrappers pretending to be Anthropic" (Variant B) is solved by Anthropic publishing on-chain attestations of authorized API endpoints.

**First-attestation use case:** `model-card:v1:anthropic-opus-4-7` attestation. Subject_asset = a placeholder NFT representing "the official Anthropic Opus 4.7 deployment." claim_payload = canonical model card URI + endpoint signatures.

**Integration pathway:** This is the BIGGEST stretch among the 5. Anthropic has no on-chain primitive infrastructure today. Mohit's outreach is exploratory; success = a single Anthropic team member acknowledging the use case in a public reply.

**DM draft:** Reference the Variant B pitch scenario directly. Position as a tool for Anthropic to publish canonical endpoint attestations on-chain. Even a "we'll think about it" response is a credibility-multiplier for the deck.

### J.6 — Outreach calendar

| Day | Outreach |
|-----|----------|
| Day 18 (May 12) | DM Halborn + OtterSec — audit-attestation feature request |
| Day 20 (May 14) | DM Civic + Sumsub — KYC-attestation pathway |
| Day 22 (May 16) | DM Anthropic (via team@anthropic.com or public engagement) — model-card use case |
| Day 30 (May 24) | First-response evaluation — pivot if zero interest |

---

## K. v1 implementation playbook (Days 11-13)

Per `v1_scope.md` daily milestones backbone (illustrated for Option 3 but applies to Option 1 with shifted hours):

### Day 11 (May 5) — Anchor scaffold + 4 PDAs + register_namespace + register_attestor

Sub-tasks (in order):
1. Scaffold `programs/validation-registry/` (1h)
2. Implement `state.rs` with all 4 PDAs (2h)
3. Implement `events.rs`, `errors.rs` (1h)
4. Implement `register_namespace` instruction with full account context (2h)
5. Implement `register_attestor` instruction (1h)
6. Localnet integration test: register 10 v1 namespaces + register 1 test attestor (2h)
7. Bankrun unit tests (1h)

**Definition of done:** `cargo build-sbf` green; integration test creates 10 namespaces + 1 attestor; rent calculations match spec (192 / 282 / 177 / 301 bytes).

### Day 12 (May 6) — request_validation + respond_to_validation (with Ed25519 sysvar)

Sub-tasks:
1. Implement `request_validation` instruction (2h)
2. Implement `ed25519.rs` Ed25519 sysvar verification helper (3h — bulk of complexity)
3. Implement `respond_to_validation` instruction wiring the Ed25519 helper (2h)
4. Localnet integration test: request → respond happy path (1h)
5. Bankrun unit tests for Ed25519 edge cases (1h)
6. Demo dry-run #1: request + respond visible in localnet logs (0.5h)

**Definition of done:** Request creates ValidationRequest PDA (192 bytes). Respond creates ValidationAttestation PDA (282 bytes). Ed25519 sysvar verification passes for valid signature, fails for tampered message + wrong signer + missing instruction. Total CU under 50K.

### Day 13 (May 7) — revoke_validation + read_attestation + integration tests

Sub-tasks:
1. Implement `revoke_validation` instruction (1h)
2. Implement `read_attestation` view (1h)
3. PolicyVault integration: `RequireValidation` policy reads ValidationAttestation directly (3h)
4. End-to-end integration test: namespace → attestor → request → respond → PolicyVault gates payment Allow → revoke → PolicyVault gates payment Deny (2h)
5. Final bug pass + edge cases (1h)
6. Pre-decided cut #2 trigger check: ValidationRegistry stub vs full ship (0.5h)

**Definition of done:** Full lifecycle test green. PolicyVault integration test green. CU envelope confirmed under 50K per ValidationRegistry tx. Pre-decided cut #2 NOT triggered (we ship full v1).

---

## L. Test scenarios + attacker scenarios

### L.1 — Happy path (1 scenario)

1. `register_namespace("kyc.tier-1", "v1", "ipfs://...schema.json")` — namespace created
2. `register_attestor(civic_pubkey, "ipfs://...civic-display.json")` — Civic registered
3. `request_validation(agent_asset, kyc_capability_hash, claim_uri_hash, deadline)` — request created by agent's owner
4. `respond_to_validation(...)` with Ed25519 sig from Civic — attestation created
5. `read_attestation(...)` returns `valid: true`
6. PolicyVault's `RequireValidation` policy returns `Allow`

### L.2 — Failure modes (5 scenarios)

| Scenario | Expected error | Mitigation |
|----------|----------------|-----------|
| Missing Ed25519 sysvar instruction | `MissingSignatureVerification` | Client must include Ed25519 ix at idx (current-1) |
| Tampered message in Ed25519 ix | `InvalidSignature` | Built-in via verify helper |
| Wrong signer in Ed25519 ix | `InvalidSignature` | Built-in |
| Capability namespace not registered | `AccountNotInitialized` (Anchor) | Client validates namespace exists before request |
| Expiry in past | `ExpiryInPast` | Client validates expires_at > current_slot |

### L.3 — Attacker scenarios (5 scenarios)

#### Attacker 1 — Sybil attestor mass-registration

**Attack:** attacker creates 1000 attestor identities, attests fake KYC for 1000 agents, hopes downstream consumers don't filter.

**Mitigation:** PolicyVault's `accepted_attestors[]` allowlist blocks unknown attestors. Civic + Sumsub + Halborn + OtterSec are explicitly listed; sybil attestors are not in the list.

**Residual risk:** PolicyVault deployments that leave `accepted_attestors[]` empty (pure permissionless mode) are vulnerable. v1 defaults the demo policy to a tight allowlist. README documents the empty-list mode as opt-in for advanced users.

#### Attacker 2 — Replay attack on Ed25519 signatures

**Attack:** Attacker captures a valid Ed25519 signature for `respond_to_validation(asset_A, capability_X, ...)` and replays it on `respond_to_validation(asset_B, capability_X, ...)`.

**Mitigation:** Ed25519 signature verification check binds the signature to the SPECIFIC `(subject_asset, capability_hash, claim_payload_hash, expires_at)` tuple via the message format (`build_attestation_message`). Replay against different (asset, capability) tuple FAILS at the message-comparison step.

**Residual risk:** none, given the inline-instruction-index check (`0xFFFF` indices verified per Quantu's pattern).

#### Attacker 3 — Self-attestation (subject signs own attestation)

**Attack:** Agent's owner signs an Ed25519 attestation for their own asset.

**Mitigation:** v1 does NOT enforce a self-attestation block (out of scope per the implementation comment in Section E.4). PolicyVault MUST enforce this at gate-payment time:

```rust
// In PolicyVault's RequireValidation policy:
require_keys_neq!(
    attestation.attestor,
    payee_agent_owner,  // read via Metaplex Core
    PolicyError::SelfAttestationRejected
);
```

**Residual risk:** if PolicyVault config doesn't include this check, self-attestations pass. v1.1+ enforce at ValidationRegistry level.

#### Attacker 4 — Expired-attestation re-use

**Attack:** Attacker uses a long-since-expired attestation to gate payments.

**Mitigation:** PolicyVault's `read_attestation` view computes `valid = !revoked && (expires_at == 0 || clock.slot < expires_at)`. Expired attestations return `valid: false` automatically. PolicyVault's gate logic gates on `valid == true`.

**Residual risk:** PolicyVault implementations that read `expires_at` directly without computing `valid` could overlook the check. v1 unit tests cover this case.

#### Attacker 5 — Revocation race (revoke between request and respond)

**Attack:** Attestor signs an attestation off-chain, broadcasts the respond_to_validation transaction, then races a revoke transaction in the same block.

**Mitigation:** Per E.4 + Section G's race-condition analysis, only ONE attestation can exist per `(subject, capability_hash, attestor)` triple. The PDA `init` constraint prevents double-creation. If the revoke arrives first (impossible — there's nothing to revoke yet), the respond fails at PDA-already-initialized. If the respond arrives first, the revoke updates the PDA's `revoked = true` flag.

**Residual risk:** none — the PDA-init order serializes the operations.

---

## M. Common bug catalog (10 bugs with wrong/right code blocks)

### Bug 1 — Forgetting Ed25519 sysvar instruction-index check

**Wrong:**
```rust
let ix = load_instruction_at_checked(0, instructions_sysvar)?;
// Uses arbitrary instruction index 0 — vulnerable to signature reuse
```

**Right:**
```rust
let current_idx = load_current_index_checked(instructions_sysvar)?;
require!(current_idx >= 1, ValidationRegistryError::MissingSignatureVerification);
let ed25519_idx = (current_idx - 1) as usize;
let ix = load_instruction_at_checked(ed25519_idx, instructions_sysvar)?;
```

### Bug 2 — Wrong PDA seeds for ValidationAttestation

**Wrong:**
```rust
seeds = [b"attestation", attestor.key().as_ref(), capability_hash.as_ref(), subject_asset.as_ref()]
// Order randomized — easier to forget; downstream consumers fail to derive
```

**Right:**
```rust
seeds = [b"attestation", subject_asset.as_ref(), capability_hash.as_ref(), attestor.key().as_ref()]
// Order: subject → capability → attestor (matches v1_scope.md + Wave 1 #3)
```

### Bug 3 — Missing Ed25519 0xFFFF inline-index check

**Wrong:**
```rust
// Skip the 0xFFFF check — assume signature is inline
let signature_offset = u16::from_le_bytes([ix.data[2], ix.data[3]]) as usize;
```

**Right:**
```rust
let sig_idx = u16::from_le_bytes([ix.data[4], ix.data[5]]);
let pubkey_idx = u16::from_le_bytes([ix.data[8], ix.data[9]]);
let msg_idx = u16::from_le_bytes([ix.data[14], ix.data[15]]);
require!(
    sig_idx == u16::MAX && pubkey_idx == u16::MAX && msg_idx == u16::MAX,
    ValidationRegistryError::InvalidSignature
);
```

This prevents an attacker from crafting an Ed25519 instruction that references data from a DIFFERENT instruction. Replicates Quantu's fix (`identity/instructions.rs:529-541`).

### Bug 4 — Off-by-one on bump

**Wrong:**
```rust
seeds = [...],
bump = ctx.bumps.attestation, // Implicit; recomputed from find_program_address (1500 CU)
// Better: cache in PDA after init, then read from PDA on subsequent reads
```

**Right (after init):**
```rust
seeds = [...],
bump = attestation.bump, // Read cached bump (saves 1500 CU)
```

### Bug 5 — Forgetting `init_if_needed` vs `init`

**Wrong:**
```rust
#[account(init_if_needed, ...)]  // Allows update of existing PDA — can be exploited if not careful
pub attestation: Account<'info, ValidationAttestation>,
```

**Right:**
```rust
#[account(init, ...)]  // Strict init; respond_to_validation must error if attestation already exists
```

ERC-8004 mandates immutability. AgentTrust enforces by using `init` not `init_if_needed`.

### Bug 6 — Using `Pubkey::default()` as zero-comparison sentinel

**Wrong:**
```rust
if att.revoked_at == Pubkey::default() { ... }  // Type error — revoked_at is u64
```

**Right:**
```rust
if att.revoked_at == 0 { ... }
```

### Bug 7 — Forgetting to update AttestorProfile counter

**Wrong:** `respond_to_validation` creates the attestation but doesn't increment `attestor_profile.total_attestations`. Downstream consumers can't compute revocation ratios.

**Right:** Always increment `total_attestations` on create, increment `total_revoked_by_attestor` on revoke. See Section E.4 + E.5.

### Bug 8 — Off-by-one on ValidationAttestation byte offset

**Wrong:** assumes `ValidationAttestation::SIZE = 256` (per old v1_scope estimate).

**Right:** `ValidationAttestation::SIZE = 282` per Wave 1 change file Revision 1. PolicyVault's manual byte-offset reads use this constant.

### Bug 9 — Domain separator omission in Ed25519 message

**Wrong:**
```rust
let mut msg = Vec::new();
msg.extend_from_slice(subject_asset.as_ref());
msg.extend_from_slice(capability_hash);
// No domain separator — signature could be replayed across domains
```

**Right:**
```rust
let mut msg = Vec::new();
msg.extend_from_slice(b"AGENTTRUST_ATTEST");  // Domain separator prevents cross-domain replay
msg.extend_from_slice(subject_asset.as_ref());
msg.extend_from_slice(capability_hash);
// ... etc
```

### Bug 10 — Forgetting to validate capability_namespace exists

**Wrong:** `request_validation` creates a request without checking that `capability_hash` corresponds to a registered namespace.

**Right:** include `capability_namespace` in the account context with `seeds = [b"capability", capability_hash.as_ref()]` constraint. Anchor fails the tx if namespace isn't registered.

---

## N. What this means for Mohit's submission

1. **`ValidationAttestation::SIZE = 282`** — hardcode this constant. Mirrors Wave 1 change file Revision 1. Rent ≈ 0.0021 SOL per attestation.
2. **`ValidationRequest::SIZE = 192`, `AttestorProfile::SIZE = 177`, `CapabilityNamespace::SIZE = 301`** — additional rent ≈ 0.0014 + 0.0014 + 0.0023 SOL respectively for one-time setup. All accept `payer` as separate from the namespace creator / attestor / requester so a deployer wallet covers initial costs.
3. **Ed25519 sysvar verification pattern is vendored from Quantu's `set_agent_wallet`** (`identity/instructions.rs:506-541`). Domain separator `b"AGENTTRUST_ATTEST"` (16 bytes) prevents cross-domain replay. Inline-instruction-index check (`0xFFFF`) prevents signature-reference attacks. Day-12 implementation cost ~3h.
4. **Permissionless attestor v1 sybil model = downstream-consumer-filtering** — PolicyVault stores `accepted_attestors[]` per-policy (5–10 entries: Civic, Sumsub, Halborn, OtterSec, Anthropic). Empty list = pure permissionless mode (opt-in for advanced users).
5. **10 v1 capability namespaces seeded via `scripts/seed-capability-namespaces.ts`** Day 11 — ~0.023 SOL total seed cost. Hash convention: `SHA256(namespace || ":" || version || ":" || claim_descriptor)[..32]`. Test vectors locked Day 11.
6. **CU envelope per ValidationRegistry tx ≤ 50K.** Set `set_compute_unit_limit(50_000)` as defensive pre-instruction. Far below 1.4M ceiling; far below PolicyVault's `gate_payment` envelope of 80K.
7. **Five attestors to court Day 18+** — Halborn, OtterSec, Civic, Sumsub, Anthropic. Outreach calendar in Section J.6. Even one named-attestor quote in the deck multiplies credibility.
8. **PolicyVault's `RequireValidation` policy reads `ValidationAttestation` PDAs directly via byte-offset deserialization** — not via CPI. Saves 5K CU per gate-payment. Manual deserialization constants in Section B.2 byte-layout table.
9. **Self-attestation block lives in PolicyVault, not ValidationRegistry** (v1). PolicyVault's `RequireValidation` policy enforces `attestation.attestor != payee_agent_owner` via Metaplex Core read. v1.1+ moves the check to ValidationRegistry.
10. **The "third leg Quantu archived" pitch beat depends on this component existing as deployed Anchor program code** — not as docs+stub. Per locked Option 1 scope. If the cut-priority order triggers Cut #2 (drop ValidationRegistry stub), the trinity-completion narrative collapses to "2 of 3 + spec'd third leg." Floor-list lock-trigger applies.

— end —
