/**
 * Combat reducer.
 *
 * Pure functions: `applyHit` produces a new `Combatant` with HP
 * decreased; `isDead` checks the death predicate. No mutation of
 * inputs (functional update only). Used by both the player → creature
 * path (player swings axe) and the creature → player path (wolf
 * attacks).
 *
 * No randomness, no time, no engine refs — these functions are pure
 * so the unit tests can run in milliseconds and the integration
 * tests can compose them without fakes.
 */

import type { Combatant, HitEvent } from "./types";

/**
 * Apply a hit to a target combatant. Returns a fresh copy with HP
 * decreased by `hit.damage`, clamped to >= 0. Negative damage values
 * are coerced to 0 (no healing through this path).
 */
export function applyHit(target: Combatant, hit: HitEvent): Combatant {
  const dmg = Math.max(0, hit.damage);
  const next = Math.max(0, target.hp - dmg);
  return { ...target, hp: next };
}

/** True if the combatant's HP has reached zero. */
export function isDead(target: Combatant): boolean {
  return target.hp <= 0;
}
