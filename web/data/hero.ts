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
  "AgentTrust completes the Foundation's ERC-8004 trust stack.";

export const HERO_HEADLINE_LINES: readonly (readonly HeadlineWord[])[] = [
  [
    { text: "Trust" },
    { text: "AI-agent" },
    { text: "payments" },
    { text: "before", isEmphasized: true },
  ],
  [
    { text: "they" },
    { text: "settle." },
  ],
];

export const HERO_HEADLINE =
  "Trust AI-agent payments before they settle.";

export const HERO_BODY =
  "AgentTrust gates payment intent on counterparty identity, reputation, policy, and verification proofs for Solana builders.";

export const HERO_ACTIONS: readonly HeroAction[] = [
  { icon: "globe", label: "Integrate SDK", href: "#build", variant: "primary" },
  {
    icon: "file",
    label: "Read the Documentation",
    href: "#resources",
    variant: "secondary",
  },
];

export const HERO_MEDIA = {
  src: "/media/agenttrust-hero-loop.mp4",
  poster: "/media/agenttrust-hero-poster.png",
  label: "Abstract AgentTrust payment verification loop",
} as const;

export const HERO_REFERENCES = {
  github: "github.com/mohit-1710/agenttrust",
  npm: "@agenttrust-sdk/trustgate",
  license: "MIT",
} as const;
