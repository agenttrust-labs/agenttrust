import type { StoryPanel } from "@/types/storytelling";

export const STORYTELLING_SECTION_ID = "trust-stack";

export const STORYTELLING_PANELS: readonly StoryPanel[] = [
  {
    eyebrow: "01 / Identity",
    title: "Identify every counterparty",
    body: "Resolve the agent, the recipient, and the freshest attestations before the payment route is allowed to open.",
    action: {
      label: "Read the Documentation",
      href: "#plug-and-play",
    },
    visual: "identity",
  },
  {
    eyebrow: "02 / Policy",
    title: "Route payments through policy",
    body: "Intent passes through limits, velocity caps, allowlists, and emergency stops before a transfer can settle.",
    action: {
      label: "View Devnet Programs",
      href: "#plug-and-play",
    },
    visual: "policy",
  },
  {
    eyebrow: "03 / Proofs",
    title: "Leave an audit trail",
    body: "Every decision emits invariant checks, byte-precise reads, and the exact reason a payment passed or stopped.",
    action: {
      label: "Inspect Proofs",
      href: "#trilemma",
    },
    visual: "proofs",
  },
] as const;
