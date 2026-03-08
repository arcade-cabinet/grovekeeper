/**
 * craftingStationLogic -- Pure functions for resolving crafting station panel state.
 *
 * Reads from store.activeCraftingStation and maps to panel open/close booleans.
 * Used by GameScreen to determine which crafting overlay to render.
 *
 * Spec §7.3 (Campfire Cooking), §22.2 (Forging), §35 (Build)
 */

/** The crafting station types set by actionDispatcher. */
export type CraftingStationType = "cooking" | "forging" | "kitbash" | "fishing";

export interface CraftingStation {
  type: string;
  entityId: string;
}

export interface CraftingPanelState {
  cookingOpen: boolean;
  forgingOpen: boolean;
  buildOpen: boolean;
  fishingOpen: boolean;
}

/**
 * Resolves which crafting panel should be open based on the active station.
 * Returns all-false if station is null.
 */
export function resolvePanelState(station: CraftingStation | null): CraftingPanelState {
  return {
    cookingOpen: station?.type === "cooking",
    forgingOpen: station?.type === "forging",
    buildOpen: station?.type === "kitbash",
    fishingOpen: station?.type === "fishing",
  };
}
