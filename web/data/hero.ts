import { PUBLIC_LINKS } from "@/data/links";

export interface HeadlineWord {
  readonly text: string;
  readonly isEmphasized?: boolean;
}

export interface HeroAction {
  readonly icon: "file" | "globe";
  readonly label: string;
  readonly href: string;
  readonly variant: "primary" | "secondary";
}

export const HERO_FOUNDATION_LINE =
  "Live on Solana devnet · 6 / 6 Kani proofs · 635 sub-checks";

export const HERO_HEADLINE_LINES: readonly (readonly HeadlineWord[])[] = [
  [
    { text: "Smart" },
    { text: "contracts" },
    { text: "held up." },
  ],
  [
    { text: "The" },
    { text: "human-trust" },
    { text: "layer" },
    { text: "didn't.", isEmphasized: true },
  ],
];

export const HERO_HEADLINE =
  "Smart contracts held up. The human-trust layer didn't.";

export const HERO_BODY =
  "AgentTrust gates AI-agent payments by counterparty trust — completing Solana's ERC-8004 stack with day-one Pay.sh integration.";

export const HERO_ACTIONS: readonly HeroAction[] = [
  {
    icon: "globe",
    label: "Integrate SDK",
    href: PUBLIC_LINKS.docsQuickstart,
    variant: "primary",
  },
  {
    icon: "file",
    label: "Read the Documentation",
    href: PUBLIC_LINKS.docs,
    variant: "secondary",
  },
];

export const HERO_MEDIA = {
  src: "/media/agenttrust-hero-loop.mp4",
  poster: "/media/agenttrust-hero-poster.png",
  label: "Abstract AgentTrust payment verification loop",
} as const;
