import styles from "@/components/StorytellingSection.module.css";
import StorytellingIdentityVisual from "@/components/StorytellingIdentityVisual";
import StorytellingPolicyVisual from "@/components/StorytellingPolicyVisual";
import StorytellingProofsVisual from "@/components/StorytellingProofsVisual";
import type { StoryPanel, StoryVisualKind } from "@/types/storytelling";

interface StorytellingGraphicProps {
  readonly activeIndex: number;
  readonly panels: readonly StoryPanel[];
}

interface VisualProps {
  readonly kind: StoryVisualKind;
}

function Visual({ kind }: VisualProps) {
  if (kind === "policy") {
    return <StorytellingPolicyVisual />;
  }

  if (kind === "proofs") {
    return <StorytellingProofsVisual />;
  }

  return <StorytellingIdentityVisual />;
}

export default function StorytellingGraphic({
  activeIndex,
  panels,
}: StorytellingGraphicProps) {
  return (
    <div className={styles.graphics} aria-hidden="true" data-story-graphics>
      <div className={styles.gridFade} />
      {panels.map((panel, index) => {
        const className =
          index === activeIndex
            ? `${styles.visualPanel} ${styles.visualPanelActive}`
            : styles.visualPanel;

        return (
          <div className={className} data-story-visual-panel key={panel.title}>
            <div className={styles.visualMotionLayer} data-story-motion-layer>
              <span className={styles.visualIndex}>{`/// 00${index + 1}`}</span>
              <span className={styles.visualCornerLeft} />
              <span className={styles.visualCornerRight} />
              <Visual kind={panel.visual} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
