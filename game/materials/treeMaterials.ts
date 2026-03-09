/**
 * Tree material key mapping (Spec §47.4)
 *
 * Maps species IDs to bark and foliage PBR texture keys.
 * Species IDs come from config/game/species.json.
 * All keys must exist in PBRMaterialCache's TEXTURE_REGISTRY.
 */

/** All valid bark texture keys. Exported so tests can validate returned keys. */
export const BARK_TEXTURE_KEYS = ["bark/oak", "bark/birch", "bark/pine", "bark/sakura"] as const;

/** All valid foliage texture keys. Exported so tests can validate returned keys. */
export const FOLIAGE_TEXTURE_KEYS = ["foliage/leaves_green", "foliage/leaves_autumn"] as const;

export type BarkTextureKey = (typeof BARK_TEXTURE_KEYS)[number];
export type FoliageTextureKey = (typeof FOLIAGE_TEXTURE_KEYS)[number];

// Species grouped by bark type (Spec §47.1)
const BIRCH_SPECIES = new Set(["birch", "silver-birch", "ghost-birch"]);
const PINE_SPECIES = new Set(["elder-pine", "cedar"]);
const SAKURA_SPECIES = new Set(["cherry-blossom", "flame-maple", "mystic-fern"]);

// Conifer species are evergreen — retain foliage in winter (Spec §47.4)
const CONIFER_SPECIES = new Set(["elder-pine", "cedar"]);

/**
 * Returns the PBR bark texture key for a given species ID.
 * Unknown species default to bark/oak (Spec §47.4).
 */
export function getBarkMaterialKey(species: string): BarkTextureKey {
  if (BIRCH_SPECIES.has(species)) return "bark/birch";
  if (PINE_SPECIES.has(species)) return "bark/pine";
  if (SAKURA_SPECIES.has(species)) return "bark/sakura";
  return "bark/oak";
}

/**
 * Returns the PBR foliage texture key for a given species ID and season.
 * Returns null for deciduous species in winter (bare branches) (Spec §47.4).
 */
export function getFoliageMaterialKey(species: string, season: string): FoliageTextureKey | null {
  if (season === "winter" && !CONIFER_SPECIES.has(species)) {
    return null;
  }
  if (season === "autumn") {
    return "foliage/leaves_autumn";
  }
  return "foliage/leaves_green";
}
