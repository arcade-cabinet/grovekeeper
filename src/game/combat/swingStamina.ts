/**
 * Swing stamina.
 *
 * Glue that wires the gather-system swing gate to the player's
 * `FarmerState` trait. Each successful swing costs `SWING_STAMINA_COST`
 * stamina; when the gauge is below the cost the swing is suppressed.
 *
 * This module is the single source of truth for the swing stamina
 * cost — runtime + tests both import from here so the value never
 * drifts.
 *
 * Stamina regen lives in `@/systems/stamina#staminaSystem` (existing,
 * 2 stamina/sec scaled by difficulty). We deliberately don't add a
 * second regen path — that would race with the existing one.
 */

import type { World } from "koota";
import { FarmerState, IsPlayer } from "@/traits";

/** Stamina cost per swing (spec: 5). */
export const SWING_STAMINA_COST = 5;

/** Returns true if the player has enough stamina to swing. */
export function canSwing(world: World): boolean {
  const player = world.queryFirst(IsPlayer, FarmerState);
  if (!player) return false;
  const fs = player.get(FarmerState);
  if (!fs) return false;
  return fs.stamina >= SWING_STAMINA_COST;
}

/**
 * Spend the swing stamina cost. Returns true if it was deducted,
 * false if there wasn't enough (caller should have checked
 * `canSwing` first; this returns false defensively if not).
 */
export function spendSwingStamina(world: World): boolean {
  const player = world.queryFirst(IsPlayer, FarmerState);
  if (!player) return false;
  const fs = player.get(FarmerState);
  if (!fs || fs.stamina < SWING_STAMINA_COST) return false;
  player.set(FarmerState, {
    ...fs,
    stamina: fs.stamina - SWING_STAMINA_COST,
  });
  return true;
}
