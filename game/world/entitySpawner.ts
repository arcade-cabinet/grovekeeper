/**
 * entitySpawner -- Populates chunks with trees, bushes, grass, and rocks
 * based on biome type and density config.
 *
 * Spec §6: Biome-based entity density for chunk population.
 *
 * Pure function -- same worldSeed + chunkX + chunkZ + biome always produces
 * identical placements. All randomness via scopedRNG.
 */

import gridConfig from "@/config/game/grid.json" with { type: "json" };
import vegetationConfig from "@/config/game/vegetation.json" with { type: "json" };
import type { CropComponent } from "@/game/ecs/components/structures";
import type { RockComponent } from "@/game/ecs/components/terrain";
import type {
  BushComponent,
  GrassComponent,
  TreeComponent,
  VegetationSeason,
} from "@/game/ecs/components/vegetation";
import { getCropById, getCrops } from "@/game/systems/cropGrowth";
import { resolveTreeModelPath } from "@/game/systems/vegetationPlacement";
import { scopedRNG } from "@/game/utils/seedWords";
import type { BiomeType } from "./biomeMapper.ts";

const CHUNK_SIZE: number = gridConfig.chunkSize;

// ── Types ────────────────────────────────────────────────────────────────────

/** Keys into vegetation.json biomeDensity — the internal density taxonomy. */
export type VegetationDensityKey =
  | "temperate"
  | "wetland"
  | "mountain"
  | "tundra"
  | "savanna"
  | "coastal"
  | "enchanted"
  | "highland";

/** A tree entity ready to be added to ECS. */
export interface TreePlacement {
  position: { x: number; y: number; z: number };
  tree: TreeComponent;
  rotationY: number;
}

/** A bush entity ready to be added to ECS. */
export interface BushPlacement {
  position: { x: number; y: number; z: number };
  bush: BushComponent;
  rotationY: number;
}

/** A grass patch entity ready to be added to ECS. */
export interface GrassPlacement {
  position: { x: number; y: number; z: number };
  grass: GrassComponent;
}

/** A rock entity ready to be added to ECS. */
export interface RockPlacement {
  position: { x: number; y: number; z: number };
  rock: RockComponent;
  rotationY: number;
}

/** A crop entity ready to be added to ECS. Spec §8.4.4. */
export interface CropPlacement {
  position: { x: number; y: number; z: number };
  crop: CropComponent;
}

/** All entity placements produced for one chunk. */
export interface EntitySpawnerResult {
  trees: TreePlacement[];
  bushes: BushPlacement[];
  grass: GrassPlacement[];
  rocks: RockPlacement[];
  crops: CropPlacement[];
}

// ── Config accessors ─────────────────────────────────────────────────────────

interface BiomeDensityConfig {
  treesPerChunk: number;
  bushesPerChunk: number;
  grassPatchesPerChunk: number;
  rocksPerChunk: number;
  cropsPerChunk: number;
}

const biomeDensity = vegetationConfig.biomeDensity as Record<string, BiomeDensityConfig>;
const biomeCropPool = vegetationConfig.biomeCropPool as Record<string, string[]>;
const bushShapes: string[] = vegetationConfig.bushShapes;

interface SpeciesModelEntry {
  baseModel: string;
  winterModel: string;
  pack: string;
}
const speciesModelMapping = vegetationConfig.speciesModelMapping as Record<
  string,
  SpeciesModelEntry
>;

interface GrassTypeEntry {
  grassType: string;
  probability: number;
  baseDensity: number;
}
const biomeGrass = vegetationConfig.biomeGrass as Record<string, { types: GrassTypeEntry[] }>;

// ── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Map BiomeType to the vegetation density config key in vegetation.json.
 * Exported for testing.
 */
export function biomeToVegetationKey(biome: BiomeType): VegetationDensityKey {
  switch (biome) {
    case "starting-grove":
      return "temperate";
    case "meadow":
      return "savanna";
    case "ancient-forest":
      return "enchanted";
    case "wetlands":
      return "wetland";
    case "rocky-highlands":
      return "highland";
    case "orchard-valley":
      return "temperate";
    case "frozen-peaks":
      return "tundra";
    case "twilight-glade":
      return "enchanted";
  }
}

/**
 * Biome-appropriate wild tree species pools.
 * Only base species — no prestige trees in wild spawning.
 */
const BIOME_SPECIES_POOL: Record<BiomeType, string[]> = {
  "starting-grove": ["white-oak", "cherry-blossom", "silver-birch"],
  meadow: ["white-oak", "baobab", "silver-birch"],
  "ancient-forest": ["mystic-fern", "white-oak", "silver-birch"],
  wetlands: ["weeping-willow", "redwood"],
  "rocky-highlands": ["elder-pine", "flame-maple", "ironbark"],
  "orchard-valley": ["golden-apple", "white-oak", "cherry-blossom"],
  "frozen-peaks": ["elder-pine", "ghost-birch"],
  "twilight-glade": ["mystic-fern", "crystal-oak", "moonwood-ash"],
};

