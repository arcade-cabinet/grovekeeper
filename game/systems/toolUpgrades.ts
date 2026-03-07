/**
 * Tool upgrade system -- 3 upgrade steps per tool.
 * Tier progression: basic (0) → iron (1) → iron-plus (2) → grovekeeper (3).
 * Tier data read from config/game/toolTiers.json. Spec §11.2
 */

import toolTiersData from "@/config/game/toolTiers.json" with { type: "json" };

export interface ToolUpgradeTier {
  /** Tier number reached after this upgrade (1=iron, 2=iron-plus, 3=grovekeeper). */
  tier: number;
  /** Human-readable name for the target tier. */
  name: string;
  /** Damage multiplier at this tier (vs basic = 1.0x). */
  damageMultiplier: number;
  /** Speed multiplier at this tier (vs basic = 1.0x). */
  speedMultiplier: number;
  /** Maximum uses before the tool breaks at this tier. */
  maxDurabilityUses: number;
  /** Fraction of base stamina cost saved (0.1 = 10% cheaper). */
  staminaReduction: number;
  /** Fraction of base effect added (0.1 = 10% more powerful). */
  effectBoost: number;
  /** Resources consumed to perform this upgrade. */
  cost: Record<string, number>;
  /** Whether the player must be adjacent to a Forge to perform this upgrade. Spec §11.2 */
  requiresForge: boolean;
}

export const TOOL_UPGRADE_TIERS: ToolUpgradeTier[] = toolTiersData as ToolUpgradeTier[];

/** Tier name used for the unupgraded starting state. */
const BASIC_TIER_NAME = "basic";

/**
 * Returns the upgrade-step data needed to advance from `currentTier`.
 * Returns null if the tool is already at max tier.
 */
export function getToolUpgradeTier(currentTier: number): ToolUpgradeTier | null {
  if (currentTier >= TOOL_UPGRADE_TIERS.length) return null;
  return TOOL_UPGRADE_TIERS[currentTier] ?? null;
}

/**
 * Returns the display name for a tool's current tier level.
 * Tier 0 = "basic"; higher tiers are named in config.
 */
export function getToolTierName(currentTier: number): string {
  if (currentTier <= 0) return BASIC_TIER_NAME;
  const entry = TOOL_UPGRADE_TIERS.find((t) => t.tier === currentTier);
  return entry?.name ?? BASIC_TIER_NAME;
}

/**
 * Returns true if upgrading FROM `currentTier` requires standing at a Forge.
 * Returns false when already at max tier (no upgrade available). Spec §11.2
 */
export function requiresForgeForUpgrade(currentTier: number): boolean {
  const nextTier = getToolUpgradeTier(currentTier);
  return nextTier?.requiresForge ?? false;
}

/**
 * Returns the damage multiplier for a given tier.
 * Tier 0 (basic) = 1.0x; higher tiers read from config. Spec §11.2
 */
export function getDamageMultiplierForTier(currentTier: number): number {
  if (currentTier <= 0) return 1.0;
  const entry = TOOL_UPGRADE_TIERS.find((t) => t.tier === currentTier);
  return entry?.damageMultiplier ?? 1.0;
}

/**
 * Returns the speed multiplier for a given tier. Spec §11.2
 */
export function getSpeedMultiplierForTier(currentTier: number): number {
  if (currentTier <= 0) return 1.0;
  const entry = TOOL_UPGRADE_TIERS.find((t) => t.tier === currentTier);
  return entry?.speedMultiplier ?? 1.0;
}

export function getStaminaCostWithUpgrade(baseCost: number, upgradeTier: number): number {
  if (upgradeTier <= 0) return baseCost;
  const tier = TOOL_UPGRADE_TIERS[Math.min(upgradeTier, TOOL_UPGRADE_TIERS.length) - 1];
  if (!tier) return baseCost;
  return Math.max(1, Math.round(baseCost * (1 - tier.staminaReduction)));
}

export function getEffectWithUpgrade(baseEffect: number, upgradeTier: number): number {
  if (upgradeTier <= 0) return baseEffect;
  const tier = TOOL_UPGRADE_TIERS[Math.min(upgradeTier, TOOL_UPGRADE_TIERS.length) - 1];
  if (!tier) return baseEffect;
  return baseEffect * (1 + tier.effectBoost);
}

export function canAffordToolUpgrade(
  upgradeTier: ToolUpgradeTier,
  resources: Record<string, number>,
): boolean {
  return Object.entries(upgradeTier.cost).every(
    ([resource, amount]) => (resources[resource] ?? 0) >= amount,
  );
}
