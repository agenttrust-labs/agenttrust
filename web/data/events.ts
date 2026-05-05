import { PUBLIC_LINKS } from "@/data/links";

export interface EventItem {
  readonly date: string;
  readonly description: string;
  readonly event: string;
  readonly href: string;
  readonly imageAlt: string;
  readonly imageSrc: string;
  readonly location: string;
}

export const EVENTS_HEADING = "Trust work happens onchain - and in review.";

export const EVENTS_COPY =
  "Join integration walkthroughs, proof reviews, and builder sessions for teams routing AI-agent payments through AgentTrust.";

export const EVENTS: readonly EventItem[] = [
  {
    date: "Devnet",
    description:
      "Wire identity, reputation, and velocity checks into an AI-agent payment route before settlement.",
    event: "Trust gate walkthrough",
    href: PUBLIC_LINKS.docsGatePayment,
    imageAlt: "Abstract trust gate route diagram",
    imageSrc: "/media/event-trust-gate.svg",
    location: "Remote",
  },
  {
    date: "Proofs",
    description:
      "Review the five Kani harnesses and the invariants that keep policy state readable.",
    event: "Formal review session",
    href: PUBLIC_LINKS.docsFormalVerification,
    imageAlt: "Proof grid with verified check paths",
    imageSrc: "/media/event-proof-review.svg",
    location: "GitHub",
  },
  {
    date: "SDK",
    description:
      "Install the package, add the payment gate, and inspect the counterparty response shape.",
    event: "Builder integration lab",
    href: PUBLIC_LINKS.docsQuickstart,
    imageAlt: "SDK integration cards connected by purple lines",
    imageSrc: "/media/event-sdk-lab.svg",
    location: "Solana builders",
  },
  {
    date: "Network",
    description:
      "Map lightweight verification roles for teams that want trust checks close to payment flow.",
    event: "Operator briefing",
    href: PUBLIC_LINKS.docsValidationRegistry,
    imageAlt: "Verifier nodes around an AgentTrust triangle",
    imageSrc: "/media/event-operator-briefing.svg",
    location: "Partner call",
  },
];
