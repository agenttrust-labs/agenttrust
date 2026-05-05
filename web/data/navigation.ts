import { PUBLIC_LINKS } from "@/data/links";

export interface NavigationLink {
  readonly label: string;
  readonly href: string;
  readonly menu?: readonly NavigationMenuColumn[];
}

export interface NavigationCta {
  readonly label: string;
  readonly href: string;
}

export type NavigationIcon =
  | "book"
  | "box"
  | "code"
  | "file"
  | "grid"
  | "shield"
  | "terminal"
  | "users";

export interface NavigationMenuItem {
  readonly description: string;
  readonly href: string;
  readonly icon: NavigationIcon;
  readonly label: string;
}

export interface NavigationMenuColumn {
  readonly items: readonly NavigationMenuItem[];
  readonly title: string;
}

export const PRIMARY_NAV_LINKS: readonly NavigationLink[] = [
  { label: "Home", href: "#home" },
  {
    label: "Explore",
    href: "#explore",
    menu: [
      {
        title: "Explore AgentTrust",
        items: [
          {
            label: "Trust Layer",
            description: "Counterparty checks before AI-agent payments settle.",
            href: "#benchmark",
            icon: "shield",
          },
          {
            label: "Proof Matrix",
            description: "Five verified invariants with harness names visible.",
            href: "#trilemma",
            icon: "grid",
          },
          {
            label: "Program IDs",
            description: "Devnet addresses for every trust gate component.",
            href: PUBLIC_LINKS.docsProgramIds,
            icon: "file",
          },
        ],
      },
      {
        title: "Trust Signals",
        items: [
          {
            label: "Policy Gates",
            description: "Read payment limits, pauses, and reputation status.",
            href: "#performance",
            icon: "box",
          },
          {
            label: "Identity Reads",
            description: "Check counterparty identity before release.",
            href: "#network",
            icon: "users",
          },
          {
            label: "Settlement Flow",
            description: "See the trust check path from request to allow.",
            href: "#trilemma",
            icon: "terminal",
          },
        ],
      },
    ],
  },
  {
    label: "Build",
    href: PUBLIC_LINKS.docsQuickstart,
    menu: [
      {
        title: "Start Building",
        items: [
          {
            label: "Integrate SDK",
            description: "Install the client and call trust gates in minutes.",
            href: PUBLIC_LINKS.docsQuickstart,
            icon: "code",
          },
          {
            label: "Developer Brief",
            description: "Read exact accounts, checks, and return states.",
            href: PUBLIC_LINKS.docsArchitecture,
            icon: "book",
          },
          {
            label: "Builder Notes",
            description: "Follow integration updates and proof writeups.",
            href: PUBLIC_LINKS.docsChangelog,
            icon: "file",
          },
        ],
      },
      {
        title: "Devnet Surface",
        items: [
          {
            label: "Policy Vault",
            description: "Thresholds, pausing, and signer controls.",
            href: PUBLIC_LINKS.docsPolicyVault,
            icon: "shield",
          },
          {
            label: "Trust Gate",
            description: "Payment allow or deny checks.",
            href: PUBLIC_LINKS.docsTrustGate,
            icon: "terminal",
          },
          {
            label: "Registry",
            description: "Validation expiry and counterparty status.",
            href: PUBLIC_LINKS.docsValidationRegistry,
            icon: "grid",
          },
        ],
      },
    ],
  },
  {
    label: "Resources",
    href: PUBLIC_LINKS.docs,
    menu: [
      {
        title: "References",
        items: [
          {
            label: "Documentation",
            description: "Implementation notes and account layouts.",
            href: PUBLIC_LINKS.docs,
            icon: "book",
          },
          {
            label: "SDK Brief",
            description: "Payment-gate client usage for TypeScript apps.",
            href: PUBLIC_LINKS.docsSdk,
            icon: "box",
          },
          {
            label: "MIT License",
            description: "Open-source grant-friendly license surface.",
            href: PUBLIC_LINKS.githubLicense,
            icon: "file",
          },
        ],
      },
      {
        title: "Verification",
        items: [
          {
            label: "Kani Harnesses",
            description: "Paused, velocity, tier, expiry, and threshold checks.",
            href: PUBLIC_LINKS.docsFormalVerification,
            icon: "shield",
          },
          {
            label: "Test Matrix",
            description: "Program and SDK checks for payment gates.",
            href: PUBLIC_LINKS.docsGatePayment,
            icon: "grid",
          },
          {
            label: "Contact",
            description: "Reach the maintainers for integration review.",
            href: PUBLIC_LINKS.githubIssues,
            icon: "users",
          },
        ],
      },
    ],
  },
];

export const PRIMARY_NAV_CTA: NavigationCta = {
  label: "Explore Trust Layer",
  href: "#explore",
};
