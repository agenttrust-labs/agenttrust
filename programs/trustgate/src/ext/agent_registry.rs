//! CPI helper for `agent_registry_8004::give_feedback`.
//!
//! Manual instruction-data construction (no dependency on Quantu's crate).
//! Discriminator + Borsh-serialised args are concatenated and the call is
//! `invoke_signed`-ed with TrustGate's PDA seeds as the signer.
//!
//! Account ordering matches `reputation/contexts.rs:8-57` GiveFeedback:
//!
//!   0  client                  (signer, mut)        — TrustGate PDA
//!   1  agent_account           (mut)                — `[b"agent", asset]`
//!   2  asset                   (read, unchecked)
//!   3  collection              (read, unchecked)
//!   4  system_program          (executable)
//!   5  atom_config             (read, optional)     — `[b"atom_config"]`
//!   6  atom_stats              (mut, optional)      — `[b"atom_stats", asset]`
//!   7  atom_engine_program     (executable, optional)
//!   8  registry_authority      (read, optional)     — `[b"atom_cpi_authority"]`

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke_signed,
};

use crate::constants::{
    AGENT_REGISTRY_ID, GIVE_FEEDBACK_DISCRIMINATOR, REGISTER_WITH_OPTIONS_DISCRIMINATOR,
};

/// Args bundle that mirrors `agent_registry_8004::give_feedback`'s signature.
/// Field order is load-bearing — Borsh serialises in declaration order, and
/// the bytes must match Quantu's expected layout exactly.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct GiveFeedbackArgs {
    pub value: i128,
    pub value_decimals: u8,
    pub score: Option<u8>,
    pub feedback_file_hash: Option<[u8; 32]>,
    pub tag1: String,
    pub tag2: String,
    pub endpoint: String,
    pub feedback_uri: String,
}

/// Bundle of CPI accounts the caller must pass through. Optional ATOM
/// accounts default to None when the agent has `atom_enabled = false`.
pub struct GiveFeedbackAccounts<'info> {
    pub client: AccountInfo<'info>, // TrustGate PDA (signer)
    pub agent_account: AccountInfo<'info>,
    pub asset: AccountInfo<'info>,
    pub collection: AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
    pub atom_config: Option<AccountInfo<'info>>,
    pub atom_stats: Option<AccountInfo<'info>>,
    pub atom_engine_program: Option<AccountInfo<'info>>,
    pub registry_authority: Option<AccountInfo<'info>>,
}

/// Build the give_feedback instruction-data bytes (discriminator + Borsh args).
fn build_instruction_data(args: &GiveFeedbackArgs) -> Result<Vec<u8>> {
    let mut data = Vec::with_capacity(8 + 256);
    data.extend_from_slice(&GIVE_FEEDBACK_DISCRIMINATOR);
    args.serialize(&mut data)?;
    Ok(data)
}

/// PDA-signed CPI invocation. `signer_seeds` must be the trustgate_auth
/// PDA seeds with the bump as the final element:
/// `[b"trustgate_auth", facilitator.as_ref(), &[bump]]`.
pub fn invoke_give_feedback<'info>(
    accounts: &GiveFeedbackAccounts<'info>,
    args: &GiveFeedbackArgs,
    signer_seeds: &[&[u8]],
) -> Result<()> {
    let mut metas = vec![
        AccountMeta::new(*accounts.client.key, true), // client = signer + mut
        AccountMeta::new(*accounts.agent_account.key, false),
        AccountMeta::new_readonly(*accounts.asset.key, false),
        AccountMeta::new_readonly(*accounts.collection.key, false),
        AccountMeta::new_readonly(*accounts.system_program.key, false),
    ];
    let mut infos = vec![
        accounts.client.clone(),
        accounts.agent_account.clone(),
        accounts.asset.clone(),
        accounts.collection.clone(),
        accounts.system_program.clone(),
    ];

    // Optional ATOM accounts — present together when the agent is atom-enabled.
    if let (Some(cfg), Some(stats), Some(prog), Some(auth)) = (
        accounts.atom_config.as_ref(),
        accounts.atom_stats.as_ref(),
        accounts.atom_engine_program.as_ref(),
        accounts.registry_authority.as_ref(),
    ) {
        metas.push(AccountMeta::new_readonly(*cfg.key, false));
        metas.push(AccountMeta::new(*stats.key, false));
        metas.push(AccountMeta::new_readonly(*prog.key, false));
        metas.push(AccountMeta::new_readonly(*auth.key, false));
        infos.push(cfg.clone());
        infos.push(stats.clone());
        infos.push(prog.clone());
        infos.push(auth.clone());
    }

    let ix = Instruction {
        program_id: AGENT_REGISTRY_ID,
        accounts: metas,
        data: build_instruction_data(args)?,
    };

    invoke_signed(&ix, &infos, &[signer_seeds]).map_err(Into::into)
}

