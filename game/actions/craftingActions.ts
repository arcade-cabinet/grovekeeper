/**
 * craftingActions.ts -- Imperative crafting action functions (Spec §22.4).
 *
 * Provides dispatchSmelt, dispatchUpgradeTool, dispatchTradeBuy, and
 * dispatchTradeSell. Called from panel UI callbacks (ForgingPanel.onSmelt,
 * ForgingPanel.onUpgrade, TradePanel.onBuy, TradePanel.onSell) and from
 * quest triggers.
 *
 * All functions are pure side-effecting dispatchers:
 *   - Validate preconditions against store state
 *   - Mutate store via action methods (spendResource, addResource, etc.)
 *   - Play SFX via audioManager
 *   - Show toast via showToast
 *   - Return true on success, false on failure
 *
 * No Math.random(). No ECS world access. No R3F imports.
 */

import { tierNumToTier } from "@/components/game/forgingPanelLogic";
import type { ResourceType } from "@/game/config/resources";
import { RESOURCE_INFO } from "@/game/config/resources";
import { getToolById } from "@/game/config/tools";
import { useGameStore } from "@/game/stores";
import { audioManager } from "@/game/systems/AudioManager";
import { canSmelt, getSmeltRecipeById, getToolTierUpgrade } from "@/game/systems/forging";
import { showToast } from "@/game/ui/Toast";

// ---------------------------------------------------------------------------
// Context types (Spec §22.4)
// ---------------------------------------------------------------------------

/** Context for SMELT action. Spec §22.4 */
export interface SmeltContext {
  /** ID of the smelt recipe from config/game/forging.json. */
  recipeId: string;
}

/** Context for UPGRADE_TOOL action. Spec §22.4 */
export interface UpgradeToolContext {
  /** ID of the tool to upgrade (e.g. "axe", "pick"). */
  toolId: string;
}

/** Context for TRADE_BUY action. Spec §22.4 */
export interface TradeBuyContext {
  /** The resource type to buy. */
  resourceType: ResourceType;
  /** Number of units to buy. Must be >= 1. */
  quantity: number;
  /** Base price per unit (coins), before modifiers. */
  basePrice: number;
  /** Seasonal price modifier (e.g. 1.2 for winter timber). */
  seasonalMultiplier: number;
}

/** Context for TRADE_SELL action. Spec §22.4 */
export interface TradeSellContext {
  /** The resource type to sell. */
  resourceType: ResourceType;
  /** Number of units to sell. Must be >= 1. */
  quantity: number;
  /** Base price per unit (coins), before modifiers. */
  basePrice: number;
  /** Seasonal price modifier. */
  seasonalMultiplier: number;
}

// ---------------------------------------------------------------------------
// SMELT (Spec §22.4)
// ---------------------------------------------------------------------------

/**
 * Execute a smelt recipe immediately.
 *
 * Deducts all recipe inputs from inventory, credits the output item,
 * plays forge SFX, and shows a success toast.
 *
 * All canSmelt checks are performed before any mutation — no partial
 * deductions occur if a precondition fails.
 *
 * Returns false when the recipe is unknown, inventory check fails, or
 * spendResource returns false for any input.
 */
export function dispatchSmelt(ctx: SmeltContext): boolean {
  const recipe = getSmeltRecipeById(ctx.recipeId);
  if (!recipe) return false;

  const store = useGameStore.getState();
  const inventory = store.resources as unknown as Record<string, number>;

  // Pre-check all inputs before any mutation (Spec §22.4 SMELT preconditions)
  if (!canSmelt(recipe, inventory)) return false;

  // Deduct each input — cast to ResourceType to match store API (crafted
  // items like "charcoal", "iron-ingot" are stored as untyped resource keys,
  // matching the pattern in app/game/index.tsx handleSmelt).
  for (const [resource, amount] of Object.entries(recipe.inputs)) {
    const ok = store.spendResource(resource as ResourceType, amount);
    if (!ok) return false;
  }

  // Credit output (Spec §22.4)
  store.addResource(recipe.output.itemId as ResourceType, recipe.output.amount);

  // SFX + feedback (Spec §22.4, §27)
  audioManager.playSound("forge");
  showToast(`Smelted ${recipe.name}!`, "success");

  return true;
}

// ---------------------------------------------------------------------------
// UPGRADE_TOOL (Spec §22.4)
// ---------------------------------------------------------------------------

/**
 * Upgrade a tool's tier at the forge.
 *
 * Delegates to store.upgradeToolTier for atomic resource deduction +
 * tier increment. On success, plays forge SFX and shows a descriptive toast
 * with the tool name and new tier label.
 *
 * Returns false when toolId is empty, no tier upgrade is configured, or
 * store.upgradeToolTier returns false (cannot afford or already at max tier).
 */
