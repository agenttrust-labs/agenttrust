"use client";

import styles from "@/components/TopNav.module.css";
import { useScrambleText } from "@/hooks/useScrambleText";

interface TopNavLinkProps {
  readonly href: string;
  readonly label: string;
}

export default function TopNavLink({ href, label }: TopNavLinkProps) {
  const { activeIndexes, displayCharacters, startScramble } =
    useScrambleText(label);

  return (
    <a
      aria-label={label}
      className={styles.link}
      href={href}
      onFocus={startScramble}
      onPointerEnter={startScramble}
    >
      <span aria-hidden="true" className={styles.label}>
        {displayCharacters.map((character, index) => (
          <span
            className={
              activeIndexes.includes(index)
                ? styles.scrambleCharActive
                : styles.scrambleChar
            }
            data-char-index={index}
            key={`${label}-${index}`}
          >
            {character}
          </span>
        ))}
      </span>
    </a>
  );
}
