/**
 * Forging system tests (Spec §22.2)
 *
 * Covers:
 * - Smelting recipes: load, canSmelt, deductSmeltCost
 * - Smelt slot progress: start, advance, collect
 * - Tool tier upgrades: basic→iron→grovekeeper
 * - FPS forge interaction: type guard, label, resolver
 */

import {
  getSmeltRecipes,
  getSmeltRecipeById,
  canSmelt,
  deductSmeltCost,
  createEmptySmeltSlot,
  startSmelting,
  advanceSmelting,
  collectSmeltedItem,
  getToolTierUpgrade,
  canUpgradeTool,
  deductUpgradeCost,
  applyTierUpgrade,
  isForgeEntity,
  getForgeInteractionLabel,
  resolveForgeInteraction,
} from "./forging";
import type { SmeltRecipe, ToolTierUpgrade, ForgeEntity } from "./forging";
import type { ToolComponent } from "@/game/ecs/components/items";

// ---------------------------------------------------------------------------
// Smelting recipes
// ---------------------------------------------------------------------------

describe("Forging System — Smelting Recipes (Spec §22.2)", () => {
  it("loads all three smelt recipes from config", () => {
    const recipes = getSmeltRecipes();
    expect(recipes).toHaveLength(3);
    expect(recipes.map((r) => r.id)).toEqual(
      expect.arrayContaining(["iron-ingot", "charcoal", "cut-stone"]),
    );
  });

  it("finds recipe by id", () => {
    const recipe = getSmeltRecipeById("iron-ingot");
    expect(recipe).toBeDefined();
    expect(recipe!.name).toBe("Iron Ingot");
  });

  it("returns undefined for unknown recipe id", () => {
    expect(getSmeltRecipeById("nonexistent")).toBeUndefined();
  });

  it("iron-ingot recipe requires 3 ore and 1 timber", () => {
    const recipe = getSmeltRecipeById("iron-ingot")!;
    expect(recipe.inputs).toEqual({ ore: 3, timber: 1 });
    expect(recipe.output).toEqual({ itemId: "iron-ingot", amount: 1 });
  });

  it("charcoal recipe requires 5 timber and yields 2 charcoal", () => {
    const recipe = getSmeltRecipeById("charcoal")!;
    expect(recipe.inputs).toEqual({ timber: 5 });
    expect(recipe.output).toEqual({ itemId: "charcoal", amount: 2 });
  });

  it("cut-stone recipe requires 4 stone and 1 charcoal", () => {
    const recipe = getSmeltRecipeById("cut-stone")!;
    expect(recipe.inputs).toEqual({ stone: 4, charcoal: 1 });
    expect(recipe.output).toEqual({ itemId: "cut-stone", amount: 2 });
  });
});

// ---------------------------------------------------------------------------
// canSmelt
// ---------------------------------------------------------------------------

