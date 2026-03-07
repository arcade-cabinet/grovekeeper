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
