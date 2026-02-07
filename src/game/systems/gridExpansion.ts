/**
 * Grid Expansion System
 *
 * The grove starts as 12x12 and can be expanded through 5 tiers:
 * 12 -> 16 -> 20 -> 24 -> 32
 *
 * Each expansion requires a minimum player level and resource cost.
 * All functions are pure — no imports from stores or ECS.
 *
 * See docs/game-design/grid-system.md for expansion progression details.
 */

export interface GridExpansionTier {
  size: number;
  requiredLevel: number;
  cost: Record<string, number>;
}

/**
 * Canonical expansion tiers. The first tier (12) is the starting grid and is free.
 */
export const GRID_EXPANSION_TIERS: readonly GridExpansionTier[] = [
  { size: 12, requiredLevel: 1, cost: {} },
  { size: 16, requiredLevel: 5, cost: { timber: 100, sap: 50 } },
  { size: 20, requiredLevel: 10, cost: { timber: 250, sap: 100, fruit: 50 } },
  {
    size: 24,
    requiredLevel: 15,
    cost: { timber: 500, sap: 250, fruit: 100, acorns: 50 },
  },
  {
    size: 32,
    requiredLevel: 20,
    cost: { timber: 1000, sap: 500, fruit: 250, acorns: 100 },
  },
] as const;

/**
 * Returns the maximum grid size available at a given player level.
 * Walks the tier table in reverse and returns the first tier
 * whose requiredLevel the player meets.
 */
export function getMaxGridSizeForLevel(level: number): number {
  for (let i = GRID_EXPANSION_TIERS.length - 1; i >= 0; i--) {
    if (level >= GRID_EXPANSION_TIERS[i].requiredLevel) {
      return GRID_EXPANSION_TIERS[i].size;
    }
  }
  // Fallback: starting grid size
  return GRID_EXPANSION_TIERS[0].size;
}

/**
 * Returns the next expansion tier after the current grid size,
 * or null if the grid is already at the maximum size (32).
 */
export function getNextExpansionTier(
  currentSize: number,
): GridExpansionTier | null {
  const currentIndex = GRID_EXPANSION_TIERS.findIndex(
    (t) => t.size === currentSize,
  );
  if (currentIndex === -1 || currentIndex >= GRID_EXPANSION_TIERS.length - 1) {
    return null;
  }
  return GRID_EXPANSION_TIERS[currentIndex + 1];
}

/**
 * Checks whether a player can afford a given expansion tier.
 * Requires both sufficient resources AND meeting the level threshold.
 */
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

/**
 * Calculates which new cell positions are added when expanding from
 * oldSize to newSize. Both grids share origin (0,0), so new cells
 * form an L-shaped border: positions where col >= oldSize OR row >= oldSize
 * (but col < newSize AND row < newSize).
 *
 * Returns an array of {col, row} for the NEW cells only.
 */
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
