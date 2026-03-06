/**
 * Zone Bonuses -- per-zone bonus effects.
 * NO external imports.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type BonusType =
  | "growth_boost"
  | "harvest_boost"
  | "xp_boost"
  | "stamina_regen"
  | "water_retention";

export interface ZoneBonus {
  type: BonusType;
  magnitude: number;
}

export type ZoneType = "grove" | "clearing" | "forest" | "path" | "settlement";

// ── Data ─────────────────────────────────────────────────────────────────────

const ZONE_BONUSES: Record<ZoneType, ZoneBonus[]> = {
  grove: [{ type: "growth_boost", magnitude: 0.1 }],
  clearing: [
    { type: "xp_boost", magnitude: 0.15 },
    { type: "water_retention", magnitude: 0.1 },
  ],
  forest: [{ type: "harvest_boost", magnitude: 0.2 }],
  path: [{ type: "stamina_regen", magnitude: 0.1 }],
  settlement: [
    { type: "stamina_regen", magnitude: 0.2 },
    { type: "xp_boost", magnitude: 0.1 },
  ],
};

// ── Public API ───────────────────────────────────────────────────────────────

/** Get bonuses for a zone type. */
export function getZoneBonuses(zoneType: ZoneType): ZoneBonus[] {
  return ZONE_BONUSES[zoneType] ?? [];
}

/** Get the total magnitude of a specific bonus type for a zone. */
export function getZoneBonusMagnitude(
  zoneType: ZoneType,
  bonusType: BonusType,
): number {
  const bonuses = ZONE_BONUSES[zoneType] ?? [];
  return bonuses
    .filter((b) => b.type === bonusType)
    .reduce((sum, b) => sum + b.magnitude, 0);
}

/** Check if a zone has a specific bonus type. */
export function hasZoneBonus(
  zoneType: ZoneType,
  bonusType: BonusType,
): boolean {
  const bonuses = ZONE_BONUSES[zoneType] ?? [];
  return bonuses.some((b) => b.type === bonusType);
}
