/**
 * inventory.ts -- Resource and seed inventory actions.
 * Spec §5 (resources), §7 (seeds)
 */

import { batch } from "@legendapp/state";
import type { ResourceType } from "@/game/config/resources";
import { gameState$, getState } from "./core.ts";
// biome-ignore lint/suspicious/noImportCycles: safe circular ES module binding (called inside queueMicrotask, never at module init time)
import { advanceQuestObjective } from "./questState.ts";

export function addResource(type: ResourceType, amount: number): void {
  const state = getState();
  batch(() => {
    gameState$.resources.set({
      ...state.resources,
      [type]: state.resources[type] + amount,
    });
    gameState$.lifetimeResources.set({
      ...state.lifetimeResources,
      [type]: state.lifetimeResources[type] + amount,
    });
  });
  queueMicrotask(() => {
    advanceQuestObjective(`${type}_collected`, amount);
  });
}

export function spendResource(type: ResourceType, amount: number): boolean {
  const current = getState().resources[type];
  if (current < amount) return false;
  const state = getState();
  gameState$.resources.set({
    ...state.resources,
    [type]: state.resources[type] - amount,
  });
  return true;
}

export function addSeed(speciesId: string, amount: number): void {
  const state = getState();
  gameState$.seeds.set({
    ...state.seeds,
    [speciesId]: (state.seeds[speciesId] ?? 0) + amount,
  });
}

export function spendSeed(speciesId: string, amount: number): boolean {
  const current = getState().seeds[speciesId] ?? 0;
  if (current < amount) return false;
  const state = getState();
  gameState$.seeds.set({
    ...state.seeds,
    [speciesId]: (state.seeds[speciesId] ?? 0) - amount,
  });
  return true;
}
