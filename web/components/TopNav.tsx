import AgentTrustLogo from "@/components/AgentTrustLogo";
import styles from "@/components/TopNav.module.css";
import PillLink from "@/components/ui/PillLink";
import { PRIMARY_NAV_CTA, PRIMARY_NAV_LINKS } from "@/data/navigation";

export default function TopNav() {
  return (
    <header className={styles.header}>
      <nav aria-label="Primary navigation" className={styles.nav}>
        <AgentTrustLogo />

        <div className={styles.cluster}>
          <div className={styles.listWrap}>
            <ul className={styles.list}>
              {PRIMARY_NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className={styles.link}>
                    <span className={styles.label}>{link.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <PillLink
            href={PRIMARY_NAV_CTA.href}
            size="nav"
            variant="secondary"
          >
            {PRIMARY_NAV_CTA.label}
          </PillLink>
        </div>
      </nav>
    </header>
  );
}
