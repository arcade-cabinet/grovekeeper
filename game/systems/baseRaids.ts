/**
 * Base raid system -- survival mode mechanic.
 *
 * Higher base value attracts more frequent and stronger raids.
 * Raids come in 1-3 waves with increasing difficulty.
 * Warning system: ominous sounds at 2 min, horn blast at 30 sec.
 * Raids only trigger at night in Survival mode (affectsGameplay).
 *
 * Spec §18.5, §34. RNG scope: "raid" (table in Spec §36).
 */

import { scopedRNG } from "../utils/seedWords";
import type { DayNightComponent } from "../ecs/components/procedural";
import raidsConfig from "../../config/game/raids.json";

/** Single wave within a raid event. */
export interface RaidWave {
  waveNumber: number;
  enemies: RaidEnemy[];
  delayBeforeWave: number;
}

/** Enemy spawned during a raid. */
export interface RaidEnemy {
  enemyType: string;
  count: number;
  tier: number;
}

/** Full raid event data. */
export interface RaidEvent {
  waves: RaidWave[];
  totalEnemyCount: number;
  estimatedDifficulty: number;
}

/** Cardinal direction enemies approach from (chunk edge). */
export type ApproachDirection = "north" | "south" | "east" | "west";

const APPROACH_DIRECTIONS: ApproachDirection[] = ["north", "south", "east", "west"];

/**
 * Calculate the probability of a raid occurring this game-day.
 *
 * Factors: base value, day number, difficulty multiplier.
 * Minimum gap of 3 game-days between raids (caller enforces).
 */
export function calculateRaidProbability(
  baseValue: number,
  dayNumber: number,
  difficulty: string,
): number {
  const params = raidsConfig.probabilityParams;
  const diffMultiplier =
    (raidsConfig.difficultyMultipliers as Record<string, number>)[difficulty] ??
    params.defaultDifficultyMultiplier;

  // Base probability scales with base value (diminishing returns via sqrt)
  const valueFactor =
    Math.sqrt(baseValue / params.baseValueDivisor) * params.valueWeight;

  // Day factor increases over time (slow linear ramp)
  const dayFactor = Math.min(dayNumber * params.dayWeight, params.dayFactorCap);

  const raw = (valueFactor + dayFactor) * diffMultiplier;
  return Math.min(Math.max(raw, 0), params.maxProbability);
}

/**
 * Check whether a raid is eligible to trigger.
 *
 * Raids only trigger at night and only in Survival mode (affectsGameplay).
 *
 * @param dayNight - Current DayNightComponent state from ECS.
 * @param affectsGameplay - True when Survival mode is active (from WeatherComponent or game mode).
 */
export function shouldTriggerRaid(
  dayNight: DayNightComponent,
  affectsGameplay: boolean,
): boolean {
  if (!affectsGameplay) return false;
  return dayNight.timeOfDay === "night";
}

/**
 * Generate a raid with 1-3 waves based on base value and day number.
 * Uses scopedRNG for deterministic raids from world seed and day.
 *
 * @param baseValue - Current base value (sum of placed piece tiers × material multipliers).
 * @param dayNumber - Current day number from DayNightComponent.dayNumber (seeds composition).
 * @param worldSeed - World seed string.
 */
export function generateRaidWave(
  baseValue: number,
  dayNumber: number,
  worldSeed: string,
): RaidEvent {
  const rng = scopedRNG("raid", worldSeed, dayNumber);

  const waveTable = raidsConfig.waveComposition;
  const maxWaves = Math.min(
    1 + Math.floor(baseValue / raidsConfig.wavesPerBaseValue),
    raidsConfig.maxWavesPerRaid,
  );
  const numWaves = Math.max(1, Math.min(maxWaves, Math.ceil(rng() * maxWaves)));

  const waves: RaidWave[] = [];
  let totalEnemyCount = 0;

  for (let w = 0; w < numWaves; w++) {
    const waveMultiplier = 1 + w * raidsConfig.waveEscalation;
    const enemies: RaidEnemy[] = [];

    // Select enemy types based on base value thresholds
    for (const entry of waveTable) {
      if (baseValue >= entry.minBaseValue) {
        const count = Math.max(
          1,
          Math.round(entry.baseCount * waveMultiplier + rng() * entry.countVariance),
        );
        enemies.push({
          enemyType: entry.enemyType,
          count,
          tier: entry.tier,
        });
        totalEnemyCount += count;
      }
    }

    waves.push({
      waveNumber: w + 1,
      enemies,
      delayBeforeWave: w === 0 ? 0 : raidsConfig.delayBetweenWaves,
    });
  }

  const estimatedDifficulty = totalEnemyCount * (1 + (numWaves - 1) * 0.3);

  return {
    waves,
    totalEnemyCount,
    estimatedDifficulty,
  };
}

/**
 * Get the approach direction(s) enemies use to enter the chunk.
 *
 * Direction is seeded by raid + world seed + day + chunk position,
 * giving deterministic but varied approach vectors per chunk per day.
 *
 * @param chunkX - Chunk X coordinate.
 * @param chunkZ - Chunk Z coordinate.
 * @param worldSeed - World seed string.
 * @param dayNumber - Current day number from DayNightComponent.dayNumber.
 * @returns 1-2 cardinal directions enemies approach from (chunk edges).
 */
export function getApproachDirections(
  chunkX: number,
  chunkZ: number,
  worldSeed: string,
  dayNumber: number,
): ApproachDirection[] {
  const rng = scopedRNG("raid", worldSeed, dayNumber, chunkX, chunkZ);
  const primary = APPROACH_DIRECTIONS[Math.floor(rng() * APPROACH_DIRECTIONS.length)];

  if (rng() >= raidsConfig.approachParams.secondDirectionChance) {
    return [primary];
  }

  // Pick a different secondary direction
  let secondary: ApproachDirection;
  do {
    secondary = APPROACH_DIRECTIONS[Math.floor(rng() * APPROACH_DIRECTIONS.length)];
  } while (secondary === primary);

  return [primary, secondary];
}

/**
 * Get the warning message for an approaching raid.
 *
 * @param raidStartsIn - Seconds until raid starts.
 * @returns Warning string or null if no warning yet.
 */
export function getRaidWarning(raidStartsIn: number): string | null {
  const warnings = raidsConfig.warnings;

  if (raidStartsIn <= warnings.hornBlastThreshold) {
    return warnings.hornBlastMessage;
  }
  if (raidStartsIn <= warnings.ominousSoundsThreshold) {
    return warnings.ominousSoundsMessage;
  }

  return null;
}

/**
 * Calculate loot multiplier for defeated raid.
 * Faster clears and higher difficulty yield more loot.
 */
export function calculateRaidLoot(
  estimatedDifficulty: number,
  difficulty: string,
): number {
  const baseLoot = raidsConfig.lootParams.baseLootMultiplier;
  const diffBonus =
    (raidsConfig.difficultyLootBonus as Record<string, number>)[difficulty] ?? 0;
  const difficultyScaling = Math.sqrt(estimatedDifficulty) * raidsConfig.lootParams.difficultyWeight;

  return baseLoot + difficultyScaling + diffBonus;
}
