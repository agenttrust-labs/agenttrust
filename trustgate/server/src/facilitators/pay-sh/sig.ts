/**
 * Ed25519 sign + verify + canonical-bytes builders for B5 SERVICE-signed
 * challenges.
 *
 * The signed envelope binds the SERVICE's authority to the payment
 * requirements at 402-emission time. AgentTrust verifies the signature
 * before running the policy gate. This closes the race-attack surface
 * where an attacker, having seen a confirmed Solana tx on chain,
 * fabricates fresh `paymentRequirements` (with their own paymentIdHash)
 * and races the legitimate /settle call. Without an authentic signature,
 * the fabricated requirements are rejected at parseRequest.
 *
 * Two domains, both ed25519 over a deterministic JSON canonicalisation:
 *
 *   - challenge (SERVICE → AgentTrust):  identifies the requirements
 *   - decision  (AgentTrust → SERVICE):  identifies the verify-response
 *                                        decision so the caller can
 *                                        verify the response wasn't
 *                                        tampered with in transit
 *
 * Canonicalisation is JSON.stringify with explicit field order. Any
 * change to the field list or order is a breaking version bump (the
 * domain string carries the version suffix).
 */

import nacl from "tweetnacl";

const FACILITATOR_CHALLENGE_DOMAIN = "agenttrust.facilitator.challenge.v1";
const FACILITATOR_DECISION_DOMAIN  = "agenttrust.facilitator.decision.v1";

export interface ChallengeSignArgs {
  readonly issuedAt:        number;     // unix ms
  readonly network:         string;     // network slug
  readonly amount:          bigint;     // atomic units
  readonly asset:           string;     // SPL mint base58
  readonly payTo:           string;     // SPL transfer destination base58
  readonly payerAgentAsset: string;     // Quantu agent PDA base58
  readonly payeeAgentAsset: string;     // Quantu agent PDA base58
  readonly payeeRecipient:  string;     // SPL transfer destination base58
  readonly policyId:        number;
  readonly paymentIdHashHex: string;    // 64-char hex
}

export function canonicalChallengeBytes(args: ChallengeSignArgs): Uint8Array {
  const canonical = JSON.stringify({
    domain:           FACILITATOR_CHALLENGE_DOMAIN,
    issuedAt:         args.issuedAt,
    network:          args.network.toLowerCase(),
    amount:           args.amount.toString(),
    asset:            args.asset,
    payTo:            args.payTo,
    payerAgentAsset:  args.payerAgentAsset,
    payeeAgentAsset:  args.payeeAgentAsset,
    payeeRecipient:   args.payeeRecipient,
    policyId:         args.policyId,
    paymentIdHash:    args.paymentIdHashHex,
  });
  return new TextEncoder().encode(canonical);
}

export interface DecisionSignArgs {
  readonly issuedAt:         number;
  readonly paymentIdHashHex: string;
  readonly decisionJson:     string;    // JSON.stringify(decision)
}

export function canonicalDecisionBytes(args: DecisionSignArgs): Uint8Array {
  const canonical = JSON.stringify({
    domain:        FACILITATOR_DECISION_DOMAIN,
    issuedAt:      args.issuedAt,
    paymentIdHash: args.paymentIdHashHex,
    decision:      args.decisionJson,
  });
  return new TextEncoder().encode(canonical);
}

/** ed25519 sign with a 64-byte Solana secretKey (or a 32-byte raw priv). */
export function signEnvelope(message: Uint8Array, secretKey: Uint8Array): Uint8Array {
  return nacl.sign.detached(message, secretKey);
}

/** ed25519 verify against a 32-byte ed25519 pubkey (Solana wallet pubkey bytes). */
export function verifyEnvelope(
  message:   Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array,
): boolean {
  if (signature.length !== nacl.sign.signatureLength) return false;
  if (publicKey.length !== nacl.sign.publicKeyLength) return false;
  try {
    return nacl.sign.detached.verify(message, signature, publicKey);
  } catch {
    return false;
  }
}

export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("hex length must be even");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export const SIGNATURE_HEX_LEN = nacl.sign.signatureLength * 2; // 128
