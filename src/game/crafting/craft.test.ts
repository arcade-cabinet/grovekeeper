/**
 * Pure crafting evaluator tests — no DB, no audio, no scene mutation.
 * The point is to make sure the recipe math (subtract inputs, add
 * output) and the gating enum work correctly for every transition.
 */

import { describe, expect, it } from "vitest";
import {
  craftRecipe,
  evaluateRecipe,
  hasInputs,
  type Recipe,
  readCount,
} from "./index";
import { getRecipe } from "./recipeRegistry";

const HEARTH = getRecipe("recipe.hearth");
const PLANKS = getRecipe("recipe.planks");
const AXE = getRecipe("recipe.starter-axe");

if (!HEARTH || !PLANKS || !AXE) {
  throw new Error(
    "Test fixture: expected recipe.hearth, recipe.planks, recipe.starter-axe to be registered",
  );
}

const KNOWN_CTX = (recipe: Recipe) => ({
  currentStation: recipe.station,
  isKnown: true,
});

describe("readCount", () => {
  it("returns zero for missing item ids", () => {
    expect(readCount({ counts: {} }, "material.log")).toBe(0);
  });
  it("returns the persisted count for present item ids", () => {
    expect(readCount({ counts: { "material.log": 3 } }, "material.log")).toBe(
      3,
    );
  });
});

describe("hasInputs", () => {
  it("is true when the inventory satisfies the recipe", () => {
    expect(
      hasInputs({ counts: { "material.log": 3, "material.stone": 2 } }, HEARTH),
    ).toBe(true);
  });
  it("is false when any single input is short", () => {
    expect(
      hasInputs({ counts: { "material.log": 3, "material.stone": 1 } }, HEARTH),
    ).toBe(false);
    expect(hasInputs({ counts: { "material.log": 0 } }, HEARTH)).toBe(false);
  });
});

describe("evaluateRecipe", () => {
  it("returns 'craftable' when all inputs are present + station + known", () => {
    expect(
      evaluateRecipe(
        HEARTH,
        { counts: { "material.log": 5, "material.stone": 3 } },
        KNOWN_CTX(HEARTH),
      ),
    ).toBe("craftable");
  });
  it("returns 'missing-inputs' when any input is short", () => {
    expect(
      evaluateRecipe(
        HEARTH,
        { counts: { "material.log": 1, "material.stone": 2 } },
        KNOWN_CTX(HEARTH),
      ),
    ).toBe("missing-inputs");
  });
  it("returns 'wrong-station' when the open station doesn't match", () => {
    expect(
      evaluateRecipe(
        HEARTH,
        { counts: { "material.log": 5, "material.stone": 3 } },
        { currentStation: "different-bench", isKnown: true },
      ),
    ).toBe("wrong-station");
  });
  it("returns 'unknown-recipe' when the recipe isn't in the player's known list", () => {
    expect(
      evaluateRecipe(
        HEARTH,
        { counts: { "material.log": 5, "material.stone": 3 } },
        { currentStation: HEARTH.station, isKnown: false },
      ),
    ).toBe("unknown-recipe");
  });
});

describe("craftRecipe", () => {
  it("subtracts each input from the inventory", () => {
    const result = craftRecipe(
      HEARTH,
      { counts: { "material.log": 5, "material.stone": 3 } },
      KNOWN_CTX(HEARTH),
    );
    expect(result.inventory.counts["material.log"]).toBe(2);
    expect(result.inventory.counts["material.stone"]).toBe(1);
  });

  it("adds an `item` output to the inventory", () => {
    const result = craftRecipe(
      AXE,
      { counts: { "material.log": 1, "material.stone": 1 } },
      KNOWN_CTX(AXE),
    );
    expect(result.produced.kind).toBe("item");
    expect(result.produced.id).toBe("item.axe");
    expect(result.inventory.counts["item.axe"]).toBe(1);
    // Inputs should be exhausted (count 0 → key removed).
    expect(result.inventory.counts["material.log"] ?? 0).toBe(0);
    expect(result.inventory.counts["material.stone"] ?? 0).toBe(0);
  });

  it("adds a `blueprint` output to the inventory", () => {
    const result = craftRecipe(
      HEARTH,
      { counts: { "material.log": 3, "material.stone": 2 } },
      KNOWN_CTX(HEARTH),
    );
    expect(result.produced.kind).toBe("blueprint");
    expect(result.produced.id).toBe("blueprint.hearth");
    expect(result.inventory.counts["blueprint.hearth"]).toBe(1);
  });

  it("multiplies the output by the recipe's count (planks: 1 log → 4 planks)", () => {
    const result = craftRecipe(
      PLANKS,
      { counts: { "material.log": 1 } },
      KNOWN_CTX(PLANKS),
    );
    expect(result.inventory.counts["material.plank"]).toBe(4);
  });

  it("throws when the recipe is not craftable", () => {
    expect(() =>
      craftRecipe(HEARTH, { counts: { "material.log": 0 } }, KNOWN_CTX(HEARTH)),
    ).toThrow();
  });

  it("does not mutate the input inventory", () => {
    const inv = { counts: { "material.log": 3, "material.stone": 2 } };
    craftRecipe(HEARTH, inv, KNOWN_CTX(HEARTH));
    // Original counts unchanged.
    expect(inv.counts["material.log"]).toBe(3);
    expect(inv.counts["material.stone"]).toBe(2);
  });

  it("preserves unrelated inventory entries", () => {
    const result = craftRecipe(
      AXE,
      {
        counts: {
          "material.log": 1,
          "material.stone": 1,
          "material.plank": 7,
        },
      },
      KNOWN_CTX(AXE),
    );
    expect(result.inventory.counts["material.plank"]).toBe(7);
  });
});
