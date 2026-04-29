/**
 * chunkGenerator — pure, deterministic generator that turns a
 * `(biome, chunkX, chunkZ, worldSeed)` tuple into a `VoxelWorldJSON`
 * payload describing one chunk.
 *
 * Uses the same column shape (stone bedrock, sub-surface dirt, surface
 * grass, optional decoration above), parameterized by `BiomeDefinition`.
 * The biome supplies the block ids for each column layer plus an optional
 * decoration list.
 *
 * Layer plan (per-biome, all configured via `world.config.json`):
 *   - y=0..stoneFloorThickness-1   : bedrock
 *   - y=stoneFloorThickness..groundY-1 : sub-surface (dirt)
 *   - y=groundY                    : surface (grass / sand / luminous)
 *   - decorations: scattered cells one voxel above the surface, drawn
 *     from the biome's decoration weights.
 *
 * All randomness flows through `scopedRNG('terrain', worldSeed,
 * chunkX, chunkZ)` so identical inputs produce byte-identical chunks
 * (project rule: NO `Math.random` in gameplay code).
 */

import type {
  VoxelEntryKey,
  VoxelLayerJSON,
  VoxelWorldJSON,
} from "@jolly-pixel/voxel.renderer";
import { scopedRNG } from "@/shared/utils/seedRNG";
import { biomeTilesetDefinition } from "./BiomeTilesetLoader";
import type { BiomeDefinition, BiomeId } from "./biomes";
import { getBiome } from "./biomes";
import worldConfig from "./world.config.json";

/** Effective world tuning, exposed so tests can assert on it. */
export const CHUNK_TUNING = {
  size: worldConfig.chunkSize,
  groundY: worldConfig.groundY,
  stoneFloorThickness: worldConfig.stoneFloorThickness,
  dirtThickness: worldConfig.dirtThickness,
} as const;

export interface ChunkGeneratorInput {
  /** Biome id or definition. Defaults to meadow. */
  biome?: BiomeId | BiomeDefinition;
  /** Chunk grid X coord. Defaults to 0. */
  chunkX?: number;
  /** Chunk grid Z coord. Defaults to 0. */
  chunkZ?: number;
  /** World seed for deterministic decoration. Default 0 = repeatable dev runs. */
  worldSeed?: number;
}

type VoxelEntryRecord = Record<
  VoxelEntryKey,
  { block: number; transform: number }
>;

const AIR_ID = 0;

function setVoxel(
  out: VoxelEntryRecord,
  x: number,
  y: number,
  z: number,
  blockId: number,
): void {
  if (blockId === AIR_ID) return;
  const key: VoxelEntryKey = `${x},${y},${z}`;
  out[key] = { block: blockId, transform: 0 };
}

/**
 * Pick a decoration block from a biome's weighted list given a
 * uniform random `roll` in [0, 1). Returns `null` if the roll lands in
 * the "no decoration" gap above the cumulative weight ceiling.
 *
 * The total weight is treated as the denominator out of 100 — so a
 * weight of 4 means 4% chance, weight of 6 means 6%, etc.
 */
function pickDecoration(
  decorations: readonly { id: number; weight: number }[],
  roll: number,
): number | null {
  let cumulative = 0;
  for (const deco of decorations) {
    cumulative += deco.weight;
    if (roll * 100 < cumulative) return deco.id;
  }
  return null;
}

/**
 * Build a `VoxelWorldJSON` for a single chunk of the given biome.
 * Deterministic for any given `(biome, chunkX, chunkZ, worldSeed)`.
 */
