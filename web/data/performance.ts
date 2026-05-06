import { PUBLIC_LINKS } from "@/data/links";

export interface PerformanceBar {
  readonly height: number;
}

export interface PerformanceStat {
  readonly count?: {
    readonly decimals?: number;
    readonly from: number;
    readonly suffix?: string;
    readonly target: number;
  };
  readonly label: string;
  readonly value: string;
}

export interface PerformanceHeadline {
  readonly firstLine: string;
  readonly secondEmphasis: string;
  readonly secondPrefix: string;
  readonly secondSuffix: string;
}

export const PERFORMANCE_SECTION_LABELS = [
  "/ Pay.sh live",
  "/ Adapter contract",
  "/ Atomic settlement",
] as const;

export const PERFORMANCE_HEADLINE: PerformanceHeadline = {
  firstLine: "One trust layer.",
  secondPrefix: "Every",
  secondEmphasis: "x402",
  secondSuffix: "route.",
};

export const PERFORMANCE_STATEMENT =
  "Pay.sh works today. The same adapter contract keeps Dexter, atxp_ai, MCPay, and the next facilitator from touching AgentTrust policy logic.";

export const PERFORMANCE_CTA = {
  label: "Read The Adapter Pattern",
  href: PUBLIC_LINKS.docsFacilitatorAdapters,
} as const;

export const PERFORMANCE_STATS: readonly PerformanceStat[] = [
  {
    label: "Live facilitator",
    value: "Pay.sh",
  },
  {
    label: "Adapter target",
    value: "<2h",
  },
  {
    label: "Settlement path",
    value: "1 tx",
    count: { from: 0, target: 1, suffix: " tx" },
  },
  {
    label: "Invariants verified",
    value: "5 / 5",
    count: { from: 0, target: 5, suffix: " / 5" },
  },
] as const;

export const PERFORMANCE_BARS: readonly PerformanceBar[] = [
  { height: 12 },
  { height: 10 },
  { height: 9 },
  { height: 11 },
  { height: 13 },
  { height: 15 },
  { height: 20 },
  { height: 31 },
  { height: 44 },
  { height: 55 },
  { height: 48 },
  { height: 40 },
  { height: 36 },
  { height: 33 },
  { height: 30 },
  { height: 32 },
  { height: 34 },
  { height: 36 },
  { height: 31 },
  { height: 24 },
  { height: 19 },
  { height: 14 },
  { height: 12 },
  { height: 10 },
  { height: 16 },
  { height: 25 },
  { height: 34 },
  { height: 29 },
  { height: 27 },
  { height: 24 },
  { height: 28 },
  { height: 35 },
  { height: 43 },
  { height: 50 },
  { height: 58 },
  { height: 62 },
  { height: 56 },
  { height: 52 },
  { height: 48 },
  { height: 45 },
  { height: 50 },
  { height: 55 },
  { height: 61 },
  { height: 67 },
  { height: 72 },
  { height: 70 },
  { height: 66 },
  { height: 62 },
  { height: 58 },
  { height: 64 },
  { height: 72 },
  { height: 81 },
  { height: 90 },
  { height: 98 },
  { height: 86 },
  { height: 78 },
  { height: 70 },
  { height: 64 },
  { height: 60 },
  { height: 56 },
  { height: 52 },
  { height: 58 },
  { height: 66 },
  { height: 74 },
  { height: 82 },
  { height: 90 },
  { height: 98 },
  { height: 100 },
  { height: 94 },
  { height: 88 },
  { height: 82 },
  { height: 76 },
  { height: 72 },
  { height: 68 },
  { height: 64 },
  { height: 70 },
  { height: 78 },
  { height: 87 },
  { height: 95 },
  { height: 100 },
] as const;
