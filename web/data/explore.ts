import { PUBLIC_LINKS } from "@/data/links";

export interface ExploreCard {
  readonly description: string;
  readonly href: string;
  readonly imageAlt: string;
  readonly imageSrc: string;
  readonly title: string;
}

export const EXPLORE_HEADING = "Explore the x402 trust layer";

export const EXPLORE_CARDS: readonly ExploreCard[] = [
  {
    description:
      "Run the Pay.sh route, inspect the SERVICE-signed challenge, and see the allow or deny branch.",
    href: PUBLIC_LINKS.docsPayShAdapter,
    imageAlt: "",
    imageSrc: "/media/explore-trust-layer.svg",
    title: "Pay.sh Integration",
  },
  {
    description:
      "Copy the adapter contract, keep the routes untouched, and bring the next facilitator online.",
    href: PUBLIC_LINKS.docsFacilitatorAdapters,
    imageAlt: "",
    imageSrc: "/media/explore-builder-kit.svg",
    title: "Adapter Playbook",
  },
];
