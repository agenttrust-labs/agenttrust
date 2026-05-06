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
  "Live on Solana devnet - identity, policy, and feedback checks before settlement.";

export const HERO_HEADLINE_LINES: readonly (readonly HeadlineWord[])[] = [
  [
    { text: "Trust" },
    { text: "AI-agent" },
    { text: "payments" },
  ],
  [
    { text: "before", isEmphasized: true },
    { text: "settlement." },
  ],
];

export const HERO_HEADLINE =
  "Trust AI-agent payments before settlement.";

export const HERO_BODY =
  "AgentTrust ties payment decisions to identity, reputation, and policy. Pay.sh proves the first live x402 route; the same trust path can follow the next facilitator.";

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
