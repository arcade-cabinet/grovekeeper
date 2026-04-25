/**
 * Gathering types — Wave 16.
 *
 * Pure shapes for the resource-gathering loop. The system itself
 * lives in `gatherSystem.ts`; these types are exported so tests + the
 * runtime wiring can import them without dragging the system class.
 */

/**
 * A single voxel the player is currently targeting for gathering.
 * Coordinates are world-voxel (NOT chunk-local) — the system converts
 * to chunk-local when calling `chunksRepo.applyBlockMod` /
 * `ChunkActor.setBlockLocal`.
 */
export interface GatheringTarget {
  /** World voxel X. */
  x: number;
  /** World voxel Y. */
  y: number;
  /** World voxel Z. */
  z: number;
  /** Biome-prefixed block name, e.g. `meadow.stone`. */
  blockName: string;
}

/**
 * Per-frame progress on a target — accumulated swing count.
 *
 * The system holds at most one of these at a time. When the player
 * stops swinging, points to a different voxel, or walks out of reach,
 * the entry is reset (not preserved across targets — gathering is
 * cozy-tier, not grindy bookkeeping).
 */
export interface GatheringHit {
  target: GatheringTarget;
  /** Number of swings registered against this target so far. */
  hits: number;
}

/**
 * Result of a single `gatherSystem.tick(...)` call. Surfaces what
 * happened so the runtime can wire visual feedback (animation,
 * particles) without needing to inspect the system's private state.
 */
export type GatherTickEvent =
  | { kind: "none" }
  | { kind: "hit"; target: GatheringTarget; hits: number; hitsToBreak: number }
  | {
      kind: "break";
      target: GatheringTarget;
      itemId: string | null;
      count: number;
      /** True if the inventory cap rejected the drop. */
      capped: boolean;
    }
  | { kind: "unbreakable"; target: GatheringTarget };
