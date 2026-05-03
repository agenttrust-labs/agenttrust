import type { FooterUtilityLink } from "@/data/footer";

import styles from "@/components/FooterBottom.module.css";

export interface FooterArrowLinkProps {
  readonly link: FooterUtilityLink;
}

export default function FooterArrowLink({ link }: FooterArrowLinkProps) {
  return (
    <a
      className={styles.arrowLink}
      href={link.href}
      rel={link.isExternal ? "noopener noreferrer" : undefined}
      target={link.isExternal ? "_blank" : undefined}
    >
      <span>{link.label}</span>
      <svg aria-hidden="true" className={styles.arrowIcon} viewBox="0 0 24 24" fill="none">
        <path d="M7 7h10v10" />
        <path d="M7 17 17 7" />
      </svg>
    </a>
  );
}
