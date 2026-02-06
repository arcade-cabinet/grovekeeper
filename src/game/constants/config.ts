// Game configuration constants
export const GRID_SIZE = 12;
export const CELL_SIZE = 1;

export const COLORS = {
  forestGreen: "#2D5A27",
  barkBrown: "#5D4037",
  soilDark: "#3E2723",
  leafLight: "#81C784",
  autumnGold: "#FFB74D",
  skyMist: "#E8F5E9",
  sunsetWarm: "#FFAB91",
  earthRed: "#8D6E63",
} as const;

// Legacy GROWTH_STAGES kept for backwards compat during migration
export const GROWTH_STAGES = [
  { name: "seed", progress: 0, scale: 0.1 },
  { name: "sprout", progress: 0.1, scale: 0.2 },
  { name: "seedling", progress: 0.25, scale: 0.35 },
  { name: "sapling", progress: 0.5, scale: 0.55 },
  { name: "young", progress: 0.75, scale: 0.75 },
  { name: "mature", progress: 1.0, scale: 1.0 },
  { name: "ancient", progress: 1.5, scale: 1.2 },
] as const;

// New 5-stage model (spec §15)
export const STAGE_NAMES = [
  "Seed",
  "Sprout",
  "Sapling",
  "Mature",
  "Old Growth",
] as const;
export type StageName = (typeof STAGE_NAMES)[number];

export const STAGE_VISUALS = [
  { name: "Seed", scale: 0.08 }, // stage 0: tiny visible seed
  { name: "Sprout", scale: 0.15 }, // stage 1: tiny shoot
  { name: "Sapling", scale: 0.4 }, // stage 2: small trunk + 1 canopy
  { name: "Mature", scale: 0.8 }, // stage 3: full trunk + 2-3 canopy
  { name: "Old Growth", scale: 1.2 }, // stage 4: thick trunk + 3 canopy
] as const;

export const DIFFICULTY_MULTIPLIERS: Record<number, number> = {
  1: 1.0,
  2: 1.3,
  3: 1.6,
  4: 2.0,
  5: 2.5,
};

export const SEASON_GROWTH_MULTIPLIERS: Record<string, number> = {
  spring: 1.5,
  summer: 1.0,
  autumn: 0.8,
  winter: 0.0,
};

export const WATER_BONUS = 1.3;
export const DROUGHT_PENALTY = 0.5;

// Max stage index
export const MAX_STAGE = 4;

export const PLAYER_SPEED = 3;
export const INTERACTION_RADIUS = 1.5;
