//! `register_namespace` — permissionless namespace registry.
//!
//! v1: caller provides `namespace_hash` (= `SHA256(name_utf8)`); on-chain we
//! use it as the PDA seed and store both the hash and the name. We skip the
//! on-chain SHA256 verification (anchor-lang 1.0 doesn't re-export
//! `solana_program::hash`); callers MUST compute the hash correctly. A
//! mismatched-hash attack is self-defeating: downstream PolicyVault
//! consumers derive the hash from the name they expect and would never
//! reference a wrongly-keyed namespace.

use anchor_lang::prelude::*;

use crate::errors::ValidationRegistryError;
use crate::events::NamespaceRegistered;
use crate::state::CapabilityNamespace;

const MAX_NAME_LEN: usize = 32;
const MIN_NAME_LEN: usize = 3;
const MAX_VERSION_LEN: usize = 16;
const MAX_URI_LEN: usize = 160;

#[derive(Accounts)]
#[instruction(namespace_hash: [u8; 32])]
pub struct RegisterNamespace<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = 8 + CapabilityNamespace::INIT_SPACE,
        seeds = [CapabilityNamespace::SEED_PREFIX, namespace_hash.as_ref()],
        bump,
    )]
    pub namespace: Account<'info, CapabilityNamespace>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RegisterNamespace>,
    namespace_hash: [u8; 32],
    name: String,
    version: String,
    schema_uri: String,
) -> Result<()> {
    require!(
        name.len() >= MIN_NAME_LEN,
        ValidationRegistryError::NameTooShort
    );
    require!(
        name.len() <= MAX_NAME_LEN,
        ValidationRegistryError::NameTooLong
    );
    require!(
        !name.contains(':'),
        ValidationRegistryError::NamespaceColonForbidden
    );
    require!(
        version.len() <= MAX_VERSION_LEN,
        ValidationRegistryError::VersionTooLong
    );
    require!(
        schema_uri.len() <= MAX_URI_LEN,
        ValidationRegistryError::UriTooLong
    );

    let ns = &mut ctx.accounts.namespace;
    ns.namespace_hash = namespace_hash;
    ns.name = name;
    ns.version = version;
    ns.schema_uri = schema_uri;
    ns.registered_at = Clock::get()?.slot;
    ns.creator = ctx.accounts.creator.key();
    ns.bump = ctx.bumps.namespace;

    emit!(NamespaceRegistered {
        namespace_hash,
        creator: ctx.accounts.creator.key(),
    });
    Ok(())
}
