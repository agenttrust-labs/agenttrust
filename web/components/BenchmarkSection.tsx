import styles from "@/components/BenchmarkSection.module.css";
import {
  BENCHMARK_FEATURE,
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

        <div className={styles.feature}>
          <div className={styles.copy}>
            <h3 className={styles.featureTitle}>{BENCHMARK_FEATURE.title}</h3>
            <p className={styles.featureBody}>{BENCHMARK_FEATURE.body}</p>
            <div className={styles.copyRule} aria-hidden="true" />
          </div>

          <div className={styles.visual} aria-hidden="true">
            <span className={styles.visualIndex}>{"/// 001"}</span>
            <span className={styles.visualCornerTopLeft} />
            <span className={styles.visualCornerTopRight} />
            <span className={styles.diagram}>
              <span className={styles.glow} />
              <svg
                className={styles.diagramSvg}
                fill="none"
                role="presentation"
                viewBox="0 0 640 360"
              >
                <rect
                  className={styles.dashSquare}
                  height="188"
                  width="296"
                  x="172"
                  y="132"
                />
                <rect
                  className={styles.dashDiamond}
                  height="152"
                  width="152"
                  x="244"
                  y="104"
                />
                <path
                  className={styles.trianglePath}
                  d="M320 52 514 320H126L320 52Z"
                />
                <path
                  className={styles.trianglePath}
                  d="M126 320H514"
                />
                <path
                  className={styles.trianglePath}
                  d="M190 206H450"
                />
                <path
                  className={styles.dashPath}
                  d="M320 118 396 206H244L320 118Z"
                />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
