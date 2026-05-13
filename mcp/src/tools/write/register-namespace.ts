/**
 * `agenttrust_register_namespace` — claim a top-level namespace prefix on
 * the ValidationRegistry by writing a `CapabilityNamespace` PDA.
 *
 * Composes via `buildRegisterNamespaceIx` in the SDK so the on-chain
 * account list + arg encoding stays the canonical source of truth.
 *
 * Idempotent: if the `CapabilityNamespace` PDA already exists with the
 * same `creator` as the signer, this tool returns the existing config
 * without sending a transaction. If the PDA exists with a different
 * creator, the call fails with a structured `chain_error` envelope so
 * the caller cannot silently overwrite or shadow a prior owner. The
 * on-chain `init` constraint forbids re-init regardless.
 *
 * The 0.4.0 design decision keeps namespace registration as its own
 * explicit MCP tool (rather than folding it into `init_policy`) because
 * the namespace claim is permanent, first-come, and cross-tenant. A
 * caller that doesn't realise they're staking a global prefix would
 * otherwise be one keystroke away from blocking everyone else's use of
 * that name.
 */

import { Transaction } from "@solana/web3.js";
import { z } from "zod";

import {
  buildRegisterNamespaceIx,
  computeNamespaceHash,
  deriveCapabilityNamespacePda,
  fetchCapabilityNamespace,
} from "../../chain";
import { explorerUrl } from "../../config";
import type { Tool, ToolContext } from "../types";

const InputSchema = z.object({
  namespace_prefix: z.string().min(3).max(32)
                      .refine((s) => !s.includes(":"), {
                        message: "namespace_prefix must not contain ':' (on-chain NamespaceColonForbidden)",
                      })
                      .describe(
                        "Canonical namespace name (3..=32 chars, no ':'). " +
                        "First-come permanent claim across the registry; the signer becomes the namespace creator. " +
                        "Use this prefix later when calling agenttrust_request_validation.",
                      ),
  version:          z.string().max(16).default("v1")
                      .describe("Namespace version tag (<=16 chars). Defaults to v1."),
  schema_uri:       z.string().max(160).default("")
                      .describe(
                        "Optional off-chain JSON schema URI describing the namespace (<=160 chars). " +
                        "Empty string disables the pointer.",
                      ),
});
type Input = z.infer<typeof InputSchema>;

interface Output {
  txSignature:       string | null;
  explorerTxUrl:     string | null;
  namespacePda:      string;
  namespaceExplorer: string;
  namespacePrefix:   string;
  version:           string;
  schemaUri:         string;
  owner:             string;
  alreadyRegistered: boolean;
}

export const registerNamespaceTool: Tool<Input, Output> = {
  name:        "agenttrust_register_namespace",
  description:
    "Claim a top-level namespace prefix for capabilities. First-come permanent claim " +
    "across the namespace globally. Signer becomes the namespace owner. Use this before " +
    "calling agenttrust_request_validation with a capability_name rooted in your prefix. " +
    "Idempotent: returns the existing config if the prefix is already owned by the signer. " +
    "Requires a signer (KEYPAIR_B58 / KEYPAIR_PATH / Solana CLI default).",
  inputSchema: InputSchema,

  async handler(input: Input, ctx: ToolContext): Promise<Output> {
    const signer  = ctx.chain.requireSigner();
    const program = await ctx.chain.validationRegistry();

    const namespaceHash = computeNamespaceHash(input.namespace_prefix);
    const namespacePda  = deriveCapabilityNamespacePda(
      ctx.chain.cfg.programs.validationRegistry, namespaceHash,
    );

    // Idempotency: if the PDA already exists, return its on-chain state
    // and skip the init. The existing account is the source of truth.
    const existing = await fetchCapabilityNamespace(program, namespaceHash);
    if (existing.data) {
      const creator = existing.data.creator?.toBase58?.() ?? "";
      if (creator && creator !== signer.publicKey.toBase58()) {
        const err = new Error(
          `Namespace '${input.namespace_prefix}' is already claimed by ${creator}. ` +
          `Namespace claims are permanent and first-come; choose a different prefix.`,
        );
        // Surface as a structured chain_error envelope.
        err.name = "AnchorError";
        throw err;
      }
      return {
        txSignature:       null,
        explorerTxUrl:     null,
        namespacePda:      namespacePda.toBase58(),
        namespaceExplorer: explorerUrl(ctx.chain.cfg, "address", namespacePda.toBase58()),
        namespacePrefix:   String(existing.data.name ?? input.namespace_prefix),
        version:           String(existing.data.version ?? input.version),
        schemaUri:         String(existing.data.schemaUri ?? existing.data.schema_uri ?? input.schema_uri),
        owner:             creator,
        alreadyRegistered: true,
      };
    }

    const ix = await buildRegisterNamespaceIx({
      program,
      creator:       signer.publicKey,
      namespaceHash,
      name:          input.namespace_prefix,
      version:       input.version,
      schemaUri:     input.schema_uri,
    });

    const tx = new Transaction().add(ix);
    const txSignature = await ctx.chain.provider.sendAndConfirm(tx, [signer]);

    return {
      txSignature,
      explorerTxUrl:     explorerUrl(ctx.chain.cfg, "tx",      txSignature),
      namespacePda:      namespacePda.toBase58(),
      namespaceExplorer: explorerUrl(ctx.chain.cfg, "address", namespacePda.toBase58()),
      namespacePrefix:   input.namespace_prefix,
      version:           input.version,
      schemaUri:         input.schema_uri,
      owner:             signer.publicKey.toBase58(),
      alreadyRegistered: false,
    };
  },
};
