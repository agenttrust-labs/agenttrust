import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface PlugAndPlayRevealConfig {
  readonly isReducedMotion: boolean;
  readonly root: HTMLElement;
}

export function createPlugAndPlayReveal({
  isReducedMotion,
  root,
}: PlugAndPlayRevealConfig): void {
  gsap.registerPlugin(ScrollTrigger);

  const revealItems = root.querySelectorAll<HTMLElement>("[data-plug-reveal]");

  if (isReducedMotion) {
    gsap.set(revealItems, { autoAlpha: 1, clearProps: "transform" });
    return;
  }

  gsap.fromTo(
    revealItems,
    { autoAlpha: 0, y: 20 },
    {
      autoAlpha: 1,
      y: 0,
      duration: 0.66,
      ease: "sine.inOut",
      stagger: 0.1,
      scrollTrigger: {
        trigger: root,
        start: "top 58%",
        once: true,
      },
    },
  );
}
