import type { HeroGeometryConfig } from "@/data/heroGeometry";
import {
  drawDot,
  polygonPoints,
  rgba,
  strokeLine,
  strokePolygon,
} from "@/lib/geometryCanvas";
import type {
  CanvasNode,
  HeroGeometryGlyph,
  HeroGeometryState,
} from "@/types/heroGeometry";

export function drawHeroGeometry(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: HeroGeometryState,
  config: HeroGeometryConfig,
  timeMs: number,
): void {
  context.clearRect(0, 0, width, height);
  if (!state.isHovering && state.glyphs.length === 0) {
    return;
  }

  drawConnections(context, state, config);
  state.glyphs.forEach((glyph) => drawGlyph(context, glyph, config, timeMs));
  drawPointerLinks(context, state, config);
  drawPointerGlyph(context, state, config, timeMs);
}

function drawConnections(
  context: CanvasRenderingContext2D,
  state: HeroGeometryState,
  config: HeroGeometryConfig,
): void {
  for (let fromIndex = 0; fromIndex < state.glyphs.length; fromIndex += 1) {
    const from = state.glyphs[fromIndex];
    if (!from) {
      continue;
    }

    for (let toIndex = fromIndex + 1; toIndex < state.glyphs.length; toIndex += 1) {
      const to = state.glyphs[toIndex];
      if (!to) {
        continue;
      }

      const distance = Math.hypot(from.cx - to.cx, from.cy - to.cy);
      if (distance > config.connectionDistance) {
        continue;
      }

      const alpha = (1 - distance / config.connectionDistance) * 0.52;
      strokeLine(context, from, to, rgba(config.ink, alpha), 1.15);
    }
  }
}

function drawGlyph(
  context: CanvasRenderingContext2D,
  glyph: HeroGeometryGlyph,
  config: HeroGeometryConfig,
  timeMs: number,
): void {
  const life = 1 - glyph.ageMs / config.glyphLifeMs;
  const birth = Math.min(glyph.ageMs / 260, 1);
  const radius = glyph.radius * (0.45 + birth * 0.55);
  const rotation = glyph.rotation + Math.sin(timeMs * 0.001 + glyph.birthMs) * 0.1;
  const points = polygonPoints(glyph, radius, rotation);

  strokePolygon(context, points, rgba(config.accent, life * 0.92), 1.9);
  strokePolygon(context, points, rgba(config.ink, life * 0.36), 1);

  points.forEach((point, index) => {
    const color = index % 2 === 0 ? config.accent : config.ink;
    drawDot(context, point, 3.2, rgba(color, life * 0.8));
  });
}

function drawPointerLinks(
  context: CanvasRenderingContext2D,
  state: HeroGeometryState,
  config: HeroGeometryConfig,
): void {
  if (!state.isHovering) {
    return;
  }

  const pointer: CanvasNode = { cx: state.pointerX, cy: state.pointerY };
  state.glyphs.slice(-12).forEach((glyph) => {
    const distance = Math.hypot(glyph.cx - pointer.cx, glyph.cy - pointer.cy);
    if (distance >= config.connectionDistance * 1.2) {
      return;
    }

    const alpha = 0.5 * (1 - distance / (config.connectionDistance * 1.2));
    strokeLine(context, pointer, glyph, rgba(config.accent, alpha), 1.3);
  });
}

function drawPointerGlyph(
  context: CanvasRenderingContext2D,
  state: HeroGeometryState,
  config: HeroGeometryConfig,
  timeMs: number,
): void {
  if (!state.isHovering) {
    return;
  }

  const points = Array.from({ length: 6 }, (_, index) => {
    const angle = timeMs * 0.0014 + (Math.PI * 2 * index) / 6;
    return {
      x: state.pointerX + Math.cos(angle) * 44,
      y: state.pointerY + Math.sin(angle) * 44,
    };
  });

  strokePolygon(context, points, rgba(config.accent, 0.86), 1.8);
  points.forEach((point) => drawDot(context, point, 2.8, rgba(config.accent, 0.82)));
}
