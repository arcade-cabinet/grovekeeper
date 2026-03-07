import enemiesConfig from "@/config/game/enemies.json" with { type: "json" };
import { scopedRNG } from "@/game/utils/seedWords";
import { isExplorationMode } from "@/game/config/difficulty";

export interface EnemySpawnEntry {
  enemyType: string;
  tier: number;
  behavior: "patrol" | "guard" | "swarm" | "ambush";
  x: number;
  z: number;
}

const { types, spawnRules, tierScaling, difficultyMultipliers, nightSpawnMultiplier } =
  enemiesConfig;

export function getEnemyTypesForBiome(
  biome: string,
  difficulty: string,
): string[] {
  const diffMult =
    difficultyMultipliers[difficulty as keyof typeof difficultyMultipliers] ?? 1;
  if (diffMult === 0) return [];

  return Object.entries(types)
    .filter(([, def]) => def.biomes.includes(biome))
    .map(([id]) => id);
}

export function calculateTier(
  chunkDistance: number,
  difficultyId: string,
): number {
  const baseTier = Math.floor(chunkDistance / tierScaling.distancePerTier) + 1;
  const diffMult =
    difficultyMultipliers[difficultyId as keyof typeof difficultyMultipliers] ??
    1;
  const scaled = Math.round(baseTier * diffMult);
  return Math.max(1, Math.min(scaled, tierScaling.maxTier));
}

export function encounterChance(
  chunkDistance: number,
  isNight: boolean,
  biome: string,
  difficultyId: string,
): number {
  const diffMult =
    difficultyMultipliers[difficultyId as keyof typeof difficultyMultipliers] ??
    1;
  if (diffMult === 0) return 0;

  const rules = biome === "labyrinth"
    ? spawnRules.labyrinthChunk
    : biome === "ruins"
      ? spawnRules.ruinsChunk
      : spawnRules.normalChunk;

  let chance = rules.spawnChanceBase * diffMult;
  if (isNight) chance *= nightSpawnMultiplier;

  return Math.min(1, chance);
}

export function spawnEnemiesForChunk(
  chunkX: number,
  chunkZ: number,
  biome: string,
  difficultyId: string,
  worldSeed: string,
  isNight: boolean,
): EnemySpawnEntry[] {
  // Enemies only spawn in Survival mode (affectsGameplay: true)
  if (isExplorationMode(difficultyId)) return [];

  const diffMult =
    difficultyMultipliers[difficultyId as keyof typeof difficultyMultipliers] ??
    1;
  if (diffMult === 0) return [];

  const rng = scopedRNG("enemy", worldSeed, chunkX, chunkZ);
  const chunkDistance = Math.sqrt(chunkX * chunkX + chunkZ * chunkZ);

  const chance = encounterChance(chunkDistance, isNight, biome, difficultyId);
  if (rng() > chance) return [];

  const rules = biome === "labyrinth"
    ? spawnRules.labyrinthChunk
    : biome === "ruins"
      ? spawnRules.ruinsChunk
      : spawnRules.normalChunk;

  const available = getEnemyTypesForBiome(biome, difficultyId);
  if (available.length === 0) return [];

  const count =
    rules.minEnemies +
    Math.floor(rng() * (rules.maxEnemies - rules.minEnemies + 1));

  const tier = calculateTier(chunkDistance, difficultyId);
  const results: EnemySpawnEntry[] = [];

  for (let i = 0; i < count; i++) {
    const typeIndex = Math.floor(rng() * available.length);
    const enemyType = available[typeIndex];
    const def = types[enemyType as keyof typeof types];

    if (def.nightOnly && !isNight) continue;

    results.push({
      enemyType,
      tier,
      behavior: def.behavior as EnemySpawnEntry["behavior"],
      x: chunkX * 16 + Math.floor(rng() * 16),
      z: chunkZ * 16 + Math.floor(rng() * 16),
    });
  }

  return results;
}
