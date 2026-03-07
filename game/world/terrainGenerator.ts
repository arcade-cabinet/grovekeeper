/**
 * terrainGenerator -- Procedural heightmap generation per chunk.
 *
 * Pure function: same worldSeed + chunkCoords always produces identical output.
 * Uses global world-space coordinates so terrain is seamless across boundaries.
 *
 * Spec §31.1: "Heightmap: AdvancedSeededNoise (Perlin + fBm + ridged multifractal + domain warping)"
 */

import { SeededNoise } from "@/game/utils/seededNoise";
import { hashString } from "@/game/utils/seedRNG";
import gridConfig from "@/config/game/grid.json" with { type: "json" };

const CHUNK_SIZE: number = gridConfig.chunkSize;

/**
 * Generate a CHUNK_SIZE × CHUNK_SIZE terrain heightmap for a chunk.
 *
 * Uses a single SeededNoise instance keyed to `worldSeed` and sampled at
 * global coordinates (chunkX * CHUNK_SIZE + localX) so terrain is continuous
 * across chunk boundaries.
 *
 * @param worldSeed  World seed string (hashed to a numeric seed)
 * @param chunkX     Chunk X grid coordinate
 * @param chunkZ     Chunk Z grid coordinate
 * @returns          Float32Array of length CHUNK_SIZE * CHUNK_SIZE, values in [-1, 1]
 */
export function generateHeightmap(
  worldSeed: string,
  chunkX: number,
  chunkZ: number,
): Float32Array {
  // Single instance from worldSeed — seamless global terrain (Spec §31.1, codebase pattern)
  const noise = new SeededNoise(hashString(worldSeed));
  const heightmap = new Float32Array(CHUNK_SIZE * CHUNK_SIZE);

  for (let z = 0; z < CHUNK_SIZE; z++) {
    for (let x = 0; x < CHUNK_SIZE; x++) {
      // Sample at global world-space coords scaled for natural terrain frequency
      const gx = (chunkX * CHUNK_SIZE + x) * 0.05;
      const gz = (chunkZ * CHUNK_SIZE + z) * 0.05;
      heightmap[z * CHUNK_SIZE + x] = noise.fbm(gx, gz, 4, 2.0, 0.5);
    }
  }

  return heightmap;
}
