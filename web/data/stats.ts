export interface HeroStat {
  readonly value: string;
  readonly label: string;
}

export const HERO_STATS: readonly HeroStat[] = [
  { value: "5 / 5", label: "Invariants verified" },
  { value: "3", label: "Devnet programs" },
  { value: "168", label: "Test cases" },
  { value: "MIT", label: "Open-source license" },
];

export const KANI_HARNESS_NAMES: readonly string[] = [
  "paused_implies_no_allow",
  "velocity_counter_le_limit",
  "counterparty_tier_monotone",
  "validation_expiry_correct",
  "multisig_threshold_enforced",
];