// ---------------------------------------------------------------------------
// register_with_options — Quantu's agent-registration entrypoint.
// ---------------------------------------------------------------------------
//
// TrustGate exposes this as `register_agent_via_cpi` so the MCP / SDK never
// has to learn Quantu's surface. AgentTrust 0.4.0 prepends it into the same
// atomic transaction as `init_policy`, giving fresh wallets one-signature
// onboarding to both Quantu and TrustGate state.
//
// Account ordering matches the live devnet binary (verified via
// `tests/trustgate.spec.ts:180-191` and `examples/pay-sh-demo/scripts/prewarm-devnet.ts:234-247`):
//
//   0  root_config           (read)               — `[b"root_config"]`
//   1  registry_config       (read)               — `[b"registry_config", base_collection]`
//   2  agent_account         (mut)                — `[b"agent", asset]`
//   3  asset                 (signer, mut)        — caller-generated Keypair
//   4  base_collection       (mut)                — Quantu's MPL Core collection
//   5  payer                 (signer, mut)        — funds rent
//   6  system_program        (executable)
//   7  mpl_core_program      (executable)

/// Args bundle that mirrors `agent_registry_8004::register_with_options`'s
/// signature. Field order is load-bearing — Borsh serialises in declaration
/// order, and the bytes must match Quantu's expected layout exactly.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RegisterAgentArgs {
    pub metadata_uri: String,
    pub atom_enabled: bool,
}

/// Bundle of CPI accounts the caller must pass through, in the order Quantu's
/// `register_with_options` expects. All accounts required (no optional tail).
pub struct RegisterAgentAccounts<'info> {
    pub root_config: AccountInfo<'info>,
    pub registry_config: AccountInfo<'info>,
    pub agent_account: AccountInfo<'info>,
    pub asset: AccountInfo<'info>, // signer
    pub base_collection: AccountInfo<'info>,
    pub payer: AccountInfo<'info>, // signer
    pub system_program: AccountInfo<'info>,
    pub mpl_core_program: AccountInfo<'info>,
}

/// Build the register_with_options instruction-data bytes
/// (discriminator + Borsh args).
fn build_register_instruction_data(args: &RegisterAgentArgs) -> Result<Vec<u8>> {
    let mut data = Vec::with_capacity(8 + 64 + args.metadata_uri.len());
    data.extend_from_slice(&REGISTER_WITH_OPTIONS_DISCRIMINATOR);
    args.serialize(&mut data)?;
    Ok(data)
}

