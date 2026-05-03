import type { StoryPanel } from "@/types/storytelling";

export const STORYTELLING_SECTION_ID = "trust-stack";

export const STORYTELLING_PANELS: readonly StoryPanel[] = [
  {
    eyebrow: "01 / Identity",
    title: "Know the counterparty first",
    body: "Resolve who an AI agent is paying, which attestations are current, and whether the recipient is trusted before value moves.",
    action: {
      label: "Read the Documentation",
      href: "#resources",
    },
    visual: "identity",
  },
  {
    eyebrow: "02 / Policy",
    title: "Put payment rules in the path",
    body: "Limits, velocity, allowlists, and kill-switch state sit directly on the payment route, so unsafe transfers fail before settlement.",
    action: {
      label: "View Devnet Programs",
      href: "#programs",
    },
    visual: "policy",
  },
  {
    eyebrow: "03 / Proofs",
    title: "Make trust decisions auditable",
    body: "Five formal invariants, byte-precise reads, and SDK-visible state give teams a clear record of why a payment passed or stopped.",
    action: {
      label: "Inspect Proofs",
      href: "#proofs",
    },
    visual: "proofs",
  },
] as const;
