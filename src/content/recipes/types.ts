/**
 * Recipe content schema — the JSON payload shape under
 * `src/content/recipes/recipes.json`.
 *
 * A recipe is declarative data: inputs (counted item ids) → output
 * (item or blueprint, with a count). The runtime crafting layer
 * (`src/game/crafting/`) consumes this shape; content authors edit
 * JSON, never code.
 *
 * Spec ref: §"Crafting" — "Recipe data lives in `src/content/recipes/*.json`,
 * biome-tagged. A recipe specifies: input materials and counts, station
 * type required, output (item or blueprint), unlock condition (always,
 * or 'after first claim', or 'after discovering biome X'). Recipes are
 * scope-locked to assets in the RC inventory."
 */

import type { BiomeId } from "@/game/world";

/** A single ingredient: a material/item id + how many of it the recipe burns. */
export interface RecipeInput {
  /** Item id consumed, e.g. "material.log". */
  itemId: string;
  /** Quantity required. Must be > 0. */
  count: number;
}

/** Discriminated union — recipe outputs are either consumable items or blueprints. */
export type RecipeOutput =
  | {
      kind: "item";
      /** Item id added to inventory, e.g. "item.axe". */
      id: string;
      /** Quantity produced per craft. */
      count: number;
    }
  | {
      kind: "blueprint";
      /** Blueprint id, e.g. "blueprint.hearth". Convention: prefix `blueprint.`. */
      id: string;
      /** Quantity produced per craft (usually 1). */
      count: number;
    };

/** Unlock gating — when a recipe shows up in the player's known list. */
export type RecipeUnlock =
  /** Recipe is known the moment the world begins. */
  | "always"
  /** Recipe is unlocked after the player claims their first grove. */
  | "after-claim"
  /** Recipe is unlocked after the player discovers a specific biome (e.g. "biome:coast"). */
  | `biome:${BiomeId}`;

/**
 * A single recipe definition. Every field except `biome` is required;
 * `biome` tags a recipe to a particular biome's flavor for sorting /
 * future biome-station gating.
 */
export interface Recipe {
  /** Stable id, e.g. "recipe.hearth". Used as the persistence key. */
  id: string;
  /** Human-readable label for the crafting surface. */
  name: string;
  /** Station id this recipe requires (e.g. "primitive-workbench"). */
  station: string;
  /** Materials consumed per craft. */
  inputs: RecipeInput[];
  /** What the recipe produces. */
  output: RecipeOutput;
  /** Optional biome tag for sorting / future gating. */
  biome?: BiomeId;
  /** When the recipe becomes known. Default "always" if omitted in JSON. */
  unlock?: RecipeUnlock;
  /** Optional one-line description shown in the crafting surface. */
  description?: string;
}
