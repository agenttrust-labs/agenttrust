import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface NetworkRevealConfig {
  readonly isReducedMotion: boolean;
  readonly root: HTMLElement;
}

export function createNetworkReveal({
  isReducedMotion,
  root,
}: NetworkRevealConfig): () => void {
  gsap.registerPlugin(ScrollTrigger);

  const context = gsap.context(() => {
    const revealItems = gsap.utils.toArray<HTMLElement>("[data-network-reveal]");
    const cards = gsap.utils.toArray<HTMLElement>("[data-network-card]");
    const globe = root.querySelector<HTMLElement>("[data-network-globe]");
    const orbit = root.querySelector<SVGElement>("[data-network-globe-orbit]");
    const motionTargets = [globe, orbit].filter(
      (target): target is HTMLElement | SVGElement => target !== null,
    );

    if (isReducedMotion) {
      gsap.set([...revealItems, ...cards], {
        autoAlpha: 1,
        clearProps: "transform",
      });
      gsap.set(motionTargets, {
        autoAlpha: 1,
        clearProps: "transform",
      });
      return;
    }

    gsap
      .timeline({
        scrollTrigger: {
          trigger: root,
          start: "top 72%",
          end: "top 10%",
          scrub: 1.2,
        },
      })
      .fromTo(
        revealItems,
        { autoAlpha: 0, y: 34 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.75,
          ease: "power2.out",
          stagger: 0.08,
        },
        0,
      )
      .fromTo(
        cards,
        { autoAlpha: 0, x: 30, y: 18 },
        {
          autoAlpha: 1,
          x: 0,
          y: 0,
          duration: 0.78,
          ease: "power2.out",
          stagger: 0.1,
        },
        0.15,
      )
      .fromTo(
        motionTargets,
        { autoAlpha: 0, scale: 0.78, y: 74 },
        {
          autoAlpha: 1,
          scale: 1,
          y: 0,
          duration: 1,
          ease: "power2.out",
        },
        0,
      );

    if (globe) {
      gsap.to(globe, {
        yPercent: -5,
        scale: 1.035,
        ease: "none",
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.6,
        },
      });
    }

    if (orbit) {
      gsap.to(orbit, {
        rotate: 12,
        transformOrigin: "50% 50%",
        ease: "none",
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.4,
        },
      });
    }

    gsap.to(cards, {
      y: (index) => (index - 1) * -18,
      ease: "none",
      scrollTrigger: {
        trigger: root,
        start: "top top",
        end: "bottom bottom",
        scrub: 1.35,
      },
    });
  }, root);

  return () => context.revert();
}
