import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface NetworkRevealConfig {
  readonly isReducedMotion: boolean;
  readonly root: HTMLElement;
}

export function createNetworkReveal({
  isReducedMotion,
  root,
}: NetworkRevealConfig): void {
  gsap.registerPlugin(ScrollTrigger);

  const revealItems = root.querySelectorAll<HTMLElement>("[data-network-reveal]");
  const globe = root.querySelector<HTMLElement>("[data-network-globe]");

  if (isReducedMotion) {
    gsap.set(revealItems, { autoAlpha: 1, clearProps: "transform" });
    gsap.set(globe, { autoAlpha: 1, clearProps: "transform" });
    return;
  }

  gsap.fromTo(
    revealItems,
    { autoAlpha: 0, y: 24 },
    {
      autoAlpha: 1,
      y: 0,
      duration: 0.8,
      ease: "power2.out",
      stagger: 0.14,
      scrollTrigger: { trigger: root, start: "top 72%", once: true },
    },
  );

  if (globe) {
    gsap.fromTo(
      globe,
      { autoAlpha: 0, scale: 0.86, y: 44 },
      {
        autoAlpha: 1,
        scale: 1,
        y: 0,
        ease: "none",
        scrollTrigger: {
          trigger: root,
          start: "top 72%",
          end: "70% bottom",
          scrub: 1,
        },
      },
    );
  }
}
