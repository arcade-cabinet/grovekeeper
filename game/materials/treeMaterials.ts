/**
 * Tree material key mapping (Spec §47.4)
 *
 * Maps species IDs to bark and foliage PBR texture keys.
 * Species IDs come from config/game/species.json.
 * All keys must exist in PBRMaterialCache's TEXTURE_REGISTRY.
 *
 * No fallbacks — unknown species throw. All species are mapped explicitly.
 */

/** All valid bark texture keys. Exported so tests can validate returned keys. */
export const BARK_TEXTURE_KEYS = ["bark/oak", "bark/birch", "bark/pine", "bark/sakura"] as const;

/** All valid foliage texture keys. Exported so tests can validate returned keys. */
export const FOLIAGE_TEXTURE_KEYS = ["foliage/leaves_green", "foliage/leaves_autumn"] as const;

export type BarkTextureKey = (typeof BARK_TEXTURE_KEYS)[number];
export type FoliageTextureKey = (typeof FOLIAGE_TEXTURE_KEYS)[number];

/**
 * Explicit species → bark texture mapping. Every species from species.json must appear.
 * Grouped by bark family: oak (broadleaf), birch (white bark), pine (conifer), sakura (flowering).
 */
const SPECIES_TO_BARK: Record<string, BarkTextureKey> = {
  // Oak family — broadleaf hardwoods
  "white-oak": "bark/oak",
  "weeping-willow": "bark/oak",
  redwood: "bark/oak",
  baobab: "bark/oak",
  ironbark: "bark/oak",
  "golden-apple": "bark/oak",
  elm: "bark/oak",
  ash: "bark/oak",
  maple: "bark/oak",
  "crystal-oak": "bark/oak",
  "moonwood-ash": "bark/oak",
  worldtree: "bark/oak",
  // Birch family — white/silver bark
  birch: "bark/birch",
  "silver-birch": "bark/birch",
  "ghost-birch": "bark/birch",
  // Pine family — conifers
  "elder-pine": "bark/pine",
  cedar: "bark/pine",
  // Sakura family — flowering/exotic
  "cherry-blossom": "bark/sakura",
  "flame-maple": "bark/sakura",
  "mystic-fern": "bark/sakura",
};

// Conifer species are evergreen — retain foliage in winter (Spec §47.4)
const CONIFER_SPECIES = new Set(["elder-pine", "cedar"]);

/**
 * Returns the PBR bark texture key for a given species ID.
 * Throws on unknown species — no silent fallbacks (Spec §47.4).
 */
export function getBarkMaterialKey(species: string): BarkTextureKey {
  const key = SPECIES_TO_BARK[species];
  if (!key) {
    throw new Error(`treeMaterials: unknown species '${species}'`);
  }
  return key;
}

/**
 * Returns the PBR foliage texture key for a given species ID and season.
 * Returns null for deciduous species in winter (bare branches) (Spec §47.4).
 * Throws on unknown species — no fallbacks.
 */
export function getFoliageMaterialKey(species: string, season: string): FoliageTextureKey | null {
  if (!SPECIES_TO_BARK[species]) {
    throw new Error(`treeMaterials: unknown species '${species}'`);
  }
  if (season === "winter" && !CONIFER_SPECIES.has(species)) {
    return null;
  }
  if (season === "autumn") {
    return "foliage/leaves_autumn";
  }
  return "foliage/leaves_green";
}
