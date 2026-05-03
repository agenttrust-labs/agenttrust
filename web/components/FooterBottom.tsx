import { FOOTER_BOTTOM_LINKS } from "@/data/footer";

import styles from "@/components/FooterBottom.module.css";

export default function FooterBottom() {
  return (
    <div className={styles.bottom}>
      <p className={styles.copyright}>(c) 2026 AgentTrust. MIT licensed.</p>
      <ul className={styles.links} aria-label="Footer utility links">
        {FOOTER_BOTTOM_LINKS.map((link) => (
          <li key={link.label}>
            <a className={styles.link} href={link.href}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
