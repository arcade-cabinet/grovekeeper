import {
  advancePathFollow,
  createPathFollow,
  type PathFollowState,
} from "./pathFollowing";
import {
  findPath,
  type TileCoord,
  type WalkabilityGrid,
} from "./pathfinding";

/** NPC move speed in tiles/sec (player is 3). */
const NPC_MOVE_SPEED = 1.8;

/** Active path states keyed by NPC entity ID. */
const activePaths = new Map<string, PathFollowState>();

/**
 * Start an NPC walking to a target tile.
 * Returns false if no path is found.
 */
export function startNpcPath(
  entityId: string,
  startX: number,
  startZ: number,
  targetX: number,
  targetZ: number,
  grid: WalkabilityGrid,
): boolean {
  const start: TileCoord = { x: Math.round(startX), z: Math.round(startZ) };
  const goal: TileCoord = { x: Math.round(targetX), z: Math.round(targetZ) };

  const path = findPath(grid, start, goal);
  if (!path || path.length === 0) {
    activePaths.delete(entityId);
    return false;
  }

  activePaths.set(entityId, createPathFollow(path));
  return true;
}

/**
 * Update an NPC's movement for this frame.
 * Returns the new position and whether the path is complete.
 * The caller should update the ECS entity's position with the returned values.
 */
export function updateNpcMovement(
  entityId: string,
  currentX: number,
  currentZ: number,
  dt: number,
): { x: number; z: number; done: boolean } {
  const state = activePaths.get(entityId);
  if (!state || state.done) {
    activePaths.delete(entityId);
    return { x: currentX, z: currentZ, done: true };
  }

  const dir = advancePathFollow(state, { x: currentX, z: currentZ });

  if (state.done) {
    activePaths.delete(entityId);
    return { x: currentX, z: currentZ, done: true };
  }

  const step = NPC_MOVE_SPEED * dt;
  return {
    x: currentX + dir.x * step,
    z: currentZ + dir.z * step,
    done: false,
  };
}

/** Check if an NPC is currently moving along a path. */
export function isNpcMoving(entityId: string): boolean {
  const state = activePaths.get(entityId);
  return state != null && !state.done;
}

/** Cancel any active movement for an NPC. */
export function cancelNpcMovement(entityId: string): void {
  activePaths.delete(entityId);
}

/** Cancel all active NPC movements. Called on scene dispose. */
export function cancelAllNpcMovements(): void {
  activePaths.clear();
}
