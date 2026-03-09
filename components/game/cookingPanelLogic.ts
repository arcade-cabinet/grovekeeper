/**
 * cookingPanelLogic.ts -- Pure logic for the CookingPanel UI.
 *
 * Extracts recipe display data, ingredient availability checks, and cook
 * execution into testable pure functions. No React or RN imports.
 *
 * Spec §7.3 (Campfire Cooking), §22 (Crafting)
 */

import type { CookingRecipe } from "@/game/systems/cooking";
import { canCook, getCookingRecipes } from "@/game/systems/cooking";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Single ingredient display data for the UI. */
export interface IngredientDisplay {
  cropId: string;
  name: string;
  needed: number;
  owned: number;
  sufficient: boolean;
}

/** Full recipe row display data for the UI. */
export interface RecipeDisplay {
  id: string;
  name: string;
  ingredients: IngredientDisplay[];
  cookingTimeSec: number;
  saturation: number;
  healing: number;
  canCook: boolean;
}

// ---------------------------------------------------------------------------
// Crop display names (human-readable)
// ---------------------------------------------------------------------------

const CROP_NAMES: Record<string, string> = {
  apple: "Apple",
  carrot: "Carrot",
  cucumber: "Cucumber",
  pumpkin: "Pumpkin",
  tomato: "Tomato",
};

export function getCropDisplayName(cropId: string): string {
  return CROP_NAMES[cropId] ?? cropId;
}

// ---------------------------------------------------------------------------
// Recipe display assembly
// ---------------------------------------------------------------------------

/**
 * Builds display data for a single recipe given the player's crop inventory.
 */
export function buildRecipeDisplay(
  recipe: CookingRecipe,
  inventory: Record<string, number>,
): RecipeDisplay {
  const ingredients: IngredientDisplay[] = recipe.ingredients.map((ing) => {
    const owned = inventory[ing.cropId] ?? 0;
    return {
      cropId: ing.cropId,
      name: getCropDisplayName(ing.cropId),
      needed: ing.amount,
      owned,
      sufficient: owned >= ing.amount,
    };
  });

  return {
    id: recipe.id,
    name: recipe.name,
    ingredients,
    cookingTimeSec: recipe.cookingTimeSec,
    saturation: recipe.output.saturation,
    healing: recipe.output.healing,
    canCook: canCook(recipe, inventory),
  };
}

/**
 * Returns display data for ALL cooking recipes, sorted: cookable first, then
 * alphabetical within each group.
 */
export function buildAllRecipeDisplays(inventory: Record<string, number>): RecipeDisplay[] {
  const recipes = getCookingRecipes();
  const displays = recipes.map((r) => buildRecipeDisplay(r, inventory));

  displays.sort((a, b) => {
    if (a.canCook !== b.canCook) return a.canCook ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return displays;
}

/**
 * Format cooking time for display. Returns e.g. "15s", "1m 30s".
 */
export function formatCookingTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

/**
 * Format effect text for a recipe output.
 */
export function formatRecipeEffect(saturation: number, healing: number): string {
  const parts: string[] = [];
  if (saturation > 0) parts.push(`+${saturation} hunger`);
  if (healing > 0) parts.push(`+${healing} heart${healing !== 1 ? "s" : ""}`);
  return parts.join(", ");
}
