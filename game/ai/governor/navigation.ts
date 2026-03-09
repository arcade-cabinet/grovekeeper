/**
 * Navigation helpers for the PlayerGovernor state machine.
 * Encapsulates pathfinding state and movement advancement.
 */

import { getPlayerTile } from "@/game/actions";
import { playerQuery, world } from "@/game/ecs/world";
import {
  advancePathFollow,
  createPathFollow,
  type PathFollowState,
} from "@/game/systems/pathFollowing";
import { buildWalkabilityGrid, findPath, type TileCoord } from "@/game/systems/pathfinding";
import type { PlayerGovernorConfig } from "./types.ts";

const gridCellsQuery = world.with("gridCell", "position");

export interface NavigationResult {
  /** true = navigation is complete (arrived or failed) */
  done: boolean;
  /** true = pathfinding failed (so caller can increment pathsFailed) */
  failed: boolean;
}

/**
 * Set up a path from the player's current tile to (tileX, tileZ).
 * Returns the created PathFollowState, or null if pathfinding failed or player not found.
 */
export function buildNavPath(
  config: PlayerGovernorConfig,
  tileX: number,
  tileZ: number,
): PathFollowState | null | "at_goal" {
  const playerTile = getPlayerTile();
  if (!playerTile) return null;

  const start: TileCoord = { x: playerTile.gridX, z: playerTile.gridZ };
  const goal: TileCoord = { x: tileX, z: tileZ };

  if (start.x === goal.x && start.z === goal.z) return "at_goal";

  const bounds = config.getWorldBounds();
  const walkCells: { x: number; z: number; walkable: boolean }[] = [];
  for (const cell of gridCellsQuery) {
    if (cell.gridCell) {
      const { gridX, gridZ, type } = cell.gridCell;
      walkCells.push({ x: gridX, z: gridZ, walkable: type === "soil" || type === "path" });
    }
  }
  const grid = buildWalkabilityGrid(walkCells, bounds);
  const path = findPath(grid, start, goal);

  if (!path || path.length === 0) return null;
  return createPathFollow(path);
}

/**
 * Advance an in-progress path follow state by one frame.
 * Writes movement vector to movementRef. Returns whether navigation is done.
 */
export function advanceNav(pathState: PathFollowState, config: PlayerGovernorConfig): boolean {
  const player = playerQuery.first;
  if (!player?.position) return true; // treat as done

  const vec = advancePathFollow(pathState, { x: player.position.x, z: player.position.z });
  config.movementRef.current = vec;

  if (pathState.done) {
    config.movementRef.current = { x: 0, z: 0 };
  }

  return pathState.done;
}
