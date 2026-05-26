import styles from "@/components/ProgramsSection.module.css";
import {
  DEVNET_PROGRAMS,
  PROGRAMS_EYEBROW,
  PROGRAMS_INTRO,
  PROGRAMS_PROOFS,
  PROGRAMS_SECTION_ID,
  PROGRAMS_TITLE,
} from "@/data/programs";
import { getExternalLinkAttributes } from "@/lib/linkAttributes";

function truncateAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

function explorerHref(address: string): string {
  return `https://explorer.solana.com/address/${address}?cluster=devnet`;
}

export default function ProgramsSection() {
  return (
    <section
      id={PROGRAMS_SECTION_ID}
      className={styles.section}
      aria-labelledby="programs-title"
    >
      <div className={styles.shell}>
        <div className={styles.spacer} aria-hidden="true" />
        <div className={styles.frame}>
          <header className={styles.header}>
            <p className={styles.eyebrow}>
              <span className={styles.dot} aria-hidden="true" />
              {PROGRAMS_EYEBROW}
            </p>
            <h2 id="programs-title" className={styles.title}>
              {PROGRAMS_TITLE.lead} <em>{PROGRAMS_TITLE.emphasis}</em>
            </h2>
            <p className={styles.intro}>{PROGRAMS_INTRO}</p>
          </header>

          <ol className={styles.grid}>
            {DEVNET_PROGRAMS.map((program, index) => {
              const explorer = explorerHref(program.address);

              return (
                <li className={styles.card} key={program.name}>
                  <span className={styles.index}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <a
                    className={styles.name}
                    href={program.docsHref}
                    aria-label={`${program.name} documentation`}
                    {...getExternalLinkAttributes(program.docsHref)}
                  >
                    {program.name}
                  </a>
                  <p className={styles.role}>{program.role}</p>
                  <a
                    className={styles.address}
                    href={explorer}
                    aria-label={`View ${program.name} on Solana Explorer (devnet)`}
                    {...getExternalLinkAttributes(explorer)}
                  >
                    <span className={styles.addressLabel}>Program ID</span>
                    <span className={styles.addressRow}>
                      <span className={styles.addressValue}>
                        {truncateAddress(program.address)}
                      </span>
                      <span className={styles.addressArrow} aria-hidden="true">
                        ↗
                      </span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>

          <footer className={styles.proof}>
            {PROGRAMS_PROOFS.map((proof) => (
              <span className={styles.proofItem} key={proof}>
                {proof}
              </span>
            ))}
          </footer>
        </div>
      </div>
    </section>
  );
}
