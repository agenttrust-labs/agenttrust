/**
 * Cascade Dexter — x402 facilitator (TODO).
 *
 * Dexter is one of the production x402 facilitators on Solana
 * (per `docs/plan/research/05-trustgate-x402-class.md` §B and the
 * AgentTrust facilitator-priority order in
 * `research/00-thesis/agenttrust-first-buyer.md`). This stub exists so
 * `getActiveAdapter('dexter')` returns a recognisable error instead of
 * an "unknown adapter" 400 — callers know the integration is on the
 * roadmap, not absent by accident.
 */

import { NotImplementedAdapter } from "./_base";
import { FacilitatorProtocol } from "../types";

export class Dexter extends NotImplementedAdapter {
  readonly name        = "dexter";
  readonly description = "Cascade Dexter — x402 facilitator (integration TODO)";
  readonly protocols: ReadonlyArray<FacilitatorProtocol> = ["x402"];
}
