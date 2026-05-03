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
  const trigger = root.closest("section") ?? root;

  if (isReducedMotion) {
    gsap.set(revealItems, { autoAlpha: 1, clearProps: "transform" });
    return;
  }

  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger,
      start: "top top",
      end: "+=680",
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
}
