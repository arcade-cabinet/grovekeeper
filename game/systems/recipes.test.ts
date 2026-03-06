import type { ResourceType } from "@/game/config/resources";
import {
  calculateCraftCost,
  canCraft,
  getRecipeById,
  getRecipes,
  getRecipesByTier,
  getRecipesForLevel,
  RECIPES,
} from "./recipes";

describe("recipes system", () => {
  describe("RECIPES catalog", () => {
    it("has 24 recipes total", () => {
      expect(RECIPES).toHaveLength(24);
    });

    it("has unique IDs for every recipe", () => {
      const ids = RECIPES.map((r) => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("covers all 4 tiers", () => {
      const tiers = new Set(RECIPES.map((r) => r.tier));
      expect(tiers).toEqual(new Set([1, 2, 3, 4]));
    });
  });

  describe("getRecipes", () => {
    it("returns a copy of the recipes array", () => {
      const recipes = getRecipes();
      expect(recipes).toEqual(RECIPES);
      expect(recipes).not.toBe(RECIPES);
    });
  });

  describe("getRecipeById", () => {
    it("finds an existing recipe", () => {
      const recipe = getRecipeById("refine-timber");
      expect(recipe).toBeDefined();
      expect(recipe!.name).toBe("Wooden Plank");
    });

    it("returns undefined for a non-existent recipe", () => {
      expect(getRecipeById("does-not-exist")).toBeUndefined();
    });
  });

  describe("getRecipesByTier", () => {
    it("returns tier 1 recipes (6 recipes)", () => {
      const tier1 = getRecipesByTier(1);
      expect(tier1).toHaveLength(6);
      expect(tier1.every((r) => r.tier === 1)).toBe(true);
    });

    it("returns tier 2 recipes (6 recipes)", () => {
      const tier2 = getRecipesByTier(2);
      expect(tier2).toHaveLength(6);
      expect(tier2.every((r) => r.tier === 2)).toBe(true);
    });

    it("returns tier 3 recipes (6 recipes)", () => {
      const tier3 = getRecipesByTier(3);
      expect(tier3).toHaveLength(6);
    });

    it("returns tier 4 recipes (6 recipes)", () => {
      const tier4 = getRecipesByTier(4);
      expect(tier4).toHaveLength(6);
    });
  });

  describe("getRecipesForLevel", () => {
    it("returns only level 1 recipes for level 1", () => {
      const recipes = getRecipesForLevel(1);
      expect(recipes.length).toBeGreaterThan(0);
      expect(recipes.every((r) => r.requiredLevel <= 1)).toBe(true);
    });

    it("returns more recipes at higher levels", () => {
      const level1 = getRecipesForLevel(1);
      const level10 = getRecipesForLevel(10);
      expect(level10.length).toBeGreaterThan(level1.length);
    });

    it("returns all recipes at level 25", () => {
      const allRecipes = getRecipesForLevel(25);
      expect(allRecipes).toHaveLength(24);
    });

    it("returns empty for level 0", () => {
      expect(getRecipesForLevel(0)).toHaveLength(0);
    });
  });

  describe("canCraft", () => {
    const makeResources = (
      overrides: Partial<Record<ResourceType, number>> = {},
    ): Record<ResourceType, number> => ({
      timber: 0,
      sap: 0,
      fruit: 0,
      acorns: 0,
      ...overrides,
    });

    it("returns true when player has enough resources", () => {
      const recipe = getRecipeById("refine-timber")!; // needs 8 timber
      expect(canCraft(recipe, makeResources({ timber: 10 }))).toBe(true);
    });

    it("returns true with exactly matching resources", () => {
      const recipe = getRecipeById("refine-timber")!;
      expect(canCraft(recipe, makeResources({ timber: 8 }))).toBe(true);
    });

    it("returns false when player lacks resources", () => {
      const recipe = getRecipeById("refine-timber")!;
      expect(canCraft(recipe, makeResources({ timber: 7 }))).toBe(false);
    });

    it("checks all inputs for multi-input recipes", () => {
      const recipe = getRecipeById("simple-fertilizer")!; // 5 fruit + 3 acorns
      expect(canCraft(recipe, makeResources({ fruit: 5, acorns: 3 }))).toBe(
        true,
      );
      expect(canCraft(recipe, makeResources({ fruit: 5, acorns: 2 }))).toBe(
        false,
      );
      expect(canCraft(recipe, makeResources({ fruit: 4, acorns: 3 }))).toBe(
        false,
      );
    });
  });

  describe("calculateCraftCost", () => {
    it("returns cost map for single-input recipe", () => {
      const recipe = getRecipeById("refine-timber")!;
      expect(calculateCraftCost(recipe)).toEqual({ timber: 8 });
    });

    it("returns cost map for multi-input recipe", () => {
      const recipe = getRecipeById("simple-fertilizer")!;
      expect(calculateCraftCost(recipe)).toEqual({ fruit: 5, acorns: 3 });
    });

    it("returns cost map for 4-input recipe", () => {
      const recipe = getRecipeById("alchemists-brew")!;
      expect(calculateCraftCost(recipe)).toEqual({
        sap: 30,
        fruit: 25,
        timber: 15,
        acorns: 15,
      });
    });
  });
});
