import {
  DIFFICULTY_MULTIPLIERS,
  MAX_STAGE,
  SEASON_GROWTH_MULTIPLIERS,
  STAGE_VISUALS,
  WATER_BONUS,
} from "../constants/config";
import { getSpeciesById } from "../constants/trees";
import { treesQuery, structuresQuery, gridCellsQuery } from "../ecs/world";
import { getGrowthMultiplier as getStructureGrowthMult } from "../structures/StructureManager";

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

export interface GrowthRateParams {
  baseTime: number;
  difficulty: number;
  season: string;
  watered: boolean;
  evergreen: boolean;
  speciesId?: string;
}

/**
 * Calculates growth rate (progress per second) for a tree.
 * Formula from spec:
 *   progressPerTick = deltaTime * seasonBonus * waterBonus / (baseTime * difficultyMultiplier)
 * Returns the rate per second (without deltaTime).
 */
export function calcGrowthRate(params: GrowthRateParams): number {
  const { baseTime, difficulty, season, watered, evergreen, speciesId } =
    params;

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

/**
 * Growth system — runs every frame. Advances tree growth based on species,
 * difficulty, season, and watered state. Handles stage transitions.
 */
export function growthSystem(deltaTime: number, currentSeason: string, weatherMultiplier = 1.0): void {
  for (const entity of treesQuery) {
    if (!entity.tree || !entity.renderable) continue;

    const tree = entity.tree;

    // Don't grow past max stage
    if (tree.stage >= MAX_STAGE) {
      entity.renderable.scale = getStageScale(tree.stage, 0);
      continue;
    }

    const species = getSpeciesById(tree.speciesId);
    if (!species) continue;

    const baseTime = species.baseGrowthTimes[tree.stage];
    if (baseTime === undefined || baseTime <= 0) continue;

    const rate = calcGrowthRate({
      baseTime,
      difficulty: species.difficulty,
      season: currentSeason,
      watered: tree.watered,
      evergreen: species.evergreen,
      speciesId: species.id,
    });

    if (rate <= 0) {
      entity.renderable.scale = getStageScale(tree.stage, tree.progress);
      continue;
    }

    // Structure growth boost
    const structureMult = entity.position
      ? getStructureGrowthMult(entity.position.x, entity.position.z, structuresQuery)
      : 1.0;

    // Fertilized bonus (2x growth for the current stage cycle)
    const fertilizedMult = tree.fertilized ? 2.0 : 1.0;

    // Species-specific bonuses
    let speciesBonus = 1.0;

    // Silver Birch: +20% growth near water tiles
    if (tree.speciesId === "silver-birch" && entity.position) {
      const px = entity.position.x;
      const pz = entity.position.z;
      for (const cell of gridCellsQuery) {
        if (cell.gridCell?.type === "water") {
          const dx = cell.gridCell.gridX - px;
          const dz = cell.gridCell.gridZ - pz;
          if (Math.abs(dx) <= 1 && Math.abs(dz) <= 1 && (dx !== 0 || dz !== 0)) {
            speciesBonus = 1.2;
            break;
          }
        }
      }
    }

    // Mystic Fern: +15% per adjacent tree (max +60%)
    if (tree.speciesId === "mystic-fern" && entity.position) {
      const px = entity.position.x;
      const pz = entity.position.z;
      let adjacentCount = 0;
      for (const other of treesQuery) {
        if (other === entity || !other.position) continue;
        const dx = Math.abs(other.position.x - px);
        const dz = Math.abs(other.position.z - pz);
        if (dx <= 1 && dz <= 1) {
          adjacentCount++;
        }
      }
      speciesBonus = 1 + Math.min(adjacentCount * 0.15, 0.6);
    }

    // Advance progress (weather + structure + fertilized + species multipliers)
    tree.progress += rate * weatherMultiplier * structureMult * fertilizedMult * speciesBonus * deltaTime;
    tree.totalGrowthTime += deltaTime;

    // Handle stage transition
    while (tree.progress >= 1 && tree.stage < MAX_STAGE) {
      tree.progress -= 1;
      tree.stage = (tree.stage + 1) as 0 | 1 | 2 | 3 | 4;
      tree.watered = false;
      // Fertilized bonus expires after one stage cycle
      if (tree.fertilized) {
        tree.fertilized = false;
      }
    }

    // Clamp progress at max stage
    if (tree.stage >= MAX_STAGE) {
      tree.progress = Math.min(tree.progress, 0.99);
    }

    // Update visual scale
    entity.renderable.scale = getStageScale(tree.stage, tree.progress);
  }
}
