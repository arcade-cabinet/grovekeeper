/**
 * Crafting module barrel.
 *
 * Public API exposed to the rest of the game:
 *   - The `Recipe` shape and `CraftableStatus` enum.
 *   - The recipe registry (id lookup + station filtering).
 *   - The pure `evaluateRecipe` / `craftRecipe` functions.
 *   - The `placeStructure` action helper that bridges the registry to
 *     the persistence repos. (See `placeMode.ts` for the building
 *     half.)
 */

export {
  craftRecipe,
  type EvaluateContext,
  evaluateRecipe,
  hasInputs,
  readCount,
} from "./craft";
export {
  getRecipe,
  isKnownStation,
  KNOWN_STATIONS,
  type KnownStation,
  listAllRecipes,
  listRecipesForStation,
} from "./recipeRegistry";
export type {
  CraftableStatus,
  CraftResult,
  InventorySnapshot,
  Recipe,
  RecipeInput,
  RecipeOutput,
  RecipeUnlock,
} from "./types";