/**
 * Return the wild species pool for a given biome.
 * Exported for testing.
 */
export function getBiomeSpeciesPool(biome: BiomeType): string[] {
  return BIOME_SPECIES_POOL[biome];
}

/** Look up vegetation model paths for a species ID. Falls back to "tree01". */
function resolveSpeciesModels(speciesId: string): {
  baseModel: string;
  winterModel: string;
  useWinterModel: boolean;
} {
  const entry = speciesModelMapping[speciesId];
  if (!entry) {
    return {
      baseModel: resolveTreeModelPath("tree01", "retro", false),
      winterModel: "",
      useWinterModel: false,
    };
  }
  const pack = (entry.pack ?? "retro") as "retro" | "extra";
  return {
    baseModel: resolveTreeModelPath(entry.baseModel, pack, false),
    winterModel: entry.winterModel ? resolveTreeModelPath(entry.winterModel, pack, true) : "",
    useWinterModel: entry.winterModel !== "",
  };
}

// ── Per-type spawners ─────────────────────────────────────────────────────────

function spawnTrees(
  worldSeed: string,
  chunkX: number,
  chunkZ: number,
  count: number,
  pool: string[],
  heightmap: Float32Array,
): TreePlacement[] {
  const rng = scopedRNG("entity-trees", worldSeed, chunkX, chunkZ);
  const result: TreePlacement[] = [];

  for (let i = 0; i < count; i++) {
    const localX = rng() * CHUNK_SIZE;
    const localZ = rng() * CHUNK_SIZE;
    const xi = Math.floor(Math.min(localX, CHUNK_SIZE - 1));
    const zi = Math.floor(Math.min(localZ, CHUNK_SIZE - 1));
    const y = heightmap[zi * CHUNK_SIZE + xi];

    const speciesId = pool[Math.floor(rng() * pool.length)];
    const models = resolveSpeciesModels(speciesId);
    const meshSeed = Math.floor(rng() * 0xffffffff);
    const rotationY = rng() * Math.PI * 2;

    result.push({
      position: { x: chunkX * CHUNK_SIZE + localX, y, z: chunkZ * CHUNK_SIZE + localZ },
      rotationY,
      tree: {
        speciesId,
        stage: 2,
        progress: 0,
        watered: false,
        totalGrowthTime: 1800,
        plantedAt: 0,
        meshSeed,
        wild: true,
        pruned: false,
        fertilized: false,
        baseModel: models.baseModel,
        winterModel: models.winterModel,
        useWinterModel: models.useWinterModel,
        seasonTint: "#388E3C",
      },
    });
  }

  return result;
}

function spawnBushes(
  worldSeed: string,
  chunkX: number,
  chunkZ: number,
  count: number,
  heightmap: Float32Array,
  season: VegetationSeason,
): BushPlacement[] {
  const rng = scopedRNG("entity-bushes", worldSeed, chunkX, chunkZ);
  const result: BushPlacement[] = [];

  for (let i = 0; i < count; i++) {
    const localX = rng() * CHUNK_SIZE;
    const localZ = rng() * CHUNK_SIZE;
    const xi = Math.floor(Math.min(localX, CHUNK_SIZE - 1));
    const zi = Math.floor(Math.min(localZ, CHUNK_SIZE - 1));
    const y = heightmap[zi * CHUNK_SIZE + xi];

    const bushShape = bushShapes[Math.floor(rng() * bushShapes.length)];
    const hasRoots = rng() < vegetationConfig.bushRootsProbability;
    const rotationY = rng() * Math.PI * 2;

    result.push({
      position: { x: chunkX * CHUNK_SIZE + localX, y, z: chunkZ * CHUNK_SIZE + localZ },
      rotationY,
      bush: {
        bushShape,
        season,
        hasRoots,
        modelKey: bushShape,
      },
    });
  }

  return result;
}

function spawnGrass(
  worldSeed: string,
  chunkX: number,
  chunkZ: number,
  densityKey: VegetationDensityKey,
  count: number,
  heightmap: Float32Array,
): GrassPlacement[] {
  const grassConfig = biomeGrass[densityKey];
  if (!grassConfig?.types.length) return [];

  const rng = scopedRNG("entity-grass", worldSeed, chunkX, chunkZ);
  const result: GrassPlacement[] = [];

  for (let i = 0; i < count; i++) {
    const localX = rng() * CHUNK_SIZE;
    const localZ = rng() * CHUNK_SIZE;
    const xi = Math.floor(Math.min(localX, CHUNK_SIZE - 1));
    const zi = Math.floor(Math.min(localZ, CHUNK_SIZE - 1));
    const y = heightmap[zi * CHUNK_SIZE + xi];

    // Select grass type by probability — first type whose probability > roll wins.
    const roll = rng();
    let grassType = grassConfig.types[0].grassType;
    let density = grassConfig.types[0].baseDensity;
    for (const t of grassConfig.types) {
      if (roll < t.probability) {
        grassType = t.grassType;
        density = t.baseDensity;
        break;
      }
    }

    result.push({
      position: { x: chunkX * CHUNK_SIZE + localX, y, z: chunkZ * CHUNK_SIZE + localZ },
      grass: { grassType, density },
    });
  }

  return result;
}

