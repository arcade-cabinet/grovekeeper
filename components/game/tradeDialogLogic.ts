/**
 * tradeDialogLogic -- Pure trade calculation functions (Spec SS15).
 *
 * Extracted for testability. No React, no side effects.
 */

import type { ResourceType } from "@/game/config/resources";
import type { TradeRate } from "@/game/systems/trading";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TradeSummary {
  /** Total cost in source resource. */
  totalCost: number;
  /** Total gain in destination resource. */
  totalGain: number;
  /** Whether the player can afford this trade. */
  canAfford: boolean;
  /** Remaining source resource after trade. */
  remaining: number;
}

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

/**
 * Compute maximum quantity the player can trade for a given rate.
 */
export function maxTradeQuantity(rate: TradeRate, resources: Record<ResourceType, number>): number {
  const available = resources[rate.from] ?? 0;
  if (rate.fromAmount <= 0) return 0;
  return Math.max(0, Math.floor(available / rate.fromAmount));
}

/**
 * Compute a trade summary for a given rate and quantity.
 */
export function computeTradeSummary(
  rate: TradeRate,
  quantity: number,
  resources: Record<ResourceType, number>,
): TradeSummary {
  const totalCost = quantity * rate.fromAmount;
  const totalGain = quantity * rate.toAmount;
  const available = resources[rate.from] ?? 0;
  return {
    totalCost,
    totalGain,
    canAfford: available >= totalCost,
    remaining: available - totalCost,
  };
}

/**
 * Format a resource name for display (capitalize first letter).
 */
export function formatResourceName(name: string): string {
  if (name.length === 0) return name;
  return name.charAt(0).toUpperCase() + name.slice(1);
}
