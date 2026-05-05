/**
 * MCPay — multi-chain payment facilitator (TODO).
 *
 * MCPay supports both x402 and MPP across Solana + EVM rails. AgentTrust's
 * v1 only gates Solana payments, so the MCPay adapter will need to filter
 * to Solana-network challenges in parseRequest and reject EVM ones.
 */

import { NotImplementedAdapter } from "./_base";
import { FacilitatorProtocol } from "../types";

export class McPay extends NotImplementedAdapter {
  readonly name        = "mcpay";
  readonly description = "MCPay — multi-chain x402 + MPP facilitator (integration TODO)";
  readonly protocols: ReadonlyArray<FacilitatorProtocol> = ["x402", "mpp"];
}
