/**
 * terrainGenerator -- Procedural heightmap generation per chunk.
 *
 * Pure function: same worldSeed + chunkCoords always produces identical output.
 * Uses global world-space coordinates so terrain is seamless across boundaries.
 *
 * Spec §31.1: "Heightmap: AdvancedSeededNoise"
 * Spec §17.3a: Chunk (0,0) terrain is flattened around village center (Rootmere).
 */

import gridConfig from "@/config/game/grid.json" with { type: "json" };
import { SeededNoise } from "@/game/utils/seededNoise";
import { hashString } from "@/game/utils/seedRNG";

const CHUNK_SIZE: number = gridConfig.chunkSize;

// ── Rootmere village flattening constants (Spec §17.3a) ──────────────────────

/** Local tile X coordinate of Rootmere village center within chunk (0,0). */
export const VILLAGE_CENTER_X = 8;
/** Local tile Z coordinate of Rootmere village center within chunk (0,0). */
export const VILLAGE_CENTER_Z = 8;
/** Height value used for the flat village area. */
export const VILLAGE_FLAT_HEIGHT = 0.3;
/** Tile radius around the village center that is fully flat. */
export const VILLAGE_FLAT_RADIUS = 14;
/** Number of tiles over which flat terrain blends back to natural terrain. */
export const VILLAGE_BLEND_TILES = 4;

// ── Helpers ──────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generate a CHUNK_SIZE x CHUNK_SIZE terrain heightmap for a chunk.
 *
 * For chunk (0,0) only: applies a post-processing flatten pass around the
 * Rootmere village center (tile 8,8) so structure placement is always stable
 * regardless of world seed (Spec §17.3a).
 *
 * @param worldSeed  World seed string (hashed to a numeric seed)
 * @param chunkX     Chunk X grid coordinate
 * @param chunkZ     Chunk Z grid coordinate
 * @returns          Float32Array of length CHUNK_SIZE * CHUNK_SIZE, values in [-1, 1]
 */
export function generateHeightmap(worldSeed: string, chunkX: number, chunkZ: number): Float32Array {
  const noise = new SeededNoise(hashString(worldSeed));
  const heightmap = new Float32Array(CHUNK_SIZE * CHUNK_SIZE);

  for (let z = 0; z < CHUNK_SIZE; z++) {
    for (let x = 0; x < CHUNK_SIZE; x++) {
      const gx = (chunkX * CHUNK_SIZE + x) * 0.05;
      const gz = (chunkZ * CHUNK_SIZE + z) * 0.05;
      heightmap[z * CHUNK_SIZE + x] = noise.fbm(gx, gz, 4, 2.0, 0.5);
    }
  }

  // ── Rootmere village flatten pass (Spec §17.3a) ──────────────────────────
  if (chunkX === 0 && chunkZ === 0) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const dx = x - VILLAGE_CENTER_X;
        const dz = z - VILLAGE_CENTER_Z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < VILLAGE_FLAT_RADIUS) {
          heightmap[z * CHUNK_SIZE + x] = VILLAGE_FLAT_HEIGHT;
        } else if (dist < VILLAGE_FLAT_RADIUS + VILLAGE_BLEND_TILES) {
          const t = (dist - VILLAGE_FLAT_RADIUS) / VILLAGE_BLEND_TILES;
          const natural = heightmap[z * CHUNK_SIZE + x];
          heightmap[z * CHUNK_SIZE + x] = lerp(VILLAGE_FLAT_HEIGHT, natural, t);
        }
      }
    }
  }

  return heightmap;
}
