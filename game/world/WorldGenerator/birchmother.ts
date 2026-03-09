import { createRNG, hashString } from "@/game/utils/seedRNG";

/** The fixed distance from world origin at which the Birchmother spawns. */
export const BIRCHMOTHER_DISTANCE = 200;

/**
 * Compute Birchmother's world-space spawn position from the world seed.
 *
 * Cardinal direction is determined by the seed: one of north (+Z), south (-Z),
 * east (+X), or west (-X). The position is fixed per seed so the same seed
 * always leads to the same Birchmother.
 */
export function computeBirmotherSpawn(seed: string): { x: number; z: number } {
  const rng = createRNG(hashString(`birchmother-${seed}`));
  const directionRoll = rng();

  if (directionRoll < 0.25) {
    return { x: 0, z: BIRCHMOTHER_DISTANCE };
  }
  if (directionRoll < 0.5) {
    return { x: 0, z: -BIRCHMOTHER_DISTANCE };
  }
  if (directionRoll < 0.75) {
    return { x: BIRCHMOTHER_DISTANCE, z: 0 };
  }
  return { x: -BIRCHMOTHER_DISTANCE, z: 0 };
}
