/**
 * Recipe registry tests — verify the JSON content parses cleanly,
 * every recipe references known items / stations, and lookup helpers
 * resolve as documented.
 */

import { describe, expect, it } from "vitest";
import {
  getRecipe,
  isKnownStation,
  KNOWN_STATIONS,
  listAllRecipes,
  listRecipesForStation,
} from "./recipeRegistry";

describe("recipeRegistry", () => {
  it("loads at least the RC starter set of recipes", () => {
    const recipes = listAllRecipes();
    // The spec calls out hearth, starter weapon, fence, cooking fire,
    // planks. The registry can ship more but never fewer.
    expect(recipes.length).toBeGreaterThanOrEqual(5);
  });

  it("every recipe id is unique and starts with `recipe.`", () => {
    const recipes = listAllRecipes();
    const ids = new Set<string>();
    for (const r of recipes) {
      expect(r.id.startsWith("recipe.")).toBe(true);
      expect(ids.has(r.id)).toBe(false);
      ids.add(r.id);
    }
  });

  it("every recipe has at least one input with positive count", () => {
    for (const recipe of listAllRecipes()) {
      expect(recipe.inputs.length).toBeGreaterThan(0);
      for (const input of recipe.inputs) {
        expect(input.count).toBeGreaterThan(0);
        expect(
          input.itemId.startsWith("material.") ||
            input.itemId.startsWith("item."),
        ).toBe(true);
      }
    }
  });

  it("every recipe's output has a positive count and a namespaced id", () => {
    for (const recipe of listAllRecipes()) {
      expect(recipe.output.count).toBeGreaterThan(0);
      if (recipe.output.kind === "blueprint") {
        expect(recipe.output.id.startsWith("blueprint.")).toBe(true);
      } else {
        expect(
          recipe.output.id.startsWith("material.") ||
            recipe.output.id.startsWith("item."),
        ).toBe(true);
      }
    }
  });

  it("every recipe's station is one this build acknowledges", () => {
    for (const recipe of listAllRecipes()) {
      expect(isKnownStation(recipe.station)).toBe(true);
    }
  });

  it("ships the spec-named recipes (hearth, starter-axe, fence, cooking fire, planks)", () => {
    expect(getRecipe("recipe.hearth")).not.toBeNull();
    expect(getRecipe("recipe.starter-axe")).not.toBeNull();
    expect(getRecipe("recipe.fence-section")).not.toBeNull();
    expect(getRecipe("recipe.cooking-fire")).not.toBeNull();
    expect(getRecipe("recipe.planks")).not.toBeNull();
  });

  it("hearth recipe consumes 3 logs + 2 stones, produces a blueprint", () => {
    const hearth = getRecipe("recipe.hearth");
    expect(hearth).not.toBeNull();
    if (!hearth) return;
    const logs = hearth.inputs.find((i) => i.itemId === "material.log");
    const stones = hearth.inputs.find((i) => i.itemId === "material.stone");
    expect(logs?.count).toBe(3);
    expect(stones?.count).toBe(2);
    expect(hearth.output.kind).toBe("blueprint");
    expect(hearth.output.id).toBe("blueprint.hearth");
  });

  it("listRecipesForStation filters by station id", () => {
    const all = listAllRecipes();
    const workbenchRecipes = listRecipesForStation("primitive-workbench");
    expect(workbenchRecipes.length).toBeGreaterThan(0);
    expect(
      workbenchRecipes.every((r) => r.station === "primitive-workbench"),
    ).toBe(true);
    // Sanity: an unknown station yields zero recipes.
    expect(listRecipesForStation("nonexistent-station").length).toBe(0);
    // The total can never exceed the all-recipes total.
    expect(workbenchRecipes.length).toBeLessThanOrEqual(all.length);
  });

  it("KNOWN_STATIONS includes the primitive workbench", () => {
    expect(KNOWN_STATIONS).toContain("primitive-workbench");
  });
});
