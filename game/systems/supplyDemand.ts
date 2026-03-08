/**
 * Supply/Demand Economy -- dynamic pricing based on player trading history.
 *
 * Prices fluctuate based on a rolling window of recent trades.
 * Selling a resource drops its price; buying raises it.
 * Price multiplier is clamped to [0.5, 2.5] to prevent extremes.
 *
 * Biome supply curves provide base regional pricing before trade history.
 *
 * Pure functions -- no side effects.
 */

import type { ResourceType } from "@/game/config/resources";
import { RESOURCE_TYPES } from "@/game/config/resources";
import type { BiomeType } from "@/game/world/biomeMapper";

// -- Types ────────────────────────────────────────────────────────────────────

export interface TradeRecord {
  resource: ResourceType;
  direction: "buy" | "sell";
  amount: number;
  day: number;
}

export interface MarketState {
  tradeHistory: TradeRecord[];
  priceMultipliers: Record<ResourceType, number>;
  lastUpdateDay: number;
}

// -- Constants ────────────────────────────────────────────────────────────────

const DEFAULT_WINDOW_DAYS = 30;
const SCALING_FACTOR = 100;
const MIN_MULTIPLIER = 0.5;
const MAX_MULTIPLIER = 2.5;

// -- Biome Supply Curves ───────────────────────────────────────────────────────
//
// Base price multipliers per biome reflecting natural resource abundance.
// Values < 1.0 = resource is abundant here (lower price).
// Values > 1.0 = resource is scarce here (higher price).
// Missing entries default to 1.0 (neutral).

const BIOME_SUPPLY_CURVES: Record<BiomeType, Partial<Record<ResourceType, number>>> = {
  "starting-grove": {},
  meadow: { fruit: 0.8, timber: 1.1 },
  "ancient-forest": { timber: 0.7, acorns: 0.7, sap: 0.8 },
  wetlands: { sap: 0.7, fruit: 0.9, timber: 1.2 },
  "rocky-highlands": { timber: 1.3, sap: 1.2, fruit: 1.4 },
  "orchard-valley": { fruit: 0.6, acorns: 0.8, timber: 1.1 },
  "frozen-peaks": { timber: 1.5, sap: 1.4, fruit: 1.8, acorns: 1.3 },
  "twilight-glade": { sap: 0.6, acorns: 0.9 },
};

// -- Helpers ──────────────────────────────────────────────────────────────────

function defaultMultipliers(): Record<ResourceType, number> {
  return {
    timber: 1.0,
    sap: 1.0,
    fruit: 1.0,
    acorns: 1.0,
    wood: 1.0,
    stone: 1.0,
    metal_scrap: 1.0,
    fiber: 1.0,
    ore: 1.0,
    berries: 1.0,
    herbs: 1.0,
    meat: 1.0,
    hide: 1.0,
    fish: 1.0,
    seeds: 1.0,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// -- Public API ───────────────────────────────────────────────────────────────

/**
 * Create a fresh market state with neutral multipliers.
 */
export function initializeMarketState(): MarketState {
  return {
    tradeHistory: [],
    priceMultipliers: defaultMultipliers(),
    lastUpdateDay: 0,
  };
}

/**
 * Get the biome-based supply price multiplier for a specific resource.
 *
 * Values < 1.0 indicate abundant supply (lower price).
 * Values > 1.0 indicate scarce supply (higher price).
 * Returns 1.0 for resources not tracked in the biome curve.
 *
 * Spec §20: Regional economy — biome supply curves.
 */
export function getBiomeSupplyMultiplier(resource: ResourceType, biome: BiomeType): number {
  return BIOME_SUPPLY_CURVES[biome][resource] ?? 1.0;
}

/**
 * Compute price adjustments for all resources based on biome supply curves.
 *
 * Returns partial multipliers — only resources with non-neutral (≠ 1.0) values.
 * Combine with trade-history multipliers via multiplication for effective price.
 *
 * Spec §20: Regional economy — biome supply curves.
 */
export function computeBiomePriceAdjustment(
  biome: BiomeType,
): Partial<Record<ResourceType, number>> {
  return { ...BIOME_SUPPLY_CURVES[biome] };
}

/**
 * Compute current price multipliers based on rolling trade history.
 *
 * For each resource, tally buy volume vs sell volume within the window.
 * Buy pressure raises the price; sell pressure lowers it.
 *
 * Formula:
 *   multiplier = 1.0 + (buyVolume - sellVolume) / SCALING_FACTOR
 *   clamped to [0.5, 2.5]
 */
export function computePriceMultipliers(
  history: TradeRecord[],
  currentDay: number,
  windowDays: number = DEFAULT_WINDOW_DAYS,
): Record<ResourceType, number> {
  const cutoff = currentDay - windowDays;

  const recentTrades = history.filter((t) => t.day > cutoff);

  const multipliers = defaultMultipliers();

  for (const resource of RESOURCE_TYPES) {
    let buyVolume = 0;
    let sellVolume = 0;

    for (const trade of recentTrades) {
      if (trade.resource !== resource) continue;
      if (trade.direction === "buy") {
        buyVolume += trade.amount;
      } else {
        sellVolume += trade.amount;
      }
    }

    const raw = 1.0 + (buyVolume - sellVolume) / SCALING_FACTOR;
    multipliers[resource] = clamp(raw, MIN_MULTIPLIER, MAX_MULTIPLIER);
  }

  return multipliers;
}

/**
 * Record a trade and recompute multipliers.
 * Returns a new state object (immutable).
 */
export function recordTrade(
  state: MarketState,
  resource: ResourceType,
  direction: "buy" | "sell",
  amount: number,
  currentDay: number,
): MarketState {
  if (amount <= 0) return state;

  const record: TradeRecord = { resource, direction, amount, day: currentDay };
  const newHistory = [...state.tradeHistory, record];
  const newMultipliers = computePriceMultipliers(newHistory, currentDay);

  return {
    tradeHistory: newHistory,
    priceMultipliers: newMultipliers,
    lastUpdateDay: currentDay,
  };
}

/**
 * Get the effective price for a resource, combining base price with
 * seasonal and supply/demand multipliers.
 *
 * effectivePrice = basePrice * seasonalMultiplier * supplyDemandMultiplier
 * Rounded to one decimal place.
 */
export function getEffectivePrice(
  _resource: ResourceType,
  basePrice: number,
  seasonalMultiplier: number,
  supplyDemandMultiplier: number,
): number {
  const raw = basePrice * seasonalMultiplier * supplyDemandMultiplier;
  return Math.round(raw * 10) / 10;
}

/**
 * Prune trade records that fall outside the rolling window.
 * Keeps state lean for long-running sessions.
 */
export function pruneHistory(
  state: MarketState,
  currentDay: number,
  windowDays: number = DEFAULT_WINDOW_DAYS,
): MarketState {
  const cutoff = currentDay - windowDays;
  const prunedHistory = state.tradeHistory.filter((t) => t.day > cutoff);

  if (prunedHistory.length === state.tradeHistory.length) return state;

  return {
    ...state,
    tradeHistory: prunedHistory,
  };
}
