/**
 * Grove placement — Wave 10.
 *
 * A pure, deterministic decision function: given a chunk coordinate
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
 * Wave 9's `biomeAssigner` is told to EXCLUDE Grove from its random
 * outer-world distribution — Grove placement is the responsibility
 * of THIS module. The integration is one line in the assigner:
 * "if isGroveChunk(...) return 'grove'; else delegate to the
 * meadow/forest/coast picker".
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
 * Probability of any non-starter chunk rolling into a grove. 1 in 50
 * means the random distribution is ~2% before the starter is added.
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
  // Rule 1: starter grove is unconditional. Even on the wildly
  // unlikely seed where the random roll *also* would have landed it
  // here, the function still returns true — there's no "double grove"
  // ambiguity to resolve.
  if (chunkX === STARTER_GROVE_CHUNK.x && chunkZ === STARTER_GROVE_CHUNK.z) {
    return true;
  }

  // Rule 2: deterministic PRNG roll. The scope `'grove'` namespaces
  // this draw away from terrain decoration rolls and biome assignment
  // rolls so they can't accidentally collide.
  const rng = scopedRNG("grove", worldSeed, chunkX, chunkZ);
  return rng() < GROVE_RANDOM_PROBABILITY;
}
