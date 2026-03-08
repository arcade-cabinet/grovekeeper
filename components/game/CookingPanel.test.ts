/**
 * CookingPanel tests (Spec §7.3, §22)
 *
 * Tests the pure cookingPanelLogic helpers -- no React/RN import chain needed.
 */

import {
  buildAllRecipeDisplays,
  buildRecipeDisplay,
  formatCookingTime,
  formatRecipeEffect,
  getCropDisplayName,
} from "./cookingPanelLogic.ts";
import type { CookingRecipe } from "@/game/systems/cooking";

// ---------------------------------------------------------------------------
// Test recipe fixture
// ---------------------------------------------------------------------------

const ROASTED_APPLE: CookingRecipe = {
  id: "roasted-apple",
  name: "Roasted Apple",
  ingredients: [{ cropId: "apple", amount: 1 }],
  cookingTimeSec: 15,
  output: {
    foodId: "roasted-apple",
    name: "Roasted Apple",
    saturation: 25,
    healing: 1,
  },
};

const HARVEST_FEAST: CookingRecipe = {
  id: "harvest-feast",
  name: "Harvest Feast",
  ingredients: [
    { cropId: "apple", amount: 2 },
    { cropId: "pumpkin", amount: 1 },
    { cropId: "carrot", amount: 2 },
  ],
  cookingTimeSec: 60,
  output: {
    foodId: "harvest-feast",
    name: "Harvest Feast",
    saturation: 80,
    healing: 5,
  },
};

// ---------------------------------------------------------------------------
// getCropDisplayName
// ---------------------------------------------------------------------------

describe("getCropDisplayName (Spec §7.3)", () => {
  it("returns human-readable name for known crop", () => {
    expect(getCropDisplayName("apple")).toBe("Apple");
    expect(getCropDisplayName("carrot")).toBe("Carrot");
    expect(getCropDisplayName("pumpkin")).toBe("Pumpkin");
  });

  it("falls back to raw id for unknown crop", () => {
    expect(getCropDisplayName("mysterious-root")).toBe("mysterious-root");
  });
});

// ---------------------------------------------------------------------------
// buildRecipeDisplay
// ---------------------------------------------------------------------------

describe("buildRecipeDisplay (Spec §7.3)", () => {
  it("marks recipe as cookable when ingredients are sufficient", () => {
    const inventory = { apple: 5 };
    const display = buildRecipeDisplay(ROASTED_APPLE, inventory);

    expect(display.canCook).toBe(true);
    expect(display.ingredients[0].sufficient).toBe(true);
    expect(display.ingredients[0].owned).toBe(5);
    expect(display.ingredients[0].needed).toBe(1);
  });

  it("marks recipe as not cookable when ingredients are insufficient", () => {
    const inventory = { apple: 0 };
    const display = buildRecipeDisplay(ROASTED_APPLE, inventory);

    expect(display.canCook).toBe(false);
    expect(display.ingredients[0].sufficient).toBe(false);
    expect(display.ingredients[0].owned).toBe(0);
  });

  it("handles missing inventory keys as 0", () => {
    const inventory = {};
    const display = buildRecipeDisplay(ROASTED_APPLE, inventory);

    expect(display.canCook).toBe(false);
    expect(display.ingredients[0].owned).toBe(0);
  });

  it("handles multi-ingredient recipe with partial availability", () => {
    const inventory = { apple: 10, pumpkin: 0, carrot: 5 };
    const display = buildRecipeDisplay(HARVEST_FEAST, inventory);

    expect(display.canCook).toBe(false);
    expect(display.ingredients[0].sufficient).toBe(true); // apple: 10 >= 2
    expect(display.ingredients[1].sufficient).toBe(false); // pumpkin: 0 < 1
    expect(display.ingredients[2].sufficient).toBe(true); // carrot: 5 >= 2
  });

  it("extracts saturation and healing from recipe output", () => {
    const display = buildRecipeDisplay(HARVEST_FEAST, {});

    expect(display.saturation).toBe(80);
    expect(display.healing).toBe(5);
    expect(display.cookingTimeSec).toBe(60);
  });

  it("preserves recipe id and name", () => {
    const display = buildRecipeDisplay(ROASTED_APPLE, {});

    expect(display.id).toBe("roasted-apple");
    expect(display.name).toBe("Roasted Apple");
  });
});

// ---------------------------------------------------------------------------
// buildAllRecipeDisplays
// ---------------------------------------------------------------------------

describe("buildAllRecipeDisplays (Spec §7.3)", () => {
  it("returns displays for all cooking recipes", () => {
    const displays = buildAllRecipeDisplays({});

    // cooking.json has 10 recipes
    expect(displays.length).toBe(10);
  });

  it("sorts cookable recipes before non-cookable", () => {
    // Give enough of everything to cook "Roasted Apple" (1 apple) but not others
    const inventory = { apple: 1, carrot: 0, cucumber: 0, pumpkin: 0, tomato: 0 };
    const displays = buildAllRecipeDisplays(inventory);

    const firstCookable = displays.findIndex((d) => d.canCook);
    const lastCookable = displays.findLastIndex((d) => d.canCook);
    const firstNotCookable = displays.findIndex((d) => !d.canCook);

    // All cookable recipes should come before non-cookable
    if (firstCookable !== -1 && firstNotCookable !== -1) {
      expect(lastCookable).toBeLessThan(firstNotCookable);
    }
  });

  it("sorts alphabetically within cookable group", () => {
    // All recipes cookable
    const inventory = { apple: 99, carrot: 99, cucumber: 99, pumpkin: 99, tomato: 99 };
    const displays = buildAllRecipeDisplays(inventory);

    for (let i = 1; i < displays.length; i++) {
      expect(displays[i - 1].name.localeCompare(displays[i].name)).toBeLessThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
// formatCookingTime
// ---------------------------------------------------------------------------

describe("formatCookingTime (Spec §7.3)", () => {
  it("formats seconds-only", () => {
    expect(formatCookingTime(15)).toBe("15s");
    expect(formatCookingTime(45)).toBe("45s");
  });

  it("formats minutes and seconds", () => {
    expect(formatCookingTime(90)).toBe("1m 30s");
  });

  it("formats even minutes without seconds", () => {
    expect(formatCookingTime(60)).toBe("1m");
    expect(formatCookingTime(120)).toBe("2m");
  });
});

// ---------------------------------------------------------------------------
// formatRecipeEffect
// ---------------------------------------------------------------------------

describe("formatRecipeEffect (Spec §7.3)", () => {
  it("formats saturation and healing", () => {
    expect(formatRecipeEffect(25, 1)).toBe("+25 hunger, +1 heart");
  });

  it("pluralizes hearts for values > 1", () => {
    expect(formatRecipeEffect(80, 5)).toBe("+80 hunger, +5 hearts");
  });

  it("omits saturation when 0", () => {
    expect(formatRecipeEffect(0, 2)).toBe("+2 hearts");
  });

  it("omits healing when 0", () => {
    expect(formatRecipeEffect(30, 0)).toBe("+30 hunger");
  });

  it("returns empty string when both are 0", () => {
    expect(formatRecipeEffect(0, 0)).toBe("");
  });
});
