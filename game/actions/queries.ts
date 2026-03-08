/**
 * Query helpers -- find entities by position or state.
 * Also provides the shared gridCellsQuery and private helpers used by action files.
 */

import type { Entity } from "@/game/ecs/world";
import { generateEntityId, playerQuery, treesQuery, world } from "@/game/ecs/world";

export type TileCell = {
  gridX: number;
  gridZ: number;
  type: "soil" | "water" | "rock" | "path";
  occupied: boolean;
  treeEntityId: string | null;
};

export const gridCellsQuery = world.with("gridCell", "position");

/** Find the grid cell entity at a given grid coordinate. */
export function findCell(gridX: number, gridZ: number): TileCell | null {
  for (const cell of gridCellsQuery) {
    if (cell.gridCell?.gridX === gridX && cell.gridCell?.gridZ === gridZ) {
      return cell.gridCell;
    }
  }
  return null;
}

/** Find a tree entity by its ID. */
export function findTreeById(treeEntityId: string): Entity | null {
  for (const tree of treesQuery) {
    if (tree.id === treeEntityId && tree.tree) return tree;
  }
  return null;
}

/** Find all empty, plantable soil tiles. */
export function findPlantableTiles(): TileCell[] {
  const tiles: TileCell[] = [];
  for (const cell of gridCellsQuery) {
    if (cell.gridCell && cell.gridCell.type === "soil" && !cell.gridCell.occupied) {
      tiles.push(cell.gridCell);
    }
  }
  return tiles;
}

/** Find all tree entities that have the watered flag set to false. */
export function findWaterableTrees(): Entity[] {
  const result: Entity[] = [];
  for (const tree of treesQuery) {
    if (tree.tree && !tree.tree.watered) {
      result.push(tree);
    }
  }
  return result;
}

/** Find all tree entities at stage 3+ with harvestable.ready === true. */
export function findHarvestableTrees(): Entity[] {
  const result: Entity[] = [];
  for (const tree of treesQuery) {
    if (tree.harvestable?.ready) {
      result.push(tree);
    }
  }
  return result;
}

/** Find all tree entities at stage 3+ (mature or old growth). */
export function findMatureTrees(): Entity[] {
  const result: Entity[] = [];
  for (const tree of treesQuery) {
    if (tree.tree && tree.tree.stage >= 3) {
      result.push(tree);
    }
  }
  return result;
}

/** Get the player's current tile coordinates. */
export function getPlayerTile(): { gridX: number; gridZ: number } | null {
  const player = playerQuery.first;
  if (!player?.position) return null;
  return {
    gridX: Math.round(player.position.x),
    gridZ: Math.round(player.position.z),
  };
}

/** Teleport the player directly to a grid position. No pathfinding animation. */
export function movePlayerTo(gridX: number, gridZ: number): void {
  const player = playerQuery.first;
  if (!player?.position) return;
  player.position.x = gridX;
  player.position.z = gridZ;
}

// Re-export world and generateEntityId for use by action files
export { world, generateEntityId };
