/**
 * Prestige system for Grovekeeper.
 *
 * Unlocks at level 25. On prestige the player resets most progress but
 * gains permanent cumulative bonuses and access to 3 rare prestige-only
 * tree species.
 *
 * All functions are PURE -- no imports from stores or ECS.
 */

export interface PrestigeBonus {
  growthSpeedMultiplier: number;
  xpMultiplier: number;
  staminaBonus: number;
  harvestYieldMultiplier: number;
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

export const PRESTIGE_MIN_LEVEL = 25;

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

const BONUS_TABLE: readonly PrestigeBonus[] = [
  {
    growthSpeedMultiplier: 1.1,
    xpMultiplier: 1.1,
    staminaBonus: 10,
    harvestYieldMultiplier: 1.05,
  },
  {
    growthSpeedMultiplier: 1.2,
    xpMultiplier: 1.2,
    staminaBonus: 20,
    harvestYieldMultiplier: 1.1,
  },
  {
    growthSpeedMultiplier: 1.35,
    xpMultiplier: 1.3,
    staminaBonus: 30,
    harvestYieldMultiplier: 1.2,
  },
];

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
    };
  }
  if (prestigeCount <= 3) {
    return { ...BONUS_TABLE[prestigeCount - 1] };
  }
  const overflow = prestigeCount - 3;
  return {
    growthSpeedMultiplier: 1.35 + 0.05 * overflow,
    xpMultiplier: 1.3 + 0.05 * overflow,
    staminaBonus: 30 + 5 * overflow,
    harvestYieldMultiplier: 1.2 + 0.05 * overflow,
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
    resources: { timber: 0, sap: 0, fruit: 0, acorns: 0, wood: 0, stone: 0, metal_scrap: 0, fiber: 0 },
    seeds: { "white-oak": 10 },
    groveData: null,
  };
}
