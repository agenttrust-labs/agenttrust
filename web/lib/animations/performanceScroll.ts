import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface PerformanceScrollAnimationConfig {
  readonly isReducedMotion: boolean;
  readonly root: HTMLElement;
  readonly stage: HTMLElement;
}

function readNumberAttribute(
  element: HTMLElement,
  name: string,
): number | null {
  const value = element.getAttribute(name);
  const parsed = value === null ? Number.NaN : Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function animateCounters(root: HTMLElement): void {
  const counters = root.querySelectorAll<HTMLElement>("[data-performance-count]");

  counters.forEach((counter) => {
    const from = readNumberAttribute(counter, "data-count-from");
    const target = readNumberAttribute(counter, "data-count-target");
    const decimals = readNumberAttribute(counter, "data-count-decimals") ?? 0;
    const suffix = counter.getAttribute("data-count-suffix") ?? "";

    if (from === null || target === null) {
      return;
    }

    const value = { current: from };

    gsap.to(value, {
      current: target,
      duration: 1.5,
      ease: "sine.inOut",
      onUpdate: () => {
        counter.textContent = `${value.current.toFixed(decimals)}${suffix}`;
      },
      scrollTrigger: {
        trigger: root,
        start: "top 70%",
        once: true,
      },
    });
  });
}

export function createPerformanceScrollAnimation({
  isReducedMotion,
  root,
  stage,
}: PerformanceScrollAnimationConfig): () => void {
  gsap.registerPlugin(ScrollTrigger);

  const revealItems = root.querySelectorAll<HTMLElement>(
    "[data-performance-reveal]",
  );
  const bars = root.querySelectorAll<HTMLElement>("[data-performance-bar]");
  const radar = root.querySelector<HTMLElement>("[data-performance-radar]");
  const media = gsap.matchMedia();

  if (isReducedMotion) {
    gsap.set(revealItems, {
      autoAlpha: 1,
      clearProps: "transform",
    });
    gsap.set(bars, { autoAlpha: 1, clearProps: "transform" });

    if (radar) {
      gsap.set(radar, { autoAlpha: 1, clearProps: "transform" });
    }

    return () => {
      media.revert();
    };
  }

  media.add("(min-width: 940px)", () => {
    ScrollTrigger.create({
      trigger: root,
      start: "top top",
      end: "bottom bottom",
      pin: stage,
      pinSpacing: true,
    });
  });

  gsap.fromTo(
    revealItems,
    { autoAlpha: 0, y: 30 },
    {
      autoAlpha: 1,
      y: 0,
      duration: 0.8,
      ease: "power2.out",
      stagger: 0.16,
      scrollTrigger: {
        trigger: root,
        start: "top 72%",
        once: true,
      },
    },
  );

  gsap.fromTo(
    bars,
    { scaleY: 0.22, transformOrigin: "50% 100%" },
    {
      scaleY: 1,
      ease: "none",
      stagger: { each: 0.012, from: "start" },
      scrollTrigger: {
        trigger: root,
        start: "top 65%",
        end: "72% bottom",
        scrub: 1,
      },
    },
  );

  if (radar) {
    gsap.fromTo(
      radar,
      { autoAlpha: 0, scale: 0.82, y: 42 },
      {
        autoAlpha: 1,
        scale: 1,
        y: 0,
        ease: "none",
        scrollTrigger: {
          trigger: root,
          start: "18% 62%",
          end: "76% bottom",
          scrub: 1,
        },
      },
    );
  }

  animateCounters(root);

  return () => {
    media.revert();
  };
}
