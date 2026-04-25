/**
 * Recipe content barrel — re-exports the recipe schema and the JSON
 * data so callers can write `import recipes from "@/content/recipes"`
 * (default JSON) or `import { Recipe } from "@/content/recipes"` (type).
 */

import recipesJson from "./recipes.json";

export type { Recipe, RecipeInput, RecipeOutput, RecipeUnlock } from "./types";

/**
 * Raw recipe array as authored in `recipes.json`. The runtime registry
 * in `@/game/crafting/recipeRegistry.ts` is the consumer that validates
 * shape + indexes by id.
 */
export const RECIPES_JSON = recipesJson as ReadonlyArray<unknown>;
