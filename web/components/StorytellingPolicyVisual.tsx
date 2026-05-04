import styles from "@/components/StorytellingSection.module.css";

export default function StorytellingPolicyVisual() {
  return (
    <svg className={styles.visualSvg} fill="none" viewBox="0 0 640 640">
      <path
        className={styles.visualMutedLine}
        d="M72 438c92-20 120-126 196-126 92 0 92 126 202 126 42 0 78-14 106-42"
      />
      <path
        className={styles.visualRoute}
        d="M72 438c64-10 104-54 138-104 36-52 80-72 132-38 62 40 82 136 166 116 30-8 52-24 68-44"
      />
      <path className={styles.visualBlocked} d="M396 456c38-4 74 4 108 24" />

      <rect className={styles.visualDecision} x="126" y="250" width="132" height="96" />
      <rect className={styles.visualDecision} x="302" y="204" width="144" height="104" />
      <rect className={styles.visualStopFill} x="404" y="410" width="130" height="96" />
      <rect className={styles.visualDecision} x="470" y="274" width="92" height="72" />

      <path className={styles.visualLine} d="M154 284h72M154 314h44" />
      <path className={styles.visualLine} d="M330 238h82M330 270h58" />
      <path className={styles.visualLine} d="M430 444h76M430 474h48" />
      <path className={styles.visualAccent} d="M516 292v36M498 310h36" />

      <circle className={styles.visualNodeAccent} cx="72" cy="438" r="14" />
      <circle className={styles.visualNode} cx="192" cy="334" r="12" />
      <circle className={styles.visualNode} cx="374" cy="296" r="12" />
      <circle className={styles.visualNodeDark} cx="576" cy="368" r="16" />
      <circle className={styles.visualNodeDark} cx="468" cy="480" r="13" />

      <path className={styles.visualDash} d="M176 186h272" />
      <path className={styles.visualDash} d="M262 154v372" />
      <path className={styles.visualCheck} d="M166 226l12 12 28-36" />
      <path className={styles.visualCheck} d="M342 180l12 12 30-40" />
      <path className={styles.visualBlocked} d="M438 438l58 58M496 438l-58 58" />

      <text className={styles.visualLabel} x="72" y="488" textAnchor="middle">
        INTENT
      </text>
      <text className={styles.visualLabel} x="192" y="230" textAnchor="middle">
        LIMIT
      </text>
      <text className={styles.visualSmallLabel} x="192" y="370" textAnchor="middle">
        AMOUNT / VELOCITY
      </text>
      <text className={styles.visualLabel} x="374" y="184" textAnchor="middle">
        ALLOW
      </text>
      <text className={styles.visualSmallLabel} x="374" y="330" textAnchor="middle">
        ROUTE POLICY
      </text>
      <text className={styles.visualLabel} x="468" y="532" textAnchor="middle">
        STOP BRANCH
      </text>
      <text className={styles.visualLabel} x="576" y="418" textAnchor="middle">
        SETTLE
      </text>
    </svg>
  );
}
