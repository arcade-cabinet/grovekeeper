import type { Entity } from "koota";
import { destroyAllEntitiesExceptWorld, koota } from "@/koota";
import { restoreTree, spawnGridCell } from "@/startup";
import { GridCell, Harvestable, Position, Renderable, Tree } from "@/traits";
import { getStageScale } from "./growth";

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

const SAVE_KEY = "grovekeeper-grove";

/**
 * Serialize all ECS tree and grid entities into a saveable object.
 */
export function serializeGrove(
  gridSize: number,
  groveSeed: string,
): GroveSaveData {
  const trees: TreeSave[] = [];
  for (const entity of koota.query(Tree, Position)) {
    const tree = entity.get(Tree);
    const pos = entity.get(Position);
    const harvestable = entity.has(Harvestable)
      ? entity.get(Harvestable)
      : undefined;
    trees.push({
      col: Math.round(pos.x),
      row: Math.round(pos.z),
      speciesId: tree.speciesId,
      meshSeed: tree.meshSeed,
      stage: tree.stage,
      progress: tree.progress,
      watered: tree.watered,
      totalGrowthTime: tree.totalGrowthTime,
      plantedAt: tree.plantedAt,
      harvestCooldownElapsed: harvestable?.cooldownElapsed,
      harvestReady: harvestable?.ready,
    });
  }

  const tiles: TileSave[] = [];
  for (const entity of koota.query(GridCell, Position)) {
    const gc = entity.get(GridCell);
    tiles.push({
      col: gc.gridX,
      row: gc.gridZ,
      type: gc.type,
    });
  }

  return {
    version: 1,
    timestamp: Date.now(),
    gridSize,
    seed: groveSeed,
    tiles,
    trees,
  };
}

/**
 * Clear the ECS world and recreate entities from save data.
 */
export function deserializeGrove(data: GroveSaveData): void {
  // Clear all existing entities (preserves world-level singleton traits)
  destroyAllEntitiesExceptWorld();

  // Recreate grid cells
  const cellMap = new Map<string, Entity>();
  for (const tile of data.tiles) {
    const cell = spawnGridCell(
      tile.col,
      tile.row,
      tile.type as "soil" | "water" | "rock" | "path",
    );
    cellMap.set(`${tile.col},${tile.row}`, cell);
  }

  // Recreate trees
  for (const treeSave of data.trees) {
    const treeEntity = restoreTree({
      speciesId: treeSave.speciesId,
      gridX: treeSave.col,
      gridZ: treeSave.row,
      stage: treeSave.stage as 0 | 1 | 2 | 3 | 4,
      progress: treeSave.progress,
      watered: treeSave.watered,
      totalGrowthTime: treeSave.totalGrowthTime,
      plantedAt: treeSave.plantedAt ?? Date.now(),
      meshSeed: treeSave.meshSeed,
    });
    // Restore correct visual scale for the tree's growth stage
    const renderable = treeEntity.get(Renderable);
    treeEntity.set(Renderable, {
      ...renderable,
      scale: getStageScale(treeSave.stage, treeSave.progress),
    });

    // Mark cell as occupied
    const cell = cellMap.get(`${treeSave.col},${treeSave.row}`);
    if (cell?.has(GridCell)) {
      const gc = cell.get(GridCell);
      cell.set(GridCell, {
        ...gc,
        occupied: true,
        treeEntity,
      });
    }
  }
}

/**
 * Save grove data to localStorage.
 */
export function saveGroveToStorage(gridSize: number, groveSeed: string): void {
  const data = serializeGrove(gridSize, groveSeed);
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

/**
 * Load grove data from localStorage. Returns null if no save exists.
 */
export function loadGroveFromStorage(): GroveSaveData | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GroveSaveData;
  } catch {
    return null;
  }
}

/**
 * Check if save data exists in localStorage.
 */
export function hasSaveData(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

/**
 * Clear save data from localStorage.
 */
export function clearSaveData(): void {
  localStorage.removeItem(SAVE_KEY);
}
