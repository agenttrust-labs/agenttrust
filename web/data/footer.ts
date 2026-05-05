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
  readonly icon: "discord" | "linkedin" | "x" | "youtube";
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
      { href: "#home", label: "Home" },
      { href: "#trust-stack", label: "Trust Stack" },
      { href: "#performance", label: "Performance" },
      { href: "#network", label: "Network" },
    ],
  },
  {
    title: "Build",
    links: [
      { href: "#plug-and-play", label: "Documentation" },
      { href: "#explore", label: "Integration Guide" },
      { href: "#network", label: "Trust Operators" },
      { href: "#explore", label: "Integrations" },
    ],
  },
  {
    title: "Proofs",
    links: [
      { href: "#benchmark", label: "Benchmark" },
      { href: "#trilemma", label: "Kani Checks" },
      { href: "#events", label: "Operator Briefings" },
      { href: "#media", label: "Field Notes" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "#footer", label: "MIT License" },
      { href: "#footer", label: "Privacy" },
      { href: "#footer", label: "Terms" },
    ],
  },
];

export const FOOTER_UTILITY_LINKS: readonly FooterUtilityLink[] = [
  { href: "#footer", label: "Privacy Policy" },
  { href: "#footer", label: "Terms of Service" },
];

export const FOOTER_SOCIAL_LINKS: readonly FooterSocialLink[] = [
  { href: "#footer", icon: "x", label: "X" },
  { href: "#footer", icon: "discord", label: "Discord" },
  { href: "#footer", icon: "youtube", label: "YouTube" },
  { href: "#footer", icon: "linkedin", label: "LinkedIn" },
];
