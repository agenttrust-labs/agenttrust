import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface StorytellingScrollConfig {
  readonly count: number;
  readonly onActiveIndexChange: (index: number) => void;
  readonly root: HTMLElement;
}

const COPY_Y_RANGE = 28;
const VISUAL_Y_RANGE = 34;
const ACTIVE_HANDOFF_PROGRESS = 0.76;
const EXIT_START = 0.56;
const EXIT_END = 0.74;
const ENTER_START = 0.68;
const ENTER_END = 0.86;

function getActiveIndex(position: number, count: number): number {
  const maxIndex = count - 1;
  const clampedPosition = gsap.utils.clamp(0, maxIndex, position);

  if (clampedPosition >= maxIndex) {
    return maxIndex;
  }

  return gsap.utils.clamp(
    0,
    maxIndex,
    Math.floor(clampedPosition + (1 - ACTIVE_HANDOFF_PROGRESS)),
  );
}

function smoothStep(value: number): number {
  return value * value * (3 - 2 * value);
}

function getProgressBetween(
  value: number,
  start: number,
  end: number,
): number {
  return gsap.utils.clamp(0, 1, (value - start) / (end - start));
}

function getPanelVisibility(
  position: number,
  index: number,
  count: number,
): number {
  const maxIndex = count - 1;

  if (maxIndex <= 0) {
    return 1;
  }

  const clampedPosition = gsap.utils.clamp(0, maxIndex, position);
  const segmentIndex = Math.min(Math.floor(clampedPosition), maxIndex - 1);
  const segmentProgress = clampedPosition - segmentIndex;

  if (index === segmentIndex) {
    const exitProgress = getProgressBetween(
      segmentProgress,
      EXIT_START,
      EXIT_END,
    );

    return 1 - smoothStep(exitProgress);
  }

  if (index === segmentIndex + 1) {
    const enterProgress = getProgressBetween(
      segmentProgress,
      ENTER_START,
      ENTER_END,
    );

    return smoothStep(enterProgress);
  }

  return 0;
}

function getPanelOffset(
  position: number,
  index: number,
  range: number,
): number {
  return gsap.utils.clamp(-range, range, (index - position) * range);
}

function setPanels(progress: number, root: HTMLElement, count: number): void {
  const position = progress * Math.max(1, count - 1);
  const activeIndex = getActiveIndex(position, count);
  const copyPanels = root.querySelectorAll<HTMLElement>(
    "[data-story-copy-panel]",
  );
  const visualPanels = root.querySelectorAll<HTMLElement>(
    "[data-story-visual-panel]",
  );

  copyPanels.forEach((panel, index) => {
    const visibility = getPanelVisibility(position, index, count);

    gsap.set(panel, {
      autoAlpha: visibility,
      pointerEvents: index === activeIndex ? "auto" : "none",
      zIndex: Math.round(visibility * 10),
      y: getPanelOffset(position, index, COPY_Y_RANGE),
    });
  });

  visualPanels.forEach((panel, index) => {
    const visibility = getPanelVisibility(position, index, count);

    gsap.set(panel, {
      autoAlpha: visibility,
      scale: 0.985 + visibility * 0.015,
      zIndex: Math.round(visibility * 10),
      y: getPanelOffset(position, index, VISUAL_Y_RANGE),
    });
  });
}

export function createStorytellingScrollTrigger({
  count,
  onActiveIndexChange,
  root,
}: StorytellingScrollConfig): ScrollTrigger {
  setPanels(0, root, count);

  return ScrollTrigger.create({
    trigger: root,
    start: "top top",
    end: "bottom bottom",
    scrub: 0.85,
    onUpdate: (self) => {
      const activePosition = self.progress * Math.max(1, count - 1);
      const nextIndex = getActiveIndex(activePosition, count);

      setPanels(self.progress, root, count);
      onActiveIndexChange(nextIndex);
    },
  });
}
