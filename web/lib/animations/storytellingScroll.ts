import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface StorytellingScrollConfig {
  readonly count: number;
  readonly onActiveIndexChange: (index: number) => void;
  readonly root: HTMLElement;
}

const COPY_Y_RANGE = 28;
const VISUAL_Y_RANGE = 34;

function getActiveIndex(position: number, count: number): number {
  return gsap.utils.clamp(0, count - 1, Math.round(position));
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
    const isActive = index === activeIndex;

    gsap.set(panel, {
      autoAlpha: isActive ? 1 : 0,
      y: getPanelOffset(position, index, COPY_Y_RANGE),
    });
  });

  visualPanels.forEach((panel, index) => {
    const isActive = index === activeIndex;

    gsap.set(panel, {
      autoAlpha: isActive ? 1 : 0,
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
    scrub: 1,
    onUpdate: (self) => {
      const activePosition = self.progress * Math.max(1, count - 1);
      const nextIndex = getActiveIndex(activePosition, count);

      setPanels(self.progress, root, count);
      onActiveIndexChange(nextIndex);
    },
  });
}
