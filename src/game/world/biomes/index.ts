/**
 * Biomes barrel — Wave 8.
 *
 * Public surface for the biome registry. Per-biome internals (block id
 * maps, tile coord maps) are intentionally re-exported so the chunk
 * generator and tests can reach them without deep imports.
 */

export { COAST_BIOME, COAST_BLOCK_IDS } from "./coast";
export { FOREST_BIOME, FOREST_BLOCK_IDS } from "./forest";
export { GROVE_BIOME, GROVE_BLOCK_IDS } from "./grove";
export { MEADOW_BIOME, MEADOW_BLOCK_IDS } from "./meadow";
export { DEFAULT_BIOME_ID, getBiome, listBiomes } from "./registry";
export { BIOME_IDS } from "./types";
export type {
  BiomeDecoration,
  BiomeDefinition,
  BiomeId,
  BiomePalette,
} from "./types";
