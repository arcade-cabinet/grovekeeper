/**
 * Forge smelting and tool tier upgrade system (Spec §22.2).
 *
 * Pure functions only — no ECS, Rapier, or R3F imports.
 * Forge (L8) required for smelting ore into ingots and upgrading tool tiers.
 */

import forgingConfig from "@/config/game/forging.json" with { type: "json" };
import type { ToolComponent, ToolTier } from "@/game/ecs/components/items";

// ---------------------------------------------------------------------------
// Smelt recipe types (loaded from config)
// ---------------------------------------------------------------------------

export interface SmeltRecipe {
  id: string;
  name: string;
  inputs: Record<string, number>;
  output: { itemId: string; amount: number };
  smeltTimeSec: number;
}

const SMELT_RECIPES: SmeltRecipe[] =
  forgingConfig.smeltRecipes as unknown as SmeltRecipe[];

// ---------------------------------------------------------------------------
// Config accessors
// ---------------------------------------------------------------------------

export function getSmeltRecipes(): SmeltRecipe[] {
  return [...SMELT_RECIPES];
}

export function getSmeltRecipeById(id: string): SmeltRecipe | undefined {
  return SMELT_RECIPES.find((r) => r.id === id);
}

// ---------------------------------------------------------------------------
// Smelting resource checks
// ---------------------------------------------------------------------------

/** Returns true if the inventory has enough of every input for this recipe. */
export function canSmelt(
  recipe: SmeltRecipe,
  inventory: Record<string, number>,
): boolean {
  return Object.entries(recipe.inputs).every(
    ([resource, amount]) => (inventory[resource] ?? 0) >= amount,
  );
}