export function dispatchUpgradeTool(ctx: UpgradeToolContext): boolean {
  if (!ctx.toolId) return false;

  const store = useGameStore.getState();

  // Look up current tier to verify an upgrade path exists
  const currentTierNum = store.toolUpgrades[ctx.toolId] ?? 0;
  const currentTier = tierNumToTier(currentTierNum);
  const upgrade = getToolTierUpgrade(currentTier);
  if (!upgrade) return false;

  // Delegate to store action (handles cost deduction + tier increment)
  const ok = store.upgradeToolTier(ctx.toolId);
  if (!ok) return false;

  // SFX + descriptive feedback (Spec §22.4)
  audioManager.playSound("forge");

  const tool = getToolById(ctx.toolId);
  const toolName = tool?.name ?? ctx.toolId;
  const nextTierLabel =
    upgrade.toTier === "iron"
      ? "Iron"
      : upgrade.toTier === "grovekeeper"
        ? "Grovekeeper"
        : upgrade.toTier;
  showToast(`${toolName} upgraded to ${nextTierLabel}!`, "success");

  return true;
}

// ---------------------------------------------------------------------------
// TRADE_BUY (Spec §22.4)
// ---------------------------------------------------------------------------

/**
 * Buy resources from the market at effective price.
 *
 * Formula: effectivePrice = basePrice * seasonalMultiplier * supplyDemandMultiplier
 * totalCost = Math.ceil(effectivePrice * quantity)
 *
 * Returns false when quantity < 1 or player cannot afford the total cost.
 */
export function dispatchTradeBuy(ctx: TradeBuyContext): boolean {
  if (ctx.quantity < 1) return false;

  const store = useGameStore.getState();
  const supplyDemandMultiplier = store.marketState.priceMultipliers[ctx.resourceType] ?? 1.0;

  const effectivePrice = ctx.basePrice * ctx.seasonalMultiplier * supplyDemandMultiplier;
  const totalCost = Math.ceil(effectivePrice * ctx.quantity);

  if (store.coins < totalCost) return false;

  // Deduct coins (addCoins with negative matches addCoins pattern in progression.ts)
  store.addCoins(-totalCost);

  // Credit resource
  store.addResource(ctx.resourceType, ctx.quantity);

  // Record trade for supply/demand price pressure (Spec §20.2)
  // recordMarketTrade is exported from questState.ts and included in the store via spread
  (
    store as unknown as {
      recordMarketTrade?: (r: ResourceType, d: "buy" | "sell", a: number) => void;
    }
  ).recordMarketTrade?.(ctx.resourceType, "buy", ctx.quantity);

  // Feedback
  const resourceName = RESOURCE_INFO[ctx.resourceType]?.name ?? ctx.resourceType;
  showToast(`Bought ${ctx.quantity}x ${resourceName}`, "success");

  return true;
}

// ---------------------------------------------------------------------------
// TRADE_SELL (Spec §22.4)
// ---------------------------------------------------------------------------

/**
 * Sell resources to the market at effective price.
 *
 * Formula: effectivePrice = basePrice * seasonalMultiplier * supplyDemandMultiplier
 * totalGain = Math.floor(effectivePrice * quantity)
 *
 * Returns false when quantity < 1 or spendResource fails (insufficient stock).
 */
export function dispatchTradeSell(ctx: TradeSellContext): boolean {
  if (ctx.quantity < 1) return false;

  const store = useGameStore.getState();
  const supplyDemandMultiplier = store.marketState.priceMultipliers[ctx.resourceType] ?? 1.0;

  const effectivePrice = ctx.basePrice * ctx.seasonalMultiplier * supplyDemandMultiplier;
  const totalGain = Math.floor(effectivePrice * ctx.quantity);

  // Deduct resource first — spendResource validates quantity availability
  const ok = store.spendResource(ctx.resourceType, ctx.quantity);
  if (!ok) return false;

  // Credit coins
  store.addCoins(totalGain);

  // Record trade for supply/demand price pressure (Spec §20.2)
  (
    store as unknown as {
      recordMarketTrade?: (r: ResourceType, d: "buy" | "sell", a: number) => void;
    }
  ).recordMarketTrade?.(ctx.resourceType, "sell", ctx.quantity);

  // Feedback
  const resourceName = RESOURCE_INFO[ctx.resourceType]?.name ?? ctx.resourceType;
  showToast(`Sold ${ctx.quantity}x ${resourceName}`, "success");

  return true;
}
