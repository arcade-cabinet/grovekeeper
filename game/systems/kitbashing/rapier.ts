/**
 * Kitbashing Rapier physics snap validation.
 * Clearance and ground contact checks via physics raycasts. Spec §35.1.
 */

import type { ModularPieceComponent, SnapPoint } from "../../ecs/components/building.ts";
import type { Entity } from "../../ecs/world.ts";
import {
  GRID_SIZE,
  OPPOSITE_DIRECTION,
  positionsMatch,
  rotateDirection,
  snapPointToWorld,
  validatePlacement,
} from "./placement.ts";

/** Minimal Rapier world API for kitbashing snap physics (Spec §35.1). */
export interface KitbashRapierWorld {
  castRay(ray: object, maxToi: number, solid: boolean): { toi: number } | null;
  intersectionsWithShape(
    position: { x: number; y: number; z: number },
    rotation: { x: number; y: number; z: number; w: number },
    shape: object,
  ): boolean;
}

/** Minimal Rapier module API for kitbashing snap physics (Spec §35.1). */
export interface KitbashRapierModule {
  Ray: new (
    origin: { x: number; y: number; z: number },
    dir: { x: number; y: number; z: number },
  ) => object;
  Cuboid: new (hx: number, hy: number, hz: number) => object;
}

/**
 * Validate opposing snap directions match (N<->S, E<->W, up<->down)
 * and their world positions align within tolerance. Spec §35.1.
 */
export function checkSnapDirectionMatch(
  placedSnap: SnapPoint,
  placedPiece: ModularPieceComponent,
  newSnap: SnapPoint,
  newPiece: ModularPieceComponent,
  tolerance: number,
): boolean {
  const rotatedA = rotateDirection(placedSnap.direction, placedPiece.rotation);
  const rotatedB = rotateDirection(newSnap.direction, newPiece.rotation);
  return (
    positionsMatch(
      snapPointToWorld(placedSnap, placedPiece),
      snapPointToWorld(newSnap, newPiece),
      tolerance,
    ) && rotatedB === OPPOSITE_DIRECTION[rotatedA]
  );
}

/**
 * Check that the target position is clear of existing colliders
 * via a Rapier cuboid overlap query. Spec §35.1.
 *
 * Returns true if no collider overlaps the piece bounding volume.
 */
export function checkClearance(
  worldPos: { x: number; y: number; z: number },
  rapierWorld: KitbashRapierWorld,
  rapier: KitbashRapierModule,
): boolean {
  const half = GRID_SIZE * 0.45;
  const shape = new rapier.Cuboid(half, half, half);
  return !rapierWorld.intersectionsWithShape(worldPos, { x: 0, y: 0, z: 0, w: 1 }, shape);
}

/**
 * Check that solid ground or a collider exists below worldPos
 * via a downward Rapier raycast. Spec §35.1.
 *
 * Returns true if a hit is found within GRID_SIZE × 10 units downward.
 */
export function checkGroundContact(
  worldPos: { x: number; y: number; z: number },
  rapierWorld: KitbashRapierWorld,
  rapier: KitbashRapierModule,
): boolean {
  const ray = new rapier.Ray(worldPos, { x: 0, y: -1, z: 0 });
  return rapierWorld.castRay(ray, GRID_SIZE * 10, true) !== null;
}

/**
 * Validate piece placement using Rapier physics. Spec §35.1.
 *
 * Combines clearance (Rapier overlap query) and ground contact (Rapier raycast)
 * with the existing snap direction matching logic:
 * 1. Clearance: no collider in the target bounding volume
 * 2. First piece: requires direct terrain contact via ground raycast
 * 3. Subsequent pieces: snap direction matching delegated to validatePlacement
 */
export function validatePlacementWithRapier(
  piece: ModularPieceComponent,
  existingPieces: Entity[],
  rapierWorld: KitbashRapierWorld,
  rapier: KitbashRapierModule,
): boolean {
  const worldPos = {
    x: piece.gridX * GRID_SIZE,
    y: piece.gridY * GRID_SIZE,
    z: piece.gridZ * GRID_SIZE,
  };

  if (!checkClearance(worldPos, rapierWorld, rapier)) return false;

  if (existingPieces.length === 0) {
    return checkGroundContact(worldPos, rapierWorld, rapier);
  }

  return validatePlacement(piece, existingPieces);
}
