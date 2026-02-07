import { describe, it, expect } from "vitest";
import { getRecipes, getRecipeById, canCraft } from "./recipes";
import type { ResourceType } from "../constants/resources";

describe("recipes", () => {
  it("getRecipes returns 4 recipes", () => {
    const recipes = getRecipes();
    expect(recipes).toHaveLength(4);
  });

  it("getRecipeById finds valid recipe", () => {
    const recipe = getRecipeById("refine-timber");
    expect(recipe).toBeDefined();
    expect(recipe!.name).toBe("Refine Timber");
  });

  it("getRecipeById returns undefined for unknown", () => {
    const recipe = getRecipeById("nonexistent");
    expect(recipe).toBeUndefined();
  });

  it("canCraft returns true with sufficient resources", () => {
    const recipe = getRecipeById("refine-timber")!;
    const resources: Record<ResourceType, number> = {
      timber: 20,
      sap: 0,
      fruit: 0,
      acorns: 0,
    };
    expect(canCraft(recipe, resources)).toBe(true);
  });

  it("canCraft returns false with insufficient resources", () => {
    const recipe = getRecipeById("refine-timber")!;
    const resources: Record<ResourceType, number> = {
      timber: 10,
      sap: 0,
      fruit: 0,
      acorns: 0,
    };
    expect(canCraft(recipe, resources)).toBe(false);
  });

  it("canCraft checks all inputs for multi-input recipes", () => {
    const recipe = getRecipeById("mill-timber")!;

    // Enough timber but not enough sap
    const insufficientSap: Record<ResourceType, number> = {
      timber: 15,
      sap: 5,
      fruit: 0,
      acorns: 0,
    };
    expect(canCraft(recipe, insufficientSap)).toBe(false);

    // Enough sap but not enough timber
    const insufficientTimber: Record<ResourceType, number> = {
      timber: 5,
      sap: 10,
      fruit: 0,
      acorns: 0,
    };
    expect(canCraft(recipe, insufficientTimber)).toBe(false);

    // Enough of both
    const sufficient: Record<ResourceType, number> = {
      timber: 15,
      sap: 10,
      fruit: 0,
      acorns: 0,
    };
    expect(canCraft(recipe, sufficient)).toBe(true);
  });
});
