/**
 * Cooking system tests.
 */
import {
  advanceCooking,
  canCook,
  collectCookedFood,
  createEmptyCookingSlot,
  deductIngredients,
  getAvailableRecipes,
  getCampfireInteractionLabel,
  getCookingRecipeById,
  getCookingRecipes,
  isCampfireEntity,
  isCampfireLit,
  resolveCampfireInteraction,
  startCooking,
} from "@/game/systems/cooking";

describe("Cooking System", () => {
  describe("Config accessors", () => {
    it("should load all cooking recipes from config", () => {
      const recipes = getCookingRecipes();
      expect(recipes).toHaveLength(10);
    });

    it("should find a recipe by id", () => {
      const recipe = getCookingRecipeById("roasted-apple");
      expect(recipe).toBeDefined();
      expect(recipe?.name).toBe("Roasted Apple");
    });

    it("should return undefined for unknown recipe", () => {
      expect(getCookingRecipeById("unknown")).toBeUndefined();
    });
  });

  describe("Recipe matching", () => {
    it("should check if player has enough ingredients", () => {
      const recipe = getCookingRecipeById("roasted-apple")!;
      expect(canCook(recipe, { apple: 5 })).toBe(true);
      expect(canCook(recipe, { apple: 0 })).toBe(false);
      expect(canCook(recipe, {})).toBe(false);
    });

    it("should find available recipes based on inventory", () => {
      const available = getAvailableRecipes({
        apple: 10,
        carrot: 10,
        cucumber: 10,
        pumpkin: 10,
        tomato: 10,
      });
      expect(available.length).toBeGreaterThan(0);
    });

    it("should return empty array for empty inventory", () => {
      expect(getAvailableRecipes({})).toHaveLength(0);
    });
  });

  describe("Ingredient deduction", () => {
    it("should deduct ingredients from inventory", () => {
      const recipe = getCookingRecipeById("roasted-apple")!;
      const result = deductIngredients(recipe, { apple: 5, carrot: 3 });
      expect(result.apple).toBe(4);
      expect(result.carrot).toBe(3);
    });
  });

  describe("Cooking progress", () => {
    it("should create an empty cooking slot", () => {
      const slot = createEmptyCookingSlot();
      expect(slot.status).toBe("idle");
      expect(slot.recipeId).toBeNull();
    });

    it("should start cooking a recipe", () => {
      const recipe = getCookingRecipeById("roasted-apple")!;
      const slot = startCooking(recipe);
      expect(slot.status).toBe("cooking");
      expect(slot.recipeId).toBe("roasted-apple");
      expect(slot.totalTime).toBe(15);
    });

    it("should advance cooking progress", () => {
      const recipe = getCookingRecipeById("roasted-apple")!;
      let slot = startCooking(recipe);
      slot = advanceCooking(slot, 5, true);
      expect(slot.status).toBe("cooking");
      expect(slot.elapsed).toBe(5);
    });

    it("should complete cooking when time elapsed", () => {
      const recipe = getCookingRecipeById("roasted-apple")!;
      let slot = startCooking(recipe);
      slot = advanceCooking(slot, 20, true);
      expect(slot.status).toBe("done");
    });

    it("should fail cooking if campfire goes out", () => {
      const recipe = getCookingRecipeById("roasted-apple")!;
      let slot = startCooking(recipe);
      slot = advanceCooking(slot, 5, false);
      expect(slot.status).toBe("failed");
    });

    it("should not advance non-cooking slots", () => {
      const slot = createEmptyCookingSlot();
      const result = advanceCooking(slot, 10, true);
      expect(result.status).toBe("idle");
    });
  });

  describe("Food collection", () => {
    it("should return food from done cooking slot", () => {
      const recipe = getCookingRecipeById("roasted-apple")!;
      let slot = startCooking(recipe);
      slot = advanceCooking(slot, 20, true);
      const food = collectCookedFood(slot);
      expect(food).not.toBeNull();
      expect(food!.foodId).toBe("roasted-apple");
      expect(food!.name).toBe("Roasted Apple");
      expect(food!.raw).toBe(false);
      expect(food!.saturation).toBe(25);
      expect(food!.healing).toBe(1);
    });

    it("should return null for non-done slots", () => {
      const recipe = getCookingRecipeById("roasted-apple")!;
      const slot = startCooking(recipe);
      expect(collectCookedFood(slot)).toBeNull();
    });

    it("should return null for idle slots", () => {
      const slot = createEmptyCookingSlot();
      expect(collectCookedFood(slot)).toBeNull();
    });
  });

  // ── FPS Raycast Interaction (Spec §22) ────────────────────────────────────

  describe("isCampfireEntity", () => {
    it("returns true for an entity with a campfire component", () => {
      const entity = { campfire: { lit: true, cookingSlots: 2 } };
      expect(isCampfireEntity(entity)).toBe(true);
    });

    it("returns false for null", () => {
      expect(isCampfireEntity(null)).toBe(false);
    });

    it("returns false for a non-campfire entity", () => {
      expect(isCampfireEntity({ tree: { stage: 1 } })).toBe(false);
    });

    it("returns false for a primitive", () => {
      expect(isCampfireEntity(42)).toBe(false);
    });
  });

  describe("isCampfireLit", () => {
    it("returns true when campfire.lit is true", () => {
      expect(isCampfireLit({ campfire: { lit: true, cookingSlots: 2 } })).toBe(true);
    });

    it("returns false when campfire.lit is false", () => {
      expect(isCampfireLit({ campfire: { lit: false, cookingSlots: 2 } })).toBe(false);
    });
  });

  describe("getCampfireInteractionLabel", () => {
    it("returns 'Cook' when campfire is lit", () => {
      expect(getCampfireInteractionLabel({ campfire: { lit: true, cookingSlots: 2 } })).toBe("Cook");
    });

    it("returns 'Light Campfire' when campfire is unlit", () => {
      expect(getCampfireInteractionLabel({ campfire: { lit: false, cookingSlots: 2 } })).toBe("Light Campfire");
    });
  });

  describe("resolveCampfireInteraction", () => {
    it("returns isCampfire: false for non-campfire entities", () => {
      const result = resolveCampfireInteraction({ tree: { stage: 1 } });
      expect(result.isCampfire).toBe(false);
      expect(result.canCookNow).toBe(false);
      expect(result.interactionLabel).toBe("");
    });

    it("returns canCookNow: true when campfire is lit", () => {
      const entity = { campfire: { lit: true, cookingSlots: 2 } };
      const result = resolveCampfireInteraction(entity);
      expect(result.isCampfire).toBe(true);
      expect(result.isLit).toBe(true);
      expect(result.canCookNow).toBe(true);
      expect(result.interactionLabel).toBe("Cook");
    });

    it("returns canCookNow: false when campfire is unlit", () => {
      const entity = { campfire: { lit: false, cookingSlots: 2 } };
      const result = resolveCampfireInteraction(entity);
      expect(result.isCampfire).toBe(true);
      expect(result.isLit).toBe(false);
      expect(result.canCookNow).toBe(false);
      expect(result.interactionLabel).toBe("Light Campfire");
    });

    it("returns isCampfire: false for null", () => {
      expect(resolveCampfireInteraction(null).isCampfire).toBe(false);
    });
  });
});
