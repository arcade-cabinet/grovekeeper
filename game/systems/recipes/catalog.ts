/** Assembles all 24 recipes into the RECIPES catalog. */
import type { Recipe, RecipeTier } from "./types";
import { TIER_1_RECIPES, TIER_2_RECIPES } from "./tier12";
import { TIER_3_RECIPES, TIER_4_RECIPES } from "./tier34";

export const RECIPES: Recipe[] = [
  ...TIER_1_RECIPES,
  ...TIER_2_RECIPES,
  ...TIER_3_RECIPES,
  ...TIER_4_RECIPES,
];

export function getRecipes(): Recipe[] {
  return [...RECIPES];
}

export function getRecipeById(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}

export function getRecipesByTier(tier: RecipeTier): Recipe[] {
  return RECIPES.filter((r) => r.tier === tier);
}
