/**
 * `agenttrust_get_validation_attestation` — query the ValidationRegistry
 * for an attestation matching `(subject_asset, capability_hash)`.
 *
 * ValidationAttestation PDAs are keyed by (subject, capability, attestor),
 * so a (subject, capability) pair may have 0..N attestations from
 * different attestors. We list every match via getProgramAccounts +
 * memcmp filters at offsets 8 and 40 (the layout pinned in
 * `state/validation_attestation.rs`).
 */

import bs58 from "bs58";
import { z } from "zod";

import { explorerUrl } from "../../config";
import { PubkeySchema, parsePubkey, HexHashSchema, hexToBytes, bytesToHex, pubkeyOrNull, toDecString } from "../common";
import type { Tool, ToolContext } from "../types";

const InputSchema = z.object({
  subject_asset:    PubkeySchema.describe("Quantu agent asset whose capability is being attested"),
  capability_hash:  HexHashSchema.describe("32-byte capability hash (hex)"),
  attestor:         PubkeySchema.optional()
                       .describe("Optional: filter to this attestor's attestation (returns 0 or 1)"),
});
type Input = z.infer<typeof InputSchema>;

interface AttestationRow {
  pda:                   string;
  explorerUrl:           string;
  attestor:              string;
  expiresAt:             string;
  issuedAt:              string;
  revoked:               boolean;
  revokedAt:             string;
  claimPayloadHashHex:   string;
  claimUriHashHex:       string;
}

interface Output {
  subjectAsset:       string;
  capabilityHashHex:  string;
  count:              number;
  attestations:       AttestationRow[];
}

// state/validation_attestation.rs layout — pinned offsets.
const VA_SUBJECT_OFFSET    = 8;       // off  8..40
const VA_CAPABILITY_OFFSET = 40;      // off 40..72
const VA_ATTESTOR_OFFSET   = 72;      // off 72..104

export const getValidationAttestationTool: Tool<Input, Output> = {
  name:        "agenttrust_get_validation_attestation",
  description:
    "Query the ValidationRegistry for ValidationAttestation PDAs matching " +
    "(subject_asset, capability_hash). Each attestor produces a separate " +
    "attestation; the optional `attestor` filter narrows to one. Returns " +
    "expiresAt slot, revoked flag, claim payload hash — exactly the fields " +
    "PolicyVault's RequireValidation policy reads at gate time.",
  inputSchema: InputSchema,

  async handler(input: Input, ctx: ToolContext): Promise<Output> {
    const subject = parsePubkey(input.subject_asset, "subject_asset");
    const capHash = hexToBytes(input.capability_hash);
    if (capHash.length !== 32) throw new Error("capability_hash must decode to 32 bytes");
    const program = await ctx.chain.validationRegistry();

    const filters: { memcmp: { offset: number; bytes: string } }[] = [
      { memcmp: { offset: VA_SUBJECT_OFFSET, bytes: subject.toBase58() } },
      { memcmp: { offset: VA_CAPABILITY_OFFSET, bytes: bs58.encode(capHash) } },
    ];
    if (input.attestor) {
      const attestor = parsePubkey(input.attestor, "attestor");
      filters.push({ memcmp: { offset: VA_ATTESTOR_OFFSET, bytes: attestor.toBase58() } });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accounts = await (program.account as any).validationAttestation.all(filters);

    const attestations: AttestationRow[] = accounts.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (entry: any) => ({
        pda:                 entry.publicKey.toBase58(),
        explorerUrl:         explorerUrl(ctx.chain.cfg, "address", entry.publicKey.toBase58()),
        attestor:            pubkeyOrNull(entry.account.attestor) ?? "",
        expiresAt:           toDecString(entry.account.expiresAt),
        issuedAt:            toDecString(entry.account.issuedAt),
        revoked:             !!entry.account.revoked,
        revokedAt:           toDecString(entry.account.revokedAt),
        claimPayloadHashHex: bytesToHex(entry.account.claimPayloadHash ?? []),
        claimUriHashHex:     bytesToHex(entry.account.claimUriHash ?? []),
      }),
    );

    return {
      subjectAsset:      subject.toBase58(),
      capabilityHashHex: bytesToHex(capHash),
      count:             attestations.length,
      attestations,
    };
  },
};

