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
            label: "Pay.sh Live",
            description: "Foundation-aligned x402 route with AgentTrust policy.",
            href: PUBLIC_LINKS.docsPayShAdapter,
            icon: "shield",
          },
          {
            label: "Atomic Settlement",
            description: "Policy check, SPL transfer, and feedback in one path.",
            href: PUBLIC_LINKS.docsAtomicSettlement,
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
        title: "Facilitator Signals",
        items: [
          {
            label: "Adapter Contract",
            description: "Five methods, one file, no route rewrites.",
            href: PUBLIC_LINKS.docsFacilitatorAdapters,
            icon: "box",
          },
          {
            label: "SERVICE Signatures",
            description: "Signed challenges close the forged-requirements race.",
            href: PUBLIC_LINKS.docsPayShAdapter,
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
            label: "Run Pay.sh",
            description: "Start the demo server and drive the Pay.sh flow.",
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
            label: "Adapter Notes",
            description: "See Pay.sh live, Dexter in flight, and roadmap stubs.",
            href: PUBLIC_LINKS.docsFacilitatorAdapters,
            icon: "file",
          },
        ],
      },
      {
        title: "Devnet Surface",
        items: [
          {
            label: "Policy Program",
            description: "Thresholds, pausing, and signer controls.",
            href: PUBLIC_LINKS.docsPolicyVault,
            icon: "shield",
          },
          {
            label: "Feedback Program",
            description: "Receipt-grade feedback after settlement.",
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
            label: "Pay.sh Adapter",
            description: "Worked x402 route with Pay.sh and AgentTrust.",
            href: PUBLIC_LINKS.docsPayShAdapter,
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
        title: "Integration",
        items: [
          {
            label: "Facilitator Adapters",
            description: "Pay.sh today, Dexter next, atxp_ai and MCPay marked roadmap.",
            href: PUBLIC_LINKS.docsFacilitatorAdapters,
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
  label: "Read Pay.sh Guide",
  href: PUBLIC_LINKS.docsPayShAdapter,
};
