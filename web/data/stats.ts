export interface HeroStat {
  readonly value: string;
  readonly label: string;
}

export const HERO_STATS: readonly HeroStat[] = [
  { value: "Pay.sh", label: "Live facilitator" },
  { value: "<2h", label: "Adapter target" },
  { value: "1 tx", label: "Atomic settlement" },
  { value: "5 / 5", label: "Invariants verified" },
];

export const KANI_HARNESS_NAMES: readonly string[] = [
  "paused_implies_no_allow",
  "velocity_counter_le_limit",
  "counterparty_tier_monotone",
  "validation_expiry_correct",
  "multisig_threshold_enforced",
];
