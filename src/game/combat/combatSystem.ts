/**
 * Combat system.
 *
 * Side-effecting glue between the player swing event and live
 * `CreatureActor`s. Pure helper functions are in `combat.ts`; this
 * file contains the engine-aware glue:
 *
 *   - `findHostilesInReach(player, creatures, reach)` — picks every
 *     hostile within `reach` units of the player position (used by
 *     the swing handler to award hits).
 *   - `swingHit(player, creatures, opts)` — applies one unit of
 *     damage to each hostile in reach, dispatches `applyDamage`
 *     on the actor, and returns a list of dispatched hits.
 *   - `dispatchPlayerHit` — applies creature → player damage to the
 *     Koota FarmerState trait. Pure-ish (single side effect to the
 *     world handle the caller passes in).
 *
 * Spec ref: `docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`
 *   §"Combat and encounters" — light combat, tools-as-weapons,
 *   simple damage application.
 */

import type { World } from "koota";
import type { CreatureActor } from "@/game/scene/CreatureActor";
import { FarmerState, IsPlayer } from "@/traits";

/** Default melee reach (world units) for the starter axe. */
export const DEFAULT_SWING_REACH = 1.8;
/** Damage one starter-axe swing deals to a hostile creature. */
export const DEFAULT_SWING_DAMAGE = 1;

export interface PlayerXZ {
  x: number;
  z: number;
}

/** Pick hostile creatures within `reach` of the player. */
export function findHostilesInReach(
  player: PlayerXZ,
  creatures: readonly CreatureActor[],
  reach: number,
): CreatureActor[] {
  const r2 = reach * reach;
  const out: CreatureActor[] = [];
  for (const c of creatures) {
    if (c.state === "dead") continue;
    // Peaceful creatures are not hit by swings — that would let the
    // player accidentally kill rabbits, which the spec rules out.
    // Combat is hostile-only. `hostility` is exposed via the actor's
    // public getter so we don't have to reach into private fields.
    if (c.hostility !== "hostile") continue;
    const p = c.position;
    const dx = p.x - player.x;
    const dz = p.z - player.z;
    if (dx * dx + dz * dz <= r2) out.push(c);
  }
  return out;
}

export interface SwingResult {
  /** Creatures hit this swing. */
  hits: CreatureActor[];
  /** Creatures that died (HP went to 0) this swing. */
  killed: CreatureActor[];
}

/**
 * Resolve one player swing against a list of creatures. Damages
 * every hostile in reach (`DEFAULT_SWING_REACH`).
 */
export function swingHit(
  player: PlayerXZ,
  creatures: readonly CreatureActor[],
  opts: { reach?: number; damage?: number } = {},
): SwingResult {
  const reach = opts.reach ?? DEFAULT_SWING_REACH;
  const damage = opts.damage ?? DEFAULT_SWING_DAMAGE;
  const targets = findHostilesInReach(player, creatures, reach);
  const killed: CreatureActor[] = [];
  for (const t of targets) {
    const died = t.applyDamage(damage);
    if (died) killed.push(t);
  }
  return { hits: targets, killed };
}

/**
 * Apply creature → player damage to the player's `FarmerState` trait.
 * Returns the player's new HP, or `null` if no player entity exists
 * (test fixtures occasionally call without one).
 */
export function dispatchPlayerHit(world: World, damage: number): number | null {
  const player = world.queryFirst(IsPlayer, FarmerState);
  if (!player) return null;
  const fs = player.get(FarmerState);
  if (!fs) return null;
  const next = Math.max(0, fs.hp - Math.max(0, damage));
  player.set(FarmerState, { ...fs, hp: next });
  return next;
}
