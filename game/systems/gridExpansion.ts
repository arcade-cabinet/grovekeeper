/**
 * Grid Expansion System
 *
 * The grove starts as 12x12 and can be expanded through 5 tiers:
 * 12 -> 16 -> 20 -> 24 -> 32
 *
 * Each expansion requires a minimum player level and resource cost.
 * All functions are pure -- no imports from stores or ECS.
 */

import gridConfig from "@/config/game/grid.json" with { type: "json" };

export interface GridExpansionTier {
  size: number;
  requiredLevel: number;
  cost: Record<string, number>;
}

export const GRID_EXPANSION_TIERS: readonly GridExpansionTier[] =
  gridConfig.expansionTiers as GridExpansionTier[];

export function getMaxGridSizeForLevel(level: number): number {
  for (let i = GRID_EXPANSION_TIERS.length - 1; i >= 0; i--) {
    if (level >= GRID_EXPANSION_TIERS[i].requiredLevel) {
      return GRID_EXPANSION_TIERS[i].size;
    }
  }
  return GRID_EXPANSION_TIERS[0].size;
}

export function getNextExpansionTier(currentSize: number): GridExpansionTier | null {
  const currentIndex = GRID_EXPANSION_TIERS.findIndex((t) => t.size === currentSize);
  if (currentIndex === -1 || currentIndex >= GRID_EXPANSION_TIERS.length - 1) {
    return null;
  }
  return GRID_EXPANSION_TIERS[currentIndex + 1];
}

export function canAffordExpansion(
  tier: GridExpansionTier,
  resources: Record<string, number>,
  level: number,
): boolean {
  if (level < tier.requiredLevel) {
    return false;
  }
  for (const [resourceType, amount] of Object.entries(tier.cost)) {
    if ((resources[resourceType] ?? 0) < amount) {
      return false;
    }
  }
  return true;
}

export function getNewCellPositions(
  oldSize: number,
  newSize: number,
): { col: number; row: number }[] {
  if (newSize <= oldSize) {
    return [];
  }

  const positions: { col: number; row: number }[] = [];

  for (let col = 0; col < newSize; col++) {
    for (let row = 0; row < newSize; row++) {
      if (col >= oldSize || row >= oldSize) {
        positions.push({ col, row });
      }
    }
  }

  return positions;
}
