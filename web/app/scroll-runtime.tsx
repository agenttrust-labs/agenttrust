"use client";

import type { ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface ScrollRuntimeProps {
  readonly children: ReactNode;
}

export function ScrollRuntime({ children }: ScrollRuntimeProps) {
  useGSAP(() => {
    ScrollTrigger.defaults({
      scroller: window,
      invalidateOnRefresh: true,
    });

    const refresh = () => {
      ScrollTrigger.refresh();
    };

    const refreshFrame = window.requestAnimationFrame(refresh);

    window.addEventListener("load", refresh, { once: true });
    window.addEventListener("resize", refresh);

    return () => {
      window.cancelAnimationFrame(refreshFrame);
      window.removeEventListener("load", refresh);
      window.removeEventListener("resize", refresh);
    };
  }, []);

  return children;
}
