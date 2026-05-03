import { HERO_REFERENCES } from "@/data/hero";
import { DEVNET_PROGRAMS } from "@/data/programs";
import { KANI_HARNESS_NAMES } from "@/data/stats";
import styles from "@/components/Hero.module.css";

export default function HeroProgramPanel() {
  return (
    <div className={styles.programPanel} data-hero-fade>
      <div className={styles.programHeader}>
        <span>Devnet program IDs</span>
        <span>{HERO_REFERENCES.license}</span>
      </div>
      <dl className={styles.programs}>
        {DEVNET_PROGRAMS.map((program) => (
          <div className={styles.programRow} key={program.name}>
            <dt>{program.name}</dt>
            <dd>{program.address}</dd>
          </div>
        ))}
      </dl>
      <div className={styles.proof} data-hero-fade>
        <p className={styles.proofTitle}>5 / 5 invariants formally verified</p>
        <ul className={styles.harnesses}>
          {KANI_HARNESS_NAMES.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </div>
      <div className={styles.references}>
        <span>{HERO_REFERENCES.github}</span>
        <span>{HERO_REFERENCES.npm}</span>
      </div>
    </div>
  );
}
