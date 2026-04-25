/**
 * Pure crafting evaluator + executor.
 *
 * No DB, no audio, no scene mutations live here — the action layer
 * (`CraftingPanel.tsx`) wraps these pure functions with side-effects.
 * Keeping the loop pure means we can test "did the inventory math
 * resolve right?" without spinning a sql.js handle, and the same code
 * runs identically client-side and (later) in any deterministic
 * verification path.
 */

import type {
  CraftableStatus,
  CraftResult,
  InventorySnapshot,
  Recipe,
} from "./types";

/** Read an item count from an inventory snapshot, defaulting to zero. */
export function readCount(
  inventory: InventorySnapshot,
  itemId: string,
): number {
  return inventory.counts[itemId] ?? 0;
}

/** Whether the inventory has at least the inputs the recipe demands. */
export function hasInputs(
  inventory: InventorySnapshot,
  recipe: Recipe,
): boolean {
  for (const input of recipe.inputs) {
    if (readCount(inventory, input.itemId) < input.count) return false;
  }
  return true;
}

/** Inputs to subtract before adding the output. */
export interface EvaluateContext {
  /** The station id the player currently has open. */
  currentStation: string;
  /** Whether this recipe is in the player's known list. */
  isKnown: boolean;
}

/**
 * Compute the gating status for a recipe given the player's inventory
 * and current crafting context. Pure — no mutation.
 */
export function evaluateRecipe(
  recipe: Recipe,
  inventory: InventorySnapshot,
  ctx: EvaluateContext,
): CraftableStatus {
  if (!ctx.isKnown) return "unknown-recipe";
  if (recipe.station !== ctx.currentStation) return "wrong-station";
  if (!hasInputs(inventory, recipe)) return "missing-inputs";
  return "craftable";
}

/**
 * Execute the recipe against the inventory snapshot, returning the
 * post-craft state. Throws if the recipe isn't craftable — callers
 * must `evaluateRecipe` first (the panel does).
 *
 * Output handling:
 *   - `kind: "item"`       → output id added to inventory by `count`.
 *   - `kind: "blueprint"`  → blueprint added to inventory by `count`
 *                            (blueprints live in inventory too — that's
 *                            how the building layer finds them).
 */
export function craftRecipe(
  recipe: Recipe,
  inventory: InventorySnapshot,
  ctx: EvaluateContext,
): CraftResult {
  const status = evaluateRecipe(recipe, inventory, ctx);
  if (status !== "craftable") {
    throw new Error(
      `craftRecipe: recipe "${recipe.id}" is not craftable (status=${status})`,
    );
  }

  const next: Record<string, number> = { ...inventory.counts };
  for (const input of recipe.inputs) {
    next[input.itemId] = (next[input.itemId] ?? 0) - input.count;
    if (next[input.itemId] <= 0) delete next[input.itemId];
  }
  next[recipe.output.id] = (next[recipe.output.id] ?? 0) + recipe.output.count;

  return {
    inventory: { counts: next },
    produced: recipe.output,
  };
}
