/**
 * Species Discovery System -- pure functions for codex progress computation.
 *
 * Discovery tier is computed from interaction stats:
 * Tier 0: Never planted
 * Tier 1: timesPlanted >= 1
 * Tier 2: maxStageReached >= 3 (Mature)
 * Tier 3: maxStageReached >= 4 (Old Growth)
 * Tier 4: timesHarvested >= 10
 *
 * All functions are PURE -- no imports from stores or ECS.
 */

import type { DiscoveryTier } from "../constants/codex";
import { PRESTIGE_TREE_SPECIES, TREE_SPECIES } from "../constants/trees";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SpeciesProgress {
  timesPlanted: number;
  maxStageReached: number;
  timesHarvested: number;
  totalYield: number;
  discoveryTier: DiscoveryTier;
}

export interface CodexStats {
  totalSpecies: number;
  speciesDiscovered: number; // tier >= 1
  speciesStudied: number; // tier >= 2
  speciesMastered: number; // tier >= 3
  speciesLegendary: number; // tier >= 4
  completionPercent: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Stage index for Mature (growth stage 3). */
const MATURE_STAGE = 3;

/** Stage index for Old Growth (growth stage 4). */
const OLD_GROWTH_STAGE = 4;

/** Number of harvests required for Legendary (tier 4). */
const LEGENDARY_HARVEST_THRESHOLD = 10;

/** Total number of species in the game. */
const TOTAL_SPECIES_COUNT =
  TREE_SPECIES.length + PRESTIGE_TREE_SPECIES.length;

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Compute the discovery tier for a species based on its interaction stats.
 *
 * Tiers are checked in descending order so the highest qualifying tier wins:
 * - Tier 4: timesHarvested >= 10
 * - Tier 3: maxStageReached >= 4 (Old Growth)
 * - Tier 2: maxStageReached >= 3 (Mature)
 * - Tier 1: timesPlanted >= 1
 * - Tier 0: default
 */
export function computeDiscoveryTier(
  progress: Omit<SpeciesProgress, "discoveryTier">,
): DiscoveryTier {
  if (progress.timesHarvested >= LEGENDARY_HARVEST_THRESHOLD) {
    return 4;
  }
  if (progress.maxStageReached >= OLD_GROWTH_STAGE) {
    return 3;
  }
  if (progress.maxStageReached >= MATURE_STAGE) {
    return 2;
  }
  if (progress.timesPlanted >= 1) {
    return 1;
  }
  return 0;
}

/**
 * Create an empty species progress record for a species not yet interacted with.
 */
export function createEmptyProgress(): SpeciesProgress {
  return {
    timesPlanted: 0,
    maxStageReached: 0,
    timesHarvested: 0,
    totalYield: 0,
    discoveryTier: 0,
  };
}

/**
 * Calculate aggregate codex statistics across all species progress.
 *
 * The completionPercent is based on species reaching tier 4 (Legendary)
 * as a fraction of the total species count.
 */
export function checkDiscoveryProgress(
  allProgress: Record<string, SpeciesProgress>,
): CodexStats {
  let speciesDiscovered = 0;
  let speciesStudied = 0;
  let speciesMastered = 0;
  let speciesLegendary = 0;

  for (const progress of Object.values(allProgress)) {
    const tier = progress.discoveryTier;
    if (tier >= 1) speciesDiscovered++;
    if (tier >= 2) speciesStudied++;
    if (tier >= 3) speciesMastered++;
    if (tier >= 4) speciesLegendary++;
  }

  const completionPercent =
    TOTAL_SPECIES_COUNT > 0
      ? Math.round((speciesLegendary / TOTAL_SPECIES_COUNT) * 100)
      : 0;

  return {
    totalSpecies: TOTAL_SPECIES_COUNT,
    speciesDiscovered,
    speciesStudied,
    speciesMastered,
    speciesLegendary,
    completionPercent,
  };
}

/**
 * Return the list of codex fields visible at a given discovery tier.
 *
 * Tier 0: [] (nothing visible, silhouette only)
 * Tier 1: ["name", "lore.tier1"]
 * Tier 2: ["name", "lore.tier1", "lore.tier2", "habitat", "growthTip"]
 * Tier 3: ["name", "lore.tier1", "lore.tier2", "lore.tier3", "habitat", "growthTip", "funFact"]
 * Tier 4: ["name", "lore.tier1", "lore.tier2", "lore.tier3", "lore.tier4", "habitat", "growthTip", "funFact"]
 */
export function getVisibleCodexFields(tier: DiscoveryTier): string[] {
  switch (tier) {
    case 0:
      return [];
    case 1:
      return ["name", "lore.tier1"];
    case 2:
      return ["name", "lore.tier1", "lore.tier2", "habitat", "growthTip"];
    case 3:
      return [
        "name",
        "lore.tier1",
        "lore.tier2",
        "lore.tier3",
        "habitat",
        "growthTip",
        "funFact",
      ];
    case 4:
      return [
        "name",
        "lore.tier1",
        "lore.tier2",
        "lore.tier3",
        "lore.tier4",
        "habitat",
        "growthTip",
        "funFact",
      ];
  }
}
