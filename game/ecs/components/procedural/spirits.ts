/**
 * Grovekeeper spirit ECS component.
 *
 * Navi-style floating emissive orbs found at hedge maze centers.
 * Each spirit has a unique seeded emissive color, bobs up/down
 * on a sine wave, and rises from the maze floor when the player
 * approaches. Spirits hold dialogue trees for narrative branching.
 */

/** Grovekeeper spirit — floating emissive orb at hedge maze centers. */
export interface GrovekeeperSpiritComponent {
  /** Unique spirit ID (seeded from maze seed + index). */
  spiritId: string;
  /** Assigned emissive color hex (seeded, unique per spirit). */
  emissiveColor: string;
  /** Emissive intensity (pulses via sine wave). */
  emissiveIntensity: number;
  /** Orb radius in world units. */
  orbRadius: number;
  /** Bob amplitude (how high/low it floats). */
  bobAmplitude: number;
  /** Bob speed (sine wave frequency). */
  bobSpeed: number;
  /** Current bob phase (radians). */
  bobPhase: number;
  /** Whether spirit has risen from floor (spawn animation complete). */
  spawned: boolean;
  /** Spawn progress 0-1 (rises from floor to hover height). */
  spawnProgress: number;
  /** Hover height above ground. */
  hoverHeight: number;
  /** Trail particle color (matches emissive with lower opacity). */
  trailColor: string;
  /** Whether this spirit has been discovered by the player. */
  discovered: boolean;
  /** Dialogue tree ID for this spirit's narrative. */
  dialogueTreeId: string;
}

/**
 * Birchmother — the ancient tree of light at the heart of the world.
 *
 * Unique entity (one per world). Spawns at a seeded cardinal offset from
 * world origin (~200 units). Only materialises after all 8 Grovekeeper
 * Spirits have been discovered (main-quest-spirits complete).
 *
 * Spec §32.4.
 */
export interface BirmotherComponent {
  /** Dialogue tree ID for the Birchmother encounter. */
  dialogueTreeId: "birchmother-dialogue";
  /**
   * Awakened when all 8 spirits are discovered.
   * Starts false; set to true by useBirmotherEncounter once
   * main-quest-spirits is complete.
   */
  awakened: boolean;
  /**
   * Converged after the player completes the Birchmother dialogue.
   * Fires the worldroot_reached objective and ends the final quest.
   */
  converged: boolean;
  /** World seed used to determine Birchmother's placement direction. */
  worldSeed: string;
}
