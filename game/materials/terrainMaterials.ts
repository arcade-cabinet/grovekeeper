/**
 * Terrain material key mapping (Spec §47.4)
 *
 * Maps biome identifiers to PBR texture keys and provides season overlay lookup.
 * All keys must exist in PBRMaterialCache's TEXTURE_REGISTRY.
 *
 * No fallbacks — unknown biomes throw. All 8 BiomeType values are mapped explicitly.
 */

/** All valid terrain texture keys. Exported so tests can validate returned keys. */
export const TERRAIN_TEXTURE_KEYS = [
  "terrain/grass_green",
  "terrain/forest_floor",
  "terrain/dirt_path",
  "terrain/cobblestone",
  "terrain/snow_ground",
  "terrain/sand_beach",
] as const;

export type TerrainTextureKey = (typeof TERRAIN_TEXTURE_KEYS)[number];

/**
 * Maps all 8 BiomeType values to PBR texture keys.
 * Every biome in biomeMapper.ts must be present here.
 */
const BIOME_TO_KEY: Record<string, TerrainTextureKey> = {
  "starting-grove": "terrain/grass_green",
  meadow: "terrain/grass_green",
  "ancient-forest": "terrain/forest_floor",
  wetlands: "terrain/forest_floor",
  "rocky-highlands": "terrain/dirt_path",
  "orchard-valley": "terrain/grass_green",
  "frozen-peaks": "terrain/snow_ground",
  "twilight-glade": "terrain/forest_floor",
  // Legacy/alias biome names (used in tests or older chunk data)
  forest: "terrain/forest_floor",
  village: "terrain/cobblestone",
  path: "terrain/dirt_path",
  beach: "terrain/sand_beach",
  tundra: "terrain/snow_ground",
  grassland: "terrain/grass_green",
};

/**
 * Returns the PBR texture key for a given biome identifier.
 * Throws on unknown biomes — no silent fallbacks (Spec §47.4).
 */
export function getBiomeMaterialKey(biome: string): TerrainTextureKey {
  const key = BIOME_TO_KEY[biome];
  if (!key) {
    throw new Error(`terrainMaterials: unknown biome '${biome}'`);
  }
  return key;
}

/**
 * Returns the seasonal terrain overlay key for the given season,
 * or null if no overlay applies (Spec §47.4).
 * Currently only winter triggers an overlay (snow_ground).
 */
export function getSeasonOverlay(season: string): TerrainTextureKey | null {
  if (season === "winter") {
    return "terrain/snow_ground";
  }
  return null;
}
