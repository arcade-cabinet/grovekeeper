/**
 * Biome registry — the runtime lookup that turns a `BiomeId` into a
 * fully-described `BiomeDefinition`. The registry is a static map; new
 * biomes register themselves by being added to `BIOMES` below. No
 * module-level mutation, so test ordering / multi-test parallelism is
 * safe.
 */

import { COAST_BIOME } from "./coast";
import { FOREST_BIOME } from "./forest";
import { GROVE_BIOME } from "./grove";
import { MEADOW_BIOME } from "./meadow";
import type { BiomeDefinition, BiomeId } from "./types";

/**
 * Registry table — keyed by `BiomeId`. Adding a fifth biome means
 * adding both an entry here AND extending the `BiomeId` union in
 * `types.ts` (the union is the source of truth for compile-time
 * coverage).
 */
const BIOMES: Readonly<Record<BiomeId, BiomeDefinition>> = {
  meadow: MEADOW_BIOME,
  forest: FOREST_BIOME,
  coast: COAST_BIOME,
  grove: GROVE_BIOME,
} as const;

/**
 * Resolve a biome id to its definition. Throws on unknown ids — callers
 * should never pass a string that's not a `BiomeId`, but the throw
 * gives us a clear failure mode in case a malformed save reaches us.
 */
export function getBiome(id: BiomeId): BiomeDefinition {
  const biome = BIOMES[id];
  if (!biome) {
    throw new Error(`Unknown biome id: "${String(id)}"`);
  }
  return biome;
}

/** All biome definitions in registration order. */
export function listBiomes(): readonly BiomeDefinition[] {
  return [BIOMES.meadow, BIOMES.forest, BIOMES.coast, BIOMES.grove] as const;
}

/**
 * Default biome for Wave 8 — runtime stays on meadow until Wave 9
 * (chunk streaming) wires biome selection per chunk position.
 */
export const DEFAULT_BIOME_ID: BiomeId = "meadow";
