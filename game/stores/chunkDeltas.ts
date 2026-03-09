/**
 * chunkDeltas.ts -- Chunk persistence state re-exports.
 * Delta-only persistence: only player changes are stored, world regenerates from seed.
 * Spec §6
 */

export {
  chunkDiffs$,
  clearAllChunkDiffs,
  saveChunkDiff,
} from "@/game/world/chunkPersistence";
