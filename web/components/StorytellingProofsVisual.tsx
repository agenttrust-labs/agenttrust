import styles from "@/components/StorytellingSection.module.css";

export default function StorytellingProofsVisual() {
  return (
    <svg className={styles.visualSvg} fill="none" viewBox="0 0 640 640">
      <path className={styles.visualMutedLine} d="M142 164h284l72 72v294H142Z" />
      <path className={styles.visualFrame} d="M126 146h300l90 90v312H126Z" />
      <path className={styles.visualLine} d="M426 146v90h90" />
      <path className={styles.visualAccent} d="M160 228h206" />
      <path className={styles.visualRoute} d="M176 292h72c40 0 40 48 82 48h78" />
      <path className={styles.visualRoute} d="M176 390h102c34 0 40 48 78 48h112" />

      <rect className={styles.visualDecision} x="164" y="270" width="78" height="46" />
      <rect className={styles.visualDecision} x="306" y="318" width="98" height="46" />
      <rect className={styles.visualDecision} x="164" y="368" width="98" height="46" />
      <rect className={styles.visualDecision} x="346" y="416" width="120" height="46" />
      <rect className={styles.visualStamp} x="358" y="484" width="122" height="42" />

      <circle className={styles.visualNodeAccent} cx="176" cy="292" r="10" />
      <circle className={styles.visualNode} cx="330" cy="340" r="10" />
      <circle className={styles.visualNodeAccent} cx="176" cy="390" r="10" />
      <circle className={styles.visualNode} cx="356" cy="438" r="10" />
      <circle className={styles.visualNodeDark} cx="480" cy="505" r="12" />

      <path className={styles.visualCheck} d="M190 286l10 10 24-30" />
      <path className={styles.visualCheck} d="M190 384l10 10 24-30" />
      <path className={styles.visualDash} d="M186 178h188M186 202h120" />
      <path className={styles.visualDash} d="M444 252h42M444 276h42M444 300h42" />
      <path className={styles.visualDash} d="M282 292h78M282 390h52" />

      <text className={styles.visualLabel} x="164" y="118">
        AUDIT RECEIPT
      </text>
      <text className={styles.visualSmallLabel} x="164" y="252">
        INVARIANT
      </text>
      <text className={styles.visualSmallLabel} x="306" y="300">
        BYTE READ
      </text>
      <text className={styles.visualSmallLabel} x="164" y="350">
        REASON
      </text>
      <text className={styles.visualSmallLabel} x="346" y="398">
        SDK STATE
      </text>
      <text className={styles.visualLabel} x="420" y="512">
        PASS / STOP
      </text>
      <text className={styles.visualText} x="342" y="372" textAnchor="middle">
        5/5
      </text>
    </svg>
  );
}
