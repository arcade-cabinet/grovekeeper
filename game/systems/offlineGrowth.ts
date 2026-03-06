/**
 * Offline Growth Calculator
 *
 * When the player closes the app and returns later, trees should have grown
 * based on the elapsed real time.
 *
 * Simplifications for offline mode:
 * - Season multiplier averaged to 1.0 (summer equivalent)
 * - Water bonus is 1.0 (trees are not watered while offline)
 * - Elapsed time capped at 24 hours (86400 seconds)
 * - Water state resets to false (water evaporates while away)
 */

import growthConfig from "@/config/game/growth.json";

const MAX_STAGE: number = growthConfig.maxStage;
const MAX_OFFLINE_SECONDS = 86400; // 24 hours
const OFFLINE_SEASON_MULTIPLIER = 1.0;
const OFFLINE_WATER_BONUS = 1.0;

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

function offlineGrowthRate(
  baseGrowthTime: number,
  difficultyMultiplier: number,
): number {
  if (baseGrowthTime <= 0 || difficultyMultiplier <= 0) return 0;
  return (
    (OFFLINE_SEASON_MULTIPLIER * OFFLINE_WATER_BONUS) /
    (baseGrowthTime * difficultyMultiplier)
  );
}

/**
 * Calculate the offline growth for a single tree.
 */
export function calculateOfflineGrowth(
  tree: OfflineTreeState,
  elapsedSeconds: number,
  speciesData: OfflineSpeciesData,
): OfflineGrowthResult {
  let remainingTime = Math.min(
    Math.max(elapsedSeconds, 0),
    MAX_OFFLINE_SECONDS,
  );

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

    const rate = offlineGrowthRate(baseTime, diffMult);
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
    return calculateOfflineGrowth(tree, elapsedSeconds, species);
  });
}
