/**
 * meadowChunk — pure, deterministic generator that turns a `(chunkX,
 * chunkZ, worldSeed)` triple into a `VoxelWorldJSON` payload describing
 * a single meadow chunk.
 *
 * Wave 7 only: ONE biome (meadow), ONE chunk. Wave 8 generalises this
 * to forest/coast/grove; Wave 9 wraps it in a streamer. By keeping the
 * generator pure (no DOM, no THREE, no engine imports) it stays
 * testable in node and easy to inline-bench later.
 *
 * Layer plan (16x16xN, configured via `config/world.json`):
 *   - y=0..2 : stone bedrock
 *   - y=3..4 : dirt
 *   - y=5    : grass-flat surface (the player walks on this)
 *   - decorations: scattered grass-tall + wildflower cells, plus a
 *     small 4x4 hill bump in the middle that lifts the surface by
 *     1 voxel.
 *
 * All decoration randomness comes from `scopedRNG('terrain', worldSeed,
 * chunkX, chunkZ)` so identical inputs produce byte-identical chunks
 * (project rule: NO `Math.random` in gameplay code).
 */

import type {
  VoxelEntryKey,
  VoxelLayerJSON,
  VoxelWorldJSON,
} from "@jolly-pixel/voxel.renderer";
import { scopedRNG } from "@/shared/utils/seedRNG";
import worldConfig from "./world.config.json";
import {
  MEADOW_BLOCK_DEFS,
  MEADOW_BLOCK_IDS,
  MEADOW_TILESET_ID,
} from "./blockRegistry";
import { meadowTilesetDefinition } from "./MeadowTilesetLoader";

/** Effective world tuning, exposed so tests can assert on it. */
export const MEADOW_CHUNK_TUNING = {
  size: worldConfig.chunkSize,
  groundY: worldConfig.groundY,
  stoneFloorThickness: worldConfig.stoneFloorThickness,
  dirtThickness: worldConfig.dirtThickness,
} as const;

export interface MeadowChunkInput {
  /** Chunk grid X coord. The single Wave 7 chunk uses 0. */
  chunkX: number;
  /** Chunk grid Z coord. The single Wave 7 chunk uses 0. */
  chunkZ: number;
  /** World seed for deterministic decoration. Default 0 so dev = repeatable. */
  worldSeed?: number;
}

type VoxelEntryRecord = Record<
  VoxelEntryKey,
  { block: number; transform: number }
>;

function setVoxel(out: VoxelEntryRecord, x: number, y: number, z: number, blockId: number): void {
  if (blockId === MEADOW_BLOCK_IDS.air) return;
  const key: VoxelEntryKey = `${x},${y},${z}`;
  out[key] = { block: blockId, transform: 0 };
}

/**
 * Build the meadow `VoxelWorldJSON` for a single chunk. Deterministic
 * for any given `(chunkX, chunkZ, worldSeed)`.
 */
export function buildMeadowChunkJSON(
  input: MeadowChunkInput = { chunkX: 0, chunkZ: 0 },
): VoxelWorldJSON {
  const { chunkX, chunkZ, worldSeed = 0 } = input;
  const { size, groundY, stoneFloorThickness, dirtThickness } =
    MEADOW_CHUNK_TUNING;
  const rng = scopedRNG("terrain", worldSeed, chunkX, chunkZ);

  const surfaceVoxels: VoxelEntryRecord = {};
  const decorationVoxels: VoxelEntryRecord = {};

  // World-space origin of this chunk in voxel units.
  const ox = chunkX * size;
  const oz = chunkZ * size;

  // Centered 4x4 hill bump that raises the surface by one voxel —
  // breaks the dead-flat horizon so we can eyeball the mesh worked.
  const hillCenterX = Math.floor(size / 2);
  const hillCenterZ = Math.floor(size / 2);
  const hillRadius = 2;

  for (let lx = 0; lx < size; lx++) {
    for (let lz = 0; lz < size; lz++) {
      const wx = ox + lx;
      const wz = oz + lz;

      // Stone bedrock floor.
      for (let dy = 0; dy < stoneFloorThickness; dy++) {
        setVoxel(surfaceVoxels, wx, dy, wz, MEADOW_BLOCK_IDS.stone);
      }
      // Dirt mid-layer.
      for (let dy = 0; dy < dirtThickness; dy++) {
        setVoxel(
          surfaceVoxels,
          wx,
          stoneFloorThickness + dy,
          wz,
          MEADOW_BLOCK_IDS.dirt,
        );
      }
      // Grass surface, with optional hill bump.
      const inHill =
        Math.abs(lx - hillCenterX) < hillRadius &&
        Math.abs(lz - hillCenterZ) < hillRadius;
      const surfaceTop = groundY + (inHill ? 1 : 0);
      // Fill any extra dirt under a raised hill cell so the hill isn't
      // floating on air.
      if (inHill) {
        setVoxel(surfaceVoxels, wx, groundY, wz, MEADOW_BLOCK_IDS.dirt);
      }
      setVoxel(
        surfaceVoxels,
        wx,
        surfaceTop,
        wz,
        MEADOW_BLOCK_IDS.grassFlat,
      );

      // Decoration roll on the cell directly above the surface.
      // Wildflowers + tall grass clusters — both stochastic but
      // deterministic for a given seed.
      const roll = rng();
      if (roll < 0.04) {
        setVoxel(
          decorationVoxels,
          wx,
          surfaceTop + 1,
          wz,
          MEADOW_BLOCK_IDS.wildflower,
        );
      } else if (roll < 0.12) {
        // Replace the surface block with grass-tall variant rather than
        // stacking, so the player still has a flat-ish walking
        // surface.
        setVoxel(
          surfaceVoxels,
          wx,
          surfaceTop,
          wz,
          MEADOW_BLOCK_IDS.grassTall,
        );
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
    tilesets: [meadowTilesetDefinition()],
    blocks: MEADOW_BLOCK_DEFS,
    layers,
  };
}

/**
 * Convenience for tests / debug tools — count surface voxels of a
 * particular block id at a given Y. Returns -1 if the layer is
 * missing.
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

export { MEADOW_TILESET_ID };
