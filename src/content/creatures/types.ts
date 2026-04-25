/**
 * Creature definitions — Wave 14/15 (outer-world fauna + light combat).
 *
 * `CreatureDef` is the runtime shape of an entry in `creatures.json`.
 * Defs split cleanly into peaceful (rabbit, deer) and hostile (wolf-pup);
 * the `hostility` discriminator drives the state machine in
 * `CreatureActor`.
 *
 * Numbers are deliberately cozy-scaled: no creature can one-shot the
 * player (max creature damage 5 vs player maxHp 100), and the wolf-pup
 * is winnable in 3 axe hits. Tunings live in JSON, never inline.
 *
 * Spec ref: `docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`
 *   §"Combat and encounters" — light combat, stamina-gated swings,
 *   simple state machines, retreat (no death state).
 */

export type Hostility = "peaceful" | "hostile";

export interface CreatureDef {
  /** Stable id; matches the JSON key. */
  species: string;
  /** Resolved at runtime via Vite BASE_URL — relative path under public/. */
  glb: string;
  /** Animation clip names — must exist in the GLB. */
  idleClip: string;
  walkClip: string;
  runClip?: string;
  attackClip?: string;
  hurtClip?: string;
  /** Health pool. Peaceful creatures use this for hurt/dissolve; hostile fight back. */
  hpMax: number;
  /** Wander-leg speed in world units / second. */
  walkSpeed: number;
  /** Sprint speed when fleeing (peaceful) or chasing (hostile). */
  fleeSpeed: number;
  /** Peaceful: distance at which the creature panics and flees. */
  panicRadius?: number;
  /** Hostile: distance at which the creature switches to chase. */
  aggroRadius?: number;
  /** Hostile: damage dealt per attack. */
  damagePerHit?: number;
  /** Wander-leg radius around the creature's anchor / spawn. */
  wanderRadius: number;
  /** Pause between wander legs in seconds. */
  wanderPauseSeconds: number;
  hostility: Hostility;
}
