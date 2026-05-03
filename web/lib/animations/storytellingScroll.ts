import { ScrollTrigger } from "gsap/ScrollTrigger";

interface StorytellingScrollConfig {
  readonly count: number;
  readonly onActiveIndexChange: (index: number) => void;
  readonly root: HTMLElement;
}

export function createStorytellingScrollTrigger({
  count,
  onActiveIndexChange,
  root,
}: StorytellingScrollConfig): ScrollTrigger {
  return ScrollTrigger.create({
    trigger: root,
    start: "top top",
    end: "bottom bottom",
    scrub: 1,
    onUpdate: (self) => {
      const nextIndex = Math.min(
        count - 1,
        Math.max(0, Math.floor(self.progress * count)),
      );

      onActiveIndexChange(nextIndex);
    },
  });
}
