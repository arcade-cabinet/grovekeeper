/**
 * Combat types.
 *
 * Pure data shapes shared by the combat reducer and combat system.
 * No engine imports here — this module is engine-agnostic so the
 * reducer can be tested without spinning up Three.js.
 */

/** Anything that can take damage. Players, creatures, future targets. */
export interface Combatant {
  /** Stable id; opaque to combat (just used for routing). */
  id: string;
  /** Current HP. Damage clamps to >= 0. */
  hp: number;
  /** Max HP — informational; combat doesn't enforce caps on heal. */
  hpMax: number;
}

/** A discrete hit event. */
export interface HitEvent {
  /** id of the attacker (for telemetry / damage attribution). */
  attackerId: string;
  /** id of the target. */
  targetId: string;
  /** Damage to subtract. Must be >= 0. */
  damage: number;
}
