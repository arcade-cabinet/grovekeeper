/**
 * World module barrel — re-exports the Wave 8 biome-aware world surface
 * so other modules (`scene/runtime.ts`, future streamer in Wave 9) can
 * import from `@/game/world` without reaching into individual files.
 */

// Tileset loader.
export {
  biomeTilesetDefinition,
  loadBiomeTileset,
} from "./BiomeTilesetLoader";
export type { AssignableBiomeId } from "./biomeAssigner";
// Wave 9 — biome assigner + chunk streaming manager.
export {
  ASSIGNABLE_BIOME_IDS,
  assignBiome,
  getBiomeWeightTable,
} from "./biomeAssigner";
export type {
  BiomeDecoration,
  BiomeDefinition,
  BiomeId,
  BiomePalette,
} from "./biomes";
// Biome registry (Wave 8).
export {
  BIOME_IDS,
  COAST_BIOME,
  COAST_BLOCK_IDS,
  DEFAULT_BIOME_ID,
  FOREST_BIOME,
  FOREST_BLOCK_IDS,
  GROVE_BIOME,
  GROVE_BLOCK_IDS,
  getBiome,
  listBiomes,
  MEADOW_BIOME,
  MEADOW_BLOCK_IDS,
} from "./biomes";
// Block registration helper.
export { registerBiomeBlocks } from "./blockRegistry";
export type {
  ChunkActorOptions,
  ChunkBlockMod as ChunkActorBlockMod,
} from "./ChunkActor";
// Actors. ChunkActor is the Wave 9 streaming-aware version; the
// SingleChunkActor name is preserved as a thin alias so any external
// callers still resolve.
export { ChunkActor } from "./ChunkActor";
export type {
  ChunkManagerHooks,
  ChunkManagerOptions,
  ChunkManagerStreamingConfig,
  PlayerPositionRef,
  StreamingDensityConfig,
} from "./ChunkManager";
export { ChunkManager } from "./ChunkManager";
export type { ChunkStreamerBehaviorOptions } from "./ChunkStreamerBehavior";
export { ChunkStreamerBehavior } from "./ChunkStreamerBehavior";
export type { ChunkGeneratorInput } from "./chunkGenerator";
// Chunk generator.
export {
  buildChunkJSON,
  CHUNK_TUNING,
  countDecorationBlocks,
  countSurfaceBlocksAtY,
} from "./chunkGenerator";
export {
  GroveTickBehavior,
  type GroveTickBehaviorOptions,
} from "./GroveTickBehavior";
// Wave 10 — grove placement, glow, discovery.
export {
  createGroveDiscoverySystem,
  type GroveDiscoverySystem,
  type GroveDiscoverySystemDeps,
} from "./groveDiscovery";
export {
  applyGroveEmissivePulse,
  createGroveFireflies,
  disposeGroveGlow,
  GROVE_EMISSIVE_AMPLITUDE,
  GROVE_EMISSIVE_BASE,
  GROVE_EMISSIVE_COLOR,
  GROVE_EMISSIVE_PERIOD_SECONDS,
  GROVE_FIREFLY_COUNT,
  type GroveGlowHandle,
  updateGroveEmissivePulse,
  updateGroveFireflies,
} from "./groveGlow";
export {
  GROVE_RANDOM_PROBABILITY,
  GUARANTEED_GROVE_CHUNKS,
  isGroveChunk,
  SECOND_GROVE_CHUNK,
  STARTER_GROVE_CHUNK,
} from "./grovePlacement";
// Sub-wave C — starter grove pre-state seeding.
export {
  isStarterGroveSeeded,
  LOG_PILE_BLOCK_ID,
  LOG_PILE_LOCAL_POSITIONS,
  seedStarterGrove,
  STARTER_PROP_Y,
  STARTER_RECIPE_ID,
  starterGroveId,
  STONE_CAIRN_BLOCK_ID,
  STONE_CAIRN_LOCAL_POSITIONS,
} from "./starterGrove";
// Sub-wave C — threshold chime system.
export {
  createThresholdSystem,
  THRESHOLD_DEBOUNCE_MS,
  type ThresholdSystem,
  type ThresholdSystemDeps,
} from "./thresholdSystem";
export type { SingleChunkActorOptions } from "./SingleChunkActor";
export { SingleChunkActor } from "./SingleChunkActor";
export {
  isMobileLikeDevice,
  resolveStreamingConfig,
} from "./streamingConfig";
