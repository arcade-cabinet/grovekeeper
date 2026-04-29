/**
 * Grove placement — a pure, deterministic decision function: given a chunk coordinate
 * and a world seed, decide whether the chunk should be *upgraded* from
 * its surrounding wilderness biome to a Grove. Groves are the special,
 * consistent, glowing meadow biome that anchor the game's tonal
 * contrast (dangerous wild ↔ peaceful grove). They are PRNG-seeded
 * across the world per the spec.
 *
 * Two rules layered on top of each other, in priority order:
 *
 *   1. **Starter grove** — chunk (3, 0) is *always* a grove. The
 *      "first grove discovery" beat from the journey wave assumes the
 *      player can stumble into a grove within ~30 seconds of walking
 *      from spawn. With chunkSize=16 and a player walk speed of ~3
 *      units/sec, chunk (3, 0) sits 48 tiles east — a comfortable
 *      ~16-second walk. Close enough to be findable, far enough that
 *      it doesn't overlap the spawn chunk and it still feels like a
 *      discovery.
 *
 *   2. **Random outer-world groves** — every other chunk rolls a
 *      `scopedRNG('grove', worldSeed, chunkX, chunkZ)` and becomes a
 *      grove with probability `1/50` (≈2%). 1/50 was chosen as the
 *      sweet spot between "groves feel rare and special" (>1/100
 *      makes finding one beyond the starter feel like a chore) and
 *      "groves are not so common they lose their visual punch"
 *      (<1/30 floods the streamed area).
 *
 * The function is deterministic in `(worldSeed, chunkX, chunkZ)`:
 * same inputs → same output, always. Unit tests assert this and the
 * starter grove placement.
 *
 * The `biomeAssigner` excludes Grove from its random distribution —
 * grove placement is the responsibility of this module. The integration
 * is one line in the assigner: "if isGroveChunk(...) return 'grove';
 * else delegate to the meadow/forest/coast picker".
 */

import { scopedRNG } from "@/shared/utils/seedRNG";

/**
 * The fixed starter grove coordinate. Re-exported so tests and any
 * "tutorial compass needle" UI can point at it without re-deriving
 * the magic numbers.
 */
export const STARTER_GROVE_CHUNK: { readonly x: number; readonly z: number } = {
  x: 3,
  z: 0,
};

/**
 * Second guaranteed grove (journey beat 13 — "Discovery of second
 * grove"). Always a grove regardless of seed; ~2 minutes' walk from
 * spawn at the documented player speed.
 */
export const SECOND_GROVE_CHUNK: { readonly x: number; readonly z: number } = {
  x: 7,
  z: 2,
};

/**
 * Chunks that are *unconditionally* groves on every world. Order is
 * meaningful: starter is the first beat, second grove is the second.
 */
export const GUARANTEED_GROVE_CHUNKS: ReadonlyArray<{
  readonly x: number;
  readonly z: number;
}> = [STARTER_GROVE_CHUNK, SECOND_GROVE_CHUNK] as const;

/**
 * Probability of any non-guaranteed chunk rolling into a grove. 1 in
 * 50 means the random distribution is ~2% before the guaranteed
 * groves are added.
 */
export const GROVE_RANDOM_PROBABILITY = 1 / 50;

/**
 * Decide whether `(chunkX, chunkZ)` is a grove chunk for the given
 * world seed. Pure function, no side effects.
 *
 * @param worldSeed - The world's PRNG seed (integer).
 * @param chunkX    - Chunk grid X coordinate.
 * @param chunkZ    - Chunk grid Z coordinate.
 * @returns `true` iff this chunk should render as a Grove biome.
 */
export function isGroveChunk(
  worldSeed: number,
  chunkX: number,
  chunkZ: number,
): boolean {
  // Rule 1+2: guaranteed groves are unconditional. Even on a wildly
  // unlikely seed where the random roll *also* would have landed
  // here, the function still returns true — there's no "double grove"
  // ambiguity to resolve.
  for (const g of GUARANTEED_GROVE_CHUNKS) {
    if (chunkX === g.x && chunkZ === g.z) return true;
  }

  // Rule 3: deterministic PRNG roll. The scope `'grove'` namespaces
  // this draw away from terrain decoration rolls and biome assignment
  // rolls so they can't accidentally collide.
  const rng = scopedRNG("grove", worldSeed, chunkX, chunkZ);
  return rng() < GROVE_RANDOM_PROBABILITY;
}
