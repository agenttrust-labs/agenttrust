export interface FooterLink {
  readonly href: string;
  readonly label: string;
}

export interface FooterLinkGroup {
  readonly title: string;
  readonly links: readonly FooterLink[];
}

export interface FooterUtilityLink extends FooterLink {
  readonly isExternal?: boolean;
}

export interface FooterSocialLink extends FooterLink {
  readonly icon: "discord" | "x";
}

export const NEWSLETTER_CONTENT = {
  title: "Subscribe to AgentTrust Notes",
  body: "Proof updates, SDK notes, and payment-risk integration logs.",
  helper: "Monthly field notes for builders shipping agent payments.",
};

export const FOOTER_LINK_GROUPS: readonly FooterLinkGroup[] = [
  {
    title: "Product",
    links: [
      { href: "#monad", label: "Home" },
      { href: "#trust-stack", label: "Trust Stack" },
      { href: "#performance", label: "Performance" },
      { href: "#network", label: "Network" },
    ],
  },
  {
    title: "Build",
    links: [
      { href: "#plug-and-play", label: "Documentation" },
      { href: "https://www.npmjs.com/package/@agenttrust-sdk/trustgate", label: "SDK Package" },
      { href: "https://github.com/mohit-1710/agenttrust", label: "GitHub" },
      { href: "#explore", label: "Integrations" },
    ],
  },
  {
    title: "Proofs",
    links: [
      { href: "#a-new-benchmark", label: "Benchmark" },
      { href: "#the-trilemma", label: "Kani Checks" },
      { href: "#events", label: "Operator Briefings" },
      { href: "#media", label: "Field Notes" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "https://github.com/mohit-1710/agenttrust/blob/main/LICENSE", label: "MIT License" },
      { href: "#footer", label: "Privacy" },
      { href: "#footer", label: "Terms" },
    ],
  },
];

export const FOOTER_UTILITY_LINKS: readonly FooterUtilityLink[] = [
  {
    href: "https://github.com/mohit-1710/agenttrust",
    isExternal: true,
    label: "GitHub",
  },
  {
    href: "https://www.npmjs.com/package/@agenttrust-sdk/trustgate",
    isExternal: true,
    label: "npm Package",
  },
  { href: "#footer", label: "Privacy Policy" },
  { href: "#footer", label: "Terms of Service" },
];

export const FOOTER_SOCIAL_LINKS: readonly FooterSocialLink[] = [
  { href: "#footer", icon: "x", label: "X" },
  { href: "#footer", icon: "discord", label: "Discord" },
];
