/**
 * Wild Tree Regrowth -- respawn timers for wild (non-player) trees
 * and chunk-based ecology spawning by biome + season.
 *
 * Spec §8: Wild trees respawn in visited chunks based on biome species tables
 * and seasonal spawn rates.
 */

import gridConfig from "@/config/game/grid.json" with { type: "json" };
import growthConfig from "@/config/game/growth.json" with { type: "json" };
import type { TreeComponent } from "@/game/ecs/components/vegetation";
import { scopedRNG } from "@/game/utils/seedWords";
import { speciesToTreeModel } from "@/game/systems/vegetationPlacement";
import { getBiomeSpeciesPool } from "@/game/world/entitySpawner";
import type { BiomeType } from "@/game/world/biomeMapper";

// Constants from config
const CHUNK_SIZE: number = gridConfig.chunkSize;
const WILD_CONFIG = growthConfig.wildTreeRegrowth;
const DEFAULT_REGROWTH_DAYS = 7;

// Timer types
export interface RegrowthTimer {
  gridX: number;
  gridZ: number;
  speciesId: string;
  expiresAtDay: number;
}

export interface RegrowthState {
  timers: RegrowthTimer[];
}

// Chunk ecology types
export interface ChunkEcologyInput {
  chunkX: number;
  chunkZ: number;
  biome: BiomeType;
  currentTreeCount: number;
  heightmap: Float32Array;
}

export interface WildTreeSpawn {
  chunkX: number;
  chunkZ: number;
  position: { x: number; y: number; z: number };
  tree: TreeComponent;
  rotationY: number;
}

// Timer API
export function initializeRegrowthState(): RegrowthState {
  return { timers: [] };
}

export function scheduleRegrowth(
  state: RegrowthState,
  gridX: number,
  gridZ: number,
  speciesId: string,
  currentDay: number,
  delayDays: number = DEFAULT_REGROWTH_DAYS,
): RegrowthState {
  return {
    timers: [...state.timers, { gridX, gridZ, speciesId, expiresAtDay: currentDay + delayDays }],
  };
}

export function checkRegrowth(
  state: RegrowthState,
  currentDay: number,
): { expired: RegrowthTimer[]; state: RegrowthState } {
  const expired: RegrowthTimer[] = [];
  const remaining: RegrowthTimer[] = [];
  for (const timer of state.timers) {
    if (currentDay >= timer.expiresAtDay) {
      expired.push(timer);
    } else {
      remaining.push(timer);
    }
  }
  if (expired.length === 0) return { expired, state };
  return { expired, state: { timers: remaining } };
}

export function cancelRegrowth(state: RegrowthState, gridX: number, gridZ: number): RegrowthState {
  const filtered = state.timers.filter((t) => t.gridX !== gridX || t.gridZ !== gridZ);
  if (filtered.length === state.timers.length) return state;
  return { timers: filtered };
}

// Chunk ecology API
export function getSeasonSpawnMultiplier(season: string): number {
  const mults = WILD_CONFIG.seasonSpawnMultipliers as Record<string, number>;
  return mults[season] ?? 0;
}

export function shouldSpawnWildTree(
  chunkX: number,
  chunkZ: number,
  currentDay: number,
  currentTreeCount: number,
  season: string,
  worldSeed: string,
): boolean {
  if (currentTreeCount >= WILD_CONFIG.maxTreesPerChunk) return false;
  const seasonMult = getSeasonSpawnMultiplier(season);
  if (seasonMult === 0) return false;
  const rng = scopedRNG("wild-regrowth", worldSeed, chunkX, chunkZ, currentDay);
  const chance = WILD_CONFIG.baseSpawnChancePerDay * seasonMult;
  return rng() < chance;
}

export function buildWildTreeSpawn(
  chunkX: number,
  chunkZ: number,
  biome: BiomeType,
  currentDay: number,
  worldSeed: string,
  heightmap: Float32Array,
): WildTreeSpawn {
  const rng = scopedRNG("wild-spawn", worldSeed, chunkX, chunkZ, currentDay);
  const pool = getBiomeSpeciesPool(biome);
  const speciesId = pool[Math.floor(rng() * pool.length)];
  const localX = rng() * CHUNK_SIZE;
  const localZ = rng() * CHUNK_SIZE;
  const xi = Math.floor(Math.min(localX, CHUNK_SIZE - 1));
  const zi = Math.floor(Math.min(localZ, CHUNK_SIZE - 1));
  const y = heightmap[zi * CHUNK_SIZE + xi];
  const rotationY = rng() * Math.PI * 2;
  const meshSeed = Math.floor(rng() * 0xffffffff);
  const models = speciesToTreeModel(speciesId);
  return {
    chunkX,
    chunkZ,
    position: { x: chunkX * CHUNK_SIZE + localX, y, z: chunkZ * CHUNK_SIZE + localZ },
    rotationY,
    tree: {
      speciesId,
      stage: 0,
      progress: 0,
      watered: false,
      totalGrowthTime: WILD_CONFIG.defaultGrowthTime,
      plantedAt: currentDay,
      meshSeed,
      wild: true,
      pruned: false,
      fertilized: false,
      baseModel: models.baseModel,
      winterModel: models.winterModel,
      useWinterModel: models.winterModel !== "",
      seasonTint: "#388E3C",
    },
  };
}

export function tickWildEcology(
  chunks: ChunkEcologyInput[],
  currentDay: number,
  season: string,
  worldSeed: string,
): WildTreeSpawn[] {
  const spawns: WildTreeSpawn[] = [];
  for (const chunk of chunks) {
    if (
      shouldSpawnWildTree(
        chunk.chunkX,
        chunk.chunkZ,
        currentDay,
        chunk.currentTreeCount,
        season,
        worldSeed,
      )
    ) {
      spawns.push(
        buildWildTreeSpawn(
          chunk.chunkX,
          chunk.chunkZ,
          chunk.biome,
          currentDay,
          worldSeed,
          chunk.heightmap,
        ),
      );
    }
  }
  return spawns;
}
