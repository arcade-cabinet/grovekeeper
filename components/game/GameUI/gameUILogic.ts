/**
 * GameUI pure logic functions (Spec §24 — HUD Layout).
 *
 * Extracted from useGameUIData for testability.
 * No React or React Native imports — safe to import in plain .test.ts files.
 */

import {
  canAffordExpansion,
  getNextExpansionTier,
} from "@/game/systems/gridExpansion";
import {
  calculatePrestigeBonus,
  canPrestige as checkCanPrestige,
  PRESTIGE_MIN_LEVEL,
} from "@/game/systems/prestige";

export interface GridExpansionInfo {
  nextSize: number;
  nextRequiredLevel: number;
  costLabel: string;
  canAfford: boolean;
  meetsLevel: boolean;
}

export interface PrestigeInfo {
  count: number;
  growthBonusPct: number;
  isEligible: boolean;
  minLevel: number;
}

/**
 * Compute grid expansion info for the PauseMenu expansion UI.
 * Returns null when the player is already at the maximum grid size.
 */
export function buildGridExpansionInfo(
  gridSize: number,
  resources: Record<string, number>,
  level: number,
): GridExpansionInfo | null {
  const nextTier = getNextExpansionTier(gridSize);
  if (!nextTier) return null;

  const canAfford = canAffordExpansion(nextTier, resources, level);
  const meetsLevel = level >= nextTier.requiredLevel;
  const costLabel = Object.entries(nextTier.cost)
    .filter(([, amount]) => amount > 0)
    .map(
      ([resource, amount]) =>
        `${amount} ${resource.charAt(0).toUpperCase() + resource.slice(1)}`,
    )
    .join(", ");

  return {
    nextSize: nextTier.size,
    nextRequiredLevel: nextTier.requiredLevel,
    costLabel,
    canAfford,
    meetsLevel,
  };
}

/**
 * Compute prestige display info for the PauseMenu prestige UI.
 */
export function buildPrestigeInfo(
  prestigeCount: number,
  level: number,
): PrestigeInfo {
  const bonus = calculatePrestigeBonus(prestigeCount);
  return {
    count: prestigeCount,
    growthBonusPct: Math.round((bonus.growthSpeedMultiplier - 1) * 100),
    isEligible: checkCanPrestige(level),
    minLevel: PRESTIGE_MIN_LEVEL,
  };
}
