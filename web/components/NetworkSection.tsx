import NetworkScroll from "@/components/NetworkScroll";
import styles from "@/components/NetworkSection.module.css";
import { NETWORK_HEADLINE, NETWORK_LABELS } from "@/data/network";

export default function NetworkSection() {
  return (
    <section
      id="network"
      className={styles.section}
      aria-labelledby="network-title"
    >
      <div className={styles.inner}>
        <div className={styles.opener}>
          <h2 id="network-title" className={styles.title}>
            <span>{NETWORK_HEADLINE.firstLine}</span>
            <span className={styles.indent}>{NETWORK_HEADLINE.secondLine}</span>
          </h2>
          <div className={styles.labels} aria-hidden="true">
            {NETWORK_LABELS.map((label) => (
              <span className={styles.label} key={label.text}>
                {label.text}
              </span>
            ))}
          </div>
        </div>
        <NetworkScroll />
      </div>
    </section>
  );
}
