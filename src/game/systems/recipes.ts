/**
 * Resource conversion recipes.
 * Recipes require proximity to a Market Stall or its upgrades.
 */
import type { ResourceType } from "../constants/resources";

export interface Recipe {
  id: string;
  name: string;
  description: string;
  inputs: { type: ResourceType; amount: number }[];
  outputs: { type: ResourceType; amount: number }[];
  requiredStructure?: string; // templateId of required nearby structure
}

export const RECIPES: Recipe[] = [
  {
    id: "refine-timber",
    name: "Refine Timber",
    description: "Process raw timber into premium sap",
    inputs: [{ type: "timber", amount: 20 }],
    outputs: [{ type: "sap", amount: 12 }],
  },
  {
    id: "press-fruit",
    name: "Press Fruit",
    description: "Press fruit to extract valuable sap",
    inputs: [{ type: "fruit", amount: 15 }],
    outputs: [{ type: "sap", amount: 8 }],
  },
  {
    id: "cultivate-seeds",
    name: "Cultivate Seeds",
    description: "Convert acorns into rare fruit",
    inputs: [{ type: "acorns", amount: 25 }],
    outputs: [{ type: "fruit", amount: 10 }],
  },
  {
    id: "mill-timber",
    name: "Mill Timber",
    description: "Process timber and sap into acorns",
    inputs: [
      { type: "timber", amount: 15 },
      { type: "sap", amount: 10 },
    ],
    outputs: [{ type: "acorns", amount: 12 }],
    requiredStructure: "trading-post",
  },
];

export function getRecipes(): Recipe[] {
  return [...RECIPES];
}

export function getRecipeById(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}

export function canCraft(
  recipe: Recipe,
  resources: Record<ResourceType, number>,
): boolean {
  return recipe.inputs.every(
    (input) => (resources[input.type] ?? 0) >= input.amount,
  );
}