function spawnRocks(
  worldSeed: string,
  chunkX: number,
  chunkZ: number,
  count: number,
  heightmap: Float32Array,
): RockPlacement[] {
  const rng = scopedRNG("entity-rocks", worldSeed, chunkX, chunkZ);
  const result: RockPlacement[] = [];

  for (let i = 0; i < count; i++) {
    const localX = rng() * CHUNK_SIZE;
    const localZ = rng() * CHUNK_SIZE;
    const xi = Math.floor(Math.min(localX, CHUNK_SIZE - 1));
    const zi = Math.floor(Math.min(localZ, CHUNK_SIZE - 1));
    const y = heightmap[zi * CHUNK_SIZE + xi];

    const variant = Math.floor(rng() * 5);
    const rotationY = rng() * Math.PI * 2;

    result.push({
      position: { x: chunkX * CHUNK_SIZE + localX, y, z: chunkZ * CHUNK_SIZE + localZ },
      rotationY,
      rock: {
        rockType: "rock",
        variant,
        modelPath: `assets/models/rocks/rock_0${variant + 1}.glb`,
      },
    });
  }

  return result;
}

function spawnCrops(
  worldSeed: string,
  chunkX: number,
  chunkZ: number,
  densityKey: VegetationDensityKey,
  count: number,
  heightmap: Float32Array,
): CropPlacement[] {
  if (count <= 0) return [];

  const pool = biomeCropPool[densityKey] ?? [];
  if (pool.length === 0) return [];

  const rng = scopedRNG("entity-crops", worldSeed, chunkX, chunkZ);
  const result: CropPlacement[] = [];
  const allCrops = getCrops();

  for (let i = 0; i < count; i++) {
    const localX = rng() * CHUNK_SIZE;
    const localZ = rng() * CHUNK_SIZE;
    const xi = Math.floor(Math.min(localX, CHUNK_SIZE - 1));
    const zi = Math.floor(Math.min(localZ, CHUNK_SIZE - 1));
    const y = heightmap[zi * CHUNK_SIZE + xi];

    const cropId = pool[Math.floor(rng() * pool.length)];
    const def = getCropById(cropId) ?? allCrops[0];

    result.push({
      position: { x: chunkX * CHUNK_SIZE + localX, y, z: chunkZ * CHUNK_SIZE + localZ },
      crop: {
        cropId: def.id as CropComponent["cropId"],
        // Wild crops spawn at stage 2 (Growing) — nearly ready, rewards exploration.
        stage: 2,
        progress: 0,
        watered: false,
        modelPath: def.modelPath,
      },
    });
  }

  return result;
}

/**
 * Return the biome crop species pool for the given density key.
 * Used by tests and ChunkManager to validate crop placements.
 * Spec §8.4.4.
 */
export function getBiomeCropPool(densityKey: VegetationDensityKey): string[] {
  return biomeCropPool[densityKey] ?? [];
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Spawn all biome-appropriate entities for a chunk.
 *
 * Algorithm:
 *   1. Map biome → vegetation density config key.
 *   2. Look up entity counts (trees, bushes, grass, rocks) from config.
 *   3. Spawn each entity type at seeded random positions within chunk bounds.
 *   4. Tree species are drawn from biome-appropriate pools.
 *   5. All positions are sampled at heightmap elevation.
 *
 * Spec §6: Biome-based entity density.
 *
 * @param worldSeed  World seed string.
 * @param chunkX     Chunk X grid coordinate.
 * @param chunkZ     Chunk Z grid coordinate.
 * @param biome      Biome type for this chunk.
 * @param heightmap  CHUNK_SIZE × CHUNK_SIZE Float32Array (row-major: z*size+x).
 * @returns          Arrays of typed entity placements.
 */
export function spawnChunkEntities(
  worldSeed: string,
  chunkX: number,
  chunkZ: number,
  biome: BiomeType,
  heightmap: Float32Array,
  season: VegetationSeason = "spring",
): EntitySpawnerResult {
  const densityKey = biomeToVegetationKey(biome);
  const density = biomeDensity[densityKey];
  const speciesPool = getBiomeSpeciesPool(biome);

  return {
    trees: spawnTrees(worldSeed, chunkX, chunkZ, density.treesPerChunk, speciesPool, heightmap),
    bushes: spawnBushes(worldSeed, chunkX, chunkZ, density.bushesPerChunk, heightmap, season),
    grass: spawnGrass(
      worldSeed,
      chunkX,
      chunkZ,
      densityKey,
      density.grassPatchesPerChunk,
      heightmap,
    ),
    rocks: spawnRocks(worldSeed, chunkX, chunkZ, density.rocksPerChunk, heightmap),
    crops: spawnCrops(worldSeed, chunkX, chunkZ, densityKey, density.cropsPerChunk ?? 0, heightmap),
  };
}
