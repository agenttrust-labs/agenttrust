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
  "Pay.sh integration live on Solana devnet - foundation-aligned, mainnet-ready x402 trust.";

export const HERO_HEADLINE_LINES: readonly (readonly HeadlineWord[])[] = [
  [
    { text: "Trust" },
    { text: "any" },
    { text: "x402" },
    { text: "payment" },
  ],
  [
    { text: "before", isEmphasized: true },
    { text: "settlement." },
  ],
];

export const HERO_HEADLINE =
  "Trust any x402 payment before settlement.";

export const HERO_BODY =
  "AgentTrust plugs into Pay.sh today and any x402 facilitator next. Policy, SPL transfer, and feedback compose into one signed Solana transaction.";

export const HERO_ACTIONS: readonly HeroAction[] = [
  {
    icon: "globe",
    label: "Run Pay.sh Demo",
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
