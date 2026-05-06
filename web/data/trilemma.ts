export interface TrilemmaPillar {
  readonly label: string;
  readonly caption: string;
}

export interface TrilemmaCopy {
  readonly center: string;
  readonly centerLines: readonly string[];
  readonly leadLines: readonly string[];
  readonly pillars: readonly TrilemmaPillar[];
  readonly resolvePrefix: string;
  readonly resolveEmphasis: string;
  readonly resolveSuffix: string;
}

export const TRILEMMA_COPY: TrilemmaCopy = {
  center: "All before settlement.",
  centerLines: ["All before", "settlement."],
  leadLines: [
    "x402 services used to split policy checks,",
    "token transfer, and feedback into separate trust moments.",
  ],
  pillars: [
    { label: "Pay.sh", caption: "Facilitator path" },
    { label: "Policy", caption: "Gate decision" },
    { label: "Feedback", caption: "ERC-8004 record" },
  ],
  resolveEmphasis: "atomically",
  resolvePrefix: "AgentTrust composes all three",
  resolveSuffix: "on Solana.",
};
