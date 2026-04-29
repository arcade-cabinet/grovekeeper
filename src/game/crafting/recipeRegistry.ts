/**
 * Recipe registry — boots the JSON content from `@/content/recipes`
 * into a typed map indexed by id, validating shape at module load.
 *
 * The validation is intentionally narrow: we check the JSON parses to
 * the runtime `Recipe` shape, ids are unique, and inputs/output use
 * the project's namespacing conventions (`material.*`, `item.*`,
 * `blueprint.*`). Deeper "every itemId references a real renderable
 * thing" coverage lives in `recipeRegistry.test.ts` so authors get a
 * test failure rather than a runtime throw if they ship a typo.
 */

import { RECIPES_JSON } from "@/content/recipes";
import type { Recipe } from "./types";

/** RC scope: one station. Forest/coast variants are post-RC. */
export const KNOWN_STATIONS = ["primitive-workbench"] as const;
export type KnownStation = (typeof KNOWN_STATIONS)[number];

/** Naming-convention prefixes the registry validates against. */
const VALID_INPUT_PREFIXES = ["material.", "item."] as const;
const VALID_ITEM_OUTPUT_PREFIXES = ["material.", "item."] as const;
const VALID_BLUEPRINT_OUTPUT_PREFIX = "blueprint.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Cast + validate one raw JSON entry to a `Recipe`. Throws with a
 * pinpoint message on shape failure — load-time so the error is loud.
 */
function parseRecipe(raw: unknown, index: number): Recipe {
  if (!isRecord(raw)) {
    throw new Error(`recipes.json[${index}]: not an object`);
  }
  const id = raw.id;
  const name = raw.name;
  const station = raw.station;
  const inputs = raw.inputs;
  const output = raw.output;
  const unlock = raw.unlock;
  const biome = raw.biome;
  const description = raw.description;

  if (typeof id !== "string" || !id.startsWith("recipe.")) {
    throw new Error(
      `recipes.json[${index}]: id must be a string starting with "recipe."`,
    );
  }
  if (typeof name !== "string" || name.length === 0) {
    throw new Error(
      `recipes.json[${index}] (${id}): name must be non-empty string`,
    );
  }
  if (typeof station !== "string" || station.length === 0) {
    throw new Error(
      `recipes.json[${index}] (${id}): station must be non-empty string`,
    );
  }
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new Error(
      `recipes.json[${index}] (${id}): inputs must be a non-empty array`,
    );
  }
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    if (!isRecord(input)) {
      throw new Error(
        `recipes.json[${index}] (${id}): inputs[${i}] not an object`,
      );
    }
    if (typeof input.itemId !== "string") {
      throw new Error(
        `recipes.json[${index}] (${id}): inputs[${i}].itemId must be a string`,
      );
    }
    if (
      !VALID_INPUT_PREFIXES.some((prefix) =>
        (input.itemId as string).startsWith(prefix),
      )
    ) {
      throw new Error(
        `recipes.json[${index}] (${id}): inputs[${i}].itemId "${input.itemId}" must start with one of ${VALID_INPUT_PREFIXES.join(", ")}`,
      );
    }
    if (typeof input.count !== "number" || input.count <= 0) {
      throw new Error(
        `recipes.json[${index}] (${id}): inputs[${i}].count must be a positive number`,
      );
    }
  }

  if (!isRecord(output)) {
    throw new Error(`recipes.json[${index}] (${id}): output must be an object`);
  }
  if (output.kind !== "item" && output.kind !== "blueprint") {
    throw new Error(
      `recipes.json[${index}] (${id}): output.kind must be "item" or "blueprint"`,
    );
  }
  if (typeof output.id !== "string") {
    throw new Error(
      `recipes.json[${index}] (${id}): output.id must be a string`,
    );
  }
  if (output.kind === "item") {
    if (
      !VALID_ITEM_OUTPUT_PREFIXES.some((prefix) =>
        (output.id as string).startsWith(prefix),
      )
    ) {
      throw new Error(
        `recipes.json[${index}] (${id}): item output id "${output.id}" must start with one of ${VALID_ITEM_OUTPUT_PREFIXES.join(", ")}`,
      );
    }
  } else {
    if (!(output.id as string).startsWith(VALID_BLUEPRINT_OUTPUT_PREFIX)) {
      throw new Error(
        `recipes.json[${index}] (${id}): blueprint output id "${output.id}" must start with "${VALID_BLUEPRINT_OUTPUT_PREFIX}"`,
      );
    }
  }
  if (typeof output.count !== "number" || output.count <= 0) {
    throw new Error(
      `recipes.json[${index}] (${id}): output.count must be a positive number`,
    );
  }

  if (
    unlock !== undefined &&
    unlock !== "always" &&
    unlock !== "after-claim" &&
    !(typeof unlock === "string" && unlock.startsWith("biome:"))
  ) {
    throw new Error(
      `recipes.json[${index}] (${id}): unlock must be "always" | "after-claim" | "biome:<id>"`,
    );
  }

  return {
    id,
    name,
    station,
    inputs: inputs as Recipe["inputs"],
    output: output as Recipe["output"],
    biome: biome as Recipe["biome"],
    unlock: (unlock as Recipe["unlock"]) ?? "always",
    description: typeof description === "string" ? description : undefined,
  };
}

const RECIPES: Recipe[] = (() => {
  const seenIds = new Set<string>();
  const parsed: Recipe[] = [];
  for (let i = 0; i < RECIPES_JSON.length; i++) {
    const recipe = parseRecipe(RECIPES_JSON[i], i);
    if (seenIds.has(recipe.id)) {
      throw new Error(`recipes.json: duplicate recipe id "${recipe.id}"`);
    }
    seenIds.add(recipe.id);
    parsed.push(recipe);
  }
  return parsed;
})();

const BY_ID: ReadonlyMap<string, Recipe> = new Map(
  RECIPES.map((r) => [r.id, r]),
);

/** Resolve a recipe by id. Returns null when missing (e.g. removed from JSON). */
export function getRecipe(id: string): Recipe | null {
  return BY_ID.get(id) ?? null;
}

/** All recipes, in JSON order. */
export function listAllRecipes(): readonly Recipe[] {
  return RECIPES;
}

/** Recipes whose `station` matches the given station id. */
export function listRecipesForStation(stationId: string): readonly Recipe[] {
  return RECIPES.filter((r) => r.station === stationId);
}

/** Whether the given station id is one this build knows about. */
export function isKnownStation(stationId: string): stationId is KnownStation {
  return (KNOWN_STATIONS as readonly string[]).includes(stationId);
}
