import {
  DIFFICULTY_MULTIPLIERS,
  MAX_STAGE,
  SEASON_GROWTH_MULTIPLIERS,
  STAGE_VISUALS,
  WATER_BONUS,
} from "@/config/config";
import { getActiveDifficulty } from "@/config/difficulty";
import { getSpeciesById } from "@/config/trees";
import { koota } from "@/koota";
import { getGrowthMultiplier as getStructureGrowthMult } from "@/structures/StructureManager";
import {
  GridCell,
  Position,
  Renderable,
  Structure,
  Tree,
} from "@/traits";

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
 *
 * Builds spatial lookup maps once per frame for O(1) neighbor queries,
 * avoiding O(n^2) per-tree iteration over grid cells and other trees.
 */
// Reusable per-frame spatial lookups — cleared each call instead of
// reallocated. Keys are packed (x + OFFSET) << 16 | (z + OFFSET) so
// coordinates in [-32768, 32767] work without string allocation (prior
// impl used template literals `${x},${z}` producing ~N strings/frame
// plus an additional ~8N during the silver-birch/mystic-fern neighbor
// scans — measurable GC pressure on mobile).
// See docs/PERF_AUDIT.md.
const COORD_OFFSET = 32768;
const packCoord = (x: number, z: number): number =>
  ((x + COORD_OFFSET) << 16) | (z + COORD_OFFSET);
const _waterTiles = new Set<number>();
const _treeCounts = new Map<number, number>();

interface StructureShape {
  templateId: string;
  effectType?: "growth_boost" | "harvest_boost" | "stamina_regen" | "storage";
  effectRadius?: number;
  effectMagnitude?: number;
}

function buildStructuresAdapter(): Iterable<{
  structure?: StructureShape;
  position?: { x: number; z: number };
}> {
  const result: {
    structure?: StructureShape;
    position?: { x: number; z: number };
  }[] = [];
  for (const e of koota.query(Structure, Position)) {
    const s = e.get(Structure);
    const p = e.get(Position);
    result.push({
      structure: s,
      position: { x: p.x, z: p.z },
    });
  }
  return result;
}

export function growthSystem(
  deltaTime: number,
  currentSeason: string,
  weatherMultiplier = 1.0,
): void {
  _waterTiles.clear();
  _treeCounts.clear();

  for (const cell of koota.query(GridCell, Position)) {
    const gc = cell.get(GridCell);
    if (gc.type === "water") {
      _waterTiles.add(packCoord(gc.gridX, gc.gridZ));
    }
  }

  for (const entity of koota.query(Tree, Position, Renderable)) {
    const p = entity.get(Position);
    const key = packCoord(p.x, p.z);
    _treeCounts.set(key, (_treeCounts.get(key) ?? 0) + 1);
  }

  const structuresAdapter = buildStructuresAdapter();

  for (const entity of koota.query(Tree, Position, Renderable)) {
    const tree = entity.get(Tree);
    const position = entity.get(Position);
    const renderable = entity.get(Renderable);

    // Don't grow past max stage
    if (tree.stage >= MAX_STAGE) {
      entity.set(Renderable, {
        ...renderable,
        scale: getStageScale(tree.stage, 0),
      });
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
      entity.set(Renderable, {
        ...renderable,
        scale: getStageScale(tree.stage, tree.progress),
      });
      continue;
    }

    // Structure growth boost
    const structureMult = getStructureGrowthMult(
      position.x,
      position.z,
      structuresAdapter,
    );

    // Fertilized bonus (2x growth for the current stage cycle)
    const fertilizedMult = tree.fertilized ? 2.0 : 1.0;

    // Species-specific bonuses (O(1) via spatial lookups)
    let speciesBonus = 1.0;

    // Silver Birch: +20% growth near water tiles
    if (tree.speciesId === "silver-birch") {
      const px = position.x;
      const pz = position.z;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (dx === 0 && dz === 0) continue;
          if (_waterTiles.has(packCoord(px + dx, pz + dz))) {
            speciesBonus = 1.2;
            dx = 2; // break outer
            break;
          }
        }
      }
    }

    // Mystic Fern: +15% per adjacent tree (max +60%)
    if (tree.speciesId === "mystic-fern") {
      const px = position.x;
      const pz = position.z;
      let adjacentCount = 0;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (dx === 0 && dz === 0) continue;
          adjacentCount += _treeCounts.get(packCoord(px + dx, pz + dz)) ?? 0;
        }
      }
      speciesBonus = 1 + Math.min(adjacentCount * 0.15, 0.6);
    }

    // Advance progress (weather + structure + fertilized + species + difficulty multipliers)
    const difficultyGrowthMult = getActiveDifficulty().growthSpeedMult;
    let newProgress =
      tree.progress +
      rate *
        weatherMultiplier *
        structureMult *
        fertilizedMult *
        speciesBonus *
        difficultyGrowthMult *
        deltaTime;
    const newTotalGrowthTime = tree.totalGrowthTime + deltaTime;
    let newStage = tree.stage;
    let newWatered = tree.watered;
    let newFertilized = tree.fertilized;

    // Handle stage transition
    while (newProgress >= 1 && newStage < MAX_STAGE) {
      newProgress -= 1;
      newStage = (newStage + 1) as 0 | 1 | 2 | 3 | 4;
      newWatered = false;
      // Fertilized bonus expires after one stage cycle
      if (newFertilized) {
        newFertilized = false;
      }
    }

    // Clamp progress at max stage
    if (newStage >= MAX_STAGE) {
      newProgress = Math.min(newProgress, 0.99);
    }

    entity.set(Tree, {
      ...tree,
      progress: newProgress,
      stage: newStage,
      watered: newWatered,
      fertilized: newFertilized,
      totalGrowthTime: newTotalGrowthTime,
    });
    entity.set(Renderable, {
      ...renderable,
      scale: getStageScale(newStage, newProgress),
    });
  }
}
