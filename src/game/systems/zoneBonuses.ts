/**
 * Zone bonus system -- applies growth, yield, and weather modifiers based on zone type.
 */

export interface ZoneBonus {
  growthMultiplier: number;
  timberYieldMultiplier: number;
  rainChanceBonus: number;
  hasTrade: boolean;
}

const ZONE_BONUSES: Record<string, ZoneBonus> = {
  grove: { growthMultiplier: 1.1, timberYieldMultiplier: 1.0, rainChanceBonus: 0, hasTrade: false },
  clearing: { growthMultiplier: 1.0, timberYieldMultiplier: 1.0, rainChanceBonus: 0.1, hasTrade: false },
  forest: { growthMultiplier: 1.0, timberYieldMultiplier: 1.15, rainChanceBonus: 0, hasTrade: false },
  settlement: { growthMultiplier: 1.0, timberYieldMultiplier: 1.0, rainChanceBonus: 0, hasTrade: true },
  path: { growthMultiplier: 1.0, timberYieldMultiplier: 1.0, rainChanceBonus: 0, hasTrade: false },
};

const DEFAULT_BONUS: ZoneBonus = {
  growthMultiplier: 1.0,
  timberYieldMultiplier: 1.0,
  rainChanceBonus: 0,
  hasTrade: false,
};

export function getZoneBonus(zoneType: string): ZoneBonus {
  return ZONE_BONUSES[zoneType] ?? DEFAULT_BONUS;
}
