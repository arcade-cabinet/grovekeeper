/**
 * survivalState.ts -- Survival system and crafting station actions.
 * Spec §12 (survival: hunger, hearts, body temp, campfire, death), §22 (crafting)
 */

import { batch } from "@legendapp/state";
import difficultyConfig from "@/config/game/difficulty.json" with { type: "json" };
import { gameState$, getState, initialState } from "./core";

/** Start a new game. Sets hearts/maxHearts from difficulty config. Spec §12. */
export function startNewGame(difficultyId: string): void {
  const tier = (difficultyConfig as Array<{ id: string; maxHearts: number }>).find(
    (d) => d.id === difficultyId,
  );
  const maxHearts = tier?.maxHearts ?? 3;
  batch(() => {
    gameState$.difficulty.set(difficultyId);
    gameState$.hearts.set(maxHearts);
    gameState$.maxHearts.set(maxHearts);
    gameState$.hunger.set(100);
    gameState$.maxHunger.set(100);
    gameState$.bodyTemp.set(37.0);
    gameState$.lastCampfireId.set(null);
    gameState$.lastCampfirePosition.set(null);
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
 * Handle player death. Restores minimum hearts, resets hunger and temp.
 * In permadeath (ironwood) mode, resets the world. Spec §12.5, §2.1
 */
export function handleDeath(): void {
  const difficulty = gameState$.difficulty.get();
  const isPermadeath = gameState$.permadeath.get();
  batch(() => {
    gameState$.hearts.set(1);
    gameState$.hunger.set(50);
    gameState$.bodyTemp.set(37.0);
  });
  if (isPermadeath || difficulty === "ironwood") {
    gameState$.level.set(1);
    gameState$.xp.set(0);
    gameState$.lastCampfireId.set(null);
    gameState$.lastCampfirePosition.set(null);
  }
}

/** Open/close a crafting station. Spec §22.1, §22.2, §35 */
export function setActiveCraftingStation(
  station: { type: string; entityId: string } | null,
): void {
  gameState$.activeCraftingStation.set(station);
}

/** Bulk-set state from SQLite on load. */
export function hydrateFromDb(dbState: Partial<typeof initialState>): void {
  gameState$.set({ ...getState(), ...dbState });
}
