import { DIFFICULTY_MULTIPLIERS, MAX_STAGE } from "../constants/config";
import { getActiveDifficulty } from "../constants/difficulty";

/**
 * Offline Growth Calculator
 *
 * When the player closes the app and returns later, trees should have grown
 * based on the elapsed real time. This module calculates the growth that
 * occurred while offline without simulating every frame.
 *
 * Simplifications for offline mode:
 * - Season multiplier averaged to 1.0 (summer equivalent)
 * - Water bonus is 1.0 (trees are not watered while offline)
 * - Elapsed time capped at 24 hours (86400 seconds) to prevent abuse
 * - Water state resets to false (water evaporates while away)
 */

const MAX_OFFLINE_SECONDS = 86400; // 24 hours
const OFFLINE_SEASON_MULTIPLIER = 1.0;
const OFFLINE_WATER_BONUS = 1.0;

export interface OfflineTreeState {
  speciesId: string;
  stage: number;
  progress: number;
  watered: boolean;
}

export interface OfflineGrowthResult {
  stage: number;
  progress: number;
  watered: boolean; // always false after offline (water evaporates)
}

export interface OfflineSpeciesData {
  difficulty: number;
  baseGrowthTimes: number[];
  evergreen: boolean;
}

/**
 * Calculate the growth rate (progress per second) for a given stage during
 * offline time.
 *
 * Formula: effectiveRate = (1 / baseGrowthTime) * seasonMult * waterBonus * (1 / difficultyMult)
 *
 * During offline, seasonMult = 1.0 and waterBonus = 1.0, so this simplifies to:
 *   effectiveRate = 1 / (baseGrowthTime * difficultyMult)
 */
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
 * Calculate the offline growth for a single tree given the elapsed seconds
 * since the player was last active.
 *
 * Walks through stages consuming available time. For each stage, computes
 * how many seconds are needed to fill the remaining progress, then either
 * advances the stage (if enough time) or applies partial progress.
 */
export function calculateOfflineGrowth(
  tree: OfflineTreeState,
  elapsedSeconds: number,
  speciesData: OfflineSpeciesData,
): OfflineGrowthResult {
  // Cap offline time at 24 hours
  let remainingTime = Math.min(
    Math.max(elapsedSeconds, 0),
    MAX_OFFLINE_SECONDS,
  );

  let stage = tree.stage;
  let progress = tree.progress;

  // Already at max stage -- nothing to grow
  if (stage >= MAX_STAGE) {
    return {
      stage: MAX_STAGE,
      progress: Math.min(progress, 1.0),
      watered: false,
    };
  }

  const diffMult = DIFFICULTY_MULTIPLIERS[speciesData.difficulty] ?? 1.0;
  const difficultyGrowthMult = getActiveDifficulty().growthSpeedMult;

  while (remainingTime > 0 && stage < MAX_STAGE) {
    const baseTime = speciesData.baseGrowthTimes[stage];
    if (baseTime === undefined || baseTime <= 0) break;

    const rate = offlineGrowthRate(baseTime, diffMult) * difficultyGrowthMult;
    if (rate <= 0) break;

    // How much progress remains to fill this stage?
    const progressNeeded = 1.0 - progress;

    // How many seconds to fill it?
    const secondsToFill = progressNeeded / rate;

    if (remainingTime >= secondsToFill) {
      // Enough time to complete this stage
      remainingTime -= secondsToFill;
      stage += 1;
      progress = 0;
    } else {
      // Partial progress within this stage
      progress += rate * remainingTime;
      remainingTime = 0;
    }
  }

  // Clamp at max stage
  if (stage > MAX_STAGE) {
    stage = MAX_STAGE;
  }

  // Cap progress at 1.0 when at max stage
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
 * Apply offline growth to an array of trees. Returns results in the same
 * order as the input array. Trees whose species cannot be resolved are
 * returned unchanged (with watered set to false).
 */
export function calculateAllOfflineGrowth(
  trees: OfflineTreeState[],
  elapsedSeconds: number,
  getSpecies: (id: string) => OfflineSpeciesData | undefined,
): OfflineGrowthResult[] {
  return trees.map((tree) => {
    const species = getSpecies(tree.speciesId);
    if (!species) {
      // Unknown species -- return current state unchanged, but clear water
      return {
        stage: tree.stage,
        progress: tree.progress,
        watered: false,
      };
    }
    return calculateOfflineGrowth(tree, elapsedSeconds, species);
  });
}
