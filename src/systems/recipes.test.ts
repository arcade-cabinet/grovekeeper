import { describe, expect, it } from "vitest";
import { RESOURCE_TYPES, type ResourceType } from "@/config/resources";
import {
  RECIPES,
  TIER_LABELS,
  calculateCraftCost,
  canCraft,
  getRecipeById,
  getRecipes,
  getRecipesByTier,
  getRecipesForLevel,
  type Recipe,
  type RecipeTier,
} from "./recipes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResources(
  overrides: Partial<Record<ResourceType, number>> = {},
): Record<ResourceType, number> {
  return { timber: 0, sap: 0, fruit: 0, acorns: 0, ...overrides };
}

// ---------------------------------------------------------------------------
// Catalog completeness
// ---------------------------------------------------------------------------

describe("recipe catalog", () => {
  it("contains exactly 24 recipes", () => {
    expect(RECIPES).toHaveLength(24);
  });

  it("all recipe ids are unique", () => {
    const ids = RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all recipe names are unique", () => {
    const names = RECIPES.map((r) => r.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every recipe has a non-empty description", () => {
    for (const r of RECIPES) {
      expect(r.description.length).toBeGreaterThan(0);
    }
  });

  it("every recipe has at least one input", () => {
    for (const r of RECIPES) {
      expect(r.inputs.length).toBeGreaterThan(0);
    }
  });

  it("every recipe has at least one output", () => {
    for (const r of RECIPES) {
      expect(r.outputs.length).toBeGreaterThan(0);
    }
  });

  it("all input resource types are valid ResourceType values", () => {
    for (const r of RECIPES) {
      for (const input of r.inputs) {
        expect(RESOURCE_TYPES).toContain(input.type);
      }
    }
  });

  it("all resource output types are valid ResourceType values", () => {
    for (const r of RECIPES) {
      for (const output of r.outputs) {
        if (output.kind === "resource") {
          expect(RESOURCE_TYPES).toContain(output.type);
        }
      }
    }
  });

  it("all input amounts are positive integers", () => {
    for (const r of RECIPES) {
      for (const input of r.inputs) {
        expect(input.amount).toBeGreaterThan(0);
        expect(Number.isInteger(input.amount)).toBe(true);
      }
    }
  });

  it("all resource output amounts are positive integers", () => {
    for (const r of RECIPES) {
      for (const output of r.outputs) {
        if (output.kind === "resource") {
          expect(output.amount).toBeGreaterThan(0);
          expect(Number.isInteger(output.amount)).toBe(true);
        }
      }
    }
  });

  it("all seed output amounts are positive integers", () => {
    for (const r of RECIPES) {
      for (const output of r.outputs) {
        if (output.kind === "seed") {
          expect(output.amount).toBeGreaterThan(0);
          expect(Number.isInteger(output.amount)).toBe(true);
        }
      }
    }
  });

  it("all xp output amounts are positive integers", () => {
    for (const r of RECIPES) {
      for (const output of r.outputs) {
        if (output.kind === "xp") {
          expect(output.amount).toBeGreaterThan(0);
          expect(Number.isInteger(output.amount)).toBe(true);
        }
      }
    }
  });

  it("all seed outputs have a non-empty species pool", () => {
    for (const r of RECIPES) {
      for (const output of r.outputs) {
        if (output.kind === "seed") {
          expect(output.speciesPool.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("preserves the original refine-timber recipe id", () => {
    const recipe = getRecipeById("refine-timber");
    expect(recipe).toBeDefined();
    expect(recipe!.name).toBe("Wooden Plank");
  });
});

// ---------------------------------------------------------------------------
// Tier structure
// ---------------------------------------------------------------------------

describe("tier structure", () => {
  it("has 4 tier labels", () => {
    expect(Object.keys(TIER_LABELS)).toHaveLength(4);
  });

  it("tier 1 contains 6 recipes", () => {
    expect(getRecipesByTier(1)).toHaveLength(6);
  });

  it("tier 2 contains 6 recipes", () => {
    expect(getRecipesByTier(2)).toHaveLength(6);
  });

  it("tier 3 contains 6 recipes", () => {
    expect(getRecipesByTier(3)).toHaveLength(6);
  });

  it("tier 4 contains 6 recipes", () => {
    expect(getRecipesByTier(4)).toHaveLength(6);
  });

  it("tier 1 recipes require level 1-5", () => {
    for (const r of getRecipesByTier(1)) {
      expect(r.requiredLevel).toBeGreaterThanOrEqual(1);
      expect(r.requiredLevel).toBeLessThanOrEqual(5);
    }
  });

  it("tier 2 recipes require level 6-10", () => {
    for (const r of getRecipesByTier(2)) {
      expect(r.requiredLevel).toBeGreaterThanOrEqual(6);
      expect(r.requiredLevel).toBeLessThanOrEqual(10);
    }
  });

  it("tier 3 recipes require level 11-18", () => {
    for (const r of getRecipesByTier(3)) {
      expect(r.requiredLevel).toBeGreaterThanOrEqual(11);
      expect(r.requiredLevel).toBeLessThanOrEqual(18);
    }
  });

  it("tier 4 recipes require level 19-25", () => {
    for (const r of getRecipesByTier(4)) {
      expect(r.requiredLevel).toBeGreaterThanOrEqual(19);
      expect(r.requiredLevel).toBeLessThanOrEqual(25);
    }
  });

  it("every recipe tier is a valid RecipeTier (1-4)", () => {
    const validTiers: RecipeTier[] = [1, 2, 3, 4];
    for (const r of RECIPES) {
      expect(validTiers).toContain(r.tier);
    }
  });
});

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

describe("getRecipes", () => {
  it("returns all 24 recipes", () => {
    expect(getRecipes()).toHaveLength(24);
  });

  it("returns a shallow copy (not the original array)", () => {
    const a = getRecipes();
    const b = getRecipes();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

describe("getRecipeById", () => {
  it("finds a valid recipe", () => {
    const recipe = getRecipeById("refine-timber");
    expect(recipe).toBeDefined();
    expect(recipe!.id).toBe("refine-timber");
  });

  it("returns undefined for unknown id", () => {
    expect(getRecipeById("nonexistent")).toBeUndefined();
  });

  it("finds every recipe by its id", () => {
    for (const r of RECIPES) {
      expect(getRecipeById(r.id)).toBeDefined();
    }
  });
});

describe("getRecipesByTier", () => {
  it("returns only recipes of the requested tier", () => {
    const tier2 = getRecipesByTier(2);
    for (const r of tier2) {
      expect(r.tier).toBe(2);
    }
  });

  it("returns empty array for invalid tier", () => {
    expect(getRecipesByTier(99 as RecipeTier)).toHaveLength(0);
  });
});

describe("getRecipesForLevel", () => {
  it("level 1 unlocks only level-1 recipes", () => {
    const available = getRecipesForLevel(1);
    expect(available.length).toBeGreaterThan(0);
    for (const r of available) {
      expect(r.requiredLevel).toBeLessThanOrEqual(1);
    }
  });

  it("level 25 unlocks all 24 recipes", () => {
    expect(getRecipesForLevel(25)).toHaveLength(24);
  });

  it("level 10 unlocks all tier 1 and tier 2 recipes", () => {
    const available = getRecipesForLevel(10);
    const tier1 = getRecipesByTier(1);
    const tier2 = getRecipesByTier(2);
    for (const r of [...tier1, ...tier2]) {
      expect(available).toContainEqual(r);
    }
  });

  it("level 0 unlocks no recipes", () => {
    expect(getRecipesForLevel(0)).toHaveLength(0);
  });

  it("returned recipes are sorted by ascending level", () => {
    const available = getRecipesForLevel(25);
    for (let i = 1; i < available.length; i++) {
      expect(available[i].requiredLevel).toBeGreaterThanOrEqual(
        available[i - 1].requiredLevel,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// canCraft
// ---------------------------------------------------------------------------

describe("canCraft", () => {
  it("returns true with exact resources", () => {
    const recipe = getRecipeById("refine-timber")!;
    expect(canCraft(recipe, makeResources({ timber: 8 }))).toBe(true);
  });

  it("returns true with excess resources", () => {
    const recipe = getRecipeById("refine-timber")!;
    expect(canCraft(recipe, makeResources({ timber: 100 }))).toBe(true);
  });

  it("returns false with insufficient resources", () => {
    const recipe = getRecipeById("refine-timber")!;
    expect(canCraft(recipe, makeResources({ timber: 7 }))).toBe(false);
  });

  it("checks all inputs for multi-input recipes", () => {
    const recipe = getRecipeById("simple-fertilizer")!;

    // Missing acorns
    expect(canCraft(recipe, makeResources({ fruit: 5, acorns: 0 }))).toBe(false);
    // Missing fruit
    expect(canCraft(recipe, makeResources({ fruit: 0, acorns: 3 }))).toBe(false);
    // Both sufficient
    expect(canCraft(recipe, makeResources({ fruit: 5, acorns: 3 }))).toBe(true);
  });

  it("handles 3-input recipes (ancient-fertilizer)", () => {
    const recipe = getRecipeById("ancient-fertilizer")!;
    expect(recipe.inputs).toHaveLength(3);

    // All sufficient
    expect(
      canCraft(recipe, makeResources({ sap: 15, fruit: 15, timber: 15 })),
    ).toBe(true);

    // One short
    expect(
      canCraft(recipe, makeResources({ sap: 14, fruit: 15, timber: 15 })),
    ).toBe(false);
  });

  it("handles 4-input recipes (grove-blessing)", () => {
    const recipe = getRecipeById("grove-blessing")!;
    expect(recipe.inputs).toHaveLength(4);

    expect(
      canCraft(
        recipe,
        makeResources({ timber: 25, sap: 25, fruit: 25, acorns: 25 }),
      ),
    ).toBe(true);

    expect(
      canCraft(
        recipe,
        makeResources({ timber: 25, sap: 25, fruit: 25, acorns: 24 }),
      ),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// calculateCraftCost
// ---------------------------------------------------------------------------

describe("calculateCraftCost", () => {
  it("returns correct cost for single-input recipe", () => {
    const recipe = getRecipeById("refine-timber")!;
    const cost = calculateCraftCost(recipe);
    expect(cost).toEqual({ timber: 8 });
  });

  it("returns correct cost for multi-input recipe", () => {
    const recipe = getRecipeById("grove-blessing")!;
    const cost = calculateCraftCost(recipe);
    expect(cost).toEqual({ timber: 25, sap: 25, fruit: 25, acorns: 25 });
  });

  it("omits resource types not in the recipe", () => {
    const recipe = getRecipeById("fruit-preserve")!;
    const cost = calculateCraftCost(recipe);
    expect(cost).toEqual({ fruit: 8 });
    expect(cost.timber).toBeUndefined();
    expect(cost.sap).toBeUndefined();
    expect(cost.acorns).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Output type coverage
// ---------------------------------------------------------------------------

describe("output types", () => {
  it("catalog contains resource outputs", () => {
    const hasResource = RECIPES.some((r) =>
      r.outputs.some((o) => o.kind === "resource"),
    );
    expect(hasResource).toBe(true);
  });

  it("catalog contains seed outputs", () => {
    const hasSeed = RECIPES.some((r) =>
      r.outputs.some((o) => o.kind === "seed"),
    );
    expect(hasSeed).toBe(true);
  });

  it("catalog contains effect outputs", () => {
    const hasEffect = RECIPES.some((r) =>
      r.outputs.some((o) => o.kind === "effect"),
    );
    expect(hasEffect).toBe(true);
  });

  it("catalog contains xp outputs", () => {
    const hasXp = RECIPES.some((r) =>
      r.outputs.some((o) => o.kind === "xp"),
    );
    expect(hasXp).toBe(true);
  });

  it("effect outputs have valid magnitude (> 0)", () => {
    for (const r of RECIPES) {
      for (const output of r.outputs) {
        if (output.kind === "effect") {
          expect(output.magnitude).toBeGreaterThan(0);
        }
      }
    }
  });

  it("effect outputs have valid durationSec (>= -1)", () => {
    for (const r of RECIPES) {
      for (const output of r.outputs) {
        if (output.kind === "effect") {
          expect(output.durationSec).toBeGreaterThanOrEqual(-1);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Specific recipe spot checks
// ---------------------------------------------------------------------------

describe("specific recipes", () => {
  it("Wooden Plank (refine-timber) is tier 1, level 1", () => {
    const r = getRecipeById("refine-timber")!;
    expect(r.tier).toBe(1);
    expect(r.requiredLevel).toBe(1);
    expect(r.inputs).toEqual([{ type: "timber", amount: 8 }]);
    expect(r.outputs).toEqual([{ kind: "resource", type: "sap", amount: 4 }]);
  });

  it("Grove Blessing (grove-blessing) is tier 4, level 25, requires all 4 resources", () => {
    const r = getRecipeById("grove-blessing")!;
    expect(r.tier).toBe(4);
    expect(r.requiredLevel).toBe(25);
    expect(r.inputs).toHaveLength(4);
    const inputTypes = r.inputs.map((i) => i.type).sort();
    expect(inputTypes).toEqual(["acorns", "fruit", "sap", "timber"]);
  });

  it("Ancient Seed outputs a prestige seed", () => {
    const r = getRecipeById("ancient-seed")!;
    expect(r.tier).toBe(4);
    const seedOutput = r.outputs.find((o) => o.kind === "seed");
    expect(seedOutput).toBeDefined();
    if (seedOutput && seedOutput.kind === "seed") {
      expect(seedOutput.speciesPool).toContain("crystal-oak");
      expect(seedOutput.speciesPool).toContain("worldtree");
      expect(seedOutput.amount).toBe(1);
    }
  });

  it("Eternal Fertilizer has permanent duration (-1)", () => {
    const r = getRecipeById("eternal-fertilizer")!;
    const effectOutput = r.outputs.find((o) => o.kind === "effect");
    expect(effectOutput).toBeDefined();
    if (effectOutput && effectOutput.kind === "effect") {
      expect(effectOutput.effect).toBe("permanent_growth_boost");
      expect(effectOutput.durationSec).toBe(-1);
    }
  });

  it("Compost Heap requires a trading-post structure", () => {
    const r = getRecipeById("compost-heap")!;
    expect(r.requiredStructure).toBe("trading-post");
  });

  it("Sturdy Plank produces both resources and XP", () => {
    const r = getRecipeById("sturdy-plank")!;
    const kinds = r.outputs.map((o) => o.kind);
    expect(kinds).toContain("resource");
    expect(kinds).toContain("xp");
  });

  it("Basic Tonic restores stamina instantly (durationSec 0)", () => {
    const r = getRecipeById("basic-tonic")!;
    const effectOutput = r.outputs.find((o) => o.kind === "effect");
    expect(effectOutput).toBeDefined();
    if (effectOutput && effectOutput.kind === "effect") {
      expect(effectOutput.effect).toBe("stamina_restore");
      expect(effectOutput.durationSec).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Progression balance checks
// ---------------------------------------------------------------------------

describe("progression balance", () => {
  it("higher tiers have higher average input costs", () => {
    function avgInputCost(recipes: Recipe[]): number {
      let total = 0;
      let count = 0;
      for (const r of recipes) {
        for (const input of r.inputs) {
          total += input.amount;
          count++;
        }
      }
      return count === 0 ? 0 : total / count;
    }

    const t1 = avgInputCost(getRecipesByTier(1));
    const t2 = avgInputCost(getRecipesByTier(2));
    const t3 = avgInputCost(getRecipesByTier(3));
    const t4 = avgInputCost(getRecipesByTier(4));

    expect(t2).toBeGreaterThan(t1);
    expect(t3).toBeGreaterThan(t2);
    expect(t4).toBeGreaterThan(t3);
  });

  it("recipes are ordered by requiredLevel within the catalog", () => {
    for (let i = 1; i < RECIPES.length; i++) {
      expect(RECIPES[i].requiredLevel).toBeGreaterThanOrEqual(
        RECIPES[i - 1].requiredLevel,
      );
    }
  });
});
