/**
 * Stamina system -- regeneration and drain for tool actions.
 * Pure functions operating on entity state.
 */

import type { Entity } from "@/game/ecs/world";

const BASE_STAMINA_REGEN_PER_SEC = 2;

/**
 * Regenerate stamina for a farmer entity at the base rate.
 * Returns the new stamina value clamped to maxStamina.
 */
export function regenStamina(
  currentStamina: number,
  maxStamina: number,
  deltaTime: number,
  regenMult: number = 1.0,
): number {
  if (currentStamina >= maxStamina) return currentStamina;
  return Math.min(maxStamina, currentStamina + BASE_STAMINA_REGEN_PER_SEC * regenMult * deltaTime);
}

/**
 * Attempts to drain stamina for a tool action.
 * Returns true if sufficient stamina was available (and drained).
 * Returns false if insufficient (no change).
 */
export function drainStamina(entity: Entity, cost: number): boolean {
  if (!entity.farmerState) return false;
  if (entity.farmerState.stamina < cost) return false;

  entity.farmerState.stamina -= cost;
  return true;
}
