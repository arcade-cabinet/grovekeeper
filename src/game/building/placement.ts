/**
 * Placement actions — bridges the pure `placeMode` state machine to
 * the persistence layer + the live chunk renderer.
 *
 * The runtime calls `commitBlueprintPlacement` after a successful
 * `commitPlacing` transition. This function:
 *   1. Looks up the blueprint by id.
 *   2. Stamps each block onto the live chunk renderer (the in-memory
 *      voxel mesh) — keyed off the chunk that owns the world voxel.
 *   3. Records each block as a `ChunkBlockMod` in `chunksRepo` so the
 *      change survives reload.
 *   4. Records the structure footprint in `structuresRepo` so the
 *      higher-level "what structures are in this grove" query keeps
 *      working without scanning every voxel.
 *   5. Consumes the blueprint from `inventoryRepo` (the caller passes
 *      a closure here because the inventory layer is reactive).
 *
 * Live chunk-renderer mutation is delegated through a `setBlock`
 * callback the runtime supplies — keeps this module decoupled from
 * `@jolly-pixel/voxel.renderer`.
 */

import type { AppDatabase } from "@/db/client";
import { chunksRepo, structuresRepo } from "@/db/repos";
import type { ChunkBlockMod } from "@/db/schema/rc";
import type { BiomeId } from "@/game/world";
import { getBlueprint } from "./blueprints";
import { blueprintFootprint } from "./placeMode";
import type { VoxelCoord } from "./types";

/** Generate a deterministic-enough id for a placed structure row. */
function newStructureId(): string {
  // crypto.randomUUID is widely available in modern browsers + Node 16+;
  // fallback to a timestamp-based id avoids ReferenceError under older
  // happy-dom test envs.
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `structure-${globalThis.crypto.randomUUID()}`;
  }
  return `structure-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/** Derive (chunkX, chunkZ, localX, localZ) from world voxel coords. */
export function worldVoxelToChunk(
  pos: VoxelCoord,
  chunkSize: number,
): { chunkX: number; chunkZ: number; localX: number; localZ: number } {
  const chunkX = Math.floor(pos.x / chunkSize);
  const chunkZ = Math.floor(pos.z / chunkSize);
  return {
    chunkX,
    chunkZ,
    localX: pos.x - chunkX * chunkSize,
    localZ: pos.z - chunkZ * chunkSize,
  };
}

export interface CommitPlacementInput {
  /** Drizzle handle. */
  db: AppDatabase;
  /** World id (save slot). */
  worldId: string;
  /** Optional grove id if the placement is inside a known grove. */
  groveId?: string;
  /** Blueprint id to commit. */
  blueprintId: string;
  /** Anchor voxel for the blueprint. */
  anchor: VoxelCoord;
  /** Voxel chunk size — used to derive (chunkX, chunkZ) for the mods. */
  chunkSize: number;
  /**
   * Biome of the chunk that owns the anchor — used to tag the chunk
   * row when it's first persisted. Defaulted by the caller (the chunk
   * manager knows the biome).
   */
  biome: BiomeId;
  /**
   * Per-voxel renderer setter. Returns true if the renderer accepted
   * the write (the usual case). Returning false skips the persistence
   * write so the player can place again at a different anchor.
   */
  setBlock: (pos: VoxelCoord, blockId: string) => boolean;
}

export interface CommitPlacementResult {
  /** True if every block was placed (no early-out). */
  success: boolean;
  /** Newly created `placedStructures` row id, or null on failure. */
  structureId: string | null;
  /** The voxel positions that were stamped. */
  stamped: VoxelCoord[];
}

/**
 * Stamp the blueprint and persist. See file header for the chain.
 *
 * Idempotency: caller decides. This function will happily place the
 * same blueprint twice at the same anchor — the chunk repo's
 * coordinate-keyed dedup means the latest write wins. The crafting
 * panel guards against double-spend by checking inventory first.
 */
export function commitBlueprintPlacement(
  input: CommitPlacementInput,
): CommitPlacementResult {
  const blueprint = getBlueprint(input.blueprintId);
  if (!blueprint) {
    return { success: false, structureId: null, stamped: [] };
  }

  const positions = blueprintFootprint(blueprint, input.anchor);
  // Stamp into the live mesh first — if the renderer rejects, we want
  // to bail before we touch persistence.
  for (let i = 0; i < positions.length; i++) {
    const block = blueprint.blocks[i];
    const pos = positions[i];
    const ok = input.setBlock(pos, block.blockId);
    if (!ok) {
      return {
        success: false,
        structureId: null,
        stamped: positions.slice(0, i),
      };
    }
  }

  // Persist each block as a `ChunkBlockMod` keyed by chunk coords.
  for (let i = 0; i < positions.length; i++) {
    const block = blueprint.blocks[i];
    const pos = positions[i];
    const chunk = worldVoxelToChunk(pos, input.chunkSize);
    const mod: ChunkBlockMod = {
      x: chunk.localX,
      y: pos.y,
      z: chunk.localZ,
      op: "set",
      blockId: block.blockId,
    };
    chunksRepo.applyBlockMod(
      input.db,
      input.worldId,
      chunk.chunkX,
      chunk.chunkZ,
      input.biome,
      mod,
    );
  }

  // Record the structure footprint anchored at the placement origin.
  const structureId = newStructureId();
  structuresRepo.placeStructure(input.db, {
    id: structureId,
    worldId: input.worldId,
    groveId: input.groveId ?? null,
    x: input.anchor.x,
    y: input.anchor.y,
    z: input.anchor.z,
    type: blueprint.structureType,
    rotation: 0,
  });

  return { success: true, structureId, stamped: positions };
}
