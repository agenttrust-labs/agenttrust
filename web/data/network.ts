import { PUBLIC_LINKS } from "@/data/links";

export interface NetworkLabel {
  readonly caption: string;
  readonly text: string;
}

export interface NetworkCopySegment {
  readonly isDim?: boolean;
  readonly text: string;
}

export interface NetworkSignal {
  readonly body: string;
  readonly eyebrow: string;
  readonly title: string;
}

export const NETWORK_HEADLINE = {
  firstLine: "Bring any x402 route.",
  secondLine: "Keep one trust path.",
} as const;

export const NETWORK_LABELS: readonly NetworkLabel[] = [
  {
    text: "/ Pay.sh live",
    caption: "Foundation-aligned facilitator path running today.",
  },
  {
    text: "/ Dexter adapter path",
    caption: "Same five-method contract, no route rewrites.",
  },
  {
    text: "/ atxp_ai + MCPay roadmap",
    caption: "Future facilitators stay explicit, not hard-coded.",
  },
] as const;

export const NETWORK_COPY: readonly NetworkCopySegment[] = [
  { text: "AgentTrust sits between the agent and the facilitator they choose. " },
  { text: "The adapter handles wire-shape differences while policy, settlement, and feedback remain Solana-native.", isDim: true },
] as const;

export const NETWORK_CTA = {
  href: PUBLIC_LINKS.docsFacilitatorAdapters,
  label: "Add A Facilitator",
} as const;

export const NETWORK_SIGNALS: readonly NetworkSignal[] = [
  {
    eyebrow: "01 / Pay.sh",
    title: "Live route",
    body: "SERVICE-signed challenges enter the same trust path.",
  },
  {
    eyebrow: "02 / Adapter",
    title: "One contract",
    body: "Five methods normalize the facilitator wire shape.",
  },
  {
    eyebrow: "03 / Solana",
    title: "Atomic close",
    body: "Policy, transfer, and feedback settle in one signed transaction.",
  },
] as const;
