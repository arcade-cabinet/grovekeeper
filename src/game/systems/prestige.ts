/**
 * Prestige system for Grovekeeper.
 *
 * Unlocks at level 25. On prestige the player resets most progress but
 * gains permanent cumulative bonuses and access to 3 rare prestige-only
 * tree species.
 *
 * All functions are PURE — no imports from stores or ECS.
 *
 * Spec reference: section 23 — Prestige system.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PrestigeBonus {
  /** Multiplicative bonus to all growth (e.g. 1.10 = +10%). */
  growthSpeedMultiplier: number;
  /** Multiplicative bonus to XP gains (e.g. 1.10 = +10%). */
  xpMultiplier: number;
  /** Flat bonus added to max stamina. */
  staminaBonus: number;
  /** Multiplicative bonus to harvest yields (e.g. 1.05 = +5%). */
  harvestYieldMultiplier: number;
}

export interface PrestigeSpecies {
  /** Unique species identifier. */
  id: string;
  /** Human-readable species name. */
  name: string;
  /** How many times the player must prestige to unlock this species. */
  requiredPrestiges: number;
}

export interface PrestigeCosmetic {
  /** Unique cosmetic identifier. */
  id: string;
  /** Human-readable cosmetic name. */
  name: string;
  /** Description shown in UI. */
  description: string;
  /** How many times the player must prestige to unlock this cosmetic. */
  prestigeRequired: number;
  /** CSS border color for the grove frame. */
  borderColor: string;
  /** CSS border style property (e.g. "4px solid"). */
  borderStyle: string;
  /** Optional CSS box-shadow glow color. */
  glowColor?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * The 3 prestige-only tree species, ordered by prestige requirement.
 *
 * - Spirit Tree (1 prestige): difficulty 5, all-season, yields all 4 resources.
 * - Crystal Willow (2 prestiges): difficulty 4, 2x winter growth, yields sap + acorns.
 * - World Tree (3 prestiges): difficulty 5, 2x2 footprint, massive yields, longest growth.
 */
export const PRESTIGE_SPECIES: readonly PrestigeSpecies[] = [
  {
    id: "crystal-oak",
    name: "Crystalline Oak",
    requiredPrestiges: 1,
  },
  {
    id: "moonwood-ash",
    name: "Moonwood Ash",
    requiredPrestiges: 2,
  },
  {
    id: "worldtree",
    name: "Worldtree",
    requiredPrestiges: 3,
  },
] as const;

/** Minimum player level required to prestige. */
export const PRESTIGE_MIN_LEVEL = 25;

/**
 * The 5 prestige cosmetics — decorative border themes that unlock at each prestige level.
 *
 * These are purely visual rewards that customize the grove frame borders (left and right edges).
 */
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

// ---------------------------------------------------------------------------
// Bonus lookup table for prestige counts 1-3
// ---------------------------------------------------------------------------

const BONUS_TABLE: readonly PrestigeBonus[] = [
  // Index 0 = prestige count 1
  {
    growthSpeedMultiplier: 1.1,
    xpMultiplier: 1.1,
    staminaBonus: 10,
    harvestYieldMultiplier: 1.05,
  },
  // Index 1 = prestige count 2
  {
    growthSpeedMultiplier: 1.2,
    xpMultiplier: 1.2,
    staminaBonus: 20,
    harvestYieldMultiplier: 1.1,
  },
  // Index 2 = prestige count 3
  {
    growthSpeedMultiplier: 1.35,
    xpMultiplier: 1.3,
    staminaBonus: 30,
    harvestYieldMultiplier: 1.2,
  },
];

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Check whether the player is eligible to prestige.
 * Requires level >= PRESTIGE_MIN_LEVEL (25).
 */
export function canPrestige(level: number): boolean {
  return level >= PRESTIGE_MIN_LEVEL;
}

/**
 * Calculate the permanent bonuses for a given prestige count (1-based).
 *
 * Bonuses are cumulative — a player who has prestiged 3 times receives the
 * tier-3 bonuses, not the sum of tiers 1+2+3.
 *
 * For count <= 0, returns neutral (no bonus) values.
 *
 * Scaling:
 *   n=1: growth=1.10, xp=1.10, stamina=+10, harvest=1.05
 *   n=2: growth=1.20, xp=1.20, stamina=+20, harvest=1.10
 *   n=3: growth=1.35, xp=1.30, stamina=+30, harvest=1.20
 *   n>=4: growth=1.35+0.05*(n-3), xp=1.30+0.05*(n-3),
 *          stamina=30+5*(n-3), harvest=1.20+0.05*(n-3)
 */
export function calculatePrestigeBonus(prestigeCount: number): PrestigeBonus {
  if (prestigeCount <= 0) {
    return {
      growthSpeedMultiplier: 1.0,
      xpMultiplier: 1.0,
      staminaBonus: 0,
      harvestYieldMultiplier: 1.0,
    };
  }

  // Use lookup table for counts 1-3
  if (prestigeCount <= 3) {
    return { ...BONUS_TABLE[prestigeCount - 1] };
  }

  // For count >= 4, extend from the tier-3 base
  const overflow = prestigeCount - 3;
  return {
    growthSpeedMultiplier: 1.35 + 0.05 * overflow,
    xpMultiplier: 1.3 + 0.05 * overflow,
    staminaBonus: 30 + 5 * overflow,
    harvestYieldMultiplier: 1.2 + 0.05 * overflow,
  };
}

/**
 * Return the prestige species unlocked at a given prestige count.
 * A species is unlocked when the player's prestige count >= its requirement.
 */
export function getUnlockedPrestigeSpecies(
  prestigeCount: number,
): PrestigeSpecies[] {
  return PRESTIGE_SPECIES.filter((s) => prestigeCount >= s.requiredPrestiges);
}

/**
 * Return the cosmetics unlocked at a given prestige count.
 * A cosmetic is unlocked when the player's prestige count >= its requirement.
 */
export function getUnlockedCosmetics(
  prestigeCount: number,
): PrestigeCosmetic[] {
  return PRESTIGE_COSMETICS.filter((c) => prestigeCount >= c.prestigeRequired);
}

/**
 * Return the active cosmetic for the given prestige count.
 * Defaults to the highest-tier cosmetic unlocked, or null if none are unlocked.
 */
export function getActiveCosmetic(
  prestigeCount: number,
): PrestigeCosmetic | null {
  const unlocked = getUnlockedCosmetics(prestigeCount);
  return unlocked.length > 0 ? unlocked[unlocked.length - 1] : null;
}

/**
 * Return a cosmetic by ID, or null if not found.
 */
export function getCosmeticById(id: string): PrestigeCosmetic | null {
  return PRESTIGE_COSMETICS.find((c) => c.id === id) ?? null;
}

/**
 * Return the initial state values that should be applied when the player
 * prestiges. Only covers fields that get reset — the caller is responsible
 * for preserving achievements, prestige count, settings, etc.
 */
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
    resources: { timber: 0, sap: 0, fruit: 0, acorns: 0 },
    seeds: { "white-oak": 10 },
    groveData: null,
  };
}
