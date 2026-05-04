import styles from "@/components/BenchmarkSection.module.css";
import {
  BENCHMARK_TITLE,
  BENCHMARK_TITLE_LINES,
} from "@/data/benchmark";

const CORNER_KEYS = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;

export default function BenchmarkSection() {
  return (
    <section
      id="benchmark"
      className={styles.section}
      aria-labelledby="benchmark-title"
    >
      <div className={styles.shell}>
        <div className={styles.spacer} aria-hidden="true" />

        <div className={styles.statement}>
          {CORNER_KEYS.map((corner) => (
            <span
              aria-hidden="true"
              className={`${styles.corner} ${styles[corner]}`}
              key={corner}
            />
          ))}
          <h2
            id="benchmark-title"
            className={styles.heading}
            aria-label={BENCHMARK_TITLE}
          >
            {BENCHMARK_TITLE_LINES.map((line) => (
              <span className={styles.headingLine} key={line}>
                {line}
              </span>
            ))}
          </h2>
        </div>
      </div>
    </section>
  );
}
