/**
 * Crafting runtime types — the runtime façade over `@/content/recipes`.
 *
 * Re-exports the content `Recipe` + introduces gameplay-side enums like
 * `CraftableStatus` (the four states a recipe can be in for the
 * crafting surface).
 */

import type {
  Recipe,
  RecipeInput,
  RecipeOutput,
  RecipeUnlock,
} from "@/content/recipes";

export type { Recipe, RecipeInput, RecipeOutput, RecipeUnlock };

/**
 * Whether the crafting surface should let the player click a recipe.
 *
 * - `craftable`        — the player has all inputs and the right station, click is live.
 * - `missing-inputs`   — station is right but the inputs are insufficient.
 * - `unknown-recipe`   — recipe exists but the player hasn't unlocked it yet.
 *                        (The crafting panel filters these out before
 *                        rendering, but the evaluator can still surface
 *                        the status for debug overlays.)
 * - `wrong-station`    — recipe requires a different station id than the
 *                        one currently open.
 */
export type CraftableStatus =
  | "craftable"
  | "missing-inputs"
  | "unknown-recipe"
  | "wrong-station";

/**
 * Snapshot of the player's inventory passed to `craft.ts` evaluators.
 *
 * Pure data — no DB handle. The persistence layer wraps the pure
 * functions with `inventoryRepo` calls; the pure functions stay
 * testable without a SQLite handle.
 */
export interface InventorySnapshot {
  /** Map of item id → count. Missing keys = zero. */
  counts: Readonly<Record<string, number>>;
}

/** Result of a successful craft — the new inventory state + the produced output. */
export interface CraftResult {
  /** Updated inventory snapshot (inputs subtracted, output added if it's an item). */
  inventory: InventorySnapshot;
  /** What was produced — same shape as the recipe's `output` field. */
  produced: RecipeOutput;
}
