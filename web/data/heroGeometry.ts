export type HeroPolygonSides = 3 | 6 | 8;

export interface HeroGeometryConfig {
  readonly accent: string;
  readonly connectionDistance: number;
  readonly glyphLifeMs: number;
  readonly ink: string;
  readonly maxGlyphs: number;
  readonly spawnDistance: number;
  readonly spawnIntervalMs: number;
}

export const HERO_GEOMETRY_CONFIG: HeroGeometryConfig = {
  accent: "#6f4cff",
  connectionDistance: 210,
  glyphLifeMs: 4200,
  ink: "#0a0a0a",
  maxGlyphs: 72,
  spawnDistance: 12,
  spawnIntervalMs: 22,
};

export const HERO_POLYGON_SEQUENCE: readonly HeroPolygonSides[] = [
  3, 6, 8, 6,
];
