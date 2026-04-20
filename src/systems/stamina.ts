import type { Entity } from "koota";
import { getActiveDifficulty } from "@/config/difficulty";
import { koota } from "@/koota";
import { FarmerState, IsPlayer } from "@/traits";

const BASE_STAMINA_REGEN_PER_SEC = 2;

/**
 * Regenerate farmer stamina at 2/sec (scaled by difficulty) up to
 * maxStamina. Iterates every IsPlayer+FarmerState entity so multi-
 * actor scenarios (future co-op?) work without change. Called every
 * frame from the game loop.
 */
export function staminaSystem(deltaTime: number): void {
  const regenMult = getActiveDifficulty().staminaRegenMult;
  for (const entity of koota.query(IsPlayer, FarmerState)) {
    const fs = entity.get(FarmerState);
    if (fs.stamina >= fs.maxStamina) continue;

    const stamina = Math.min(
      fs.maxStamina,
      fs.stamina + BASE_STAMINA_REGEN_PER_SEC * regenMult * deltaTime,
    );
    entity.set(FarmerState, { ...fs, stamina });
  }
}

/**
 * Attempt to drain stamina for a tool action.
 * Returns true if sufficient stamina was available (and drained).
 * Returns false if insufficient (no change).
 */
export function drainStamina(entity: Entity, cost: number): boolean {
  if (!entity.has(FarmerState)) return false;
  const fs = entity.get(FarmerState);
  if (fs.stamina < cost) return false;
  entity.set(FarmerState, { ...fs, stamina: fs.stamina - cost });
  return true;
}
