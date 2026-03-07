/**
 * NPC movement system -- manages active NPC paths and movement.
 * Ported from BabylonJS archive -- no engine dependencies.
 *
 * Yuka EntityManager layer:
 *   - `registerNpcEntity` / `deregisterNpcEntity` add/remove Yuka GameEntity
 *     objects from the shared EntityManager.
 *   - `updateNpcEntityManager(dt)` drives Yuka's entity update cycle,
 *     advancing steering behaviors and scheduled AI evaluations.
 *   - Call once per game tick from the game loop alongside
 *     `updateNpcMovement` for each individual NPC.
 */

import gridConfig from "@/config/game/grid.json" with { type: "json" };
import { EntityManager, GameEntity } from "yuka";
import {
  advancePathFollow,
  createPathFollow,
  type PathFollowState,
} from "@/game/systems/pathFollowing";
import { findPath, type TileCoord, type WalkabilityGrid } from "@/game/systems/pathfinding";

const NPC_MOVE_SPEED: number = gridConfig.npcMoveSpeed;

/** Active path states keyed by NPC entity ID. */
const activePaths = new Map<string, PathFollowState>();

// ── Yuka EntityManager ────────────────────────────────────────────────────────

/** Shared Yuka EntityManager for all active NPC entities. */
const entityManager = new EntityManager();

/** Registered Yuka entities keyed by NPC entity ID for O(1) lookup/removal. */
const yukaEntities = new Map<string, GameEntity>();

/**
 * Register a Yuka GameEntity for an NPC.
 *
 * Call when an NPC is loaded into an active chunk. The entity is added to
 * the shared EntityManager and updated each tick via updateNpcEntityManager.
 * Idempotent — registering the same entityId twice is a no-op.
 */
export function registerNpcEntity(entityId: string, entity: GameEntity): void {
  if (yukaEntities.has(entityId)) return;
  yukaEntities.set(entityId, entity);
  entityManager.add(entity);
}

/**
 * Deregister a Yuka GameEntity for an NPC.
 *
 * Call when an NPC is unloaded from an active chunk. Safe to call for
 * unknown entity IDs.
 */
export function deregisterNpcEntity(entityId: string): void {
  const entity = yukaEntities.get(entityId);
  if (!entity) return;
  entityManager.remove(entity);
  yukaEntities.delete(entityId);
}

/**
 * Advance all registered Yuka entities by dt seconds.
 *
 * Call once per game tick from the game loop. This drives Yuka's internal
 * steering and goal evaluation cycle for every active NPC entity.
 */
export function updateNpcEntityManager(dt: number): void {
  entityManager.update(dt);
}

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

  const waypoint = state.waypoints[state.currentIndex];
  if (!waypoint) {
    activePaths.delete(entityId);
    return { x: currentX, z: currentZ, done: true };
  }

  const remaining = Math.hypot(waypoint.x - currentX, waypoint.z - currentZ);
  const step = Math.min(remaining, NPC_MOVE_SPEED * dt);
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

/** Cancel all active NPC movements and deregister all Yuka entities. Called on scene dispose. */
export function cancelAllNpcMovements(): void {
  activePaths.clear();
  for (const entity of yukaEntities.values()) {
    entityManager.remove(entity);
  }
  yukaEntities.clear();
}
