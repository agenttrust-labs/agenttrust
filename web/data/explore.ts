export interface ExploreCard {
  readonly description: string;
  readonly href: string;
  readonly imageAlt: string;
  readonly imageSrc: string;
  readonly title: string;
}

export const EXPLORE_HEADING = "Explore the AgentTrust trust layer";

export const EXPLORE_CARDS: readonly ExploreCard[] = [
  {
    description:
      "See how counterparty checks, velocity rules, and validation freshness combine before settlement.",
    href: "#trust-stack",
    imageAlt: "",
    imageSrc: "/media/explore-trust-layer.svg",
    title: "Explore the Trust Layer",
  },
  {
    description:
      "Install the SDK, wire a payment gate, and test the devnet programs with verified constraints.",
    href: "#plug-and-play",
    imageAlt: "",
    imageSrc: "/media/explore-builder-kit.svg",
    title: "Start Building",
  },
];
