export interface TrilemmaPillar {
  readonly label: string;
  readonly caption: string;
}

export interface TrilemmaCopy {
  readonly center: string;
  readonly leadLines: readonly string[];
  readonly pillars: readonly TrilemmaPillar[];
  readonly resolvePrefix: string;
  readonly resolveEmphasis: string;
  readonly resolveSuffix: string;
}

export const TRILEMMA_COPY: TrilemmaCopy = {
  center: "All before settlement.",
  leadLines: [
    "AI-agent payments used to choose between",
    "speed, identity confidence, and settlement certainty.",
  ],
  pillars: [
    { label: "Rules", caption: "Spend control" },
    { label: "Identity", caption: "Counterparty signal" },
    { label: "Validation", caption: "Fresh reputation" },
  ],
  resolveEmphasis: "before",
  resolvePrefix: "AgentTrust connects all three",
  resolveSuffix: "value moves.",
};
