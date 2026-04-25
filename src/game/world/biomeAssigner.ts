/**
 * biomeAssigner — pure function mapping `(worldSeed, chunkX, chunkZ)`
 * to a `BiomeId`. Wave 9 uses this to give every chunk in the streamed
 * 2D grid a deterministic biome.
 *
 * Distribution comes from `world.config.json#streaming.biomeWeights`:
 * meadow ~50%, forest ~30%, coast ~20%. **Grove is intentionally
 * excluded** from the random distribution — Wave 10 will place groves
 * via a separate PRNG roll on outer-world chunks (rare, narrative
 * spine), not by random spawn.
 *
 * All randomness flows through `scopedRNG('biome', worldSeed, chunkX,
 * chunkZ)` so identical inputs produce the same biome — the project's
 * deterministic-world rule (NO `Math.random` in gameplay code).
 */

import { scopedRNG } from "@/shared/utils/seedRNG";
import type { BiomeId } from "./biomes";
import { isGroveChunk } from "./grovePlacement";
import worldConfig from "./world.config.json";

/**
 * Biome ids eligible for random chunk spawn. Order is significant —
 * iteration walks this list and the first cumulative bucket the roll
 * lands in wins. Grove is omitted on purpose (Wave 10 special case).
 */
export const ASSIGNABLE_BIOME_IDS = ["meadow", "forest", "coast"] as const;

/** Type of biomes the assigner can return. */
export type AssignableBiomeId = (typeof ASSIGNABLE_BIOME_IDS)[number];

interface WeightedBucket {
  id: AssignableBiomeId;
  /** Cumulative threshold in [0, totalWeight]. */
  cumulative: number;
}

/**
 * Pre-compute the cumulative weight table once at module load. Reading
 * weights from JSON keeps tuning out of code; the table is rebuilt
 * each time we'd need it without this cache.
 */
function buildBucketTable(): { buckets: WeightedBucket[]; total: number } {
  const weights = worldConfig.streaming.biomeWeights as Record<
    AssignableBiomeId,
    number
  >;
  const buckets: WeightedBucket[] = [];
  let total = 0;
  for (const id of ASSIGNABLE_BIOME_IDS) {
    const w = weights[id] ?? 0;
    if (w <= 0) continue;
    total += w;
    buckets.push({ id, cumulative: total });
  }
  if (total <= 0) {
    // Defensive fallback — config corrupt; assign meadow always.
    return {
      buckets: [{ id: "meadow", cumulative: 1 }],
      total: 1,
    };
  }
  return { buckets, total };
}

const TABLE = buildBucketTable();

/**
 * Assign a biome id deterministically to a chunk coordinate.
 *
 * Same `(worldSeed, chunkX, chunkZ)` always returns the same biome.
 * The roll is uniform in `[0, totalWeight)`; the first bucket whose
 * cumulative threshold the roll falls below wins.
 */
export function assignBiome(
  worldSeed: number,
  chunkX: number,
  chunkZ: number,
): BiomeId {
  // Wave 10: grove placement runs FIRST and overrides whatever the
  // weighted distribution would have rolled. The grove placement
  // function is independent of the biome PRNG (different scope) so
  // the wilderness distribution stays statistically stable for any
  // chunk that *isn't* upgraded to a grove.
  if (isGroveChunk(worldSeed, chunkX, chunkZ)) return "grove";

  const rng = scopedRNG("biome", worldSeed, chunkX, chunkZ);
  const roll = rng() * TABLE.total;
  for (const bucket of TABLE.buckets) {
    if (roll < bucket.cumulative) return bucket.id;
  }
  // Numerical edge case (roll === total): fall through to last bucket.
  return TABLE.buckets[TABLE.buckets.length - 1].id;
}

/**
 * Read-only view of the cumulative bucket table — exposed for tests
 * and debug overlays so they can assert on the published distribution
 * without re-deriving it.
 */
export function getBiomeWeightTable(): {
  buckets: ReadonlyArray<{ id: AssignableBiomeId; cumulative: number }>;
  total: number;
} {
  return { buckets: TABLE.buckets, total: TABLE.total };
}
