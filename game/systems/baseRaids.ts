/**
 * Base raid system -- survival mode mechanic.
 *
 * Higher base value attracts more frequent and stronger raids.
 * Raids come in 1-3 waves with increasing difficulty.
 * Warning system: ominous sounds at 2 min, horn blast at 30 sec.
 */

import { scopedRNG } from "../utils/seedWords";
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
 * Generate a raid with 1-3 waves based on base value and wave number.
 * Uses scopedRNG for deterministic raids from world seed.
 */
export function generateRaidWave(
  baseValue: number,
  waveNumber: number,
  worldSeed: string,
): RaidEvent {
  const rng = scopedRNG("raids", worldSeed, waveNumber);

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
