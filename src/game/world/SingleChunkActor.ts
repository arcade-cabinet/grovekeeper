/**
 * SingleChunkActor — Wave 7's single-chunk terrain actor. Wave 9
 * superseded this with `ChunkActor` + `ChunkManager` for streaming,
 * but the original alias is preserved as a thin wrapper so existing
 * tests (and any out-of-tree callers) keep working unchanged.
 *
 * New code should import `ChunkActor` directly. The two are now
 * structurally identical — `SingleChunkActor` re-exports `ChunkActor`
 * with the legacy name and option-shape.
 */

export {
  ChunkActor as SingleChunkActor,
  type ChunkActorOptions as SingleChunkActorOptions,
} from "./ChunkActor";
