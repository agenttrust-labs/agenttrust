export interface BenchmarkFeature {
  readonly body: string;
  readonly title: string;
}

export const BENCHMARK_TITLE_LINES = [
  "A new benchmark",
  "for agent trust.",
] as const;

export const BENCHMARK_TITLE = BENCHMARK_TITLE_LINES.join(" ");

export const BENCHMARK_FEATURE: BenchmarkFeature = {
  title: "Fast, familiar, verifiable",
  body: "No more blind counterparty payments. AgentTrust keeps AI-agent settlement familiar while identity, reputation, and policy checks happen before value moves.",
};