/** Deduct smelt inputs from inventory. Returns a new inventory map. */
export function deductSmeltCost(
  recipe: SmeltRecipe,
  inventory: Record<string, number>,
): Record<string, number> {
  const result = { ...inventory };
  for (const [resource, amount] of Object.entries(recipe.inputs)) {
    result[resource] = (result[resource] ?? 0) - amount;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Smelt slot progress
// ---------------------------------------------------------------------------

export type SmeltStatus = "idle" | "smelting" | "done";

export interface SmeltSlotState {
  recipeId: string | null;
  status: SmeltStatus;
  elapsed: number;
  totalTime: number;
}

export function createEmptySmeltSlot(): SmeltSlotState {
  return {
    recipeId: null,
    status: "idle",
    elapsed: 0,
    totalTime: 0,
  };
}

export function startSmelting(recipe: SmeltRecipe): SmeltSlotState {
  return {
    recipeId: recipe.id,
    status: "smelting",
    elapsed: 0,
    totalTime: recipe.smeltTimeSec,
  };
}

/** Advance smelting by delta seconds. Does nothing for non-smelting slots. */
export function advanceSmelting(
  slot: SmeltSlotState,
  deltaSec: number,
): SmeltSlotState {
  if (slot.status !== "smelting") return slot;

  const newElapsed = Math.min(slot.elapsed + deltaSec, slot.totalTime);
  if (newElapsed >= slot.totalTime) {
    return { ...slot, elapsed: slot.totalTime, status: "done" };
  }
  return { ...slot, elapsed: newElapsed };
}

/** Collect the finished item from a done slot. Returns null if not ready. */
export function collectSmeltedItem(
  slot: SmeltSlotState,
): { itemId: string; amount: number } | null {
  if (slot.status !== "done" || !slot.recipeId) return null;

  const recipe = getSmeltRecipeById(slot.recipeId);
  if (!recipe) return null;

  return { ...recipe.output };
}

// ---------------------------------------------------------------------------
// Tool tier upgrades
// ---------------------------------------------------------------------------

export interface ToolTierUpgrade {
  fromTier: ToolTier;
  toTier: ToolTier;
  /** Absolute effectPower multiplier vs the basic tier's base effectPower. */
  effectMultiplier: number;
  /** Use speed multiplier vs basic tier (informational — used by animation layer). */
  speedMultiplier: number;
  maxDurability: number;
  cost: Record<string, number>;
}

const TOOL_TIER_UPGRADES: ToolTierUpgrade[] =
  forgingConfig.toolTierUpgrades as unknown as ToolTierUpgrade[];

/** Returns the upgrade config for advancing from currentTier, or null if at max. */
export function getToolTierUpgrade(
  currentTier: ToolTier,
): ToolTierUpgrade | null {
  return TOOL_TIER_UPGRADES.find((u) => u.fromTier === currentTier) ?? null;
}

/** Returns true if the inventory can cover the upgrade cost for currentTier. */
export function canUpgradeTool(
  currentTier: ToolTier,
  inventory: Record<string, number>,
): boolean {
  const upgrade = getToolTierUpgrade(currentTier);
  if (!upgrade) return false;
  return Object.entries(upgrade.cost).every(
    ([resource, amount]) => (inventory[resource] ?? 0) >= amount,
  );
}

/** Deduct upgrade cost from inventory. Returns a new inventory map. */
export function deductUpgradeCost(
  upgrade: ToolTierUpgrade,
  inventory: Record<string, number>,
): Record<string, number> {
  const result = { ...inventory };
  for (const [resource, amount] of Object.entries(upgrade.cost)) {
    result[resource] = (result[resource] ?? 0) - amount;
  }
  return result;
}

/**
 * Apply a tier upgrade to a tool.
 *
 * @param tool - The tool to upgrade (not mutated).
 * @param upgrade - The upgrade tier config (from getToolTierUpgrade).
 * @param baseEffectPower - The tool's basic-tier effectPower from tools.json.
 *   Used to compute the absolute effectPower for the new tier, avoiding drift
 *   when applying multiple sequential upgrades.
 * @returns A new ToolComponent at the upgraded tier with full durability.
 */
export function applyTierUpgrade(
  tool: ToolComponent,
  upgrade: ToolTierUpgrade,
  baseEffectPower: number,
): ToolComponent {
  return {
    ...tool,
    tier: upgrade.toTier,
    effectPower: baseEffectPower * upgrade.effectMultiplier,
    maxDurability: upgrade.maxDurability,
    durability: upgrade.maxDurability,
  };
}

// ---------------------------------------------------------------------------
// FPS Forge Interaction (Spec §22.2)
// ---------------------------------------------------------------------------

/**
 * Minimal forge entity interface for FPS raycast interaction.
 * ECS entities satisfy this via structural typing.
 * No ECS world import — keeps this module pure and testable.
 */
export interface ForgeEntity {
  forge: { active: boolean };
}

/** Type guard — returns true if the entity has a forge component. */
export function isForgeEntity(entity: unknown): entity is ForgeEntity {
  return (
    typeof entity === "object" &&
    entity !== null &&
    "forge" in entity &&
    typeof (entity as Record<string, unknown>).forge === "object" &&
    (entity as Record<string, unknown>).forge !== null
  );
}

/**
 * Returns the HUD interaction label for a forge.
 * Shown in crosshair prompt when player looks at a forge structure.
 */
export function getForgeInteractionLabel(entity: ForgeEntity): string {
  return entity.forge.active ? "Forge" : "Light Forge";
}

/** Result of resolving an E-key interaction with a potential forge entity. */
export interface ForgeInteraction {
  /** Whether the entity is a forge at all. */
  isForge: boolean;
  /** Whether the forge is currently active (lit). */
  isActive: boolean;
  /** Whether the player can open the forging UI right now. */
  canForgeNow: boolean;
  /** Label to display in the HUD interaction prompt. */
  interactionLabel: string;
}

/**
 * Resolves the E-key interaction for any raycast-hit entity.
 *
 * Returns `isForge: false` for non-forge entities.
 * Returns `canForgeNow: true` only when the forge is active.
 *
 * Pure function — no side effects. Callers open the forging UI when
 * `canForgeNow` is true.
 */
export function resolveForgeInteraction(entity: unknown): ForgeInteraction {
  if (!isForgeEntity(entity)) {
    return {
      isForge: false,
      isActive: false,
      canForgeNow: false,
      interactionLabel: "",
    };
  }
  const active = entity.forge.active;
  return {
    isForge: true,
    isActive: active,
    canForgeNow: active,
    interactionLabel: getForgeInteractionLabel(entity),
  };
}
