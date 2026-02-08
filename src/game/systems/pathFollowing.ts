import { CELL_SIZE } from "../constants/config";
import type { TileCoord } from "./pathfinding";

/** Waypoint threshold — how close we need to be before advancing. */
const WAYPOINT_THRESHOLD = 0.15;

export interface PathFollowState {
  /** World-space waypoints (tile centers). */
  waypoints: { x: number; z: number }[];
  /** Index of the next waypoint to reach. */
  currentIndex: number;
  /** True when the path has been fully traversed. */
  done: boolean;
}

/** Convert a tile coordinate to its world-space center position. */
function tileCenterWorld(tile: TileCoord): { x: number; z: number } {
  return { x: tile.x * CELL_SIZE, z: tile.z * CELL_SIZE };
}

/**
 * Create a path follow state from an A* tile path.
 * Skips the first waypoint if it's the player's current tile
 * (start index = 1 so we move toward the second tile).
 */
export function createPathFollow(path: TileCoord[]): PathFollowState {
  const waypoints = path.map(tileCenterWorld);
  return {
    waypoints,
    // Start at index 1 to skip the tile we're already on
    currentIndex: waypoints.length > 1 ? 1 : 0,
    done: waypoints.length === 0,
  };
}

/**
 * Advance the path follow state and return a normalized movement vector.
 * Returns `{ x: 0, z: 0 }` when the path is complete.
 *
 * Does NOT move the player directly — the returned vector is written to
 * `movementRef` and consumed by `movementSystem`.
 *
 * Uses iterative loop (not recursion) to skip past multiple consecutive
 * waypoints within WAYPOINT_THRESHOLD, preventing stack overflow.
 */
export function advancePathFollow(
  state: PathFollowState,
  playerWorldPos: { x: number; z: number },
): { x: number; z: number } {
  if (state.done || state.currentIndex >= state.waypoints.length) {
    state.done = true;
    return { x: 0, z: 0 };
  }

  // Skip past any waypoints we're already close to
  while (state.currentIndex < state.waypoints.length) {
    const target = state.waypoints[state.currentIndex];
    const dx = target.x - playerWorldPos.x;
    const dz = target.z - playerWorldPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist >= WAYPOINT_THRESHOLD) {
      return { x: dx / dist, z: dz / dist };
    }

    state.currentIndex++;
  }

  state.done = true;
  return { x: 0, z: 0 };
}