/// PDA-signed CPI invocation. `signer_seeds` must be the trustgate_auth
/// PDA seeds with the bump as the final element:
/// `[b"trustgate_auth", facilitator.as_ref(), &[bump]]`.
///
/// Quantu's `register_with_options` does not include the TrustGate authority
/// PDA in its account list, so the seeds here PDA-sign for an account that
/// Quantu does not require — harmless, but kept for parity with
/// `invoke_give_feedback` and so callers always pass the seeds the same way.
/// The real signers Quantu enforces are `asset` and `payer`; both must sign
/// the outer transaction.
pub fn invoke_register_agent<'info>(
    accounts: &RegisterAgentAccounts<'info>,
    args: &RegisterAgentArgs,
    signer_seeds: &[&[u8]],
) -> Result<()> {
    let metas = vec![
        AccountMeta::new_readonly(*accounts.root_config.key, false),
        AccountMeta::new_readonly(*accounts.registry_config.key, false),
        AccountMeta::new(*accounts.agent_account.key, false),
        AccountMeta::new(*accounts.asset.key, true), // asset = signer + mut
        AccountMeta::new(*accounts.base_collection.key, false),
        AccountMeta::new(*accounts.payer.key, true), // payer = signer + mut
        AccountMeta::new_readonly(*accounts.system_program.key, false),
        AccountMeta::new_readonly(*accounts.mpl_core_program.key, false),
    ];
    let infos = vec![
        accounts.root_config.clone(),
        accounts.registry_config.clone(),
        accounts.agent_account.clone(),
        accounts.asset.clone(),
        accounts.base_collection.clone(),
        accounts.payer.clone(),
        accounts.system_program.clone(),
        accounts.mpl_core_program.clone(),
    ];

    let ix = Instruction {
        program_id: AGENT_REGISTRY_ID,
        accounts: metas,
        data: build_register_instruction_data(args)?,
    };

    invoke_signed(&ix, &infos, &[signer_seeds]).map_err(Into::into)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn discriminator_constant_matches_research() {
        // Locked 2026-04-28 in 01-quantu-source-code-class.md §A.1.
        assert_eq!(
            GIVE_FEEDBACK_DISCRIMINATOR,
            [145, 136, 123, 3, 215, 165, 98, 41]
        );
    }

    #[test]
    fn register_discriminator_constant_matches_test_harness() {
        // Cross-checked against tests/trustgate.spec.ts:138 and
        // examples/pay-sh-demo/scripts/prewarm-devnet.ts:60.
        assert_eq!(
            REGISTER_WITH_OPTIONS_DISCRIMINATOR,
            [177, 175, 96, 41, 59, 166, 13, 6]
        );
    }

    #[test]
    fn register_instruction_data_starts_with_discriminator() {
        let args = RegisterAgentArgs {
            metadata_uri: String::from("https://agenttrust.test/agents/spec.json"),
            atom_enabled: true,
        };
        let data = build_register_instruction_data(&args).unwrap();
        assert_eq!(&data[..8], &REGISTER_WITH_OPTIONS_DISCRIMINATOR);
    }

    #[test]
    fn register_args_round_trip_via_borsh() {
        let original = RegisterAgentArgs {
            metadata_uri: String::from("ipfs://QmAgent"),
            atom_enabled: true,
        };
        let mut buf = Vec::new();
        original.serialize(&mut buf).unwrap();
        let decoded = RegisterAgentArgs::deserialize(&mut &buf[..]).unwrap();
        assert_eq!(decoded.metadata_uri, original.metadata_uri);
        assert_eq!(decoded.atom_enabled, original.atom_enabled);
    }

    #[test]
    fn instruction_data_starts_with_discriminator() {
        let args = GiveFeedbackArgs {
            value: 0,
            value_decimals: 0,
            score: Some(50),
            feedback_file_hash: None,
            tag1: String::from("test"),
            tag2: String::from(""),
            endpoint: String::from(""),
            feedback_uri: String::from(""),
        };
        let data = build_instruction_data(&args).unwrap();
        assert_eq!(&data[..8], &GIVE_FEEDBACK_DISCRIMINATOR);
    }

    #[test]
    fn args_round_trip_via_borsh() {
        let original = GiveFeedbackArgs {
            value: 42,
            value_decimals: 6,
            score: Some(85),
            feedback_file_hash: Some([0xAB; 32]),
            tag1: String::from("payment"),
            tag2: String::from("solana"),
            endpoint: String::from("https://api.example.com/pay"),
            feedback_uri: String::from("ipfs://Qm...."),
        };
        let mut buf = Vec::new();
        original.serialize(&mut buf).unwrap();
        let decoded = GiveFeedbackArgs::deserialize(&mut &buf[..]).unwrap();
        assert_eq!(decoded.value, original.value);
        assert_eq!(decoded.value_decimals, original.value_decimals);
        assert_eq!(decoded.score, original.score);
        assert_eq!(decoded.feedback_file_hash, original.feedback_file_hash);
        assert_eq!(decoded.tag1, original.tag1);
        assert_eq!(decoded.tag2, original.tag2);
        assert_eq!(decoded.endpoint, original.endpoint);
        assert_eq!(decoded.feedback_uri, original.feedback_uri);
    }

    #[test]
    fn pinned_devnet_program_ids() {
        assert_eq!(
            AGENT_REGISTRY_ID.to_string(),
            "8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C",
        );
    }
}
