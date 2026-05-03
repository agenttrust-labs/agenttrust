import PillLink from "@/components/ui/PillLink";
import styles from "@/components/StorytellingSection.module.css";
import type { StoryPanel } from "@/types/storytelling";

interface StorytellingCopyPanelProps {
  readonly isActive: boolean;
  readonly panel: StoryPanel;
}

export default function StorytellingCopyPanel({
  isActive,
  panel,
}: StorytellingCopyPanelProps) {
  const className = isActive
    ? `${styles.copyPanel} ${styles.copyPanelActive}`
    : styles.copyPanel;

  return (
    <article className={className} aria-hidden={!isActive}>
      <p className={styles.eyebrow}>{panel.eyebrow}</p>
      <h2 className={styles.title}>{panel.title}</h2>
      <p className={styles.body}>{panel.body}</p>
      <div className={styles.copyRule} aria-hidden="true" />
      <div className={styles.action}>
        <PillLink href={panel.action.href} icon="file" variant="secondary">
          {panel.action.label}
        </PillLink>
      </div>
    </article>
  );
}
