/**
 * Pure utility functions for PlacementGhost.
 * No React/RN imports — safe to test in isolation. (Spec §35.4)
 */

import type { ModularPieceComponent } from "@/game/ecs/components/building";

/** Snap a world position to the nearest integer grid cell. */
export function snapToGrid(pos: { x: number; y: number; z: number }): {
  x: number;
  y: number;
  z: number;
} {
  return { x: Math.round(pos.x), y: Math.round(pos.y), z: Math.round(pos.z) };
}

/** Increment or decrement rotation by 90 degrees (wraps 0–270). */
export function rotateIncrement(
  current: 0 | 90 | 180 | 270,
  dir: "cw" | "ccw",
): 0 | 90 | 180 | 270 {
  const steps: (0 | 90 | 180 | 270)[] = [0, 90, 180, 270];
  const idx = steps.indexOf(current);
  if (dir === "cw") return steps[(idx + 1) % 4];
  return steps[(idx + 3) % 4];
}

/** Build a temporary piece at a grid position with a given rotation, for validation. */
export function buildGhostPiece(
  template: ModularPieceComponent,
  gridX: number,
  gridY: number,
  gridZ: number,
  rotation: 0 | 90 | 180 | 270,
): ModularPieceComponent {
  return { ...template, gridX, gridY, gridZ, rotation };
}
