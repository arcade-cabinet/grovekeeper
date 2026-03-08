/**
 * Offline Growth Calculator
 *
 * When the player closes the app and returns later, trees should have grown
 * based on the elapsed real time.
 *
 * Simplifications for offline mode:
 * - Season multiplier sourced from saved currentSeason (from growth.json)
 * - Water bonus is 1.0 (trees are not watered while offline)
 * - Weather multiplier sourced from saved weather type (defaults to clear=1.0)
 * - Elapsed time capped at 24 hours (86400 seconds)
 * - Water state resets to false (water evaporates while away)
 */

import growthConfig from "@/config/game/growth.json" with { type: "json" };
import weatherConfig from "@/config/game/weather.json" with { type: "json" };
import { chunkDiffs$, saveChunkDiff, type ChunkDiff, type PlantedTree } from "@/game/world/chunkPersistence";
import { getSpeciesById } from "@/game/config/species";
import type { Season } from "@/game/systems/time";
import type { WeatherType } from "@/game/systems/weather";

const MAX_STAGE: number = growthConfig.maxStage;
const MAX_OFFLINE_SECONDS = 86400; // 24 hours
const OFFLINE_WATER_BONUS = 1.0; // Water evaporates while away

const DIFFICULTY_MULTIPLIERS: Record<number, number> = {
  1: 1.0,
  2: 1.2,
  3: 1.5,
  4: 2.0,
  5: 2.5,
};

export interface OfflineTreeState {
  speciesId: string;
  stage: number;
  progress: number;
  watered: boolean;
}

export interface OfflineGrowthResult {
  stage: number;
  progress: number;
  watered: boolean;
}

export interface OfflineSpeciesData {
  difficulty: number;
  baseGrowthTimes: number[];
  evergreen: boolean;
}

/** Summary returned by applyOfflineGrowthToChunkDeltas. */
export interface ChunkGrowthSummary {
  /** Number of chunk diffs that had at least one tree updated. */
  chunksUpdated: number;
  /** Total number of tree state objects updated. */
  treesUpdated: number;
  /** Total number of stage advances across all trees. */
  stageAdvances: number;
  /** Elapsed seconds used for the calculation (capped at 24h). */
  elapsedSeconds: number;
}

function offlineGrowthRate(
  baseGrowthTime: number,
  difficultyMultiplier: number,
  seasonMultiplier: number,
  weatherMultiplier: number,
): number {
  if (baseGrowthTime <= 0 || difficultyMultiplier <= 0) return 0;
  return (
    (seasonMultiplier * OFFLINE_WATER_BONUS * weatherMultiplier) /
    (baseGrowthTime * difficultyMultiplier)
  );
}

/**
 * Calculate the offline growth for a single tree.
 *
 * @param tree             - current state of the tree
 * @param elapsedSeconds   - real seconds elapsed since last save
 * @param speciesData      - species configuration
 * @param seasonMultiplier - growth multiplier for the current season (default 1.0)
 * @param weatherMultiplier- growth multiplier for saved weather type (default 1.0)
 */
export function calculateOfflineGrowth(
  tree: OfflineTreeState,
  elapsedSeconds: number,
  speciesData: OfflineSpeciesData,
  seasonMultiplier = 1.0,
  weatherMultiplier = 1.0,
): OfflineGrowthResult {
  let remainingTime = Math.min(Math.max(elapsedSeconds, 0), MAX_OFFLINE_SECONDS);

  let stage = tree.stage;
  let progress = tree.progress;

  if (stage >= MAX_STAGE) {
    return {
      stage: MAX_STAGE,
      progress: Math.min(progress, 1.0),
      watered: false,
    };
  }

  const diffMult = DIFFICULTY_MULTIPLIERS[speciesData.difficulty] ?? 1.0;

  while (remainingTime > 0 && stage < MAX_STAGE) {
    const baseTime = speciesData.baseGrowthTimes[stage];
    if (baseTime === undefined || baseTime <= 0) break;

    const rate = offlineGrowthRate(baseTime, diffMult, seasonMultiplier, weatherMultiplier);
    if (rate <= 0) break;

    const progressNeeded = 1.0 - progress;
    const secondsToFill = progressNeeded / rate;

    if (remainingTime >= secondsToFill) {
      remainingTime -= secondsToFill;
      stage += 1;
      progress = 0;
    } else {
      progress += rate * remainingTime;
      remainingTime = 0;
    }
  }

  if (stage > MAX_STAGE) {
    stage = MAX_STAGE;
  }

  if (stage >= MAX_STAGE) {
    progress = Math.min(progress, 1.0);
  }

  return {
    stage,
    progress,
    watered: false,
  };
}

