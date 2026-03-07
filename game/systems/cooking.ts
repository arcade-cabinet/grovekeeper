/**
 * Campfire cooking system.
 *
 * Place raw food ingredients at a lit campfire to cook recipes.
 * Cooking fails if the campfire goes out mid-cook.
 */

import cookingConfig from "@/config/game/cooking.json" with { type: "json" };
import type { CropId } from "@/game/ecs/components/structures";
import type { FoodComponent } from "@/game/ecs/components/items";

// ---------------------------------------------------------------------------
// Cooking recipe definition (loaded from config)
// ---------------------------------------------------------------------------

export interface CookingIngredient {
  cropId: CropId;
  amount: number;
}

export interface CookingRecipeOutput {
  foodId: string;
  name: string;
  saturation: number;
  healing: number;
}

export interface CookingRecipe {
  id: string;
  name: string;
  ingredients: CookingIngredient[];
  cookingTimeSec: number;
  output: CookingRecipeOutput;
}

const COOKING_RECIPES: CookingRecipe[] =
  cookingConfig.recipes as CookingRecipe[];

// ---------------------------------------------------------------------------
// Config accessors
// ---------------------------------------------------------------------------

export function getCookingRecipeById(id: string): CookingRecipe | undefined {
  return COOKING_RECIPES.find((r) => r.id === id);
}

export function getCookingRecipes(): CookingRecipe[] {
  return [...COOKING_RECIPES];
}

// ---------------------------------------------------------------------------
// Cooking slot state
// ---------------------------------------------------------------------------

export type CookingStatus = "idle" | "cooking" | "done" | "failed";

export interface CookingSlotState {
  recipeId: string | null;
  status: CookingStatus;
  elapsed: number;
  totalTime: number;
}

export function createEmptyCookingSlot(): CookingSlotState {
  return {
    recipeId: null,
    status: "idle",
    elapsed: 0,
    totalTime: 0,
  };
}

// ---------------------------------------------------------------------------
// Recipe matching
// ---------------------------------------------------------------------------

/** Check if player has enough ingredients for a recipe. */
export function canCook(
  recipe: CookingRecipe,
  inventory: Record<string, number>,
): boolean {
  return recipe.ingredients.every(
    (ing) => (inventory[ing.cropId] ?? 0) >= ing.amount,
  );
}

/** Find all recipes that can be cooked with current inventory. */
export function getAvailableRecipes(
  inventory: Record<string, number>,
): CookingRecipe[] {
  return COOKING_RECIPES.filter((r) => canCook(r, inventory));
}

/** Deduct ingredients from inventory. Returns new inventory map. */
export function deductIngredients(
  recipe: CookingRecipe,
  inventory: Record<string, number>,
): Record<string, number> {
  const result = { ...inventory };
  for (const ing of recipe.ingredients) {
    result[ing.cropId] = (result[ing.cropId] ?? 0) - ing.amount;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Cooking progress
// ---------------------------------------------------------------------------

/** Start cooking a recipe in a slot. */
export function startCooking(recipe: CookingRecipe): CookingSlotState {
  return {
    recipeId: recipe.id,
    status: "cooking",
    elapsed: 0,
    totalTime: recipe.cookingTimeSec,
  };
}

/**
 * Advance cooking by delta time.
 * If campfire goes out (campfireLit === false), cooking fails.
 */
export function advanceCooking(
  slot: CookingSlotState,
  deltaSec: number,
  campfireLit: boolean,
): CookingSlotState {
  if (slot.status !== "cooking") return slot;

  if (!campfireLit) {
    return { ...slot, status: "failed" };
  }

  const newElapsed = slot.elapsed + deltaSec;
  if (newElapsed >= slot.totalTime) {
    return { ...slot, elapsed: slot.totalTime, status: "done" };
  }

  return { ...slot, elapsed: newElapsed };
}

/** Collect finished food from a done cooking slot. Returns the food output. */
export function collectCookedFood(
  slot: CookingSlotState,
): FoodComponent | null {
  if (slot.status !== "done" || !slot.recipeId) return null;

  const recipe = getCookingRecipeById(slot.recipeId);
  if (!recipe) return null;

  return {
    foodId: recipe.output.foodId,
    name: recipe.output.name,
    raw: false,
    saturation: recipe.output.saturation,
    healing: recipe.output.healing,
    modelPath: "",
  };
}
