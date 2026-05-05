/**
 * atxp_ai — x402 facilitator with signed-JWT credential flow (TODO).
 *
 * atxp_ai sits in the second wave of facilitator targets per AgentTrust's
 * outreach roadmap. Distinct from Pay.sh / Dexter in that it uses a
 * signed-JWT credential rather than a partially-signed Solana tx — when
 * we wire the real adapter, parseRequest will need an async JWKS fetch
 * to verify the credential signature.
 */

import { NotImplementedAdapter } from "./_base";
import { FacilitatorProtocol } from "../types";

export class Atxp extends NotImplementedAdapter {
  readonly name        = "atxp";
  readonly description = "atxp_ai — JWT-bound x402 facilitator (integration TODO)";
  readonly protocols: ReadonlyArray<FacilitatorProtocol> = ["x402"];
}
