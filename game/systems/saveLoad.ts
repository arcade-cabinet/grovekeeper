/**
 * Save/Load system for Grovekeeper's chunk-based world. Spec §26.
 *
 * Architecture:
 *   - Legend State + expo-sqlite auto-syncs gameState$ and chunkDiffs$
 *   - saveGame() records the save timestamp (signals complete save)
 *   - clearSave() resets both observables to initial state
 *   - createSaveSnapshot() / applySaveSnapshot() enable round-trip testing
 *   - migrateIfNeeded() handles schema version upgrades (v1 ECS → v2 chunk)
 *
 * Legacy: deserializeGrove() and loadGroveFromStorage() are kept for
 * usePersistence.ts (offline growth calculation on startup).
 */

import { loadGroveFromDb } from "@/game/db/queries";
import { createGridCellEntity, createTreeEntity } from "@/game/ecs/archetypes";
import { world } from "@/game/ecs/world";
import type { QuestChainState } from "@/game/quests/types";
import { gameState$, getState, initialState } from "@/game/stores/core";
import type { FastTravelPoint } from "@/game/systems/fastTravel";
import { getStageScale } from "@/game/systems/growth";
import type { SpeciesProgress } from "@/game/systems/speciesDiscovery";
import type { ChunkDiff } from "@/game/world/chunkPersistence";
import { chunkDiffs$, clearAllChunkDiffs } from "@/game/world/chunkPersistence";

const gridCellsQuery = world.with("gridCell", "position");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TreeSave {
  col: number;
  row: number;
  speciesId: string;
  meshSeed: number;
  stage: number;
  progress: number;
  watered: boolean;
  totalGrowthTime: number;
  plantedAt: number;
  harvestCooldownElapsed?: number;
  harvestReady?: boolean;
}

export interface TileSave {
  col: number;
  row: number;
  type: string;
}

export interface GroveSaveData {
  version: number;
  timestamp: number;
  gridSize: number;
  seed: string;
  tiles: TileSave[];
  trees: TreeSave[];
}

/** Current schema version. Increment on breaking save format changes. */
export const SAVE_VERSION = 2;

/**
 * Full saveable snapshot: chunk deltas, quest state, NPC relationships,
 * discovered species, campfire locations, prestige state. Spec §26.2
 */
export interface SaveSnapshot {
  version: number;
  savedAt: number;
  worldSeed: string;
  prestigeCount: number;
  difficulty: string;
  questChainState: QuestChainState;
  npcRelationships: Record<string, number>;
  discoveredSpiritIds: string[];
  speciesProgress: Record<string, SpeciesProgress>;
  discoveredCampfires: FastTravelPoint[];
  chunkDiffs: Record<string, ChunkDiff>;
}

// ---------------------------------------------------------------------------
// Chunk-based save/load API (Spec §26)
// ---------------------------------------------------------------------------

/**
 * Capture all saveable game state into a plain snapshot object.
 * Covers: chunk deltas, quest state, NPC relationships, discovered species,
 * campfire locations, prestige state.
 */
export function createSaveSnapshot(): SaveSnapshot {
  const state = getState();
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    worldSeed: state.worldSeed,
    prestigeCount: state.prestigeCount,
    difficulty: state.difficulty,
    questChainState: state.questChainState,
    npcRelationships: state.npcRelationships,
    discoveredSpiritIds: state.discoveredSpiritIds,
    speciesProgress: state.speciesProgress,
    discoveredCampfires: state.discoveredCampfires,
    chunkDiffs: { ...chunkDiffs$.peek() },
  };
}

/**
 * Apply a snapshot back to Legend State to reconstruct game state.
 * Used for: resume after clear, schema migration. Spec §26.
 */
export function applySaveSnapshot(snapshot: SaveSnapshot): void {
  gameState$.set({
    ...getState(),
    worldSeed: snapshot.worldSeed,
    prestigeCount: snapshot.prestigeCount,
    difficulty: snapshot.difficulty,
    questChainState: snapshot.questChainState,
    npcRelationships: snapshot.npcRelationships,
    discoveredSpiritIds: snapshot.discoveredSpiritIds,
    speciesProgress: snapshot.speciesProgress,
    discoveredCampfires: snapshot.discoveredCampfires,
    lastSavedAt: snapshot.savedAt,
  });
  chunkDiffs$.set(snapshot.chunkDiffs);
}

