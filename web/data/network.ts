export interface NetworkLabel {
  readonly text: string;
}

export interface NetworkCopySegment {
  readonly isDim?: boolean;
  readonly text: string;
}

export const NETWORK_HEADLINE = {
  firstLine: "Run a verifier.",
  secondLine: "Join the trust layer.",
} as const;

export const NETWORK_LABELS: readonly NetworkLabel[] = [
  { text: "/ Light clients" },
  { text: "/ Independent operators" },
  { text: "/ Open verification" },
] as const;

export const NETWORK_COPY: readonly NetworkCopySegment[] = [
  { text: "AgentTrust keeps verification lightweight so operators can run trust checks close to the programs they secure. " },
  { text: "Identity, reputation, and policy proofs stay readable without heavy hardware.", isDim: true },
] as const;

export const NETWORK_CTA = {
  href: "#events",
  label: "Learn About The Network",
} as const;
