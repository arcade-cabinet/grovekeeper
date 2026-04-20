/**
 * Seasonal market events -- modifiers to trade rates and costs based on season.
 */

export interface SeasonalMarketEffect {
  season: string;
  description: string;
  seedCostMultiplier: number; // Applied to seed costs
  tradeBonus: Record<string, number>; // Bonus output per resource type
}

export const SEASONAL_MARKET_EFFECTS: SeasonalMarketEffect[] = [
  {
    season: "spring",
    description: "Spring Sale: Seed costs halved!",
    seedCostMultiplier: 0.5,
    tradeBonus: {},
  },
  {
    season: "summer",
    description: "Summer Lumber Boom: +50% timber trade output",
    seedCostMultiplier: 1.0,
    tradeBonus: { timber: 1.5 },
  },
  {
    season: "autumn",
    description: "Harvest Festival: +50% fruit/acorn trade output",
    seedCostMultiplier: 1.0,
    tradeBonus: { fruit: 1.5, acorns: 1.5 },
  },
  {
    season: "winter",
    description: "Winter Sap Market: +50% sap trade output",
    seedCostMultiplier: 1.0,
    tradeBonus: { sap: 1.5 },
  },
];

export function getSeasonalMarketEffect(
  season: string,
): SeasonalMarketEffect | null {
  return SEASONAL_MARKET_EFFECTS.find((e) => e.season === season) ?? null;
}

export function getSeasonalSeedCostMultiplier(season: string): number {
  const effect = getSeasonalMarketEffect(season);
  return effect?.seedCostMultiplier ?? 1.0;
}

export function getSeasonalTradeBonus(
  season: string,
  resourceType: string,
): number {
  const effect = getSeasonalMarketEffect(season);
  return effect?.tradeBonus[resourceType] ?? 1.0;
}
