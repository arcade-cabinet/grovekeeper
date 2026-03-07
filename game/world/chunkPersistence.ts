/**
 * chunkPersistence -- Delta-only chunk state persistence (Spec §26.2).
 *
 * Architecture:
 *   - Only player-modified chunks get delta entries.
 *   - Unexplored chunks regenerate from seed = zero storage cost.
 *   - Diffs live in a Legend State observable (auto-persisted with the store).
 *   - On chunk reload: regenerate terrain from seed, then call applyChunkDiff.
 *
 * Budget target: <1 MB for 100 hours of play.
 */

import { observable } from "@legendapp/state";
import { generateEntityId, world } from "@/game/ecs/world";
import type { CropId, CropStage } from "@/game/ecs/components/structures";
import cropsConfig from "@/config/game/crops.json" with { type: "json" };
import gridConfig from "@/config/game/grid.json" with { type: "json" };

const CHUNK_SIZE: number = gridConfig.chunkSize;

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal tree state needed to reconstruct a player-planted tree on chunk reload. */
export interface PlantedTree {
  localX: number;
  localZ: number;
  speciesId: string;
  stage: 0 | 1 | 2 | 3 | 4;
  progress: number;
  plantedAt: number;
  meshSeed: number;
}

/** Minimal crop state needed to reconstruct a player-planted crop on chunk reload. */
export interface PlantedCrop {
  localX: number;
  localZ: number;
  cropId: CropId;
  stage: CropStage;
  progress: number;
  watered: boolean;
}

/**
 * ChunkDiff -- all player modifications to a single chunk.
 * Only chunks with at least one modification get a diff entry.
 */
export interface ChunkDiff {
  plantedTrees: PlantedTree[];
  plantedCrops?: PlantedCrop[];
}

// ─── Legend State observable ──────────────────────────────────────────────────

/**
 * chunkDiffs$ -- Legend State observable: chunkKey -> ChunkDiff.
 * Keyed by canonical chunk key ("x,z"). Holds diffs only for modified chunks.
 * Wire this to expo-sqlite persistence via syncObservable in app startup.
 */
export const chunkDiffs$ = observable<Record<string, ChunkDiff>>({});

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Returns true if the chunk has any player modifications saved. */
export function isChunkModified(chunkKey: string): boolean {
  return chunkDiffs$.peek()[chunkKey] !== undefined;
}

/** Returns the stored diff for a chunk, or null if the chunk is unmodified. */
export function loadChunkDiff(chunkKey: string): ChunkDiff | null {
  return chunkDiffs$.peek()[chunkKey] ?? null;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Overwrite the entire diff for a chunk. */
export function saveChunkDiff(chunkKey: string, diff: ChunkDiff): void {
  chunkDiffs$.set({ ...chunkDiffs$.peek(), [chunkKey]: diff });
}

/**
 * Record a newly-planted tree in the chunk diff.
 * Creates the diff entry if this is the first modification to the chunk.
 */
export function recordPlantedTree(chunkKey: string, tree: PlantedTree): void {
  const existing = loadChunkDiff(chunkKey);
  const updated: ChunkDiff = existing
    ? { ...existing, plantedTrees: [...existing.plantedTrees, tree] }
    : { plantedTrees: [tree] };
  saveChunkDiff(chunkKey, updated);
}

/**
 * Record a newly-planted crop in the chunk diff.
 * Creates the diff entry if this is the first modification to the chunk.
 */
export function recordPlantedCrop(chunkKey: string, crop: PlantedCrop): void {
  const existing = loadChunkDiff(chunkKey);
  const updated: ChunkDiff = existing
    ? { ...existing, plantedCrops: [...(existing.plantedCrops ?? []), crop] }
    : { plantedTrees: [], plantedCrops: [crop] };
  saveChunkDiff(chunkKey, updated);
}

/**
 * Update the persisted state of a crop in the chunk diff (e.g., on chunk unload).
 * Matched by localX + localZ. No-op if no crop at that position.
 */
export function updateCropInDiff(
  chunkKey: string,
  localX: number,
  localZ: number,
  stage: CropStage,
  progress: number,
  watered: boolean,
): void {
  const diff = loadChunkDiff(chunkKey);
  if (!diff?.plantedCrops) return;

  const updated = diff.plantedCrops.map((c) =>
    c.localX === localX && c.localZ === localZ
      ? { ...c, stage, progress, watered }
      : c,
  );
  saveChunkDiff(chunkKey, { ...diff, plantedCrops: updated });
}

/** Remove the diff for a chunk (e.g., after chunk reset or new game). */
export function clearChunkDiff(chunkKey: string): void {
  const current = chunkDiffs$.peek();
  const next: Record<string, ChunkDiff> = {};
  for (const key of Object.keys(current)) {
    if (key !== chunkKey) next[key] = current[key];
  }
  chunkDiffs$.set(next);
}

/** Remove all chunk diffs (new game or prestige reset). */
export function clearAllChunkDiffs(): void {
  chunkDiffs$.set({});
}

// ─── Application ─────────────────────────────────────────────────────────────

/**
 * Apply a stored chunk diff to the ECS world.
 *
 * Call this after a chunk is loaded/regenerated from seed so that
 * player-planted trees are restored at their correct positions.
 *
 * @param chunkKey  - canonical chunk key ("x,z")
 * @param chunkX    - chunk grid X coordinate
 * @param chunkZ    - chunk grid Z coordinate
 */
export function applyChunkDiff(
  chunkKey: string,
  chunkX: number,
  chunkZ: number,
): void {
  const diff = loadChunkDiff(chunkKey);
  if (!diff) return;

  for (const planted of diff.plantedTrees) {
    world.add({
      id: generateEntityId(),
      position: {
        x: chunkX * CHUNK_SIZE + planted.localX,
        y: 0,
        z: chunkZ * CHUNK_SIZE + planted.localZ,
      },
      tree: {
        speciesId: planted.speciesId,
        stage: planted.stage,
        progress: planted.progress,
        watered: false,
        totalGrowthTime: 0,
        plantedAt: planted.plantedAt,
        meshSeed: planted.meshSeed,
        wild: false,
        pruned: false,
        fertilized: false,
        baseModel: "",
        winterModel: "",
        useWinterModel: false,
        seasonTint: "#ffffff",
      },
      renderable: { visible: true, scale: 1 },
    });
  }

  const cropLookup = new Map(
    (cropsConfig.crops as Array<{ id: string; modelPath: string }>).map((c) => [
      c.id,
      c.modelPath,
    ]),
  );

  for (const planted of diff.plantedCrops ?? []) {
    const modelPath = cropLookup.get(planted.cropId);
    if (!modelPath) continue;

    world.add({
      id: generateEntityId(),
      position: {
        x: chunkX * CHUNK_SIZE + planted.localX,
        y: 0,
        z: chunkZ * CHUNK_SIZE + planted.localZ,
      },
      crop: {
        cropId: planted.cropId,
        stage: planted.stage,
        progress: planted.progress,
        watered: planted.watered,
        modelPath,
      },
      renderable: { visible: true, scale: 1 },
    });
  }
}
