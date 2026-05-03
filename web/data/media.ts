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
    href: "#proofs",
    imageAlt: "Purple proof notes layered over a verification grid",
    imageSrc: "/media/media-proof-notes.svg",
    title: "Proof Notes",
  },
  {
    href: "#build",
    imageAlt: "Builder log panels connected by trust-gate routes",
    imageSrc: "/media/media-builder-log.svg",
    title: "Builder Log",
  },
  {
    href: "#events",
    imageAlt: "AgentTrust field notes arranged around the triangle mark",
    imageSrc: "/media/media-field-notes.svg",
    title: "Field Notes",
  },
];
