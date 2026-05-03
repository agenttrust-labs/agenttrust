import styles from "@/components/StorytellingSection.module.css";
import type { StoryPanel, StoryVisualKind } from "@/types/storytelling";

interface StorytellingGraphicProps {
  readonly activeIndex: number;
  readonly panels: readonly StoryPanel[];
}

interface VisualProps {
  readonly kind: StoryVisualKind;
}

function IdentityVisual() {
  return (
    <svg className={styles.visualSvg} fill="none" viewBox="0 0 640 640">
      <circle className={styles.visualSoftRing} cx="320" cy="320" r="192" />
      <path className={styles.visualLine} d="M320 150 470 408H170L320 150Z" />
      <path className={styles.visualLine} d="M320 150v170M170 408l150-88 150 88" />
      <circle className={styles.visualNode} cx="320" cy="150" r="18" />
      <circle className={styles.visualNode} cx="170" cy="408" r="18" />
      <circle className={styles.visualNode} cx="470" cy="408" r="18" />
      <rect className={styles.visualDash} x="232" y="254" width="176" height="132" />
    </svg>
  );
}

function PolicyVisual() {
  return (
    <svg className={styles.visualSvg} fill="none" viewBox="0 0 640 640">
      <rect className={styles.visualFrame} x="176" y="144" width="288" height="352" />
      <path className={styles.visualLine} d="M224 230h192M224 320h192M224 410h192" />
      <path className={styles.visualDash} d="M196 274h248M196 364h248" />
      <circle className={styles.visualNode} cx="224" cy="230" r="14" />
      <circle className={styles.visualNode} cx="416" cy="320" r="14" />
      <circle className={styles.visualNode} cx="224" cy="410" r="14" />
      <path className={styles.visualAccent} d="M320 120 502 320 320 520 138 320 320 120Z" />
    </svg>
  );
}

function ProofVisual() {
  return (
    <svg className={styles.visualSvg} fill="none" viewBox="0 0 640 640">
      <rect className={styles.visualFrame} x="152" y="142" width="336" height="356" />
      <path className={styles.visualLine} d="M152 216h336M152 286h336M152 356h336M152 426h336" />
      <path className={styles.visualLine} d="M252 142v356" />
      <path className={styles.visualCheck} d="M194 179l18 18 38-46" />
      <path className={styles.visualCheck} d="M194 249l18 18 38-46" />
      <path className={styles.visualCheck} d="M194 319l18 18 38-46" />
      <path className={styles.visualCheck} d="M194 389l18 18 38-46" />
      <path className={styles.visualCheck} d="M194 459l18 18 38-46" />
      <text className={styles.visualText} x="304" y="350">
        5 / 5
      </text>
    </svg>
  );
}

function Visual({ kind }: VisualProps) {
  if (kind === "policy") {
    return <PolicyVisual />;
  }

  if (kind === "proofs") {
    return <ProofVisual />;
  }

  return <IdentityVisual />;
}

export default function StorytellingGraphic({
  activeIndex,
  panels,
}: StorytellingGraphicProps) {
  return (
    <div className={styles.graphics} aria-hidden="true">
      <div className={styles.gridFade} />
      {panels.map((panel, index) => {
        const className =
          index === activeIndex
            ? `${styles.visualPanel} ${styles.visualPanelActive}`
            : styles.visualPanel;

        return (
          <div className={className} key={panel.title}>
            <span className={styles.visualIndex}>{`/// 00${index + 1}`}</span>
            <span className={styles.visualCornerLeft} />
            <span className={styles.visualCornerRight} />
            <Visual kind={panel.visual} />
          </div>
        );
      })}
    </div>
  );
}
