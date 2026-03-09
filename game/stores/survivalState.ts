/**
 * survivalState.ts -- Survival system and crafting station actions.
 * Spec §12 (survival: hunger, hearts, body temp, campfire, death), §22 (crafting)
 */

import { batch } from "@legendapp/state";
import difficultyConfig from "@/config/game/difficulty.json" with { type: "json" };
import { startChain } from "@/game/quests/questChainEngine";
import { showToast } from "@/game/ui/Toast";
import { gameState$, getState, type initialState } from "./core.ts";

/** Start a new game. Sets hearts/maxHearts from difficulty config, and permadeath flag. Spec §12, §2.1. */
export function startNewGame(difficultyId: string, permadeath = false): void {
  const tier = (difficultyConfig as Array<{ id: string; maxHearts: number }>).find(
    (d) => d.id === difficultyId,
  );
  const maxHearts = tier?.maxHearts ?? 3;

  // Auto-start the opening quest spine. Spec §25.1.
  const state = getState();
  const chainState = startChain(state.questChainState, "elder-awakening", state.currentDay);

  batch(() => {
    gameState$.difficulty.set(difficultyId);
    gameState$.permadeath.set(permadeath);
    gameState$.hearts.set(maxHearts);
    gameState$.maxHearts.set(maxHearts);
    gameState$.hunger.set(100);
    gameState$.maxHunger.set(100);
    gameState$.bodyTemp.set(37.0);
    gameState$.lastCampfireId.set(null);
    gameState$.lastCampfirePosition.set(null);
    gameState$.questChainState.set(chainState);
  });

  queueMicrotask(() => {
    showToast("Speak with the village elder near the well.", "info");
  });
}

/** Set hunger. Clamped to [0, maxHunger] by callers. Spec §12.2 */
export function setHunger(value: number): void {
  gameState$.hunger.set(value);
}

/** Set hearts. Spec §12.3 */
export function setHearts(value: number): void {
  gameState$.hearts.set(value);
}

/** Set max hearts. Spec §12.3 */
export function setMaxHearts(value: number): void {
  gameState$.maxHearts.set(value);
}

/** Set body temperature in °C. Spec §2.2 */
export function setBodyTemp(value: number): void {
  gameState$.bodyTemp.set(value);
}

/** Record the campfire the player most recently rested at. Spec §12.5 */
export function setLastCampfire(
  id: string | null,
  position: { x: number; y: number; z: number } | null,
): void {
  batch(() => {
    gameState$.lastCampfireId.set(id);
    gameState$.lastCampfirePosition.set(position);
  });
}

/**
 * Handle player death. Delegates to deathRespawn system for full penalty.
 * Spec §12.5, §2.1. Kept as store action for backwards compatibility.
 */
export function handleDeath(): void {
  // Lazy import to avoid circular dependency at module init time
  const { applyDeathPenalty } = require("@/game/systems/deathRespawn");
  applyDeathPenalty();
}

/** Open/close a crafting station. Spec §22.1, §22.2, §35 */
export function setActiveCraftingStation(station: { type: string; entityId: string } | null): void {
  gameState$.activeCraftingStation.set(station);
}

/** Bulk-set state from SQLite on load. */
export function hydrateFromDb(dbState: Partial<typeof initialState>): void {
  gameState$.set({ ...getState(), ...dbState });
}
