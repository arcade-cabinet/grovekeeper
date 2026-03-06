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

import { PRESTIGE_TREE_SPECIES, TREE_SPECIES } from "@/game/config/species";
import type { DiscoveryTier } from "@/game/constants/codex";

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
  speciesDiscovered: number;
  speciesStudied: number;
  speciesMastered: number;
  speciesLegendary: number;
  completionPercent: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MATURE_STAGE = 3;
const OLD_GROWTH_STAGE = 4;
const LEGENDARY_HARVEST_THRESHOLD = 10;
const TOTAL_SPECIES_COUNT = TREE_SPECIES.length + PRESTIGE_TREE_SPECIES.length;

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

export function computeDiscoveryTier(
  progress: Omit<SpeciesProgress, "discoveryTier">,
): DiscoveryTier {
  if (progress.timesHarvested >= LEGENDARY_HARVEST_THRESHOLD) return 4;
  if (progress.maxStageReached >= OLD_GROWTH_STAGE) return 3;
  if (progress.maxStageReached >= MATURE_STAGE) return 2;
  if (progress.timesPlanted >= 1) return 1;
  return 0;
}

export function createEmptyProgress(): SpeciesProgress {
  return {
    timesPlanted: 0,
    maxStageReached: 0,
    timesHarvested: 0,
    totalYield: 0,
    discoveryTier: 0,
  };
}

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
    default:
      return [];
  }
}
