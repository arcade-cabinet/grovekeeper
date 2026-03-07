/**
 * Campfire cooking system.
 *
 * Place raw food ingredients at a lit campfire to cook recipes.
 * Cooking fails if the campfire goes out mid-cook.
 */

import cookingConfig from "@/config/game/cooking.json" with { type: "json" };
import type { FoodComponent } from "@/game/ecs/components/items";
import type { CampfireComponent, CropId } from "@/game/ecs/components/structures";

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

const COOKING_RECIPES: CookingRecipe[] = cookingConfig.recipes as CookingRecipe[];

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
export function canCook(recipe: CookingRecipe, inventory: Record<string, number>): boolean {
  return recipe.ingredients.every((ing) => (inventory[ing.cropId] ?? 0) >= ing.amount);
}

/** Find all recipes that can be cooked with current inventory. */
export function getAvailableRecipes(inventory: Record<string, number>): CookingRecipe[] {
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
export function collectCookedFood(slot: CookingSlotState): FoodComponent | null {
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

// ---------------------------------------------------------------------------
// FPS Raycast Interaction
// ---------------------------------------------------------------------------

/**
 * Minimal entity interface for campfire interaction.
 * Callers (ECS entities) satisfy this via structural typing.
 * No ECS world import — keeps this module pure and testable.
 */
export interface CampfireEntity {
  campfire: Pick<CampfireComponent, "lit" | "cookingSlots">;
}

/** Type guard — returns true if the entity has a campfire component. */
export function isCampfireEntity(entity: unknown): entity is CampfireEntity {
  return (
    typeof entity === "object" &&
    entity !== null &&
    "campfire" in entity &&
    typeof (entity as Record<string, unknown>).campfire === "object" &&
    (entity as Record<string, unknown>).campfire !== null
  );
}

/** Returns true when the campfire is lit and cooking is possible. */
export function isCampfireLit(entity: CampfireEntity): boolean {
  return entity.campfire.lit;
}

/**
 * Returns the HUD interaction label for a campfire.
 * Shown in crosshair prompt when player looks at a campfire.
 */
export function getCampfireInteractionLabel(entity: CampfireEntity): string {
  return entity.campfire.lit ? "Cook" : "Light Campfire";
}

/** Result of resolving an E-key interaction with a potential campfire entity. */
export interface CampfireInteraction {
  /** Whether the entity is a campfire at all. */
  isCampfire: boolean;
  /** Whether the campfire is currently lit. */
  isLit: boolean;
  /** Whether the player can open the cooking UI right now. */
  canCookNow: boolean;
  /** Label to display in the HUD interaction prompt. */
  interactionLabel: string;
}

/**
 * Resolves the E-key interaction for any raycast-hit entity.
 *
 * Returns `isCampfire: false` for non-campfire entities.
 * Returns `canCookNow: true` only when the campfire is lit.
 *
 * Pure function — no side effects. Callers open the cooking UI when
 * `canCookNow` is true.
 */
export function resolveCampfireInteraction(entity: unknown): CampfireInteraction {
  if (!isCampfireEntity(entity)) {
    return {
      isCampfire: false,
      isLit: false,
      canCookNow: false,
      interactionLabel: "",
    };
  }
  const lit = isCampfireLit(entity);
  return {
    isCampfire: true,
    isLit: lit,
    canCookNow: lit,
    interactionLabel: getCampfireInteractionLabel(entity),
  };
}
