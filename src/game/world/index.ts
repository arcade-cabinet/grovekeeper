/**
 * World module barrel — re-exports the Wave 7 meadow chunk surface so
 * other modules (`scene/runtime.ts`, future streamer in Wave 9) can
 * import from `@/game/world` without reaching into individual files.
 */

export {
  MEADOW_BLOCK_DEFS,
  MEADOW_BLOCK_IDS,
  MEADOW_TILESET_ID,
  registerMeadowBlocks,
} from "./blockRegistry";
export type { MeadowBlockId } from "./blockRegistry";
export {
  loadMeadowTileset,
  meadowTilesetDefinition,
} from "./MeadowTilesetLoader";
export {
  buildMeadowChunkJSON,
  countSurfaceBlocksAtY,
  MEADOW_CHUNK_TUNING,
} from "./meadowChunk";
export type { MeadowChunkInput } from "./meadowChunk";
export { SingleChunkActor } from "./SingleChunkActor";
export type { SingleChunkActorOptions } from "./SingleChunkActor";
