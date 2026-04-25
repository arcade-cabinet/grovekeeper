/**
 * Grovekeeper block registry — generalized in Wave 8.
 *
 * Wave 7 hardcoded the meadow biome. Wave 8 makes registration biome-
 * driven: callers pass a `BiomeDefinition` and we register each of its
 * blocks on the renderer's `BlockRegistry`. The biome-prefixed naming
 * convention (`meadow.grass-flat`, `forest.pine-floor`) means multiple
 * biomes can share a single registry without colliding — important for
 * Wave 9's chunk streamer where neighbouring chunks may differ.
 *
 * Block ID `0` is reserved for air by `@jolly-pixel/voxel.renderer` and
 * is intentionally never registered.
 *
 * Mirrors voxel-realms' `BAKED_BLOCKS` pattern (see
 * `voxel-realms/src/world/voxel-bake.ts`) — we just feed it a biome's
 * blocks instead of one shared list.
 */

import type { BlockDefinition } from "@jolly-pixel/voxel.renderer";
import type { BiomeDefinition } from "./biomes";

/**
 * Register every block from a biome on a renderer's `BlockRegistry`.
 * Mirrors the `for (const block of BAKED_BLOCKS)` loop in voxel-realms'
 * `TerrainBehavior.awake`, but parameterized by biome.
 *
 * Idempotency is the renderer's responsibility — this function will
 * happily re-register the same blocks if called twice.
 */
export function registerBiomeBlocks(
  registry: { register(def: BlockDefinition): void },
  biome: BiomeDefinition,
): void {
  for (const block of biome.blocks) {
    registry.register(block);
  }
}
