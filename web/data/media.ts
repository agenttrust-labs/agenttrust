import { PUBLIC_LINKS } from "@/data/links";

export interface MediaCard {
  readonly eyebrow: string;
  readonly href: string;
  readonly imageAlt: string;
  readonly imageSrc: string;
  readonly summary: string;
  readonly title: string;
}

export const MEDIA_HEADING = "AgentTrust Media";

export const MEDIA_COPY =
  "Follow Pay.sh integration notes, adapter updates, and settlement writeups from the AgentTrust team.";

export const MEDIA_CARDS: readonly MediaCard[] = [
  {
    eyebrow: "Pay.sh integration",
    href: PUBLIC_LINKS.docsPayShAdapter,
    imageAlt: "AgentTrust and Pay.sh integration cover art with x402 challenge notes",
    imageSrc: "/media/media-proof-notes.svg",
    summary: "Service-signed challenge envelopes, adapter calls, and devnet wiring.",
    title: "Pay.sh Notes",
  },
  {
    eyebrow: "Facilitator adapters",
    href: PUBLIC_LINKS.docsFacilitatorAdapters,
    imageAlt: "Adapter playbook cover showing facilitator files connected to AgentTrust",
    imageSrc: "/media/media-builder-log.svg",
    summary: "One adapter file for Pay.sh today and the next x402 facilitators later.",
    title: "Adapter Log",
  },
  {
    eyebrow: "Atomic settlement",
    href: PUBLIC_LINKS.docsAtomicSettlement,
    imageAlt: "Atomic settlement cover showing gate, transfer, and feedback in one route",
    imageSrc: "/media/media-field-notes.svg",
    summary: "Gate payment, SPL transfer, and feedback composed into one signed transaction.",
    title: "Settlement Notes",
  },
];
