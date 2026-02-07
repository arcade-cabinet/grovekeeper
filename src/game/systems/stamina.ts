import type { Entity } from "../ecs/world";
import { farmerQuery } from "../ecs/world";
import { getActiveDifficulty } from "../constants/difficulty";

const BASE_STAMINA_REGEN_PER_SEC = 2;

/**
 * Regenerates farmer stamina at 2/sec (scaled by difficulty) up to maxStamina.
 * Called every frame from the game loop.
 */
export function staminaSystem(deltaTime: number): void {
  const regenMult = getActiveDifficulty().staminaRegenMult;
  for (const entity of farmerQuery) {
    if (!entity.farmerState) continue;

    const fs = entity.farmerState;
    if (fs.stamina < fs.maxStamina) {
      fs.stamina = Math.min(
        fs.maxStamina,
        fs.stamina + BASE_STAMINA_REGEN_PER_SEC * regenMult * deltaTime,
      );
    }
  }
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
