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
  { text: "Use AgentTrust with the wallets, agent IDs, and Solana programs your app already runs. " },
  { text: "Gate payments with reputation checks, then settle with confidence.", isDim: true },
] as const;

export const PLUG_CTA = {
  href: PUBLIC_LINKS.docsX402,
  label: "Check Integration Briefing",
} as const;

export const PLUG_CHIP_ROWS: readonly PlugChipRow[] = [
  {
    duration: "42s",
    offset: "-4vw",
    labels: [
      "Wallets",
      "Agent IDs",
      "Trust Policy",
      "Reputation",
      "Solana Programs",
      "Settlement",
      "Proof Status",
    ],
  },
  {
    duration: "48s",
    offset: "-18vw",
    reverse: true,
    labels: [
      "Payments",
      "Identity",
      "Research",
      "Smart Contracts",
      "Risk Checks",
      "Wallets",
      "Audit Trail",
    ],
  },
  {
    duration: "44s",
    offset: "-10vw",
    labels: [
      "Security",
      "Agent IDs",
      "Reputation",
      "Tools & Services",
      "Payments",
      "Proof Status",
      "Settlement",
    ],
  },
] as const;
