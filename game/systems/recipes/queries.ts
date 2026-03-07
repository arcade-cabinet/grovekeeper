import type { ResourceType } from "@/game/config/resources";
import { RECIPES } from "./catalog";
import type { Recipe } from "./types";

export function getRecipesForLevel(level: number): Recipe[] {
  return RECIPES.filter((r) => r.requiredLevel <= level);
}

export function canCraft(recipe: Recipe, resources: Record<ResourceType, number>): boolean {
  return recipe.inputs.every((input) => (resources[input.type] ?? 0) >= input.amount);
}

export function calculateCraftCost(recipe: Recipe): Partial<Record<ResourceType, number>> {
  const cost: Partial<Record<ResourceType, number>> = {};
  for (const input of recipe.inputs) {
    cost[input.type] = (cost[input.type] ?? 0) + input.amount;
  }
  return cost;
}
