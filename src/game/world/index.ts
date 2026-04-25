/**
 * World module barrel — re-exports the Wave 8 biome-aware world surface
 * so other modules (`scene/runtime.ts`, future streamer in Wave 9) can
 * import from `@/game/world` without reaching into individual files.
 */

// Biome registry (Wave 8).
export {
  BIOME_IDS,
  COAST_BIOME,
  COAST_BLOCK_IDS,
  DEFAULT_BIOME_ID,
  FOREST_BIOME,
  FOREST_BLOCK_IDS,
  getBiome,
  GROVE_BIOME,
  GROVE_BLOCK_IDS,
  listBiomes,
  MEADOW_BIOME,
  MEADOW_BLOCK_IDS,
} from "./biomes";
export type {
  BiomeDecoration,
  BiomeDefinition,
  BiomeId,
  BiomePalette,
} from "./biomes";

// Tileset loader.
export {
  biomeTilesetDefinition,
  loadBiomeTileset,
} from "./BiomeTilesetLoader";

// Block registration helper.
export { registerBiomeBlocks } from "./blockRegistry";

// Chunk generator.
export {
  buildChunkJSON,
  CHUNK_TUNING,
  countDecorationBlocks,
  countSurfaceBlocksAtY,
} from "./chunkGenerator";
export type { ChunkGeneratorInput } from "./chunkGenerator";

// Actor.
export { SingleChunkActor } from "./SingleChunkActor";
export type { SingleChunkActorOptions } from "./SingleChunkActor";
