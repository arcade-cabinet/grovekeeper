/**
 * Growth system -- tree growth calculations.
 *
 * Pure functions for growth rate calculation and stage scale interpolation.
 * The full ECS-coupled growthSystem is in the game loop; these helpers
 * are engine-agnostic.
 */

import growthConfig from "@/config/game/growth.json" with { type: "json" };

// -- Types ────────────────────────────────────────────────────────────────────

export interface GrowthRateParams {
  baseTime: number;
  difficulty: number;
  season: string;
  watered: boolean;
  evergreen: boolean;
  speciesId?: string;
}

// -- Constants from config ────────────────────────────────────────────────────

const MAX_STAGE: number = growthConfig.maxStage;
const STAGE_VISUALS: { scale: number }[] = growthConfig.stageVisuals;
const SEASON_GROWTH_MULTIPLIERS: Record<string, number> = growthConfig.seasonMultipliers;
const WATER_BONUS: number = growthConfig.waterBonus;

// Difficulty multipliers: index 1-5 maps to species difficulty
const DIFFICULTY_MULTIPLIERS: Record<number, number> = {
  1: 1.0,
  2: 1.2,
  3: 1.5,
  4: 2.0,
  5: 2.5,
};

// -- Public API ───────────────────────────────────────────────────────────────

export { MAX_STAGE, STAGE_VISUALS, SEASON_GROWTH_MULTIPLIERS, WATER_BONUS };

/**
 * Calculate the visual scale for a tree at a given stage + progress.
 * Smoothly interpolates toward the next stage using progress * 0.3 as partial preview.
 */
export function getStageScale(stage: number, progress: number): number {
  const clampedStage = Math.max(0, Math.min(Math.floor(stage), MAX_STAGE));
  const baseScale = STAGE_VISUALS[clampedStage].scale;
  if (clampedStage >= MAX_STAGE) return baseScale;

  const nextScale = STAGE_VISUALS[clampedStage + 1].scale;
  const partialPreview = progress * 0.3;
  return baseScale + (nextScale - baseScale) * partialPreview;
}

/**
 * Calculates growth rate (progress per second) for a tree.
 * Formula from spec:
 *   progressPerTick = deltaTime * seasonBonus * waterBonus / (baseTime * difficultyMultiplier)
 * Returns the rate per second (without deltaTime).
 */
export function calcGrowthRate(params: GrowthRateParams): number {
  const { baseTime, difficulty, season, watered, evergreen, speciesId } = params;

  // Season multiplier
  let seasonMult = SEASON_GROWTH_MULTIPLIERS[season] ?? 1.0;

  // Evergreen override in winter
  if (season === "winter") {
    if (speciesId === "ghost-birch") {
      seasonMult = 0.5;
    } else if (evergreen) {
      seasonMult = 0.3;
    }
    // Otherwise stays 0.0 for non-evergreen
  }

  if (seasonMult === 0) return 0;

  // Difficulty multiplier
  const diffMult = DIFFICULTY_MULTIPLIERS[difficulty] ?? 1.0;

  // Water bonus
  const waterMult = watered ? WATER_BONUS : 1.0;

  // Guard against invalid baseTime
  if (baseTime <= 0) return 0;

  // progressPerSecond = seasonBonus * waterBonus / (baseTime * difficultyMultiplier)
  return (seasonMult * waterMult) / (baseTime * diffMult);
}
