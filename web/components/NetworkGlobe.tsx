import styles from "@/components/NetworkGlobe.module.css";

export default function NetworkGlobe() {
  return (
    <div className={styles.globe} aria-hidden="true" data-network-globe>
      <div className={styles.wash} />
      <svg className={styles.svg} viewBox="0 0 640 640">
        <circle className={styles.outerRing} cx="320" cy="320" r="246" />
        <circle className={styles.innerRing} cx="320" cy="320" r="156" />
        <g className={styles.motionLayer} data-network-globe-orbit>
          <path className={styles.arc} d="M88 360C196 230 378 168 552 214" />
          <path className={styles.arc} d="M132 142C260 303 423 400 548 430" />
          <path className={styles.arc} d="M274 72C354 210 346 424 248 566" />
          <path className={styles.arc} d="M86 468C240 378 396 340 566 362" />
          <path className={styles.route} d="M158 404 320 190 482 404" />
          <path className={styles.route} d="M158 404H482" />
          <path className={styles.pillar} d="M320 190 482 404H158Z" />
          <circle className={styles.node} cx="320" cy="190" r="12" />
          <circle className={styles.node} cx="482" cy="404" r="12" />
          <circle className={styles.node} cx="158" cy="404" r="12" />
          <circle className={styles.smallNode} cx="320" cy="320" r="7" />
          <path className={styles.spoke} d="M320 190V320M158 404l162-84 162 84" />
        </g>
        <g className={styles.labels}>
          <text x="320" y="152">AGENT</text>
          <text x="118" y="460">PAY.SH</text>
          <text x="452" y="460">POLICY</text>
          <text x="294" y="348">ADAPTER</text>
        </g>
      </svg>
      <div className={styles.orbitLabel}>x402 facilitator mesh</div>
    </div>
  );
}
