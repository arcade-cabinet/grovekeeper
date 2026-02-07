import { createGridCellEntity, createTreeEntity } from "../ecs/archetypes";
import { gridCellsQuery, treesQuery, world } from "../ecs/world";
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
  for (const entity of treesQuery) {
    if (!entity.tree || !entity.position) continue;
    trees.push({
      col: Math.round(entity.position.x),
      row: Math.round(entity.position.z),
      speciesId: entity.tree.speciesId,
      meshSeed: entity.tree.meshSeed,
      stage: entity.tree.stage,
      progress: entity.tree.progress,
      watered: entity.tree.watered,
      totalGrowthTime: entity.tree.totalGrowthTime,
      plantedAt: entity.tree.plantedAt,
      harvestCooldownElapsed: entity.harvestable?.cooldownElapsed,
      harvestReady: entity.harvestable?.ready,
    });
  }

  const tiles: TileSave[] = [];
  for (const entity of gridCellsQuery) {
    if (!entity.gridCell) continue;
    tiles.push({
      col: entity.gridCell.gridX,
      row: entity.gridCell.gridZ,
      type: entity.gridCell.type,
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
  // Clear all existing entities
  for (const entity of [...world]) {
    world.remove(entity);
  }

  // Recreate grid cells
  for (const tile of data.tiles) {
    world.add(
      createGridCellEntity(
        tile.col,
        tile.row,
        tile.type as "soil" | "water" | "rock" | "path",
      ),
    );
  }

  // Build a map for marking cells as occupied
  const cellMap = new Map<string, (typeof gridCellsQuery.entities)[number]>();
  for (const entity of gridCellsQuery) {
    if (entity.gridCell) {
      cellMap.set(
        `${entity.gridCell.gridX},${entity.gridCell.gridZ}`,
        entity,
      );
    }
  }

  // Recreate trees
  for (const treeSave of data.trees) {
    const tree = createTreeEntity(
      treeSave.col,
      treeSave.row,
      treeSave.speciesId,
    );
    const treeComp = tree.tree;
    const renderComp = tree.renderable;
    if (!treeComp || !renderComp) continue;
    treeComp.stage = treeSave.stage as 0 | 1 | 2 | 3 | 4;
    treeComp.progress = treeSave.progress;
    treeComp.watered = treeSave.watered;
    treeComp.totalGrowthTime = treeSave.totalGrowthTime;
    treeComp.meshSeed = treeSave.meshSeed;
    treeComp.plantedAt = treeSave.plantedAt ?? Date.now();
    // Restore correct visual scale for the tree's growth stage
    renderComp.scale = getStageScale(treeSave.stage, treeSave.progress);
    world.add(tree);

    // Mark cell as occupied
    const cell = cellMap.get(`${treeSave.col},${treeSave.row}`);
    if (cell?.gridCell) {
      cell.gridCell.occupied = true;
      cell.gridCell.treeEntityId = tree.id;
    }
  }
}

/**
 * Save grove data to localStorage.
 */
export function saveGroveToStorage(
  gridSize: number,
  groveSeed: string,
): void {
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
