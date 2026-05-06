import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface PlugAndPlayRevealConfig {
  readonly isReducedMotion: boolean;
  readonly root: HTMLElement;
}

export function createPlugAndPlayReveal({
  isReducedMotion,
  root,
}: PlugAndPlayRevealConfig): () => void {
  gsap.registerPlugin(ScrollTrigger);

  const revealItems = root.querySelectorAll<HTMLElement>("[data-plug-reveal]");
  const trigger = root.closest("section") ?? root;
  const purple = trigger.querySelector<HTMLElement>("[data-plug-purple]");
  const media = gsap.matchMedia();

  if (isReducedMotion) {
    gsap.set(revealItems, { autoAlpha: 1, clearProps: "transform" });
    if (purple) {
      gsap.set(purple, { autoAlpha: 1, scale: 1.05 });
    }
    return () => {
      media.revert();
    };
  }

  const createTimeline = (start: string, end: string): gsap.core.Timeline => {
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger,
        start,
        end,
        scrub: 1,
      },
    });

    timeline.fromTo(
      revealItems,
      { autoAlpha: 0, y: 20 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 1,
        ease: "power2.out",
        stagger: 0.08,
      },
    );

    if (purple) {
      timeline.fromTo(
        purple,
        { autoAlpha: 0, scale: 0.72, y: 72 },
        {
          autoAlpha: 1,
          scale: 1.08,
          y: 0,
          duration: 0.62,
          ease: "back.out(1.2)",
        },
        "<0.08",
      );
    }

    return timeline;
  };

  media.add("(min-width: 940px)", () => {
    const timeline = createTimeline("top top", "+=680");

    return () => {
      timeline.scrollTrigger?.kill();
      timeline.kill();
    };
  });

  media.add("(max-width: 939px)", () => {
    const timeline = createTimeline("top 70%", "top 18%");

    return () => {
      timeline.scrollTrigger?.kill();
      timeline.kill();
    };
  });

  return () => {
    media.revert();
  };
}
