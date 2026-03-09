/**
 * Terrain material key mapping (Spec §47.4)
 *
 * Maps biome identifiers to PBR texture keys and provides season overlay lookup.
 * All keys must exist in PBRMaterialCache's TEXTURE_REGISTRY.
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

const BIOME_TO_KEY: Record<string, TerrainTextureKey> = {
  forest: "terrain/forest_floor",
  village: "terrain/cobblestone",
  path: "terrain/dirt_path",
  beach: "terrain/sand_beach",
  tundra: "terrain/snow_ground",
};

/**
 * Returns the PBR texture key for a given biome identifier.
 * Unknown biomes default to terrain/grass_green (Spec §47.4).
 */
export function getBiomeMaterialKey(biome: string): TerrainTextureKey {
  return BIOME_TO_KEY[biome] ?? "terrain/grass_green";
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
