import { PUBLIC_LINKS } from "@/data/links";
import type { StoryPanel } from "@/types/storytelling";

export const STORYTELLING_SECTION_ID = "trust-stack";

export const STORYTELLING_PANELS: readonly StoryPanel[] = [
  {
    eyebrow: "01 / Pay.sh",
    title: "Start with the Foundation path",
    body: "Pay.sh is live as the first concrete adapter, with AgentTrust policy hints embedded in the x402 challenge before payment retry.",
    action: {
      label: "Open Pay.sh Guide",
      href: PUBLIC_LINKS.docsPayShAdapter,
    },
    visual: "identity",
  },
  {
    eyebrow: "02 / Adapters",
    title: "Swap facilitators in one file",
    body: "Routes, policy logic, and feedback stay untouched. Pay.sh ships today; Dexter proves the next adapter path; atxp_ai and MCPay stay explicit roadmap.",
    action: {
      label: "Read Adapter Contract",
      href: PUBLIC_LINKS.docsFacilitatorAdapters,
    },
    visual: "policy",
  },
  {
    eyebrow: "03 / Atomic",
    title: "Settle or revert together",
    body: "The policy check, SPL transfer, and feedback emission share one signed transaction, so there is no split-brain payment state.",
    action: {
      label: "Inspect Atomicity",
      href: PUBLIC_LINKS.docsAtomicSettlement,
    },
    visual: "proofs",
  },
] as const;
