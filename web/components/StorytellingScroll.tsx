"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import StorytellingCopyPanel from "@/components/StorytellingCopyPanel";
import StorytellingGraphic from "@/components/StorytellingGraphic";
import StorytellingMobileList from "@/components/StorytellingMobileList";
import StorytellingPagination from "@/components/StorytellingPagination";
import styles from "@/components/StorytellingSection.module.css";
import {
  STORYTELLING_PANELS,
  STORYTELLING_SECTION_ID,
} from "@/data/storytelling";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { createStorytellingScrollTrigger } from "@/lib/animations/storytellingScroll";

export default function StorytellingScroll() {
  const rootRef = useRef<HTMLElement>(null);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  const setStoryIndex = (index: number) => {
    if (index === activeIndexRef.current) {
      return;
    }

    activeIndexRef.current = index;
    setActiveIndex(index);
  };

  useGSAP(
    () => {
      const root = rootRef.current;

      if (!root || shouldReduceMotion) {
        return;
      }

      const media = gsap.matchMedia();

      media.add("(min-width: 940px)", () => {
        const trigger = createStorytellingScrollTrigger({
          count: STORYTELLING_PANELS.length,
          root,
          onActiveIndexChange: setStoryIndex,
        });

        return () => trigger.kill();
      });

      return () => media.revert();
    },
    { dependencies: [shouldReduceMotion], scope: rootRef },
  );

  const handleSelectStory = (index: number) => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const rect = root.getBoundingClientRect();
    const startY = window.scrollY + rect.top;
    const scrollSpan = Math.max(1, root.offsetHeight - window.innerHeight);
    const progress = index / Math.max(1, STORYTELLING_PANELS.length - 1);

    window.scrollTo({
      top: startY + scrollSpan * progress,
      behavior: shouldReduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <section
      ref={rootRef}
      id={STORYTELLING_SECTION_ID}
      className={styles.section}
      aria-labelledby="trust-stack-title"
    >
      <div className={styles.shell}>
        <h2 id="trust-stack-title" className={styles.srOnly}>
          Trust stack storytelling
        </h2>
        <div className={styles.desktopStage}>
          <div className={styles.copyColumn}>
            <div className={styles.copyStack}>
              {STORYTELLING_PANELS.map((panel, index) => (
                <StorytellingCopyPanel
                  key={panel.title}
                  panel={panel}
                  isActive={index === activeIndex}
                />
              ))}
            </div>
            <StorytellingPagination
              activeIndex={activeIndex}
              onSelectStory={handleSelectStory}
              panels={STORYTELLING_PANELS}
            />
          </div>
          <StorytellingGraphic
            activeIndex={activeIndex}
            panels={STORYTELLING_PANELS}
          />
        </div>
        <StorytellingMobileList panels={STORYTELLING_PANELS} />
      </div>
    </section>
  );
}
