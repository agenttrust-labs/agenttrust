import { PUBLIC_LINKS } from "@/data/links";

export interface PlugChipRow {
  readonly duration: string;
  readonly labels: readonly string[];
  readonly offset: string;
  readonly reverse?: boolean;
}

export interface PlugCopySegment {
  readonly isDim?: boolean;
  readonly text: string;
}

export const PLUG_SECTION_TITLE = "Plug and play.";

export const PLUG_COPY: readonly PlugCopySegment[] = [
  { text: "Use AgentTrust with Pay.sh now, then bring the same policy path to the next x402 facilitator. " },
  { text: "Adapters translate the wire format; Solana programs keep the decision and feedback path stable.", isDim: true },
] as const;

export const PLUG_CTA = {
  href: PUBLIC_LINKS.docsPayShAdapter,
  label: "Open Pay.sh Walkthrough",
} as const;

export const PLUG_CHIP_ROWS: readonly PlugChipRow[] = [
  {
    duration: "42s",
    offset: "-4vw",
    labels: [
      "Pay.sh",
      "x402 v2",
      "SERVICE Signature",
      "VerifyContext",
      "Gate Decision",
      "SPL Transfer",
      "Feedback CPI",
    ],
  },
  {
    duration: "48s",
    offset: "-18vw",
    reverse: true,
    labels: [
      "FacilitatorAdapter",
      "Dexter",
      "atxp_ai",
      "MCPay",
      "ReplayCache",
      "Proof Validator",
      "Receipt",
    ],
  },
  {
    duration: "44s",
    offset: "-10vw",
    labels: [
      "Policy",
      "Identity",
      "Validation",
      "Atomic Tx",
      "Devnet",
      "Mainnet Ready",
      "ERC-8004 Feedback",
    ],
  },
] as const;
