export interface HeroSdkLink {
  readonly href: string;
  readonly icon: "github" | "package";
  readonly label: string;
  readonly meta: string;
}

export interface HeroTerminalLine {
  readonly prompt?: string;
  readonly text: string;
  readonly tone: "accent" | "default" | "muted" | "success";
}

export const HERO_SDK_COMMAND = "npm install @agenttrust-sdk/trustgate";

export const HERO_SDK_COPY = {
  eyebrow: "SDK Quickstart",
  title: "Gate an agent payment before settlement.",
  body:
    "Install the TrustGate SDK, resolve the counterparty, and return an allow or deny decision before your agent moves value.",
  commandLabel: "Copy SDK install command",
  copiedLabel: "Copied",
  terminalTitle: "trustgate.ts",
} as const;

export const HERO_SDK_LINKS: readonly HeroSdkLink[] = [
  {
    href: "https://www.npmjs.com/package/@agenttrust-sdk/trustgate",
    icon: "package",
    label: "NPM Package",
    meta: "@agenttrust-sdk/trustgate",
  },
  {
    href: "https://github.com/agenttrust-labs/agenttrust",
    icon: "github",
    label: "GitHub",
    meta: "agenttrust-labs/agenttrust",
  },
];

export const HERO_TERMINAL_LINES: readonly HeroTerminalLine[] = [
  { prompt: "$", text: HERO_SDK_COMMAND, tone: "default" },
  {
    text: 'import { gatePayment } from "@agenttrust-sdk/trustgate";',
    tone: "muted",
  },
  {
    text: "const decision = await gatePayment({ agent, recipient, amount });",
    tone: "muted",
  },
  { text: "identity        verified", tone: "success" },
  { text: "policy          velocity_counter_le_limit", tone: "accent" },
  { text: "validation      reputation fresh", tone: "success" },
  { text: "settlement      allowed before value moves", tone: "accent" },
];
