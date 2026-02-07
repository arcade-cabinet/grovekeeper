/**
 * Tool upgrade system -- 3 tiers per tool.
 * Each tier reduces stamina cost by 10% and increases effect by 10%.
 */

export interface ToolUpgradeTier {
  tier: number;
  staminaReduction: number; // e.g., 0.1 = 10% reduction
  effectBoost: number; // e.g., 0.1 = 10% boost
  cost: Record<string, number>;
}

export const TOOL_UPGRADE_TIERS: ToolUpgradeTier[] = [
  {
    tier: 1,
    staminaReduction: 0.1,
    effectBoost: 0.1,
    cost: { timber: 20, sap: 10 },
  },
  {
    tier: 2,
    staminaReduction: 0.2,
    effectBoost: 0.2,
    cost: { timber: 40, sap: 20, fruit: 10 },
  },
  {
    tier: 3,
    staminaReduction: 0.3,
    effectBoost: 0.3,
    cost: { timber: 80, sap: 40, fruit: 20, acorns: 10 },
  },
];

export function getToolUpgradeTier(
  currentTier: number,
): ToolUpgradeTier | null {
  if (currentTier >= 3) return null; // Already max
  return TOOL_UPGRADE_TIERS[currentTier] ?? null;
}

export function getStaminaCostWithUpgrade(
  baseCost: number,
  upgradeTier: number,
): number {
  if (upgradeTier <= 0) return baseCost;
  const tier = TOOL_UPGRADE_TIERS[Math.min(upgradeTier, 3) - 1];
  if (!tier) return baseCost;
  return Math.max(1, Math.round(baseCost * (1 - tier.staminaReduction)));
}

export function getEffectWithUpgrade(
  baseEffect: number,
  upgradeTier: number,
): number {
  if (upgradeTier <= 0) return baseEffect;
  const tier = TOOL_UPGRADE_TIERS[Math.min(upgradeTier, 3) - 1];
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
