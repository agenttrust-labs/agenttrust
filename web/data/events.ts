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

export const EVENTS_HEADING = "Facilitator work happens onchain - and in review.";

export const EVENTS_COPY =
  "Follow Pay.sh walkthroughs, adapter reviews, and atomic settlement sessions for teams routing x402 payments through AgentTrust.";

export const EVENTS: readonly EventItem[] = [
  {
    date: "Pay.sh",
    description:
      "Run the Express demo, emit the 402 envelope, retry with PAYMENT-SIGNATURE, and inspect the decision.",
    event: "Pay.sh adapter walkthrough",
    href: PUBLIC_LINKS.docsPayShAdapter,
    imageAlt: "Abstract trust gate route diagram",
    imageSrc: "/media/event-trust-gate.svg",
    location: "Remote",
  },
  {
    date: "Atomic",
    description:
      "Review how policy, transfer, and feedback stay in one signed settlement path.",
    event: "Settlement review session",
    href: PUBLIC_LINKS.docsAtomicSettlement,
    imageAlt: "Proof grid with verified check paths",
    imageSrc: "/media/event-proof-review.svg",
    location: "GitHub",
  },
  {
    date: "Adapter",
    description:
      "Implement the five-method FacilitatorAdapter shape and keep protocol quirks out of the routes.",
    event: "New facilitator lab",
    href: PUBLIC_LINKS.docsFacilitatorAdapters,
    imageAlt: "SDK integration cards connected by purple lines",
    imageSrc: "/media/event-sdk-lab.svg",
    location: "Solana builders",
  },
  {
    date: "Roadmap",
    description:
      "Track Pay.sh live status, Dexter integration work, and atxp_ai / MCPay placeholders honestly.",
    event: "Facilitator map",
    href: PUBLIC_LINKS.docsFacilitatorAdapters,
    imageAlt: "Verifier nodes around an AgentTrust triangle",
    imageSrc: "/media/event-operator-briefing.svg",
    location: "Partner call",
  },
];
