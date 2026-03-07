/**
 * Save/Load serialization for ECS grove data.
 *
 * Persistence uses expo-sqlite via drizzle (game/db).
 * All storage functions are async.
 */

import type { SerializedTreeDb } from "@/game/db/queries";
import { loadGroveFromDb, saveGroveToDb } from "@/game/db/queries";
import { createGridCellEntity, createTreeEntity } from "@/game/ecs/archetypes";
import { treesQuery, world } from "@/game/ecs/world";

const gridCellsQuery = world.with("gridCell", "position");

import { getStageScale } from "@/game/systems/growth";

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

/**
 * Serialize all ECS tree and grid entities into a saveable object.
 */
export function serializeGrove(gridSize: number, groveSeed: string): GroveSaveData {
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
  for (const entity of [...world]) {
    world.remove(entity);
  }

  // Recreate grid cells
  for (const tile of data.tiles) {
    world.add(
      createGridCellEntity(tile.col, tile.row, tile.type as "soil" | "water" | "rock" | "path"),
    );
  }

  // Build a map for marking cells as occupied
  const cellMap = new Map<string, (typeof gridCellsQuery.entities)[number]>();
  for (const entity of gridCellsQuery) {
    if (entity.gridCell) {
      cellMap.set(`${entity.gridCell.gridX},${entity.gridCell.gridZ}`, entity);
    }
  }

  // Recreate trees
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

    // Mark cell as occupied
    const cell = cellMap.get(`${treeSave.col},${treeSave.row}`);
    if (cell?.gridCell) {
      cell.gridCell.occupied = true;
      cell.gridCell.treeEntityId = tree.id;
    }
  }
}

/**
 * Save grove data to expo-sqlite via the relational trees table.
 */
export async function saveGroveToStorage(gridSize: number, groveSeed: string): Promise<void> {
  const data = serializeGrove(gridSize, groveSeed);
  const treesData: SerializedTreeDb[] = data.trees.map((t) => ({
    speciesId: t.speciesId,
    gridX: t.col,
    gridZ: t.row,
    stage: t.stage as 0 | 1 | 2 | 3 | 4,
    progress: t.progress,
    watered: t.watered,
    totalGrowthTime: t.totalGrowthTime,
    plantedAt: t.plantedAt,
    meshSeed: t.meshSeed,
  }));
  // Use default player position; the actual position is updated by persistGameStore
  await saveGroveToDb(treesData, { x: 6, z: 6 });
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
    timestamp: Date.now(), // Relational data has no timestamp; treat as current
    gridSize: 12, // Will be overridden by store hydration
    seed: "",
    tiles: [], // Tiles will be regenerated from grid generation
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

/**
 * Check if save data exists in the database.
 */
export async function hasSaveData(): Promise<boolean> {
  const result = await loadGroveFromDb();
  return result !== null && result.trees.length > 0;
}

/**
 * Clear save data. Deletes all trees from the database.
 */
export async function clearSaveData(): Promise<void> {
  // Trees are cleared when setupNewGame is called.
  // This is a no-op for now; the caller should use setupNewGame.
}
