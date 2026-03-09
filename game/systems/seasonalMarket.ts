/**
 * Seasonal Market -- price modifiers based on the current season.
 */

import type { ResourceType } from "@/game/config/resources";

// ── Types ────────────────────────────────────────────────────────────────────

export type Season = "spring" | "summer" | "autumn" | "winter";

export interface SeasonalPriceModifiers {
  timber: number;
  sap: number;
  fruit: number;
  acorns: number;
}

// ── Data ─────────────────────────────────────────────────────────────────────

const SEASONAL_MODIFIERS: Record<Season, SeasonalPriceModifiers> = {
  spring: { timber: 1.0, sap: 1.2, fruit: 0.8, acorns: 1.0 },
  summer: { timber: 0.8, sap: 1.0, fruit: 1.2, acorns: 1.0 },
  autumn: { timber: 1.2, sap: 0.8, fruit: 1.5, acorns: 1.3 },
  winter: { timber: 1.5, sap: 0.6, fruit: 0.5, acorns: 1.5 },
};

// ── Public API ───────────────────────────────────────────────────────────────

/** Get the price modifiers for a given season. */
export function getSeasonalModifiers(season: Season): SeasonalPriceModifiers {
  return { ...SEASONAL_MODIFIERS[season] };
}

/** Get the seasonal modifier for a specific resource in a given season. */
export function getResourceModifier(
  season: Season,
  resource: keyof SeasonalPriceModifiers,
): number {
  return SEASONAL_MODIFIERS[season][resource];
}

/** Apply seasonal modifier to a base price. */
export function applySeasonalPrice(
  basePrice: number,
  season: Season,
  resource: keyof SeasonalPriceModifiers,
): number {
  return Math.round(basePrice * SEASONAL_MODIFIERS[season][resource] * 10) / 10;
}

/**
 * Get the seasonal modifier for any ResourceType.
 *
 * Unlike getResourceModifier (which only accepts the four core seasonal resources),
 * this function accepts any ResourceType and returns 1.0 for resources not tracked
 * in the seasonal modifier table (wood, stone, metal_scrap, fiber, etc.).
 *
 * Spec §20: Seasonal price modifiers extend to all traded resource types.
 */
export function getSeasonalModifierForAny(season: Season, resource: ResourceType): number {
  const mods = SEASONAL_MODIFIERS[season] as unknown as Partial<Record<string, number>>;
  return mods[resource] ?? 1.0;
}