export function buildChunkJSON(
  input: ChunkGeneratorInput = {},
): VoxelWorldJSON {
  const biome =
    typeof input.biome === "string"
      ? getBiome(input.biome)
      : (input.biome ?? getBiome("meadow"));
  const chunkX = input.chunkX ?? 0;
  const chunkZ = input.chunkZ ?? 0;
  const worldSeed = input.worldSeed ?? 0;

  const { size, stoneFloorThickness, dirtThickness } = CHUNK_TUNING;
  const groundY = biome.groundY;
  const rng = scopedRNG("terrain", worldSeed, chunkX, chunkZ);

  const surfaceVoxels: VoxelEntryRecord = {};
  const decorationVoxels: VoxelEntryRecord = {};

  // World-space origin of this chunk in voxel units.
  const ox = chunkX * size;
  const oz = chunkZ * size;

  // Centred 4x4 hill bump that raises the surface by one voxel — breaks
  // the dead-flat horizon so we can eyeball the mesh worked. The
  // surface block is biome-specific; the sub-surface ("dirt") fills the
  // raised cell so the hill isn't floating on air.
  const hillCenterX = Math.floor(size / 2);
  const hillCenterZ = Math.floor(size / 2);
  const hillRadius = 2;

  // Decoration roll partitions the surface. Cumulative weight defines
  // how many decoration cells we expect; the remainder is the surface
  // block ratio. A primary "alt surface" decoration (eg meadow's
  // grass-tall) replaces the surface in place rather than stacking.
  // Every decoration entry stacks one voxel above the surface.
  const decorations = biome.decorations;

  for (let lx = 0; lx < size; lx++) {
    for (let lz = 0; lz < size; lz++) {
      const wx = ox + lx;
      const wz = oz + lz;

      // Bedrock layer.
      for (let dy = 0; dy < stoneFloorThickness; dy++) {
        setVoxel(surfaceVoxels, wx, dy, wz, biome.bedrockBlock);
      }
      // Sub-surface (dirt-equivalent) layer.
      for (let dy = 0; dy < dirtThickness; dy++) {
        setVoxel(
          surfaceVoxels,
          wx,
          stoneFloorThickness + dy,
          wz,
          biome.subSurfaceBlock,
        );
      }
      // Surface, with optional hill bump.
      const inHill =
        Math.abs(lx - hillCenterX) < hillRadius &&
        Math.abs(lz - hillCenterZ) < hillRadius;
      const surfaceTop = groundY + (inHill ? 1 : 0);
      if (inHill) {
        // Fill the un-raised groundY cell so the hill has continuous
        // material under it.
        setVoxel(surfaceVoxels, wx, groundY, wz, biome.subSurfaceBlock);
      }
      setVoxel(surfaceVoxels, wx, surfaceTop, wz, biome.surfaceBlock);

      // Decoration roll on the cell directly above the surface.
      if (decorations.length > 0) {
        const decoId = pickDecoration(decorations, rng());
        if (decoId !== null) {
          setVoxel(decorationVoxels, wx, surfaceTop + 1, wz, decoId);
        }
      } else {
        // Still consume an RNG draw so swapping decoration lists doesn't
        // shift the rest of the chunk's randomness — but no biome ships
        // an empty list right now, so this is dead code that exists
        // only to document the contract.
        rng();
      }
    }
  }

  const layers: VoxelLayerJSON[] = [
    {
      id: "surface",
      name: "surface",
      visible: true,
      order: 0,
      voxels: surfaceVoxels,
    },
    {
      id: "decorations",
      name: "decorations",
      visible: true,
      order: 1,
      voxels: decorationVoxels,
    },
  ];

  return {
    version: 1,
    chunkSize: size,
    tilesets: [biomeTilesetDefinition(biome)],
    blocks: biome.blocks,
    layers,
  };
}

/**
 * Convenience for tests / debug tools — count surface voxels of a
 * particular block id at a given Y. Returns -1 if the layer is missing.
 */
export function countSurfaceBlocksAtY(
  chunk: VoxelWorldJSON,
  blockId: number,
  y: number,
): number {
  const surface = chunk.layers.find((l) => l.id === "surface");
  if (!surface) return -1;
  let count = 0;
  for (const [key, entry] of Object.entries(surface.voxels)) {
    if (entry.block !== blockId) continue;
    const [, sy] = key.split(",");
    if (Number.parseInt(sy, 10) === y) count++;
  }
  return count;
}

/** Count decoration-layer voxels of a particular block id (any Y). */
export function countDecorationBlocks(
  chunk: VoxelWorldJSON,
  blockId: number,
): number {
  const deco = chunk.layers.find((l) => l.id === "decorations");
  if (!deco) return -1;
  let count = 0;
  for (const entry of Object.values(deco.voxels)) {
    if (entry.block === blockId) count++;
  }
  return count;
}
