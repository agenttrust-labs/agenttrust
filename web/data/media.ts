import { PUBLIC_LINKS } from "@/data/links";

export interface MediaCard {
  readonly href: string;
  readonly imageAlt: string;
  readonly imageSrc: string;
  readonly title: string;
}

export const MEDIA_HEADING = "AgentTrust Media";

export const MEDIA_COPY =
  "Follow proof notes, builder updates, and payment-gating writeups from the AgentTrust team.";

export const MEDIA_CARDS: readonly MediaCard[] = [
  {
    href: PUBLIC_LINKS.docsFormalVerification,
    imageAlt: "Purple proof notes layered over a verification grid",
    imageSrc: "/media/media-proof-notes.svg",
    title: "Proof Notes",
  },
  {
    href: PUBLIC_LINKS.docsChangelog,
    imageAlt: "Builder log panels connected by trust-gate routes",
    imageSrc: "/media/media-builder-log.svg",
    title: "Builder Log",
  },
  {
    href: PUBLIC_LINKS.docsX402,
    imageAlt: "AgentTrust field notes arranged around the triangle mark",
    imageSrc: "/media/media-field-notes.svg",
    title: "Field Notes",
  },
];
