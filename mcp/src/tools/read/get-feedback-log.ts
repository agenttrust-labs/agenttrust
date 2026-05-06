/**
 * `agenttrust_get_feedback_log` — fetch FeedbackEmissionLog PDA by
 * payment_id_hash. Returns the score that was emitted, dispute flag,
 * emission slot.
 */

import { z } from "zod";

import { deriveFeedbackLogPda } from "../../chain";
import { explorerUrl } from "../../config";
import { HexHashSchema, hexToBytes, bytesToHex, toDecString } from "../common";
import type { Tool, ToolContext } from "../types";

const InputSchema = z.object({
  payment_id_hash: HexHashSchema.describe("32-byte SHA-256 hash of the payment_id, hex"),
});
type Input = z.infer<typeof InputSchema>;

interface Output {
  pda:                string;
  explorerUrl:        string;
  exists:             boolean;
  log?: {
    paymentIdHashHex: string;
    score:            number;
    isDispute:        boolean;
    emittedAtSlot:    string;
  };
}

export const getFeedbackLogTool: Tool<Input, Output> = {
  name:        "agenttrust_get_feedback_log",
  description:
    "Look up the FeedbackEmissionLog by 32-byte payment_id_hash (hex). " +
    "Returns the emitted score, whether it was an emit or dispute path, " +
    "and the slot at which feedback was finalised. exists=false when no " +
    "feedback has been emitted for that payment yet.",
  inputSchema: InputSchema,

  async handler(input: Input, ctx: ToolContext): Promise<Output> {
    const hashBytes = hexToBytes(input.payment_id_hash);
    if (hashBytes.length !== 32) throw new Error("payment_id_hash must decode to 32 bytes");
    const pda = deriveFeedbackLogPda(ctx.chain.cfg.programs.trustgate, Buffer.from(hashBytes));
    const trustgate = await ctx.chain.trustgate();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await (trustgate.account as any).feedbackEmissionLog.fetchNullable(pda);
    if (!data) {
      return {
        pda:         pda.toBase58(),
        explorerUrl: explorerUrl(ctx.chain.cfg, "address", pda.toBase58()),
        exists:      false,
      };
    }
    return {
      pda:         pda.toBase58(),
      explorerUrl: explorerUrl(ctx.chain.cfg, "address", pda.toBase58()),
      exists:      true,
      log: {
        paymentIdHashHex: bytesToHex(data.paymentIdHash ?? hashBytes),
        score:            Number(data.score ?? 0),
        isDispute:        Number(data.isDispute ?? 0) !== 0,
        emittedAtSlot:    toDecString(data.emittedAtSlot),
      },
    };
  },
};
