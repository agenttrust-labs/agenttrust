import styles from "@/components/StorytellingSection.module.css";

export default function StorytellingIdentityVisual() {
  return (
    <svg className={styles.visualSvg} fill="none" viewBox="0 0 640 640">
      <path
        className={styles.visualMutedLine}
        d="M88 392c84-132 180-168 288-108 76 42 114 28 178-60"
      />
      <path
        className={styles.visualRoute}
        d="M94 390c72-72 130-108 196-98 84 12 120 88 246 8"
      />
      <path
        className={styles.visualDash}
        d="M148 238c60-54 132-62 212-22 64 32 116 26 156-18"
      />

      <rect className={styles.visualDecision} x="94" y="300" width="170" height="116" rx="0" />
      <rect className={styles.visualDecision} x="394" y="166" width="154" height="116" rx="0" />
      <rect className={styles.visualFrame} x="260" y="348" width="172" height="126" rx="0" />
      <rect className={styles.visualHashLine} x="288" y="374" width="96" height="12" rx="0" />
      <rect className={styles.visualHashLine} x="288" y="412" width="122" height="12" rx="0" />
      <rect className={styles.visualHashLine} x="288" y="450" width="72" height="12" rx="0" />

      <circle className={styles.visualHalo} cx="126" cy="260" r="56" />
      <circle className={styles.visualNodeDark} cx="126" cy="260" r="18" />
      <circle className={styles.visualHalo} cx="506" cy="334" r="50" />
      <circle className={styles.visualNodeAccent} cx="506" cy="334" r="14" />
      <circle className={styles.visualNode} cx="330" cy="292" r="13" />
      <circle className={styles.visualNode} cx="420" cy="258" r="11" />

      <path className={styles.visualAccent} d="M126 260v72h86" />
      <path className={styles.visualAccent} d="M506 334h-72v74" />
      <path className={styles.visualCheck} d="M438 214l14 14 34-44" />
      <path className={styles.visualLine} d="M126 344h92M126 376h62" />
      <path className={styles.visualLine} d="M420 214h56M420 246h82" />

      <text className={styles.visualLabel} x="94" y="214">
        AGENT ID
      </text>
      <text className={styles.visualSmallLabel} x="94" y="442">
        SIGNER / SESSION KEY
      </text>
      <text className={styles.visualLabel} x="394" y="142">
        RECIPIENT
      </text>
      <text className={styles.visualSmallLabel} x="394" y="306">
        CURRENT ATTESTATIONS
      </text>
      <text className={styles.visualLabel} x="260" y="528">
        RESOLUTION RECORD
      </text>
      <text className={styles.visualSmallLabel} x="260" y="552">
        WHO / WHEN / FRESHNESS
      </text>
    </svg>
  );
}
