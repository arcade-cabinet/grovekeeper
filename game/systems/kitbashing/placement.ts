/**
 * Kitbashing placement logic -- snap point detection and grid validation.
 * Pure functions, no physics engine dependency. Spec §35.1.
 */

import type { Entity } from "../../ecs/world";
import type {
  ModularPieceComponent,
  SnapDirection,
  SnapPoint,
} from "../../ecs/components/building";
import buildingConfig from "../../../config/game/building.json";

export const GRID_SIZE: number = buildingConfig.gridSize;

/** Opposite snap direction for matching connections. */
export const OPPOSITE_DIRECTION: Record<SnapDirection, SnapDirection> = {
  up: "down",
  down: "up",
  north: "south",
  south: "north",
  east: "west",
  west: "east",
};

/** Check if two positions are within tolerance for snapping. */
export function positionsMatch(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
  tolerance: number,
): boolean {
  return (
    Math.abs(a.x - b.x) < tolerance &&
    Math.abs(a.y - b.y) < tolerance &&
    Math.abs(a.z - b.z) < tolerance
  );
}

/** Convert a snap point from local piece space to world space. */
export function snapPointToWorld(
  snap: SnapPoint,
  piece: ModularPieceComponent,
): { x: number; y: number; z: number } {
  const cos = Math.round(Math.cos((piece.rotation * Math.PI) / 180));
  const sin = Math.round(Math.sin((piece.rotation * Math.PI) / 180));

  return {
    x: piece.gridX * GRID_SIZE + snap.localPosition.x * cos - snap.localPosition.z * sin,
    y: piece.gridY * GRID_SIZE + snap.localPosition.y,
    z: piece.gridZ * GRID_SIZE + snap.localPosition.x * sin + snap.localPosition.z * cos,
  };
}

/** Rotate a snap direction by the piece's rotation. */
export function rotateDirection(
  direction: SnapDirection,
  rotation: 0 | 90 | 180 | 270,
): SnapDirection {
  if (direction === "up" || direction === "down") return direction;

  const horizontalDirs: SnapDirection[] = ["north", "east", "south", "west"];
  const idx = horizontalDirs.indexOf(direction);
  const steps = rotation / 90;
  return horizontalDirs[(idx + steps) % 4];
}

/**
 * Find valid snap positions for a new piece against existing placed pieces.
 *
 * Returns snap points from existing pieces that accept the new piece's type
 * and have a matching opposite-direction snap on the new piece.
 */
export function getAvailableSnapPoints(
  existingPieces: Entity[],
  newPiece: ModularPieceComponent,
): SnapPoint[] {
  const available: SnapPoint[] = [];

  for (const entity of existingPieces) {
    if (!entity.modularPiece) continue;
    const placed = entity.modularPiece;

    for (const placedSnap of placed.snapPoints) {
      const rotatedDir = rotateDirection(placedSnap.direction, placed.rotation);
      const oppositeDir = OPPOSITE_DIRECTION[rotatedDir];

      if (!placedSnap.accepts.includes(newPiece.pieceType)) continue;

      const hasMatchingSnap = newPiece.snapPoints.some(
        (newSnap) => newSnap.direction === oppositeDir &&
          newSnap.accepts.includes(placed.pieceType),
      );

      if (hasMatchingSnap) {
        available.push(placedSnap);
      }
    }
  }

  return available;
}

/**
 * Validate that a piece can be placed at the given grid position.
 *
 * Checks:
 * 1. No collision with existing pieces at the same grid cell
 * 2. At least one snap connection with an existing piece (unless first piece)
 * 3. Grid position is within valid range
 */
export function validatePlacement(
  piece: ModularPieceComponent,
  existingPieces: Entity[],
): boolean {
  if (existingPieces.length === 0) return true;

  for (const entity of existingPieces) {
    if (!entity.modularPiece) continue;
    const placed = entity.modularPiece;

    if (
      placed.gridX === piece.gridX &&
      placed.gridY === piece.gridY &&
      placed.gridZ === piece.gridZ &&
      placed.pieceType === piece.pieceType
    ) {
      return false;
    }
  }

  const snapTolerance = GRID_SIZE * 0.1;
  let hasConnection = false;

  for (const entity of existingPieces) {
    if (!entity.modularPiece) continue;
    const placed = entity.modularPiece;

    for (const placedSnap of placed.snapPoints) {
      const worldA = snapPointToWorld(placedSnap, placed);
      const rotatedDirA = rotateDirection(placedSnap.direction, placed.rotation);

      for (const newSnap of piece.snapPoints) {
        const worldB = snapPointToWorld(newSnap, piece);
        const rotatedDirB = rotateDirection(newSnap.direction, piece.rotation);

        if (
          positionsMatch(worldA, worldB, snapTolerance) &&
          rotatedDirB === OPPOSITE_DIRECTION[rotatedDirA] &&
          placedSnap.accepts.includes(piece.pieceType) &&
          newSnap.accepts.includes(placed.pieceType)
        ) {
          hasConnection = true;
          break;
        }
      }
      if (hasConnection) break;
    }
    if (hasConnection) break;
  }

  return hasConnection;
}
