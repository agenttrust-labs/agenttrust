export interface NavigationLink {
  readonly label: string;
  readonly href: string;
}

export interface NavigationCta {
  readonly label: string;
  readonly href: string;
}

export const PRIMARY_NAV_LINKS: readonly NavigationLink[] = [
  { label: "Home", href: "#home" },
  { label: "Explore", href: "#explore" },
  { label: "Build", href: "#build" },
  { label: "Resources", href: "#resources" },
];

export const PRIMARY_NAV_CTA: NavigationCta = {
  label: "Explore Trust Layer",
  href: "#explore",
};