/**
 * Apply offline growth to an array of trees.
 */
export function calculateAllOfflineGrowth(
  trees: OfflineTreeState[],
  elapsedSeconds: number,
  getSpecies: (id: string) => OfflineSpeciesData | undefined,
  seasonMultiplier = 1.0,
  weatherMultiplier = 1.0,
): OfflineGrowthResult[] {
  return trees.map((tree) => {
    const species = getSpecies(tree.speciesId);
    if (!species) {
      return {
        stage: tree.stage,
        progress: tree.progress,
        watered: false,
      };
    }
    return calculateOfflineGrowth(tree, elapsedSeconds, species, seasonMultiplier, weatherMultiplier);
  });
}

/**
 * Apply offline growth to all persisted chunk deltas (Spec §26.3).
 *
 * Called on app resume to advance tree growth for time spent offline.
 * Reads all chunk diffs from chunkDiffs$, applies growth per tree,
 * and writes updated diffs back via saveChunkDiff.
 *
 * @param lastSavedAt    - Unix timestamp (ms) of last save; 0 = no prior save → no-op
 * @param season         - season at time of last save (from game store currentSeason)
 * @param weatherType    - weather type at last save (defaults to "clear")
 * @param lookupSpecies  - species lookup (injectable for testing; defaults to getSpeciesById)
 */
export function applyOfflineGrowthToChunkDeltas(
  lastSavedAt: number,
  season: Season,
  weatherType: WeatherType = "clear",
  lookupSpecies: (id: string) => OfflineSpeciesData | undefined = (id) => getSpeciesById(id),
): ChunkGrowthSummary {
  if (lastSavedAt <= 0) {
    return { chunksUpdated: 0, treesUpdated: 0, stageAdvances: 0, elapsedSeconds: 0 };
  }

  const rawElapsed = (Date.now() - lastSavedAt) / 1000;
  const elapsedSeconds = Math.min(Math.max(rawElapsed, 0), MAX_OFFLINE_SECONDS);

  if (elapsedSeconds <= 0) {
    return { chunksUpdated: 0, treesUpdated: 0, stageAdvances: 0, elapsedSeconds: 0 };
  }

  const seasonMultiplier: number =
    (growthConfig.seasonMultipliers as Record<string, number>)[season] ?? 1.0;
  const weatherMultiplier: number =
    (weatherConfig.growthMultipliers as Record<string, number>)[weatherType] ?? 1.0;

  // Winter season multiplier is 0 — skip all work.
  if (seasonMultiplier <= 0) {
    return { chunksUpdated: 0, treesUpdated: 0, stageAdvances: 0, elapsedSeconds };
  }

  const allDiffs = chunkDiffs$.peek();
  let chunksUpdated = 0;
  let treesUpdated = 0;
  let stageAdvances = 0;

  for (const [chunkKey, diff] of Object.entries(allDiffs)) {
    if (diff.plantedTrees.length === 0) continue;

    let chunkChanged = false;
    const updatedTrees = diff.plantedTrees.map((planted): PlantedTree => {
      const species = lookupSpecies(planted.speciesId);
      if (!species) return planted;

      const result = calculateOfflineGrowth(
        { speciesId: planted.speciesId, stage: planted.stage, progress: planted.progress, watered: false },
        elapsedSeconds,
        species,
        seasonMultiplier,
        weatherMultiplier,
      );

      if (result.stage !== planted.stage || result.progress !== planted.progress) {
        chunkChanged = true;
        treesUpdated++;
        if (result.stage > planted.stage) {
          stageAdvances += result.stage - planted.stage;
        }
        return { ...planted, stage: result.stage as PlantedTree["stage"], progress: result.progress };
      }

      return planted;
    });

    if (chunkChanged) {
      chunksUpdated++;
      saveChunkDiff(chunkKey, { ...diff, plantedTrees: updatedTrees } satisfies ChunkDiff);
    }
  }

  return { chunksUpdated, treesUpdated, stageAdvances, elapsedSeconds };
}
