/**
 * Species Codex -- encyclopedic data for each tree species.
 *
 * Discovery progresses through 5 tiers based on player interaction:
 * Tier 0: Unknown (silhouette only)
 * Tier 1: Discovered (planted at least once -- reveals name, icon, basic info)
 * Tier 2: Studied (grown to Mature -- reveals growth traits, habitat)
 * Tier 3: Mastered (grown to Old Growth -- reveals full lore, tips)
 * Tier 4: Legendary (harvested 10+ times -- reveals secret lore, milestone reward)
 */

import codexData from "./codex.json";

// ---------------------------------------------------------------------------
// Discovery tier definitions
// ---------------------------------------------------------------------------

export interface DiscoveryTierDef {
  tier: number;
  name: string;
  description: string;
}

export const DISCOVERY_TIERS: Record<number, DiscoveryTierDef> =
  codexData.discoveryTiers as unknown as Record<number, DiscoveryTierDef>;

export type DiscoveryTier = 0 | 1 | 2 | 3 | 4;

// ---------------------------------------------------------------------------
// Species codex entries
// ---------------------------------------------------------------------------

export interface SpeciesCodexEntry {
  speciesId: string;
  lore: {
    tier1: string; // revealed at Discovered
    tier2: string; // revealed at Studied
    tier3: string; // revealed at Mastered
    tier4: string; // revealed at Legendary
  };
  habitat: string;
  growthTip: string;
  funFact: string;
}

const SPECIES_CODEX: SpeciesCodexEntry[] =
  codexData.species as SpeciesCodexEntry[];

/**
 * Look up a codex entry by species ID.
 * Returns undefined if the species has no codex entry.
 */
export function getCodexEntry(
  speciesId: string,
): SpeciesCodexEntry | undefined {
  return SPECIES_CODEX.find((entry) => entry.speciesId === speciesId);
}

/**
 * Return all species codex entries.
 */
export function getAllCodexEntries(): readonly SpeciesCodexEntry[] {
  return SPECIES_CODEX;
}

// ---------------------------------------------------------------------------
// Biome codex entries
// ---------------------------------------------------------------------------

export interface BiomeCodexEntry {
  id: string;
  name: string;
  description: string;
  climate: string;
  nativeSpecies: string[];
}

export const BIOME_CODEX: BiomeCodexEntry[] =
  codexData.biomes as BiomeCodexEntry[];

/**
 * Look up a biome codex entry by biome ID.
 */
export function getBiomeEntry(biomeId: string): BiomeCodexEntry | undefined {
  return BIOME_CODEX.find(
    (entry) => entry.id === biomeId.toLowerCase().replace(/\s+/g, "-"),
  );
}