describe("canSmelt (Spec §22.2)", () => {
  let recipe: SmeltRecipe;
  beforeEach(() => {
    recipe = getSmeltRecipeById("iron-ingot")!;
  });

  it("returns true when player has exactly enough resources", () => {
    expect(canSmelt(recipe, { ore: 3, timber: 1 })).toBe(true);
  });

  it("returns true when player has more than enough resources", () => {
    expect(canSmelt(recipe, { ore: 10, timber: 5 })).toBe(true);
  });

  it("returns false when ore is insufficient", () => {
    expect(canSmelt(recipe, { ore: 2, timber: 1 })).toBe(false);
  });

  it("returns false when timber is missing entirely", () => {
    expect(canSmelt(recipe, { ore: 3 })).toBe(false);
  });

  it("returns false with empty inventory", () => {
    expect(canSmelt(recipe, {})).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// deductSmeltCost
// ---------------------------------------------------------------------------

describe("deductSmeltCost (Spec §22.2)", () => {
  it("deducts exact inputs from inventory", () => {
    const recipe = getSmeltRecipeById("iron-ingot")!;
    const result = deductSmeltCost(recipe, { ore: 5, timber: 3, stone: 2 });
    expect(result.ore).toBe(2);
    expect(result.timber).toBe(2);
    expect(result.stone).toBe(2); // untouched
  });

  it("does not mutate original inventory", () => {
    const recipe = getSmeltRecipeById("charcoal")!;
    const inventory = { timber: 10 };
    deductSmeltCost(recipe, inventory);
    expect(inventory.timber).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Smelt slot progress
// ---------------------------------------------------------------------------

describe("Smelt slot progress (Spec §22.2)", () => {
  it("creates empty slot in idle state", () => {
    const slot = createEmptySmeltSlot();
    expect(slot.status).toBe("idle");
    expect(slot.recipeId).toBeNull();
    expect(slot.elapsed).toBe(0);
  });

  it("starts smelting a recipe", () => {
    const recipe = getSmeltRecipeById("iron-ingot")!;
    const slot = startSmelting(recipe);
    expect(slot.status).toBe("smelting");
    expect(slot.recipeId).toBe("iron-ingot");
    expect(slot.totalTime).toBe(20);
    expect(slot.elapsed).toBe(0);
  });

  it("advances elapsed time while smelting", () => {
    const recipe = getSmeltRecipeById("iron-ingot")!;
    const slot = startSmelting(recipe);
    const advanced = advanceSmelting(slot, 5);
    expect(advanced.elapsed).toBe(5);
    expect(advanced.status).toBe("smelting");
  });

  it("transitions to done when elapsed reaches totalTime", () => {
    const recipe = getSmeltRecipeById("iron-ingot")!;
    const slot = startSmelting(recipe);
    const done = advanceSmelting(slot, 20);
    expect(done.status).toBe("done");
    expect(done.elapsed).toBe(20);
  });

  it("clamps elapsed at totalTime on overshoot", () => {
    const recipe = getSmeltRecipeById("iron-ingot")!;
    const slot = startSmelting(recipe);
    const done = advanceSmelting(slot, 100);
    expect(done.elapsed).toBe(20);
    expect(done.status).toBe("done");
  });

  it("does not advance idle slot", () => {
    const slot = createEmptySmeltSlot();
    const result = advanceSmelting(slot, 5);
    expect(result.status).toBe("idle");
    expect(result.elapsed).toBe(0);
  });

  it("does not advance done slot", () => {
    const recipe = getSmeltRecipeById("iron-ingot")!;
    let slot = startSmelting(recipe);
    slot = advanceSmelting(slot, 20);
    const result = advanceSmelting(slot, 5);
    expect(result.status).toBe("done");
    expect(result.elapsed).toBe(20);
  });

  it("collects smelted item from done slot", () => {
    const recipe = getSmeltRecipeById("charcoal")!;
    let slot = startSmelting(recipe);
    slot = advanceSmelting(slot, 15);
    const item = collectSmeltedItem(slot);
    expect(item).not.toBeNull();
    expect(item!.itemId).toBe("charcoal");
    expect(item!.amount).toBe(2);
  });

  it("returns null when collecting from non-done slot", () => {
    const recipe = getSmeltRecipeById("iron-ingot")!;
    const slot = startSmelting(recipe);
    expect(collectSmeltedItem(slot)).toBeNull();
  });

  it("returns null when collecting from idle slot", () => {
    expect(collectSmeltedItem(createEmptySmeltSlot())).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tool tier upgrades
// ---------------------------------------------------------------------------

describe("Tool tier upgrades (Spec §22.2)", () => {
  it("returns basic→iron upgrade for basic tier", () => {
    const upgrade = getToolTierUpgrade("basic");
    expect(upgrade).not.toBeNull();
    expect(upgrade!.fromTier).toBe("basic");
    expect(upgrade!.toTier).toBe("iron");
    expect(upgrade!.effectMultiplier).toBe(1.5);
    expect(upgrade!.maxDurability).toBe(150);
  });

  it("returns iron→grovekeeper upgrade for iron tier", () => {
    const upgrade = getToolTierUpgrade("iron");
    expect(upgrade).not.toBeNull();
    expect(upgrade!.fromTier).toBe("iron");
    expect(upgrade!.toTier).toBe("grovekeeper");
    expect(upgrade!.effectMultiplier).toBe(2.0);
    expect(upgrade!.maxDurability).toBe(500);
  });

  it("returns null for grovekeeper tier (already max)", () => {
    expect(getToolTierUpgrade("grovekeeper")).toBeNull();
  });

  it("canUpgradeTool returns true with sufficient resources", () => {
    expect(canUpgradeTool("basic", { "iron-ingot": 3 })).toBe(true);
  });

  it("canUpgradeTool returns true with surplus resources", () => {
    expect(canUpgradeTool("basic", { "iron-ingot": 10 })).toBe(true);
  });

  it("canUpgradeTool returns false with insufficient resources", () => {
    expect(canUpgradeTool("basic", { "iron-ingot": 2 })).toBe(false);
  });

  it("canUpgradeTool returns false for max tier", () => {
    expect(canUpgradeTool("grovekeeper", { "grove-essence": 99 })).toBe(false);
  });

  it("deductUpgradeCost removes cost from inventory", () => {
    const upgrade = getToolTierUpgrade("basic")!;
    const result = deductUpgradeCost(upgrade, { "iron-ingot": 5, timber: 10 });
    expect(result["iron-ingot"]).toBe(2);
    expect(result.timber).toBe(10); // untouched
  });

  it("applyTierUpgrade upgrades basic tool to iron tier", () => {
    const tool: ToolComponent = {
      toolId: "axe",
      tier: "basic",
      durability: 50,
      maxDurability: 50,
      staminaCost: 10,
      effectPower: 5.0,
      modelPath: "",
    };
    const upgrade = getToolTierUpgrade("basic")!;
    const upgraded = applyTierUpgrade(tool, upgrade, 5.0);
    expect(upgraded.tier).toBe("iron");
    expect(upgraded.effectPower).toBeCloseTo(7.5); // 5.0 * 1.5
    expect(upgraded.maxDurability).toBe(150);
    expect(upgraded.durability).toBe(150); // reset to full
    expect(upgraded.staminaCost).toBe(10); // unchanged
  });

  it("applyTierUpgrade upgrades iron tool to grovekeeper tier", () => {
    const tool: ToolComponent = {
      toolId: "axe",
      tier: "iron",
      durability: 150,
      maxDurability: 150,
      staminaCost: 10,
      effectPower: 7.5,
      modelPath: "",
    };
    const upgrade = getToolTierUpgrade("iron")!;
    const upgraded = applyTierUpgrade(tool, upgrade, 5.0);
    expect(upgraded.tier).toBe("grovekeeper");
    expect(upgraded.effectPower).toBeCloseTo(10.0); // 5.0 * 2.0
    expect(upgraded.maxDurability).toBe(500);
    expect(upgraded.durability).toBe(500);
  });

  it("applyTierUpgrade does not mutate original tool", () => {
    const tool: ToolComponent = {
      toolId: "shovel",
      tier: "basic",
      durability: 30,
      maxDurability: 50,
      staminaCost: 8,
      effectPower: 3.0,
      modelPath: "",
    };
    const upgrade = getToolTierUpgrade("basic")!;
    applyTierUpgrade(tool, upgrade, 3.0);
    expect(tool.tier).toBe("basic");
    expect(tool.durability).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// FPS Forge Interaction
// ---------------------------------------------------------------------------

describe("Forge FPS interaction (Spec §22.2)", () => {
  it("isForgeEntity returns true for valid forge entity", () => {
    const entity: ForgeEntity = { forge: { active: true } };
    expect(isForgeEntity(entity)).toBe(true);
  });

  it("isForgeEntity returns false for non-object", () => {
    expect(isForgeEntity(null)).toBe(false);
    expect(isForgeEntity(undefined)).toBe(false);
    expect(isForgeEntity(42)).toBe(false);
  });

  it("isForgeEntity returns false for entity without forge field", () => {
    expect(isForgeEntity({ campfire: { lit: true } })).toBe(false);
  });

  it("isForgeEntity returns false when forge field is null", () => {
    expect(isForgeEntity({ forge: null })).toBe(false);
  });

  it("getForgeInteractionLabel returns 'Forge' when active", () => {
    const entity: ForgeEntity = { forge: { active: true } };
    expect(getForgeInteractionLabel(entity)).toBe("Forge");
  });

  it("getForgeInteractionLabel returns 'Light Forge' when inactive", () => {
    const entity: ForgeEntity = { forge: { active: false } };
    expect(getForgeInteractionLabel(entity)).toBe("Light Forge");
  });

  it("resolveForgeInteraction returns isForge:false for non-forge entity", () => {
    const result = resolveForgeInteraction({ campfire: { lit: true } });
    expect(result.isForge).toBe(false);
    expect(result.canForgeNow).toBe(false);
    expect(result.interactionLabel).toBe("");
  });

  it("resolveForgeInteraction returns canForgeNow:true when forge is active", () => {
    const entity: ForgeEntity = { forge: { active: true } };
    const result = resolveForgeInteraction(entity);
    expect(result.isForge).toBe(true);
    expect(result.isActive).toBe(true);
    expect(result.canForgeNow).toBe(true);
    expect(result.interactionLabel).toBe("Forge");
  });

  it("resolveForgeInteraction returns canForgeNow:false when forge is inactive", () => {
    const entity: ForgeEntity = { forge: { active: false } };
    const result = resolveForgeInteraction(entity);
    expect(result.isForge).toBe(true);
    expect(result.isActive).toBe(false);
    expect(result.canForgeNow).toBe(false);
    expect(result.interactionLabel).toBe("Light Forge");
  });
});
