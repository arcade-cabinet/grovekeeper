// Game configuration constants
import configData from "./config.json";

export const GRID_SIZE = configData.grid.size;
export const CELL_SIZE = configData.grid.cellSize;

export const COLORS = configData.colors as Record<string, string>;

// 5-stage model (spec §15)
export const STAGE_NAMES = configData.stageNames as [
  "Seed",
  "Sprout",
  "Sapling",
  "Mature",
  "Old Growth",
];
export type StageName = (typeof STAGE_NAMES)[number];

export const STAGE_VISUALS = configData.stageVisuals as ReadonlyArray<{
  name: StageName;
  scale: number;
}>;

export const DIFFICULTY_MULTIPLIERS: Record<number, number> =
  configData.difficultyMultipliers as Record<number, number>;

export const SEASON_GROWTH_MULTIPLIERS: Record<string, number> =
  configData.seasonGrowthMultipliers as Record<string, number>;

export const WATER_BONUS = configData.tree.waterBonus;
export const DROUGHT_PENALTY = configData.tree.droughtPenalty;

// Max stage index
export const MAX_STAGE = configData.tree.maxStage;

export const PLAYER_SPEED = configData.player.speed;
export const NPC_MOVE_SPEED = configData.player.npcMoveSpeed;
export const INTERACTION_RADIUS = configData.player.interactionRadius;