/**
 * Record the save timestamp. Legend State propagates this to expo-sqlite.
 * Auto-save (AppState background) is handled by useAutoSave.ts. Spec §26.1
 */
export function saveGame(): void {
  gameState$.lastSavedAt.set(Date.now());
}

/**
 * Clear all save data: reset Legend State to initial + clear chunk diffs.
 * Call on new game start or prestige reset. Spec §26.
 */
export function clearSave(): void {
  gameState$.set(structuredClone(initialState));
  clearAllChunkDiffs();
}

/** Returns true if a real save exists (non-zero lastSavedAt). Spec §26.1 */
export function hasSaveGame(): boolean {
  return getState().lastSavedAt > 0;
}

/**
 * Apply schema migration if snapshot is older than SAVE_VERSION.
 * v1→v2: chunk-based world; old ECS saves have no chunkDiffs — default to {}.
 */
export function migrateIfNeeded(snapshot: SaveSnapshot): SaveSnapshot {
  if (snapshot.version >= SAVE_VERSION) return snapshot;
  return {
    ...snapshot,
    version: SAVE_VERSION,
    chunkDiffs: snapshot.chunkDiffs ?? {},
    discoveredCampfires: snapshot.discoveredCampfires ?? [],
    npcRelationships: snapshot.npcRelationships ?? {},
    discoveredSpiritIds: snapshot.discoveredSpiritIds ?? [],
  };
}

// ---------------------------------------------------------------------------
// Legacy ECS functions (kept for usePersistence.ts / offline growth)
// ---------------------------------------------------------------------------

/**
 * Clear the ECS world and recreate entities from save data.
 * Called by usePersistence.ts after offline growth is applied.
 */
export function deserializeGrove(data: GroveSaveData): void {
  for (const entity of [...world]) {
    world.remove(entity);
  }

  for (const tile of data.tiles) {
    world.add(
      createGridCellEntity(tile.col, tile.row, tile.type as "soil" | "water" | "rock" | "path"),
    );
  }

  const cellMap = new Map<string, (typeof gridCellsQuery.entities)[number]>();
  for (const entity of gridCellsQuery) {
    if (entity.gridCell) {
      cellMap.set(`${entity.gridCell.gridX},${entity.gridCell.gridZ}`, entity);
    }
  }

  for (const treeSave of data.trees) {
    const tree = createTreeEntity(treeSave.col, treeSave.row, treeSave.speciesId);
    const treeComp = tree.tree;
    const renderComp = tree.renderable;
    if (!treeComp || !renderComp) continue;
    treeComp.stage = treeSave.stage as 0 | 1 | 2 | 3 | 4;
    treeComp.progress = treeSave.progress;
    treeComp.watered = treeSave.watered;
    treeComp.totalGrowthTime = treeSave.totalGrowthTime;
    treeComp.meshSeed = treeSave.meshSeed;
    treeComp.plantedAt = treeSave.plantedAt ?? Date.now();
    renderComp.scale = getStageScale(treeSave.stage, treeSave.progress);
    world.add(tree);

    const cell = cellMap.get(`${treeSave.col},${treeSave.row}`);
    if (cell?.gridCell) {
      cell.gridCell.occupied = true;
      cell.gridCell.treeEntityId = tree.id;
    }
  }
}

/**
 * Load grove data from expo-sqlite relational tables.
 * Returns null if no save exists.
 */
export async function loadGroveFromStorage(): Promise<GroveSaveData | null> {
  const result = await loadGroveFromDb();
  if (!result || result.trees.length === 0) return null;

  return {
    version: 1,
    timestamp: Date.now(),
    gridSize: 12,
    seed: "",
    tiles: [],
    trees: result.trees.map((t) => ({
      col: t.gridX,
      row: t.gridZ,
      speciesId: t.speciesId,
      meshSeed: t.meshSeed,
      stage: t.stage,
      progress: t.progress,
      watered: t.watered,
      totalGrowthTime: t.totalGrowthTime,
      plantedAt: t.plantedAt,
    })),
  };
}
