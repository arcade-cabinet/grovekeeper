/**
 * Prestige system for Grovekeeper.
 *
 * Unlocks at level 25. On prestige the player resets most progress but
 * gains permanent cumulative bonuses and access to 3 rare prestige-only
 * tree species.
 *
 * All functions are PURE -- no imports from stores or ECS.
 */

import prestigeConfig from "@/config/game/prestige.json" with { type: "json" };
import { emptyResources } from "@/game/config/resources";

export interface PrestigeBonus {
  growthSpeedMultiplier: number;
  xpMultiplier: number;
  staminaBonus: number;
  harvestYieldMultiplier: number;
  buildCostMultiplier: number;
}

export interface PrestigeSpecies {
  id: string;
  name: string;
  requiredPrestiges: number;
}

export interface PrestigeCosmetic {
  id: string;
  name: string;
  description: string;
  prestigeRequired: number;
  borderColor: string;
  borderStyle: string;
  glowColor?: string;
}

export const PRESTIGE_SPECIES: readonly PrestigeSpecies[] = [
  { id: "crystal-oak", name: "Crystalline Oak", requiredPrestiges: 1 },
  { id: "moonwood-ash", name: "Moonwood Ash", requiredPrestiges: 2 },
  { id: "worldtree", name: "Worldtree", requiredPrestiges: 3 },
] as const;

export const PRESTIGE_MIN_LEVEL: number = prestigeConfig.minLevel;

export const PRESTIGE_COSMETICS: readonly PrestigeCosmetic[] = [
  {
    id: "stone-wall",
    name: "Stone Wall",
    description: "Rough stone border around your grove",
    prestigeRequired: 1,
    borderColor: "#8B8682",
    borderStyle: "4px solid",
  },
  {
    id: "flower-hedge",
    name: "Flower Hedge",
    description: "Flowering hedge border",
    prestigeRequired: 2,
    borderColor: "#E8A0BF",
    borderStyle: "4px double",
  },
  {
    id: "fairy-lights",
    name: "Fairy Lights",
    description: "Glowing fairy lights along the border",
    prestigeRequired: 3,
    borderColor: "#FFD700",
    borderStyle: "3px dashed",
    glowColor: "rgba(255,215,0,0.3)",
  },
  {
    id: "crystal-boundary",
    name: "Crystal Boundary",
    description: "Shimmering crystal border",
    prestigeRequired: 4,
    borderColor: "#A8DADC",
    borderStyle: "4px ridge",
    glowColor: "rgba(168,218,220,0.4)",
  },
  {
    id: "ancient-runes",
    name: "Ancient Runes",
    description: "Mysterious runic border markings",
    prestigeRequired: 5,
    borderColor: "#7FB285",
    borderStyle: "5px groove",
    glowColor: "rgba(127,178,133,0.3)",
  },
] as const;

export function canPrestige(level: number): boolean {
  return level >= PRESTIGE_MIN_LEVEL;
}

export function calculatePrestigeBonus(prestigeCount: number): PrestigeBonus {
  if (prestigeCount <= 0) {
    return {
      growthSpeedMultiplier: 1.0,
      xpMultiplier: 1.0,
      staminaBonus: 0,
      harvestYieldMultiplier: 1.0,
      buildCostMultiplier: 1.0,
    };
  }
  const table = prestigeConfig.bonusTable;
  if (prestigeCount <= table.length) {
    return { ...table[prestigeCount - 1] };
  }
  const overflow = prestigeCount - table.length;
  const sc = prestigeConfig.scalingBeyond3;
  return {
    growthSpeedMultiplier: sc.growthBase + sc.growthStep * overflow,
    xpMultiplier: sc.xpBase + sc.xpStep * overflow,
    staminaBonus: sc.staminaBase + sc.staminaStep * overflow,
    harvestYieldMultiplier: sc.harvestBase + sc.harvestStep * overflow,
    buildCostMultiplier: Math.max(
      sc.buildCostFloor,
      sc.buildCostBase - sc.buildCostStep * overflow,
    ),
  };
}

export function getUnlockedPrestigeSpecies(prestigeCount: number): PrestigeSpecies[] {
  return PRESTIGE_SPECIES.filter((s) => prestigeCount >= s.requiredPrestiges);
}

export function getUnlockedCosmetics(prestigeCount: number): PrestigeCosmetic[] {
  return PRESTIGE_COSMETICS.filter((c) => prestigeCount >= c.prestigeRequired);
}

export function getActiveCosmetic(prestigeCount: number): PrestigeCosmetic | null {
  const unlocked = getUnlockedCosmetics(prestigeCount);
  return unlocked.length > 0 ? unlocked[unlocked.length - 1] : null;
}

export function getCosmeticById(id: string): PrestigeCosmetic | null {
  return PRESTIGE_COSMETICS.find((c) => c.id === id) ?? null;
}

export function getPrestigeResetState(): {
  level: number;
  xp: number;
  treesPlanted: number;
  treesHarvested: number;
  treesWatered: number;
  treesMatured: number;
  resources: Record<string, number>;
  seeds: Record<string, number>;
  groveData: null;
} {
  return {
    level: 1,
    xp: 0,
    treesPlanted: 0,
    treesHarvested: 0,
    treesWatered: 0,
    treesMatured: 0,
    resources: emptyResources(),
    seeds: { "white-oak": 10 },
    groveData: null,
  };
}

/** Counter ensures uniqueness even when called multiple times within the same millisecond. */
let _ngPlusSeedCounter = 0;

/**
 * Generate a unique world seed for a NG+ run.
 * Uses timestamp + monotonic counter -- no Math.random().
 */
export function generateNewWorldSeed(): string {
  _ngPlusSeedCounter += 1;
  const ts = Date.now().toString(36);
  const seq = _ngPlusSeedCounter.toString(36).padStart(4, "0");
  return `ng${ts}-${seq}`;
}
