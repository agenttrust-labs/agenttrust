import gsap from "gsap";

interface PointerParallaxConfig {
  readonly duration?: number;
  readonly maxRotation?: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly root: HTMLElement;
  readonly targetSelector: string;
}

export function createPointerParallax({
  duration = 0.8,
  maxRotation = 0,
  maxX,
  maxY,
  root,
  targetSelector,
}: PointerParallaxConfig): () => void {
  const targets = Array.from(root.querySelectorAll<HTMLElement>(targetSelector));

  if (targets.length === 0) {
    return () => undefined;
  }

  const xSetters = targets.map((target) =>
    gsap.quickTo(target, "x", { duration, ease: "power3.out" }),
  );
  const ySetters = targets.map((target) =>
    gsap.quickTo(target, "y", { duration, ease: "power3.out" }),
  );
  const rotationSetters = targets.map((target) =>
    gsap.quickTo(target, "rotateZ", { duration, ease: "power3.out" }),
  );

  const handlePointerMove = (event: PointerEvent) => {
    const rect = root.getBoundingClientRect();
    const xRatio = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const yRatio = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

    xSetters.forEach((setX) => setX(xRatio * maxX));
    ySetters.forEach((setY) => setY(yRatio * maxY));
    rotationSetters.forEach((setRotation) =>
      setRotation(xRatio * maxRotation),
    );
  };

  const handlePointerLeave = () => {
    xSetters.forEach((setX) => setX(0));
    ySetters.forEach((setY) => setY(0));
    rotationSetters.forEach((setRotation) => setRotation(0));
  };

  root.addEventListener("pointermove", handlePointerMove);
  root.addEventListener("pointerleave", handlePointerLeave);

  return () => {
    root.removeEventListener("pointermove", handlePointerMove);
    root.removeEventListener("pointerleave", handlePointerLeave);
    gsap.set(targets, { clearProps: "rotateZ,x,y" });
  };
}
